import { useEffect, type RefObject, useRef, useCallback } from "react";
import { useWebSocket } from "./use-websocket";

import { drawImageToCanvas, clearCanvas } from "@/lib/utils";

type UseEdgeDetectionProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  processDataCanvasRef: RefObject<HTMLCanvasElement | null>;
  edgeDetectionCanvasRef: RefObject<HTMLCanvasElement | null>;
  isEdgeDetectionEnabled: boolean;
  isPlaying: boolean;
  edgeColor: string;
  sensitivity: number[];
  onStatusChange?: (status: string) => void;
};

// Helper function to capture a frame from video to canvas
const captureVideoFrame = (
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): string | null => {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  try {
    // Make sure canvas size matches video dimensions
    if (
      canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight
    ) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    // Draw in a way that doesn't pause video playback
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Check if this is a webcam stream
    const isWebcam = !!video.srcObject;

    // For webcam - use lower quality to improve performance
    const quality = isWebcam ? 0.7 : 0.75;

    // For webcam, consider downscaling the canvas before exporting to reduce data size
    if (isWebcam && canvas.width > 640) {
      // Create a temporary smaller canvas to downsample the image
      const tempCanvas = document.createElement("canvas");
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        // Scale to reasonable size for webcam processing
        const scaleFactor = 640 / Math.max(canvas.width, canvas.height);
        tempCanvas.width = canvas.width * scaleFactor;
        tempCanvas.height = canvas.height * scaleFactor;

        // Draw downscaled image
        tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

        // Use the smaller canvas for data output
        const frame = tempCanvas.toDataURL("image/jpeg", quality);
        const base64Data = frame.split(",")[1];
        return base64Data;
      }
    }

    // Standard path for non-webcam or if tempCanvas failed
    const frame = canvas.toDataURL("image/jpeg", quality);
    const base64Data = frame.split(",")[1];
    return base64Data;
    /* eslint-disable @typescript-eslint/no-unused-vars */
  } catch (_) {
    /* eslint-enable @typescript-eslint/no-unused-vars */
    return null;
  }
};

// Main hook for edge detection
export function useCameraEdgeDetection({
  videoRef,
  processDataCanvasRef,
  edgeDetectionCanvasRef,
  isEdgeDetectionEnabled,
  isPlaying,
  edgeColor,
  sensitivity = [50],
  onStatusChange,
}: UseEdgeDetectionProps) {
  // Only initialize the websocket if edge detection is enabled
  const { socketRef, connectionStatus, connectSocket, disconnectSocket } =
    useWebSocket();

  // Create refs for tracking state
  const timerIdRef = useRef<number | null>(null);
  const processingFrameRef = useRef<boolean>(false);
  const frameCountRef = useRef<number>(0);
  const currentEdgeColorRef = useRef(edgeColor);
  const currentSensitivityRef = useRef(sensitivity[0]);
  const lastFrameStartTimeRef = useRef<number>(0);

  // Performance tracking refs - keep only what's needed
  const lastProcessedImageRef = useRef<ImageData | null>(null);

  // Update color and sensitivity refs when props change
  useEffect(() => {
    currentEdgeColorRef.current = edgeColor;
    currentSensitivityRef.current = sensitivity[0];
  }, [edgeColor, sensitivity]);

  // Check if image has changed enough to warrant processing
  const hasSignificantChange = useCallback(
    (newImageData: ImageData): boolean => {
      // If we don't have a previous image, process this one
      if (!lastProcessedImageRef.current) {
        lastProcessedImageRef.current = newImageData;
        return true;
      }

      const oldData = lastProcessedImageRef.current.data;
      const newData = newImageData.data;

      // Sample pixels at regular intervals (don't check every pixel)
      // The step size controls how many pixels we skip - higher step = faster but less accurate
      const step = Math.max(20, Math.floor(newData.length / 4000)); // Adjust based on resolution
      let diffCount = 0;
      const threshold = 30; // Pixel difference threshold (0-255)

      // Check roughly 1000-4000 pixels depending on image size
      for (let i = 0; i < newData.length; i += step * 4) {
        // Skip by step * 4 (RGBA)
        // Calculate difference for this pixel (just check one channel for speed)
        const diff = Math.abs(newData[i] - oldData[i]);
        if (diff > threshold) {
          diffCount++;
        }

        // Early exit if we detect enough changes
        if (diffCount > 10) {
          lastProcessedImageRef.current = newImageData;
          return true;
        }
      }

      // If less than 1% of sampled pixels changed, consider it static
      const changeRatio = diffCount / (newData.length / step / 4);
      const hasChanged = changeRatio > 0.01;

      // Update the last processed image if it's changed enough
      if (hasChanged) {
        lastProcessedImageRef.current = newImageData;
      }

      return hasChanged;
    },
    []
  );

  // Process frame function - memoized to prevent recreation
  const processFrame = useCallback(() => {
    const socket = socketRef.current;
    const video = videoRef.current;
    const canvas = processDataCanvasRef.current;

    // Skip frame processing if any required element is missing
    if (!socket || !video || !canvas || video.paused) {
      processingFrameRef.current = false;
      return false; // Return false to indicate no frame was processed
    }

    // Skip frame processing if disabled, but reset the flag so we don't get stuck
    if (!isEdgeDetectionEnabled) {
      processingFrameRef.current = false;
      return false; // Return false to indicate no frame was processed
    }

    // If we're already processing, skip this frame UNLESS it's been stuck for too long
    const now = performance.now();
    const stuckTime = now - lastFrameStartTimeRef.current;
    if (processingFrameRef.current) {
      if (stuckTime > 2000) {
        // If stuck for more than 2 seconds, force reset
        processingFrameRef.current = false;
      } else {
        return false; // Skip if already processing and not stuck
      }
    }

    // Set processing flag FIRST
    processingFrameRef.current = true;
    lastFrameStartTimeRef.current = now;

    try {
      // We want to track frame numbers consistently
      const frameNumber = frameCountRef.current++;

      // Capture frame from video to the process canvas
      const base64Data = captureVideoFrame(video, canvas);
      if (!base64Data) {
        processingFrameRef.current = false;
        return false; // Return false to indicate no frame was processed
      }

      // Check if the image has changed enough to process (webcam only)
      // TEMPORARILY DISABLED - process all frames until we fix the issue
      /*
      const isWebcam = !!video.srcObject;
      if (isWebcam) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Get image data to analyze for changes
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Skip processing if not much has changed in the video
          if (!hasSignificantChange(imageData)) {
            processingFrameRef.current = false;
            return false;
          }
        }
      }
      */

      // CRITICAL: Safety timeout to prevent stuck processing
      setTimeout(() => {
        if (processingFrameRef.current) {
          processingFrameRef.current = false;
        }
      }, 2000);

      // Determine if this is a webcam or file
      const isWebcam = !!video.srcObject;
      const source_type = isWebcam ? "webcam" : "file";

      // Send frame to server
      socket.emit("process_frame", {
        isEdgeDetectionEnabled,
        frame: base64Data,
        edge_color: currentEdgeColorRef.current,
        sensitivity: Math.max(1, currentSensitivityRef.current), // Ensure minimum of 1% sensitivity
        source_type,
        frame_number: frameNumber,
        timestamp: now, // Send timestamp to track response time
      });

      return true; // Return true to indicate a frame was processed
      /* eslint-disable @typescript-eslint/no-unused-vars */
    } catch (_) {
      /* eslint-enable @typescript-eslint/no-unused-vars */
      processingFrameRef.current = false;
      return false; // Return false to indicate no frame was processed
    }
  }, [
    videoRef,
    processDataCanvasRef,
    isEdgeDetectionEnabled,
    socketRef,
    hasSignificantChange,
  ]);

  // COMPLETELY REWRITTEN animation loop
  useEffect(() => {
    // Only run the animation loop if edge detection is enabled and video is playing
    if (!isEdgeDetectionEnabled || !isPlaying) {
      return;
    }

    // Update connection status
    onStatusChange?.(connectionStatus);

    // Use fixed frame rates - no dynamic adjustment for now
    const isWebcam = !!videoRef.current?.srcObject;
    const targetInterval = isWebcam ? 150 : 100; // ~6-7fps for webcam, 10fps for files

    // Set up a simple interval-based animation
    const intervalId = window.setInterval(() => {
      // Just process a frame on each interval
      processFrame();
    }, targetInterval);

    // Store the interval ID for cleanup
    timerIdRef.current = intervalId;

    return () => {
      // Clean up by clearing the interval
      if (timerIdRef.current !== null) {
        window.clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [
    isEdgeDetectionEnabled,
    isPlaying,
    processFrame,
    connectionStatus,
    onStatusChange,
    videoRef,
  ]);

  // Handle socket setup and connection
  useEffect(() => {
    // Connect to socket only when enabled
    if (isEdgeDetectionEnabled) {
      connectSocket();

      // Set up a handler for when we receive processed frames back
      const handleProcessedFrame = (data: {
        frame: string;
        frame_number: number;
        timestamp?: number;
      }) => {
        processingFrameRef.current = false; // Reset processing flag

        // Update the edge detection canvas with the result
        if (edgeDetectionCanvasRef.current && data.frame) {
          const edgeCanvas = edgeDetectionCanvasRef.current;
          const img = new Image();
          img.onload = () => {
            if (edgeCanvas) {
              drawImageToCanvas(edgeCanvas, img);
            }
          };
          img.src = `data:image/jpeg;base64,${data.frame}`;
        }
      };

      // Set up error handler
      const handleError = (error: { message?: string }) => {
        processingFrameRef.current = false;
        if (error && error.message) {
          onStatusChange?.("Error: " + error.message);
        }
      };

      const socket = socketRef.current;
      if (socket) {
        socket.on("processed_frame", handleProcessedFrame);
        socket.on("error", handleError);

        return () => {
          socket.off("processed_frame", handleProcessedFrame);
          socket.off("error", handleError);
        };
      }
    } else {
      // Clear the canvas when edge detection is disabled
      if (edgeDetectionCanvasRef.current) {
        clearCanvas(edgeDetectionCanvasRef.current);
      }

      // Clean up processing flags when disabled
      processingFrameRef.current = false;

      // Disconnect socket when disabled
      disconnectSocket();
    }
  }, [
    isEdgeDetectionEnabled,
    edgeDetectionCanvasRef,
    connectSocket,
    disconnectSocket,
    socketRef,
    onStatusChange,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up the socket connection
      disconnectSocket();

      // Clean up the timer
      if (timerIdRef.current !== null) {
        window.clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }

      // Reset processing flags
      processingFrameRef.current = false;

      // Clear canvases
      if (processDataCanvasRef.current) {
        clearCanvas(processDataCanvasRef.current);
      }

      if (edgeDetectionCanvasRef.current) {
        clearCanvas(edgeDetectionCanvasRef.current);
      }
    };
  }, [disconnectSocket, processDataCanvasRef, edgeDetectionCanvasRef]);

  return {
    connectionStatus,
  };
}
