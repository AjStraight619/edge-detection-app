import { useEffect, type RefObject, useRef, useCallback } from "react";
import { useWebSocket } from "./use-websocket";
import { FRAME_INTERVAL_MS } from "@/lib/constants";
import { drawImageToCanvas, clearCanvas } from "@/lib/utils";

type UseEdgeDetectionProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  processDataCanvasRef: RefObject<HTMLCanvasElement | null>;
  edgeDetectionCanvasRef: RefObject<HTMLCanvasElement | null>;
  isEdgeDetectionEnabled: boolean;
  isPlaying: boolean;
  edgeColor: string;
  sensitivity?: number[];
};

type ProcessedFrameData = {
  frame: string;
  frame_number: number;
};

// Helper function to capture a frame from video to canvas
const captureVideoFrame = (
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): string | null => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Make sure canvas size matches video dimensions
  if (
    canvas.width !== video.videoWidth ||
    canvas.height !== video.videoHeight
  ) {
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
  }

  // Draw the video frame to the canvas
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  try {
    // Higher quality for better image
    const frame = canvas.toDataURL("image/jpeg", 0.9);
    const base64Data = frame.split(",")[1];
    return base64Data;
  } catch (e) {
    console.error("Error capturing frame:", e);
    return null;
  }
};

/**
 * ! Might not need useCallback hooks because we are using React 19. However, using them for now to avoid potential issues.
 */

export const useCameraEdgeDetection = ({
  videoRef,
  processDataCanvasRef,
  edgeDetectionCanvasRef,
  isEdgeDetectionEnabled,
  isPlaying,
  edgeColor,
  sensitivity = [50],
}: UseEdgeDetectionProps) => {
  const { socketRef, connectionStatus, setConnectionStatus } = useWebSocket();

  const animationFrameRef = useRef<number | null>(null);
  const processingActiveRef = useRef(false);
  const frameCountRef = useRef(0);
  const lastProcessedTimeRef = useRef(Date.now());
  const currentEdgeColorRef = useRef(edgeColor);
  const currentSensitivityRef = useRef(sensitivity[0]);

  useEffect(() => {
    currentEdgeColorRef.current = edgeColor;
    currentSensitivityRef.current = sensitivity[0];

    if (
      isEdgeDetectionEnabled &&
      isPlaying &&
      videoRef.current &&
      !videoRef.current.paused
    ) {
      processingActiveRef.current = false;
      lastProcessedTimeRef.current = 0; // Reset time to force immediate processing
    }
  }, [edgeColor, sensitivity, isEdgeDetectionEnabled, isPlaying, videoRef]);

  // Handle processed frames coming back from server
  const handleProcessedFrame = useCallback(
    (data: ProcessedFrameData) => {
      processingActiveRef.current = false;

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        // Get the display canvas
        const displayCanvas = edgeDetectionCanvasRef.current;
        if (!displayCanvas) {
          console.error("Display canvas not found");
          return;
        }

        // Only draw if edge detection is enabled
        if (isEdgeDetectionEnabled) {
          drawImageToCanvas(displayCanvas, img);
        } else {
          // Clear canvas if edge detection is disabled
          clearCanvas(displayCanvas);
        }
      };

      img.onerror = (e) => {
        console.error("Error loading processed image:", e);
        processingActiveRef.current = false;
      };

      img.src = `data:image/jpeg;base64,${data.frame}`;
    },
    [edgeDetectionCanvasRef, isEdgeDetectionEnabled]
  );

  // Process a single video frame
  const processFrame = useCallback(() => {
    const socket = socketRef.current;
    if (!videoRef.current || !processDataCanvasRef.current || !socket) return;

    // Early return if peaking is not enabled
    if (!isEdgeDetectionEnabled) {
      // Make sure we're not scheduling more frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    const canvas = processDataCanvasRef.current;

    // Debug info: check if video source is webcam or file
    const isWebcam = !!video.srcObject;

    // Only send frames for processing when connected and not already processing
    const now = Date.now();
    const shouldProcess =
      socket.connected &&
      !processingActiveRef.current &&
      !video.paused &&
      // Use different frame rates for webcam vs uploaded videos
      // Uploaded videos need more time between frames
      now - lastProcessedTimeRef.current >
        (isWebcam ? FRAME_INTERVAL_MS : FRAME_INTERVAL_MS * 2);

    if (shouldProcess) {
      // console.log(`Processing frame - source: ${isWebcam ? 'webcam' : 'uploaded video'}`);

      processingActiveRef.current = true;
      lastProcessedTimeRef.current = now;
      frameCountRef.current++;

      // Capture the frame using the helper function
      const base64Data = captureVideoFrame(video, canvas);
      if (base64Data) {
        if (!isEdgeDetectionEnabled) {
          processingActiveRef.current = false;
          return;
        }

        socket.emit("process_frame", {
          frame: base64Data,
          edge_color: currentEdgeColorRef.current,
          sensitivity: currentSensitivityRef.current,
          source_type: isWebcam ? "webcam" : "file", // Tell the server what type of source
        });
      } else {
        processingActiveRef.current = false;
      }
    }

    // Only continue the animation loop if peaking is still enabled
    if (isEdgeDetectionEnabled) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
  }, [socketRef, videoRef, processDataCanvasRef, isEdgeDetectionEnabled]);

  useEffect(() => {
    // Always clear the canvas when edge detection is disabled
    if (!isEdgeDetectionEnabled) {
      // Clear the edge detection canvas immediately
      clearCanvas(edgeDetectionCanvasRef.current);

      // Also cancel any pending animation frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      // Reset processing state
      processingActiveRef.current = false;
      return;
    }

    if (!videoRef?.current || !processDataCanvasRef?.current) {
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      return;
    }

    const video = videoRef.current;

    // Clean up previous listeners first to avoid duplicates
    socket.off("processed_frame", handleProcessedFrame);
    // Re-add the event listener
    socket.on("processed_frame", handleProcessedFrame);

    // Restart processing if needed
    if (!video.paused && isPlaying && isEdgeDetectionEnabled) {
      // Cancel any existing animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Force immediate processing by resetting the active state and time
      processingActiveRef.current = false;
      lastProcessedTimeRef.current = 0;
      // Start the animation frame loop
      processFrame();
    } else {
      // Clear the canvas if we're not actively processing
      clearCanvas(edgeDetectionCanvasRef.current);
    }

    return () => {
      // Keep socket alive but stop processing
      socket.off("processed_frame", handleProcessedFrame);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [
    isEdgeDetectionEnabled,
    isPlaying,
    edgeColor,
    socketRef,
    processFrame,
    videoRef,
    processDataCanvasRef,
    handleProcessedFrame,
    setConnectionStatus,
    edgeDetectionCanvasRef,
  ]);

  return {
    connectionStatus,
    socketRef,
    isEdgeDetectionEnabled,
  };
};
