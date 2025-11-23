import { webHidIdentifier } from "@ledgerhq/device-transport-kit-web-hid";
import { dmk } from "../../../../config/mdk.config";
import { filter, firstValueFrom, take } from "rxjs";
import { useEffect, useState } from "react";
import {
  DeviceActionStatus,
  DeviceStatus,
  type DeviceActionState,
} from "@ledgerhq/device-management-kit";
import { useDeviceSessionState } from "../../../../helpers";
import {
  type GetAddressDAOutput,
  type GetAddressDAError,
  type GetAddressDAIntermediateValue,
  type SignerEth,
  SignerEthBuilder,
} from "@ledgerhq/device-signer-kit-ethereum";
import Blockies from "react-blockies";

import { sepolia } from "viem/chains";
import { buildERC20ApproveTransaction } from "../../../../helpers/build-transaction.helper";
import {
  createPublicClient,
  http,
  serializeTransaction,
  signatureToHex,
  type Address,
} from "viem";
import { getPermit2Nonce } from "../../../../helpers/get-permit-2-nonce.helper";
import { PERMIT2_ADDRESS } from "../../../../assets/addresses";
import { buildTransactionValidPermitAndTransfer } from "../../../../helpers/build-transaction-valid-permit-and-transfer.helper.ts";
import type { IPermitSingle } from "../../../../models/permit-single.model.ts";
import { useWallet } from "../../../Wallet/context";
import { walletService } from "../../../../services/rest/octav/wallet";

const client = createPublicClient({
  chain: sepolia,
  transport: http(),
});

const derivationPath = "44'/60'/0'/0";

const validatorAddress =
  "0x762579DFD5e62Ab797282dc5495A92b8b6E7cB25" as Address;

const recipientAddress =
  "0x8A616031ce6Fbe5989D5f8A76Dee04D87cb2E3BD" as Address; // Santiago's ledger address

const usdcAddress = "0x07b091cC0eef5b03A41eB4bDD059B388cd3560D1" as Address; // Sepolia USDC address

const chainId = sepolia.id;

// Permit: 1 USDC
const amount = 1_000_000n; // 1 USDC con 6 decimales

export default function ConnectLedger() {
  // Wallet context
  const {
    setAddress,
    setWalletData,
    setIsLoading,
    setSignerEth: setContextSignerEth,
    setSessionId: setContextSessionId,
  } = useWallet();

  // states
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [signerEth, setSignerEth] = useState<SignerEth | undefined>(undefined);
  const [status, setStatus] = useState<DeviceStatus | undefined>(undefined);

  const [getAddressState, setGetAddressState] =
    useState<
      DeviceActionState<
        GetAddressDAOutput,
        GetAddressDAError,
        GetAddressDAIntermediateValue
      >
    >();

  const [getAddressOutput, setGetAddressOutput] = useState<
    GetAddressDAOutput | undefined
  >(undefined);

  const [getAddressError, setGetAddressError] = useState<
    GetAddressDAError | undefined
  >(undefined);

  const deviceSessionState = useDeviceSessionState(dmk, sessionId);

  useEffect(() => {
    const current = deviceSessionState?.deviceStatus;
    if (!current) return;

    setStatus(current);
  }, [deviceSessionState?.deviceStatus]);

  useEffect(() => {
    if (!signerEth) return;

    const { observable, cancel } = signerEth.getAddress(derivationPath);

    const sub = observable.subscribe(async (getAddressDAState) => {
      setGetAddressState(getAddressDAState);

      switch (getAddressDAState.status) {
        case DeviceActionStatus.Completed: {
          setGetAddressOutput(getAddressDAState.output);
          const ownerAddress = getAddressDAState.output.address as Address;

          // Guardar dirección en el contexto
          setAddress(ownerAddress);

          // Obtener información del wallet desde el servicio
          setIsLoading(true);
          walletService()
            .getBalances(ownerAddress)
            .then((walletInfo) => {
              if (walletInfo) {
                setWalletData(walletInfo);
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                console.log("💰 WALLET DATA - Información del servicio:");
                console.log("📍 Address:", walletInfo.address);
                console.log("💵 Networth:", walletInfo.networth);
                console.log("💸 Cash Balance:", walletInfo.cashBalance);
                console.log("📊 Total Cost Basis:", walletInfo.totalCostBasis);
                console.log("📈 Open PnL:", walletInfo.openPnl);
                console.log("📉 Closed PnL:", walletInfo.closedPnl);
                console.log("💼 Daily Income:", walletInfo.dailyIncome);
                console.log("💳 Daily Expense:", walletInfo.dailyExpense);
                console.log("🔗 Chains:", Object.keys(walletInfo.chains));
                console.log(
                  "📦 Asset by Protocols:",
                  walletInfo.assetByProtocols
                );
                console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                console.log(
                  "📋 Full Wallet Data:",
                  JSON.stringify(walletInfo, null, 2)
                );
              } else {
                console.warn("⚠️ No se pudo obtener información del wallet");
              }
            })
            .catch((error) => {
              console.error(
                "❌ Error obteniendo información del wallet:",
                error
              );
            })
            .finally(() => {
              setIsLoading(false);
            });

          try {
            // 1) Leer nonce de Permit2 (spender = validator)
            const { nonce: permit2Nonce } = await getPermit2Nonce(client, {
              owner: ownerAddress,
              token: usdcAddress,
              spender: validatorAddress,
            });

            console.log("Permit2 nonce:", permit2Nonce.toString());

            // 2) Approve ERC20 → Permit2
            const {
              transaction: approveTx,
              unsignedTx: approveUnsignedTx,
              rawUnsignedTx: approveRawUnsignedTx,
            } = await buildERC20ApproveTransaction(
              ownerAddress,
              PERMIT2_ADDRESS(chainId), // spender = contrato Permit2
              amount,
              usdcAddress
            );

            console.log("Approve unsigned tx:", approveRawUnsignedTx);

            const approveSigState = await firstValueFrom(
              signerEth
                .signTransaction(derivationPath, approveTx)
                .observable.pipe(
                  filter((s) => s.status === DeviceActionStatus.Completed),
                  take(1)
                )
            );

            if (!approveSigState.output) return;
            const approveSignature = approveSigState.output;

            const approveRawSignedTx = serializeTransaction(approveUnsignedTx, {
              r: approveSignature.r,
              s: approveSignature.s,
              v: BigInt(approveSignature.v),
            });

            console.log("Approve signed tx:", approveRawSignedTx);

            const approveHash = await client.sendRawTransaction({
              serializedTransaction: approveRawSignedTx,
            });

            console.log("Approve tx hash:", approveHash);

            // 3) Construir PermitSingle (para Permit2)
            const now = Math.floor(Date.now() / 1000);
            const expirationSec = now + 60 * 60 * 24; // +1 día
            const sigDeadlineSec = now + 60 * 10; // +10 min

            const permitSingle: IPermitSingle = {
              details: {
                token: usdcAddress,
                amount,
                expiration: BigInt(expirationSec),
                nonce: permit2Nonce,
              },
              spender: validatorAddress,
              sigDeadline: BigInt(sigDeadlineSec),
            };

            // 4) EIP-712 TypedData para Permit2
            const typedData = {
              domain: {
                name: "Permit2",
                chainId,
                verifyingContract: PERMIT2_ADDRESS(chainId),
              },
              types: {
                PermitSingle: [
                  { name: "details", type: "PermitDetails" },
                  { name: "spender", type: "address" },
                  { name: "sigDeadline", type: "uint256" },
                ],
                PermitDetails: [
                  { name: "token", type: "address" },
                  { name: "amount", type: "uint160" },
                  { name: "expiration", type: "uint48" },
                  { name: "nonce", type: "uint48" },
                ],
              },
              primaryType: "PermitSingle",
              message: {
                details: {
                  token: usdcAddress,
                  amount: Number(amount),
                  expiration: expirationSec,
                  nonce: Number(permit2Nonce),
                },
                spender: validatorAddress,
                sigDeadline: sigDeadlineSec,
              },
            } as const;

            const typedDataSigState = await firstValueFrom(
              signerEth
                .signTypedData(derivationPath, typedData)
                .observable.pipe(
                  filter((s) => s.status === DeviceActionStatus.Completed),
                  take(1)
                )
            );

            if (!typedDataSigState.output) return;

            const typedSig = typedDataSigState.output;

            // 👈 normalizamos v para Permit2 (27/28 en lugar de 0/1)
            let v = typedSig.v;
            if (v === 0 || v === 1) {
              v = 27 + v;
            }

            const permitSignatureHex = signatureToHex({
              r: typedSig.r,
              s: typedSig.s,
              v: BigInt(v),
            });

            console.log("Permit2 signature:", permitSignatureHex);

            // 5) Tx a validator.validatePermitAndTransfer (contract = validatorAddress)
            const {
              transaction: validatorTx,
              unsignedTx: validatorUnsignedTx,
              rawUnsignedTx: validatorRawUnsignedTx,
            } = await buildTransactionValidPermitAndTransfer(
              permitSingle,
              permitSignatureHex,
              ownerAddress,
              recipientAddress,
              amount,
              validatorAddress
            );

            console.log(
              "validatePermitAndTransfer unsigned tx:",
              validatorRawUnsignedTx
            );

            const validatorSigState = await firstValueFrom(
              signerEth
                .signTransaction(derivationPath, validatorTx)
                .observable.pipe(
                  filter((s) => s.status === DeviceActionStatus.Completed),
                  take(1)
                )
            );

            if (!validatorSigState.output) return;
            const validatorSig = validatorSigState.output;

            const validatorRawSignedTx = serializeTransaction(
              validatorUnsignedTx,
              {
                r: validatorSig.r,
                s: validatorSig.s,
                v: BigInt(validatorSig.v),
              }
            );

            console.log(
              "validatePermitAndTransfer signed tx:",
              validatorRawSignedTx
            );

            const validatorHash = await client.sendRawTransaction({
              serializedTransaction: validatorRawSignedTx,
            });

            console.log(
              "validatePermitAndTransfer tx hash (validator):",
              validatorHash
            );
          } catch (e) {
            console.error(e);
          }

          break;
        }
        case DeviceActionStatus.Error:
          setGetAddressError(getAddressDAState.error);
          break;
        default:
          break;
      }
    });

    return () => {
      sub.unsubscribe();
      cancel();
    };
  }, [signerEth, setAddress, setWalletData, setIsLoading]);

  // functions
  const cleanState = () => {
    setSessionId(undefined);
    setSignerEth(undefined);
    setGetAddressState(undefined);
    setGetAddressOutput(undefined);
    setGetAddressError(undefined);
    // Limpiar contexto de wallet
    setAddress(undefined);
    setWalletData(null);
    setIsLoading(false);
    // Limpiar signerEth y sessionId del contexto
    setContextSignerEth(undefined);
    setContextSessionId(undefined);
  };

  function monitorDeviceState(sessionId: string) {
    const stateSubscription = dmk
      .getDeviceSessionState({ sessionId })
      .subscribe({
        next: (state) => {
          if (state.deviceStatus === DeviceStatus.LOCKED) {
            setStatus(DeviceStatus.LOCKED);
          } else if (state.deviceStatus === DeviceStatus.BUSY) {
            setStatus(DeviceStatus.BUSY);
          } else if (state.deviceStatus === DeviceStatus.CONNECTED) {
            setStatus(DeviceStatus.CONNECTED);
          } else if (state.deviceStatus === DeviceStatus.NOT_CONNECTED) {
            setStatus(DeviceStatus.NOT_CONNECTED);
            cleanState();
          }
        },
        error: (error) => {
          console.error(error);
        },
      });

    return stateSubscription;
  }

  const connectLedger = async () => {
    try {
      setSessionId(undefined);

      const discoveredDevice = await firstValueFrom(
        dmk.startDiscovering({ transport: webHidIdentifier })
      );

      const sessionId = await dmk.connect({ device: discoveredDevice });

      monitorDeviceState(sessionId);

      const signer = new SignerEthBuilder({
        dmk,
        sessionId,
        originToken:
          "1e55ba3959f4543af24809d9066a2120bd2ac9246e626e26a1ff77eb109ca0e5",
      }).build();

      setSignerEth(signer);
      setSessionId(sessionId);
      // Guardar en contexto
      setContextSignerEth(signer);
      setContextSessionId(sessionId);
    } catch (error) {
      console.error(error);
    }
  };

  const disconnectLedger = async () => {
    try {
      if (!sessionId) return;
      await dmk.disconnect({ sessionId });
      cleanState();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      {sessionId ? (
        <button
          className="flex items-center gap-4 border border-zinc-700 rounded-full p-4"
          onClick={disconnectLedger}
        >
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-bold">
              {getAddressOutput?.address.slice(0, 6)}...
              {getAddressOutput?.address.slice(-4)}
            </p>
            <p
              className={`text-xs font-bold ${
                status === DeviceStatus.BUSY
                  ? "text-yellow-300"
                  : status === DeviceStatus.CONNECTED
                  ? "text-green-300"
                  : status === DeviceStatus.NOT_CONNECTED
                  ? "text-red-300"
                  : "text-gray-300"
              }`}
            >
              {status}
            </p>
          </div>
          <Blockies
            seed={getAddressOutput?.address ?? ""}
            size={15}
            scale={3}
            className="w-fit rounded-full"
          />
        </button>
      ) : (
        <button
          className="px-4 py-2 rounded-lg bg-zinc-600 active:scale-95 transition-transform duration-100"
          onClick={connectLedger}
        >
          <h1 className="text-sm font-bold">Connect Ledger</h1>
        </button>
      )}
    </div>
  );
}
