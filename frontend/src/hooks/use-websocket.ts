import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export function useWebSocket(url: string = "http://localhost:8000") {
  const [connectionStatus, setConnectionStatus] =
    useState<string>("disconnected");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Only create the socket once
    if (!socketRef.current) {
      console.log("Creating new socket connection");
      const socket = io(url, {
        reconnectionAttempts: 5,
        timeout: 10000,
        transports: ["websocket", "polling"],
        forceNew: true,
      });

      socketRef.current = socket;

      // Set up persistent socket event handlers
      socket.on("connect", () => {
        console.log("Connected to server!");
        setConnectionStatus("connected");

        // Listen for errors
        socket.on("error", (data) => {
          console.error("Server error:", data);
        });
      });

      socket.on("connect_error", (err) => {
        console.error("Connection error:", err);
        setConnectionStatus("error: " + err.message);
      });

      socket.on("disconnect", () => {
        console.log("Disconnected from server");
        setConnectionStatus("disconnected");
      });

      // Handle errors from server
      socket.on("error", (error) => {
        console.error("Server error:", error);
        setConnectionStatus("server error");
      });
    }
  }, [url]);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log("Component unmounting - disconnecting socket");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    socketRef,
    connectionStatus,
    setConnectionStatus,
  };
}
