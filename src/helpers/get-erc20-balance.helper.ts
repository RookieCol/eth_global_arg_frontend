import { createPublicClient, http, type Address } from "viem";
import { sepolia } from "viem/chains";
import { erc20Abi } from "../assets/abis/erc20.abi";

export async function getERC20Balance(
  rpcUrl: string,
  tokenAddress: Address,
  walletAddress: Address
): Promise<number | null> {
  console.log(`🔍 [getERC20Balance] Inicio:`, { rpcUrl, tokenAddress, walletAddress });
  
  try {
    // Crear un client temporal para obtener el chainId real del RPC
    const tempClient = createPublicClient({
      chain: sepolia, // Temporal, solo para crear el client
      transport: http(rpcUrl),
    });
    
    console.log(`🔗 [getERC20Balance] Obteniendo chainId...`);
    const chainId = await tempClient.getChainId();
    console.log(`✅ [getERC20Balance] ChainId obtenido: ${chainId}`);
    
    // Crear el client con el chainId correcto
    const publicClient = createPublicClient({
      chain: {
        ...sepolia,
        id: chainId, // Usar el chainId real del RPC
      },
      transport: http(rpcUrl),
    });

    // Verificar si el contrato tiene código (es un contrato válido)
    console.log(`🔍 [getERC20Balance] Verificando si ${tokenAddress} es un contrato...`);
    const code = await publicClient.getBytecode({ address: tokenAddress });
    if (!code || code === "0x") {
      console.warn(`⚠️ [getERC20Balance] Address ${tokenAddress} no es un contrato válido`);
      return null;
    }
    console.log(`✅ [getERC20Balance] Contrato válido`);

    // Intentar obtener decimals - si falla, asumir 18 (estándar ERC20)
    let decimals = 18; // Default
    try {
      console.log(`🔍 [getERC20Balance] Obteniendo decimals...`);
      decimals = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "decimals",
      });
      console.log(`✅ [getERC20Balance] Decimals: ${decimals}`);
    } catch (decimalsError) {
      console.warn(`⚠️ [getERC20Balance] No se pudo obtener decimals para ${tokenAddress}, usando default 18:`, decimalsError);
      // Intentar obtener balanceOf de todas formas
    }

    // Get raw balance
    let rawBalance: bigint;
    try {
      console.log(`🔍 [getERC20Balance] Obteniendo balanceOf...`);
      rawBalance = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [walletAddress],
      });
      console.log(`✅ [getERC20Balance] Raw balance: ${rawBalance.toString()}`);
    } catch (balanceError) {
      console.warn(`⚠️ [getERC20Balance] No se pudo obtener balanceOf para ${tokenAddress}:`, balanceError);
      return null;
    }

    // Convert raw balance to human-readable format
    // Si el balance es 0, retornar 0 (no null) - 0 es un balance válido
    const balance = Number(rawBalance) / 10 ** decimals;

    console.log("✅ [getERC20Balance] Balance final obtenido:", {
      rpcUrl,
      tokenAddress,
      walletAddress,
      rawBalance: rawBalance.toString(),
      balance,
      decimals,
      isZero: balance === 0,
    });

    // Retornar 0 si el balance es 0, no null
    return balance;
  } catch (error) {
    console.error("❌ [getERC20Balance] Error fetching ERC20 balance:", error);
    return null; // Retornar null en lugar de lanzar error
  }
}

