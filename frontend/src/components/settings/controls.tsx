import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Video } from "lucide-react";
import SettingsTab from "@/components/settings/settings-tab";
import SourceTab from "@/components/settings/source-tab";

type ControlsPanelProps = {
  isPeakingEnabled: boolean;
  setIsPeakingEnabled: (enabled: boolean) => void;
  sensitivity: number[];
  setSensitivity: (sensitivity: number[]) => void;
  peakingColor: string;
  setPeakingColor: (color: string) => void;
  videoSource: string;
  handleVideoSourceChange: (source: string) => void;
};

export default function Controls({
  isPeakingEnabled,
  setIsPeakingEnabled,
  sensitivity,
  setSensitivity,
  peakingColor,
  setPeakingColor,
  videoSource,
  handleVideoSourceChange,
}: ControlsPanelProps) {
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
          isPeakingEnabled={isPeakingEnabled}
          setIsPeakingEnabled={setIsPeakingEnabled}
          sensitivity={sensitivity}
          setSensitivity={setSensitivity}
          peakingColor={peakingColor}
          setPeakingColor={setPeakingColor}
        />
      </TabsContent>
    </Tabs>
  );
}
