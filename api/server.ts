/**
 * local server entry file, for local development
 */
import app from './app.js';
import { memoryDb } from './db/memoryDb.js';
import { initWsServer } from './services/wsServer.js';
import { startRealtimeEngine } from './services/realtimeEngine.js';
import { scheduleAlertScan } from './services/alertEngine.js';
import { scheduleWeeklyReport } from './services/reportGenerator.js';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3005;

memoryDb.init();

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
  initWsServer();
  startRealtimeEngine();
  scheduleAlertScan(memoryDb);
  scheduleWeeklyReport(memoryDb);
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;