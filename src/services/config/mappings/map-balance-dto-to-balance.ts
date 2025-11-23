import type { OctavResponse } from "../../../models/balance.model";
import type { OctavResponseDTO } from "../dtos/balance.dto";

export const OCTAV_CHAIN_NAME_TO_LABEL: Record<string, string> = {
  Abstract: "Abstract",
  Arbitrum: "Arbitrum",
  Avalanche: "Avalanche Fuji",
  B2: "B²",
  Base: "Base",
  Berachain: "Berachain Bartio",
  Binance: "BNB Chain",
  Blast: "Blast",
  BOB: "BOB",
  Celo: "Celo Alfajores",
  Core: "Core",
  Corn: "Corn",
  Cronos: "Cronos",
  Ethereum: "Ethereum",
  Fraxtal: "Fraxtal",
  Gnosis: "Gnosis Chiado",
  Hemi: "Hemi",
  Ink: "Ink",
  Katana: "Katana Tatara",
  Lens: "Lens",
  Linea: "Linea",
  Mantle: "Mantle",
  Merlin: "Merlin",
  Metis: "Metis",
  Mint: "Mint",
  Mode: "Mode",
  Optimism: "Optimism",
  opBNB: "opBNB",
  Plume: "Plume",
  Polygon: "Polygon Amoy",
  "Polygon zkEVM": "Polygon zkEVM",
  Rootstock: "Rootstock",
  Scroll: "Scroll",
  Shibarium: "Shibarium",
  Soneium: "Soneium Minato",
  TAC: "TAC Saint Petersburg",
  Taiko: "Taiko Hekla",
  Unichain: "Unichain",
  "X Layer": "X Layer",
  "zkSync Era": "ZKsync",
  Zora: "Zora",
  Flare: "Flare",
};

export function mapBalanceDtoToBalance(dto: OctavResponseDTO): OctavResponse {
  // El DTO es un objeto único, no un array
  const assetByProtocols = dto.assetByProtocols;

  if (!assetByProtocols?.wallet?.chains) {
    return dto as OctavResponse;
  }

  const wallet = assetByProtocols.wallet;
  const chains = wallet.chains;

  const mappedChains = Object.fromEntries(
    Object.entries(chains).map(([key, chain]) => {
      const currentName = (chain as { name?: string })?.name;
      const mappedName = currentName && OCTAV_CHAIN_NAME_TO_LABEL[currentName];

      if (!mappedName) {
        return [key, chain];
      }

      return [
        key,
        {
          ...(chain as unknown as Record<string, unknown>),
          name: mappedName,
        },
      ];
    })
  );

  return {
    ...dto,
    assetByProtocols: {
      ...assetByProtocols,
      wallet: {
        ...wallet,
        chains: mappedChains,
      },
    },
  } as OctavResponse;
}
