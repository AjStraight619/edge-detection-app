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
  isFileUploaded: boolean;
  setIsFileUploaded: (isFileUploaded: boolean) => void;

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
  const [isFileUploaded, setIsFileUploaded] = useState(false);

  const [isEdgeDetectionEnabled, setEdgeDetectionEnabled] = useState(false);
  const [sensitivity, setSensitivity] = useState([50]);
  const [edgeColor, setEdgeColor] = useState("red");

  const [videoSource, setVideoSource] = useState("upload");
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  const toggleEdgeDetection = () => {
    setEdgeDetectionEnabled((prev) => !prev);
  };

  const stopAllMediaTracks = () => {
    // Stop the webcam in our videoRef
    const video = videoRef.current;
    if (video && video.srcObject) {
      try {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        video.srcObject = null;
      } catch (err) {
        console.error("Error stopping video tracks:", err);
      }
    }
  };

  const handleVideoSourceChange = (source: string) => {
    const video = videoRef.current;

    // Disable edge detection when switching sources to avoid canvas issues
    if (isEdgeDetectionEnabled && source !== videoSource) {
      setEdgeDetectionEnabled(false);
    }

    // Clear all canvases regardless of the source change
    const clearCanvases = () => {
      const edgeCanvas = edgeDetectionCanvasRef.current;
      if (edgeCanvas) {
        const ctx = edgeCanvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, edgeCanvas.width, edgeCanvas.height);
        }
      }

      // Clear the process data canvas
      const dataCanvas = processDataCanvasRef.current;
      if (dataCanvas) {
        const ctx = dataCanvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, dataCanvas.width, dataCanvas.height);
        }
      }
    };

    if (videoSource === "webcam" && source !== "webcam") {
      if (video) {
        pause();
        stopAllMediaTracks();

        video.currentTime = 0;
        video.src = "";

        setTimeout(() => {
          if (video) {
            video.load();
          }
          clearCanvases();
        }, 0);
      }
    }

    // Set the new video source first
    setVideoSource(source);

    // Now handle the specific source
    if (source === "webcam") {
      // Small timeout to ensure previous cleanup has completed
      setTimeout(() => {
        switchToCamera();
      }, 50);
    } else if (source === "sample") {
      switchToFileVideo();
    } else if (source === "upload") {
      if (video && video.srcObject) {
        stopAllMediaTracks();
        pause();
        // Reset video element
        video.src = "";

        // Force a reload
        setTimeout(() => {
          if (video) {
            video.load();
          }
          clearCanvases();
        }, 0);
      } else {
        // Still clear canvases
        clearCanvases();
      }

      // If we have a file URL, reload it after a small delay
      if (uploadedFileUrl) {
        setTimeout(() => {
          if (video && uploadedFileUrl) {
            video.src = uploadedFileUrl;
            video.load();
          }
        }, 50);
      }
    }
  };

  // Switch to camera source
  const switchToCamera = async () => {
    // Ensure any strams are stopped before switching to camera
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
    alert("Please upload a video file or use your webcam");
    // Reset to upload mode
    setVideoSource("upload");
  };

  // Handle uploaded file
  const handleFileUpload = async (file: File): Promise<void> => {
    if (!file.type.startsWith("video/")) {
      alert("Please upload a valid video file (.mp4)");
      return;
    }

    setVideoSource("upload");
    pause();
    stopAllMediaTracks();

    // Clear all canvases to avoid leaving webcam frames visible
    const clearCanvases = () => {
      const edgeCanvas = edgeDetectionCanvasRef.current;
      if (edgeCanvas) {
        const ctx = edgeCanvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, edgeCanvas.width, edgeCanvas.height);
        }
      }

      const dataCanvas = processDataCanvasRef.current;
      if (dataCanvas) {
        const ctx = dataCanvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, dataCanvas.width, dataCanvas.height);
        }
      }
    };

    clearCanvases();

    // Clean up previous file URL if it exists
    if (uploadedFileUrl) {
      URL.revokeObjectURL(uploadedFileUrl);
    }

    const fileUrl = URL.createObjectURL(file);
    setUploadedFileUrl(fileUrl);

    // Add a small delay before changing source to ensure webcam is fully stopped
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Now change to file source after explicitly stopping the webcam
    try {
      await changeSource({
        type: "file",
        url: fileUrl,
      });
    } catch (error) {
      console.error("Error changing source:", error);
    }

    // Small delay before starting playback to allow video element to fully update
    await new Promise((resolve) => setTimeout(resolve, 100));

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
    isFileUploaded,
    setIsFileUploaded,
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
