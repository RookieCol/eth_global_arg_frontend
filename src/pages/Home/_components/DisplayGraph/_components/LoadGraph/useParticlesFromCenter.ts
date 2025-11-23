import { useEffect, useRef } from "react";
import type { Sigma } from "sigma";

interface Particle {
  t: number; // 0 to 1 (progress along edge)
  velocity: number; // px/s
  radius: number;
  color: string;
  nextSpawnDelay: number;
  timeSinceSpawn: number;
  direction: number; // 1 = centro->chain, -1 = chain->centro
}

interface ParticleSystemConfig {
  centerId: string;
  excludedNodeId: string | null;
  particlesPerEdge?: number;
  minVelocity?: number;
  maxVelocity?: number;
  particleRadius?: number;
  spawnDelayMin?: number;
  spawnDelayMax?: number;
  palette?: string[];
}

const DEFAULT_CONFIG = {
  particlesPerEdge: 3,
  minVelocity: 80,
  maxVelocity: 150,
  particleRadius: 3,
  spawnDelayMin: 100,
  spawnDelayMax: 300,
  palette: [
    "rgba(251, 191, 36, 0.9)", // Amarillo
    "rgba(59, 130, 246, 0.9)", // Azul
    "rgba(139, 92, 246, 0.9)", // Púrpura
    "rgba(236, 72, 153, 0.9)", // Rosa
    "rgba(34, 197, 94, 0.9)", // Verde
    "rgba(239, 68, 68, 0.9)", // Rojo
  ],
};

export function useParticlesFromCenter(
  sigma: Sigma | null,
  config: ParticleSystemConfig
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesMapRef = useRef<Map<string, Particle[]>>(new Map());
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const containerRef = useRef<HTMLElement | null>(null);

  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  useEffect(() => {
    if (!sigma) return;

    console.log("🎨 Inicializando sistema de partículas...");

    // Crear canvas overlay
    const container = sigma.getContainer();
    containerRef.current = container;

    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "10";

    // Ajustar tamaño del canvas
    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      console.log(`📐 Canvas size: ${canvas.width}x${canvas.height}`);
    };
    updateCanvasSize();

    container.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("❌ No se pudo obtener contexto 2D");
      return;
    }

    // Inicializar partículas
    const initParticles = () => {
      const graph = sigma.getGraph();
      const particlesMap = new Map<string, Particle[]>();
      let edgeCount = 0;

      graph.forEachEdge((edge, attributes, source, target) => {
        if (source !== fullConfig.centerId) return;
        if (target === fullConfig.excludedNodeId) return;

        edgeCount++;
        const particles: Particle[] = [];

        // Mitad de partículas: centro -> chain
        for (let i = 0; i < Math.ceil(fullConfig.particlesPerEdge! / 2); i++) {
          const colorIndex = Math.floor(
            Math.random() * fullConfig.palette!.length
          );
          particles.push({
            t: Math.random(), // Spawn en posición aleatoria
            velocity:
              fullConfig.minVelocity! +
              Math.random() *
                (fullConfig.maxVelocity! - fullConfig.minVelocity!),
            radius: fullConfig.particleRadius!,
            color: fullConfig.palette![colorIndex],
            nextSpawnDelay:
              fullConfig.spawnDelayMin! +
              Math.random() *
                (fullConfig.spawnDelayMax! - fullConfig.spawnDelayMin!),
            timeSinceSpawn: 0,
            direction: 1, // Centro -> Chain
          });
        }

        // Otra mitad: chain -> centro
        for (let i = 0; i < Math.floor(fullConfig.particlesPerEdge! / 2); i++) {
          const colorIndex = Math.floor(
            Math.random() * fullConfig.palette!.length
          );
          particles.push({
            t: Math.random(), // Spawn en posición aleatoria
            velocity:
              fullConfig.minVelocity! +
              Math.random() *
                (fullConfig.maxVelocity! - fullConfig.minVelocity!),
            radius: fullConfig.particleRadius!,
            color: fullConfig.palette![colorIndex],
            nextSpawnDelay:
              fullConfig.spawnDelayMin! +
              Math.random() *
                (fullConfig.spawnDelayMax! - fullConfig.spawnDelayMin!),
            timeSinceSpawn: 0,
            direction: -1, // Chain -> Centro
          });
        }

        particlesMap.set(edge, particles);
      });

      console.log(`✅ Partículas inicializadas para ${edgeCount} edges`);
      particlesMapRef.current = particlesMap;
    };

    initParticles();

    // Loop de animación
    const animate = (currentTime: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = currentTime;
      const deltaTime = (currentTime - lastTimeRef.current) / 1000; // en segundos
      lastTimeRef.current = currentTime;

      // Limpiar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const graph = sigma.getGraph();

      // Obtener posición del centro
      const centerDisplayData = sigma.getNodeDisplayData(fullConfig.centerId);
      if (!centerDisplayData) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const centerX = centerDisplayData.x;
      const centerY = centerDisplayData.y;

      let particleCount = 0;

      // Actualizar y dibujar partículas
      particlesMapRef.current.forEach((particles, edgeKey) => {
        if (!graph.hasEdge(edgeKey)) return;

        const [source, target] = graph.extremities(edgeKey);

        // Si el target está excluido, no dibujar partículas
        if (target === fullConfig.excludedNodeId) return;

        const targetDisplayData = sigma.getNodeDisplayData(target);
        if (!targetDisplayData) return;

        const targetX = targetDisplayData.x;
        const targetY = targetDisplayData.y;

        // Calcular distancia para normalizar velocidad
        const dx = targetX - centerX;
        const dy = targetY - centerY;
        const edgeLength = Math.sqrt(dx * dx + dy * dy);

        if (edgeLength === 0) return;

        particles.forEach((particle) => {
          // Actualizar posición
          const deltaT =
            (particle.velocity * deltaTime * particle.direction) / edgeLength;
          particle.t += deltaT;

          // Reciclar partícula si sale del rango
          if (particle.t > 1 || particle.t < 0) {
            particle.t = particle.t > 1 ? 0 : 1;
            // Cambiar color al reciclar
            const colorIndex = Math.floor(
              Math.random() * fullConfig.palette!.length
            );
            particle.color = fullConfig.palette![colorIndex];
          }

          // Calcular posición interpolada
          const x = centerX + dx * particle.t;
          const y = centerY + dy * particle.t;

          // Dibujar partícula
          ctx.beginPath();
          ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
          ctx.fillStyle = particle.color;
          ctx.shadowBlur = 6;
          ctx.shadowColor = particle.color;
          ctx.fill();
          ctx.shadowBlur = 0;

          particleCount++;
        });
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    console.log("🚀 Animación iniciada");

    // Listener para resize
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      console.log("🧹 Limpiando sistema de partículas");
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (canvasRef.current && containerRef.current) {
        containerRef.current.removeChild(canvasRef.current);
      }
      resizeObserver.disconnect();
      particlesMapRef.current.clear();
    };
  }, [
    sigma,
    fullConfig.centerId,
    fullConfig.excludedNodeId,
    fullConfig.particlesPerEdge,
    fullConfig.minVelocity,
    fullConfig.maxVelocity,
    fullConfig.particleRadius,
    fullConfig.spawnDelayMin,
    fullConfig.spawnDelayMax,
    fullConfig.palette,
  ]);

  // Función para reiniciar explosión de partículas
  const restartExplosion = () => {
    console.log("💥 Reiniciando explosión de partículas");
    particlesMapRef.current.forEach((particles) => {
      particles.forEach((particle) => {
        particle.t = particle.direction === 1 ? 0 : 1; // Reset según dirección
        particle.timeSinceSpawn = 0;
      });
    });
  };

  return { restartExplosion };
}
