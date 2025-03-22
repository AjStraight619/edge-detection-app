import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useVideo as useVideoHook, VideoSource } from "@/hooks/use-video";

type VideoContextType = {
  // Video refs
  videoRef: React.RefObject<HTMLVideoElement | null>;

  // Video state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  currentSource: VideoSource;

  // Video controls
  play: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;

  // Source management
  changeSource: (source: VideoSource) => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  switchToCamera: () => Promise<void>;
  stopCamera: () => void;
  handleFileLoaded: () => void;
};

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: ReactNode }) {
  const {
    videoRef,
    isPlaying,
    duration,
    currentTime,
    play,
    pause,
    toggle,
    reset,
    changeSource,
    source: currentSource,
  } = useVideoHook();

  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  const stopAllMediaTracks = useCallback(() => {
    const video = videoRef.current;
    if (video && video.srcObject) {
      try {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach((track) => {
          track.stop();
        });
        video.srcObject = null;

        if (process.env.NODE_ENV === "development") {
          console.log("[Debug] Camera tracks stopped");
        }
      } catch (err) {
        console.error("Error stopping camera:", err);
      }
    }
  }, [videoRef]);

  const stopCamera = useCallback(() => {
    stopAllMediaTracks();

    // Change to empty state
    changeSource({
      type: "file",
      url: "",
    }).catch((e: unknown) => {
      console.error("Error changing source after stopping camera:", e);
    });

    pause();
  }, [stopAllMediaTracks, changeSource, pause]);

  const switchToCamera = useCallback(async () => {
    stopAllMediaTracks();

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

    play();
  }, [stopAllMediaTracks, changeSource, play]);

  const uploadFile = useCallback(
    async (file: File): Promise<void> => {
      if (!file.type.startsWith("video/")) {
        alert("Please upload a valid video file (.mp4)");
        return;
      }

      pause();
      stopAllMediaTracks();

      // Clean up previous file URL
      if (uploadedFileUrl) {
        URL.revokeObjectURL(uploadedFileUrl);
      }

      const fileUrl = URL.createObjectURL(file);
      setUploadedFileUrl(fileUrl);

      try {
        await changeSource({
          type: "file",
          url: fileUrl,
        });

        // Give the video element time to load
        await new Promise((resolve) => setTimeout(resolve, 100));
        play();
      } catch (error) {
        console.error("Error changing to file source:", error);
      }
    },
    [pause, stopAllMediaTracks, uploadedFileUrl, changeSource, play]
  );

  const handleFileLoaded = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // For uploaded videos, we auto-play once loaded
    if (currentSource.type === "file" && video.paused) {
      play();
    }
  }, [videoRef, currentSource, play]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (uploadedFileUrl) {
        URL.revokeObjectURL(uploadedFileUrl);
      }
      stopAllMediaTracks();
    };
  }, [uploadedFileUrl, stopAllMediaTracks]);

  const value = useMemo(
    () => ({
      videoRef,
      isPlaying,
      currentTime,
      duration,
      currentSource,
      play,
      pause,
      toggle,
      reset,
      changeSource,
      uploadFile,
      switchToCamera,
      stopCamera,
      handleFileLoaded,
    }),
    [
      videoRef,
      isPlaying,
      currentTime,
      duration,
      currentSource,
      play,
      pause,
      toggle,
      reset,
      changeSource,
      uploadFile,
      switchToCamera,
      stopCamera,
      handleFileLoaded,
    ]
  );

  return (
    <VideoContext.Provider value={value}>{children}</VideoContext.Provider>
  );
}

export function useVideo() {
  const context = useContext(VideoContext);

  if (context === undefined) {
    throw new Error("useVideo must be used within a VideoProvider");
  }

  return context;
}

// Utility function for formatting time
export function formatTime(time: number): string {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}
