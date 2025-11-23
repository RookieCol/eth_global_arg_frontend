import type { Address } from "viem";
import { sepolia } from "viem/chains";

export const ETHEREUM_SEPOLIA_PERMIT2_ADDRESS: Address =
  "0x000000000022D473030F116dDEE9F6B43aC78BA3";

export const PERMIT2_ADDRESS = (chainId: number) => {
  // Permit2 tiene la misma dirección en todas las chains
  return ETHEREUM_SEPOLIA_PERMIT2_ADDRESS;
};
