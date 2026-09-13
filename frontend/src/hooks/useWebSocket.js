import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(url) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    console.log(`[WS] Attempting to connect to ${url}...`);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(' Connected to Void Matrix (WebSocket)');
      setIsConnected(true);
      reconnectAttempts.current = 0; // Reset attempts on success
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev, data]);
      } catch (err) {
        console.error('[WS] Failed to parse message:', event.data);
      }
    };

    ws.onclose = () => {
      console.log(' Disconnected from Matrix');
      setIsConnected(false);
      wsRef.current = null;

      // The Auto-Healing Mechanism (Exponential Backoff)
      if (reconnectAttempts.current < maxReconnectAttempts) {
        const backoffTime = Math.min(1000 * (2 ** reconnectAttempts.current), 10000); // Max 10s delay
        console.log(`[WS] Auto-reconnecting in ${backoffTime / 1000}s...`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttempts.current += 1;
          connect();
        }, backoffTime);
      } else {
        console.warn('[WS] Max reconnection attempts reached. Matrix connection dead.');
      }
    };

    ws.onerror = (error) => {
      console.error('[WS] Connection Error observed. Socket will close and attempt heal.');
      ws.close(); // Force the onclose event to fire so the auto-healer takes over
    };
  }, [url]);

  useEffect(() => {
    connect();

    // The Cleanup Function (Fires when component unmounts)
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent the auto-healer from firing during intentional unmounts
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Expose a manual reconnect function just in case we need a UI button for it
  const forceReconnect = () => {
    reconnectAttempts.current = 0;
    connect();
  };

  return { isConnected, messages, forceReconnect };
}