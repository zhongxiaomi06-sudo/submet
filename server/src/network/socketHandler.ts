import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuid } from 'uuid';
import type { RoomManager } from './roomManager';
import type { MinerState, PlayerState, ValidatorState, SubnetOwnerState } from '@shared/types/game';
import { CONFIG } from '../config';
import { botMinerDecide, botValidatorScore, botValidatorReports, botOwnerAudit } from '../bot/BotPlayer';
import { calculateOwnerWeight } from '../game/VoteManager';

function createPlayerState(playerId: string, role: string, playerType: 'human' | 'bot'): PlayerState {
  if (role === 'miner') {
    return {
      playerId, role: 'miner', playerType, chips: CONFIG.INITIAL_CHIPS, isAlive: true,
      isTraitor: false, traitorState: 'normal', roundData: [], finalRank: null,
    };
  }
  if (role === 'validator') {
    return {
      playerId, role: 'validator', playerType, chips: CONFIG.INITIAL_CHIPS, isAlive: true,
      isTraitor: false, traitorState: 'normal', roundData: [], isColluding: false, kickList: [],
    };
  }
  return {
    playerId, role: 'subnet_owner', playerType,
    chips: CONFIG.INITIAL_CHIPS + CONFIG.OWNER_ALLOWANCE, isAlive: true,
    isTraitor: false, traitorState: 'normal',
    allowance: CONFIG.OWNER_ALLOWANCE, auditHistory: [],
    voteWeight: CONFIG.OWNER_BASE_WEIGHT, confirmedCheats: 0,
    distributionWeights: { minerGroup: CONFIG.MINER_GROUP_SHARE, validatorGroup: 1 - CONFIG.MINER_GROUP_SHARE },
    minerRankWeights: [...CONFIG.MINER_RANK_SHARES],
    publicGoal: '', aiAnalysisUsed: false, aiAnalysisPublic: false,
  };
}

const ROLE_CONFIG: Array<{ role: string; count: number }> = [
  { role: 'subnet_owner', count: 1 },
  { role: 'validator', count: 3 },
  { role: 'miner', count: 4 },
];

const TOTAL_SLOTS = 8;

const voiceParticipantsByRoom = new Map<string, Set<string>>();
const voiceBySocket = new Map<string, { roomId: string; playerId: string }>();

function broadcastState(io: SocketIOServer, room: any, engine: any, session: any): void {
  const sessionId = session.sessionId;
  const remaining = engine.remainingSeconds.get(sessionId) ?? engine.getTimerForPhase(session.phase);

  for (const [pid, pinfo] of room.players) {
    const view = engine.buildViewState(sessionId, pid, remaining);
    io.to(pinfo.socketId).emit('state:updated', view);

    if (view.myRole === 'miner' && view.myTrueQuality !== undefined) {
      io.to(pinfo.socketId).emit('game:miner_quality', { trueQuality: view.myTrueQuality });
    }
    if (view.myRole === 'validator' && view.validatorClue) {
      io.to(pinfo.socketId).emit('game:clue', { clue: view.validatorClue });
    }
  }

  const phaseView = {
    phase: session.phase,
    remainingSeconds: engine.remainingSeconds.get(sessionId) ?? 0,
  };
  io.to(room.roomId).emit('game:phase_changed', phaseView);
}

function startGameLoop(io: SocketIOServer, room: any, engine: any, rm: RoomManager, sessionId: string): void {
  const session = engine.getSession(sessionId);

  if (session.phase === 'settlement' || session.phase === 'finished') {
    broadcastState(io, room, engine, session);
    return;
  }

  engine.setPhaseTimeout(sessionId, () => {
    handlePhaseTimeout(io, room.roomId, engine, rm, sessionId);
    engine.advancePhase(sessionId);
    broadcastState(io, room, engine, engine.getSession(sessionId));
    startGameLoop(io, room, engine, rm, sessionId);
  });

  engine.startPhaseTimer(sessionId, (remaining: number) => {
    const phaseView = {
      phase: session.phase,
      remainingSeconds: remaining,
    };
    io.to(room.roomId).emit('game:phase_changed', phaseView);
  });
}
function getOrCreateVoiceSet(roomId: string): Set<string> {
  const existing = voiceParticipantsByRoom.get(roomId);
  if (existing) return existing;
  const set = new Set<string>();
  voiceParticipantsByRoom.set(roomId, set);
  return set;
}

function emitVoiceParticipants(io: SocketIOServer, roomId: string): void {
  const set = voiceParticipantsByRoom.get(roomId) ?? new Set<string>();
  io.to(roomId).emit('voice:participants', { participants: Array.from(set.values()) });
}

function tryFastForwardDeclaration(io: SocketIOServer, room: any, engine: any, rm: RoomManager, sessionId: string): void {
  const session = engine.getSession(sessionId);
  if (session.phase !== 'declaration') return;

  const miners = Object.values(session.players).filter((p: any) => p.role === 'miner' && p.isAlive) as MinerState[];
  for (const miner of miners) {
    const rd = miner.roundData.find((r: any) => r.round === session.round);
    if (!rd || rd.declaredQuality !== null) continue;
    if (miner.playerType === 'bot') {
      const declared = botMinerDecide(rd.trueQuality, session.round);
      engine.submitDeclaration(sessionId, miner.playerId, declared);
    }
  }

  const allDeclared = miners.every((miner) => {
    const rd = miner.roundData.find((r: any) => r.round === session.round);
    return !!rd && rd.declaredQuality !== null;
  });
  if (!allDeclared) return;

  engine.advancePhase(sessionId);
  broadcastState(io, room, engine, engine.getSession(sessionId));
  startGameLoop(io, room, engine, rm, sessionId);
}


export function setupSocketHandlers(io: SocketIOServer, rm: RoomManager): void {
  io.on('connection', (socket: Socket) => {

    socket.on('room:join', ({ roomId, preferredRole }: { roomId: string; preferredRole?: string }) => {
      const result = rm.joinRoom(roomId, socket.id, preferredRole as any);
      if (!result.success) {
        socket.emit('error', { message: result.error ?? 'Failed to join room' });
        return;
      }
      socket.join(roomId);
      socket.emit('room:joined', { playerId: result.playerId, role: result.role });
      const roleCounts = rm.getRoomRoleCounts(roomId);
      io.to(roomId).emit('room:player_joined', { playerId: result.playerId, role: result.role, roleCounts });
    });

    socket.on('game:start', () => {
      const info = rm.getPlayerInfoInRoom(socket.id);
      if (!info) return;
      const { room } = info;
      const engine = rm.getGameEngine();

      const players: PlayerState[] = [];
      const roleCounts: Record<string, number> = { subnet_owner: 0, validator: 0, miner: 0 };

      for (const [pid, pinfo] of room.players) {
        const role = pinfo.role;
        roleCounts[role]++;
        const ps = createPlayerState(pid, role, 'human');
        pinfo.playerState = ps;
        players.push(ps);
      }

      const totalHumans = players.length;
      const remainingSlots = TOTAL_SLOTS - totalHumans;

      for (let i = 0; i < remainingSlots; i++) {
        const botId = `bot_${i + 1}`;
        let role: string;
        if (roleCounts.subnet_owner === 0) {
          role = 'subnet_owner';
        } else if (roleCounts.validator < 3) {
          role = 'validator';
        } else if (roleCounts.miner < 4) {
          role = 'miner';
        } else {
          continue;
        }
        roleCounts[role]++;
        players.push(createPlayerState(botId, role, 'bot'));
      }

      const session = engine.createSession(players);
      room.sessionId = session.sessionId;
      room.gameStarted = true;

      engine.advancePhase(session.sessionId);
      broadcastState(io, room, engine, session);

      startGameLoop(io, room, engine, rm, session.sessionId);

      io.to(room.roomId).emit('game:started', { sessionId: session.sessionId, phase: session.phase });
    });

    socket.on('player:declare', ({ declaredQuality }: { declaredQuality: number }) => {
      const info = rm.getPlayerInfoInRoom(socket.id);
      if (!info) return;
      const engine = rm.getGameEngine();
      const sessionId = info.room.sessionId;
      if (!sessionId) return;

      engine.submitDeclaration(sessionId, info.playerId, declaredQuality);
      broadcastState(io, info.room, engine, engine.getSession(sessionId));
      tryFastForwardDeclaration(io, info.room, engine, rm, sessionId);
    });

    socket.on('player:score', ({ scores, reportMinerIds }: { scores: Record<string, number>; reportMinerIds?: string[] }) => {
      const info = rm.getPlayerInfoInRoom(socket.id);
      if (!info) return;
      const engine = rm.getGameEngine();
      const sessionId = info.room.sessionId;
      if (!sessionId) return;

      engine.submitScores(sessionId, info.playerId, scores, reportMinerIds ?? []);
      broadcastState(io, info.room, engine, engine.getSession(sessionId));
    });

    socket.on('player:audit', ({ minerIds, depth }: { minerIds: string[]; depth?: 'shallow' | 'deep' }) => {
      const info = rm.getPlayerInfoInRoom(socket.id);
      if (!info) return;
      const engine = rm.getGameEngine();
      const sessionId = info.room.sessionId;
      if (!sessionId) return;
      const room = info.room;

      const { results } = engine.executeAudit(sessionId, minerIds, depth ?? 'shallow');

      for (const result of results) {
        io.to(room.roomId).emit('game:audit_result', {
          minerId: result.minerId,
          trueQuality: result.trueQuality,
          isCheat: result.isCheat,
          penalty: result.penaltyAmount,
          auditDepth: result.auditDepth,
        });
      }
      broadcastState(io, room, engine, engine.getSession(sessionId));
    });

    socket.on('player:ai_analysis', ({ level, isPublic }: { level: 'low' | 'mid' | 'high'; isPublic: boolean }) => {
      const info = rm.getPlayerInfoInRoom(socket.id);
      if (!info) return;
      const engine = rm.getGameEngine();
      const sessionId = info.room.sessionId;
      if (!sessionId) return;

      const riskScores = engine.computeRiskScores(sessionId, level);
      if (isPublic && Object.keys(riskScores).length > 0) {
        for (const [minerId, score] of Object.entries(riskScores)) {
          io.to(info.room.roomId).emit('broadcast:event', {
            type: 'ai_risk',
            message: `AI 风险评分：矿工 ${minerId.slice(0, 6)} 虚报概率 ${score}%`,
          });
        }
      }
    });

    socket.on('player:vote', ({ vote }: { vote: 'for' | 'against' }) => {
      const info = rm.getPlayerInfoInRoom(socket.id);
      if (!info) return;
      const engine = rm.getGameEngine();
      const sessionId = info.room.sessionId;
      if (!sessionId) return;

      engine.castVote(sessionId, info.playerId, vote);
      broadcastState(io, info.room, engine, engine.getSession(sessionId));
    });

    socket.on('player:next_phase', () => {
      const info = rm.getPlayerInfoInRoom(socket.id);
      if (!info) return;
      const engine = rm.getGameEngine();
      const sessionId = info.room.sessionId;
      if (!sessionId) return;

      engine.advancePhase(sessionId);
      broadcastState(io, info.room, engine, engine.getSession(sessionId));
      startGameLoop(io, info.room, engine, rm, sessionId);
    });

    socket.on('chat:send', ({ channel, toPlayerId, content }: { channel: 'public' | 'direct'; toPlayerId?: string; content: string }) => {
      const info = rm.getPlayerInfoInRoom(socket.id);
      if (!info) return;
      const message = {
        messageId: uuid(),
        channel,
        fromPlayerId: info.playerId,
        toPlayerId,
        content,
        timestamp: Date.now(),
      };

      if (channel === 'direct' && toPlayerId) {
        const target = info.room.players.get(toPlayerId);
        if (target) io.to(target.socketId).emit('chat:message', message);
        io.to(socket.id).emit('chat:message', message);
        return;
      }

      io.to(info.room.roomId).emit('chat:message', message);
    });

    socket.on('voice:join', () => {
      const info = rm.getPlayerInfoInRoom(socket.id);
      if (!info) return;
      const engine = rm.getGameEngine();
      const sessionId = info.room.sessionId;
      if (!sessionId) {
        socket.emit('voice:error', { message: 'Game not started' });
        return;
      }
      const session = engine.getSession(sessionId);
      if (session.phase !== 'trading') {
        socket.emit('voice:error', { message: 'Voice is only available during discussion phase' });
        return;
      }

      socket.join(info.room.roomId);
      socket.join(`voice:${info.room.roomId}`);
      voiceBySocket.set(socket.id, { roomId: info.room.roomId, playerId: info.playerId });
      const set = getOrCreateVoiceSet(info.room.roomId);
      set.add(info.playerId);
      emitVoiceParticipants(io, info.room.roomId);
    });

    socket.on('voice:leave', () => {
      const existing = voiceBySocket.get(socket.id);
      if (!existing) return;
      voiceBySocket.delete(socket.id);
      const set = voiceParticipantsByRoom.get(existing.roomId);
      if (set) {
        set.delete(existing.playerId);
        if (set.size === 0) voiceParticipantsByRoom.delete(existing.roomId);
      }
      socket.leave(`voice:${existing.roomId}`);
      emitVoiceParticipants(io, existing.roomId);
    });

    socket.on('voice:signal', ({ to, data }: { to: string; data: any }) => {
      const existing = voiceBySocket.get(socket.id);
      if (!existing) return;
      const { roomId, playerId } = existing;
      const room = rm.getRoom(roomId);
      if (!room) return;
      const target = room.players.get(to);
      if (!target) return;
      io.to(target.socketId).emit('voice:signal', { from: playerId, data });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const existing = voiceBySocket.get(socket.id);
      if (existing) {
        voiceBySocket.delete(socket.id);
        const set = voiceParticipantsByRoom.get(existing.roomId);
        if (set) {
          set.delete(existing.playerId);
          if (set.size === 0) voiceParticipantsByRoom.delete(existing.roomId);
        }
        emitVoiceParticipants(io, existing.roomId);
      }
    });
  });
}

function handlePhaseTimeout(
  io: SocketIOServer,
  roomId: string,
  engine: any,
  rm: RoomManager,
  sessionId: string,
): void {
  const session = engine.getSession(sessionId);
  const phase = session.phase;

  if (phase === 'declaration') {
    handleBotDeclarations(io, roomId, engine, rm, sessionId);
  } else if (phase === 'scoring') {
    handleBotScoring(io, roomId, engine, rm, sessionId);
  } else if (phase === 'audit') {
    handleBotAudit(io, roomId, engine, rm, sessionId);
  } else if (phase === 'final_vote') {
    handleBotVoting(io, roomId, engine, rm, sessionId);
  }
}

function handleBotDeclarations(
  io: SocketIOServer, roomId: string, engine: any, rm: RoomManager, sessionId: string,
): void {
  const session = engine.getSession(sessionId);
  const miners = Object.values(session.players).filter((p: any) => p.role === 'miner') as MinerState[];
  for (const miner of miners) {
    const rd = miner.roundData.find((r: any) => r.round === session.round);
    if (rd && rd.declaredQuality === null) {
      const declared = botMinerDecide(rd.trueQuality, session.round);
      engine.submitDeclaration(sessionId, miner.playerId, declared);
    }
  }
}

function handleBotScoring(
  io: SocketIOServer, roomId: string, engine: any, rm: RoomManager, sessionId: string,
): void {
  const session = engine.getSession(sessionId);
  const miners = Object.values(session.players).filter((p: any) => p.role === 'miner') as MinerState[];
  const validators = Object.values(session.players).filter((p: any) => p.role === 'validator') as ValidatorState[];

  for (const validator of validators) {
    if (validator.playerType !== 'bot') continue;
    const rd = validator.roundData.find((r: any) => r.round === session.round);
    if (!rd || Object.keys(rd.scores).length > 0) continue;

    const scores: Record<string, number> = {};
    for (const miner of miners) {
      scores[miner.playerId] = botValidatorScore(miner.playerId, rd.clue, miners, session.round);
    }
    const reports = botValidatorReports(miners, session.round);
    engine.submitScores(sessionId, validator.playerId, scores, reports);
  }
}

function handleBotAudit(
  io: SocketIOServer, roomId: string, engine: any, rm: RoomManager, sessionId: string,
): void {
  const session = engine.getSession(sessionId);
  const targets = botOwnerAudit(session);
  if (targets.length > 0) {
    engine.executeAudit(sessionId, targets);
  }
}

function handleBotVoting(
  io: SocketIOServer, roomId: string, engine: any, rm: RoomManager, sessionId: string,
): void {
  const session = engine.getSession(sessionId);
  for (const player of Object.values(session.players) as any[]) {
    if (player.playerType === 'bot' && player.isAlive) {
      const vote = Math.random() < 0.5 ? 'for' : 'against';
      engine.castVote(sessionId, player.playerId, vote);
    }
  }
}
