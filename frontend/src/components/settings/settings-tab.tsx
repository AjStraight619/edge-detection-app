import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

type SettingsTabProps = {
  isEdgeDetectionEnabled: boolean;
  setEdgeDetectionEnabled: (enabled: boolean) => void;
  sensitivity: number[];
  setSensitivity: (sensitivity: number[]) => void;
  edgeColor: string;
  setEdgeColor: (color: string) => void;
};

export default function SettingsTab({
  isEdgeDetectionEnabled,
  setEdgeDetectionEnabled,
  edgeColor,
  setEdgeColor,
}: SettingsTabProps) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="edge-detection-toggle">Edge Detection</Label>
            <p className="text-sm text-muted-foreground">
              Highlight areas in sharp focus
            </p>
          </div>
          <Switch
            id="edge-detection-toggle"
            checked={isEdgeDetectionEnabled}
            onCheckedChange={setEdgeDetectionEnabled}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              {/* <Label htmlFor="sensitivity">Sensitivity</Label> */}
              {/* <span className="text-sm text-muted-foreground">
                {sensitivity}%
              </span> */}
            </div>
            {/* <Slider
              id="sensitivity"
              min={0}
              max={100}
              step={1}
              value={sensitivity}
              onValueChange={setSensitivity}
            /> */}
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Edge Color</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={edgeColor === "red" ? "default" : "outline"}
                className="w-full"
                onClick={() => setEdgeColor("red")}
              >
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                Red
              </Button>
              <Button
                variant={edgeColor === "blue" ? "default" : "outline"}
                className="w-full"
                onClick={() => setEdgeColor("blue")}
              >
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                Blue
              </Button>
              <Button
                variant={edgeColor === "yellow" ? "default" : "outline"}
                className="w-full"
                onClick={() => setEdgeColor("yellow")}
              >
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                Yellow
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
