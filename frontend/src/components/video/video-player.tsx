import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, EyeOff, Pause, Play, RefreshCw } from "lucide-react";
import EdgeDetectionOverlay from "@/components/video/edge-detection-overlay";
import RawVideo from "@/components/video/raw-video";
import { useEdgeDetectionContext } from "@/providers/edge-detection-provider";

export default function VideoPlayer() {
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
  } = useEdgeDetectionContext();

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
          />
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
        </div>
      </div>
    </>
  );
}
