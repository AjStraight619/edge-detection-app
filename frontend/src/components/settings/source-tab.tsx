import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Video, Camera } from "lucide-react";

type SourceTabProps = {
  videoSource: string;
  handleVideoSourceChange: (source: string) => void;
};

export default function SourceTab({
  videoSource,
  handleVideoSourceChange,
}: SourceTabProps) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-2">
          <Label>Video Source</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={videoSource === "sample" ? "default" : "outline"}
              className="w-full"
              onClick={() => handleVideoSourceChange("sample")}
            >
              <Video className="w-4 h-4 mr-2" />
              Sample Video
            </Button>
            <Button
              variant={videoSource === "webcam" ? "default" : "outline"}
              className="w-full"
              onClick={() => handleVideoSourceChange("webcam")}
            >
              <Camera className="w-4 h-4 mr-2" />
              Webcam
            </Button>
          </div>
        </div>

        {videoSource === "sample" && (
          <div className="space-y-2">
            <Label>Sample Video</Label>
            <p className="text-sm text-muted-foreground">
              Using the provided sample video with camera focus changes.
            </p>
          </div>
        )}

        {videoSource === "webcam" && (
          <div className="space-y-2">
            <Label>Webcam Access</Label>
            <p className="text-sm text-muted-foreground">
              Please allow camera access when prompted to use your webcam as the
              video source.
            </p>
            <Button className="w-full">Enable Webcam</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
