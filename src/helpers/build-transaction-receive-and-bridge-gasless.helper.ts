import {
  encodeFunctionData,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { serializeTransaction } from "viem";
import { hexaStringToBuffer } from "@ledgerhq/device-management-kit";
import { permit2TransferValidatorAbi } from "../assets/abis/permit2-transfer-validator.abi";

// Estructura PermitTransferFrom (SignatureTransfer)
export interface IPermitTransferFrom {
  permitted: {
    token: Address;
    amount: bigint; // uint256
  };
  spender: Address; // Spender address (validator)
  nonce: bigint; // uint256
  deadline: bigint; // uint256
}

export async function buildTransactionReceiveAndBridgeGasless(
  permit: IPermitTransferFrom,
  signature: Hex,
  owner: Address,
  dstEid: number, // LayerZero endpoint ID (routeID)
  dstAddress: Address,
  minAmountLD: bigint,
  extraOptions: Hex,
  contract: Address,
  bridgeFee: bigint, // Fee de LayerZero
  publicClient: PublicClient
) {
  const nonce = await publicClient.getTransactionCount({ address: owner });

  // Construir la transacción usando receiveAndBridgeGasless (SignatureTransfer)
  const data = encodeFunctionData({
    abi: permit2TransferValidatorAbi,
    functionName: "receiveAndBridgeGasless",
    args: [
      {
        permitted: {
          token: permit.permitted.token,
          amount: permit.permitted.amount, // uint256
        },
        nonce: permit.nonce, // uint256
        deadline: permit.deadline, // uint256
      },
      owner,
      signature,
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

