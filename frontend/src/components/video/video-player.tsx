import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Pause, Play, RefreshCw, Settings } from "lucide-react";
import EdgeDetectionOverlay from "@/components/video/edge-detection-overlay";
import RawVideo from "@/components/video/raw-video";
import { useEdgeDetectionContext } from "@/providers/edge-detection-provider";
import { useMediaQuery } from "@/hooks/use-media-query";

type VideoPlayerProps = {
  onOpenControls?: () => void;
};

export default function VideoPlayer({ onOpenControls }: VideoPlayerProps) {
  const {
    videoRef,
    processDataCanvasRef,
    edgeDetectionCanvasRef,
    isPlaying,
    isEdgeDetectionEnabled,
    edgeColor,
    duration,
    currentTime,
    formatTime,
    toggle,
    reset,
    currentSource,
    toggleEdgeDetection,
    isFileUploaded,
  } = useEdgeDetectionContext();

  const isMobile = useMediaQuery("(max-width: 1023px)");

  const showPlaceholder =
    !isPlaying && currentSource.type === "file" && !currentSource.url;

  return (
    <Card className="w-full overflow-hidden">
      <CardContent className="p-0 relative">
        <div className="relative aspect-video bg-black">
          <canvas
            ref={processDataCanvasRef}
            style={{ display: "none" }}
            width="640"
            height="480"
          />
          <RawVideo
            videoRef={videoRef}
            isEdgeDetectionEnabled={isEdgeDetectionEnabled}
          />

          <div style={{ display: isEdgeDetectionEnabled ? "block" : "none" }}>
            <EdgeDetectionOverlay
              videoRef={videoRef}
              processDataCanvasRef={processDataCanvasRef}
              edgeDetectionCanvasRef={edgeDetectionCanvasRef}
              isPlaying={isPlaying}
              edgeColor={edgeColor}
            />
          </div>

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

          {/* Only show controls if we have a video playing */}
          {!isFileUploaded && isPlaying && (
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
  return (
    <>
      <div className="absolute bottom-14 left-4 right-4 h-1 bg-gray-700 rounded-full overflow-hidden z-50">
        <div
          className="h-full bg-primary"
          style={{
            width: `${
              currentSource === "camera" ? 100 : (currentTime / duration) * 100
            }%`,
          }}
        />
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 z-50">
        <PlayPauseButton
          isPlaying={isPlaying}
          togglePlayPause={togglePlayPause}
        />

        <Button variant="secondary" size="icon" onClick={resetVideo}>
          <RefreshCw className="w-5 h-5" />
        </Button>

        <div className="text-xs text-white bg-black/50 px-2 py-1 rounded">
          {currentSource === "camera"
            ? "LIVE"
            : `${formatTime(currentTime)} / ${formatTime(duration)}`}
        </div>

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
