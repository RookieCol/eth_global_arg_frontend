import { useEffect, useRef, useState } from "react";
import { chains } from "../../config/const";
import daiIcon from "../../assets/icons/tokens/dai.svg";
import usdcIcon from "../../assets/icons/tokens/usdc.svg";
import tetherIcon from "../../assets/icons/tokens/tether.svg";

interface FaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimSuccess?: () => void;
}

export default function FaucetModal({
  isOpen,
  onClose,
  onClaimSuccess,
}: FaucetModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isToastClosing, setIsToastClosing] = useState(false);

  // Selección de múltiples chains
  const [selectedChainIds, setSelectedChainIds] = useState<Set<number>>(
    new Set()
  );

  // Porcentaje independiente para cada token (cuánto cargar)
  const [daiPercentage, setDaiPercentage] = useState(50);
  const [usdcPercentage, setUsdcPercentage] = useState(50);
  const [tetherPercentage, setTetherPercentage] = useState(50);

  // Balance máximo que se puede cargar por token
  const maxLoadAmount = 1000;

  // Función para manejar el cierre con animación
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  // Cerrar modal con Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Cerrar modal al hacer click fuera
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClaim = async () => {
    if (selectedChainIds.size === 0) {
      alert("Please select at least one chain");
      return;
    }

    // Activar loading
    setIsClaiming(true);

    const daiAmount = (maxLoadAmount * daiPercentage) / 100;
    const usdcAmount = (maxLoadAmount * usdcPercentage) / 100;
    const tetherAmount = (maxLoadAmount * tetherPercentage) / 100;

    // Simular proceso de claim (2 segundos)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Desactivar loading y cerrar el modal
    setIsClaiming(false);
    handleClose();

    // Mostrar toast de éxito
    setTimeout(() => {
      setShowSuccessToast(true);
      setIsToastClosing(false);
      if (onClaimSuccess) {
        onClaimSuccess();
      }
      // Iniciar animación de cierre después de 1.8 segundos
      setTimeout(() => {
        setIsToastClosing(true);
        // Ocultar completamente después de la animación
        setTimeout(() => {
          setShowSuccessToast(false);
          setIsToastClosing(false);
        }, 300);
      }, 1800);
    }, 300);
  };

  // Función para toggle de selección de chain
  const toggleChainSelection = (chainId: number) => {
    setSelectedChainIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(chainId)) {
        newSet.delete(chainId);
      } else {
        newSet.add(chainId);
      }
      return newSet;
    });
  };

  const selectedChains = chains.filter((c) => selectedChainIds.has(c.id));

  // Ordenar chains alfabéticamente por nombre solo para el faucet
  const sortedChains = [...chains].sort((a, b) => a.name.localeCompare(b.name));

  // Solo renderizar si el modal está abierto o si hay un toast para mostrar
  if (!isOpen && !showSuccessToast) return null;

  return (
    <>
      {isOpen && (
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 ${
            isClosing ? "animate-fade-out" : "animate-fade-in"
          }`}
          onClick={handleBackdropClick}
        >
          <div
            ref={modalRef}
            className={`bg-gray-900 rounded-xl shadow-2xl max-w-lg w-full transform transition-all border border-gray-700/50 ${
              isClosing ? "animate-scale-out" : "animate-scale-in"
            }`}
          >
            {/* Header with Gradient */}
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20"></div>
              <div className="relative flex items-center justify-between p-6 border-b border-gray-700/50">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                    <svg
                      className="w-7 h-7 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Faucet</h2>
                    <p className="text-gray-400 text-sm">Get Test Tokens</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-white transition-all hover:rotate-90 duration-300 p-2 hover:bg-gray-800/50 rounded-lg"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Chain Selector */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
                <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  Select Chain
                </h3>

                {/* Lista de chains con logos - con scroll */}
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar p-1">
                  {sortedChains.map((chain) => {
                    const isDisabled = !chain.network || !chain.enabled;
                    const isSelected = selectedChainIds.has(chain.id);

                    return (
                      <button
                        key={chain.id}
                        onClick={() =>
                          !isDisabled && toggleChainSelection(chain.id)
                        }
                        disabled={isDisabled}
                        className={`w-full flex flex-col items-center gap-2 p-2 rounded-lg border transition-all ${
                          isDisabled
                            ? "bg-gray-900/30 border-gray-700/20 opacity-40 cursor-not-allowed"
                            : isSelected
                            ? "bg-purple-900/30 border-purple-500/50 shadow-lg shadow-purple-500/20"
                            : "bg-gray-900/50 border-gray-700/50 hover:border-purple-500/30 hover:bg-gray-800/50 cursor-pointer"
                        }`}
                      >
                        <div className="relative">
                          <img
                            src={chain.logo}
                            alt={chain.label}
                            className="w-10 h-10 rounded-full"
                          />
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="text-white font-medium text-xs text-center">
                          {chain.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Token Sliders */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
                <h3 className="text-base font-semibold text-white mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Amount to Claim
                  </div>

                  {/* Logos de blockchains seleccionadas superpuestos */}
                  {selectedChains.length > 0 && (
                    <div className="flex items-center">
                      {selectedChains.map((chain, index) => (
                        <div
                          key={chain.id}
                          className="relative w-9 h-9 rounded-full border-2 border-gray-900 bg-gray-800 overflow-hidden shadow-lg"
                          style={{
                            marginLeft: index === 0 ? "0" : "-12px",
                            zIndex: 10 + index,
                          }}
                        >
                          <img
                            src={chain.logo}
                            alt={chain.label}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </h3>

                {/* Tokens en columna */}
                <div className="space-y-3">
                  {/* DAI */}
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img src={daiIcon} alt="DAI" className="w-7 h-7" />
                        <span className="text-white font-semibold">DAI</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400 mb-0.5">
                          Max: ${maxLoadAmount.toFixed(2)}
                        </div>
                        <div className="text-white font-bold">
                          $
                          {(
                            (maxLoadAmount * daiPercentage) /
                            100
                          ).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-yellow-400 text-xs font-semibold">
                          {daiPercentage}%
                        </div>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={daiPercentage}
                      onChange={(e) => setDaiPercentage(Number(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #F0B90B ${daiPercentage}%, #374151 ${daiPercentage}%)`,
                      }}
                    />
                  </div>

                  {/* USDC */}
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img src={usdcIcon} alt="USDC" className="w-7 h-7" />
                        <span className="text-white font-semibold">USDC</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400 mb-0.5">
                          Max: ${maxLoadAmount.toFixed(2)}
                        </div>
                        <div className="text-white font-bold">
                          $
                          {(
                            (maxLoadAmount * usdcPercentage) /
                            100
                          ).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-blue-400 text-xs font-semibold">
                          {usdcPercentage}%
                        </div>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={usdcPercentage}
                      onChange={(e) =>
                        setUsdcPercentage(Number(e.target.value))
                      }
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #2775CA ${usdcPercentage}%, #374151 ${usdcPercentage}%)`,
                      }}
                    />
                  </div>

                  {/* TETHER */}
                  <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img src={tetherIcon} alt="USDT" className="w-7 h-7" />
                        <span className="text-white font-semibold">USDT</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-400 mb-0.5">
                          Max: ${maxLoadAmount.toFixed(2)}
                        </div>
                        <div className="text-white font-bold">
                          $
                          {(
                            (maxLoadAmount * tetherPercentage) /
                            100
                          ).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div className="text-green-400 text-xs font-semibold">
                          {tetherPercentage}%
                        </div>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={tetherPercentage}
                      onChange={(e) =>
                        setTetherPercentage(Number(e.target.value))
                      }
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #26A17B ${tetherPercentage}%, #374151 ${tetherPercentage}%)`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-gray-700/50">
                <button
                  onClick={handleClose}
                  disabled={isClaiming}
                  className="px-4 py-2 bg-gray-700/50 text-white rounded-lg hover:bg-gray-600/50 transition-all hover:scale-105 border border-gray-600/50 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClaim}
                  disabled={selectedChainIds.size === 0 || isClaiming}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all hover:scale-105 shadow-lg hover:shadow-purple-500/50 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 min-w-[140px] justify-center"
                >
                  {isClaiming ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Claiming...</span>
                    </>
                  ) : (
                    "Claim Tokens"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast de éxito - Galáctico */}
      {showSuccessToast && (
        <div
          className="fixed bottom-6 right-6 z-[9999] transition-all duration-300 ease-out"
          style={{
            animation: isToastClosing
              ? "slideOutRight 0.3s ease-in forwards"
              : "slideInRight 0.4s ease-out",
          }}
        >
          <div className="relative bg-gradient-to-br from-purple-900/95 via-blue-900/95 to-indigo-900/95 backdrop-blur-xl text-white px-6 py-5 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[340px] border-2 border-purple-500/30 overflow-hidden">
            {/* Efecto de estrellas brillantes en el fondo */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-2 left-4 w-1 h-1 bg-white rounded-full animate-pulse"></div>
              <div
                className="absolute top-8 left-12 w-0.5 h-0.5 bg-blue-300 rounded-full animate-pulse"
                style={{ animationDelay: "0.3s" }}
              ></div>
              <div
                className="absolute top-4 right-8 w-1 h-1 bg-purple-300 rounded-full animate-pulse"
                style={{ animationDelay: "0.6s" }}
              ></div>
              <div
                className="absolute bottom-6 right-12 w-0.5 h-0.5 bg-white rounded-full animate-pulse"
                style={{ animationDelay: "0.9s" }}
              ></div>
              <div
                className="absolute bottom-3 left-20 w-1 h-1 bg-blue-400 rounded-full animate-pulse"
                style={{ animationDelay: "1.2s" }}
              ></div>
            </div>

            {/* Brillo espacial */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>

            {/* Contenido */}
            <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/50 animate-pulse">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="relative">
              <div className="font-bold text-xl bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Tokens Claimed!
              </div>
              <div className="text-sm text-blue-200/90 mt-0.5">
                Your galactic fuel has been loaded ✨
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
