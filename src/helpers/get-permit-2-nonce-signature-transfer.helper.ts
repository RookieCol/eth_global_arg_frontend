import type { Address, PublicClient } from "viem";
import { PERMIT2_ADDRESS } from "../assets/addresses";

// ABI para nonceBitmap de Permit2 SignatureTransfer
const permit2NonceBitmapAbi = [
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

/**
 * Obtiene el siguiente nonce disponible de Permit2 SignatureTransfer usando nonceBitmap
 * Siguiendo la lógica del script: busca el primer bit no usado en el bitmap
 */
export async function getPermit2NonceSignatureTransfer(
  publicClient: PublicClient,
  params: {
    owner: Address;
  }
): Promise<bigint> {
  const { owner } = params;
  const chainId = publicClient?.chain?.id ?? 0;
  const permit2Address = PERMIT2_ADDRESS(chainId);

  // Obtener el bitmap para word 0
  const word = 0n;
  const nonceBitmap = (await publicClient.readContract({
    address: permit2Address,
    abi: permit2NonceBitmapAbi,
    functionName: "nonceBitmap",
    args: [owner, word],
  })) as bigint;

  // Encontrar el primer bit no usado (nonce)
  let nonce = 0n;
  for (let i = 0; i < 256; i++) {
    const bit = 1n << BigInt(i);
    if ((nonceBitmap & bit) === 0n) {
      nonce = word * 256n + BigInt(i);
      break;
    }
  }

  return nonce;
}

