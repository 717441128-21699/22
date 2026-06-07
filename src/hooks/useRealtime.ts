import { useState, useEffect, useRef, useCallback } from 'react';
import type { WasteBin, CollectionVehicle, ProcessingPlant, Alert } from '../../shared/types';

interface RealtimeState {
  bins: WasteBin[];
  vehicles: CollectionVehicle[];
  plants: ProcessingPlant[];
  alerts: Alert[];
}

const WS_URL = 'ws://localhost:3006';
const RECONNECT_DELAY = 3000;

export function useRealtime() {
  const [state, setState] = useState<RealtimeState>({
    bins: [],
    vehicles: [],
    plants: [],
    alerts: [],
  });
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const manualCloseRef = useRef(false);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    manualCloseRef.current = false;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onclose = () => {
        setConnected(false);
        if (!manualCloseRef.current) {
          reconnectTimerRef.current = window.setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        }
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as { type: string; data: unknown[] };

          setState((prev) => {
            switch (message.type) {
              case 'bins':
                return { ...prev, bins: message.data as WasteBin[] };
              case 'vehicles':
                return { ...prev, vehicles: message.data as CollectionVehicle[] };
              case 'plants':
                return { ...prev, plants: message.data as ProcessingPlant[] };
              case 'alerts':
                return { ...prev, alerts: message.data as Alert[] };
              default:
                return prev;
            }
          });
        } catch {
          // ignore parse errors
        }
      };
    } catch {
      reconnectTimerRef.current = window.setTimeout(() => {
        connect();
      }, RECONNECT_DELAY);
    }
  }, []);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      manualCloseRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      manualCloseRef.current = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connect]);

  return {
    ...state,
    connected,
    reconnect,
  };
}
