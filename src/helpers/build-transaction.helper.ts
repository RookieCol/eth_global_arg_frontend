import {
  createPublicClient,
  encodeFunctionData,
  erc20Abi,
  http,
  type Address,
  type PublicClient,
} from "viem";
import { sepolia } from "viem/chains";
import { serializeTransaction } from "viem";
import { hexaStringToBuffer } from "@ledgerhq/device-management-kit";

const client = createPublicClient({
  chain: sepolia,
  transport: http(),
});

export async function buildERC20ApproveTransaction(
  owner: Address,
  spender: Address,
  amount: bigint,
  token: Address,
  publicClient?: PublicClient
) {
  const clientToUse = publicClient || client;
  const nonce = await clientToUse.getTransactionCount({ address: owner });

  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, amount],
  });

  const unsignedTx = {
    to: token,
    data,
    value: 0n,
    gas: 120_000n,
    maxFeePerGas: 30_000_000_000n,
    maxPriorityFeePerGas: 1_500_000_000n,
    nonce,
    chainId: clientToUse.chain.id,
  };

  const rawUnsignedTx = serializeTransaction(unsignedTx);

  const transaction: Uint8Array | null = hexaStringToBuffer(rawUnsignedTx);

  return {
    transaction,
    unsignedTx,
    rawUnsignedTx,
  };
}
