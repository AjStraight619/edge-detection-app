import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Video } from "lucide-react";
import SettingsTab from "@/components/settings/settings-tab";
import SourceTab from "@/components/settings/source-tab";
import { useEdgeDetectionContext } from "@/providers/edge-detection-provider";

export default function Controls() {
  const {
    isEdgeDetectionEnabled,
    setEdgeDetectionEnabled,
    sensitivity,
    setSensitivity,
    edgeColor,
    setEdgeColor,
    videoSource,
    handleVideoSourceChange,
  } = useEdgeDetectionContext();

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
        />
      </TabsContent>

      <TabsContent value="settings">
        <SettingsTab
          isEdgeDetectionEnabled={isEdgeDetectionEnabled}
          setEdgeDetectionEnabled={setEdgeDetectionEnabled}
          sensitivity={sensitivity}
          setSensitivity={setSensitivity}
          edgeColor={edgeColor}
          setEdgeColor={setEdgeColor}
        />
      </TabsContent>
    </Tabs>
  );
}
