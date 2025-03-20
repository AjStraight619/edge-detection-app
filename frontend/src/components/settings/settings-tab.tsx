import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { COLOR_OPTIONS } from "@/lib/constants";
import { capitalizeFirstLetter } from "@/lib/utils";

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
  sensitivity,
  setSensitivity,
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
              <Label htmlFor="sensitivity">Sensitivity</Label>
              <span className="text-sm text-muted-foreground">
                {sensitivity[0]}%
              </span>
            </div>
            <Slider
              id="sensitivity"
              min={0}
              max={100}
              step={1}
              value={sensitivity}
              onValueChange={setSensitivity}
              disabled={!isEdgeDetectionEnabled}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Adjust to control the sensitivity of edge detection
            </p>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Edge Color</Label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_OPTIONS.map((color) => (
                <ColorButton
                  key={color}
                  edgeColor={edgeColor}
                  color={color}
                  onClick={() => setEdgeColor(color)}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ColorButton({
  color,
  edgeColor,
  onClick,
}: {
  color: string;
  edgeColor: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant={color === edgeColor ? "default" : "outline"}
      className="w-full"
      onClick={onClick}
    >
      <div
        style={{ backgroundColor: color }}
        className="w-3 h-3 rounded-full mr-2"
      ></div>
      {capitalizeFirstLetter(color)}
    </Button>
  );
}
