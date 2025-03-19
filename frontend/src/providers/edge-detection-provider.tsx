import {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
  RefObject,
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

  const [videoSource, setVideoSource] = useState("sample");

  const toggleEdgeDetection = () => {
    setEdgeDetectionEnabled((prev) => !prev);
  };

  const handleVideoSourceChange = (source: string) => {
    setVideoSource(source);

    if (source === "webcam") {
      switchToCamera();
    } else if (source === "sample") {
      switchToFileVideo();
    }
  };

  // Switch to camera source
  const switchToCamera = async () => {
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
    changeSource({
      type: "file",
      url: "/test.mp4",
    });
  };

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
