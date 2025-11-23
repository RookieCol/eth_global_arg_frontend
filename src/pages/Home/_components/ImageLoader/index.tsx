import { useEffect } from "react";
import { usePairs } from "../CrosschainSelector/context";
import { chains } from "../../../../config/const";

export default function ImageLoader() {
  const { setImagesLoaded, setLoadingProgress } = usePairs();

  useEffect(() => {
    let cancelled = false;

    const preloadAllImages = async () => {
      if (cancelled) return;

      const imageUrls = chains.map((chain) => chain.logo);
      let loadedCount = 0;

      // Cargar todas las imágenes en paralelo con Promise.all
      const loadPromises = imageUrls.map((url) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";

          img.onload = () => {
            if (cancelled) return;
            loadedCount++;
            const progress = Math.round((loadedCount / imageUrls.length) * 100);
            setLoadingProgress(progress);
            resolve();
          };

          img.onerror = () => {
            if (cancelled) return;
            loadedCount++;
            const progress = Math.round((loadedCount / imageUrls.length) * 100);
            setLoadingProgress(progress);
            resolve(); // Continuar aunque falle una imagen
          };

          img.src = url;
        });
      });

      try {
        await Promise.all(loadPromises);

        if (cancelled) return;

        // Asegurar que llega a 100% antes de marcar como completado
        setLoadingProgress(100);
        await new Promise((r) => setTimeout(r, 300)); // Pausa breve para mostrar el 100%
        setImagesLoaded(true);
      } catch (error) {
        console.error("Error loading images:", error);
        setImagesLoaded(true); // Continuar aunque haya errores
      }
    };

    preloadAllImages();

    return () => {
      cancelled = true;
    };
  }, [setImagesLoaded, setLoadingProgress]);

  return null; // Este componente no renderiza nada
}
