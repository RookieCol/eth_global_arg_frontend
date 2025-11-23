export interface OctavResponse {
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
    wallet: WalletProtocol;
  };
  chains: Record<string, unknown>;
  nftChains: Record<string, unknown>;
  nftsByCollection: Record<string, unknown>;
}

export interface WalletProtocol {
  uuid: string;
  name: string;
  key: string;
  imgSmall: string;
  imgLarge: string;
  value: string;
  totalCostBasis: string;
  totalClosedPnl: string;
  totalOpenPnl: string;
  chains: Record<string, Chain>;
}

export interface Chain {
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
    WALLET: WalletPosition;
    [key: string]: WalletPosition;
  };
}

export interface WalletPosition {
  assets: any[];
  name: string;
  protocolPositions: any[];
  totalOpenPnl: string;
  totalCostBasis: string;
  totalValue: string;
  unlockAt: string;
}
