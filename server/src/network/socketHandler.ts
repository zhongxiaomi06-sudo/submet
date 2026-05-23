import { Server as SocketIOServer, Socket } from 'socket.io';
import type { RoomManager } from './roomManager';
import type { MinerState, PlayerState, ValidatorState, SubnetOwnerState } from '../../shared/types/game';
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

export function setupSocketHandlers(io: SocketIOServer, rm: RoomManager): void {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

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
      const remainingSlots = 7 - totalHumans;

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

      const phase = engine.advancePhase(session.sessionId);

      function broadcastState() {
        const remaining = engine.remainingSeconds.get(session.sessionId) ?? engine.getTimerForPhase(session.phase);
        for (const [pid, pinfo] of room.players) {
          const view = engine.buildViewState(session.sessionId, pid, remaining);
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
          remainingSeconds: engine.remainingSeconds.get(session.sessionId) ?? 0,
        };
        io.to(room.roomId).emit('game:phase_changed', phaseView);
      }

      broadcastState();

      engine.setPhaseTimeout(session.sessionId, () => {
        handlePhaseTimeout(io, room.roomId, engine, rm, session.sessionId);
        if (session.phase !== 'settlement' && session.phase !== 'finished') {
          const newPhase = engine.advancePhase(session.sessionId);
          broadcastState();
          engine.startPhaseTimer(session.sessionId, () => {
            handlePhaseTimeout(io, room.roomId, engine, rm, session.sessionId);
            if (session.phase !== 'settlement' && session.phase !== 'finished') {
              engine.advancePhase(session.sessionId);
              broadcastState();
            }
          });
        }
      });

      engine.startPhaseTimer(session.sessionId, (remaining) => {
        const phaseView = {
          phase: session.phase,
          remainingSeconds: remaining,
        };
        io.to(room.roomId).emit('game:phase_changed', phaseView);
      });

      io.to(room.roomId).emit('game:started', { sessionId: session.sessionId, phase });
    });

    socket.on('player:declare', ({ declaredQuality }: { declaredQuality: number }) => {
      const info = rm.getPlayerInfoInRoom(socket.id);
      if (!info) return;
      const engine = rm.getGameEngine();
      const sessionId = info.room.sessionId;
      if (!sessionId) return;

      engine.submitDeclaration(sessionId, info.playerId, declaredQuality);
    });

    socket.on('player:score', ({ scores }: { scores: Record<string, number> }) => {
      const info = rm.getPlayerInfoInRoom(socket.id);
      if (!info) return;
      const engine = rm.getGameEngine();
      const sessionId = info.room.sessionId;
      if (!sessionId) return;

      engine.submitScores(sessionId, info.playerId, scores, []);
    });

    socket.on('player:report', ({ minerIds }: { minerIds: string[] }) => {
      const info = rm.getPlayerInfoInRoom(socket.id);
      if (!info) return;
      const engine = rm.getGameEngine();
      const sessionId = info.room.sessionId;
      if (!sessionId) return;

      engine.submitScores(sessionId, info.playerId, {}, minerIds);
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
    });

    socket.on('player:next_phase', () => {
      const info = rm.getPlayerInfoInRoom(socket.id);
      if (!info) return;
      const engine = rm.getGameEngine();
      const sessionId = info.room.sessionId;
      if (!sessionId) return;

      engine.advancePhase(sessionId);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
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
