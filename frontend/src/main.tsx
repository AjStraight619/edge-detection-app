import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import EdgeDetectionApp from "./App.tsx";
import { ThemeProvider } from "./providers/theme-provider.tsx";
import { SettingsProvider } from "./providers/settings-provider.tsx";
import { VideoProvider } from "./providers/video-provider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="theme">
      <SettingsProvider>
        <VideoProvider>
          <EdgeDetectionApp />
        </VideoProvider>
      </SettingsProvider>
    </ThemeProvider>
  </StrictMode>
);
