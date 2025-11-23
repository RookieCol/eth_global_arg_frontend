import { useState } from "react";
import CrosschainSelector from "./_components/CrosschainSelector";
import DisplayGraph from "./_components/DisplayGraph";
import { usePairs } from "./_components/CrosschainSelector/context";
import GalaxyBG from "./_components/DisplayGraph/_components/LoadGraph/GalaxyBG";
import ImageLoader from "./_components/ImageLoader";
import ChainModal from "./_components/CrosschainSelector/ChainModal";

function HomeContent() {
  const { imagesLoaded, loadingProgress, pairs, collapseGraph } = usePairs();
  const [modalOpen, setModalOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showSendButton, setShowSendButton] = useState(true);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isToastClosing, setIsToastClosing] = useState(false);
  const [showDaftPunkEffect, setShowDaftPunkEffect] = useState(false); // Nueva: se queda permanente
  const [selectedChain, setSelectedChain] = useState<{
    id: string;
    label: string;
    logo?: string;
  } | null>(null);

  const handleChainClick = (chain: { id: string; label: string; logo?: string }) => {
    setSelectedChain(chain);
    setModalOpen(true);
  };

  const handleConnectChain = (chainId: string) => {
    setIsConnected(true);
    setModalOpen(false);
    setShowSendButton(true); // Mostrar el botón Send nuevamente
  };

  const handleSend = async () => {
    setIsSending(true);
    setShowDaftPunkEffect(true); // Activar efecto permanente

    // Simular envío (2 segundos) - durante este tiempo se ve el efecto de transferencia
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Desactivar loading PERO el efecto Daft Punk se queda
    setIsSending(false);

    // Ocultar el botón Send
    setShowSendButton(false);

    // Llamar a la función de colapso del graph
    if (collapseGraph) {
      collapseGraph();
    }

    // Mostrar toast de éxito después del colapso
    setTimeout(() => {
      setShowSuccessToast(true);
      setIsToastClosing(false);
      
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

  return (
    <>
      <ImageLoader />
      <GalaxyBG />

      {/* Mostrar loading mientras se cargan las imágenes */}
      {!imagesLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="text-center bg-black/60 backdrop-blur-sm rounded-2xl px-12 py-8">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
            <div className="text-white text-2xl font-semibold mb-4">
              Loading...
            </div>
            <div className="text-gray-300 text-lg mb-2">{loadingProgress}%</div>
            <div className="w-64 bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Mostrar componentes solo cuando las imágenes estén cargadas */}
      {imagesLoaded && (
        <div
          className="w-full h-full flex p-6 relative animate-fade-in"
          style={{ zIndex: 1 }}
        >
          {/* Gráfico de red - ocupa todo el espacio disponible con efecto fade-in */}
          <div className="flex-1 w-full h-full opacity-0 animate-fade-in">
            <DisplayGraph />
          </div>

          {/* Panel de conexiones crosschain - ancho fijo con efecto slide-in desde la derecha */}
          <div className="h-full shrink-0 opacity-0 animate-slide-in-right flex items-center">
            <CrosschainSelector 
              onChainClick={handleChainClick}
              isTransferring={showDaftPunkEffect}
            />
          </div>
        </div>
      )}

      {/* Botón Send flotante - Solo visible cuando está conectado y tiene pares */}
      {isConnected && pairs.length > 0 && showSendButton && (
        <button
          onClick={handleSend}
          disabled={isSending}
          className="fixed bottom-6 right-6 z-40 group"
          title="Send Tokens"
        >
          {/* Fondo con efecto espacial */}
          <div className="relative">
            {/* Anillo orbital animado */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 opacity-75 blur-md animate-pulse"></div>
            <div className="absolute inset-0 rounded-full border-2 border-purple-500/50 animate-spin-slow"></div>
            
            {/* Botón principal */}
            <div className="relative bg-gradient-to-br from-gray-900 via-purple-900/50 to-blue-900/50 p-4 rounded-full border-2 border-purple-500/30 shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-110 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed">
              {isSending ? (
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {/* Ícono de Send (avión de papel) */}
                  <svg className="w-8 h-8 text-white group-hover:text-blue-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  
                  {/* Indicador brillante */}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
                </>
              )}
            </div>
            
            {/* Partículas flotantes */}
            {!isSending && (
              <>
                <div className="absolute -top-2 -left-2 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-75"></div>
                <div className="absolute -bottom-1 -right-2 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping opacity-75 animation-delay-300"></div>
              </>
            )}
          </div>
          
          {/* Tooltip */}
          {!isSending && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 border border-purple-500/30 rounded-lg text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                Send Tokens
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
            </div>
          )}
        </button>
      )}

      {/* Toast de éxito - Galáctico */}
      {showSuccessToast && (
        <div 
          className="fixed bottom-6 right-6 z-[9999] transition-all duration-300 ease-out"
          style={{
            animation: isToastClosing 
              ? 'slideOutRight 0.3s ease-in forwards' 
              : 'slideInRight 0.4s ease-out'
          }}
        >
          <div className="relative bg-gradient-to-br from-purple-900/95 via-blue-900/95 to-indigo-900/95 backdrop-blur-xl text-white px-6 py-5 rounded-2xl shadow-2xl flex items-center gap-4 min-w-[340px] border-2 border-purple-500/30 overflow-hidden">
            {/* Efecto de estrellas brillantes en el fondo */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-2 left-4 w-1 h-1 bg-white rounded-full animate-pulse"></div>
              <div className="absolute top-8 left-12 w-0.5 h-0.5 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
              <div className="absolute top-4 right-8 w-1 h-1 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
              <div className="absolute bottom-6 right-12 w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.9s' }}></div>
              <div className="absolute bottom-3 left-20 w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '1.2s' }}></div>
            </div>
            
            {/* Brillo espacial */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
            
            {/* Contenido */}
            <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-green-500/50 animate-pulse">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="relative">
              <div className="font-bold text-xl bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Tokens Sent!
              </div>
              <div className="text-sm text-blue-200/90 mt-0.5">
                Your tokens are on their way across the galaxy 🚀
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal fuera del contenedor principal */}
      <ChainModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        chainId={selectedChain?.id || ""}
        chainLabel={selectedChain?.label || ""}
        chainLogo={selectedChain?.logo}
        onConnect={handleConnectChain}
        collapseGraph={collapseGraph}
        onSendSuccess={() => {
          // Mostrar toast de éxito
          setShowSuccessToast(true);
          setIsToastClosing(false);
          
          // Iniciar animación de cierre después de 1.8 segundos
          setTimeout(() => {
            setIsToastClosing(true);
            // Ocultar completamente después de la animación
            setTimeout(() => {
              setShowSuccessToast(false);
              setIsToastClosing(false);
            }, 300);
          }, 1800);
        }}
      />
    </>
  );
}

export default function Home() {
  return <HomeContent />;
}
