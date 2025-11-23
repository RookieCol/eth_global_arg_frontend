import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface PairInfo {
  sourceId: string;
  destinationId: string;
  color: string;
  sourceLabel: string;
  destinationLabel: string;
  sourceLogo?: string;
  destinationLogo?: string;
}

interface PairsContextType {
  pairs: PairInfo[];
  updatePairs: (pairs: PairInfo[]) => void;
  imagesLoaded: boolean;
  setImagesLoaded: (loaded: boolean) => void;
  loadingProgress: number;
  setLoadingProgress: (progress: number) => void;
  triggerCelebration: boolean;
  setTriggerCelebration: (trigger: boolean) => void;
  collapseGraph: (() => void) | null;
  setCollapseGraph: (fn: (() => void) | null) => void;
  expandGraph: (() => void) | null;
  setExpandGraph: (fn: (() => void) | null) => void;
}

const PairsContext = createContext<PairsContextType | undefined>(undefined);

export function PairsProvider({ children }: { children: ReactNode }) {
  const [pairs, setPairs] = useState<PairInfo[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState<boolean>(false);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [triggerCelebration, setTriggerCelebration] = useState<boolean>(false);
  const [collapseGraph, setCollapseGraph] = useState<(() => void) | null>(null);
  const [expandGraph, setExpandGraph] = useState<(() => void) | null>(null);

  const updatePairs = useCallback((newPairs: PairInfo[]) => {
    setPairs(newPairs);
  }, []);

  return (
    <PairsContext.Provider value={{ pairs, updatePairs, imagesLoaded, setImagesLoaded, loadingProgress, setLoadingProgress, triggerCelebration, setTriggerCelebration, collapseGraph, setCollapseGraph, expandGraph, setExpandGraph }}>
      {children}
    </PairsContext.Provider>
  );
}

export function usePairs() {
  const context = useContext(PairsContext);
  if (!context) {
    throw new Error("usePairs must be used within a PairsProvider");
  }
  return context;
}
