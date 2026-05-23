import type { GameSession, MinerState } from '@shared/types/game';
import { CONFIG } from '../config';

export function botMinerDecide(trueQuality: number, round: number): number {
  if (trueQuality >= 4) return trueQuality;
  if (trueQuality <= 2 && Math.random() < 0.4) {
    return Math.min(5, trueQuality + 1 + Math.floor(Math.random() * 2));
  }
  if (trueQuality === 3 && Math.random() < 0.3) return 4;
  return trueQuality;
}

export function botValidatorScore(
  minerId: string, _clue: string, miners: MinerState[], round: number
): number {
  let base = 50 + Math.floor(Math.random() * 20) - 10;
  const miner = miners.find(m => m.playerId === minerId);
  if (!miner) return base;
  if (miner.roundData.some(r => r.isCheat && r.penaltyType === 'process')) base -= 20;
  return Math.max(1, Math.min(100, base));
}

export function botValidatorReports(miners: MinerState[], round: number): string[] {
  return miners
    .filter(m => {
      const rd = m.roundData.find(r => r.round === round);
      return rd && rd.isCheat && Math.random() < 0.6;
    })
    .map(m => m.playerId)
    .slice(0, 2);
}

export function botOwnerAudit(session: GameSession): string[] {
  const miners = Object.values(session.players).filter((p): p is MinerState => p.role === 'miner');
  if (Math.random() < 0.7) return [];
  const shuffled = [...miners].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.random() < 0.5 ? 1 : 2).map(m => m.playerId);
}
