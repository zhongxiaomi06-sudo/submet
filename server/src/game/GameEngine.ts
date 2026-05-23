import { v4 as uuid } from 'uuid';
import type {
  GameSession, GamePhase, PlayerState, PlayerViewState,
  MinerState, ValidatorState, SubnetOwnerState,
  RoleId, PlayerType, AuditResultView, AuditRecord, SettlementData,
  AuditDepth, BroadcastEvent, RevealEntry, RoundDistributionData, GameEvent,
} from '../../shared/types/game';
import { CONFIG } from '../config';
import { generateClues } from './ClueGenerator';
import { resolveAudit, verifyReports, detectCollusion } from './AuditResolver';
import {
  calculateRoundDistribution,
  applyCheatPenalty,
  calculateTaotaoDistribution,
} from './ChipCalculator';
import { calculateOwnerWeight, checkVoteThreshold } from './VoteManager';

function createPlayerState(playerId: string, role: RoleId, playerType: PlayerType): PlayerState {
  const base = { playerId, playerType, chips: CONFIG.INITIAL_CHIPS, isAlive: true };

  if (role === 'miner') {
    return {
      ...base, role: 'miner' as const,
      isTraitor: false, traitorState: 'normal',
      roundData: [], finalRank: null,
    };
  }
  if (role === 'validator') {
    return {
      ...base, role: 'validator' as const,
      isTraitor: false, traitorState: 'normal',
      roundData: [], isColluding: false, kickList: [],
    };
  }
  return {
    ...base, role: 'subnet_owner' as const, chips: CONFIG.INITIAL_CHIPS + CONFIG.OWNER_ALLOWANCE,
    isTraitor: false, traitorState: 'normal',
    allowance: CONFIG.OWNER_ALLOWANCE, auditHistory: [],
    voteWeight: CONFIG.OWNER_BASE_WEIGHT, confirmedCheats: 0,
    distributionWeights: { minerGroup: CONFIG.MINER_GROUP_SHARE, validatorGroup: 1 - CONFIG.MINER_GROUP_SHARE },
    minerRankWeights: [...CONFIG.MINER_RANK_SHARES],
    publicGoal: '', aiAnalysisUsed: false, aiAnalysisPublic: false,
  };
}

export class GameEngine {
  sessions = new Map<string, GameSession>();
  remainingSeconds = new Map<string, number>();
  timers = new Map<string, ReturnType<typeof setInterval>>();
  phaseCallbacks = new Map<string, () => void>();

  createSession(players: PlayerState[]): GameSession {
    const sessionId = uuid();
    const session: GameSession = {
      sessionId,
      phase: 'lobby',
      round: 1,
      maxRounds: 3,
      players: {},
      publicPool: CONFIG.PUBLIC_POOL_START,
      taotaoPool: CONFIG.TAOTAO_POOL_START,
      traitorFund: CONFIG.TRAITOR_FUND,
      eventLog: [],
      createdAt: new Date().toISOString(),
      finishedAt: null,
    };
    for (const p of players) {
      session.players[p.playerId] = p;
    }
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): GameSession {
    const s = this.sessions.get(sessionId);
    if (!s) throw new Error(`Session ${sessionId} not found`);
    return s;
  }

  advancePhase(sessionId: string): GamePhase {
    const session = this.getSession(sessionId);
    this.clearTimer(sessionId);

    switch (session.phase) {
      case 'lobby': return this.startRound(session);
      case 'declaration': return this.startScoring(session);
      case 'scoring': return this.startAuditPhase(session);
      case 'audit': return this.startDistribution(session);
      case 'distribution':
        return session.round >= session.maxRounds
          ? this.startTrading(session)
          : this.startRound(session);
      case 'trading': return this.startFinalReveal(session);
      case 'final_reveal': return this.startFinalAudit(session);
      case 'final_audit': return this.startFinalVote(session);
      case 'final_vote': return this.startSettlement(session);
      default: return session.phase;
    }
  }

  private startRound(session: GameSession): GamePhase {
    if (session.phase !== 'lobby') {
      session.round += 1;
    }
    const miners = Object.values(session.players).filter(p => p.role === 'miner') as MinerState[];
    for (const m of miners) {
      const q = Math.floor(Math.random() * 5) + 1;
      m.roundData.push({
        round: session.round, trueQuality: q,
        declaredQuality: null, isCheat: false,
        penaltyType: 'none', penaltyAmount: 0,
      });
    }
    this.setPhase(session, 'declaration');
    return 'declaration';
  }

  submitDeclaration(sessionId: string, minerId: string, declaredQuality: number): void {
    const session = this.getSession(sessionId);
    const miner = session.players[minerId] as MinerState;
    const rd = miner.roundData.find(r => r.round === session.round);
    if (!rd) return;
    rd.declaredQuality = declaredQuality;
    rd.isCheat = declaredQuality > rd.trueQuality;
    session.eventLog.push({
      type: 'miner_declared',
      minerId,
      declared: declaredQuality,
      true: rd.trueQuality,
      isCheat: rd.isCheat,
      round: session.round,
      timestamp: Date.now(),
    });
  }

  private startScoring(session: GameSession): GamePhase {
    const validators = Object.values(session.players).filter(p => p.role === 'validator') as ValidatorState[];
    const miners = Object.values(session.players).filter(p => p.role === 'miner') as MinerState[];
    const clues = generateClues(miners, session.round, validators.length);
    for (let i = 0; i < validators.length; i++) {
      validators[i].roundData.push({
        round: session.round, clue: clues[i] ?? '',
        scores: {}, reports: [], reportsCost: 0,
      });
    }
    this.setPhase(session, 'scoring');
    return 'scoring';
  }

  submitScores(sessionId: string, validatorId: string, scores: Record<string, number>, reports: string[]): void {
    const session = this.getSession(sessionId);
    const validator = session.players[validatorId] as ValidatorState;
    const rd = validator.roundData.find(r => r.round === session.round);
    if (!rd) return;
    rd.scores = scores;
    rd.reports = reports;
    rd.reportsCost = reports.length * CONFIG.REPORT_COST;
    validator.chips -= rd.reportsCost;

    for (const [minerId, score] of Object.entries(scores)) {
      session.eventLog.push({
        type: 'validator_scored',
        validatorId, minerId, score, round: session.round, timestamp: Date.now(),
      });
    }
    for (const minerId of reports) {
      session.eventLog.push({
        type: 'validator_reported',
        validatorId, minerId, cost: CONFIG.REPORT_COST, round: session.round, timestamp: Date.now(),
      });
    }
  }

  private startAuditPhase(session: GameSession): GamePhase {
    this.setPhase(session, 'audit');
    return 'audit';
  }

  executeAudit(sessionId: string, minerIds: string[], depth: AuditDepth = 'shallow'):
  { results: Array<{ minerId: string; trueQuality: number; isCheat: boolean; penaltyType: string; penaltyAmount: number; auditDepth: AuditDepth }>;
    reportRewards: Array<{ validatorId: string; amount: number }>;
  } {
    const session = this.getSession(sessionId);
    const auditCost = depth === 'deep' ? CONFIG.DEEP_AUDIT_COST : CONFIG.SHALLOW_AUDIT_COST;
    const results: Array<{ minerId: string; trueQuality: number; isCheat: boolean; penaltyType: string; penaltyAmount: number; auditDepth: AuditDepth }> = [];
    const reportRewards: Array<{ validatorId: string; amount: number }> = [];
    const validators = Object.values(session.players).filter(p => p.role === 'validator') as ValidatorState[];
    const owner = Object.values(session.players).find(p => p.role === 'subnet_owner') as SubnetOwnerState | undefined;

    if (owner) {
      const cost = minerIds.length * auditCost;
      owner.chips -= cost;
      owner.allowance -= cost;
    }

    for (const minerId of minerIds) {
      const miner = session.players[minerId] as MinerState;
      const { isCheat, trueQuality } = resolveAudit(miner, session.round);

      const auditResult: 'cheat_confirmed' | 'honest_confirmed' = isCheat ? 'cheat_confirmed' : 'honest_confirmed';
      session.eventLog.push({
        type: 'owner_audited',
        minerId, round: session.round, cost: auditCost,
        result: auditResult,
        timestamp: Date.now(),
      });

      if (depth === 'deep' && isCheat) {
        const rd = miner.roundData.find(r => r.round === session.round);
        if (rd) {
          rd.penaltyType = 'process';
          rd.penaltyAmount = CONFIG.CHEAT_PENALTY_PROCESS;
          miner.chips -= CONFIG.CHEAT_PENALTY_PROCESS;
          session.publicPool += 1;
        }
        if (owner) {
          owner.confirmedCheats += 1;
          owner.chips += 2;
          owner.auditHistory.push({
            targetMinerId: minerId, round: session.round,
            cost: auditCost, result: 'cheat_confirmed',
          });
        }

        const rewards = verifyReports(miner, session.round, validators);
        for (const r of rewards) {
          reportRewards.push({ validatorId: r.validatorId, amount: r.reward });
          const v = validators.find(v => v.playerId === r.validatorId);
          if (v) v.chips += r.reward;
          session.eventLog.push({
            type: 'report_reward',
            validatorId: r.validatorId, minerId,
            amount: r.reward,
            timestamp: Date.now(),
          });
        }
        session.eventLog.push({
          type: 'penalty_applied',
          minerId, round: session.round,
          amount: CONFIG.CHEAT_PENALTY_PROCESS,
          penaltyType: 'process',
          timestamp: Date.now(),
        });
      } else if (depth === 'shallow' && isCheat && owner) {
        owner.auditHistory.push({
          targetMinerId: minerId, round: session.round,
          cost: auditCost, result: 'cheat_confirmed',
        });
      }

      results.push({
        minerId, trueQuality, isCheat,
        penaltyType: depth === 'deep' && isCheat ? 'process' : 'none',
        penaltyAmount: depth === 'deep' && isCheat ? CONFIG.CHEAT_PENALTY_PROCESS : 0,
        auditDepth: depth,
      });
    }

    return { results, reportRewards };
  }

  computeRiskScores(sessionId: string, aiLevel: 'low' | 'mid' | 'high'): Record<string, number> {
    const session = this.getSession(sessionId);
    const owner = Object.values(session.players).find(p => p.role === 'subnet_owner') as SubnetOwnerState | undefined;
    if (!owner || owner.aiAnalysisUsed) return {};

    const aiCost = aiLevel === 'low' ? CONFIG.AI_LOW_COST : aiLevel === 'mid' ? CONFIG.AI_MID_COST : CONFIG.AI_HIGH_COST;
    owner.chips -= aiCost;
    owner.aiAnalysisUsed = true;

    const accuracyBonus = aiLevel === 'high' ? 0.15 : aiLevel === 'mid' ? 0.05 : 0;
    const miners = Object.values(session.players).filter(p => p.role === 'miner') as MinerState[];
    const riskScores: Record<string, number> = {};

    for (const miner of miners) {
      let baseRisk = 30;

      const rd = miner.roundData.find(r => r.round === session.round);
      if (rd?.declaredQuality !== null && rd?.declaredQuality !== undefined) {
        if (rd.declaredQuality > rd.trueQuality) baseRisk += 35;
        else if (rd.declaredQuality === rd.trueQuality) baseRisk -= 15;
      }

      const historyCheats = miner.roundData.filter(r => r.isCheat && r.penaltyType !== 'none').length;
      baseRisk += historyCheats * 20;

      const noise = (Math.random() - 0.5) * 20 * (1 - accuracyBonus);
      riskScores[miner.playerId] = Math.round(Math.max(5, Math.min(95, baseRisk + noise)));
    }

    (session as any).aiRiskScores = riskScores;
    return riskScores;
  }

  private startDistribution(session: GameSession): GamePhase {
    const miners = Object.values(session.players).filter(p => p.role === 'miner') as MinerState[];
    const validators = Object.values(session.players).filter(p => p.role === 'validator') as ValidatorState[];
    const owner = Object.values(session.players).find(p => p.role === 'subnet_owner') as SubnetOwnerState;

    const ownerWeights = (owner?.minerRankWeights?.length ?? 0) >= validators.length
      ? owner!.minerRankWeights.slice(0, validators.length)
      : validators.map(() => 1);

    const { minerRewards, validatorRewards, publicPoolAfter } = calculateRoundDistribution(
      miners, validators, session.publicPool, ownerWeights,
    );
    session.publicPool = publicPoolAfter;

    for (const [mid, amount] of Object.entries(minerRewards)) {
      const m = session.players[mid];
      if (m) m.chips += amount;
    }
    for (const [vid, amount] of Object.entries(validatorRewards)) {
      const v = session.players[vid];
      if (v) v.chips += amount;
    }

    (session as any).lastRoundDistribution = { minerRewards, validatorRewards };

    session.eventLog.push({
      type: 'round_distributed',
      round: session.round,
      miners: minerRewards,
      validators: validatorRewards,
      timestamp: Date.now(),
    });

    this.setPhase(session, 'distribution');
    return 'distribution';
  }

  private startTrading(session: GameSession): GamePhase {
    this.setPhase(session, 'trading');
    return 'trading';
  }

  private startFinalReveal(session: GameSession): GamePhase {
    for (const player of Object.values(session.players)) {
      if (player.role === 'miner') {
        const miner = player as MinerState;
        for (const rd of miner.roundData) {
          if (rd.isCheat && rd.penaltyType === 'none') {
            rd.penaltyType = 'reveal';
            rd.penaltyAmount = CONFIG.CHEAT_PENALTY_REVEAL;
            miner.chips -= CONFIG.CHEAT_PENALTY_REVEAL;
            session.publicPool += 1;
          }
          session.eventLog.push({
            type: 'reveal_entry',
            minerId: miner.playerId,
            round: rd.round,
            declared: rd.declaredQuality ?? 0,
            true: rd.trueQuality,
            isCheat: rd.isCheat,
            penaltyType: rd.penaltyType,
            penaltyAmount: rd.penaltyAmount,
            timestamp: Date.now(),
          });
        }
      }
    }
    this.setPhase(session, 'final_reveal');
    return 'final_reveal';
  }

  private startFinalAudit(session: GameSession): GamePhase {
    this.setPhase(session, 'final_audit');
    return 'final_audit';
  }

  private startFinalVote(session: GameSession): GamePhase {
    this.setPhase(session, 'final_vote');
    return 'final_vote';
  }

  castVote(sessionId: string, voterId: string, vote: 'for' | 'against'): void {
    const session = this.getSession(sessionId);
    const player = session.players[voterId];
    if (!player || !player.isAlive) return;

    if (!(session as any)._votes) (session as any)._votes = { for: 0, against: 0 };
    (session as any)._votes[vote] += 1;

    session.eventLog.push({
      type: 'vote_cast',
      voterId, vote,
      timestamp: Date.now(),
    });
  }

  getVoteTally(sessionId: string): { for: number; against: number } {
    const session = this.getSession(sessionId);
    return (session as any)._votes ?? { for: 0, against: 0 };
  }

  private startSettlement(session: GameSession): GamePhase {
    const votes = (session as any)._votes ?? { for: 0, against: 0 };
    const contractPassed = checkVoteThreshold(votes);
    (session as any).contractPassed = contractPassed;

    const alivePlayers = Object.values(session.players).filter(p => p.isAlive);
    alivePlayers.sort((a, b) => b.chips - a.chips);

    const rankings = alivePlayers.map((p, i) => ({
      playerId: p.playerId, role: p.role, finalChips: p.chips,
      rank: i + 1, taotaoShare: 0, taotaoNet: 0, isKicked: false,
    }));

    const taotaoRewards = calculateTaotaoDistribution(
      rankings.map(r => ({ playerId: r.playerId, rank: r.rank })),
      session.taotaoPool,
      contractPassed,
    );

    for (const entry of rankings) {
      const share = taotaoRewards[entry.playerId] ?? 0;
      entry.taotaoShare = share;
      entry.taotaoNet = share - CONFIG.TAOTAO_ENTRY_STAKE;
    }

    (session as any).settlementData = {
      rankings,
      contractPassed,
      voteTally: votes,
      publicGoalAchieved: false,
    };

    session.finishedAt = new Date().toISOString();
    this.setPhase(session, 'settlement');
    return 'settlement';
  }

  getSettlement(sessionId: string): SettlementData | undefined {
    const session = this.getSession(sessionId);
    return (session as any).settlementData;
  }

  buildViewState(sessionId: string, playerId: string, remainingSeconds: number = 120): PlayerViewState {
    const session = this.getSession(sessionId);
    const player = session.players[playerId];
    if (!player) throw new Error(`Player ${playerId} not found`);

    const broadcastEvents: BroadcastEvent[] = session.eventLog.map(ev => ({
      type: ev.type,
      message: formatEventMessage(ev),
      timestamp: ev.timestamp,
    }));

    const base: PlayerViewState = {
      sessionId,
      phase: session.phase,
      round: session.round,
      maxRounds: session.maxRounds,
      myPlayerId: playerId,
      myRole: player.role,
      myChips: player.chips,
      publicPool: session.publicPool,
      taotaoPool: session.taotaoPool,
      remainingSeconds,
      players: Object.values(session.players).map(p => ({
        playerId: p.playerId,
        role: p.role,
        playerType: p.playerType,
        chips: p.chips,
        isAlive: p.isAlive,
        traitorState: ('traitorState' in p ? p.traitorState : 'normal') as any,
      })),
      broadcastEvents,
      auditResults: [],
    };

    if (player.role === 'miner') {
      const miner = player as MinerState;
      const rd = miner.roundData.find(r => r.round === session.round);
      if (rd) {
        base.myTrueQuality = rd.trueQuality;
        base.myDeclaredQuality = rd.declaredQuality ?? undefined;
      }
      base.isTraitor = miner.isTraitor;
    }

    if (player.role === 'validator') {
      const validator = player as ValidatorState;
      const rd = validator.roundData.find(r => r.round === session.round);
      if (rd) {
        base.validatorClue = rd.clue;
        base.myScores = rd.scores;
        base.myReports = rd.reports;
      }
    }

    if (player.role === 'subnet_owner') {
      const owner = player as SubnetOwnerState;
      base.ownerVoteWeight = calculateOwnerWeight(owner);
      base.aiAnalysisAvailable = !owner.aiAnalysisUsed;
      base.aiAnalysisUsed = owner.aiAnalysisUsed;
      base.auditHistory = owner.auditHistory;
      base.confirmedCheats = owner.confirmedCheats;
      base.publicGoal = owner.publicGoal;
    }

    const aiRiskScores = (session as any).aiRiskScores as Record<string, number> | undefined;
    if (aiRiskScores && Object.keys(aiRiskScores).length > 0) {
      base.aiRiskScores = aiRiskScores;
    }

    if (session.phase !== 'declaration' && session.phase !== 'scoring' && session.phase !== 'lobby') {
      const auditResults: AuditResultView[] = [];
      for (const p of Object.values(session.players)) {
        if (p.role === 'miner') {
          const miner = p as MinerState;
          for (const rd of miner.roundData) {
            if (rd.penaltyType !== 'none') {
              auditResults.push({
                minerId: miner.playerId,
                trueQuality: rd.trueQuality,
                isCheat: rd.isCheat,
                penaltyAmount: rd.penaltyAmount,
                auditDepth: rd.penaltyType === 'process' ? 'deep' : 'shallow',
              });
            }
          }
        }
      }
      base.auditResults = auditResults;
    }

    const roundDist = (session as any).lastRoundDistribution as RoundDistributionData | undefined;
    if (roundDist && (session.phase === 'distribution' || session.phase === 'trading'
      || session.phase === 'final_reveal' || session.phase === 'final_audit')) {
      base.roundDistribution = roundDist;
    }

    if (session.phase === 'final_reveal' || session.phase === 'final_audit'
      || session.phase === 'final_vote' || session.phase === 'settlement' || session.phase === 'finished') {
      const revealData: RevealEntry[] = [];
      for (const p of Object.values(session.players)) {
        if (p.role === 'miner') {
          const miner = p as MinerState;
          for (const rd of miner.roundData) {
            revealData.push({
              minerId: miner.playerId,
              round: rd.round,
              declaredQuality: rd.declaredQuality ?? 0,
              trueQuality: rd.trueQuality,
              isCheat: rd.isCheat,
              penaltyType: rd.penaltyType,
              penaltyAmount: rd.penaltyAmount,
            });
          }
        }
      }
      base.revealData = revealData;
    }

    if (session.phase === 'settlement' || session.phase === 'finished') {
      base.settlement = (session as any).settlementData;
    }

    return base;
  }

  getTimerForPhase(phase: GamePhase): number {
    switch (phase) {
      case 'declaration': return CONFIG.TIMER_DECLARATION;
      case 'scoring': return CONFIG.TIMER_SCORING;
      case 'audit': return CONFIG.TIMER_AUDIT;
      case 'trading': return CONFIG.TIMER_TRADING;
      case 'final_audit': return CONFIG.TIMER_DEEP_AUDIT;
      case 'final_vote': return CONFIG.TIMER_VOTE;
      default: return 10;
    }
  }

  startPhaseTimer(sessionId: string, onTick: (remaining: number) => void): void {
    const session = this.getSession(sessionId);
    const seconds = this.getTimerForPhase(session.phase);
    this.remainingSeconds.set(sessionId, seconds);

    const timer = setInterval(() => {
      const remaining = (this.remainingSeconds.get(sessionId) ?? 0) - 1;
      this.remainingSeconds.set(sessionId, remaining);
      onTick(remaining);

      if (remaining <= 0) {
        this.clearTimer(sessionId);
        const cb = this.phaseCallbacks.get(sessionId);
        if (cb) cb();
      }
    }, 1000);

    this.timers.set(sessionId, timer);
  }

  setPhaseTimeout(sessionId: string, callback: () => void): void {
    this.phaseCallbacks.set(sessionId, callback);
  }

  clearTimer(sessionId: string): void {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(sessionId);
    }
  }

  private setPhase(session: GameSession, newPhase: GamePhase): void {
    const oldPhase = session.phase;
    session.phase = newPhase;
    session.eventLog.push({
      type: 'phase_changed',
      from: oldPhase,
      to: newPhase,
      timestamp: Date.now(),
    });
  }
}

function formatEventMessage(ev: GameEvent): string {
  switch (ev.type) {
    case 'phase_changed':
      return `阶段变更：${ev.from} → ${ev.to}`;
    case 'miner_quality_sent':
      return `矿工 ${ev.minerId.slice(0, 8)} 第${ev.round}轮真实质量: ${ev.trueQuality}星`;
    case 'miner_declared':
      return `矿工 ${ev.minerId.slice(0, 8)} 声明 ${ev.declared}星 (真实${ev.true}星)${ev.isCheat ? ' ⚠虚报' : ' ✓诚实'}`;
    case 'validator_clue_sent':
      return `验证者 ${ev.validatorId.slice(0, 8)} 收到线索`;
    case 'validator_scored':
      return `验证者 ${ev.validatorId.slice(0, 8)} 给矿工 ${ev.minerId.slice(0, 8)} 打分: ${ev.score}`;
    case 'validator_reported':
      return `验证者 ${ev.validatorId.slice(0, 8)} 举报矿工 ${ev.minerId.slice(0, 8)} 虚报`;
    case 'owner_audited':
      return `所有者审计矿工 ${ev.minerId.slice(0, 8)}: ${ev.result === 'cheat_confirmed' ? '虚报确认' : '诚实确认'} (花费${ev.cost}筹码)`;
    case 'penalty_applied':
      return `矿工 ${ev.minerId.slice(0, 8)} 被罚款 ${ev.amount} 筹码 (${ev.penaltyType})`;
    case 'report_reward':
      return `验证者 ${ev.validatorId.slice(0, 8)} 举报成功，获得 ${ev.amount} 筹码`;
    case 'round_distributed':
      return `第${ev.round}轮收益分配完成`;
    case 'chips_distributed':
      return `${ev.recipientId.slice(0, 8)} 获得 ${ev.amount} 筹码: ${ev.reason}`;
    case 'vote_cast':
      return `${ev.voterId.slice(0, 8)} 投了 ${ev.vote === 'for' ? '赞成' : '反对'}票`;
    case 'collusion_detected':
      return `检测到验证者 ${ev.validatorId.slice(0, 8)} 合谋，罚款 ${ev.penalty} 筹码`;
    case 'player_kicked':
      return `${ev.playerId.slice(0, 8)} 被踢出: ${ev.reason}`;
    case 'traitor_recruited':
      return `叛徒 ${ev.traitorId.slice(0, 8)} 招募了 ${ev.targetId.slice(0, 8)}`;
    case 'traitor_defected':
      return `${ev.defectorId.slice(0, 8)} 背叛叛徒 ${ev.traitorId.slice(0, 8)}`;
    case 'reveal_entry':
      return `终局揭示：矿工 ${ev.minerId.slice(0, 8)} 第${ev.round}轮 声明${ev.declared}/真实${ev.true} ${ev.isCheat ? '虚报' : '诚实'}`;
    default:
      return `事件: ${(ev as any).type ?? 'unknown'}`;
  }
}
