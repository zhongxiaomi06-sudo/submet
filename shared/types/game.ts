// ====== 角色 ======
export type RoleId = 'subnet_owner' | 'validator' | 'miner';
export type PlayerType = 'human' | 'bot';

// ====== 游戏阶段 ======
export type GamePhase =
  | 'lobby'
  | 'declaration'
  | 'scoring'
  | 'audit'
  | 'distribution'
  | 'trading'
  | 'final_reveal'
  | 'final_audit'
  | 'final_vote'
  | 'settlement'
  | 'finished';

// ====== 叛徒状态 ======
export type TraitorState = 'normal' | 'contracted' | 'traitor';

// ====== 玩家基础信息 ======
export interface PublicPlayerInfo {
  playerId: string;
  role: RoleId;
  playerType: PlayerType;
  chips: number;
  isAlive: boolean;
  traitorState: TraitorState;
}

// ====== 矿工 ======
export interface MinerState {
  playerId: string;
  role: 'miner';
  playerType: PlayerType;
  chips: number;
  isAlive: boolean;
  isTraitor: boolean;
  traitorState: TraitorState;
  roundData: RoundMinerData[];
  finalRank: number | null;
}

export interface RoundMinerData {
  round: number;
  trueQuality: number;
  declaredQuality: number | null;
  isCheat: boolean;
  penaltyType: 'none' | 'process' | 'reveal' | 'deep_audit';
  penaltyAmount: number;
}

// ====== 验证者 ======
export interface ValidatorState {
  playerId: string;
  role: 'validator';
  playerType: PlayerType;
  chips: number;
  isAlive: boolean;
  isTraitor: false;
  traitorState: 'normal';
  roundData: RoundValidatorData[];
  isColluding: boolean;
  kickList: string[];
}

export interface RoundValidatorData {
  round: number;
  clue: string;
  scores: Record<string, number>;
  reports: string[];
  reportsCost: number;
}

// ====== 子网所有者 ======
export interface SubnetOwnerState {
  playerId: string;
  role: 'subnet_owner';
  playerType: PlayerType;
  chips: number;
  isAlive: boolean;
  isTraitor: false;
  traitorState: 'normal';
  allowance: number;
  auditHistory: AuditRecord[];
  voteWeight: number;
  confirmedCheats: number;
  distributionWeights: { minerGroup: number; validatorGroup: number };
  minerRankWeights: number[];
  publicGoal: string;
  aiAnalysisUsed: boolean;
  aiAnalysisPublic: boolean;
}

export interface AuditRecord {
  targetMinerId: string;
  round: number;
  cost: number;
  result: 'cheat_confirmed' | 'honest_confirmed';
}

// ====== 统一类型 ======
export type PlayerState = MinerState | ValidatorState | SubnetOwnerState;

// ====== 游戏会话 ======
export interface GameSession {
  sessionId: string;
  phase: GamePhase;
  round: number;
  maxRounds: number;
  players: Record<string, PlayerState>;
  publicPool: number;
  taotaoPool: number;
  traitorFund: number;
  eventLog: GameEvent[];
  createdAt: string;
  finishedAt: string | null;
}

// ====== 前端视图（服务端过滤后推送） ======
export interface PlayerViewState {
  sessionId: string;
  phase: GamePhase;
  round: number;
  maxRounds: number;
  myPlayerId: string;
  myRole: RoleId;
  myChips: number;
  publicPool: number;
  taotaoPool: number;
  remainingSeconds: number;
  players: PublicPlayerInfo[];
  broadcastEvents: BroadcastEvent[];
  // 仅矿工
  myTrueQuality?: number;
  myDeclaredQuality?: number;
  myRank?: number;
  isTraitor?: boolean;
  // 仅验证者
  validatorClue?: string;
  myScores?: Record<string, number>;
  myReports?: string[];
  // 仅所有者
  ownerVoteWeight?: number;
  aiAnalysisAvailable?: boolean;
  aiAnalysisUsed?: boolean;
  auditHistory?: AuditRecord[];
  confirmedCheats?: number;
  publicGoal?: string;
  // 逐步揭示
  auditResults?: AuditResultView[];
  // 终局
  contractPassed?: boolean;
  revealData?: RevealEntry[];
  settlement?: SettlementData;
  myTaotaoReward?: number;
  myTaotaoNet?: number;
}

export interface BroadcastEvent {
  type: string;
  message: string;
  timestamp: number;
}

export interface AuditResultView {
  minerId: string;
  trueQuality: number;
  isCheat: boolean;
  penaltyAmount: number;
}

export interface RevealEntry {
  minerId: string;
  round: number;
  declaredQuality: number;
  trueQuality: number;
  isCheat: boolean;
  penaltyType: 'process' | 'reveal' | 'deep_audit' | 'none';
  penaltyAmount: number;
}

export interface SettlementData {
  rankings: Array<{
    playerId: string;
    role: RoleId;
    finalChips: number;
    rank: number;
    taotaoShare: number;
    taotaoNet: number;
    isKicked: boolean;
  }>;
  contractPassed: boolean;
  voteTally: { for: number; against: number };
  publicGoalAchieved: boolean;
}

// ====== 游戏事件 ======
export type GameEvent =
  | { type: 'miner_quality_sent'; minerId: string; trueQuality: number; round: number; timestamp: number }
  | { type: 'miner_declared'; minerId: string; declared: number; true: number; isCheat: boolean; round: number; timestamp: number }
  | { type: 'validator_clue_sent'; validatorId: string; clue: string; round: number; timestamp: number }
  | { type: 'validator_scored'; validatorId: string; minerId: string; score: number; round: number; timestamp: number }
  | { type: 'validator_reported'; validatorId: string; minerId: string; cost: number; round: number; timestamp: number }
  | { type: 'owner_audited'; minerId: string; round: number; cost: number; result: 'cheat_confirmed' | 'honest_confirmed'; timestamp: number }
  | { type: 'penalty_applied'; minerId: string; round: number; amount: number; penaltyType: string; timestamp: number }
  | { type: 'report_reward'; validatorId: string; minerId: string; amount: number; timestamp: number }
  | { type: 'round_distributed'; round: number; miners: Record<string, number>; validators: Record<string, number>; timestamp: number }
  | { type: 'chips_distributed'; recipientId: string; amount: number; reason: string; timestamp: number }
  | { type: 'vote_cast'; voterId: string; vote: 'for' | 'against'; timestamp: number }
  | { type: 'collusion_detected'; validatorId: string; penalty: number; timestamp: number }
  | { type: 'player_kicked'; playerId: string; reason: string; timestamp: number }
  | { type: 'phase_changed'; from: GamePhase; to: GamePhase; timestamp: number }
  | { type: 'traitor_recruited'; traitorId: string; targetId: string; bribe: number; task: string; timestamp: number }
  | { type: 'traitor_defected'; defectorId: string; traitorId: string; penalty: number; timestamp: number }
  | { type: 'reveal_entry'; minerId: string; round: number; declared: number; true: number; isCheat: boolean; penaltyType: string; penaltyAmount: number; timestamp: number };

// ====== V4.3 终端配置常量 ======
export const CONFIG = {
  INITIAL_CHIPS: 15,
  OWNER_ALLOWANCE: 3,
  PUBLIC_POOL_START: 14,
  TAOTAO_POOL_START: 0.35,
  TAOTAO_ENTRY_STAKE: 0.05,
  TRAITOR_FUND: 6,
  CHEAT_PENALTY_PROCESS: 3,
  CHEAT_PENALTY_REVEAL: 1,
  CHEAT_PENALTY_DEEP: 3,
  AUDIT_COST: 1,
  REPORT_COST: 1,
  REPORT_REWARD: 4,
  ROUND_DISTRIBUTION: 6,
  MINER_GROUP_SHARE: 0.70,
  MINER_RANK_SHARES: [0.50, 0.25, 0.15, 0.10],
  COLLUSION_PENALTY: 5,
  DEFECT_PENALTY_DEFECTOR: 3,
  DEFECT_PENALTY_TRAITOR: 5,
  TREASURY_FEE: 0.05,
  CHAMPION_SHARE: 0.35,
  RUNNER_UP_SHARE: 0.25,
  THIRD_SHARE: 0.18,
  MID_SHARE: 0.15,
  SIXTH_SHARE: 0.07,
  AI_LOW_COST: 1,
  AI_MID_COST: 3,
  AI_HIGH_COST: 6,
  OWNER_BASE_WEIGHT: 0.5,
  OWNER_WEIGHT_PER_CHEAT: 0.1,
  OWNER_WEIGHT_PUBLIC_REPORT: 0.2,
  VOTE_THRESHOLD: 2 / 3,
  TIMER_DECLARATION: 120,
  TIMER_SCORING: 180,
  TIMER_AUDIT: 120,
  TIMER_TRADING: 120,
  TIMER_DEEP_AUDIT: 120,
  TIMER_VOTE: 90,
} as const;
