import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

// Native WebSocket client for API Gateway WebSockets (no Socket.IO).
// Local (serverless-offline): ws://localhost:3002
// Production: the WsUrl output from the serverless stack (wss://...).
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';
const TOKEN_KEY = 'flavours_token';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const wsRef = useRef(null);
  const listenersRef = useRef(new Map());
  const joinedRoomsRef = useRef(new Set());
  const [connected, setConnected] = useState(false);

  // Sends an action message, attaching the auth token when present.
  const sendMessage = useCallback((ws, action) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const token = localStorage.getItem(TOKEN_KEY) || '';
    ws.send(JSON.stringify({ action, token }));
  }, []);

  useEffect(() => {
    let stopped = false;
    let attempts = 0;
    let retryTimer = null;

    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        attempts = 0;
        setConnected(true);
        // Rooms aren't sticky across reconnects: re-join what the UI asked for.
        for (const action of joinedRoomsRef.current) {
          sendMessage(ws, action);
        }
      };

      ws.onmessage = (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (!msg || !msg.event) return;
        const handlers = listenersRef.current.get(msg.event);
        if (!handlers) return;
        for (const handler of [...handlers]) {
          try {
            handler(msg.data);
          } catch (err) {
            console.error('[ws] handler error for', msg.event, err);
          }
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (stopped) return;
        const delay = Math.min(30_000, 1000 * 2 ** attempts);
        attempts += 1;
        retryTimer = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      };
    };

    connect();

    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      try {
        wsRef.current?.close();
      } catch {
        /* ignore */
      }
    };
  }, [sendMessage]);

  const joinAdmin = useCallback(() => {
    joinedRoomsRef.current.add('join-admin');
    sendMessage(wsRef.current, 'join-admin');
  }, [sendMessage]);

  const joinKitchen = useCallback(() => {
    joinedRoomsRef.current.add('join-kitchen');
    sendMessage(wsRef.current, 'join-kitchen');
  }, [sendMessage]);

  const on = useCallback((event, handler) => {
    if (!listenersRef.current.has(event)) listenersRef.current.set(event, new Set());
    listenersRef.current.get(event).add(handler);
    return () => {
      listenersRef.current.get(event)?.delete(handler);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ connected, joinAdmin, joinKitchen, on }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
