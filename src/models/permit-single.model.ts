// models/permit-single.model.ts
import type { Address } from "viem";

export interface IAllowanceTransferDetails {
  token: Address; // address
  amount: bigint; // uint160
  expiration: bigint; // uint48 (en segundos desde epoch)
  nonce: bigint; // uint48
}

export interface IPermitSingle {
  details: IAllowanceTransferDetails;
  spender: Address; // address
  sigDeadline: bigint; // uint256
}
