// Función para transformar URLs a través del proxy
const transformImageUrl = (url: string): string => {
  if (url.includes("assets.coingecko.com")) {
    return url.replace("https://assets.coingecko.com", "/api/coingecko");
  }
  if (url.includes("docs.chain.link")) {
    return url.replace("https://docs.chain.link", "/api/chainlink");
  }
  if (url.includes("ethglobal.b-cdn.net")) {
    return url.replace("https://ethglobal.b-cdn.net", "/api/ethglobal");
  }
  if (url.includes("static.binance.com")) {
    return url.replace("https://static.binance.com", "/api/bin");
  }
  return url;
};

export const chains = [
  {
    id: 1,
    label: "0G Galileo",
    name: "0G Galileo Testnet",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/0g.svg"),
    enabled: true,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 2,
    label: "Abstract",
    name: "Abstract Sepolia",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/abstract.svg"
    ),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 3,
    label: "Apechain Curtis",
    name: "Apechain Curtis",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/apechain.svg"
    ),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 5,
    label: "Arbitrum",
    name: "Arbitrum Sepolia",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/arbitrum.svg"
    ),
    validatorAddress: "0xbD57b37FEf0fda7151a0C0BdA957aE37BD84ab6B",
    USDC: "0x004690Ee41C0Dd2AcEf094D01b93b60aa9a06bb9",
    routeID: 40231,
    rpc: "https://arb-sepolia.g.alchemy.com/v2/UmqgPqCsA4TgEqnMvObDS",
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 6,
    label: "Astar Shibuya",
    name: "Astar Shibuya",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/astar.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 7,
    label: "Avalanche Fuji",
    name: "Avalanche Fuji",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/avalanche.svg"
    ),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 8,
    label: "B²",
    name: "B² Testnet",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/bsquared.svg"
    ),
    enabled: false,
    ecosystem: "bitcoin",
    network: true,
  },
  {
    id: 9,
    label: "Base",
    name: "Base Sepolia",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/base.svg"),
    validatorAddress: "0x07b091cC0eef5b03A41eB4bDD059B388cd3560D1",
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Circle's USDC on Base Sepolia
    routeID: 40245,
    rpc: "https://sepolia.base.org", // RPC público de Base
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 10,
    label: "Berachain Bartio",
    name: "Berachain Bartio",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/berachain.svg"
    ),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 11,
    label: "Bitlayer",
    name: "Bitlayer Testnet",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/bitlayer.svg"
    ),
    enabled: false,
    ecosystem: "bitcoin",
    network: true,
  },
  {
    id: 12,
    label: "Blast",
    name: "Blast Sepolia",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/blast.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 13,
    label: "BNB Chain",
    name: "BNB Chain Testnet",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/bnb-chain.svg"
    ),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 14,
    label: "BOB",
    name: "BOB Sepolia",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/bob.svg"),
    enabled: false,
    ecosystem: "bitcoin",
    network: true,
  },
  {
    id: 15,
    label: "Botanix",
    name: "Botanix Testnet",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/botanix.svg"
    ),
    enabled: false,
    ecosystem: "bitcoin",
    network: true,
  },
  {
    id: 16,
    label: "Celo Alfajores",
    name: "Celo Alfajores",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/celo.svg"),
    enabled: true,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 17,
    label: "Core",
    name: "Core Testnet",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/core.svg"),
    enabled: false,
    ecosystem: "bitcoin",
    network: true,
  },
  {
    id: 18,
    label: "Corn",
    name: "Corn Testnet",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/corn.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 19,
    label: "Cronos",
    name: "Cronos Testnet",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/cronos.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 20,
    label: "Cronos zkEVM",
    name: "Cronos zkEVM Testnet",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/cronoszkevm.svg"
    ),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 21,
    label: "Ethereum",
    name: "Ethereum Sepolia",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/ethereum.svg"
    ),
    validatorAddress: "0xd3605455441B7bF57489E05d6b1b678e269BDE3F",
    USDC: "0x07b091cC0eef5b03A41eB4bDD059B388cd3560D1",
    routeID: 40161,
    rpc: "https://eth-sepolia.g.alchemy.com/v2/UmqgPqCsA4TgEqnMvObDS",
    enabled: true,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 23,
    label: "Fraxtal",
    name: "Fraxtal Testnet",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/fraxtal.svg"
    ),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 24,
    label: "Gnosis Chiado",
    name: "Gnosis Chiado",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/gnosis-chain.svg"
    ),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 27,
    label: "Hemi",
    name: "Hemi Sepolia",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/hemi.svg"),
    enabled: false,
    ecosystem: "bitcoin",
    network: true,
  },
  {
    id: 28,
    label: "Holesky",
    name: "Holesky",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/ethereum.svg"
    ),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 29,
    label: "Ink",
    name: "Ink Sepolia",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/ink.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 31,
    label: "Kaia Kairos",
    name: "Kaia Kairos",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/kaia.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 32,
    label: "Katana Tatara",
    name: "Katana Tatara",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/polygonkatana.svg"
    ),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 33,
    label: "Kroma",
    name: "Kroma Sepolia",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/kroma.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 34,
    label: "Lens",
    name: "Lens Sepolia",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/lens.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 35,
    label: "Linea",
    name: "Linea Sepolia",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/linea.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 36,
    label: "Lisk",
    name: "Lisk Sepolia",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/lisk.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 37,
    label: "Mantle",
    name: "Mantle Sepolia",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/mantle.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 38,
    label: "MegaETH",
    name: "MegaETH Testnet",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/megaeth.svg"
    ),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 40,
    label: "Merlin",
    name: "Merlin Testnet",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/merlin.svg"),
    enabled: false,
    ecosystem: "bitcoin",
    network: true,
  },
  {
    id: 41,
    label: "Metal L2",
    name: "Metal L2 Testnet",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/metal.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 42,
    label: "Metis",
    name: "Metis Sepolia",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/metis.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 44,
    label: "Mint",
    name: "Mint Sepolia",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/mint.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 45,
    label: "Mode",
    name: "Mode Sepolia",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/mode.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 46,
    label: "Monad",
    name: "Monad Testnet",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/monad.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 47,
    label: "Neo X",
    name: "Neo X Testnet T4",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/neox.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 48,
    label: "Optimism",
    name: "OP Sepolia",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/optimism.svg"
    ),
    USDC: "0x4cd092a9d4623Fa16411F65d0339B5815895Ca24",
    validatorAddress: "0x004690Ee41C0Dd2AcEf094D01b93b60aa9a06bb9",
    routeID: 40232,
    rpc: "https://opt-sepolia.g.alchemy.com/v2/UmqgPqCsA4TgEqnMvObDS",
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 49,
    label: "opBNB",
    name: "opBNB Testnet",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/opbnb.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 51,
    label: "Plume",
    name: "Plume Testnet",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/plume.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 52,
    label: "Polygon Amoy",
    name: "Polygon Amoy",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/polygon.svg"
    ),
    enabled: true,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 53,
    label: "Polygon zkEVM",
    name: "Polygon zkEVM Cardona",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/polygonzkevm.svg"
    ),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 54,
    label: "Ronin",
    name: "Ronin Saigon",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/ronin.svg"),
    enabled: true,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 55,
    label: "Rootstock",
    name: "Rootstock Testnet",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/rootstock.svg"
    ),
    enabled: true,
    ecosystem: "bitcoin",
    network: true,
  },
  {
    id: 56,
    label: "Scroll",
    name: "Scroll Sepolia",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/scroll.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 58,
    label: "Shibarium",
    name: "Shibarium Puppynet",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/shibarium.svg"
    ),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 60,
    label: "Soneium Minato",
    name: "Soneium Minato",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/soneium.svg"
    ),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 62,
    label: "Superseed",
    name: "Superseed Sepolia",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/superseed.svg"
    ),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 63,
    label: "TAC Saint Petersburg",
    name: "TAC Saint Petersburg",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/tac.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 64,
    label: "Taiko Hekla",
    name: "Taiko Hekla",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/taiko.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 65,
    label: "Treasure Topaz",
    name: "Treasure Topaz",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/treasure.svg"
    ),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 66,
    label: "Unichain",
    name: "Unichain Sepolia",
    logo: transformImageUrl(
      "https://docs.chain.link/assets/chains/unichain.svg"
    ),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 69,
    label: "X Layer",
    name: "X Layer Testnet",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/xlayer.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 70,
    label: "XDC Apothem",
    name: "XDC Apothem Network",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/xdc.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 71,
    label: "ZKsync",
    name: "ZKsync Sepolia",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/zksync.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 72,
    label: "Zora",
    name: "Zora Sepolia",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/zora.svg"),
    enabled: false,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 73,
    label: "Hedera",
    name: "Hedera Testnet",
    logo: transformImageUrl("https://docs.chain.link/assets/chains/hedera.svg"),
    chainSelector: "222782988166878823",
    BnM: "0x01Ac06943d2B8327a7845235Ef034741eC1Da352e",
    LnM: "0x0000000000000000000000000000000000000000",
    USDC: "0x0000000000000000000000000000000000000000",
    enabled: true,
    ecosystem: "ethereum",
    network: true,
  },
  {
    id: 74,
    label: "Saga",
    name: "Saga Testnet",
    logo: transformImageUrl(
      "https://assets.coingecko.com/coins/images/25691/standard/zcPXETKs_400x400.jpg"
    ),
    enabled: true,
    ecosystem: "ethereum",
    network: false,
  },
  {
    id: 75,
    label: "Citrea",
    name: "Citrea Testnet",
    logo: transformImageUrl(
      "https://ethglobal.b-cdn.net/organizations/0wyck/square-logo/default.png"
    ),
    enabled: true,
    ecosystem: "bitcoin",
    network: false,
  },
  {
    id: 76,
    label: "Chiliz",
    name: "Chiliz Testnet",
    logo: transformImageUrl(
      "https://assets.coingecko.com/coins/images/8834/standard/CHZ_Token_updated.png"
    ),
    enabled: true,
    ecosystem: "ethereum",
    network: false,
  },
  {
    id: 77,
    label: "Oasis Protocol",
    name: "Oasis Protocol Testnet",
    logo: transformImageUrl(
      "https://assets.coingecko.com/coins/images/13162/standard/200x200_%28Rounded%29.png"
    ),
    enabled: true,
    ecosystem: "ethereum",
    network: false,
  },
  {
    id: 78,
    label: "Zircuit",
    name: "Zircuit Testnet",
    logo: transformImageUrl(
      "	https://assets.coingecko.com/coins/images/35960/standard/zircuit_token_icon_2.png?1732502352"
    ),
    enabled: true,
    ecosystem: "ethereum",
    network: false,
  },
  {
    id: 79,
    label: "Flare",
    name: "Flare Testnet",
    logo: transformImageUrl(
      "https://assets.coingecko.com/coins/images/28624/standard/FLR-icon200x200.png"
    ),
    enabled: true,
    ecosystem: "ethereum",
    network: false,
  },
];
