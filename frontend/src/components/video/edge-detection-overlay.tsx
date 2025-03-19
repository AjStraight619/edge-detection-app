import { type RefObject } from "react";
import { useCameraEdgeDetection } from "@/hooks/use-edge-detection";
import { useEdgeDetectionContext } from "@/providers/edge-detection-provider";

interface FocusPeakingOverlayProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  processDataCanvasRef: RefObject<HTMLCanvasElement | null>;
  edgeDetectionCanvasRef: RefObject<HTMLCanvasElement | null>;
  isPlaying: boolean;
  edgeColor: string;
}

export default function EdgeDetectionOverlay({
  videoRef,
  processDataCanvasRef,
  edgeDetectionCanvasRef,
  isPlaying,
  edgeColor,
}: FocusPeakingOverlayProps) {
  const { isEdgeDetectionEnabled } = useEdgeDetectionContext();
  const { connectionStatus } = useCameraEdgeDetection({
    videoRef,
    processDataCanvasRef,
    edgeDetectionCanvasRef,
    isEdgeDetectionEnabled: isEdgeDetectionEnabled,
    isPlaying,
    edgeColor,
  });

  return (
    <>
      <canvas
        ref={edgeDetectionCanvasRef}
        className="absolute inset-0 w-full h-full object-contain"
        style={{
          zIndex: 50,
          pointerEvents: "none",
        }}
      />

      <div className="absolute top-2 right-2 px-2 py-1 text-xs bg-black/70 text-white rounded z-50">
        {connectionStatus}
      </div>
    </>
  );
}
