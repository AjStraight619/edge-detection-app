import { useState, useEffect, useRef, useCallback } from "react";

export type VideoSource = {
  type: "file" | "camera" | "stream";
  url?: string; // For file or stream URL
  constraints?: MediaStreamConstraints; // For camera
};

export type VideoState = {
  isPlaying: boolean;
  isReady: boolean;
  isLoading: boolean;
  duration: number;
  currentTime: number;
  error: string | null;
};

/**
 * Might not need useCallback hooks because we are using React 19. However, using them for now to avoid potential issues.
 */
export function useVideo(initialSource?: VideoSource) {
  // Create a ref for the video element
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // State for source management
  const [source, setSource] = useState<VideoSource>(
    initialSource || { type: "file", url: "/test.mp4" }
  );

  // Video state management
  const [videoState, setVideoState] = useState<VideoState>({
    isPlaying: false,
    isReady: false,
    isLoading: true,
    duration: 0,
    currentTime: 0,
    error: null,
  });

  // Media stream for camera sources
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Play/pause methods
  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Try to play and catch any errors
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setVideoState((prev) => ({ ...prev, isPlaying: true }));
        })
        .catch((error) => {
          console.error("Error playing video:", error);
          setVideoState((prev) => ({
            ...prev,
            isPlaying: false,
            error: "Failed to play video: " + error.message,
          }));
        });
    }
  }, []);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.pause();
    setVideoState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const toggle = useCallback(() => {
    if (videoState.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [videoState.isPlaying, play, pause]);

  // Seek to a specific time
  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(time, video.duration || 0));
  }, []);

  // Reset video to beginning
  const reset = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    if (!videoState.isPlaying) {
      play();
    }
  }, [videoState.isPlaying, play]);

  // Change video source
  const changeSource = useCallback(
    async (newSource: VideoSource) => {
      // Clean up previous media stream if it exists
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        setMediaStream(null);
      }

      setSource(newSource);
      setVideoState((prev) => ({
        ...prev,
        isLoading: true,
        isReady: false,
        error: null,
      }));

      const video = videoRef.current;
      if (!video) return;

      // If camera source, set up media stream
      if (newSource.type === "camera") {
        try {
          // Clear any existing src before setting srcObject
          video.pause();
          video.src = "";
          video.srcObject = null;
          video.load();

          const constraints = newSource.constraints || {
            video: {
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              facingMode: "environment",
            },
          };

          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          setMediaStream(stream);

          // When we have a video element, set its srcObject to the stream
          video.srcObject = stream;

          setVideoState((prev) => ({
            ...prev,
            isLoading: false,
            isReady: true,
          }));

          // Let the loadedmetadata event trigger before trying to play
          video.addEventListener(
            "loadeddata",
            function onLoadedData() {
              video.removeEventListener("loadeddata", onLoadedData);
              setTimeout(() => {
                video
                  .play()
                  .catch((err) => console.error("Delayed play error:", err));
              }, 300);
            },
            { once: true }
          );
        } catch (err) {
          console.error("Error accessing camera:", err);
          setVideoState((prev) => ({
            ...prev,
            isLoading: false,
            error: `Failed to access camera: ${
              err instanceof Error ? err.message : String(err)
            }`,
          }));
        }
      } else if (newSource.type === "file" && newSource.url) {
        // For file sources, clear the srcObject and set src
        video.pause();
        video.srcObject = null;
        video.src = newSource.url;
        video.load();

        // Let the metadata load before playing
        video.addEventListener(
          "loadeddata",
          function onLoadedData() {
            video.removeEventListener("loadeddata", onLoadedData);
            video
              .play()
              .catch((err) => console.error("File video play error:", err));
          },
          { once: true }
        );
      }
    },
    [mediaStream, videoRef]
  );

  // Format time in MM:SS format
  const formatTime = useCallback((timeInSeconds: number): string => {
    if (isNaN(timeInSeconds)) return "00:00";

    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadStart = () => {
      setVideoState((prev) => ({ ...prev, isLoading: true, isReady: false }));
    };

    const handleLoadedMetadata = () => {
      setVideoState((prev) => ({
        ...prev,
        duration: video.duration,
        isReady: true,
        isLoading: false,
      }));
      console.log(`Video metadata loaded - Duration: ${video.duration}s`);
    };

    const handleTimeUpdate = () => {
      setVideoState((prev) => ({ ...prev, currentTime: video.currentTime }));
    };

    const handlePlay = () => {
      setVideoState((prev) => ({ ...prev, isPlaying: true }));
    };

    const handlePause = () => {
      setVideoState((prev) => ({ ...prev, isPlaying: false }));
    };

    const handleEnded = () => {
      setVideoState((prev) => ({ ...prev, isPlaying: false }));
    };

    const handleError = (e: Event) => {
      console.error("Video error:", e);
      setVideoState((prev) => ({
        ...prev,
        error: "Video error: " + (video.error?.message || "Unknown error"),
        isLoading: false,
      }));
    };

    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);

    // If video is already loaded, set duration immediately
    if (video.readyState >= 2) {
      setVideoState((prev) => ({
        ...prev,
        duration: video.duration,
        isReady: true,
        isLoading: false,
      }));
      console.log(`Video already loaded - Duration: ${video.duration}s`);
    }

    // Initial source setup
    if (source.type === "file" && source.url) {
      video.src = source.url;
    } else if (source.type === "camera" && !video.srcObject) {
      // Trigger camera setup
      changeSource(source);
    }

    return () => {
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);

      // Clean up media stream if component unmounts
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [source, changeSource, mediaStream]);

  return {
    videoRef,
    ...videoState,
    source,
    play,
    pause,
    toggle,
    seekTo,
    reset,
    changeSource,
    formatTime,
  };
}
