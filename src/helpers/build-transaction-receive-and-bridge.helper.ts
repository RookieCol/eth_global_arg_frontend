import {
  encodeFunctionData,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { serializeTransaction } from "viem";
import { hexaStringToBuffer } from "@ledgerhq/device-management-kit";
import { permit2TransferValidatorAbi } from "../assets/abis/permit2-transfer-validator.abi";
import type { IPermitSingle } from "../models/permit-single.model";

export async function buildTransactionReceiveAndBridge(
  permitSingle: IPermitSingle,
  signature: Hex,
  owner: Address,
  amount: bigint,
  dstEid: number, // LayerZero endpoint ID (routeID)
  dstAddress: Address,
  minAmountLD: bigint,
  extraOptions: Hex,
  contract: Address,
  bridgeFee: bigint, // Fee de LayerZero
  publicClient: PublicClient
) {
  const nonce = await publicClient.getTransactionCount({ address: owner });

  // El ABI espera uint160 para amount, pero viem maneja la conversión automáticamente
  const data = encodeFunctionData({
    abi: permit2TransferValidatorAbi,
    functionName: "receiveAndBridge",
    args: [
      permitSingle,
      signature,
      owner,
      amount, // viem convertirá automáticamente a uint160
      dstEid,
      dstAddress,
      minAmountLD,
      extraOptions,
    ],
  });

  const unsignedTx = {
    to: contract,
    data,
    value: bridgeFee, // Fee de LayerZero
    gas: 500_000n, // Más gas para el bridge
    maxFeePerGas: 30_000_000_000n,
    maxPriorityFeePerGas: 1_500_000_000n,
    nonce,
    chainId: publicClient.chain.id,
  };

  const rawUnsignedTx = serializeTransaction(unsignedTx);

  const transaction: Uint8Array | null = hexaStringToBuffer(rawUnsignedTx);

  return {
    transaction,
    unsignedTx,
    rawUnsignedTx,
  };
}
