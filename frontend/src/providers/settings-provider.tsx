import { createContext, useContext, useState, ReactNode } from "react";

type SettingsContextType = {
  isEdgeDetectionEnabled: boolean;
  sensitivity: number[];
  edgeColor: string;
  setIsEdgeDetectionEnabled: (enabled: boolean) => void;
  setSensitivity: (sensitivity: number[]) => void;
  setEdgeColor: (color: string) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [isEdgeDetectionEnabled, setIsEdgeDetectionEnabled] = useState(false);
  const [sensitivity, setSensitivity] = useState([50]);
  const [edgeColor, setEdgeColor] = useState("red");

  return (
    <SettingsContext.Provider
      value={{
        isEdgeDetectionEnabled,
        sensitivity,
        edgeColor,
        setIsEdgeDetectionEnabled,
        setSensitivity,
        setEdgeColor,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);

  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }

  return context;
}
