import { useEffect, useRef, useState } from "react";
import { usePairs } from "../../../../CrosschainSelector/context";

export default function GalaxyBG() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { triggerCelebration, setTriggerCelebration } = usePairs();
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Configurar tamaño del canvas
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Crear estrellas
    interface Star {
      x: number;
      y: number;
      size: number;
      speed: number;
      opacity: number;
      fadeDirection: number;
      // Para la celebración
      originalX?: number;
      originalY?: number;
      celebrationAngle?: number;
      celebrationSpeed?: number;
      color?: string;
    }

    const stars: Star[] = [];
    const starCount = 800;

    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      stars.push({
        x,
        y,
        originalX: x,
        originalY: y,
        size: Math.random() * 0.5 + 0.3,
        speed: Math.random() * 0.05 + 0.01,
        opacity: Math.random(),
        fadeDirection: Math.random() > 0.5 ? 1 : -1,
        celebrationAngle: Math.random() * Math.PI * 2,
        celebrationSpeed: Math.random() * 8 + 4,
        color: ["#60A5FA", "#A78BFA", "#34D399", "#FBBF24", "#F87171", "#ffffff"][Math.floor(Math.random() * 6)],
      });
    }

    // Variables para la celebración
    let celebrationStartTime = 0;
    const celebrationDuration = 2000; // 2 segundos de explosión estelar

    // Animar estrellas
    const animate = (currentTime: number) => {
      if (!canvasRef.current) return;

      ctx.fillStyle = "#242424";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Verificar si debe celebrar
      const celebrating = isCelebrating;
      let progress = 0;

      if (celebrating) {
        if (celebrationStartTime === 0) {
          celebrationStartTime = currentTime;
        }
        progress = Math.min(1, (currentTime - celebrationStartTime) / celebrationDuration);
        
        // Finalizar celebración
        if (progress >= 1) {
          setIsCelebrating(false);
          celebrationStartTime = 0;
          // Mostrar mensaje de éxito después de la explosión
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
            setTriggerCelebration(false);
          }, 2000);
        }
      }

      stars.forEach((star) => {
        if (celebrating && star.originalX !== undefined && star.originalY !== undefined) {
          // Modo celebración: explosión desde el centro
          const centerX = canvas.width / 2;
          const centerY = canvas.height / 2;
          
          // Mover hacia el centro primero (implosión)
          if (progress < 0.3) {
            const implosionProgress = progress / 0.3;
            star.x = star.originalX + (centerX - star.originalX) * implosionProgress;
            star.y = star.originalY + (centerY - star.originalY) * implosionProgress;
            star.size = (star.size || 0.5) * (1 + implosionProgress * 2);
            star.opacity = 1;
          } else {
            // Explosión desde el centro
            const explosionProgress = (progress - 0.3) / 0.7;
            const distance = star.celebrationSpeed! * explosionProgress * 200;
            star.x = centerX + Math.cos(star.celebrationAngle!) * distance;
            star.y = centerY + Math.sin(star.celebrationAngle!) * distance;
            star.size = (star.size || 0.5) * (3 - explosionProgress * 2);
            star.opacity = 1 - explosionProgress;
          }

          // Color arcoíris durante celebración
          ctx.fillStyle = star.color || `rgba(255, 255, 255, ${star.opacity})`;
          ctx.shadowBlur = 10;
          ctx.shadowColor = star.color || "white";
        } else {
          // Modo normal: efecto de parpadeo
          star.opacity += star.fadeDirection * 0.01;
          if (star.opacity >= 0.6 || star.opacity <= 0.15) {
            star.fadeDirection *= -1;
          }

          ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
          ctx.shadowBlur = 0;

          // Movimiento sutil
          star.y -= star.speed;
          if (star.y < 0) {
            star.y = canvas.height;
            star.x = Math.random() * canvas.width;
            star.originalX = star.x;
            star.originalY = star.y;
          }
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isCelebrating, setTriggerCelebration]);

  // Escuchar trigger de celebración
  useEffect(() => {
    if (triggerCelebration) {
      setIsCelebrating(true);
    }
  }, [triggerCelebration]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />
      
      {/* Mensaje de éxito después de la explosión */}
      {showSuccessMessage && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center">
          <div className="bg-gradient-to-r from-purple-600/90 to-blue-600/90 backdrop-blur-md rounded-2xl px-8 py-6 shadow-2xl border-2 border-white/20 animate-scale-in">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg animate-bounce">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">Tokens Claimed!</h3>
                <p className="text-blue-100 text-sm">Your galactic fuel has been loaded ✨</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
