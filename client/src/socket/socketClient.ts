import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import type { ChatMessage, TraitorContractOffer } from '../../../shared/types/game';

let socket: Socket | null = null;
let listenersWired = false;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({ autoConnect: false, path: '/socket.io' });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  if (listenersWired) {
    if (!s.connected) s.connect();
    return;
  }
  listenersWired = true;
  const store = useGameStore.getState();

  s.on('connect', () => store.setConnected(true));
  s.on('disconnect', () => store.setConnected(false));

  s.on('state:updated', (view) => store.setView(view));

  s.on('chat:message', (msg: ChatMessage) => {
    useGameStore.getState().pushChatMessage(msg);
  });

  s.on('traitor:contracts', ({ contracts }: { contracts: TraitorContractOffer[] }) => {
    useGameStore.getState().setTraitorContracts(contracts);
  });

  s.on('game:miner_quality', ({ trueQuality }) => {
    const v = useGameStore.getState().view;
    if (v) useGameStore.getState().setView({ ...v, myTrueQuality: trueQuality });
  });

  s.on('game:clue', ({ clue }) => {
    const v = useGameStore.getState().view;
    if (v) useGameStore.getState().setView({ ...v, validatorClue: clue });
  });

  s.on('game:phase_changed', ({ phase, remainingSeconds }) => {
    const v = useGameStore.getState().view;
    if (v) useGameStore.getState().setView({ ...v, phase, remainingSeconds });
  });

  s.on('game:started', ({ sessionId }) => {
    if (sessionId) useGameStore.getState().setSessionId(sessionId);
  });

  s.on('room:player_joined', ({ roleCounts }: { roleCounts: Record<string, { filled: number; max: number }> }) => {
    if (roleCounts) {
      useGameStore.getState().setRoleCounts(roleCounts);
    }
  });

  s.on('broadcast:event', ({ type, message }: { type: string; message: string }) => {
    const v = useGameStore.getState().view;
    if (!v) return;
    useGameStore.getState().setView({
      ...v,
      broadcastEvents: [
        ...(v.broadcastEvents ?? []),
        { type, message, timestamp: Date.now() },
      ],
    });
  });

  s.on('game:audit_result', (payload: { minerId: string; trueQuality: number; isCheat: boolean; penalty: number; auditDepth: 'shallow' | 'deep' }) => {
    const v = useGameStore.getState().view;
    if (!v) return;
    useGameStore.getState().setView({
      ...v,
      auditResults: [
        ...(v.auditResults ?? []),
        { minerId: payload.minerId, trueQuality: payload.trueQuality, isCheat: payload.isCheat, penaltyAmount: payload.penalty, auditDepth: payload.auditDepth },
      ],
      auditDepth: payload.auditDepth,
    });
  });

  s.connect();
}

export function emitJoinRoom(roomId: string, preferredRole?: string) {
  getSocket().emit('room:join', { roomId, preferredRole });
}

export function emitStartGame() {
  getSocket().emit('game:start');
}

export function emitDeclaration(declaredQuality: number) {
  getSocket().emit('player:declare', { declaredQuality });
}

export function emitScores(scores: Record<string, number>, reportMinerIds?: string[]) {
  getSocket().emit('player:score', { scores, reportMinerIds: reportMinerIds ?? [] });
}

export function emitAudit(minerIds: string[], depth?: 'shallow' | 'deep') {
  getSocket().emit('player:audit', { minerIds, depth });
}

export function emitAIAnalysis(level: 'low' | 'mid' | 'high', isPublic: boolean) {
  getSocket().emit('player:ai_analysis', { level, isPublic });
}

export function emitVote(vote: 'for' | 'against') {
  getSocket().emit('player:vote', { vote });
}

export function emitNextPhase() {
  getSocket().emit('player:next_phase');
}

export function emitRecruit(targetId: string, bribe: number, task: string) {
  getSocket().emit('traitor:recruit', { targetId, bribe, task });
}

export function emitDefect() {
  getSocket().emit('traitor:defect');
}

export function sendChatMessage(
  sessionId: string,
  payload: { channel: 'public' | 'direct'; toPlayerId?: string; content: string },
) {
  getSocket().emit('chat:send', { sessionId, ...payload });
}

export function offerTraitorContract(
  sessionId: string,
  payload: { targetId: string; bribe: number; task: string },
) {
  getSocket().emit('traitor:contract_offer', { sessionId, ...payload });
}

export function respondTraitorContract(
  sessionId: string,
  payload: { offerId: string; accept: boolean },
) {
  getSocket().emit('traitor:contract_respond', { sessionId, ...payload });
}

export function defectTraitor(sessionId: string, traitorId: string) {
  getSocket().emit('traitor:defect', { sessionId, traitorId });
}

export function revealTraitor(sessionId: string, traitorId: string) {
  getSocket().emit('traitor:reveal', { sessionId, traitorId });
}

export function finalDeepAudit(sessionId: string, minerIds: string[]) {
  getSocket().emit('game:final_deep_audit', { sessionId, minerIds });
}

export function kickPlayers(sessionId: string, playerIds: string[], reason: string) {
  getSocket().emit('game:kick_players', { sessionId, playerIds, reason });
}
