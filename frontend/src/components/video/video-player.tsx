import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Pause, Play, RefreshCw, Settings } from "lucide-react";
import { useVideo } from "@/providers/video-provider";
import { useSettings } from "@/providers/settings-provider";
import { EdgeDetectionOverlay } from "./edge-detection-overlay";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatTime } from "@/providers/video-provider";

export function VideoPlayer({
  onOpenControls,
}: {
  onOpenControls?: () => void;
}) {
  const {
    videoRef,
    currentTime,
    duration,
    reset,
    toggle,
    currentSource,
    isPlaying,
    play,
  } = useVideo();

  const { isEdgeDetectionEnabled, setIsEdgeDetectionEnabled } = useSettings();

  const isMobile = useMediaQuery("(max-width: 1023px)");

  // Video source URL based on currentSource
  const videoSrc =
    currentSource.type === "file" && currentSource.url
      ? currentSource.url
      : undefined;

  // Toggle edge detection
  const toggleEdgeDetection = () => {
    setIsEdgeDetectionEnabled(!isEdgeDetectionEnabled);
  };

  // Keep isPlaying state in sync with video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Force play for webcam sources
    if (currentSource.type === "camera" && !isPlaying) {
      if (process.env.NODE_ENV === "development") {
        console.log("[Debug] Forcing webcam to play state");
      }
      play();
    }

    // Play the video when loaded for file sources
    const handleCanPlay = () => {
      if (currentSource.type === "file" && video.paused) {
        play();
      }
    };

    // Add debug log for webcam sources
    if (currentSource.type === "camera") {
      // For webcam, we need to ensure it starts playing immediately
      if (video.paused) {
        if (process.env.NODE_ENV === "development") {
          console.log("[Debug] Auto-playing webcam source");
        }
        // Add a small delay before auto-playing to prevent race conditions
        setTimeout(() => {
          // Check if the component is still mounted and video still needs to play
          if (video && video.paused && currentSource.type === "camera") {
            video.play().catch((err) => {
              // Ignore AbortError as it's usually due to component lifecycle
              if (err.name !== "AbortError") {
                console.error("Failed to auto-play webcam:", err);
              }
            });
          }
        }, 300);
      }
    }

    video.addEventListener("canplay", handleCanPlay);

    // Debug the isPlaying state for the current source
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[Debug] Video state: isPlaying=${isPlaying}, source=${currentSource.type}, paused=${video.paused}, readyState=${video.readyState}`
      );
    }

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [videoRef, currentSource, play, isPlaying]);

  // Check if we have a loaded video
  const hasLoadedVideo =
    (currentSource.type === "file" && !!currentSource.url) ||
    (currentSource.type === "camera" && videoRef.current?.srcObject !== null);

  const showPlaceholder = !hasLoadedVideo;

  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="p-0 relative">
        <div className="relative aspect-video bg-black">
          {/* Main video element */}
          <video
            ref={videoRef}
            {...(videoSrc ? { src: videoSrc } : {})}
            className="w-full h-full object-contain"
            onClick={toggle}
            playsInline
          />

          {/* CRITICAL: Always mount the overlay but conditionally show it. This prevents re-mounting */}
          <EdgeDetectionOverlay />

          {/* Placeholder when no video is loaded */}
          {showPlaceholder && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-40 p-6 text-center">
              <h3 className="text-xl font-semibold text-muted-foreground mb-2">
                No Video Source Selected
              </h3>
              <p className="text-muted mb-6 max-w-md">
                Please use the controls panel to upload a video or enable your
                webcam
              </p>
              {isMobile && onOpenControls && (
                <Button onClick={onOpenControls} className="mt-2">
                  <Settings className="w-4 h-4 mr-2" />
                  Open Controls
                </Button>
              )}
            </div>
          )}

          {/* Video controls */}
          {hasLoadedVideo && (
            <VideoControls
              isEdgeDetectionEnabled={isEdgeDetectionEnabled}
              isPlaying={isPlaying}
              togglePlayPause={toggle}
              toggleEdgeDetection={toggleEdgeDetection}
              resetVideo={reset}
              currentSource={currentSource.type}
              duration={duration}
              currentTime={currentTime}
              formatTime={formatTime}
              onOpenControls={onOpenControls}
              isMobile={isMobile}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PlayPauseButton({
  isPlaying,
  togglePlayPause,
}: {
  isPlaying: boolean;
  togglePlayPause: () => void;
}) {
  return (
    <Button variant="secondary" size="icon" onClick={togglePlayPause}>
      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
    </Button>
  );
}

type VideoControlsProps = {
  isEdgeDetectionEnabled: boolean;
  isPlaying: boolean;
  togglePlayPause: () => void;
  toggleEdgeDetection: () => void;
  resetVideo: () => void;
  currentSource: string;
  duration: number;
  currentTime: number;
  formatTime: (time: number) => string;
  onOpenControls?: () => void;
  isMobile?: boolean;
};

function VideoControls({
  isPlaying,
  togglePlayPause,
  isEdgeDetectionEnabled,
  toggleEdgeDetection,
  resetVideo,
  currentSource,
  duration,
  currentTime,
  formatTime,
  onOpenControls,
  isMobile,
}: VideoControlsProps) {
  const isLiveWebcam = currentSource === "camera";

  return (
    <>
      <div className="absolute bottom-14 left-4 right-4 h-1 bg-gray-700 rounded-full overflow-hidden z-50">
        <div
          className="h-full bg-primary"
          style={{
            width: `${isLiveWebcam ? 100 : (currentTime / duration) * 100}%`,
          }}
        />
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 z-50">
        {isLiveWebcam ? (
          <div className="flex items-center gap-2 text-xs text-white bg-black/50 px-3 py-2 rounded">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span>LIVE</span>
          </div>
        ) : (
          <>
            <PlayPauseButton
              isPlaying={isPlaying}
              togglePlayPause={togglePlayPause}
            />
            <Button variant="secondary" size="icon" onClick={resetVideo}>
              <RefreshCw className="w-5 h-5" />
            </Button>
            <div className="text-xs text-white bg-black/50 px-2 py-1 rounded">
              {`${formatTime(currentTime)} / ${formatTime(duration)}`}
            </div>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Edge detection toggle */}
          <Button
            variant={isEdgeDetectionEnabled ? "default" : "outline"}
            onClick={toggleEdgeDetection}
            className="gap-2"
            size="sm"
          >
            {isEdgeDetectionEnabled ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {isEdgeDetectionEnabled ? "Hide Edges" : "Show Edges"}
            </span>
          </Button>

          {/* Settings button for mobile */}
          {isMobile && onOpenControls && (
            <Button variant="secondary" size="icon" onClick={onOpenControls}>
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
