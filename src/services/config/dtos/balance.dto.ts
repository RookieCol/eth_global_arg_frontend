export interface OctavResponseDTO {
  address: string;
  conversionRates: Record<string, number>;
  cashBalance: string;
  closedPnl: string;
  dailyIncome: string;
  dailyExpense: string;
  fees: string;
  feesFiat: string;
  lastUpdated: string;
  openPnl: string;
  priceAdapters: string[];
  networth: string;
  totalCostBasis: string;
  assetByProtocols: {
    wallet: WalletProtocolDTO;
  };
  chains: Record<string, unknown>;
  nftChains: Record<string, unknown>;
  nftsByCollection: Record<string, unknown>;
}

export interface WalletProtocolDTO {
  uuid: string;
  name: string;
  key: string;
  imgSmall: string;
  imgLarge: string;
  value: string;
  totalCostBasis: string;
  totalClosedPnl: string;
  totalOpenPnl: string;
  chains: Record<string, ChainDTO>;
}

export interface ChainDTO {
  name: string;
  key: string;
  imgSmall: string;
  imgLarge: string;
  color: string;
  value: string;
  explorerAddressUrl: string | null;
  totalCostBasis: string;
  totalClosedPnl: string;
  totalOpenPnl: string;
  protocolPositions: {
    WALLET: WalletPositionDTO;
    [key: string]: WalletPositionDTO;
  };
}

export interface WalletPositionDTO {
  assets: any[];
  name: string;
  protocolPositions: any[];
  totalOpenPnl: string;
  totalCostBasis: string;
  totalValue: string;
  unlockAt: string;
}
