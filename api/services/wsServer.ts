import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { memoryDb } from '../db/memoryDb.js';

export type WsMessageType = 'bins' | 'vehicles' | 'plants' | 'alerts';

export interface WsMessage {
  type: WsMessageType;
  data: any[];
}

let wss: WebSocketServer | null = null;

function sendSnapshot(ws: WebSocket): void {
  const bins = memoryDb.getBins();
  const vehicles = memoryDb.getVehicles();
  const plants = memoryDb.getPlants();
  const alerts = memoryDb.alerts;

  ws.send(JSON.stringify({ type: 'bins', data: bins }));
  ws.send(JSON.stringify({ type: 'vehicles', data: vehicles }));
  ws.send(JSON.stringify({ type: 'plants', data: plants }));
  ws.send(JSON.stringify({ type: 'alerts', data: alerts }));
}

export function initWsServer(httpServer?: Server): WebSocketServer {
  if (wss) {
    return wss;
  }

  if (httpServer) {
    wss = new WebSocketServer({ server: httpServer });
  } else {
    wss = new WebSocketServer({ port: 3006 });
  }

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WS] Client connected');
    sendSnapshot(ws);

    ws.on('close', () => {
      console.log('[WS] Client disconnected');
    });

    ws.on('error', (err) => {
      console.error('[WS] Error:', err);
    });
  });

  console.log('[WS] WebSocket server ready on port', wss.options.port || 3006);
  return wss;
}

export function broadcast(type: WsMessageType, data: any[]): void {
  if (!wss) {
    return;
  }

  const message = JSON.stringify({ type, data });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
