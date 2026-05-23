import { v4 as uuid } from 'uuid';
import { GameEngine } from '../game/GameEngine';
import type { PlayerState, RoleId } from '@shared/types/game';

interface RoomPlayer {
  socketId: string;
  playerState: PlayerState | null;
  role: RoleId;
}

interface Room {
  roomId: string;
  players: Map<string, RoomPlayer>;
  sessionId: string | null;
  gameEngine: GameEngine;
  gameStarted: boolean;
}

const ROLE_COUNTS: Record<RoleId, number> = {
  subnet_owner: 1,
  validator: 3,
  miner: 4,
};

const ROLE_ORDER: RoleId[] = ['subnet_owner', 'validator', 'miner'];

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private gameEngine: GameEngine = new GameEngine();

  createRoom(): string {
    const roomId = uuid().slice(0, 6);
    this.rooms.set(roomId, {
      roomId,
      players: new Map(),
      sessionId: null,
      gameEngine: this.gameEngine,
      gameStarted: false,
    });
    return roomId;
  }

  joinRoom(roomId: string, socketId: string, preferredRole?: RoleId): {
    success: boolean;
    role?: RoleId;
    playerId?: string;
    error?: string;
  } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.gameStarted) return { success: false, error: 'Game already started' };

    const playerId = uuid().slice(0, 8);
    let role: RoleId | null = null;

    if (preferredRole && this.canAssignRole(room, preferredRole)) {
      role = preferredRole;
    } else {
      role = this.getNextVacantRole(room);
      if (!role) return { success: false, error: 'Room is full (all 7 slots taken)' };
    }

    room.players.set(playerId, { socketId, playerState: null, role });
    return { success: true, role, playerId };
  }

  getRoomRoleCounts(roomId: string): Record<string, { filled: number; max: number }> {
    const room = this.rooms.get(roomId);
    if (!room) return {};
    const result: Record<string, { filled: number; max: number }> = {};
    for (const r of ROLE_ORDER) {
      result[r] = { filled: 0, max: ROLE_COUNTS[r] };
    }
    for (const [, pinfo] of room.players) {
      if (result[pinfo.role]) result[pinfo.role].filled++;
    }
    return result;
  }

  private canAssignRole(room: Room, role: RoleId): boolean {
    const max = ROLE_COUNTS[role] ?? 0;
    let filled = 0;
    for (const [, pinfo] of room.players) {
      if (pinfo.role === role) filled++;
    }
    return filled < max;
  }

  private getNextVacantRole(room: Room): RoleId | null {
    for (const role of ROLE_ORDER) {
      if (this.canAssignRole(room, role)) return role;
    }
    return null;
  }

  setPlayerState(roomId: string, playerId: string, state: PlayerState): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const p = room.players.get(playerId);
    if (p) p.playerState = state;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getGameEngine(): GameEngine {
    return this.gameEngine;
  }

  getRoomBySocket(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      for (const [, pinfo] of room.players) {
        if (pinfo.socketId === socketId) return room;
      }
    }
    return undefined;
  }

  getPlayerInfoInRoom(socketId: string): { room: Room; playerId: string } | undefined {
    for (const room of this.rooms.values()) {
      for (const [pid, pinfo] of room.players) {
        if (pinfo.socketId === socketId) return { room, playerId: pid };
      }
    }
    return undefined;
  }
}
