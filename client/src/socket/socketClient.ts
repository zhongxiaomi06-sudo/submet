import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('http://localhost:3001', { autoConnect: false });
  }
  return socket;
}

export function connectSocket(): void {
  const s = getSocket();
  s.connect();
  const store = useGameStore.getState();

  s.on('connect', () => store.setConnected(true));
  s.on('disconnect', () => store.setConnected(false));

  s.on('state:updated', (view) => store.setView(view));

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

  s.on('room:player_joined', ({ roleCounts }: { roleCounts: Record<string, { filled: number; max: number }> }) => {
    if (roleCounts) {
      useGameStore.getState().setRoleCounts(roleCounts);
    }
  });
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

export function emitScores(scores: Record<string, number>) {
  getSocket().emit('player:score', { scores });
}

export function emitReports(minerIds: string[]) {
  getSocket().emit('player:report', { minerIds });
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

export function emitKick(playerIds: string[]) {
  getSocket().emit('player:kick', { playerIds });
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

export const emitEvent = (_event: string, _data?: any) => {};
