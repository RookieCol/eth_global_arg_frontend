import { useState } from "react";
import oilIcon from "../../assets/icons/oil-pressure-alarm-svgrepo-com.svg";
import FaucetModal from "./FaucetModal";

export default function FaucetButton() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {/* Botón flotante en esquina inferior izquierda */}
      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 left-6 z-40 group"
        title="Faucet - Get Test Tokens"
      >
        {/* Fondo con efecto espacial */}
        <div className="relative">
          {/* Anillo orbital animado */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 opacity-75 blur-md animate-pulse"></div>
          <div className="absolute inset-0 rounded-full border-2 border-purple-500/50 animate-spin-slow"></div>
          
          {/* Botón principal */}
          <div className="relative bg-gradient-to-br from-gray-900 via-purple-900/50 to-blue-900/50 p-4 rounded-full border-2 border-purple-500/30 shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-110 backdrop-blur-sm">
            {/* Ícono de oil/fuel */}
            <img 
              src={oilIcon} 
              alt="Faucet" 
              className="w-8 h-8 brightness-0 invert opacity-90 group-hover:opacity-100 transition-opacity"
            />
            
            {/* Indicador de "fuel" brillante */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
          </div>
          
          {/* Partículas flotantes */}
          <div className="absolute -top-2 -left-2 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-75"></div>
          <div className="absolute -bottom-1 -right-2 w-1.5 h-1.5 bg-purple-400 rounded-full animate-ping opacity-75 animation-delay-300"></div>
        </div>
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 border border-purple-500/30 rounded-lg text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Faucet - Get Test Tokens
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </button>

      {/* Modal de Faucet */}
      <FaucetModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

