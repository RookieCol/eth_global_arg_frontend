import { useMemo, useState } from "react";
import { useWallet } from "../../../../shared/Wallet/context";
import { usePairs } from "./context";
import { chains } from "../../../../config/const";
import { OCTAV_CHAIN_NAME_TO_LABEL } from "../../../../services/config/mappings/map-balance-dto-to-balance";

interface ChainBalance {
  key: string;
  name: string;
  value: number;
  valueFormatted: string;
  imgSmall?: string;
  imgLarge?: string;
  color?: string;
  assets?: any[]; // Assets que conforman el balance
  chainId?: number; // ID de la chain en el config para el nodeId
  chainLabel?: string; // Label de la chain en el config
  chainLogo?: string; // Logo de la chain en el config
}

export default function BalanceTable() {
  const { walletData } = useWallet();
  const { pairs, updatePairs } = usePairs();
  const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());

  // Calcular y ordenar chains por balance directamente de la API
  const chainsWithBalance = useMemo(() => {
    console.log("🔍 BalanceTable - walletData completo:", walletData);
    
    // Los datos están en assetByProtocols.wallet.chains (vienen de la API de Octav)
    if (!walletData) {
      console.log("⚠️ No hay walletData");
      return [];
    }

    // walletData puede ser un array o un objeto
    const data = Array.isArray(walletData) ? walletData[0] : walletData;
    
    if (!data || !data.assetByProtocols?.wallet?.chains) {
      console.log("⚠️ No hay assetByProtocols.wallet.chains");
      console.log("📋 assetByProtocols:", data?.assetByProtocols);
      return [];
    }

    const walletChains = data.assetByProtocols.wallet.chains;
    console.log("📋 walletChains encontrados:", walletChains);
    console.log("📋 keys de chains:", Object.keys(walletChains));
    
    const chainsList: ChainBalance[] = [];

    // Iterar sobre todas las chains del wallet (vienen directamente de la API de Octav)
    Object.entries(walletChains).forEach(([key, walletChain]: [string, any]) => {
      if (!walletChain) {
        console.log(`⚠️ Chain ${key} es null/undefined`);
        return;
      }

      // El value viene como string de la API
      const valueStr = walletChain.value?.toString() || "0";
      const balanceValue = parseFloat(valueStr);
      
      console.log(`💰 Chain ${key} (${walletChain.name}): value="${valueStr}", parsed=${balanceValue}`);
      
      if (isNaN(balanceValue)) {
        console.log(`⚠️ Balance NaN para ${key}`);
        return;
      }
      
      if (balanceValue <= 0) {
        console.log(`⚠️ Balance <= 0 para ${key}: ${balanceValue}`);
        return;
      }

      // Obtener los assets de esta chain
      const assets = walletChain.protocolPositions?.WALLET?.assets || [];

      // Buscar la chain en el config usando el nombre mapeado
      // El nombre viene mapeado desde map-balance-dto-to-balance.ts
      // Primero intentar usar el mapeo directo
      const mappedLabel = walletChain.name && OCTAV_CHAIN_NAME_TO_LABEL[walletChain.name];
      const searchLabel = mappedLabel || walletChain.name;
      
      const configChain = chains.find(
        (c) =>
          c.label === searchLabel ||
          c.label === walletChain.name ||
          c.label.toLowerCase() === searchLabel?.toLowerCase() ||
          c.label.toLowerCase().includes(searchLabel?.toLowerCase() || "") ||
          (searchLabel?.toLowerCase() || "").includes(c.label.toLowerCase())
      );

      chainsList.push({
        key: key,
        name: walletChain.name || key,
        value: balanceValue,
        valueFormatted: formatBalance(balanceValue),
        imgSmall: walletChain.imgSmall,
        imgLarge: walletChain.imgLarge,
        color: walletChain.color,
        assets: assets,
        chainId: configChain?.id,
        chainLabel: configChain?.label,
        chainLogo: configChain?.logo,
      });
      
      console.log(`✅ Agregada chain: ${walletChain.name} con balance ${balanceValue}, ${assets.length} assets, configChain:`, configChain);
    });

    console.log("📊 chainsList final:", chainsList);
    
    // Ordenar de mayor a menor balance
    return chainsList.sort((a, b) => b.value - a.value);
  }, [walletData]);

  // Función para formatear el balance
  function formatBalance(balance: number): string {
    if (balance === 0) return "$0.00";
    if (balance < 0.01) return `$${balance.toFixed(6)}`;
    if (balance < 1) return `$${balance.toFixed(4)}`;
    if (balance < 1000) return `$${balance.toFixed(2)}`;
    if (balance < 1000000) {
      return `$${(balance / 1000).toFixed(2)}K`;
    }
    return `$${(balance / 1000000).toFixed(2)}M`;
  }

  // Función para manejar el click en una chain de la tabla
  const handleChainClick = (chain: ChainBalance) => {
    if (!chain.chainId) {
      console.warn(`⚠️ No se encontró chainId para ${chain.name}`);
      return;
    }

    const nodeId = `chain-${chain.chainId}`;
    console.log(`🖱️ Click en chain desde tabla: ${chain.name} (nodeId: ${nodeId})`);

    // Disparar evento personalizado que LoadGraph puede escuchar
    // LoadGraph se encargará de la animación y el manejo del nodo
    const event = new CustomEvent("chainClickFromTable", {
      detail: { nodeId, chain },
    });
    window.dispatchEvent(event);
  };

  // Mostrar mensaje si no hay datos o si no hay chains con balance
  if (!walletData) {
    return (
      <div className="mt-6 w-full">
        <div className="bg-gray-950/80 backdrop-blur-sm border border-purple-500/20 rounded-lg p-4 text-center">
          <p className="text-gray-400 text-sm">
            🔌 Connect your wallet to see balances
          </p>
        </div>
      </div>
    );
  }

  if (chainsWithBalance.length === 0) {
    return (
      <div className="mt-6 w-full">
        <div className="bg-gray-950/80 backdrop-blur-sm border border-purple-500/20 rounded-lg p-4 text-center">
          <p className="text-gray-400 text-sm">
            💰 No balances found for any blockchain
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 w-full">
      {/* Título con estilo espacial */}
      <div className="mb-4 relative">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="text-2xl">🌌</span>
          <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Blockchain Balances
          </span>
        </h3>
        <div className="absolute -bottom-1 left-0 w-20 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
      </div>

      {/* Tabla con estilo espacial */}
      <div className="bg-gray-950/80 backdrop-blur-sm border border-purple-500/20 rounded-lg overflow-hidden shadow-2xl">
        {/* Header de la tabla */}
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-b border-purple-500/30 px-4 py-3">
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center">
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Rank
            </div>
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Blockchain
            </div>
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider text-right">
              Balance
            </div>
            <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
              {/* Espacio para el botón de expandir */}
            </div>
          </div>
        </div>

        {/* Cuerpo de la tabla */}
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          {chainsWithBalance.map((chain, index) => {
            const isExpanded = expandedChains.has(chain.key);
            
            return (
            <div
              key={chain.key}
              className={`border-b border-gray-800/50 hover:bg-purple-500/10 transition-all duration-200 group ${
                chain.chainId ? "cursor-pointer hover:border-purple-400/50" : "opacity-60"
              }`}
              onClick={() => chain.chainId && handleChainClick(chain)}
              title={chain.chainId ? `Click para seleccionar ${chain.name} y crear pareja` : `${chain.name} no disponible en el grafo`}
            >
              <div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-4 py-3">
                {/* Rank */}
                <div className="flex items-center justify-center w-8">
                  <span
                    className={`text-sm font-bold ${
                      index === 0
                        ? "text-yellow-400"
                        : index === 1
                        ? "text-gray-300"
                        : index === 2
                        ? "text-orange-400"
                        : "text-gray-500"
                    }`}
                  >
                    #{index + 1}
                  </span>
                </div>

                {/* Chain Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    {(chain.imgSmall || chain.imgLarge) && (
                      <img
                        src={chain.imgSmall || chain.imgLarge}
                        alt={chain.name}
                        className="w-8 h-8 rounded-full object-contain bg-gray-800 p-1 border border-purple-500/30 group-hover:border-purple-400 transition-colors"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    {!chain.imgSmall && !chain.imgLarge && (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border border-purple-500/30"
                        style={{
                          backgroundColor: chain.color || "#6366f1",
                        }}
                      >
                        {chain.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Brillo sutil en hover */}
                    <div className="absolute inset-0 rounded-full bg-purple-400/0 group-hover:bg-purple-400/20 transition-all duration-300 blur-sm"></div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {chain.name}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {chain.key}
                    </div>
                  </div>
                </div>

                {/* Balance */}
                <div className="text-right">
                  <div className="text-sm font-bold text-green-400 group-hover:text-green-300 transition-colors">
                    {chain.valueFormatted}
                  </div>
                  {chain.value > 0 && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {chain.value >= 0.01
                        ? chain.value.toFixed(2)
                        : chain.value.toFixed(6)}{" "}
                      USD
                    </div>
                  )}
                </div>

                {/* Botón para expandir/colapsar */}
                {chain.assets && chain.assets.length > 0 && (
                  <button
                    onClick={() => {
                      const newExpanded = new Set(expandedChains);
                      if (isExpanded) {
                        newExpanded.delete(chain.key);
                      } else {
                        newExpanded.add(chain.key);
                      }
                      setExpandedChains(newExpanded);
                    }}
                    className="p-1 hover:bg-purple-500/20 rounded transition-colors"
                    title={isExpanded ? "Ocultar assets" : "Mostrar assets"}
                  >
                    <svg
                      className={`w-5 h-5 text-purple-400 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Barra de progreso visual del balance */}
              <div className="px-4 pb-2">
                <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        (chain.value /
                          (chainsWithBalance[0]?.value || 1)) *
                        100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Panel expandible con assets */}
              {isExpanded && chain.assets && chain.assets.length > 0 && (
                <div className="px-4 pb-3 border-t border-gray-800/50 mt-2 pt-3">
                  <div className="mb-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Assets ({chain.assets.length})
                    </span>
                  </div>
                  <div className="overflow-x-auto custom-scrollbar-horizontal">
                    <div className="flex gap-3 min-w-max">
                      {chain.assets.map((asset: any, assetIndex: number) => (
                        <div
                          key={assetIndex}
                          className="flex-shrink-0 bg-gray-900/50 border border-purple-500/20 rounded-lg p-3 min-w-[200px] hover:border-purple-400/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {asset.imgSmall && (
                              <img
                                src={asset.imgSmall}
                                alt={asset.name || "Asset"}
                                className="w-6 h-6 rounded-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white truncate">
                                {asset.name || asset.symbol || "Unknown"}
                              </div>
                              {asset.symbol && asset.symbol !== asset.name && (
                                <div className="text-xs text-gray-400 truncate">
                                  {asset.symbol}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            {asset.balance && (
                              <div className="text-xs text-gray-400">
                                Balance: <span className="text-white font-medium">{asset.balance}</span>
                              </div>
                            )}
                            {asset.value && (
                              <div className="text-xs text-gray-400">
                                Value: <span className="text-green-400 font-medium">
                                  ${parseFloat(asset.value).toFixed(2)}
                                </span>
                              </div>
                            )}
                            {asset.price && (
                              <div className="text-xs text-gray-400">
                                Price: <span className="text-white">${parseFloat(asset.price).toFixed(4)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
          })}
        </div>

        {/* Footer con total */}
        {chainsWithBalance.length > 0 && (
          <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-t border-purple-500/30 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                Total Chains
              </span>
              <span className="text-sm font-bold text-white">
                {chainsWithBalance.length}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Estilos para scrollbar personalizado */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(17, 24, 39, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #a855f7, #3b82f6);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #9333ea, #2563eb);
        }
        .custom-scrollbar-horizontal::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar-horizontal::-webkit-scrollbar-track {
          background: rgba(17, 24, 39, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar-horizontal::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, #a855f7, #3b82f6);
          border-radius: 3px;
        }
        .custom-scrollbar-horizontal::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(90deg, #9333ea, #2563eb);
        }
      `}</style>
    </div>
  );
}

