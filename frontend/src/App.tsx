import VideoPlayer from "@/components/video/video-player";
import Controls from "@/components/settings/controls";
import { EdgeDetectionProvider } from "@/providers/edge-detection-provider";

export default function EdgeDetectionApp() {
  return (
    <EdgeDetectionProvider>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6 self-center">Edge Detection</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <VideoPlayer />
          </div>

          <div>
            <Controls />
          </div>
        </div>
      </div>
    </EdgeDetectionProvider>
  );
}
