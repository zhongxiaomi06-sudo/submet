import { CONFIG } from '../config';
import type { SubnetOwnerState } from '@shared/types/game';

export function calculateOwnerWeight(owner: SubnetOwnerState): number {
  let w = CONFIG.OWNER_BASE_WEIGHT + CONFIG.OWNER_WEIGHT_PER_CHEAT * owner.confirmedCheats;
  if (owner.aiAnalysisPublic) w += CONFIG.OWNER_WEIGHT_PUBLIC_REPORT;
  return Math.min(w, 1.0);
}

export function checkVoteThreshold(votes: { for: number; against: number }): boolean {
  const total = votes.for + votes.against;
  return total > 0 && votes.for > total * CONFIG.VOTE_THRESHOLD;
}
