import { useMemo } from "react";
import { ResponsiveSankey } from "@nivo/sankey";
import type { SankeyNodeDatum, CustomSankeyLayerProps } from "@nivo/sankey";
import { usePairs } from "./context";
import BalanceTable from "./BalanceTable";

type NodeData = { id: string; label: string; logo?: string };
type LinkData = {
  source: string;
  target: string;
  value: number;
  color: string;
  id: string;
};

// Layer para agregar labels "Source" y "Destination" debajo de las columnas
const ColumnLabels = (props: CustomSankeyLayerProps<NodeData, LinkData>) => {
  const { nodes } = props;
  if (nodes.length === 0) return null;

  // Separar nodos por posición X
  // INVERTIDO: destinations están en la izquierda (x menor) y sources en la derecha (x mayor)
  const nodesWithX = nodes.filter(
    (node) => node.x !== undefined && node.width !== undefined
  );

  if (nodesWithX.length === 0) return null;

  // Encontrar el nodo más a la izquierda y más a la derecha
  const leftmostX = Math.min(...nodesWithX.map((node) => node.x!));
  const rightmostX = Math.max(...nodesWithX.map((node) => node.x!));

  // Los destinations son los que están más cerca del lado izquierdo
  const destinationNodes = nodesWithX.filter(
    (node) => node.x! <= leftmostX + 50 // Tolerancia de 50px para agrupar
  );
  const sourceNodes = nodesWithX.filter(
    (node) =>
      node.x! >= rightmostX - 50 ||
      (typeof node.id === "string" && node.id.includes("-dest"))
  );

  // Calcular el centro X de cada columna
  const destCenterX =
    destinationNodes.length > 0
      ? destinationNodes.reduce(
          (sum, node) => sum + (node.x! + (node.width ?? 0) / 2),
          0
        ) / destinationNodes.length
      : leftmostX;

  const sourceCenterX =
    sourceNodes.length > 0
      ? sourceNodes.reduce(
          (sum, node) => sum + (node.x! + (node.width ?? 0) / 2),
          0
        ) / sourceNodes.length
      : rightmostX;

  // Calcular la posición Y más baja para colocar el label debajo
  const maxY = Math.max(
    ...nodesWithX.map((node) => (node.y ?? 0) + (node.height ?? 0))
  );

  const labelY = maxY + 25; // 25px debajo del último nodo

  return (
    <g>
      <text
        x={destCenterX}
        y={labelY}
        textAnchor="middle"
        fill="#e5e7eb"
        fontSize="14"
        fontWeight="600"
        fontFamily="Arial, sans-serif"
      >
        Destination
      </text>
      <text
        x={sourceCenterX}
        y={labelY}
        textAnchor="middle"
        fill="#e5e7eb"
        fontSize="14"
        fontWeight="600"
        fontFamily="Arial, sans-serif"
      >
        Source
      </text>
    </g>
  );
};

// Layer personalizado para agregar logos a los nodos
const NodesWithLogos = ({
  nodes,
  logos,
}: {
  nodes: readonly SankeyNodeDatum<NodeData, LinkData>[];
  logos: Map<string, string>;
}) => {
  return (
    <g>
      {nodes.map((node) => {
        const nodeId =
          typeof node.id === "object"
            ? (node.id as { id: string }).id
            : (node.id as string);

        // Manejar nodos con sufijo -dest - buscar primero el ID exacto, luego el base
        const baseId = nodeId.replace("-dest", "");
        const logo = logos.get(nodeId) || logos.get(baseId);

        // Verificar que tengamos un logo y que el nodo tenga dimensiones
        if (!logo) return null;
        if (
          node.x === undefined ||
          node.y === undefined ||
          node.width === undefined ||
          node.height === undefined
        )
          return null;

        const size = 24; // Tamaño del logo
        const centerX = node.x + node.width / 2;
        const centerY = node.y + node.height / 2;
        const x = centerX - size / 2;
        const y = centerY - size / 2;
        const clipId = `logo-clip-${nodeId.replace(/[^a-z0-9]/gi, "-")}`;

        return (
          <g key={nodeId}>
            <defs>
              <clipPath id={clipId}>
                <circle cx={centerX} cy={centerY} r={size / 2} />
              </clipPath>
            </defs>
            <image
              href={logo}
              x={x}
              y={y}
              width={size}
              height={size}
              clipPath={`url(#${clipId})`}
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        );
      })}
    </g>
  );
};

interface CrosschainSelectorProps {
  onChainClick?: (chain: { id: string; label: string; logo?: string }) => void;
  isTransferring?: boolean;
}

export default function CrosschainSelector({
  onChainClick,
  isTransferring = false,
}: CrosschainSelectorProps) {
  const { pairs } = usePairs();


  // Separar sources y destinations
  // pair.sourceId = de donde sale (izquierda en Sankey)
  // pair.destinationId = hacia donde va (derecha en Sankey)
  const sourceSet = useMemo(() => {
    const set = new Set<string>();
    pairs.forEach((pair) => {
      // pair.sourceId va a la izquierda como Source
      set.add(pair.sourceId);
    });
    return set;
  }, [pairs]);

  const destSet = useMemo(() => {
    const set = new Set<string>();
    pairs.forEach((pair) => {
      // pair.destinationId va a la derecha como Destination
      set.add(pair.destinationId);
    });
    return set;
  }, [pairs]);

  // Convertir parejas al formato que Nivo Sankey espera
  const sankeyData = useMemo(() => {
    if (pairs.length === 0) {
      return { nodes: [], links: [] };
    }

    // Recolectar todos los nodos únicos con sus labels y logos
    // CORREGIDO: pair.sourceId = segundo clickeado → Source (izquierda)
    // CORREGIDO: pair.destinationId = primer clickeado → Destination (derecha)
    const nodeMap = new Map<string, string>();
    const logoMap = new Map<string, string>();
    pairs.forEach((pair) => {
      nodeMap.set(pair.sourceId, pair.sourceLabel);
      nodeMap.set(pair.destinationId, pair.destinationLabel);
      if (pair.sourceLogo) logoMap.set(pair.sourceId, pair.sourceLogo);
      if (pair.destinationLogo)
        logoMap.set(pair.destinationId, pair.destinationLogo);
    });

    // Separar destinations visuales (lo que en el par es sourceId)
    // destSet ya está definido arriba como useMemo

    // Crear lista de nodos: TODOS los sources primero (IZQUIERDA), TODOS los destinations después (DERECHA)
    // Nivo Sankey usa los links para determinar posición, pero el orden del array ayuda
    const nodes: Array<{ id: string; label: string; logo?: string }> = [];

    // COLUMNA IZQUIERDA: Todos los nodos que SOLO son sources (no aparecen como destination)
    // Estos van primero en el array
    const onlySources = Array.from(sourceSet).filter((id) => !destSet.has(id));
    onlySources.sort().forEach((id) => {
      nodes.push({
        id,
        label: nodeMap.get(id) || id,
        logo: logoMap.get(id),
      });
    });

    // COLUMNA DERECHA: Todos los nodos que SOLO son destinations (no aparecen como source)
    // Estos van al final del array
    const onlyDestinations = Array.from(destSet).filter(
      (id) => !sourceSet.has(id)
    );
    onlyDestinations.sort().forEach((id) => {
      nodes.push({
        id,
        label: nodeMap.get(id) || id,
        logo: logoMap.get(id),
      });
    });

    // NODOS QUE SON AMBOS: Si un nodo aparece como source y destination, crear dos nodos
    // Uno para source (sin sufijo) y uno para destination (con sufijo -dest)
    const bothSourceAndDest = Array.from(sourceSet).filter((id) =>
      destSet.has(id)
    );
    bothSourceAndDest.sort().forEach((id) => {
      // Nodo para columna izquierda (source)
      nodes.push({
        id,
        label: nodeMap.get(id) || id,
        logo: logoMap.get(id),
      });
      // Nodo para columna derecha (destination) con sufijo
      const destId = `${id}-dest`;
      const baseLabel = nodeMap.get(id) || id;
      const baseLogo = logoMap.get(id);
      nodeMap.set(destId, baseLabel);
      if (baseLogo) {
        logoMap.set(destId, baseLogo);
      }
      nodes.push({
        id: destId,
        label: baseLabel,
        logo: baseLogo,
      });
    });

    // Crear array de links - cada pareja genera un link separado
    // Esto permite múltiples pipes al mismo destino sin pipes intermedios
    // INVERTIR para Sankey: En Sankey, source va a la izquierda y target a la derecha
    // Pero visualmente queremos: Destination (izquierda) → Source (derecha)
    // Por lo tanto: source = pair.destinationId, target = pair.sourceId
    const links = pairs.map((pair, index) => {
      // Para Sankey: source = izquierda, target = derecha
      // Queremos mostrar: DESTINATION (izquierda) → SOURCE (derecha)
      // Por lo tanto invertimos: source = destination, target = source
      
      let sourceIdInSankey = pair.destinationId; // destination va a la IZQUIERDA
      let targetIdInSankey = pair.sourceId; // source va a la DERECHA

      // Si el destination también aparece como source en otra pareja,
      // necesitamos usar el nodo con sufijo -dest
      if (sourceSet.has(pair.destinationId)) {
        // Este destination también es source en otra pareja
        sourceIdInSankey = pair.destinationId; // mantener como está
      }
      
      // Si el source también aparece como destination en otra pareja,
      // necesitamos usar el nodo con sufijo -dest para que aparezca en la columna derecha
      if (destSet.has(pair.sourceId)) {
        targetIdInSankey = `${pair.sourceId}-dest`;
      }

      // Invertido para visualización: destination (izquierda) → source (derecha)
      return {
        source: sourceIdInSankey, // pair.destinationId → izquierda
        target: targetIdInSankey, // pair.sourceId → derecha
        value: 10, // Valor base para que los pipes sean visibles
        color: pair.color,
        id: `link-${index}`, // ID único para cada link
      };
    });

    return { nodes, links };
  }, [pairs, sourceSet, destSet]);

  // Crear mapa de logos accesible (incluye logos para nodos con sufijo -dest)
  const nodeLogos = useMemo(() => {
    const logoMap = new Map<string, string>();
    pairs.forEach((pair) => {
      // pair.sourceId = de donde sale (izquierda)
      // pair.destinationId = hacia donde va (derecha)
      if (pair.sourceLogo) {
        logoMap.set(pair.sourceId, pair.sourceLogo);
        // Si el sourceId también es destination visual, copiar logo al ID con sufijo
        if (destSet.has(pair.sourceId)) {
          logoMap.set(`${pair.sourceId}-dest`, pair.sourceLogo);
        }
      }
      if (pair.destinationLogo) {
        logoMap.set(pair.destinationId, pair.destinationLogo);
        // Si el destinationId también es source visual, copiar logo al ID con sufijo
        if (sourceSet.has(pair.destinationId)) {
          logoMap.set(`${pair.destinationId}-dest`, pair.destinationLogo);
        }
      }
    });
    return logoMap;
  }, [pairs, sourceSet, destSet]);

  // Crear mapa de colores para nodos basado en el color de su pareja
  // Los links heredan el color del source node en Sankey, así que asignamos colores a sources
  const nodeColors = useMemo(() => {
    const colorMap = new Map<string, string>();

    // Para cada pareja, asignar el color
    // pair.sourceId = de donde sale (izquierda)
    // pair.destinationId = hacia donde va (derecha)
    pairs.forEach((pair) => {
      // Source visual (columna izquierda) - es pair.sourceId
      if (!colorMap.has(pair.sourceId)) {
        colorMap.set(pair.sourceId, pair.color);
      }

      // Si el sourceId también es destination visual, agregar color al nodo -dest
      if (destSet.has(pair.sourceId)) {
        const sourceDestId = `${pair.sourceId}-dest`;
        if (!colorMap.has(sourceDestId)) {
          colorMap.set(sourceDestId, pair.color);
        }
      }

      // Destination visual (columna derecha) - es pair.destinationId
      if (!colorMap.has(pair.destinationId)) {
        colorMap.set(pair.destinationId, pair.color);
      }

      // Si el destinationId también es source visual, agregar color al nodo -dest
      if (sourceSet.has(pair.destinationId)) {
        const destId = `${pair.destinationId}-dest`;
        if (!colorMap.has(destId)) {
          colorMap.set(destId, pair.color);
        }
      }
    });

    return colorMap;
  }, [pairs, sourceSet, destSet]);

  const handleNodeClick = (node: SankeyNodeDatum<NodeData, LinkData>) => {
    if ("x" in node && "y" in node) {
      const nodeData = node as SankeyNodeDatum<NodeData, LinkData>;
      const nodeId =
        typeof nodeData.id === "string" ? nodeData.id : nodeData.id.id;

      // Solo permitir click en nodos source (izquierda)
      // Si es un nodo con sufijo -dest, no permitir click (es destination)
      if (nodeId.endsWith("-dest")) {
        return;
      }

      // Solo permitir click si es un nodo source (no destination)
      if (sourceSet.has(nodeId) && !destSet.has(nodeId)) {
        if (onChainClick) {
          onChainClick({
            id: nodeId,
            label: nodeData.label,
            logo: nodeLogos.get(nodeId),
          });
        }
      }
    }
  };

  return (
    <div className="h-[90%] flex flex-col bg-gray-900 rounded-lg shadow-lg w-full max-w-2xl overflow-hidden">
      <div className="p-4 pb-2 flex-shrink-0">
        <h2 className="text-xl font-bold text-white mb-4">
          Crosschain Connections
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 min-h-0">

      {pairs.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400 text-sm">
            No pairs selected. Select chains to create pairs.
          </p>
        </div>
      ) : (
        <div className="w-full min-h-[600px] bg-gray-950 rounded relative overflow-hidden mb-4">
          <style>{`
            @keyframes daftPunkFlow {
              0% { stop-color: #00ffff; }
              12.5% { stop-color: #ff00ff; }
              25% { stop-color: #ffff00; }
              37.5% { stop-color: #00ff00; }
              50% { stop-color: #ff0080; }
              62.5% { stop-color: #0080ff; }
              75% { stop-color: #ff00ff; }
              87.5% { stop-color: #ffff00; }
              100% { stop-color: #00ffff; }
            }
            ${
              isTransferring
                ? `
              /* Selector genérico para TODOS los paths dentro del SVG */
              svg path[d*="M"] {
                fill: url(#daftPunkGradient) !important;
                opacity: 1 !important;
              }
            `
                : ""
            }
          `}</style>
          <svg width="0" height="0">
            <defs>
              <linearGradient
                id="daftPunkGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%">
                  <animate
                    attributeName="stop-color"
                    values="#00ffff;#ff00ff;#ffff00;#00ff00;#ff0080;#0080ff;#ff00ff;#ffff00;#00ffff"
                    dur="8s"
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="25%">
                  <animate
                    attributeName="stop-color"
                    values="#ff00ff;#ffff00;#00ff00;#ff0080;#0080ff;#ff00ff;#ffff00;#00ffff;#ff00ff"
                    dur="8s"
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="50%">
                  <animate
                    attributeName="stop-color"
                    values="#ffff00;#00ff00;#ff0080;#0080ff;#ff00ff;#ffff00;#00ffff;#ff00ff;#ffff00"
                    dur="8s"
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="75%">
                  <animate
                    attributeName="stop-color"
                    values="#00ff00;#ff0080;#0080ff;#ff00ff;#ffff00;#00ffff;#ff00ff;#ffff00;#00ff00"
                    dur="8s"
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="100%">
                  <animate
                    attributeName="stop-color"
                    values="#ff0080;#0080ff;#ff00ff;#ffff00;#00ffff;#ff00ff;#ffff00;#00ff00;#ff0080"
                    dur="8s"
                    repeatCount="indefinite"
                  />
                </stop>
              </linearGradient>
            </defs>
          </svg>
          <ResponsiveSankey
            data={sankeyData}
            margin={{ top: 40, right: 200, bottom: 40, left: 200 }}
            align="justify"
            colors={(node: { id: string }) => {
              // Si el ID tiene sufijo -dest, buscar el color del nodo base primero
              if (node.id.endsWith("-dest")) {
                const baseId = node.id.replace("-dest", "");
                return (
                  nodeColors.get(node.id) || nodeColors.get(baseId) || "#8884d8"
                );
              }
              // Usar el color del nodo si está en el mapa, sino un color por defecto
              return nodeColors.get(node.id) || "#8884d8";
            }}
            linkOpacity={isTransferring ? 1 : 0.7}
            linkHoverOpacity={1}
            linkHoverOthersOpacity={0.15}
            linkContract={3}
            nodeThickness={16}
            nodeSpacing={20}
            nodeInnerPadding={2}
            nodeBorderWidth={2}
            nodeBorderColor={{ from: "color", modifiers: [["darker", 0.8]] }}
            nodeBorderRadius={3}
            enableLinkGradient={true}
            linkBlendMode="normal"
            labelPosition="inside"
            labelOrientation="horizontal"
            labelPadding={0}
            labelTextColor="transparent"
            animate={true}
            motionConfig="gentle"
            isInteractive={true}
            onClick={handleNodeClick}
            layers={[
              "links",
              "nodes",
              "labels",
              (props: CustomSankeyLayerProps<NodeData, LinkData>) => (
                <NodesWithLogos
                  key="custom-logos"
                  nodes={props.nodes}
                  logos={nodeLogos}
                />
              ),
              (props: CustomSankeyLayerProps<NodeData, LinkData>) => (
                <ColumnLabels key="column-labels" {...props} />
              ),
            ]}
            theme={{
              text: {
                fill: "#e5e7eb",
                fontSize: 11,
                fontFamily: "Arial, sans-serif",
                fontWeight: 500,
              },
              tooltip: {
                container: {
                  background: "#1f2937",
                  color: "#ffffff",
                  fontSize: "12px",
                  borderRadius: "6px",
                  padding: "10px 14px",
                  border: "1px solid #374151",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
                },
              },
            }}
          />
        </div>
      )}

        {/* Tabla de balances de blockchains */}
        <BalanceTable />
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
      `}</style>
    </div>
  );
}
