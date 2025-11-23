import { useEffect, useRef, useState } from "react";
import { chains } from "../../../../config/const";
import { usePairs } from "./context";
import { useWallet } from "../../../../shared/Wallet/context";
import { getERC20Balance } from "../../../../helpers/get-erc20-balance.helper";
import { getNativeBalance } from "../../../../helpers/get-native-balance.helper";
import {
  buildTransactionReceiveAndBridgeGasless,
  type IPermitTransferFrom,
} from "../../../../helpers/build-transaction-receive-and-bridge-gasless.helper";
import { permit2TransferValidatorAbi } from "../../../../assets/abis/permit2-transfer-validator.abi";
import type { Hex } from "viem";
import { PERMIT2_ADDRESS } from "../../../../assets/addresses";
import {
  createPublicClient,
  encodeFunctionData,
  hexToBytes,
  http,
  maxUint256,
  serializeTransaction,
  signatureToHex,
  type Address,
} from "viem";
import { filter, firstValueFrom, take, catchError, timeout, throwError } from "rxjs";
import { DeviceActionStatus } from "@ledgerhq/device-management-kit";
import {
  sepolia,
  arbitrumSepolia,
  baseSepolia,
  optimismSepolia,
} from "viem/chains";
import type { Chain } from "viem";
import usdcIcon from "../../../../assets/icons/tokens/usdc.svg";

// Mapeo de chain labels a viem chains
const CHAIN_LABEL_TO_VIEM_CHAIN: Record<string, Chain> = {
  Arbitrum: arbitrumSepolia,
  Base: baseSepolia,
  Optimism: optimismSepolia,
  Ethereum: sepolia,
};

const ERC20_ABI = [
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const MAX_ALLOWANCE = maxUint256;

const flowLog = {
  ledger: (message: string) => console.log(`🟣 [Ledger] ${message}`),
  tx: (message: string) => console.log(`🟢 [Tx] ${message}`),
};

// Helper para obtener el chainId correcto desde el RPC
async function getChainIdFromRpc(rpcUrl: string): Promise<number> {
  const publicClient = createPublicClient({
    chain: sepolia, // Temporal, solo para crear el client
    transport: http(rpcUrl),
  });

  const chainId = await publicClient.getChainId();
  return chainId;
}

const derivationPath = "44'/60'/0'/0";

interface ChainModalProps {
  isOpen: boolean;
  onClose: () => void;
  chainId: string;
  chainLabel: string;
  chainLogo?: string;
  onConnect?: (chainId: string) => void;
  onSendSuccess?: () => void; // Callback cuando todas las transacciones se completan exitosamente
  collapseGraph?: (() => void) | null; // Función para colapsar el grafo
}

interface TokenBalances {
  [chainId: string]: {
    dai: number;
    usdc: number;
    tether: number;
  };
}

export default function ChainModal({
  isOpen,
  onClose,
  chainId,
  chainLabel,
  onSendSuccess,
  collapseGraph,
}: ChainModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const { pairs } = usePairs();
  const { address, signerEth } = useWallet();

  // Estado para el balance de USDC de la source chain (para el slider)
  const [sourceUSDCBalance, setSourceUSDCBalance] = useState<number | null>(
    null
  );
  const [isLoadingSourceUSDCBalance, setIsLoadingSourceUSDCBalance] =
    useState(false);

  // Estado para el balance nativo (ETH) de la destination chain
  const [nativeBalance, setNativeBalance] = useState<number | null>(null);
  const [isLoadingNativeBalance, setIsLoadingNativeBalance] = useState(false);

  // Estado para almacenar nonces de permit2 por destination
  const [permit2Nonces, setPermit2Nonces] = useState<{
    [destinationId: string]: bigint;
  }>({});

  // Tab activo (blockchain source seleccionada)
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Destination seleccionada (para destacar con border)
  const [selectedDestination, setSelectedDestination] = useState<string | null>(
    null
  );

  // Porcentajes para cada RELACIÓN (source -> destination)
  // Key formato: "sourceId->destinationId"
  const [tokenPercentages, setTokenPercentages] = useState<{
    [relationKey: string]: { dai: number; usdc: number; tether: number };
  }>({});

  // Encontrar la información completa de la chain destino (del modal) - solo para referencia inicial
  const chainInfo = chains.find((chain) => `chain-${chain.id}` === chainId);

  // Obtener la información de la source chain activa para mostrar en el header
  const activeSourceChainInfo = activeTab
    ? chains.find((chain) => `chain-${chain.id}` === activeTab)
    : null;

  // Obtener TODAS las blockchains SOURCE únicas de las parejas (para mostrar en tabs)
  const sourceChains = Array.from(new Set(pairs.map((p) => p.sourceId)))
    .map((id) => {
      const numId = parseInt(id.replace("chain-", ""));
      return chains.find((c) => c.id === numId);
    })
    .filter(Boolean) as typeof chains;

  // Obtener balance de USDC de la source chain cuando cambia activeTab (para el slider)
  useEffect(() => {
    // Limpiar estado anterior inmediatamente
    setSourceUSDCBalance(null);
    setIsLoadingSourceUSDCBalance(false);

    if (!activeTab || !address) {
      return;
    }

    const sourceNumId = parseInt(activeTab.replace("chain-", ""));
    const sourceChain = chains.find((c) => c.id === sourceNumId);

    if (!sourceChain || !sourceChain.rpc || !sourceChain.USDC) {
      return;
    }

    setIsLoadingSourceUSDCBalance(true);

    // Usar un flag para evitar race conditions
    let cancelled = false;

    getERC20Balance(sourceChain.rpc, sourceChain.USDC as Address, address)
      .then((balance) => {
        if (cancelled) return;
        // balance puede ser 0 (balance válido) o null (error)
        if (balance !== null) {
          setSourceUSDCBalance(balance);
        } else {
          setSourceUSDCBalance(null);
          console.warn(
            `⚠️ No se pudo obtener balance USDC de source ${sourceChain.label} (retornó null)`
          );
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(
          `❌ Error obteniendo balance USDC de source ${sourceChain.label}:`,
          error
        );
        setSourceUSDCBalance(null);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSourceUSDCBalance(false);
        }
      });

    // Cleanup function para cancelar si cambia activeTab
    return () => {
      cancelled = true;
    };
  }, [activeTab, address]);

  // Obtener balance nativo (ETH) de la destination chain cuando cambia selectedDestination
  useEffect(() => {
    // Limpiar estado anterior inmediatamente
    setNativeBalance(null);
    setIsLoadingNativeBalance(false);

    if (!selectedDestination || !address) {
      console.warn(
        `⚠️ No se puede obtener balance nativo: selectedDestination=${selectedDestination}, address=${address}`
      );
      return;
    }

    const destNumId = parseInt(selectedDestination.replace("chain-", ""));
    const destChain = chains.find((c) => c.id === destNumId);

    if (!destChain) {
      console.warn(`⚠️ No se encontró chain con id ${destNumId}`);
      return;
    }

    if (!destChain.rpc) {
      console.warn(`⚠️ Chain ${destChain.label} no tiene RPC configurado`);
      return;
    }

    // Obtener balance nativo (ETH)
    setIsLoadingNativeBalance(true);

    // Usar un flag para evitar race conditions
    let cancelled = false;

    getNativeBalance(destChain.rpc, address)
      .then((balance) => {
        if (cancelled) return;
        setNativeBalance(balance);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(
          `❌ Error obteniendo balance nativo de destination ${destChain.label}:`,
          error
        );
        setNativeBalance(null);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingNativeBalance(false);
        }
      });

    // Cleanup function para cancelar si cambia selectedDestination
    return () => {
      cancelled = true;
    };
  }, [selectedDestination, address]);

  // Balances mockeados para cada blockchain y token ($500 por token en cada blockchain)
  const tokenBalances: TokenBalances = {};
  sourceChains.forEach((chain) => {
    const chainKey = `chain-${chain.id}`;
    tokenBalances[chainKey] = { dai: 500, usdc: 500, tether: 500 };
  });

  // Inicializar tab activo, destination seleccionada y porcentajes al abrir el modal
  useEffect(() => {
    if (isOpen && sourceChains.length > 0) {
      // Seleccionar primer tab por defecto si no hay uno activo
      if (!activeTab) {
        const clickedChain = sourceChains.find(
          (c) => `chain-${c.id}` === chainId
        );
        const firstTab = clickedChain ? chainId : `chain-${sourceChains[0].id}`;
        setActiveTab(firstTab);

        // Seleccionar la primera destination relacionada
        const firstDestination = pairs.find(
          (p) => p.sourceId === firstTab
        )?.destinationId;
        if (firstDestination) {
          setSelectedDestination(firstDestination);
        }
      }

      // Inicializar porcentajes para todas las RELACIONES si no existen (solo USDC)
      const newPercentages: typeof tokenPercentages = {};
      pairs.forEach((pair) => {
        const relationKey = `${pair.sourceId}->${pair.destinationId}`;
        if (!tokenPercentages[relationKey]) {
          newPercentages[relationKey] = { dai: 0, usdc: 100, tether: 0 };
        }
      });
      if (Object.keys(newPercentages).length > 0) {
        setTokenPercentages((prev) => ({ ...prev, ...newPercentages }));
      }
    }
  }, [
    isOpen,
    sourceChains.length,
    activeTab,
    tokenPercentages,
    chainId,
    pairs,
  ]);

  // Función para manejar el cierre con animación
  const handleClose = () => {
    setIsClosing(true);
    // Esperar a que termine la animación antes de cerrar
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300); // Duración de la animación
  };

  const handleSend = async () => {
    if (!signerEth || !address) {
      console.error("❌ SignerEth o address no disponible");
      return;
    }

    // Preparar lista de relaciones válidas
    const relationsToProcess: Array<{
      sourceChain: any;
      destChain: any;
      relationKey: string;
      amount: bigint;
      nonce: bigint;
    }> = [];

    // Calcular amounts y validar relaciones
    for (const pair of pairs) {
      const sourceNumId = parseInt(pair.sourceId.replace("chain-", ""));
      const destNumId = parseInt(pair.destinationId.replace("chain-", ""));
      let sourceChain = chains.find((c) => c.id === sourceNumId);
      let destChain = chains.find((c) => c.id === destNumId);
      const relationKey = `${pair.sourceId}->${pair.destinationId}`;

      // Verificar que la SOURCE tenga RPC y USDC, y la DESTINATION al menos RPC
      if (!sourceChain?.rpc || !sourceChain?.USDC) {
        continue;
      }

      if (!destChain?.rpc) {
        continue;
      }

      let sourceBalance: number | null = null;

      try {
        // NO INTERCAMBIAR - source es source, dest es dest
        // El pair ya tiene: sourceId = de donde sale, destinationId = hacia donde va
        
        const balance = await getERC20Balance(
          sourceChain.rpc,
          sourceChain.USDC as Address,
          address
        );

        if (balance === null) {
          console.warn(
            `⚠️ No se pudo obtener balance de ${sourceChain.label}`
          );
          continue;
        }

        sourceBalance = balance;
        if (sourceBalance === 0) {
          console.warn(
            `⚠️ Balance es 0 en ${sourceChain.label} para ${relationKey}`
          );
          continue;
        }
      } catch (error) {
        console.error(`❌ Error obteniendo balance:`, error);
        continue;
      }

      // Obtener el porcentaje configurado (default 100%)
      const percentage = tokenPercentages[relationKey]?.usdc || 100;
      const amountInUSD = (sourceBalance * percentage) / 100;

      if (amountInUSD <= 0) {
        console.warn(`⚠️ Amount es 0 para ${relationKey}`);
        continue;
      }

      // Convertir a bigint con 6 decimales (USDC)
      const amount = BigInt(Math.floor(amountInUSD * 1_000_000));

      // Obtener nonce de Permit2
      let nonce = permit2Nonces[pair.sourceId];
      if (nonce === undefined) {
        try {
          const sourceChainId = await getChainIdFromRpc(sourceChain.rpc!);
          const sourceViemChain =
            CHAIN_LABEL_TO_VIEM_CHAIN[sourceChain.label] || sepolia;
          const sourcePublicClient = createPublicClient({
            chain: {
              ...sourceViemChain,
              id: sourceChainId,
            },
            transport: http(sourceChain.rpc!),
          });

          const sourceValidatorAddress =
            sourceChain.validatorAddress as Address;
          if (!sourceValidatorAddress || !sourceChain.USDC) {
            throw new Error(
              `No validatorAddress o USDC configurado para ${sourceChain.label}`
            );
          }

          const permit2NonceAbi = [
            {
              inputs: [
                { name: "owner", type: "address" },
                { name: "word", type: "uint256" },
              ],
              name: "nonceBitmap",
              outputs: [{ name: "", type: "uint256" }],
              stateMutability: "view",
              type: "function",
            },
          ] as const;

          const word = 0n;
          const nonceBitmap = await sourcePublicClient.readContract({
            address: PERMIT2_ADDRESS(sourceChainId),
            abi: permit2NonceAbi,
            functionName: "nonceBitmap",
            args: [address, word],
          });

          let foundNonce = 0n;
          for (let i = 0; i < 256; i++) {
            const bit = 1n << BigInt(i);
            if ((nonceBitmap & bit) === 0n) {
              foundNonce = word * 256n + BigInt(i);
              break;
            }
          }
          nonce = foundNonce;
          setPermit2Nonces((prev) => ({
            ...prev,
            [pair.sourceId]: nonce,
          }));
        } catch (error) {
          console.error(
            `❌ Error calculando nonce para ${sourceChain.label}:`,
            error
          );
          continue;
        }
      }

      relationsToProcess.push({
        sourceChain,
        destChain,
        relationKey,
        amount,
        nonce,
      });
    }

    if (relationsToProcess.length === 0) {
      console.warn("⚠️ No hay relaciones válidas para enviar");
      return;
    }

    // Estructura para guardar las transacciones firmadas listas para enviar
    const signedTransactions: Array<{
      sourceChain: any;
      destChain: any;
      relationKey: string;
      publicClient: any;
      bridgeRawSignedTx: `0x${string}`;
      bridgeHash?: string;
      approveHash?: `0x${string}`;
    }> = [];

    // Array para errores durante la preparación
    const preparationErrors: Array<{
      sourceChain: any;
      destChain: any;
      relationKey: string;
      error: string;
    }> = [];

    // FASE 1: Preparar y firmar todas las transacciones (SECUENCIAL)
    for (const { sourceChain, destChain, relationKey, amount } of relationsToProcess) {
      try {
          // ⚠️ IMPORTANTE: La transacción receiveAndBridgeGasless se ejecuta en la SOURCE chain
          // (donde el usuario tiene los tokens) y hace bridge hacia la DESTINATION chain
          // Por lo tanto, Permit2 signature, nonce y chainId deben ser de la SOURCE chain

          // Obtener el chainId correcto desde el RPC de la SOURCE chain
          const chainId = await getChainIdFromRpc(sourceChain.rpc!);

          // Obtener la chain de viem correspondiente a la SOURCE
          const viemChain =
            CHAIN_LABEL_TO_VIEM_CHAIN[sourceChain.label] || sepolia;

          // Crear una chain personalizada con el chainId correcto
          const customChain = {
            ...viemChain,
            id: chainId, // Usar el chainId real del RPC de la SOURCE
          };

          // PublicClient de la SOURCE chain (donde se ejecuta la transacción)
          const publicClient = createPublicClient({
            chain: customChain,
            transport: http(sourceChain.rpc!),
          });

          // Verificar que el publicClient tenga el chainId correcto
          const actualChainId = publicClient.chain.id;
          if (actualChainId !== chainId) {
            console.error(
              `   ⚠️ ADVERTENCIA: ChainId en publicClient (${actualChainId}) no coincide con el esperado (${chainId})`
            );
          }

          // Validator address de la SOURCE chain (donde se ejecuta la transacción)
          const sourceValidatorAddress =
            sourceChain.validatorAddress as Address;
          if (!sourceValidatorAddress) {
            throw new Error(
              `No validatorAddress configurado para ${sourceChain.label} (SOURCE)`
            );
          }

          // Token debe ser de la SOURCE chain (donde está el token del usuario)
          if (!sourceChain.USDC) {
            throw new Error(
              `No USDC configurado para ${sourceChain.label} (SOURCE)`
            );
          }

          const permit2Address = PERMIT2_ADDRESS(chainId);

          // Verificar allowance ERC20 → Permit2
          const allowance = await publicClient.readContract({
            address: sourceChain.USDC as Address,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [address as Address, permit2Address],
          });

          let approveHash: `0x${string}` | undefined;

          if (allowance < amount) {

            const approveData = encodeFunctionData({
              abi: ERC20_ABI,
              functionName: "approve",
              args: [permit2Address, MAX_ALLOWANCE],
            });

            const approveNonce = await publicClient.getTransactionCount({
              address,
              blockTag: "pending",
            });

            const approveUnsignedTx = {
              to: sourceChain.USDC as Address,
              data: approveData,
              value: 0n,
              gas: 120_000n,
              maxFeePerGas: 30_000_000_000n,
              maxPriorityFeePerGas: 1_500_000_000n,
              nonce: approveNonce,
              chainId,
            };

            const approveRawUnsignedTx =
              serializeTransaction(approveUnsignedTx);
            const approveTxBuffer = hexToBytes(approveRawUnsignedTx);

            flowLog.ledger(
              `Firmando approve para Permit2 en ${sourceChain.label}`
            );
            const approveSigState: any = await firstValueFrom(
              signerEth
                .signTransaction(derivationPath, approveTxBuffer)
                .observable.pipe(
                  filter((s: unknown) => {
                    const status = (s as any).status;
                    flowLog.ledger(
                      `Estado approve (${sourceChain.label}): ${status}`
                    );
                    if (status === DeviceActionStatus.Error) {
                      const error = (s as any).error;
                      const errorMsg =
                        error?.message || error?._tag || String(error);
                      throw new Error(errorMsg);
                    }
                    return (
                      status === DeviceActionStatus.Completed ||
                      status === "completed"
                    );
                  }),
                  take(1),
                  timeout(120000),
                  catchError((error: unknown) => {
                    const errorMsg =
                      error instanceof Error ? error.message : String(error);
                    console.error("   ❌ Error firmando approve:", errorMsg);
                    return throwError(() => new Error(errorMsg));
                  })
                )
            );

            const approveSig = approveSigState.output;
            const approveRawSignedTx = serializeTransaction(
              approveUnsignedTx,
              {
                r: approveSig.r,
                s: approveSig.s,
                v: BigInt(approveSig.v),
              }
            );

            approveHash = await publicClient.sendRawTransaction({
              serializedTransaction: approveRawSignedTx,
            });

            flowLog.tx(
              `${sourceChain.label} approve hash: ${approveHash}`
            );
            await publicClient.waitForTransactionReceipt({
              hash: approveHash,
            });
          }

          const permit2NonceAbi = [
            {
              inputs: [
                { name: "owner", type: "address" },
                { name: "word", type: "uint256" },
              ],
              name: "nonceBitmap",
              outputs: [{ name: "", type: "uint256" }],
              stateMutability: "view",
              type: "function",
            },
          ] as const;

          const word = 0n;
          const nonceBitmap = await publicClient.readContract({
            address: PERMIT2_ADDRESS(chainId),
            abi: permit2NonceAbi,
            functionName: "nonceBitmap",
            args: [address, word],
          });

          // Encontrar el primer bit no usado (nonce disponible)
          let nonce = 0n;
          for (let i = 0; i < 256; i++) {
            const bit = 1n << BigInt(i);
            if ((nonceBitmap & bit) === 0n) {
              nonce = word * 256n + BigInt(i);
              break;
            }
          }
          
          // ✅ GASLESS: NO se necesita approve! Usamos receiveAndBridgeGasless con SignatureTransfer

          // 2) Construir PermitTransferFrom (SignatureTransfer)
          // IMPORTANTE: Se ejecuta en SOURCE chain, por lo que token y spender son de SOURCE
          const blockTimestamp = (await publicClient.getBlock()).timestamp;
          const deadline = blockTimestamp + 3600n; // 1 hora

          const permit: IPermitTransferFrom = {
            permitted: {
              token: sourceChain.USDC as Address, // USDC de la SOURCE chain (donde está el token)
              amount: amount, // uint256
            },
            spender: sourceValidatorAddress, // Validator de la SOURCE chain (donde se ejecuta)
            nonce: nonce, // uint256 - IMPORTANTE: debe ser el nonce de Permit2 en SOURCE chain
            deadline: deadline, // uint256
          };

          // 3) EIP-712 TypedData para Permit2 SignatureTransfer (como en el script)
          const typedData = {
            domain: {
              name: "Permit2",
              chainId: chainId, // chainId de la SOURCE chain (donde se ejecuta la transacción)
              verifyingContract: PERMIT2_ADDRESS(chainId),
            },
            types: {
              TokenPermissions: [
                { name: "token", type: "address" },
                { name: "amount", type: "uint256" },
              ],
              PermitTransferFrom: [
                { name: "permitted", type: "TokenPermissions" },
                { name: "spender", type: "address" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
              ],
            },
            primaryType: "PermitTransferFrom" as const,
            message: {
              permitted: {
                token: permit.permitted.token,
                amount: permit.permitted.amount,
              },
              spender: permit.spender,
              nonce: permit.nonce,
              deadline: permit.deadline,
            },
          };

          // Firmar PermitTransferFrom (SignatureTransfer)
          flowLog.ledger("Firmando PermitTransferFrom (gasless)...");
          flowLog.ledger("Esperando confirmación del Ledger...");

          let typedDataSigState: any;
          try {
            flowLog.ledger(`Firmando permit en ${sourceChain.label}`);
            const observable = signerEth.signTypedData(
              derivationPath,
              typedData
            ).observable;

            typedDataSigState = await firstValueFrom(
              observable.pipe(
                filter((s: unknown) => {
                  const status = (s as any).status;
                  flowLog.ledger(
                    `Estado permit (${sourceChain.label}): ${status}`
                  );
                  
                  if (status === DeviceActionStatus.Error) {
                    const error = (s as any).error;
                    let errorMsg = "Unknown device error";
                    
                    if (error) {
                      if (typeof error === "string") {
                        errorMsg = error;
                      } else if (error.message) {
                        errorMsg = error.message;
                      } else if (error._tag) {
                        errorMsg = error._tag;
                        if (error.originalError?.message) {
                          errorMsg += `: ${error.originalError.message}`;
                        } else if (error.err) {
                          errorMsg += `: ${error.err}`;
                        }
                      }
                    }
                    
                    console.error("   ❌ Error del dispositivo Ledger:", errorMsg);
                    throw new Error(errorMsg);
                  }
                  
                  const isCompleted = status === DeviceActionStatus.Completed || status === 'completed';
                  return isCompleted;
                }),
                take(1),
                timeout(120000),
                catchError((error: unknown) => {
                  const errorMsg = error instanceof Error ? error.message : String(error);
                  console.error("   ❌ Error en signTypedData:", errorMsg);
                  return throwError(() => new Error(errorMsg));
                })
              )
            );

            flowLog.ledger(`Permit firmado en ${sourceChain.label}`);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`   ❌ Error firmando permit:`, errorMsg);
            throw new Error(`Permit signature failed: ${errorMsg}`);
          }

          if (!typedDataSigState?.output) {
            throw new Error("Permit signature failed - no output received");
          }

          const typedSig = typedDataSigState.output;
          const signature = signatureToHex({
            r: typedSig.r,
            s: typedSig.s,
            v: BigInt(typedSig.v),
          });

          // 4) Obtener el routeID de la destination chain (LayerZero endpoint ID)
          const dstEid = destChain.routeID;
          if (!dstEid) {
            throw new Error(`No routeID configurado para ${destChain.label}`);
          }

          // 5) Obtener el fee del bridge usando quoteBridge
          // IMPORTANTE: El bridge envía tokens desde SOURCE hacia DESTINATION, por lo que:
          // - quoteBridge debe llamarse en la SOURCE chain (donde está el validator)
          // - Pero la transacción se ejecuta en la DESTINATION chain (usando su chainId y RPC)
          const extraOptions =
            "0x0003010011010000000000000000000000000000ea60" as Hex; // Default LayerZero options
          const minAmountLD = amount; // Sin slippage tolerance por ahora

          // sourceValidatorAddress ya está declarado arriba para el Permit2
          if (!sourceChain.USDC) {
            throw new Error(
              `No USDC configurado para ${sourceChain.label} (SOURCE)`
            );
          }

          // Crear un publicClient para la SOURCE chain para llamar a quoteBridge
          // (el validator está en la SOURCE chain, por eso necesitamos un client de source)
          const sourceChainId = await getChainIdFromRpc(sourceChain.rpc!);
          const sourceViemChain =
            CHAIN_LABEL_TO_VIEM_CHAIN[sourceChain.label] || sepolia;
          const sourcePublicClient = createPublicClient({
            chain: {
              ...sourceViemChain,
              id: sourceChainId,
            },
            transport: http(sourceChain.rpc!),
          });

          // Obtener el fee del bridge usando quoteBridge en el validator de la SOURCE chain
          // (el bridge envía desde source, por eso necesita el token y validator de source)
          const bridgeFee = (await sourcePublicClient.readContract({
            address: sourceValidatorAddress, // Validator de la SOURCE chain (el bridge envía desde source)
            abi: permit2TransferValidatorAbi,
            functionName: "quoteBridge",
            args: [
              sourceChain.USDC as Address, // Token de la SOURCE chain (el token que se envía)
              dstEid, // Endpoint ID de la destination chain
              address, // dstAddress = address del usuario en la destination chain
              amount,
              minAmountLD,
              extraOptions,
            ],
          })) as bigint;

          // 6) Tx a validator.receiveAndBridgeGasless
          // IMPORTANTE: El bridge envía desde SOURCE, por eso usa el validator de SOURCE
          // La transacción se ejecuta en la SOURCE chain (usando su chainId y RPC)
          // Usa receiveAndBridgeGasless con PermitTransferFrom (SignatureTransfer) - NO requiere approve!
          const { transaction: bridgeTx, unsignedTx: bridgeUnsignedTx } =
            await buildTransactionReceiveAndBridgeGasless(
              permit,
              signature,
              address,
              dstEid,
              address, // dstAddress = address del usuario en la destination chain
              minAmountLD,
              extraOptions,
              sourceValidatorAddress, // Validator de la SOURCE chain (el bridge envía desde source)
              bridgeFee,
              publicClient
            );

          if (!bridgeTx) {
            throw new Error("Bridge transaction is null");
          }

          if (bridgeUnsignedTx.chainId !== chainId) {
            console.error(
              `   ⚠️ ADVERTENCIA: ChainId en bridgeUnsignedTx (${bridgeUnsignedTx.chainId}) no coincide con el esperado (${chainId})`
            );
          }

          // Firmar transacción del bridge
          flowLog.ledger(
            `Firmando bridge transaction en ${sourceChain.label}`
          );
          flowLog.ledger("Esperando confirmación del Ledger...");
          
          let bridgeSigState: any;
          try {
            bridgeSigState = await firstValueFrom(
              signerEth
                .signTransaction(derivationPath, bridgeTx)
                .observable.pipe(
                  filter((s: unknown) => {
                    const status = (s as any).status;
                    flowLog.ledger(
                      `Estado bridge tx (${sourceChain.label}): ${status}`
                    );
                    
                    if (status === DeviceActionStatus.Error) {
                      const error = (s as any).error;
                      const errorMsg = error?.message || error?._tag || String(error);
                      console.error("   ❌ Error del dispositivo:", errorMsg);
                      throw new Error(errorMsg);
                    }
                    
                    return status === DeviceActionStatus.Completed || status === 'completed';
                  }),
                  take(1),
                  timeout(120000),
                  catchError((error: unknown) => {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    console.error("   ❌ Error en signTransaction:", errorMsg);
                    return throwError(() => new Error(errorMsg));
                  })
                )
            );
            
            flowLog.ledger(
              `Bridge transaction firmada en ${sourceChain.label}`
            );
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`   ❌ Error firmando bridge transaction:`, errorMsg);
            throw new Error(`Bridge signature failed: ${errorMsg}`);
          }

          if (!bridgeSigState?.output) {
            throw new Error("Bridge signature failed - no output received");
          }

          const bridgeSig = bridgeSigState.output;
          const bridgeRawSignedTx = serializeTransaction(bridgeUnsignedTx, {
            r: bridgeSig.r,
            s: bridgeSig.s,
            v: BigInt(bridgeSig.v),
          });

          // Guardar la transacción firmada para enviar después
          signedTransactions.push({
            sourceChain,
            destChain,
            relationKey,
            publicClient,
            bridgeRawSignedTx,
            approveHash,
          });

        } catch (error) {
          console.error(`   ❌ Error preparando ${sourceChain.label} → ${destChain.label}:`, error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`   ❌ Detalle del error: ${errorMsg}`);
          
          preparationErrors.push({
            sourceChain,
            destChain,
            relationKey,
            error: errorMsg,
          });
          // Continuar con la siguiente transacción
        }
    }

    if (preparationErrors.length > 0) {
      console.warn(`⚠️ ${preparationErrors.length} transacciones fallaron en preparación:`);
      preparationErrors.forEach((err) => {
        console.warn(`   - ${err.sourceChain.label} → ${err.destChain.label}: ${err.error}`);
      });
    }
    
    if (signedTransactions.length === 0) {
      console.error("❌ No hay transacciones firmadas para enviar");
      return;
    }

    // FASE 2: Enviar TODAS las transacciones en PARALELO
    const sendPromises = signedTransactions.map(async (signedTx) => {
      try {
        const bridgeHash = await signedTx.publicClient.sendRawTransaction({
          serializedTransaction: signedTx.bridgeRawSignedTx,
        });

        flowLog.tx(
          `${signedTx.sourceChain.label} → ${signedTx.destChain.label}: ${bridgeHash}`
        );

        return {
          chain: signedTx.sourceChain.label,
          relationKey: signedTx.relationKey,
          bridgeHash,
          approveHash: signedTx.approveHash,
          success: true,
        };
      } catch (error) {
        console.error(`   ❌ Error enviando ${signedTx.sourceChain.label}:`, error);
        return {
          chain: signedTx.sourceChain.label,
          relationKey: signedTx.relationKey,
          error: error instanceof Error ? error.message : String(error),
          approveHash: signedTx.approveHash,
          success: false,
        };
      }
    });

    const results = await Promise.all(sendPromises);

    // Agregar los errores de preparación a los resultados
    preparationErrors.forEach((prepError) => {
      results.push({
        chain: prepError.sourceChain.label,
        relationKey: prepError.relationKey,
        error: `Preparación falló: ${prepError.error}`,
        approveHash: undefined,
        success: false,
      });
    });

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    // Si todas las transacciones fueron exitosas, cerrar el modal, colapsar el grafo y mostrar toast
    if (successful === results.length && successful > 0) {
      // Colapsar el grafo primero
      if (collapseGraph) {
        collapseGraph();
      }

      // Cerrar el modal
      handleClose();

      // Llamar al callback para mostrar el toast después de un pequeño delay
      setTimeout(() => {
        if (onSendSuccess) {
          onSendSuccess();
        }
      }, 300); // Esperar a que termine la animación de cierre del modal
    } else if (failed > 0) {
      // Si hubo errores, solo cerrar el modal (no mostrar toast de éxito)
      console.warn(
        "⚠️ Algunas transacciones fallaron, no se mostrará toast de éxito"
      );
      // No cerrar el modal si hay errores, para que el usuario pueda ver qué pasó
      // handleClose();
    }
  };

  // Cerrar modal con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Cerrar modal al hacer click fuera
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen || !chainInfo) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4 md:p-6 ${
        isClosing ? "animate-fade-out" : "animate-fade-in"
      }`}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`bg-gray-900 rounded-xl shadow-2xl w-full max-w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[95vh] overflow-y-auto transform transition-all border border-gray-700/50 ${
          isClosing ? "animate-scale-out" : "animate-scale-in"
        }`}
      >
        {/* Header with Gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
          <div className="relative flex items-center justify-between p-3 sm:p-4 md:p-6 border-b border-gray-700/50">
            <div className="flex items-center space-x-2 sm:space-x-4">
              {activeSourceChainInfo?.logo && (
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full overflow-hidden bg-gray-800/50 backdrop-blur-sm flex items-center justify-center ring-2 ring-blue-500/30 shadow-lg">
                  <img
                    src={activeSourceChainInfo.logo}
                    alt={activeSourceChainInfo.label}
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 object-contain"
                  />
                </div>
              )}
              <div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white bg-clip-text bg-gradient-to-r from-white to-gray-300">
                  {activeSourceChainInfo?.label || chainLabel}
                </h2>
                <p className="text-gray-400 text-xs sm:text-sm mt-1">
                  {activeSourceChainInfo?.name || chainInfo.name}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-all hover:rotate-90 duration-300 p-2 hover:bg-gray-800/50 rounded-lg"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
          {/* Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-2 sm:p-3 border border-gray-700/50 hover:border-gray-600/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs sm:text-sm font-medium">
                  Status
                </span>
                <span
                  className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                    chainInfo.enabled
                      ? "bg-green-900/50 text-green-300 border border-green-700/50"
                      : "bg-red-900/50 text-red-300 border border-red-700/50"
                  }`}
                >
                  <span
                    className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${
                      chainInfo.enabled ? "bg-green-400" : "bg-red-400"
                    }`}
                  ></span>
                  {chainInfo.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-2 sm:p-3 border border-gray-700/50 hover:border-gray-600/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-xs sm:text-sm font-medium">
                  Network
                </span>
                <span
                  className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                    chainInfo.network
                      ? "bg-blue-900/50 text-blue-300 border border-blue-700/50"
                      : "bg-gray-900/50 text-gray-300 border border-gray-700/50"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      chainInfo.network ? "bg-blue-400" : "bg-gray-400"
                    }`}
                  ></span>
                  {chainInfo.network ? "Connected" : "Floating"}
                </span>
              </div>
            </div>
          </div>

          {/* Chain Details */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
            <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              <svg
                className="w-4 h-4 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Chain Information
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex flex-col">
                <span className="text-gray-400 text-xs">Chain ID</span>
                <span className="text-white font-mono bg-gray-900/50 px-2 py-1 rounded mt-1 text-xs">
                  {chainInfo.id}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-400 text-xs">Label</span>
                <span className="text-white font-semibold mt-1">
                  {chainInfo.label}
                </span>
              </div>
              <div className="flex flex-col col-span-2">
                <span className="text-gray-400 text-xs">Name</span>
                <span className="text-white font-semibold mt-1">
                  {chainInfo.name}
                </span>
              </div>
            </div>
          </div>

          {/* Native Balance Card - Mostrar balance ETH/token nativo */}
          {selectedDestination &&
            (() => {
              const destNumId = parseInt(
                selectedDestination.replace("chain-", "")
              );
              const destChain = chains.find((c) => c.id === destNumId);
              const hasRpc = destChain?.rpc;

              return hasRpc ? (
                <div className="bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-indigo-900/30 backdrop-blur-sm rounded-lg p-4 border border-purple-500/30 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/20 to-orange-400/20 flex items-center justify-center border border-yellow-400/30">
                        <svg
                          className="w-5 h-5 text-yellow-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <span className="text-gray-400 text-xs font-medium">
                          Native Balance
                        </span>
                        <div className="text-white font-bold text-lg mt-0.5">
                          {isLoadingNativeBalance ? (
                            <span className="text-gray-500">Loading...</span>
                          ) : nativeBalance !== null ? (
                            <>
                              {nativeBalance.toFixed(6)}{" "}
                              <span className="text-yellow-400/80 text-sm font-semibold">
                                ETH
                              </span>
                            </>
                          ) : (
                            <span className="text-gray-500">N/A</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {destChain && (
                      <div className="flex items-center gap-2">
                        <img
                          src={destChain.logo}
                          alt={destChain.label}
                          className="w-8 h-8 rounded-full border-2 border-purple-400/30"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : null;
            })()}

          {/* Source Blockchains - Todas las sources disponibles */}
          {/* IMPORTANTE: Estas son las SOURCE chains que firman y ejecutan las transacciones */}
          {sourceChains.length > 0 && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
              <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                Source blockchain (Send from)
              </h3>

              {/* Tabs como botones */}
              <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-2">
                {sourceChains.map((chain) => {
                  const chainKey = `chain-${chain.id}`;
                  const isActive = activeTab === chainKey;
                  return (
                    <button
                      key={chain.id}
                      onClick={() => setActiveTab(chainKey)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all whitespace-nowrap ${
                        isActive
                          ? "bg-purple-900/30 border-purple-500/50 shadow-lg"
                          : "bg-gray-900/50 border-gray-700/50 hover:border-purple-500/30"
                      }`}
                    >
                      <img
                        src={chain.logo}
                        alt={chain.label}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-white font-medium text-sm">
                        {chain.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Token Balance & Sliders para la relación activa (source -> destination) */}
          {/* IMPORTANTE: activeTab = SOURCE chain (firma y envía), selectedDestination = DESTINATION chain (recibe) */}
          {activeTab && selectedDestination && tokenBalances[activeTab] && (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
              <h3 className="text-base font-semibold text-white mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Send from (Source:{" "}
                  {(() => {
                    const sourceNumId = parseInt(
                      activeTab.replace("chain-", "")
                    );
                    const sourceChain = chains.find(
                      (c) => c.id === sourceNumId
                    );
                    return sourceChain?.label || activeTab;
                  })()}
                  )
                </div>

                {/* Logos de chains DESTINATION relacionadas con la source activa - clickeables */}
                {/* Estas son las DESTINATION chains hacia donde se enrutan los tokens */}
                {activeTab &&
                  (() => {
                    // Filtrar destinations solo de la source activa
                    const relatedDestinations = pairs
                      .filter((p) => p.sourceId === activeTab)
                      .map((pair) => {
                        const numId = parseInt(
                          pair.destinationId.replace("chain-", "")
                        );
                        return chains.find((c) => c.id === numId);
                      })
                      .filter(Boolean) as typeof chains;

                    return (
                      relatedDestinations.length > 0 && (
                        <div className="flex items-center">
                          {relatedDestinations.map((chain, index) => {
                            const chainKey = `chain-${chain.id}`;
                            const isSelected = selectedDestination === chainKey;
                            return (
                              <button
                                key={chain.id}
                                onClick={() => setSelectedDestination(chainKey)}
                                className={`relative w-9 h-9 rounded-full border-2 bg-gray-800 overflow-hidden shadow-lg transition-all hover:scale-110 ${
                                  isSelected
                                    ? "border-purple-500 shadow-purple-500/50 ring-2 ring-purple-400/30"
                                    : "border-gray-900 hover:border-purple-400/50"
                                }`}
                                style={{
                                  marginLeft: index === 0 ? "0" : "-12px",
                                  zIndex: isSelected ? 50 : 10 + index,
                                }}
                                title={chain.label}
                              >
                                <img
                                  src={chain.logo}
                                  alt={chain.label}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            );
                          })}
                        </div>
                      )
                    );
                  })()}
              </h3>

              {/* Tokens en columna */}
              <div className="space-y-3">
                {/* USDC */}
                {(() => {
                  // Verificar si la source chain tiene RPC y USDC
                  const sourceNumId = activeTab
                    ? parseInt(activeTab.replace("chain-", ""))
                    : null;
                  const sourceChain = sourceNumId
                    ? chains.find((c) => c.id === sourceNumId)
                    : null;
                  
                  // El slider debe mostrar el balance de la SOURCE chain (de donde envías)
                  const hasRpcAndUSDC = sourceChain?.rpc && sourceChain?.USDC;
                  const balance =
                    sourceUSDCBalance !== null
                      ? sourceUSDCBalance
                      : 0;
                  const isEnabled =
                    hasRpcAndUSDC &&
                    !isLoadingSourceUSDCBalance &&
                    sourceUSDCBalance !== null; // null significa error o no cargado, 0 es válido

                  return (
                    <div
                      className={`bg-gray-900/50 rounded-lg p-3 border border-gray-700/30 ${
                        !isEnabled ? "opacity-60" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <img src={usdcIcon} alt="USDC" className="w-7 h-7" />
                          <span className="text-white font-semibold">USDC</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-400 mb-0.5">
                            {isLoadingSourceUSDCBalance
                              ? "Loading..."
                              : `Available: $${balance.toFixed(2)}`}
                          </div>
                          <div className="text-white font-bold">
                            $
                            {(
                              (balance *
                                (tokenPercentages[
                                  `${activeTab}->${selectedDestination}`
                                ]?.usdc || 100)) /
                              100
                            ).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-blue-400 text-xs font-semibold">
                            {tokenPercentages[
                              `${activeTab}->${selectedDestination}`
                            ]?.usdc || 100}
                            %
                          </div>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={
                          tokenPercentages[
                            `${activeTab}->${selectedDestination}`
                          ]?.usdc || 100
                        }
                        disabled={!isEnabled}
                        onChange={(e) => {
                          if (!activeTab || !selectedDestination || !isEnabled)
                            return;
                          const relationKey = `${activeTab}->${selectedDestination}`;
                          const newValue = Number(e.target.value);
                          setTokenPercentages((prev) => {
                            return {
                              ...prev,
                              [relationKey]: {
                                dai: 0,
                                usdc: newValue,
                                tether: 0,
                              },
                            };
                          });
                        }}
                        onMouseUp={async () => {
                          // Capturar amount cuando se suelta el slider
                          if (
                            !activeTab ||
                            !selectedDestination ||
                            !isEnabled ||
                            !sourceChain ||
                            !sourceChain.rpc ||
                            !sourceChain.USDC ||
                            !address
                          )
                            return;

                          // IMPORTANTE: Calcular nonce de permit2 para la SOURCE chain (no la destination)
                          // El permit se crea en la source chain, por lo que el nonce debe obtenerse de ahí
                          try {
                            // Obtener la source chain (activeTab)
                            const sourceNumId = parseInt(
                              activeTab.replace("chain-", "")
                            );
                            const sourceChain = chains.find(
                              (c) => c.id === sourceNumId
                            );

                            if (
                              !sourceChain ||
                              !sourceChain.rpc ||
                              !sourceChain.USDC
                            )
                              return;

                            // Obtener el chainId correcto desde el RPC de la SOURCE chain
                            const chainId = await getChainIdFromRpc(
                              sourceChain.rpc
                            );

                            // Obtener la chain de viem correspondiente a la SOURCE
                            const viemChain =
                              CHAIN_LABEL_TO_VIEM_CHAIN[sourceChain.label] ||
                              sepolia;

                            const publicClient = createPublicClient({
                              chain: {
                                ...viemChain,
                                id: chainId, // Usar el chainId real del RPC de la SOURCE chain
                              },
                              transport: http(sourceChain.rpc),
                            });

                            const sourceValidatorAddress =
                              sourceChain.validatorAddress as Address;
                            if (!sourceValidatorAddress) {
                              throw new Error(
                                `No validatorAddress configurado para ${sourceChain.label}`
                              );
                            }

                            // Usar nonceBitmap para SignatureTransfer (como en el script)
                            const permit2NonceAbi = [
                              {
                                inputs: [
                                  { name: "owner", type: "address" },
                                  { name: "word", type: "uint256" },
                                ],
                                name: "nonceBitmap",
                                outputs: [{ name: "", type: "uint256" }],
                                stateMutability: "view",
                                type: "function",
                              },
                            ] as const;

                            const word = 0n;
                            const nonceBitmap = await publicClient.readContract(
                              {
                                address: PERMIT2_ADDRESS(chainId),
                                abi: permit2NonceAbi,
                                functionName: "nonceBitmap",
                                args: [address, word],
                              }
                            );

                            // Encontrar el primer bit no usado (nonce)
                            let nonce = 0n;
                            for (let i = 0; i < 256; i++) {
                              const bit = 1n << BigInt(i);
                              if ((nonceBitmap & bit) === 0n) {
                                nonce = word * 256n + BigInt(i);
                                break;
                              }
                            }

                            // Guardar el nonce por sourceId (no destinationId)
                            setPermit2Nonces((prev) => ({
                              ...prev,
                              [activeTab]: nonce,
                            }));

                          } catch (error) {
                            console.error(`❌ Error calculando nonce:`, error);
                          }
                        }}
                        className={`w-full h-2 bg-gray-700 rounded-lg appearance-none slider ${
                          isEnabled
                            ? "cursor-pointer"
                            : "cursor-not-allowed opacity-50"
                        }`}
                        style={{
                          background: `linear-gradient(to right, #2775CA ${
                            tokenPercentages[
                              `${activeTab}->${selectedDestination}`
                            ]?.usdc || 100
                          }%, #374151 ${
                            tokenPercentages[
                              `${activeTab}->${selectedDestination}`
                            ]?.usdc || 100
                          }%)`,
                        }}
                      />
                      {!isEnabled && (
                        <div className="text-xs text-gray-500 mt-1">
                          {!hasRpcAndUSDC
                            ? "Source no tiene RPC o USDC configurado"
                            : "No hay balance disponible"}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-3 border-t border-gray-700/50">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-700/50 text-white rounded-lg hover:bg-gray-600/50 transition-all hover:scale-105 border border-gray-600/50 font-medium text-sm"
            >
              Close
            </button>
            <button
              onClick={handleSend}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all hover:scale-105 shadow-lg hover:shadow-blue-500/50 font-medium text-sm"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
