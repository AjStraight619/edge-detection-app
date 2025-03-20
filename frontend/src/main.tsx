import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import EdgeDetectionApp from "./App.tsx";
import { ThemeProvider } from "./providers/theme-provider.tsx";
import { EdgeDetectionProvider } from "./providers/edge-detection-provider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="theme">
      <EdgeDetectionProvider>
        <EdgeDetectionApp />
      </EdgeDetectionProvider>
    </ThemeProvider>
  </StrictMode>
);
