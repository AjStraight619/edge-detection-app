import { VideoPlayer } from "@/components/video/video-player";
import Controls from "@/components/settings/controls";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";

export default function EdgeDetectionApp() {
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 1023px)");

  return (
    <div className="container mx-auto py-4 px-4 md:py-8 relative min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-center sm:text-left">
        Focus Peaking
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VideoPlayer onOpenControls={() => setIsControlsOpen(true)} />
        </div>

        {isMobile ? (
          <MobileControls
            isOpen={isControlsOpen}
            onOpenChange={setIsControlsOpen}
          />
        ) : (
          <div className="lg:sticky lg:top-4">
            <Controls />
          </div>
        )}
      </div>
    </div>
  );
}

function MobileControls({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] p-0 rounded-t-xl">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Controls</SheetTitle>
          <SheetClose className="absolute right-4 top-4 rounded-full" />
        </SheetHeader>
        <div className="overflow-y-auto p-4 h-full">
          <Controls />
        </div>
      </SheetContent>
    </Sheet>
  );
}
