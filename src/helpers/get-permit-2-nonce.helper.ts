import type { Address, PublicClient } from "viem";
import { permit2Abi } from "../assets/abis/permit-2.abi";
import { PERMIT2_ADDRESS } from "../assets/addresses";

export async function getPermit2Nonce(
  publicClient: PublicClient,
  params: {
    owner: Address;
    token: Address;
    spender: Address;
  }
) {
  const { owner, token, spender } = params;

  const { amount, expiration, nonce } = (await publicClient.readContract({
    address: PERMIT2_ADDRESS(publicClient?.chain?.id ?? 0),
    abi: permit2Abi,
    functionName: "allowance",
    args: [owner, token, spender],
  })) as { amount: bigint; expiration: bigint; nonce: bigint };

  return {
    amount, // bigint
    expiration, // bigint
    nonce, // bigint
  };
}
