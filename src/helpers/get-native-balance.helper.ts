import { createPublicClient, http, formatEther, type Address } from "viem";
import { sepolia } from "viem/chains";

export async function getNativeBalance(
  rpcUrl: string,
  walletAddress: Address
): Promise<number> {
  try {
    const publicClient = createPublicClient({
      chain: sepolia, // Temporal, solo para crear el client
      transport: http(rpcUrl),
    });

    // Get native balance in wei
    const balance = await publicClient.getBalance({
      address: walletAddress,
    });

    // Convert to ETH (or native token)
    const balanceInEth = parseFloat(formatEther(balance));

    console.log("Native balance obtenido:", {
      rpcUrl,
      walletAddress,
      balance: balance.toString(),
      balanceInEth,
    });

    return balanceInEth;
  } catch (error) {
    console.error("Error fetching native balance from blockchain:", error);
    throw error;
  }
}

