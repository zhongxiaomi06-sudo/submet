import { CONFIG } from '../config';
import type { MinerState, ValidatorState } from '../../shared/types/game';

export function calculateRoundDistribution(
  miners: MinerState[],
  validators: ValidatorState[],
  publicPool: number,
  ownerWeights: number[]
): {
  minerRewards: Record<string, number>;
  validatorRewards: Record<string, number>;
  publicPoolAfter: number;
} {
  const distributable = Math.min(CONFIG.ROUND_DISTRIBUTION, publicPool);
  const minerPool = distributable * CONFIG.MINER_GROUP_SHARE;
  const validatorPool = distributable - minerPool;

  const sortedMiners = [...miners].sort((a, b) => {
    const scoresA = getAverageScore(a.playerId, validators);
    const scoresB = getAverageScore(b.playerId, validators);
    return scoresB - scoresA;
  });

  const minerRewards: Record<string, number> = {};
  sortedMiners.forEach((miner, index) => {
    if (index < CONFIG.MINER_RANK_SHARES.length) {
      minerRewards[miner.playerId] = Math.round(minerPool * CONFIG.MINER_RANK_SHARES[index] * 100) / 100;
    } else {
      minerRewards[miner.playerId] = 0;
    }
  });

  const validatorRewards: Record<string, number> = {};
  const totalWeight = ownerWeights.reduce((sum, w) => sum + w, 0) || 1;
  validators.forEach((v, i) => {
    const weight = ownerWeights[i] ?? (1 / validators.length);
    validatorRewards[v.playerId] = Math.round(validatorPool * (weight / totalWeight) * 100) / 100;
  });

  return {
    minerRewards,
    validatorRewards,
    publicPoolAfter: publicPool - distributable,
  };
}

function getAverageScore(minerId: string, validators: ValidatorState[]): number {
  const scores = validators
    .map(v => v.roundData[v.roundData.length - 1]?.scores[minerId])
    .filter((s): s is number => s !== undefined && s !== null);
  if (scores.length === 0) return 0;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

export function applyCheatPenalty(
  miner: MinerState,
  round: number,
  penaltyType: 'process' | 'reveal' | 'deep_audit'
): { minerChipsAfter: number; poolIncrease: number; ownerReward: number } {
  const penalty = penaltyType === 'reveal'
    ? CONFIG.CHEAT_PENALTY_REVEAL
    : penaltyType === 'process'
      ? CONFIG.CHEAT_PENALTY_PROCESS
      : CONFIG.CHEAT_PENALTY_DEEP;

  return {
    minerChipsAfter: miner.chips - penalty,
    poolIncrease: 1,
    ownerReward: penaltyType === 'reveal' ? 0 : 2,
  };
}

export function calculateTaotaoDistribution(
  rankings: Array<{ playerId: string; rank: number }>,
  taotaoPool: number,
  contractPassed: boolean
): Record<string, number> {
  const treasuryCut = taotaoPool * CONFIG.TREASURY_FEE;
  const distributable = taotaoPool - treasuryCut;

  const shares: Record<string, number> = {};
  const sorted = [...rankings].sort((a, b) => a.rank - b.rank);

  sorted.forEach((entry, index) => {
    const adjustedRank = index + 1;
    if (adjustedRank === 1) {
      shares[entry.playerId] = distributable * CONFIG.CHAMPION_SHARE;
    } else if (adjustedRank === 2) {
      shares[entry.playerId] = distributable * CONFIG.RUNNER_UP_SHARE;
    } else if (adjustedRank === 3) {
      shares[entry.playerId] = distributable * CONFIG.THIRD_SHARE;
    } else if (adjustedRank === 4 || adjustedRank === 5) {
      shares[entry.playerId] = distributable * CONFIG.MID_SHARE / 2;
    } else if (adjustedRank === 6) {
      shares[entry.playerId] = distributable * CONFIG.SIXTH_SHARE;
    } else {
      shares[entry.playerId] = 0;
    }
  });

  const result: Record<string, number> = {};
  for (const [pid, share] of Object.entries(shares)) {
    result[pid] = Math.round(share * 10000) / 10000;
  }

  return result;
}
