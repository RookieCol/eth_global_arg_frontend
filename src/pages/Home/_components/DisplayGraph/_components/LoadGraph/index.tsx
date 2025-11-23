import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import Graph from "graphology";
import { useLoadGraph, useRegisterEvents, useSigma } from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import layerzeroIcon from "../../../../../../assets/icons/layerzero.png";
import { chains } from "../../../../../../config/const";
import { usePairs, type PairInfo } from "../../../CrosschainSelector/context";
import { useWallet } from "../../../../../../shared/Wallet/context";

const CENTER_ID = "layerzero";
const NODE_MIN = 18;
const ENABLED_NODE_MIN = 25;
const ENABLED_NODE_MAX = 25;
const EDGE_COLOR = "#343434";
const BG_NODE = "#242424";

// Paleta de colores para parejas
const PAIR_COLORS = [
  "rgba(251, 191, 36, 1)", // Amarillo
  "rgba(239, 68, 68, 1)", // Rojo
  "rgba(59, 130, 246, 1)", // Azul
  "rgba(34, 197, 94, 1)", // Verde
  "rgba(168, 85, 247, 1)", // Púrpura
  "rgba(236, 72, 153, 1)", // Rosa
  "rgba(20, 184, 166, 1)", // Cian
  "rgba(245, 158, 11, 1)", // Naranja
];

// Colores para efecto de agujero de gusano
const WORMHOLE_COLORS = {
  // Colores de entrada (nodo origen)
  entry: {
    primary: "rgba(0, 255, 255, 0.9)", // Cian brillante
    secondary: "rgba(0, 200, 255, 0.7)", // Azul cian
    accent: "rgba(255, 255, 255, 0.8)", // Blanco brillante
  },
  // Colores de salida (nodo destino)
  exit: {
    primary: "rgba(255, 0, 255, 0.9)", // Magenta brillante
    secondary: "rgba(255, 100, 255, 0.7)", // Rosa magenta
    accent: "rgba(255, 255, 255, 0.8)", // Blanco brillante
  },
  // Colores del cuerpo del agujero de gusano
  body: {
    dark: "rgba(0, 0, 0, 0.8)", // Negro profundo
    purple: "rgba(75, 0, 130, 0.6)", // Púrpura oscuro
    blue: "rgba(0, 0, 139, 0.5)", // Azul marino
    glow: "rgba(255, 255, 255, 0.3)", // Brillo blanco
  },
};

// Función para crear gradiente arcoíris desde múltiples colores
const createRainbowGradient = (colors: string[]): string => {
  if (colors.length === 1) return colors[0];
  if (colors.length === 0) return EDGE_COLOR;

  // Si tiene múltiples colores, crear un gradiente arcoíris
  // Convertir colores rgba a valores numéricos para interpolación
  const colorValues = colors.map((color) => {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      return {
        r: parseInt(match[0]),
        g: parseInt(match[1]),
        b: parseInt(match[2]),
      };
    }
    return { r: 251, g: 191, b: 36 }; // Fallback amarillo
  });

  // Promediar los colores para crear un arcoíris
  const avgR = Math.round(
    colorValues.reduce((sum, c) => sum + c.r, 0) / colorValues.length
  );
  const avgG = Math.round(
    colorValues.reduce((sum, c) => sum + c.g, 0) / colorValues.length
  );
  const avgB = Math.round(
    colorValues.reduce((sum, c) => sum + c.b, 0) / colorValues.length
  );

  return `rgba(${avgR}, ${avgG}, ${avgB}, 1)`;
};

// Función para crear gradiente de agujero de gusano
const createWormholeGradient = (
  entryColor: string,
  exitColor: string
): string => {
  // Crear gradiente que simula un agujero de gusano
  const colorStops = [
    `${entryColor} 0%`,
    `${WORMHOLE_COLORS.body.purple} 20%`,
    `${WORMHOLE_COLORS.body.dark} 40%`,
    `${WORMHOLE_COLORS.body.blue} 60%`,
    `${WORMHOLE_COLORS.body.purple} 80%`,
    `${exitColor} 100%`,
  ].join(", ");

  return `linear-gradient(90deg, ${colorStops})`;
};

export default function LoadGraph(): JSX.Element | null {
  const loadGraph = useLoadGraph();
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  const expandedRef = useRef(false); // estado de expandido/colapsado
  const { updatePairs, imagesLoaded, setCollapseGraph, setExpandGraph } = usePairs(); // Contexto para compartir parejas
  const { walletData } = useWallet(); // Datos del wallet con balances
  const imagesLoadedRef = useRef(imagesLoaded);

  // Refs para funciones que se usan en event handlers
  // Esto evita re-registro de eventos cuando las funciones cambian
  const addOrResetChainNodesAtCenterRef = useRef<(() => void) | null>(null);
  const animateInvertedCloseRef = useRef<((duration?: number) => void) | null>(
    null
  );
  const animateBigBangCollapseRef = useRef<
    ((duration?: number) => void) | null
  >(null);
  const animateChainClickRef = useRef<((nodeId: string) => void) | null>(null);
  const highlightWormholeHoverRef = useRef<((edgeId: string) => void) | null>(
    null
  );
  const restoreWormholeHoverRef = useRef<((edgeId: string) => void) | null>(
    null
  );

  // Flag para evitar registro múltiple de eventos
  const eventsRegisteredRef = useRef(false);
  // Guardar la función de unregister para limpiar correctamente
  const unregisterFnRef = useRef<(() => void) | null>(null);

  // Actualizar ref cuando cambia imagesLoaded
  useEffect(() => {
    imagesLoadedRef.current = imagesLoaded;
  }, [imagesLoaded]);

  // Map<nodoId, Set<color>> - almacena los colores de cada nodo (puede tener múltiples)
  const selectedChainsRef = useRef<Map<string, Set<string>>>(new Map());
  // Parejas completas: Map<color, [nodo1, nodo2]>
  const pairsRef = useRef<Map<string, [string, string]>>(new Map());
  // Nodo esperando su par (solo puede haber uno a la vez)
  const pendingNodeRef = useRef<string | null>(null);
  // Índice del siguiente color a usar
  const nextColorIndexRef = useRef(0);
  const isCollapsingRef = useRef(false); // flag para detener flotación durante colapso
  const [expansionKey, setExpansionKey] = useState(0); // clave para reiniciar flotación al expandir

  // 1) Cargar nodo central
  useEffect(() => {
    const graph = new Graph();
    graph.addNode(CENTER_ID, {
      x: 0,
      y: 0,
      size: 30,
      type: "image",
      image: layerzeroIcon,
      color: BG_NODE,
      zIndex: 10,
    });
    loadGraph(graph);
  }, [loadGraph]);

  // Función para encontrar todos los nodos relacionados (componente conexa)
  const findConnectedNodes = useCallback((startNode: string): Set<string> => {
    const connected = new Set<string>();
    const visited = new Set<string>();

    const dfs = (node: string) => {
      if (visited.has(node)) return;
      visited.add(node);
      connected.add(node);

      // Buscar en todas las parejas
      pairsRef.current.forEach((pair) => {
        const [node1, node2] = pair;
        if (node1 === node && !visited.has(node2)) {
          dfs(node2);
        } else if (node2 === node && !visited.has(node1)) {
          dfs(node1);
        }
      });
    };

    dfs(startNode);
    return connected;
  }, []);

  // Función para propagar colores a todos los nodos relacionados
  const propagateColorsToConnectedNodes = useCallback(
    (nodeId: string) => {
      // Encontrar todos los nodos relacionados
      const connectedNodes = findConnectedNodes(nodeId);

      // Recolectar todos los colores de todos los nodos relacionados
      const allColors = new Set<string>();
      connectedNodes.forEach((nid) => {
        const nodeColors = selectedChainsRef.current.get(nid);
        if (nodeColors) {
          nodeColors.forEach((color) => allColors.add(color));
        }
      });

      // Aplicar todos los colores a cada nodo del grupo
      if (allColors.size > 0) {
        connectedNodes.forEach((nid) => {
          const nodeColors = selectedChainsRef.current.get(nid);
          if (nodeColors) {
            // Agregar todos los colores del grupo
            allColors.forEach((color) => nodeColors.add(color));
          }
        });
      }
    },
    [findConnectedNodes]
  );

  // Función para sincronizar parejas con el contexto
  const syncPairsToContext = useCallback(() => {
    console.log(
      "📋 syncPairsToContext - Sincronizando parejas con contexto..."
    );
    console.log("pairsRef.current:", Array.from(pairsRef.current.entries()));
    const pairsInfo: PairInfo[] = [];

    pairsRef.current.forEach(([secondClicked, firstClicked], color) => {
      // En LoadGraph: [nodeId, pendingNode] = [secondClicked, firstClicked]
      // nodeId (segundo clickeado) = secondClicked
      // pendingNode (primer clickeado) = firstClicked
      // LÓGICA CORREGIDA: primer clickeado → Source, segundo clickeado → Destination
      // Esto significa que cuando haces clic primero en A y luego en B, la relación es A → B

      // Extraer el ID numérico del formato "chain-{id}"
      const firstNumId = parseInt(firstClicked.replace("chain-", ""));
      const secondNumId = parseInt(secondClicked.replace("chain-", ""));

      // Buscar las chains correspondientes
      const firstChain = chains.find((c) => c.id === firstNumId);
      const secondChain = chains.find((c) => c.id === secondNumId);

      if (firstChain && secondChain) {
        // CORREGIDO: primer clickeado → Source (de donde sale), segundo clickeado → Destination (hacia donde va)
        // Ejemplo: clic en Arbitrum (1ro) luego Ethereum (2do) → Arbitrum → Ethereum
        const pairInfo = {
          sourceId: firstClicked, // primer clickeado → Source (de donde sale)
          destinationId: secondClicked, // segundo clickeado → Destination (hacia donde va)
          color,
          sourceLabel: firstChain.label, // primer clickeado
          destinationLabel: secondChain.label, // segundo clickeado
          sourceLogo: firstChain.logo, // primer clickeado
          destinationLogo: secondChain.logo, // segundo clickeado
        };
        console.log("  Pair creado:", pairInfo);
        pairsInfo.push(pairInfo);
      } else {
        console.warn("⚠️ No se encontraron chains para:", {
          firstNumId,
          secondNumId,
          firstClicked,
          secondClicked,
        });
      }
    });

    console.log("Total de parejas a actualizar:", pairsInfo.length);
    console.log("Parejas finales:", pairsInfo);
    updatePairs(pairsInfo);
    console.log("✅ Parejas actualizadas en contexto");
  }, [updatePairs]);

  // Función para limpiar todos los efectos de agujero de gusano
  const clearWormholeEffects = useCallback(() => {
    const graph = sigma.getGraph();

    // Limpiar efectos de edges del centro
    chains.forEach((chain) => {
      const id = `chain-${chain.id}`;
      const edgeId = graph.edge(CENTER_ID, id);
      if (edgeId) {
        graph.removeEdgeAttribute(edgeId, "wormhole");
        graph.removeEdgeAttribute(edgeId, "entryColor");
        graph.removeEdgeAttribute(edgeId, "exitColor");
        graph.setEdgeAttribute(edgeId, "type", "line");
        graph.setEdgeAttribute(edgeId, "size", 1);
        graph.setEdgeAttribute(edgeId, "color", EDGE_COLOR);
      }
    });

    // Limpiar efectos de edges crosschain
    pairsRef.current.forEach(([sourceId, destinationId]) => {
      const crosschainEdgeId = graph.edge(sourceId, destinationId);
      if (crosschainEdgeId) {
        graph.removeEdgeAttribute(crosschainEdgeId, "wormhole");
        graph.removeEdgeAttribute(crosschainEdgeId, "entryColor");
        graph.removeEdgeAttribute(crosschainEdgeId, "exitColor");
        graph.setEdgeAttribute(crosschainEdgeId, "type", "line");
        graph.setEdgeAttribute(crosschainEdgeId, "size", 1);
        graph.setEdgeAttribute(crosschainEdgeId, "color", EDGE_COLOR);
      }
    });

    // Limpiar efectos de nodos
    chains.forEach((chain) => {
      const id = `chain-${chain.id}`;
      if (graph.hasNode(id)) {
        graph.removeNodeAttribute(id, "wormholeGlow");
        graph.removeNodeAttribute(id, "wormholeType");

        // Restaurar tamaño original
        const nodeColors = selectedChainsRef.current.get(id);
        if (nodeColors && nodeColors.size > 0) {
          const baseSize = chains.find((c) => `chain-${c.id}` === id)?.enabled
            ? ENABLED_NODE_MAX
            : NODE_MIN;
          graph.setNodeAttribute(id, "size", baseSize);
        }
      }
    });
  }, [sigma]);

  // Función para actualizar los colores de las edges basándose en las parejas
  const updateEdgeColors = useCallback(() => {
    console.log("🎨 updateEdgeColors - Actualizando colores de edges...");
    const graph = sigma.getGraph();

    // Limpiar todos los efectos de agujero de gusano primero
    console.log("  Limpiando efectos de agujero de gusano...");
    clearWormholeEffects();

    // Limpiar edges crosschain existentes que ya no forman parte de parejas
    const currentPairEdges = new Set<string>();
    pairsRef.current.forEach(([sourceId, destinationId]) => {
      const edgeId = graph.edge(sourceId, destinationId);
      if (edgeId) {
        currentPairEdges.add(edgeId);
      }
    });

    // Eliminar edges crosschain que ya no están en parejas activas
    graph.forEachEdge((edgeId) => {
      // Verificar si es una edge crosschain (no conecta con el centro)
      const edgeSource = graph.source(edgeId);
      const edgeTarget = graph.target(edgeId);
      const isCrosschainEdge =
        edgeSource !== CENTER_ID && edgeTarget !== CENTER_ID;

      if (isCrosschainEdge && !currentPairEdges.has(edgeId)) {
        // Es una edge crosschain que ya no está activa
        graph.dropEdge(edgeId);
      }
    });

    // Aplicar colores normales a todas las edges del centro
    chains.forEach((chain) => {
      const id = `chain-${chain.id}`;
      const edgeId = graph.edge(CENTER_ID, id);
      if (!edgeId) return;

      const nodeColors = selectedChainsRef.current.get(id);
      if (nodeColors && nodeColors.size > 0) {
        // Si el nodo tiene colores, crear gradiente arcoíris si tiene múltiples
        const colorsArray = Array.from(nodeColors);
        const finalColor = createRainbowGradient(colorsArray);
        graph.setEdgeAttribute(edgeId, "color", finalColor);
        graph.setEdgeAttribute(edgeId, "size", 2);
      } else {
        // Si no está seleccionado, color neutro
        graph.setEdgeAttribute(edgeId, "color", EDGE_COLOR);
        graph.setEdgeAttribute(edgeId, "size", 1);
      }
    });

    // Crear edges directas entre nodos de parejas y aplicar efecto de agujero de gusano
    pairsRef.current.forEach(([sourceId, destinationId], pairColor) => {
      // Buscar si ya existe una edge entre estos nodos
      let crosschainEdgeId = graph.edge(sourceId, destinationId);

      // Si no existe, crearla
      if (!crosschainEdgeId) {
        crosschainEdgeId = graph.addEdge(sourceId, destinationId);
        // Aplicar atributos iniciales
        graph.setEdgeAttribute(crosschainEdgeId, "type", "line");
        graph.setEdgeAttribute(crosschainEdgeId, "color", EDGE_COLOR);
        graph.setEdgeAttribute(crosschainEdgeId, "size", 1);
      }

      // Aplicar efecto de agujero de gusano a la edge crosschain
      if (crosschainEdgeId) {
        // Crear variaciones del color de la pareja para el efecto de agujero de gusano
        const entryColorVariation = pairColor.replace("1)", "0.9)"); // Ligeramente más transparente
        const exitColorVariation = pairColor.replace("1)", "0.8)"); // Más transparente

        graph.setEdgeAttribute(crosschainEdgeId, "type", "line");
        graph.setEdgeAttribute(crosschainEdgeId, "wormhole", true);
        graph.setEdgeAttribute(
          crosschainEdgeId,
          "entryColor",
          entryColorVariation
        );
        graph.setEdgeAttribute(
          crosschainEdgeId,
          "exitColor",
          exitColorVariation
        );
        graph.setEdgeAttribute(crosschainEdgeId, "size", 4); // Más gruesa para el efecto
        graph.setEdgeAttribute(
          crosschainEdgeId,
          "color",
          createWormholeGradient(entryColorVariation, exitColorVariation)
        );
      }
    });

    // Sincronizar parejas con el contexto después de actualizar colores
    console.log("  Sincronizando parejas con el contexto...");
    try {
      syncPairsToContext();
      console.log("✅ Colores de edges actualizados");
    } catch (error) {
      console.error("❌ ERROR en syncPairsToContext:", error);
      throw error;
    }
  }, [sigma, syncPairsToContext, clearWormholeEffects]);

  // Función para animar el efecto de agujero de gusano
  const animateWormholeEffect = useCallback(() => {
    const graph = sigma.getGraph();
    let animationId: number;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const t = (elapsed % 2000) / 2000; // Ciclo de 2 segundos

      // Aplicar efecto de pulso a todas las edges crosschain con agujero de gusano
      pairsRef.current.forEach(([sourceId, destinationId], pairColor) => {
        const crosschainEdgeId = graph.edge(sourceId, destinationId);

        if (
          crosschainEdgeId &&
          graph.getEdgeAttribute(crosschainEdgeId, "wormhole")
        ) {
          // Efecto de pulso en el tamaño
          const baseSize = 4;
          const pulseSize = baseSize + Math.sin(t * Math.PI * 2) * 1.5;
          graph.setEdgeAttribute(crosschainEdgeId, "size", pulseSize);

          // Efecto de brillo en el color usando el color de la pareja
          const glowIntensity = 0.3 + Math.sin(t * Math.PI * 2) * 0.2;

          // Crear variaciones del color de la pareja con efecto de brillo
          const glowingEntryColor = pairColor.replace(
            "1)",
            `${glowIntensity})`
          );
          const glowingExitColor = pairColor.replace(
            "1)",
            `${glowIntensity * 0.8})`
          );

          const wormholeGradient = createWormholeGradient(
            glowingEntryColor,
            glowingExitColor
          );

          graph.setEdgeAttribute(crosschainEdgeId, "color", wormholeGradient);
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    // Retornar función de limpieza
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [sigma]);

  // Iniciar animación del agujero de gusano cuando hay parejas
  useEffect(() => {
    if (pairsRef.current.size > 0) {
      const cleanup = animateWormholeEffect();
      return cleanup;
    }
  }, [animateWormholeEffect, pairsRef.current.size]);

  // Función para aplicar efectos visuales de agujero de gusano a los nodos
  const applyWormholeNodeEffects = useCallback(() => {
    const graph = sigma.getGraph();

    // Resetear todos los nodos a su estado normal
    chains.forEach((chain) => {
      const id = `chain-${chain.id}`;
      if (graph.hasNode(id)) {
        graph.removeNodeAttribute(id, "wormholeGlow");
        graph.removeNodeAttribute(id, "wormholeType");
      }
    });

    // Aplicar efectos a los nodos que forman parte de parejas
    pairsRef.current.forEach(([sourceId, destinationId]) => {
      [sourceId, destinationId].forEach((nodeId) => {
        if (graph.hasNode(nodeId)) {
          graph.setNodeAttribute(nodeId, "wormholeGlow", true);
          graph.setNodeAttribute(nodeId, "wormholeType", "portal");

          // Aumentar el tamaño para el efecto de portal
          const currentSize = graph.getNodeAttribute(nodeId, "size") as number;
          graph.setNodeAttribute(nodeId, "size", currentSize * 1.2);
        }
      });
    });
  }, [sigma]);

  // Aplicar efectos de nodos cuando se actualicen las parejas
  useEffect(() => {
    applyWormholeNodeEffects();
  }, [applyWormholeNodeEffects, pairsRef.current.size]);

  // Ref para almacenar estados originales durante hover
  const hoverStateRef = useRef<
    Map<
      string,
      {
        edgeSize: number;
        edgeColor: string;
        sourceSize: number;
        targetSize: number;
        sourceColor: string;
        targetColor: string;
      }
    >
  >(new Map());

  // Ref para animaciones de hover activas
  const hoverAnimationRef = useRef<Map<string, number>>(new Map());

  // Función para iluminar nodos y edge en hover
  const highlightWormholeHover = useCallback(
    (edgeId: string) => {
      const graph = sigma.getGraph();
      const sourceId = graph.source(edgeId);
      const targetId = graph.target(edgeId);

      // Guardar estado original
      const originalEdgeSize = graph.getEdgeAttribute(edgeId, "size") as number;
      const originalEdgeColor = graph.getEdgeAttribute(
        edgeId,
        "color"
      ) as string;
      const originalSourceSize = graph.hasNode(sourceId)
        ? (graph.getNodeAttribute(sourceId, "size") as number)
        : 0;
      const originalTargetSize = graph.hasNode(targetId)
        ? (graph.getNodeAttribute(targetId, "size") as number)
        : 0;
      const originalSourceColor = graph.hasNode(sourceId)
        ? (graph.getNodeAttribute(sourceId, "color") as string)
        : "";
      const originalTargetColor = graph.hasNode(targetId)
        ? (graph.getNodeAttribute(targetId, "color") as string)
        : "";

      hoverStateRef.current.set(edgeId, {
        edgeSize: originalEdgeSize,
        edgeColor: originalEdgeColor,
        sourceSize: originalSourceSize,
        targetSize: originalTargetSize,
        sourceColor: originalSourceColor,
        targetColor: originalTargetColor,
      });

      // Iluminar la edge con efecto más dramático
      graph.setEdgeAttribute(edgeId, "size", originalEdgeSize * 2.5); // Más gruesa
      graph.setEdgeAttribute(
        edgeId,
        "color",
        originalEdgeColor.replace("0.9)", "1)").replace("0.8)", "1)")
      );
      graph.setEdgeAttribute(edgeId, "type", "line");
      graph.setEdgeAttribute(edgeId, "hovered", true);

      // Iluminar los nodos conectados con efecto más dramático
      if (graph.hasNode(sourceId)) {
        graph.setNodeAttribute(sourceId, "size", originalSourceSize * 1.8); // Más grande
        graph.setNodeAttribute(sourceId, "highlighted", true);
        graph.setNodeAttribute(sourceId, "hovered", true);
        // Añadir efecto de brillo al color del nodo
        const nodeColor = graph.getNodeAttribute(sourceId, "color") as string;
        if (nodeColor) {
          graph.setNodeAttribute(
            sourceId,
            "color",
            nodeColor.replace("1)", "1.2)")
          );
        }
      }

      if (graph.hasNode(targetId)) {
        graph.setNodeAttribute(targetId, "size", originalTargetSize * 1.8); // Más grande
        graph.setNodeAttribute(targetId, "highlighted", true);
        graph.setNodeAttribute(targetId, "hovered", true);
        // Añadir efecto de brillo al color del nodo
        const nodeColor = graph.getNodeAttribute(targetId, "color") as string;
        if (nodeColor) {
          graph.setNodeAttribute(
            targetId,
            "color",
            nodeColor.replace("1)", "1.2)")
          );
        }
      }

      // Iniciar animación de pulso para el hover
      const startTime = performance.now();
      const animateHover = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const t = (elapsed % 1000) / 1000; // Ciclo de 1 segundo

        // Efecto de pulso en la edge
        const pulseSize =
          originalEdgeSize * 2.5 +
          Math.sin(t * Math.PI * 2) * (originalEdgeSize * 0.5);
        graph.setEdgeAttribute(edgeId, "size", pulseSize);

        // Efecto de pulso en los nodos
        if (graph.hasNode(sourceId)) {
          const nodePulseSize =
            originalSourceSize * 1.8 +
            Math.sin(t * Math.PI * 2) * (originalSourceSize * 0.3);
          graph.setNodeAttribute(sourceId, "size", nodePulseSize);
        }

        if (graph.hasNode(targetId)) {
          const nodePulseSize =
            originalTargetSize * 1.8 +
            Math.sin(t * Math.PI * 2) * (originalTargetSize * 0.3);
          graph.setNodeAttribute(targetId, "size", nodePulseSize);
        }

        // Continuar animación si el hover sigue activo
        if (hoverAnimationRef.current.has(edgeId)) {
          const animationId = requestAnimationFrame(animateHover);
          hoverAnimationRef.current.set(edgeId, animationId);
        }
      };

      const animationId = requestAnimationFrame(animateHover);
      hoverAnimationRef.current.set(edgeId, animationId);
    },
    [sigma]
  );

  // Actualizar ref
  useEffect(() => {
    highlightWormholeHoverRef.current = highlightWormholeHover;
  }, [highlightWormholeHover]);

  // Función para restaurar el estado normal después del hover
  const restoreWormholeHover = useCallback(
    (edgeId: string) => {
      const graph = sigma.getGraph();
      const sourceId = graph.source(edgeId);
      const targetId = graph.target(edgeId);

      // Detener animación de hover
      const animationId = hoverAnimationRef.current.get(edgeId);
      if (animationId) {
        cancelAnimationFrame(animationId);
        hoverAnimationRef.current.delete(edgeId);
      }

      // Obtener estado original guardado
      const originalState = hoverStateRef.current.get(edgeId);
      if (!originalState) return;

      // Restaurar la edge
      graph.setEdgeAttribute(edgeId, "size", originalState.edgeSize);
      graph.setEdgeAttribute(edgeId, "color", originalState.edgeColor);
      graph.removeEdgeAttribute(edgeId, "hovered");

      // Restaurar los nodos conectados
      if (graph.hasNode(sourceId)) {
        graph.setNodeAttribute(sourceId, "size", originalState.sourceSize);
        graph.setNodeAttribute(sourceId, "color", originalState.sourceColor);
        graph.removeNodeAttribute(sourceId, "highlighted");
        graph.removeNodeAttribute(sourceId, "hovered");
      }

      if (graph.hasNode(targetId)) {
        graph.setNodeAttribute(targetId, "size", originalState.targetSize);
        graph.setNodeAttribute(targetId, "color", originalState.targetColor);
        graph.removeNodeAttribute(targetId, "highlighted");
        graph.removeNodeAttribute(targetId, "hovered");
      }

      // Limpiar estado guardado
      hoverStateRef.current.delete(edgeId);
    },
    [sigma]
  );

  // Actualizar ref
  useEffect(() => {
    restoreWormholeHoverRef.current = restoreWormholeHover;
  }, [restoreWormholeHover]);

  // Utils
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const easeInCubic = (t: number) => t * t * t;

  const getRadius = useCallback(() => {
    const el = sigma.getContainer() as HTMLElement;
    const { width, height } = el.getBoundingClientRect();
    // Radio más grande para aprovechar mejor el espacio disponible
    return Math.max(200, Math.min(width, height) * 0.4);
  }, [sigma]);

  // Función para calcular el tamaño del nodo basado SOLO en el balance
  const calculateNodeSizeByBalance = useCallback(
    (chainLabel: string, isEnabled: boolean): number => {
      // Tamaño base igual para todos (no depende de enabled)
      const baseSize = NODE_MIN; // Todos empiezan con el mismo tamaño base
      const maxSize = 50; // Tamaño máximo para nodos con balance alto

      // Si no hay datos de wallet, usar tamaño base
      if (!walletData || !walletData.assetByProtocols?.wallet?.chains) {
        return baseSize;
      }

      // Buscar el balance de esta chain
      const walletChains = walletData.assetByProtocols.wallet.chains;
      let chainBalance = 0;

      // Buscar por nombre de chain (el label debe coincidir con el name en el balance)
      for (const [key, chain] of Object.entries(walletChains)) {
        if (chain.name === chainLabel) {
          // El balance está en chain.value (string)
          const balanceValue = parseFloat(chain.value || "0");
          chainBalance = isNaN(balanceValue) ? 0 : balanceValue;
          break;
        }
      }
      
      // Log si no se encuentra el balance
      if (chainBalance === 0 && Object.keys(walletChains).length > 0) {
        console.log(`⚠️ No se encontró balance para chain: ${chainLabel}`);
        console.log(`📋 Chains disponibles:`, Object.values(walletChains).map(c => c.name));
      }

      // Si no hay balance, usar tamaño base mínimo
      if (chainBalance === 0) {
        return baseSize;
      }

      // Calcular el balance máximo de todas las chains para normalizar
      const allBalances = Object.values(walletChains).map((c) =>
        parseFloat(c.value || "0")
      );
      const maxBalance = Math.max(...allBalances, 1); // Evitar división por 0

      // Normalizar el balance (0 a 1)
      const normalizedBalance = chainBalance / maxBalance;

      // Calcular tamaño: baseSize + (normalizedBalance * (maxSize - baseSize))
      // El tamaño depende SOLO del balance, no del enabled
      const calculatedSize = baseSize + normalizedBalance * (maxSize - baseSize);

      console.log(`💰 Chain: ${chainLabel}, Balance: ${chainBalance}, Normalized: ${normalizedBalance.toFixed(2)}, Size: ${calculatedSize.toFixed(1)}`);

      return Math.max(baseSize, Math.min(maxSize, calculatedSize));
    },
    [walletData]
  );

  const addOrResetChainNodesAtCenter = useCallback(() => {
    console.log("📍 addOrResetChainNodesAtCenter ejecutándose...");
    const graph = sigma.getGraph();
    const { x: cx, y: cy } = graph.getNodeAttributes(CENTER_ID);

    // Separar chains en dos grupos: conectadas al centro y flotantes
    const connectedChains = chains.filter((chain) => chain.network);
    const floatingChains = chains.filter((chain) => !chain.network);

    // Barajar aleatoriamente las chains conectadas para posiciones aleatorias en cada carga
    const data = [...connectedChains];
    // Fisher-Yates shuffle
    for (let i = data.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [data[i], data[j]] = [data[j], data[i]];
    }

    // Distribuir chains conectadas en múltiples anillos concéntricos
    const ringsCount = 3; // 3 anillos alrededor del centro
    const nodesPerRing = Math.ceil(data.length / ringsCount);

    data.forEach((chain, index) => {
      const id = `chain-${chain.id}`;

      // Determinar en qué anillo estará este nodo
      const ringIndex = Math.floor(index / nodesPerRing);
      const posInRing = index % nodesPerRing;
      const totalInRing = Math.min(
        nodesPerRing,
        data.length - ringIndex * nodesPerRing
      );

      // Calcular ángulo base para este nodo en su anillo
      let angle = (posInRing / totalInRing) * Math.PI * 2;

      // Offset angular para cada anillo: los anillos exteriores se desplazan
      // para llenar los espacios vacíos del anillo anterior
      const angleOffset = (Math.PI / totalInRing) * ringIndex;
      angle += angleOffset;

      // Radio varía según el anillo (0.6, 0.8, 1.0 del radio base)
      const radiusMultiplier = 0.6 + ringIndex * 0.2;

      // Calcular tamaño basado en balance del wallet
      const nodeSize = calculateNodeSizeByBalance(chain.label, chain.enabled);

      if (!graph.hasNode(id)) {
        graph.addNode(id, {
          x: cx,
          y: cy,
          size: nodeSize,
          label: chain.label,
          type: "image",
          image: chain.logo,
          color: BG_NODE,
          angle,
          radiusMultiplier,
          isFloating: false, // Explícitamente marcar como NO flotante
          zIndex: 1,
        });
      } else {
        // si ya existe, lo llevamos al centro y reseteamos tamaño para reanimar
        graph.setNodeAttribute(id, "x", cx);
        graph.setNodeAttribute(id, "y", cy);
        graph.setNodeAttribute(id, "size", nodeSize);
        graph.setNodeAttribute(id, "angle", angle);
        graph.setNodeAttribute(id, "radiusMultiplier", radiusMultiplier);
        graph.setNodeAttribute(id, "isFloating", false); // Asegurar que sea NO flotante
        // Asegurar que el logo y tipo se mantengan
        graph.setNodeAttribute(id, "type", "image");
        graph.setNodeAttribute(id, "image", chain.logo);
        graph.setNodeAttribute(id, "label", chain.label);
      }

      // edge radial único (recto por defecto) - solo para chains conectadas
      if (!graph.hasEdge(CENTER_ID, id)) {
        // Verificar si esta chain está seleccionada
        const nodeColors = selectedChainsRef.current.get(id);
        const hasColors = nodeColors && nodeColors.size > 0;
        let edgeColor = EDGE_COLOR;

        if (hasColors) {
          const colorsArray = Array.from(nodeColors);
          edgeColor = createRainbowGradient(colorsArray);
        }

        graph.addEdge(CENTER_ID, id, {
          color: edgeColor,
          size: hasColors ? 2 : 1,
        });
      }
    });

    // Crear nodos flotantes para chains sin network: true
    // Calcular radio que se adapte al viewport para aprovechar mejor el espacio
    const el = sigma.getContainer() as HTMLElement;
    const { width, height } = el.getBoundingClientRect();
    const maxRadius = Math.min(width, height) * 0.45; // 45% del viewport más pequeño
    const baseRadius = getRadius();
    const floatingRadius = Math.min(maxRadius, baseRadius * 2.0); // Radio más grande
    floatingChains.forEach((chain, index) => {
      const id = `chain-${chain.id}`;

      // Calcular posición orbital inicial
      const angle = (index / floatingChains.length) * Math.PI * 2;
      const x = cx + floatingRadius * Math.cos(angle);
      const y = cy + floatingRadius * Math.sin(angle);

      // Calcular tamaño basado en balance del wallet para nodos flotantes
      const nodeSize = calculateNodeSizeByBalance(chain.label, chain.enabled);

      if (!graph.hasNode(id)) {
        graph.addNode(id, {
          x,
          y,
          size: nodeSize,
          label: chain.label,
          type: "image",
          image: chain.logo,
          color: BG_NODE,
          isFloating: true,
          orbitAngle: angle,
          orbitRadius: floatingRadius,
          zIndex: 0, // Detrás de los nodos conectados
        });
      } else {
        // Resetear posición orbital
        graph.setNodeAttribute(id, "x", x);
        graph.setNodeAttribute(id, "y", y);
        graph.setNodeAttribute(id, "size", nodeSize);
        graph.setNodeAttribute(id, "isFloating", true);
        graph.setNodeAttribute(id, "orbitAngle", angle);
        graph.setNodeAttribute(id, "orbitRadius", floatingRadius);
        // Asegurar que el logo y tipo se mantengan
        graph.setNodeAttribute(id, "type", "image");
        graph.setNodeAttribute(id, "image", chain.logo);
        graph.setNodeAttribute(id, "label", chain.label);
      }

      // NO crear edge para nodos flotantes
    });
  }, [sigma, getRadius, calculateNodeSizeByBalance]);

  // Actualizar refs cada vez que las funciones cambien
  useEffect(() => {
    addOrResetChainNodesAtCenterRef.current = addOrResetChainNodesAtCenter;
  }, [addOrResetChainNodesAtCenter]);

  // 2) Animación de cierre invertido para la apertura
  const animateInvertedClose = useCallback(
    (duration = 1200) => {
      const graph = sigma.getGraph();
      const { x: cx, y: cy } = graph.getNodeAttributes(CENTER_ID);
      const baseRadius = getRadius();
      const startAt = performance.now();

      const frame = (now: number) => {
        const t = Math.min(1, (now - startAt) / duration);

        // Efecto de cierre invertido con múltiples fases
        let p;
        if (t < 0.3) {
          // Fase 1: Cierre inicial muy rápido
          p = easeInCubic(t / 0.3) * 0.2;
        } else if (t < 0.7) {
          // Fase 2: Aceleración dramática
          p = 0.2 + easeInCubic((t - 0.3) / 0.4) * 0.6;
        } else {
          // Fase 3: Ajuste final suave
          p = 0.8 + easeInCubic((t - 0.7) / 0.3) * 0.2;
        }

        chains.forEach((chain) => {
          const id = `chain-${chain.id}`;
          if (!graph.hasNode(id)) return;

          const isFloating = graph.getNodeAttribute(
            id,
            "isFloating"
          ) as boolean;

          if (isFloating) {
            // Para nodos flotantes, cierre hacia el centro
            const orbitAngle = graph.getNodeAttribute(
              id,
              "orbitAngle"
            ) as number;
            const orbitRadius = graph.getNodeAttribute(
              id,
              "orbitRadius"
            ) as number;

            // Efecto de cierre con rebote inverso
            const closeFactor = Math.sin(t * Math.PI) * 0.3 + 1;
            const currentRadius = orbitRadius * (1 - p) * closeFactor;
            const x = cx + currentRadius * Math.cos(orbitAngle);
            const y = cy + currentRadius * Math.sin(orbitAngle);
            graph.setNodeAttribute(id, "x", x);
            graph.setNodeAttribute(id, "y", y);

            // Tamaño con efecto de pulso durante el cierre (basado en balance)
            const baseSize = calculateNodeSizeByBalance(chain.label, chain.enabled);
            const pulseSize = baseSize * (1 + Math.sin(t * Math.PI * 4) * 0.2);
            graph.setNodeAttribute(id, "size", pulseSize);
          } else {
            // Para nodos conectados, cierre hacia el centro
            const angle = graph.getNodeAttribute(id, "angle") as number;
            const radiusMultiplier = graph.getNodeAttribute(
              id,
              "radiusMultiplier"
            ) as number;
            const R = baseRadius * radiusMultiplier;

            // Efecto de cierre con rebote inverso y dispersión aleatoria
            const closeFactor = Math.sin(t * Math.PI) * 0.4 + 1;
            const randomOffset = (Math.random() - 0.5) * 20 * t; // Dispersión que aumenta
            const currentRadius = R * (1 - p) * closeFactor;

            const fx = cx + currentRadius * Math.cos(angle) + randomOffset;
            const fy = cy + currentRadius * Math.sin(angle) + randomOffset;
            graph.setNodeAttribute(id, "x", fx);
            graph.setNodeAttribute(id, "y", fy);

            // Tamaño con efecto de pulso (basado en balance)
            const baseSize = calculateNodeSizeByBalance(chain.label, chain.enabled);
            const pulseSize = baseSize * (1 + Math.sin(t * Math.PI * 3) * 0.3);
            graph.setNodeAttribute(id, "size", pulseSize);
          }
        });

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          // Ajuste final a posiciones exactas (todos en el centro)
          chains.forEach((chain) => {
            const id = `chain-${chain.id}`;
            if (!graph.hasNode(id)) return;

            // Todos los nodos terminan en el centro (tamaño basado en balance)
            graph.setNodeAttribute(id, "x", cx);
            graph.setNodeAttribute(id, "y", cy);
            const nodeSize = calculateNodeSizeByBalance(chain.label, chain.enabled);
            graph.setNodeAttribute(id, "size", nodeSize);
          });
        }
      };

      requestAnimationFrame(frame);
    },
    [sigma, getRadius]
  );

  // Actualizar ref
  useEffect(() => {
    animateInvertedCloseRef.current = animateInvertedClose;
  }, [animateInvertedClose]);

  const animateBigBangCollapse = useCallback(
    (duration = 1200) => {
      const graph = sigma.getGraph();
      const { x: cx, y: cy } = graph.getNodeAttributes(CENTER_ID);

      // Activar flag de colapso para detener flotación
      isCollapsingRef.current = true;

      const startAt = performance.now();

      // Guardar posiciones INICIALES de TODOS los nodos antes de animar
      const initialPositions = new Map<
        string,
        { x: number; y: number; size: number }
      >();
      chains.forEach((chain) => {
        const id = `chain-${chain.id}`;
        if (graph.hasNode(id)) {
          initialPositions.set(id, {
            x: graph.getNodeAttribute(id, "x") as number,
            y: graph.getNodeAttribute(id, "y") as number,
            size: graph.getNodeAttribute(id, "size") as number,
          });
        }
      });

      const frame = (now: number) => {
        const t = Math.min(1, (now - startAt) / duration);

        // Efecto de implosión con múltiples fases (inverso del Big Bang)
        let p;
        if (t < 0.3) {
          // Fase 1: Implosión inicial muy rápida
          p = 1 - easeOutCubic(t / 0.3) * 0.2; // De 100% a 80%
        } else if (t < 0.7) {
          // Fase 2: Aceleración dramática hacia el centro
          p = 0.8 - easeOutCubic((t - 0.3) / 0.4) * 0.6; // De 80% a 20%
        } else {
          // Fase 3: Colapso final súbito
          p = 0.2 - easeOutCubic((t - 0.7) / 0.3) * 0.2; // De 20% a 0%
        }

        // Animar TODOS los nodos desde su posición inicial hacia el centro
        chains.forEach((chain) => {
          const id = `chain-${chain.id}`;
          if (!graph.hasNode(id)) return;

          const initial = initialPositions.get(id);
          if (!initial) return;

          const isFloating = graph.getNodeAttribute(
            id,
            "isFloating"
          ) as boolean;

          if (isFloating) {
            // Para nodos flotantes, implosión hacia el centro
            const orbitAngle = graph.getNodeAttribute(
              id,
              "orbitAngle"
            ) as number;
            const orbitRadius = graph.getNodeAttribute(
              id,
              "orbitRadius"
            ) as number;

            // Efecto de implosión con rebote inverso
            const implosionFactor = Math.sin((1 - t) * Math.PI) * 0.3 + 1;
            const currentRadius = orbitRadius * p * implosionFactor;
            const x = cx + currentRadius * Math.cos(orbitAngle);
            const y = cy + currentRadius * Math.sin(orbitAngle);
            graph.setNodeAttribute(id, "x", x);
            graph.setNodeAttribute(id, "y", y);

            // Tamaño con efecto de pulso durante la implosión (basado en balance)
            const baseSize = calculateNodeSizeByBalance(chain.label, chain.enabled);
            const pulseSize =
              baseSize * (1 + Math.sin((1 - t) * Math.PI * 4) * 0.2);
            graph.setNodeAttribute(id, "size", pulseSize);
          } else {
            // Para nodos conectados, implosión hacia el centro
            const angle = graph.getNodeAttribute(id, "angle") as number;
            const radiusMultiplier = graph.getNodeAttribute(
              id,
              "radiusMultiplier"
            ) as number;
            const baseRadius = getRadius();
            const R = baseRadius * radiusMultiplier;

            // Efecto de implosión con rebote y dispersión aleatoria inversa
            const implosionFactor = Math.sin((1 - t) * Math.PI) * 0.4 + 1;
            const randomOffset = (Math.random() - 0.5) * 20 * t; // Dispersión que aumenta hacia el final
            const currentRadius = R * p * implosionFactor;

            const fx = cx + currentRadius * Math.cos(angle) + randomOffset;
            const fy = cy + currentRadius * Math.sin(angle) + randomOffset;
            graph.setNodeAttribute(id, "x", fx);
            graph.setNodeAttribute(id, "y", fy);

            // Tamaño con efecto de pulso (basado en balance)
            const baseSize = calculateNodeSizeByBalance(chain.label, chain.enabled);
            const pulseSize =
              baseSize * (1 + Math.sin((1 - t) * Math.PI * 3) * 0.3);
            graph.setNodeAttribute(id, "size", pulseSize);
          }
        });

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          // Eliminar todos los nodos de chains al final
          chains.forEach((chain) => {
            const id = `chain-${chain.id}`;
            if (graph.hasNode(id)) {
              graph.dropNode(id);
            }
          });

          // Limpiar referencias
          selectedChainsRef.current.clear();
          pairsRef.current.clear();
          pendingNodeRef.current = null;
          nextColorIndexRef.current = 0;

          // Reactivar flotación del nodo central
          isCollapsingRef.current = false;
        }
      };

      requestAnimationFrame(frame);
    },
    [sigma, getRadius]
  );

  // Actualizar ref
  useEffect(() => {
    animateBigBangCollapseRef.current = animateBigBangCollapse;
  }, [animateBigBangCollapse]);

  // Exponer la función de colapso al contexto
  useEffect(() => {
    const handleCollapse = () => {
      expandedRef.current = false;
      animateBigBangCollapse();
    };
    setCollapseGraph(() => handleCollapse);
    return () => setCollapseGraph(null);
  }, [animateBigBangCollapse, setCollapseGraph]);

  // Exponer la función de expansión al contexto
  useEffect(() => {
    const handleExpand = () => {
      if (!imagesLoadedRef.current) {
        console.log("⚠️ Images still loading, cannot expand graph...");
        return;
      }
      
      if (expandedRef.current) {
        console.log("Graph already expanded");
        return;
      }

      console.log("📤 Expandiendo grafo desde contexto...");
      isCollapsingRef.current = false; // Asegurar que el flag esté desactivado al expandir

      // Resetear posición del nodo central a (0, 0)
      const graph = sigma.getGraph();
      graph.setNodeAttribute(CENTER_ID, "x", 0);
      graph.setNodeAttribute(CENTER_ID, "y", 0);

      // Usar refs para llamar las funciones
      addOrResetChainNodesAtCenterRef.current?.();
      animateInvertedCloseRef.current?.(); // Usar efecto de cierre invertido para la apertura
      expandedRef.current = true;
      setExpansionKey((k) => k + 1); // Reiniciar flotación
      console.log("✅ Grafo expandido desde contexto");
    };
    setExpandGraph(() => handleExpand);
    return () => setExpandGraph(null);
  }, [sigma, setExpandGraph]);

  // 2) El grafo empieza colapsado (solo LayerZero visible)
  // Los nodos se expandirán cuando el usuario haga click en LayerZero

  // Flotación orbital sutil (como planetas)
  useEffect(() => {
    // Solo iniciar si el grafo está expandido
    if (!expandedRef.current) return;

    let rafId: number | null = null;

    // Iniciar inmediatamente al hacer click en el centro
    const initTimer = setTimeout(() => {
      const graph = sigma.getGraph();
      const startTime = performance.now();
      const { x: cx, y: cy } = graph.getNodeAttributes(CENTER_ID);
      const baseRadius = getRadius();

      // Parámetros orbitales únicos por chain
      const orbits = new Map<
        string,
        {
          baseX: number;
          baseY: number;
          phaseX: number;
          phaseY: number;
          speedX: number;
          speedY: number;
          ampX: number;
          ampY: number;
        }
      >();

      // Generar parámetros orbitales únicos para cada chain
      chains.forEach((chain) => {
        const id = `chain-${chain.id}`;
        if (graph.hasNode(id)) {
          orbits.set(id, {
            baseX: 0, // No se usa, se calcula dinámicamente
            baseY: 0, // No se usa, se calcula dinámicamente
            phaseX: Math.random() * Math.PI * 2,
            phaseY: Math.random() * Math.PI * 2,
            speedX: 0.2 + Math.random() * 0.25, // 0.2-0.45 (más sutil)
            speedY: 0.15 + Math.random() * 0.2, // 0.15-0.35
            ampX: 3 + Math.random() * 5, // Amplitud 3-8px
            ampY: 3 + Math.random() * 5,
          });
        }
      });

      const animate = (currentTime: number) => {
        // Detener flotación si estamos colapsando o no está expandido
        if (isCollapsingRef.current || !expandedRef.current) {
          return;
        }

        const t = (currentTime - startTime) / 1000;

        chains.forEach((chain) => {
          const id = `chain-${chain.id}`;
          // Si está seleccionado, no flotar
          if (!graph.hasNode(id)) return;
          const nodeColors = selectedChainsRef.current.get(id);
          if (nodeColors && nodeColors.size > 0) return;

          const orbit = orbits.get(id);
          if (!orbit) return;

          const isFloating = graph.getNodeAttribute(
            id,
            "isFloating"
          ) as boolean;

          if (isFloating) {
            // Para nodos flotantes, actualizar su ángulo orbital y posición
            const currentAngle = graph.getNodeAttribute(
              id,
              "orbitAngle"
            ) as number;
            const orbitRadius = graph.getNodeAttribute(
              id,
              "orbitRadius"
            ) as number;

            // Rotación orbital muy lenta para nodos flotantes (0.005 es muy lento)
            const newAngle = currentAngle + orbit.speedX * 0.005; // Rotación muy lenta
            graph.setNodeAttribute(id, "orbitAngle", newAngle);

            // Calcular nueva posición orbital
            const targetX = cx + orbitRadius * Math.cos(newAngle);
            const targetY = cy + orbitRadius * Math.sin(newAngle);

            // Flotación orbital sutil - mismo movimiento aleatorio que nodos conectados
            const dx = Math.sin(t * orbit.speedX + orbit.phaseX) * orbit.ampX;
            const dy = Math.cos(t * orbit.speedY + orbit.phaseY) * orbit.ampY;

            graph.setNodeAttribute(id, "x", targetX + dx);
            graph.setNodeAttribute(id, "y", targetY + dy);
          } else {
            // Para nodos conectados, flotación normal
            // Calcular posición objetivo final en cada frame
            const angle = graph.getNodeAttribute(id, "angle") as number;
            const radiusMultiplier = graph.getNodeAttribute(
              id,
              "radiusMultiplier"
            ) as number;
            const R = baseRadius * radiusMultiplier;
            const targetX = cx + R * Math.cos(angle);
            const targetY = cy + R * Math.sin(angle);

            // Flotación orbital sutil (se suma a la posición objetivo)
            const dx = Math.sin(t * orbit.speedX + orbit.phaseX) * orbit.ampX;
            const dy = Math.cos(t * orbit.speedY + orbit.phaseY) * orbit.ampY;

            graph.setNodeAttribute(id, "x", targetX + dx);
            graph.setNodeAttribute(id, "y", targetY + dy);
          }
        });

        rafId = requestAnimationFrame(animate);
      };

      rafId = requestAnimationFrame(animate);
    }, 0); // Iniciar inmediatamente

    return () => {
      clearTimeout(initTimer);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [sigma, expansionKey, getRadius]); // Reiniciar cuando expansionKey cambia

  // Órbita del nodo central de LayerZero cuando está colapsado
  useEffect(() => {
    let rafId: number | null = null;
    let orbitAngle = 0; // Ángulo inicial de la órbita
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const graph = sigma.getGraph();

      // Solo animar si las imágenes están cargadas, el grafo está colapsado y no estamos en proceso de colapso
      if (
        !imagesLoadedRef.current ||
        expandedRef.current ||
        isCollapsingRef.current
      ) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      if (!graph.hasNode(CENTER_ID)) {
        rafId = requestAnimationFrame(animate);
        return;
      }

      const t = (currentTime - startTime) / 1000;

      // Parámetros de órbita espacial
      const orbitRadius = 100; // Radio de la órbita grande (aumentado)
      const orbitSpeed = 0.2; // Velocidad de rotación orbital

      // Actualizar ángulo orbital
      orbitAngle = t * orbitSpeed;

      // Posición orbital base
      const baseX = Math.cos(orbitAngle) * orbitRadius;
      const baseY = Math.sin(orbitAngle) * orbitRadius;

      // Añadir flotación sutil sobre la órbita (movimiento secundario)
      const floatX = Math.sin(t * 0.4) * 10;
      const floatY = Math.cos(t * 0.3) * 10;

      // Posición final combinando órbita + flotación
      const finalX = baseX + floatX;
      const finalY = baseY + floatY;

      graph.setNodeAttribute(CENTER_ID, "x", finalX);
      graph.setNodeAttribute(CENTER_ID, "y", finalY);

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [sigma]);

  // Animación de click en chain - manejo de parejas
  const animateChainClick = useCallback(
    (nodeId: string) => {
      console.log("=== INICIO animateChainClick ===");
      console.log("nodeId clickeado:", nodeId);

      const graph = sigma.getGraph();

      // Verificar si es un nodo flotante - no permitir interacción
      const isFloating = graph.getNodeAttribute(
        nodeId,
        "isFloating"
      ) as boolean;
      console.log("isFloating:", isFloating);

      if (isFloating) {
        console.log("Nodo flotante - no se permite interacción");
        return; // No hacer nada con nodos flotantes
      }

      const originalX = graph.getNodeAttribute(nodeId, "x") as number;
      const originalY = graph.getNodeAttribute(nodeId, "y") as number;
      const originalSize = graph.getNodeAttribute(nodeId, "size") as number;
      console.log("Posición original:", {
        x: originalX,
        y: originalY,
        size: originalSize,
      });

      const nodeColors = selectedChainsRef.current.get(nodeId);
      const isAlreadySelected = nodeColors && nodeColors.size > 0;
      const pendingNode = pendingNodeRef.current;

      console.log("Estado actual:");
      console.log("- nodeColors:", nodeColors);
      console.log("- isAlreadySelected:", isAlreadySelected);
      console.log("- pendingNode:", pendingNode);
      console.log(
        "- selectedChainsRef:",
        Array.from(selectedChainsRef.current.entries())
      );
      console.log("- pairsRef:", Array.from(pairsRef.current.entries()));

      // Variable para controlar si se debe ejecutar la animación
      let shouldAnimate = true;

      // Si hay un nodo pendiente
      if (pendingNode && pendingNode !== nodeId) {
        console.log(
          "CASO 1: Hay nodo pendiente y es diferente - Formar pareja"
        );
        const color =
          PAIR_COLORS[nextColorIndexRef.current % PAIR_COLORS.length];
        console.log("Color asignado:", color);
        nextColorIndexRef.current++;

        // Si el nodo clickeado ya está seleccionado, agregar nuevo color (arcoíris)
        if (isAlreadySelected) {
          console.log(
            "El nodo clickeado ya estaba seleccionado - agregar color arcoíris"
          );
          // Agregar el nuevo color a los colores existentes
          nodeColors!.add(color);
          // El nodo pendiente también recibe el color
          let pendingColors = selectedChainsRef.current.get(pendingNode);
          if (!pendingColors) {
            pendingColors = new Set();
            selectedChainsRef.current.set(pendingNode, pendingColors);
          }
          pendingColors.add(color);
        } else {
          console.log("Crear pareja normal - ambos nodos no seleccionados");
          // Ambos nodos no seleccionados, crear pareja normal
          // Remover color temporal del nodo pendiente si tenía
          let pendingColors = selectedChainsRef.current.get(pendingNode);
          if (!pendingColors) {
            pendingColors = new Set();
            selectedChainsRef.current.set(pendingNode, pendingColors);
          }
          pendingColors.clear(); // Limpiar color temporal
          pendingColors.add(color);

          // Agregar color al nodo clickeado
          const newNodeColors = new Set<string>();
          newNodeColors.add(color);
          selectedChainsRef.current.set(nodeId, newNodeColors);
        }

        // Guardar la pareja: [segundo clickeado (nodeId), primer clickeado (pendingNode)]
        // Luego en syncPairsToContext: primer clickeado → Source, segundo → Destination
        pairsRef.current.set(color, [nodeId, pendingNode]);
        console.log("Pareja guardada:", { color, pair: [nodeId, pendingNode] });

        // Limpiar nodo pendiente
        pendingNodeRef.current = null;

        // Propagar colores a todos los nodos relacionados (ambos nodos)
        console.log("Propagando colores...");
        propagateColorsToConnectedNodes(pendingNode);
        propagateColorsToConnectedNodes(nodeId);

        // Actualizar colores
        console.log("Actualizando colores de edges...");
        updateEdgeColors();
      } else if (pendingNode && pendingNode === nodeId) {
        console.log("CASO 2: Click en el mismo nodo pendiente - Deseleccionar");
        // Click en el mismo nodo que está pendiente - deseleccionar
        pendingNodeRef.current = null;
        selectedChainsRef.current.delete(nodeId);
        updateEdgeColors();
        // No animar si estamos deseleccionando
        shouldAnimate = false;
      } else if (!isAlreadySelected) {
        console.log(
          "CASO 3: No hay nodo pendiente y este nodo no está seleccionado - Marcar como pendiente"
        );
        // No hay nodo pendiente y este nodo no está seleccionado
        // Este queda pendiente
        pendingNodeRef.current = nodeId;
        const newNodeColors = new Set<string>();
        newNodeColors.add(PAIR_COLORS[0]); // Color temporal amarillo
        selectedChainsRef.current.set(nodeId, newNodeColors);
        console.log("Nodo marcado como pendiente con color temporal");
        updateEdgeColors();
      } else {
        console.log(
          "CASO 4: Nodo ya seleccionado pero no hay pendiente - No hacer nada"
        );
        // Nodo ya seleccionado pero no hay pendiente
        // No hacer nada en este caso
        shouldAnimate = false;
      }

      // Solo ejecutar animación si se debe animar
      console.log("shouldAnimate:", shouldAnimate);
      if (!shouldAnimate) {
        console.log("=== FIN animateChainClick (sin animación) ===");
        return;
      }

      // Obtener el edge de esta chain y el color para la animación
      console.log("Obteniendo edge para animación...");
      const edgeId = graph.edge(CENTER_ID, nodeId);
      console.log("edgeId:", edgeId);
      if (!edgeId) {
        console.error(`❌ No edge found for node ${nodeId}`);
        return;
      }

      const finalNodeColors = selectedChainsRef.current.get(nodeId);
      const colorsArray = finalNodeColors
        ? Array.from(finalNodeColors)
        : [PAIR_COLORS[0]];
      const nodeColor = createRainbowGradient(colorsArray);
      console.log("Color final para animación:", nodeColor);

      // Guardar posiciones originales de TODAS las chains para el temblor y sus edges
      const otherChainsData = chains
        .map((chain) => {
          const id = `chain-${chain.id}`;
          if (id !== nodeId && graph.hasNode(id)) {
            const chainEdgeId = graph.edge(CENTER_ID, id);
            return {
              id,
              x: graph.getNodeAttribute(id, "x") as number,
              y: graph.getNodeAttribute(id, "y") as number,
              edgeId: chainEdgeId,
            };
          }
          return null;
        })
        .filter(Boolean) as Array<{
        id: string;
        x: number;
        y: number;
        edgeId: string;
      }>;

      console.log("Iniciando animación...");
      const duration = 1000; // Duración total de la animación
      const pulseCount = 3; // Número de parpadeos
      const startAt = performance.now();

      const frame = (now: number) => {
        const t = Math.min(1, (now - startAt) / duration);

        if (t === 0) {
          console.log("Frame inicial de animación");
        }

        // Efecto de parpadeo (iluminación que se prende y apaga)
        const pulseT = Math.sin(t * Math.PI * pulseCount * 2);
        const brightness = 0.5 + pulseT * 0.5; // Entre 0.5 y 1

        // Color brillante para la línea usando el color de la pareja
        // Convertir rgba a rgb y ajustar opacidad
        const baseColor = nodeColor || PAIR_COLORS[0];
        // Extraer valores RGB del color
        const rgbMatch = baseColor.match(/\d+/g);
        if (rgbMatch && rgbMatch.length >= 3) {
          const r = rgbMatch[0];
          const g = rgbMatch[1];
          const b = rgbMatch[2];
          const edgeColor = `rgba(${r}, ${g}, ${b}, ${brightness})`;
          graph.setEdgeAttribute(edgeId, "color", edgeColor);
          graph.setEdgeAttribute(edgeId, "size", 2 + brightness * 2);
        }

        // CURVAR la línea principal durante la animación
        const curvature = Math.sin(t * Math.PI) * 0.5; // Curva que crece y decrece durante la animación
        graph.setEdgeAttribute(edgeId, "type", "curve");
        graph.setEdgeAttribute(edgeId, "curvature", curvature);

        // Pequeña vibración durante la animación (sin moverse al centro)
        const shake = Math.sin(t * Math.PI * 6) * 2 * (1 - t);

        graph.setNodeAttribute(nodeId, "x", originalX + shake);
        graph.setNodeAttribute(nodeId, "y", originalY + shake * 0.5);
        graph.setNodeAttribute(nodeId, "size", originalSize);

        // TEMBLOR Y CURVAS para las otras chains (más sutil)
        otherChainsData.forEach((chainData) => {
          const tremor = Math.sin(t * Math.PI * 8 + chainData.x) * 2 * (1 - t);
          const tremorX = chainData.x + tremor;
          const tremorY = chainData.y + tremor * 0.7;

          graph.setNodeAttribute(chainData.id, "x", tremorX);
          graph.setNodeAttribute(chainData.id, "y", tremorY);

          // Líneas rectas para las otras chains también
        });

        if (t < 1) {
          requestAnimationFrame(frame);
        } else {
          console.log("Animación completada - restaurando estado final");
          // Chain se queda en su POSICIÓN ORBITAL (quieta, sin flotación)
          graph.setNodeAttribute(nodeId, "x", originalX);
          graph.setNodeAttribute(nodeId, "y", originalY);
          graph.setNodeAttribute(nodeId, "size", originalSize);

          // Línea con color de pareja permanente y RECTA (eliminar curva al final)
          graph.setEdgeAttribute(edgeId, "color", nodeColor);
          graph.setEdgeAttribute(edgeId, "size", 2);
          graph.removeEdgeAttribute(edgeId, "type"); // Asegurar que sea recta
          graph.removeEdgeAttribute(edgeId, "curvature"); // Eliminar curvatura

          // Restaurar posiciones y líneas de las otras chains
          otherChainsData.forEach((chainData) => {
            graph.setNodeAttribute(chainData.id, "x", chainData.x);
            graph.setNodeAttribute(chainData.id, "y", chainData.y);
          });

          console.log("=== FIN animateChainClick (con animación) ===");
        }
      };

      requestAnimationFrame(frame);
    },
    [sigma, updateEdgeColors, propagateColorsToConnectedNodes]
  );

  // Actualizar ref
  useEffect(() => {
    animateChainClickRef.current = animateChainClick;
  }, [animateChainClick]);

  // Listener para clicks desde la tabla de balances
  useEffect(() => {
    const handleChainClickFromTable = (event: Event) => {
      const customEvent = event as CustomEvent<{ nodeId: string; chain: any }>;
      const { nodeId } = customEvent.detail;
      
      console.log("📋 Click desde tabla recibido, nodeId:", nodeId);
      
      if (!imagesLoadedRef.current) {
        console.log("⚠️ Images still loading, please wait...");
        return;
      }

      try {
        animateChainClickRef.current?.(nodeId);
      } catch (error) {
        console.error("❌ ERROR en animateChainClick desde tabla:", error);
      }
    };

    window.addEventListener("chainClickFromTable", handleChainClickFromTable);

    return () => {
      window.removeEventListener("chainClickFromTable", handleChainClickFromTable);
    };
  }, []);

  // 3) Interacciones
  // IMPORTANTE: Este useEffect solo debe ejecutarse UNA VEZ al montar el componente
  // Usamos refs para las funciones para evitar re-registro de eventos
  useEffect(() => {
    // Prevenir registro múltiple
    if (eventsRegisteredRef.current && unregisterFnRef.current) {
      console.log(
        "⚠️ Event handlers ya están registrados, saltando re-registro..."
      );
      // No hay cleanup porque los eventos ya están registrados y funcionando
      return;
    }

    console.log("🔧 Registrando event handlers (SOLO UNA VEZ)...");
    eventsRegisteredRef.current = true;

    const unregister = registerEvents({
      clickNode: (e) => {
        console.log("\n🖱️ === CLICK EN NODO ===");
        console.log("Nodo clickeado:", e.node);
        console.log("imagesLoadedRef.current:", imagesLoadedRef.current);
        console.log("expandedRef.current:", expandedRef.current);

        // Si es el nodo central, expandir/colapsar (solo si las imágenes están cargadas)
        if (e.node === CENTER_ID) {
          console.log("Click en nodo central (LayerZero)");
          if (!imagesLoadedRef.current) {
            console.log("⚠️ Images still loading, please wait...");
            return;
          }

          if (!expandedRef.current) {
            console.log("📤 Expandiendo grafo...");
            isCollapsingRef.current = false; // Asegurar que el flag esté desactivado al expandir

            // Resetear posición del nodo central a (0, 0)
            const graph = sigma.getGraph();
            graph.setNodeAttribute(CENTER_ID, "x", 0);
            graph.setNodeAttribute(CENTER_ID, "y", 0);

            // Usar refs para llamar las funciones
            addOrResetChainNodesAtCenterRef.current?.();
            animateInvertedCloseRef.current?.(); // Usar efecto de cierre invertido para la apertura
            expandedRef.current = true;
            setExpansionKey((k) => k + 1); // Reiniciar flotación
            console.log("✅ Grafo expandido");
          } else {
            console.log("📥 Colapsando grafo...");
            animateBigBangCollapseRef.current?.(); // Usar efecto Big Bang para la contracción
            expandedRef.current = false;
            console.log("✅ Grafo colapsado");
          }
        } else {
          console.log("Click en chain node");
          // Si es una chain, animar (solo si las imágenes están cargadas)
          if (!imagesLoadedRef.current) {
            console.log("⚠️ Images still loading, please wait...");
            return;
          }

          try {
            animateChainClickRef.current?.(e.node);
          } catch (error) {
            console.error("❌ ERROR en animateChainClick:", error);
            console.error(
              "Stack trace:",
              error instanceof Error ? error.stack : "No stack trace"
            );
          }
        }
        console.log("=== FIN CLICK EN NODO ===\n");
      },
      // opcional: recentrar cámara al hacer doble click en el centro
      doubleClickNode: (e) => {
        if (e.node !== CENTER_ID) return;
        sigma.getCamera().animate({ x: 0, y: 0, ratio: 1 }, { duration: 300 });
      },
      // Hover en edges para iluminar agujeros de gusano
      enterEdge: (e) => {
        const graph = sigma.getGraph();
        const edgeId = e.edge;

        // Verificar si es una edge crosschain con agujero de gusano
        if (graph.getEdgeAttribute(edgeId, "wormhole")) {
          highlightWormholeHoverRef.current?.(edgeId);
        }
      },
      leaveEdge: (e) => {
        const graph = sigma.getGraph();
        const edgeId = e.edge;

        // Verificar si es una edge crosschain con agujero de gusano
        if (graph.getEdgeAttribute(edgeId, "wormhole")) {
          restoreWormholeHoverRef.current?.(edgeId);
        }
      },
    });

    // Guardar la función de unregister en el ref
    unregisterFnRef.current = unregister as unknown as () => void;

    // cleanup - solo se ejecuta cuando el componente se desmonta
    return () => {
      console.log("🧹 Limpiando event handlers (componente desmontándose)...");
      if (unregisterFnRef.current) {
        unregisterFnRef.current();
        unregisterFnRef.current = null;
      }
      eventsRegisteredRef.current = false;
    };
  }, [
    registerEvents,
    sigma,
    // NO incluir las funciones aquí - usamos refs en su lugar
    // Esto evita re-registro de eventos cuando las funciones cambian
  ]);

  return null;
}
