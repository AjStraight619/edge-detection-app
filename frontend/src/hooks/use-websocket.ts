import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { WS_URL } from "@/lib/constants";
// Singleton socket instance
let globalSocketInstance: Socket | null = null;

export function useWebSocket(url: string = WS_URL) {
  const [connectionStatus, setConnectionStatus] =
    useState<string>("disconnected");
  const socketRef = useRef<Socket | null>(null);

  // Connect to socket
  const connectSocket = useCallback(() => {
    // Force new connection to clear old state
    if (globalSocketInstance) {
      globalSocketInstance.disconnect();
      globalSocketInstance = null;
    }

    if (!globalSocketInstance) {
      // Create a single shared socket instance
      globalSocketInstance = io(url, {
        reconnectionAttempts: 5,
        timeout: 10000,
        transports: ["websocket", "polling"],
        forceNew: true, // Force new connection
        reconnection: true,
      });
    }

    socketRef.current = globalSocketInstance;

    // If already connected, update status
    if (socketRef.current && socketRef.current.connected) {
      setConnectionStatus("connected");
    }

    return socketRef.current;
  }, [url]);

  // Disconnect from socket (doesn't destroy the socket, just removes listeners)
  const disconnectSocket = useCallback(() => {
    if (!socketRef.current) return;

    // Only remove processed_frame listeners to maintain the connection
    // but stop receiving frame updates
    socketRef.current.off("processed_frame");
  }, []);

  // Setup socket connection
  useEffect(() => {
    // Initialize the socket on mount
    const socket = connectSocket();

    // Make sure socket exists and is connected
    if (socket && !socket.connected) {
      socket.connect();
    }

    // Set up component-specific handlers for status updates
    const onConnect = () => {
      setConnectionStatus("connected");
    };

    const onConnectError = (err: Error) => {
      setConnectionStatus("error: " + err.message);
    };

    const onDisconnect = () => {
      setConnectionStatus("disconnected");

      // Attempt to reconnect if disconnected unexpectedly
      if (socketRef.current) {
        socketRef.current.connect();
      }
    };

    // Check initial connection state
    if (socketRef.current && socketRef.current.connected) {
      setConnectionStatus("connected");
    } else {
      setConnectionStatus("disconnected");
    }

    // Register component-specific listeners
    if (socketRef.current) {
      socketRef.current.on("connect", onConnect);
      socketRef.current.on("connect_error", onConnectError);
      socketRef.current.on("disconnect", onDisconnect);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off("connect", onConnect);
        socketRef.current.off("connect_error", onConnectError);
        socketRef.current.off("disconnect", onDisconnect);
        socketRef.current.off("error");
      }
    };
  }, [connectSocket]);

  return {
    socketRef,
    connectionStatus,
    setConnectionStatus,
    connectSocket,
    disconnectSocket,
  };
}
