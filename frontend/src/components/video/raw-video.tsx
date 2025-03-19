import { useEffect, type RefObject } from "react";

type RawVideoProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  isEdgeDetectionEnabled: boolean;
};

export default function RawVideo({
  videoRef,
  isEdgeDetectionEnabled,
}: RawVideoProps) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
  }, [videoRef]);

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 w-full h-full object-contain"
      style={{
        opacity: isEdgeDetectionEnabled ? 0 : 1,
        visibility: isEdgeDetectionEnabled ? "hidden" : "visible",
        display: isEdgeDetectionEnabled ? "none" : "block",
        zIndex: 1,
      }}
      src="/test.mp4"
      loop
      muted
    />
  );
}
