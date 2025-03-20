import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { WS_URL } from "@/lib/constants";
// Singleton socket instance
let globalSocketInstance: Socket | null = null;

export function useWebSocket(url: string = WS_URL) {
  const [connectionStatus, setConnectionStatus] =
    useState<string>("disconnected");
  const socketRef = useRef<Socket | null>(null);

  // Setup socket connection
  useEffect(() => {
    // If we already have a global socket instance, reuse it
    if (!globalSocketInstance) {
      // Create a single shared socket instance
      globalSocketInstance = io(url, {
        reconnectionAttempts: 5,
        timeout: 10000,
        transports: ["websocket", "polling"],
        forceNew: false, // Reuse connection
        reconnection: true,
      });
    }

    socketRef.current = globalSocketInstance;

    // Set up component-specific handlers for status updates
    const onConnect = () => {
      setConnectionStatus("connected");
    };

    const onConnectError = (err: Error) => {
      setConnectionStatus("error: " + err.message);
    };

    const onDisconnect = () => {
      setConnectionStatus("disconnected");
    };

    // Check initial connection state
    if (socketRef.current.connected) {
      setConnectionStatus("connected");
    } else {
      setConnectionStatus("disconnected");
    }

    // Register component-specific listeners
    socketRef.current.on("connect", onConnect);
    socketRef.current.on("connect_error", onConnectError);
    socketRef.current.on("disconnect", onDisconnect);

    return () => {
      if (socketRef.current) {
        socketRef.current.off("connect", onConnect);
        socketRef.current.off("connect_error", onConnectError);
        socketRef.current.off("disconnect", onDisconnect);
      }
    };
  }, [url]);

  return {
    socketRef,
    connectionStatus,
    setConnectionStatus,
  };
}
