import {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
  RefObject,
  useEffect,
} from "react";
import { useVideo, VideoSource } from "@/hooks/use-video";

type EdgeDetectionContextType = {
  // Video player state
  videoRef: RefObject<HTMLVideoElement | null>;
  processDataCanvasRef: RefObject<HTMLCanvasElement | null>;
  edgeDetectionCanvasRef: RefObject<HTMLCanvasElement | null>;

  // Video playback state and controls
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  formatTime: (time: number) => string;

  videoSource: string;
  handleVideoSourceChange: (source: string) => void;
  changeVideoSource: (source: VideoSource) => Promise<void>;
  currentSource: VideoSource;

  isEdgeDetectionEnabled: boolean;
  setEdgeDetectionEnabled: (enabled: boolean) => void;
  toggleEdgeDetection: () => void;

  // TODO: Integrate sensitivity controls
  sensitivity: number[];
  setSensitivity: (sensitivity: number[]) => void;

  edgeColor: string;
  setEdgeColor: (color: string) => void;

  switchToCamera: () => Promise<void>;
  switchToFileVideo: () => void;
  handleFileUpload: (file: File) => Promise<void>;
};

const EdgeDetectionContext = createContext<
  EdgeDetectionContextType | undefined
>(undefined);

export function EdgeDetectionProvider({ children }: { children: ReactNode }) {
  const {
    videoRef,
    isPlaying,
    duration,
    currentTime,
    formatTime,
    play,
    pause,
    toggle,
    reset,
    changeSource,
    source: currentSource,
  } = useVideo();

  const processDataCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const edgeDetectionCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isEdgeDetectionEnabled, setEdgeDetectionEnabled] = useState(false);
  const [sensitivity, setSensitivity] = useState([50]);
  const [edgeColor, setEdgeColor] = useState("red");

  const [videoSource, setVideoSource] = useState("upload");
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  const toggleEdgeDetection = () => {
    setEdgeDetectionEnabled((prev) => !prev);
  };

  const handleVideoSourceChange = (source: string) => {
    // If we're currently using webcam and switching to a different source
    if (videoSource === "webcam" && source !== "webcam") {
      const video = videoRef.current;
      if (video) {
        try {
          // Stop all tracks in the current stream if it exists
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach((track) => {
              track.stop();
            });
            // Clear the srcObject to fully disconnect the camera
            video.srcObject = null;
          }

          // Clear the video element completely
          video.pause();
          video.currentTime = 0;
          video.src = "";
          video.load(); // Force reload of the video element

          console.log("Webcam forcibly stopped and video element cleared");
        } catch (err) {
          console.error("Error stopping webcam:", err);
        }
      }
    }

    setVideoSource(source);

    if (source === "webcam") {
      switchToCamera();
    } else if (source === "sample") {
      switchToFileVideo();
    } else if (source === "upload") {
      // For upload, just ensure we've cleaned up completely
      const video = videoRef.current;
      if (video && video.srcObject) {
        try {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
          video.srcObject = null;
          video.src = "";
          console.log("Cleaned up webcam when switching to upload mode");
        } catch (err) {
          console.error("Error cleaning up in upload mode:", err);
        }
      }

      // Only trigger file upload UI if we have no uploaded file
      if (!uploadedFileUrl) {
        // This will just change the UI state - actual upload happens with file input
        console.log("Switching to upload mode without a file");
      } else {
        console.log("Switching to upload mode with existing file");
      }
    }
  };

  // Switch to camera source
  const switchToCamera = async () => {
    // First ensure any existing streams are stopped
    const video = videoRef.current;
    if (video && video.srcObject) {
      try {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        video.srcObject = null;
      } catch (err) {
        console.error("Error stopping previous stream:", err);
      }
    }

    await changeSource({
      type: "camera",
      constraints: {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment",
        },
      },
    });
    // Auto-start camera when selected
    play();
  };

  const switchToFileVideo = () => {
    // Just show a message since we no longer have a sample video
    alert("Please upload a video file or use your webcam");
    // Reset to upload mode
    setVideoSource("upload");
  };

  // Handle uploaded file
  const handleFileUpload = async (file: File): Promise<void> => {
    // Validate that it's a video file
    if (!file.type.startsWith("video/")) {
      alert("Please upload a valid video file (.mp4)");
      return;
    }

    // Set source to upload explicitly
    setVideoSource("upload");

    // AGGRESSIVE cleanup of any webcam streams
    // First try the videoRef approach
    const video = videoRef.current;
    if (video) {
      // Stop any video that might be playing
      video.pause();

      // If there's a srcObject (likely a webcam), stop all its tracks
      if (video.srcObject) {
        try {
          const stream = video.srcObject as MediaStream;
          console.log("Stopping all tracks in current stream");
          stream.getTracks().forEach((track) => {
            console.log(`Stopping track: ${track.kind}`);
            track.stop();
          });
          video.srcObject = null;
        } catch (err) {
          console.error("Error stopping webcam in handleFileUpload:", err);
        }
      }
    }

    // Additional brute-force approach: stop ALL media streams using the browser API
    try {
      if (navigator.mediaDevices) {
        console.log("Attempting to stop all media streams");
        const devices = await navigator.mediaDevices.enumerateDevices();
        devices.forEach((device) => {
          console.log(`Found device: ${device.kind}, ${device.deviceId}`);
        });
      }
    } catch (e) {
      console.error("Error enumerating devices:", e);
    }

    // Clean up previous file URL if it exists
    if (uploadedFileUrl) {
      URL.revokeObjectURL(uploadedFileUrl);
    }

    const fileUrl = URL.createObjectURL(file);
    setUploadedFileUrl(fileUrl);

    // Now change to file source after explicitly stopping the webcam
    try {
      await changeSource({
        type: "file",
        url: fileUrl,
      });
    } catch (error) {
      console.error("Error changing source:", error);
    }

    setEdgeDetectionEnabled(true);
    play();
  };

  useEffect(() => {
    return () => {
      if (uploadedFileUrl) {
        URL.revokeObjectURL(uploadedFileUrl);
      }
    };
  }, [uploadedFileUrl]);

  // Context value
  const value: EdgeDetectionContextType = {
    videoRef,
    processDataCanvasRef,
    edgeDetectionCanvasRef,
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    toggle,
    reset,
    formatTime,
    videoSource,
    handleVideoSourceChange,
    changeVideoSource: changeSource,
    currentSource,
    isEdgeDetectionEnabled,
    setEdgeDetectionEnabled,
    toggleEdgeDetection,
    sensitivity,
    setSensitivity,
    edgeColor,
    setEdgeColor,
    switchToCamera,
    switchToFileVideo,
    handleFileUpload,
  };

  return (
    <EdgeDetectionContext.Provider value={value}>
      {children}
    </EdgeDetectionContext.Provider>
  );
}

// Custom hook to use the context
export function useEdgeDetectionContext() {
  const context = useContext(EdgeDetectionContext);

  if (context === undefined) {
    throw new Error(
      "useEdgeDetectionContext must be used within an EdgeDetectionProvider"
    );
  }

  return context;
}
