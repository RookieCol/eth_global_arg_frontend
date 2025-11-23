export const permit2TransferValidatorAbi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint160",
        name: "amount",
        type: "uint160",
      },
    ],
    name: "PermitValidated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint32",
        name: "dstEid",
        type: "uint32",
      },
      {
        indexed: false,
        internalType: "address",
        name: "dstAddress",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes32",
        name: "messageId",
        type: "bytes32",
      },
    ],
    name: "TokensBridged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint160",
        name: "amount",
        type: "uint160",
      },
    ],
    name: "TokensTransferred",
    type: "event",
  },
  {
    inputs: [],
    name: "PERMIT2",
    outputs: [
      {
        internalType: "contract IAllowanceTransfer",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "uint32",
        name: "dstEid",
        type: "uint32",
      },
      {
        internalType: "address",
        name: "dstAddress",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "minAmountLD",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "extraOptions",
        type: "bytes",
      },
    ],
    name: "quoteBridge",
    outputs: [
      {
        internalType: "uint256",
        name: "nativeFee",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: "address",
                name: "token",
                type: "address",
              },
              {
                internalType: "uint160",
                name: "amount",
                type: "uint160",
              },
              {
                internalType: "uint48",
                name: "expiration",
                type: "uint48",
              },
              {
                internalType: "uint48",
                name: "nonce",
                type: "uint48",
              },
            ],
            internalType: "struct IAllowanceTransfer.PermitDetails",
            name: "details",
            type: "tuple",
          },
          {
            internalType: "address",
            name: "spender",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "sigDeadline",
            type: "uint256",
          },
        ],
        internalType: "struct IAllowanceTransfer.PermitSingle",
        name: "permitSingle",
        type: "tuple",
      },
      {
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "uint160",
        name: "amount",
        type: "uint160",
      },
      {
        internalType: "uint32",
        name: "dstEid",
        type: "uint32",
      },
      {
        internalType: "address",
        name: "dstAddress",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "minAmountLD",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "extraOptions",
        type: "bytes",
      },
    ],
    name: "receiveAndBridge",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: "address",
                name: "token",
                type: "address",
              },
              {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
              },
            ],
            internalType: "struct ISignatureTransfer.TokenPermissions",
            name: "permitted",
            type: "tuple",
          },
          {
            internalType: "uint256",
            name: "nonce",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "deadline",
            type: "uint256",
          },
        ],
        internalType: "struct ISignatureTransfer.PermitTransferFrom",
        name: "permit",
        type: "tuple",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
      {
        internalType: "uint32",
        name: "dstEid",
        type: "uint32",
      },
      {
        internalType: "address",
        name: "dstAddress",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "minAmountLD",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "extraOptions",
        type: "bytes",
      },
    ],
    name: "receiveAndBridgeGasless",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: "address",
                name: "token",
                type: "address",
              },
              {
                internalType: "uint160",
                name: "amount",
                type: "uint160",
              },
              {
                internalType: "uint48",
                name: "expiration",
                type: "uint48",
              },
              {
                internalType: "uint48",
                name: "nonce",
                type: "uint48",
              },
            ],
            internalType: "struct IAllowanceTransfer.PermitDetails",
            name: "details",
            type: "tuple",
          },
          {
            internalType: "address",
            name: "spender",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "sigDeadline",
            type: "uint256",
          },
        ],
        internalType: "struct IAllowanceTransfer.PermitSingle",
        name: "permitSingle",
        type: "tuple",
      },
      {
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "uint160",
        name: "amount",
        type: "uint160",
      },
    ],
    name: "receiveTokensWithPermit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: "address",
                name: "token",
                type: "address",
              },
              {
                internalType: "uint160",
                name: "amount",
                type: "uint160",
              },
              {
                internalType: "uint48",
                name: "expiration",
                type: "uint48",
              },
              {
                internalType: "uint48",
                name: "nonce",
                type: "uint48",
              },
            ],
            internalType: "struct IAllowanceTransfer.PermitDetails",
            name: "details",
            type: "tuple",
          },
          {
            internalType: "address",
            name: "spender",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "sigDeadline",
            type: "uint256",
          },
        ],
        internalType: "struct IAllowanceTransfer.PermitSingle",
        name: "permitSingle",
        type: "tuple",
      },
      {
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "validatePermit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            components: [
              {
                internalType: "address",
                name: "token",
                type: "address",
              },
              {
                internalType: "uint160",
                name: "amount",
                type: "uint160",
              },
              {
                internalType: "uint48",
                name: "expiration",
                type: "uint48",
              },
              {
                internalType: "uint48",
                name: "nonce",
                type: "uint48",
              },
            ],
            internalType: "struct IAllowanceTransfer.PermitDetails",
            name: "details",
            type: "tuple",
          },
          {
            internalType: "address",
            name: "spender",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "sigDeadline",
            type: "uint256",
          },
        ],
        internalType: "struct IAllowanceTransfer.PermitSingle",
        name: "permitSingle",
        type: "tuple",
      },
      {
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "recipient",
        type: "address",
      },
      {
        internalType: "uint160",
        name: "amount",
        type: "uint160",
      },
    ],
    name: "validatePermitAndTransfer",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "token",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "withdrawTokens",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
