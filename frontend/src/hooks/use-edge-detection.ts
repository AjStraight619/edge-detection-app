import { useEffect, type RefObject, useRef, useCallback } from "react";
import { useWebSocket } from "./use-websocket";

type UseFocusPeakingProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  processDataCanvasRef: RefObject<HTMLCanvasElement | null>;
  edgeDetectionCanvasRef: RefObject<HTMLCanvasElement | null>;
  isEdgeDetectionEnabled: boolean;
  isPlaying: boolean;
  edgeColor: string;
};

interface ProcessedFrameData {
  frame: string;
  frame_number: number;
}

// Helper function to draw an image to a canvas
const drawImageToCanvas = (
  canvas: HTMLCanvasElement,
  img: HTMLImageElement
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Set dimensions to match the image
  if (canvas.width !== img.width || canvas.height !== img.height) {
    canvas.width = img.width;
    canvas.height = img.height;
    console.log(
      `Adjusted canvas size to match image: ${img.width}x${img.height}`
    );
  }

  // Draw the image to the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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
    console.log(
      `Setting canvas size: ${video.videoWidth}x${video.videoHeight}`
    );
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
  }

  // Draw the video frame to the canvas
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  try {
    // Higher quality for better image
    // TODO: Integrate quality control
    const frame = canvas.toDataURL("image/jpeg", 0.9);
    const base64Data = frame.split(",")[1];
    return base64Data;
  } catch (e) {
    console.error("Error capturing frame:", e);
    return null;
  }
};

/**
 * Might not need useCallback hooks because we are using React 19. However, using them for now to avoid potential issues.
 */

export const useCameraEdgeDetection = ({
  videoRef,
  processDataCanvasRef,
  edgeDetectionCanvasRef,
  isEdgeDetectionEnabled,
  isPlaying,
  edgeColor,
}: UseFocusPeakingProps) => {
  // Use the websocket hook
  const { socketRef, connectionStatus, setConnectionStatus } = useWebSocket();

  const animationFrameRef = useRef<number | null>(null);
  const processingActiveRef = useRef(false);
  const frameCountRef = useRef(0);
  const lastProcessedTimeRef = useRef(Date.now());
  const currentEdgeColorRef = useRef(edgeColor);

  // Update ref when color changes to ensure latest value in animation frame loop
  useEffect(() => {
    currentEdgeColorRef.current = edgeColor;
    console.log(`Edge color updated to: ${edgeColor}`);

    if (
      isEdgeDetectionEnabled &&
      isPlaying &&
      videoRef.current &&
      !videoRef.current.paused
    ) {
      processingActiveRef.current = false;
      lastProcessedTimeRef.current = 0; // Reset time to force immediate processing
    }
  }, [edgeColor, isEdgeDetectionEnabled, isPlaying, videoRef]);

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

        drawImageToCanvas(displayCanvas, img);
      };

      img.onerror = (e) => {
        console.error("Error loading processed image:", e);
        processingActiveRef.current = false;
      };

      img.src = `data:image/jpeg;base64,${data.frame}`;
    },
    [edgeDetectionCanvasRef]
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

    // Only send frames for processing when connected and not already processing
    const now = Date.now();
    const shouldProcess =
      socket.connected &&
      !processingActiveRef.current &&
      !video.paused &&
      // Default fps is 150
      // TODO: Integrate FPS control
      now - lastProcessedTimeRef.current > 150;

    if (shouldProcess) {
      processingActiveRef.current = true;
      lastProcessedTimeRef.current = now;
      frameCountRef.current++;

      // Capture the frame using the helper function
      const base64Data = captureVideoFrame(video, canvas);
      if (base64Data) {
        // Extra safety check - never send if peaking is disabled
        if (!isEdgeDetectionEnabled) {
          processingActiveRef.current = false;
          return;
        }

        // Send data in the format expected by the backend
        socket.emit("process_frame", {
          frame: base64Data,
          edge_color: currentEdgeColorRef.current,
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
    if (!videoRef?.current || !processDataCanvasRef?.current) {
      console.log("Video or canvas ref not available");
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      console.log("Socket not initialized yet");
      return;
    }

    const video = videoRef.current;

    if (!isEdgeDetectionEnabled) {
      setConnectionStatus(socket.connected ? "connected" : "disconnected");
      // Stop animation frame if it's running
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

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
      console.log("Starting/restarting processing");
      // Force immediate processing by resetting the active state and time
      processingActiveRef.current = false;
      lastProcessedTimeRef.current = 0;
      // Start the animation frame loop
      processFrame();
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
  ]);

  return {
    connectionStatus,
    socketRef,
    isEdgeDetectionEnabled,
  };
};
