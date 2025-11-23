import { SigmaContainer } from "@react-sigma/core";
import type { JSX } from "react";
import { useMemo, memo } from "react";
import LoadGraph from "./_components/LoadGraph";
import { NodeImageProgram } from "@sigma/node-image";
import EdgeCurveProgram from "@sigma/edge-curve";

function DisplayGraph(): JSX.Element {
  // Usar useMemo para evitar re-creación de settings en cada render
  const settings = useMemo(() => ({
    nodeProgramClasses: {
      image: NodeImageProgram,
    },
    edgeProgramClasses: {
      curve: EdgeCurveProgram,
    },
    renderLabels: true,
    labelRenderedSizeThreshold: 0,
    labelDensity: 1,
    labelGridCellSize: 100,
    labelFont: "Arial, sans-serif",
    labelSize: 12,
    labelWeight: "normal",
    labelColor: { color: "#9CA3AF" },
    defaultDrawNodeLabel: (
      context: CanvasRenderingContext2D,
      data: { label: string | null; x: number; y: number; size: number },
      settings: {
        labelSize: number;
        labelFont: string;
        labelWeight: string;
      }
    ) => {
      if (!data.label) return;

      const size = settings.labelSize;
      const font = settings.labelFont;
      const weight = settings.labelWeight;

      context.fillStyle = "#9CA3AF";
      context.font = `${weight} ${size}px ${font}`;
      context.textAlign = "center";
      context.textBaseline = "top";

      context.fillText(
        data.label,
        data.x,
        data.y + data.size + 5
      );
    },
  }), []);
  
  return (
    <SigmaContainer
      key="main-graph" // Key estable para evitar unmount/remount
      style={{ width: "100%", height: "100%", backgroundColor: "transparent" }}
      className="w-full h-full"
      settings={settings}
    >
      <LoadGraph />
    </SigmaContainer>
  );
}

// Memorizar el componente para evitar re-renders cuando el contexto padre cambia
export default memo(DisplayGraph);
