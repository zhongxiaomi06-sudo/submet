import { Express } from 'express';
import type { RoomManager } from './roomManager';
import { exportRawData, exportLabeledData } from '../data/DataExporter';

export function setupRoutes(app: Express, rm: RoomManager): void {
  app.post('/api/rooms', (_req, res) => {
    const roomId = rm.createRoom();
    res.json({ roomId });
  });

  app.get('/api/rooms/:id', (req, res) => {
    const room = rm.getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({
      roomId: room.roomId,
      playerCount: room.players.size,
      gameStarted: room.gameStarted,
      roleCounts: rm.getRoomRoleCounts(req.params.id),
    });
  });

  app.get('/api/sessions/:id/export/raw', async (req, res) => {
    const session = rm.getGameEngine().getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const data = exportRawData(session.sessionId, session);
    res.json(data);
  });

  app.get('/api/sessions/:id/export/labeled', async (req, res) => {
    const session = rm.getGameEngine().getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const data = exportLabeledData(session);
    res.json(data);
  });
}
