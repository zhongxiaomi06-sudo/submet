import type { MinerState, ValidatorState } from '@shared/types/game';
import { CONFIG } from '../config';

export function resolveAudit(miner: MinerState, round: number): {
  isCheat: boolean;
  declaredQuality: number;
  trueQuality: number;
} {
  const rd = miner.roundData.find(r => r.round === round);
  if (!rd || rd.declaredQuality === null) {
    return { isCheat: false, declaredQuality: 0, trueQuality: 0 };
  }
  return {
    isCheat: rd.declaredQuality > rd.trueQuality,
    declaredQuality: rd.declaredQuality,
    trueQuality: rd.trueQuality,
  };
}

export function verifyReports(
  miner: MinerState,
  round: number,
  validators: ValidatorState[]
): Array<{ validatorId: string; reward: number }> {
  const rd = miner.roundData.find(r => r.round === round);
  if (!rd || !rd.isCheat) return [];
  return validators
    .filter((v) => {
      const vd = v.roundData.find((r) => r.round === round);
      return (vd?.reports ?? []).includes(miner.playerId);
    })
    .map(v => ({ validatorId: v.playerId, reward: CONFIG.REPORT_REWARD }));
}

export function detectCollusion(
  validator: ValidatorState,
  miners: MinerState[],
  round: number
): boolean {
  const scores = validator.roundData.find(r => r.round === round)?.scores ?? {};
  const reports = validator.roundData.find(r => r.round === round)?.reports ?? [];
  for (const miner of miners) {
    const rd = miner.roundData.find(r => r.round === round);
    if (rd?.isCheat && (scores[miner.playerId] ?? 0) > 70 && !reports.includes(miner.playerId)) {
      return true;
    }
  }
  return false;
}
