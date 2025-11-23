import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { OctavResponse } from "../../../models/balance.model";
import type { Address } from "viem";
import type { SignerEth } from "@ledgerhq/device-signer-kit-ethereum";

interface WalletContextType {
  address: Address | undefined;
  setAddress: (address: Address | undefined) => void;
  walletData: OctavResponse | null;
  setWalletData: (data: OctavResponse | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  signerEth: SignerEth | undefined;
  setSignerEth: (signer: SignerEth | undefined) => void;
  sessionId: string | undefined;
  setSessionId: (id: string | undefined) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address | undefined>(undefined);
  const [walletData, setWalletData] = useState<OctavResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [signerEth, setSignerEth] = useState<SignerEth | undefined>(undefined);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  return (
    <WalletContext.Provider
      value={{
        address,
        setAddress,
        walletData,
        setWalletData,
        isLoading,
        setIsLoading,
        signerEth,
        setSignerEth,
        sessionId,
        setSessionId,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}

