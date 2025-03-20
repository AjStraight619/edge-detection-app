import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Capitalizes the first letter of a string
 */
export const capitalizeFirstLetter = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

/**
 * Draws an image to a canvas, resizing the canvas if needed
 */
export const drawImageToCanvas = (
  canvas: HTMLCanvasElement,
  img: HTMLImageElement
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Set dimensions to match the image
  if (canvas.width !== img.width || canvas.height !== img.height) {
    canvas.width = img.width;
    canvas.height = img.height;
  }

  // Draw the image to the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
};

/**
 * Clears a canvas with the specified dimensions
 */
export const clearCanvas = (canvas: HTMLCanvasElement | null) => {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
};

/**
 * Formats time in seconds to MM:SS format
 */
export const formatTime = (timeInSeconds: number): string => {
  if (isNaN(timeInSeconds)) return "00:00";

  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

export const clearCanvases = (
  edgeDetectionCanvas: HTMLCanvasElement,
  processDataCanvas: HTMLCanvasElement
) => {
  clearCanvas(edgeDetectionCanvas);
  clearCanvas(processDataCanvas);
};
