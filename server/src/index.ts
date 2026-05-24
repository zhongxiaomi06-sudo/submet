import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { initDB } from './db/schema';
import { setupRoutes } from './network/routes';
import { setupSocketHandlers } from './network/socketHandler';
import { RoomManager } from './network/roomManager';

async function main() {
  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: '*' } });

  app.use(cors());
  app.use(express.json());

  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  app.use(express.static(clientDist));

  await initDB();

  const roomManager = new RoomManager();

  setupRoutes(app, roomManager);

  setupSocketHandlers(io, roomManager);

  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  const PORT = 3001;
  server.listen(PORT, () => console.log(`Undercurrent DEMO server on :${PORT}`));
}

main();
