import type { MinerState } from '../../shared/types/game';

const CLUE_FNS = [
  (miners: MinerState[], round: number) => {
    const m = miners[Math.floor(Math.random() * miners.length)];
    const q = m.roundData.find(r => r.round === round)?.trueQuality ?? 0;
    return q >= 3
      ? `矿工 ${m.playerId} 的本轮真实质量在 3-5 星之间`
      : `矿工 ${m.playerId} 的本轮真实质量在 1-2 星之间`;
  },
  (miners: MinerState[], round: number) => {
    const m = miners[Math.floor(Math.random() * miners.length)];
    const q = m.roundData.find(r => r.round === round)?.trueQuality ?? 0;
    return `矿工 ${m.playerId} 的本轮真实质量为${q % 2 === 0 ? '偶数' : '奇数'}`;
  },
  (miners: MinerState[], round: number) => {
    const count = miners.filter(m => {
      const q = m.roundData.find(r => r.round === round)?.trueQuality ?? 0;
      return q >= 4;
    }).length;
    return `本轮 4 名矿工中，有 ${count} 人的真实质量 ≥ 4 星`;
  },
  (miners: MinerState[], round: number) => {
    const qualities = miners.map(m => m.roundData.find(r => r.round === round)?.trueQuality ?? 0);
    const diff = Math.max(...qualities) - Math.min(...qualities);
    return `本轮最高与最低真实质量的差值 ${diff >= 3 ? '≥' : '<'} 3 星`;
  },
  (miners: MinerState[], round: number) => {
    const cheaters = miners.filter(m => m.roundData.some(r => r.isCheat && r.penaltyType !== 'none'));
    if (cheaters.length > 0) {
      const m = cheaters[Math.floor(Math.random() * cheaters.length)];
      return `矿工 ${m.playerId} 在已进行的轮次中累计虚报了至少 1 次`;
    }
    return '本轮所有矿工在历史中无虚报记录';
  },
  (miners: MinerState[], round: number) => {
    const hasLow = miners.some(m => {
      const q = m.roundData.find(r => r.round === round)?.trueQuality ?? 0;
      return q === 1;
    });
    return `本轮${hasLow ? '至少有 1 名' : '没有'}矿工的真实质量 = 1`;
  },
];

function shuffle<T>(arr: T[]): T[] {
  const pool = [...arr];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

export function generateClues(miners: MinerState[], round: number, count: number): string[] {
  const pool = shuffle(CLUE_FNS);
  return pool.slice(0, Math.min(count, pool.length)).map(fn => fn(miners, round));
}
