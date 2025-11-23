import {
  createPublicClient,
  encodeFunctionData,
  http,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { sepolia } from "viem/chains";
import { serializeTransaction } from "viem";
import { hexaStringToBuffer } from "@ledgerhq/device-management-kit";
import { permit2TransferValidatorAbi } from "../assets/abis/permit2-transfer-validator.abi";
import type { IPermitSingle } from "../models/permit-single.model";

const client = createPublicClient({
  chain: sepolia,
  transport: http(),
});

export async function buildTransactionValidPermitAndTransfer(
  permitSingle: IPermitSingle,
  signature: Hex,
  owner: Address,
  recipient: Address,
  amount: bigint,
  contract: Address,
  publicClient?: PublicClient
) {
  const clientToUse = publicClient || client;
  const nonce = await clientToUse.getTransactionCount({ address: owner });

  const data = encodeFunctionData({
    abi: permit2TransferValidatorAbi,
    functionName: "validatePermitAndTransfer",
    args: [permitSingle, signature, owner, recipient, amount],
  });

  const unsignedTx = {
    to: contract,
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
