import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import EdgeDetectionApp from "./App.tsx";
import { ThemeProvider } from "./providers/theme-provider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="theme">
      <EdgeDetectionApp />
    </ThemeProvider>
  </StrictMode>
);
