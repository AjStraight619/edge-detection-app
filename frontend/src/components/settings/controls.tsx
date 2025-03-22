import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Video } from "lucide-react";
import SettingsTab from "@/components/settings/settings-tab";
import SourceTab from "@/components/settings/source-tab";
import { useVideo } from "@/providers/video-provider";
import { useSettings } from "@/providers/settings-provider";

export default function Controls() {
  const {
    currentSource,
    switchToCamera,
    stopCamera: stopWebcam,
    uploadFile,
  } = useVideo();

  const {
    isEdgeDetectionEnabled,
    setIsEdgeDetectionEnabled,
    sensitivity,
    setSensitivity,
    edgeColor,
    setEdgeColor,
  } = useSettings();

  // For UI display, we use a simpler source type string
  const [videoSource, setVideoSource] = useState<string>(
    currentSource.type === "camera" ? "webcam" : "upload"
  );

  // Keep videoSource in sync with currentSource
  useEffect(() => {
    setVideoSource(currentSource.type === "camera" ? "webcam" : "upload");
  }, [currentSource]);

  const handleVideoSourceChange = (source: string) => {
    setVideoSource(source);
    if (source === "webcam") {
      switchToCamera();
    } else if (source === "upload" && videoSource === "webcam") {
      // Stop webcam when switching from webcam to upload
      stopWebcam();
    }
  };

  return (
    <Tabs defaultValue="source">
      <TabsList className="grid grid-cols-2 mb-4">
        <TabsTrigger value="source">
          <Video className="w-4 h-4 mr-2" />
          Source
        </TabsTrigger>
        <TabsTrigger value="settings">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="source">
        <SourceTab
          videoSource={videoSource}
          handleVideoSourceChange={handleVideoSourceChange}
          handleFileUpload={uploadFile}
          stopWebcam={stopWebcam}
        />
      </TabsContent>

      <TabsContent value="settings">
        <SettingsTab
          isEdgeDetectionEnabled={isEdgeDetectionEnabled}
          setEdgeDetectionEnabled={setIsEdgeDetectionEnabled}
          sensitivity={sensitivity}
          setSensitivity={setSensitivity}
          edgeColor={edgeColor}
          setEdgeColor={setEdgeColor}
        />
      </TabsContent>
    </Tabs>
  );
}
