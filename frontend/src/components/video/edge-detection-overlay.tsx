import React, { useEffect, useRef, useState, useMemo } from "react";
import { useSettings } from "@/providers/settings-provider";
import { useCameraEdgeDetection } from "@/hooks/use-edge-detection";
import { useVideo } from "@/providers/video-provider";

// Create a stable component that won't unmount during regular operation
export const EdgeDetectionOverlay = React.memo(function EdgeDetectionOverlay() {
  // Get video and settings from contexts
  const { videoRef, isPlaying } = useVideo();
  const { isEdgeDetectionEnabled, edgeColor, sensitivity } = useSettings();

  // Status display
  const [connectionStatus, setConnectionStatus] =
    useState<string>("disconnected");

  // Create canvas refs
  const processDataCanvasRef = useRef<HTMLCanvasElement>(null);
  const edgeDetectionCanvasRef = useRef<HTMLCanvasElement>(null);

  // Memoize edge detection props to prevent unnecessary hook re-execution
  const edgeDetectionProps = useMemo(
    () => ({
      videoRef,
      processDataCanvasRef,
      edgeDetectionCanvasRef,
      isEdgeDetectionEnabled,
      isPlaying,
      edgeColor,
      sensitivity: sensitivity,
      onStatusChange: setConnectionStatus,
    }),
    [videoRef, isEdgeDetectionEnabled, isPlaying, edgeColor, sensitivity]
  );

  // Initialize edge detection - continue to use the hook regardless of visibility
  const { cleanup, connectionStatus: hookStatus } =
    useCameraEdgeDetection(edgeDetectionProps);

  // Update connection status
  useEffect(() => {
    setConnectionStatus(hookStatus);
  }, [hookStatus]);

  // Cleanup on unmount - this should happen much less frequently now
  useEffect(() => {
    return () => {
      if (cleanup) cleanup();
    };
  }, [cleanup]);

  // Adjust canvas size when video dimensions change
  useEffect(() => {
    const handleResize = () => {
      const video = videoRef.current;
      const processCanvas = processDataCanvasRef.current;
      const displayCanvas = edgeDetectionCanvasRef.current;

      if (!video || !processCanvas || !displayCanvas) return;

      // Only resize if dimensions don't match
      if (
        processCanvas.width !== video.videoWidth ||
        processCanvas.height !== video.videoHeight
      ) {
        // Data processing canvas - match video's natural dimensions
        processCanvas.width = video.videoWidth || 640;
        processCanvas.height = video.videoHeight || 480;

        // Display canvas - match video's display dimensions
        displayCanvas.width = video.videoWidth || 640;
        displayCanvas.height = video.videoHeight || 480;

        if (process.env.NODE_ENV === "development") {
          console.log(
            `[Debug EdgeDetectionOverlay] Resized canvas to ${processCanvas.width}x${processCanvas.height}`
          );
        }
      }
    };

    // Set initial size
    handleResize();

    // Add resize listener for when video size changes
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [videoRef]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none ${
        isEdgeDetectionEnabled ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Hidden canvas for processing data - always keep mounted */}
      <canvas
        ref={processDataCanvasRef}
        className="hidden"
        width={640}
        height={480}
        data-testid="process-canvas"
      />

      {/* Visible canvas for showing edge detection results */}
      <canvas
        ref={edgeDetectionCanvasRef}
        className="absolute inset-0 w-full h-full"
        width={640}
        height={480}
        data-testid="edge-detection-canvas"
      />
    </div>
  );
});

// For simplicity when importing
export default EdgeDetectionOverlay;
