import type React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Video, Camera, Upload, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useRef, useState } from "react";

type SourceTabProps = {
  videoSource: string;
  handleVideoSourceChange: (source: string) => void;
  handleFileUpload: (file: File) => Promise<void>;
  stopWebcam: () => void;
};

export default function SourceTab({
  videoSource,
  handleVideoSourceChange,
  handleFileUpload,
  stopWebcam,
}: SourceTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Validate file type
      if (!file.type.includes("video/mp4")) {
        alert("Please select an MP4 video file.");
        return;
      }

      // If webcam is active, stop it first
      if (videoSource === "webcam") {
        stopWebcam();
      }

      setIsUploading(true);
      setUploadProgress(0);
      setUploadedFileName(file.name);
      setFileSize(formatFileSize(file.size));

      // Simulate upload progress
      const trackUploadProgress = async (file: File) => {
        const chunkSize = file.size / 100; // Divide file into 100 chunks for progress
        let uploadedSize = 0;

        const processChunk = () => {
          return new Promise<void>((resolve) => {
            // Simulate network delay based on file size
            const delay = Math.min(50, Math.max(10, file.size / 1000000));
            setTimeout(() => {
              uploadedSize += chunkSize;
              const progress = Math.min(
                95,
                Math.round((uploadedSize / file.size) * 100)
              );
              setUploadProgress(progress);
              resolve();
            }, delay);
          });
        };

        for (let i = 0; i < 95; i++) {
          await processChunk();
        }

        await handleFileUpload(file);

        // Complete the progress
        setUploadProgress(100);
        setTimeout(() => {
          setIsUploading(false);
        }, 500);
      };

      await trackUploadProgress(file);
    }
  };

  function clearUploadedFile() {
    setUploadedFileName("");
    setFileSize("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    handleVideoSourceChange("upload");
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-2">
          <Label>Video Source</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={videoSource === "upload" ? "default" : "outline"}
              className="w-full"
              onClick={() => {
                // If webcam is active, explicitly stop it
                if (videoSource === "webcam") {
                  stopWebcam();
                }
                handleVideoSourceChange("upload");
                triggerFileUpload();
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
            <Button
              variant={videoSource === "webcam" ? "destructive" : "outline"}
              className="w-full"
              onClick={() => {
                if (videoSource === "webcam") {
                  // Explicitly stop webcam when clicking stop
                  stopWebcam();
                  handleVideoSourceChange("upload");
                } else {
                  handleVideoSourceChange("webcam");
                }
              }}
            >
              <Camera className="w-4 h-4 mr-2" />
              {videoSource === "webcam" ? "Stop Webcam" : "Webcam"}
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="video/mp4"
              onChange={onFileSelected}
            />
          </div>
        </div>

        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Uploading MP4 Video: {uploadedFileName}</Label>
              <span className="text-xs text-muted-foreground">
                {uploadProgress}%
              </span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{fileSize}</span>
              <span>
                {Math.round((uploadProgress * Number.parseInt(fileSize)) / 100)}{" "}
                of {fileSize}
              </span>
            </div>
          </div>
        )}

        {videoSource === "upload" && !isUploading && (
          <div className="space-y-2">
            <Label>Uploaded Media</Label>
            {uploadedFileName ? (
              <div className="p-3 border rounded-md bg-muted/30 relative">
                <div className="absolute top-0 right-0">
                  <Button
                    onClick={clearUploadedFile}
                    variant="ghost"
                    size="icon"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    {uploadedFileName}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {fileSize}
                </div>
              </div>
            ) : (
              <div className="p-4 border rounded-md bg-muted/30 flex flex-col items-center justify-center">
                <p className="text-sm text-muted-foreground mb-2">
                  No file selected
                </p>
                <Button size="sm" onClick={triggerFileUpload}>
                  <Upload className="w-4 h-4 mr-2" />
                  Select MP4 File
                </Button>
              </div>
            )}
            {uploadedFileName && (
              <>
                <p className="text-sm text-muted-foreground mt-2">
                  Your uploaded media is now being used for edge detection.
                </p>
                <Button className="w-full mt-2" onClick={triggerFileUpload}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Another File
                </Button>
              </>
            )}
          </div>
        )}

        {videoSource === "webcam" && (
          <div className="space-y-2">
            <Label>Webcam Access</Label>
            <p className="text-sm text-muted-foreground">
              Please allow camera access when prompted to use your webcam as the
              video source.
            </p>
            <Button
              className="w-full"
              onClick={() => handleVideoSourceChange("webcam")}
            >
              Restart Webcam
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
