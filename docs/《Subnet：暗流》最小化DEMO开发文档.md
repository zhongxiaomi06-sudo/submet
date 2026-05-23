# 《Subnet：暗流》DEMO 开发教程

## v3.0 — V4.3 规则 · 前后端并行 · 教程式

---

## 目录

- [阅读指南：本文档怎么用](#阅读指南本文档怎么用)
- [Step 0：搭脚手架（前后端各 10 分钟）](#step-0搭脚手架前后端各-10-分钟)
- [Step 1：共享类型定义（前后端同时开工）](#step-1共享类型定义前后端同时开工)
- [Step 2：后端规则引擎（后端独立开发，前端并行 Step 3）](#step-2后端规则引擎后端独立开发前端并行-step-3)
- [Step 3：前端路由 + Store + Socket 客户端（前端独立开发）](#step-3前端路由--store--socket-客户端前端独立开发)
- [Step 4：后端 REST API + 房间系统](#step-4后端-rest-api--房间系统)
- [Step 5：前后端握手（第一个 Socket 事件走通）](#step-5前后端握手第一个-socket-事件走通)
- [Step 6：前端游戏界面（按阶段逐个实现）](#step-6前端游戏界面按阶段逐个实现)
- [Step 7：后端 Bot 玩家 + 倒计时系统](#step-7后端-bot-玩家--倒计时系统)
- [Step 8：前后端联调](#step-8前后端联调)
- [Step 9：数据导出 + 报告页](#step-9数据导出--报告页)
- [Step 10：V4.3 收尾功能](#step-10v43-收尾功能)
- [附录 A：Socket 事件速查](#附录-asocket-事件速查)
- [附录 B：V4.3 数值表](#附录-bv43-数值表)

---

## 阅读指南：本文档怎么用

**目标**：两个开发者（一个前端 + 一个后端），5 天内交付可玩的《暗流》DEMO。

**并行策略**：

```
Step 0 ──→ Step 1（共享类型，两人一起 30 分钟）
                       │
         ┌─────────────┼─────────────┐
         ▼                           ▼
    Step 2（后端）              Step 3（前端）
    规则引擎独立开发              路由+Store+Socket
         │                           │
         ├───────────┬───────────────┘
         ▼           ▼
    Step 4（后端）   Step 6（前端）
    REST+房间       游戏界面
         │               │
         └───────┬───────┘
                 ▼
           Step 5（握手）← 前后端第一次联调
                 │
         ┌───────┴───────┐
         ▼               ▼
    Step 7（后端）   Step 8（联调）
    Bot+倒计时      完整一局
                 │
                 ▼
           Step 9（导出+报告）
                 │
                 ▼
           Step 10（V4.3收尾）
```

**每个 Step 的结构**：
1. 这段做什么
2. 具体操作步骤
3. 完成后怎么验证

**对标规则文档**：[《Subnet：暗流》完整规则文档 V4.3 修订版](file:///e:/Create/Code/SubNet/《Subnet：暗流》完整规则文档 V4.0 修订版.md)

---

## Step 0：搭脚手架（前后端各 10 分钟）

### 创建目录

```
undercurrent-demo/
├── shared/types/       ← 共享类型（前后端公用）
├── server/             ← 后端（Express + Socket.IO + SQLite）
│   └── src/
│       ├── game/       ← 规则引擎
│       ├── bot/        ← AI Bot 决策
│       ├── db/         ← 数据库
│       ├── network/    ← REST + Socket 处理
│       ├── view/       ← PlayerViewState 过滤
│       └── data/       ← 导出
├── client/             ← 前端（React + Vite + Zustand）
│   └── src/
│       ├── store/
│       ├── socket/
│       ├── pages/
│       ├── components/
│       │   ├── layout/
│       │   ├── phases/
│       │   └── common/
│       └── hooks/
└── package.json        ← 根 monorepo
```

### 根 package.json

```json
{
  "name": "undercurrent-demo",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npx tsx watch src/index.ts",
    "dev:client": "cd client && npx vite"
  },
  "devDependencies": {
    "concurrently": "^9.0.0",
    "typescript": "^5.5.0"
  }
}
```

### server/package.json

```json
{
  "name": "undercurrent-server",
  "private": true,
  "scripts": { "dev": "tsx watch src/index.ts" },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "socket.io": "^4.7.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "tsx": "^4.0.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/cors": "^2.8.0",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/uuid": "^10.0.0"
  }
}
```

### client/package.json

```json
{
  "name": "undercurrent-client",
  "private": true,
  "scripts": { "dev": "vite", "build": "vite build" },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.0.0",
    "socket.io-client": "^4.7.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0",
    "vite": "^6.0.0"
  }
}
```

### 安装

```bash
cd undercurrent-demo
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 验证

- 根目录 `npm run dev` 应该启动两个进程（虽然后端还没有 index.ts，前端还没有 index.html）
- 此时两个开发者可以开始写代码了。

---

## Step 1：共享类型定义（前后端同时开工）

> 两人一起做，30 分钟。这是前后端唯一的硬依赖——类型定义必须一致。

### 文件：`shared/types/game.ts`

```typescript
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
```

### 验证

- `shared/types/game.ts` 被前后端正确 import（分别加 tsconfig paths）
- TypeScript 编译无报错

---

## Step 2：后端规则引擎（后端独立开发，前端并行 Step 3）

> 后端开发者独立做，预计 3 小时。前端同时做 Step 3。
> 目标：完成所有筹码计算和状态机逻辑——**此时不需要 HTTP 或 Socket**，可以直接写单元测试验证。

### 文件清单（按编写顺序）

```
server/src/config.ts            ← 常量（直接用 shared/types CONFIG）
server/src/db/connection.ts     ← SQLite 连接
server/src/db/schema.ts         ← 建表
server/src/game/ChipCalculator.ts   ← 筹码计算
server/src/game/AuditResolver.ts    ← 审计判定
server/src/game/ClueGenerator.ts    ← 线索生成
server/src/game/VoteManager.ts      ← 投票权重
server/src/game/TraitorContractEngine.ts ← 叛徒契约
server/src/game/SettlementEngine.ts ← 终局结算
server/src/game/GameEngine.ts       ← 状态机（最后写，依赖上面全部）
```

### 2.1 config.ts

```typescript
// 从 shared 导出常量——后端其他地方 import 这个即可
// V4.3 修订版新增：
// SHALLOW_AUDIT_COST = 1, DEEP_AUDIT_COST = 3 —— 审计分层定价
export { CONFIG } from '../../shared/types/game';
```

### 2.2 db/connection.ts

```typescript
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'undercurrent.db');
let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}
```

### 2.3 db/schema.ts

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  phase TEXT NOT NULL DEFAULT 'lobby',
  round INTEGER NOT NULL DEFAULT 1,
  max_rounds INTEGER NOT NULL DEFAULT 3,
  public_pool REAL NOT NULL DEFAULT 14,
  taotao_pool REAL NOT NULL DEFAULT 0.35,
  traitor_fund REAL NOT NULL DEFAULT 6,
  public_goal TEXT,
  ai_analysis_used INTEGER NOT NULL DEFAULT 0,
  contract_passed INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS players (
  player_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('subnet_owner','validator','miner')),
  player_type TEXT NOT NULL CHECK(player_type IN ('human','bot')),
  socket_id TEXT,
  chips REAL NOT NULL DEFAULT 15,
  is_alive INTEGER NOT NULL DEFAULT 1,
  is_traitor INTEGER NOT NULL DEFAULT 0,
  traitor_state TEXT NOT NULL DEFAULT 'normal',
  round_data_json TEXT DEFAULT '[]',
  vote TEXT,
  vote_weight REAL DEFAULT 1.0,
  confirmed_cheats INTEGER DEFAULT 0,
  final_rank INTEGER,
  taotao_reward REAL,
  PRIMARY KEY (player_id, session_id)
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  round INTEGER NOT NULL,
  phase TEXT NOT NULL,
  type TEXT NOT NULL,
  actor TEXT,
  payload TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);
```

```typescript
// schema.ts — 执行建表
import { getDb } from './connection';

export function initDB(): void {
  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS sessions ...`);  // 上面3条SQL
}
```

### 2.4 game/ChipCalculator.ts

**你需要实现以下函数**：

```typescript
import { CONFIG } from '../config';
import type { PlayerState, MinerState, ValidatorState } from '../../shared/types/game';

// 矿工排名分配（每轮从公共池支出 6 筹码）
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
  // 1. 取公共池可分配量 = min(CONFIG.ROUND_DISTRIBUTION, publicPool)
  // 2. 矿工 70%：按排名 50/25/15/10 分给4名矿工
  // 3. 验证者 30%：按所有者预设权重分给3名验证者
  // 4. 返回各人所得 + 扣除后的公共池
}

// 虚报罚款（过程中审计）
export function applyCheatPenalty(
  miner: MinerState,
  round: number,
  penaltyType: 'process' | 'reveal' | 'deep_audit'
): { minerChipsAfter: number; poolIncrease: number; ownerReward: number } {
  const penalty = penaltyType === 'reveal' ? CONFIG.CHEAT_PENALTY_REVEAL : CONFIG.CHEAT_PENALTY_PROCESS;
  return {
    minerChipsAfter: miner.chips - penalty,
    poolIncrease: 1,
    ownerRewward: penaltyType === 'reveal' ? 0 : 2,
  };
}

// 终局 TAO 阶梯分账
export function calculateTaotaoDistribution(
  rankings: Array<{ playerId: string; rank: number }>,
  taotaoPool: number,
  contractPassed: boolean
): Record<string, number> {
  // 1. 先扣 5% 国库
  // 2. 剩余 95% 按排名阶梯：冠军35%、亚军25%、季军18%、4-5名15%(均分)、6名7%、7名0%
  // 3. 返回每人 TAO 收益
}
```

**验证**：写好 `calculateRoundDistribution` 后，在 node 中手动传入 4 个矿工（不同排名）和 3 个验证者，检查数值是否合理。

### 2.5 game/AuditResolver.ts

```typescript
import type { MinerState } from '../../shared/types/game';
import { CONFIG } from '../config';

// 审计判定
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

// 举报核实：矿工被审计证实虚报 → 成功举报的验证者获得奖励
export function verifyReports(
  miner: MinerState,
  round: number,
  validators: Array<{ playerId: string; reports: string[]; chips: number }>
): Array<{ validatorId: string; reward: number }> {
  const rd = miner.roundData.find(r => r.round === round);
  if (!rd || !rd.isCheat) return [];
  return validators
    .filter(v => v.reports.includes(miner.playerId))
    .map(v => ({ validatorId: v.playerId, reward: CONFIG.REPORT_REWARD }));
}

// 合谋自动检测
export function detectCollusion(
  validator: { playerId: string; roundData: Array<{ scores: Record<string, number>; reports: string[] }> },
  miners: MinerState[],
  round: number
): boolean {
  // 给某虚报矿工打分 >70 且未举报 → 标记合谋
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
```

### 2.5b 审计分层机制（V4.3 修订版新增）

**浅审计**（1 筹码/矿工）：仅揭示矿工真实质量，不执行罚款。用于低成本信息侦查。
**深审计**（3 筹码/矿工）：揭示真实质量 + 若虚报则罚款并广播。用于经济惩罚。

GameEngine.executeAudit 接受 depth 参数：'shallow' | 'deep'。浅审计不触发 verifyReports（举报奖励只在深审计中兑现）。

### 2.6 game/ClueGenerator.ts

```typescript
import type { MinerState } from '../../shared/types/game';

const CLUE_POOL = [
  (miners: MinerState[], round: number) => {
    const m = miners[Math.floor(Math.random() * miners.length)];
    const q = m.roundData.find(r => r.round === round)?.trueQuality ?? 0;
    return q >= 3 ? `矿工 ${m.playerId} 的本轮真实质量在 3-5 星之间` : `矿工 ${m.playerId} 的本轮真实质量在 1-2 星之间`;
  },
  (miners: MinerState[], round: number) => {
    const m = miners[Math.floor(Math.random() * miners.length)];
    const q = m.roundData.find(r => r.round === round)?.trueQuality ?? 0;
    return `矿工 ${m.playerId} 的本轮真实质量为${q % 2 === 0 ? '偶数' : '奇数'}`;
  },
  (miners: MinerState[], _round: number) => {
    const count = miners.filter(m => {
      const q = m.roundData.find(r => r.round === _round)?.trueQuality ?? 0;
      return q >= 4;
    }).length;
    return `本轮 4 名矿工中，有 ${count} 人的真实质量 ≥ 4 星`;
  },
  (miners: MinerState[], _round: number) => {
    const qualities = miners.map(m => m.roundData.find(r => r.round === _round)?.trueQuality ?? 0);
    const diff = Math.max(...qualities) - Math.min(...qualities);
    return `本轮最高与最低真实质量的差值 ${diff >= 3 ? '≥' : '<'} 3 星`;
  },
  (miners: MinerState[], _round: number) => {
    const cheaters = miners.filter(m => m.roundData.some(r => r.isCheat && r.penaltyType !== 'none'));
    if (cheaters.length > 0) {
      const m = cheaters[Math.floor(Math.random() * cheaters.length)];
      return `矿工 ${m.playerId} 在已进行的轮次中累计虚报了至少 1 次`;
    }
    return '本轮所有矿工在历史中无虚报记录';
  },
  (miners: MinerState[], _round: number) => {
    const hasLow = miners.some(m => {
      const q = m.roundData.find(r => r.round === _round)?.trueQuality ?? 0;
      return q === 1;
    });
    return `本轮${hasLow ? '至少有 1 名' : '没有'}矿工的真实质量 = 1`;
  },
];

export function generateClues(miners: MinerState[], round: number, count: number): string[] {
  // Fisher-Yates shuffle, 取前 count 条
  const pool = [...CLUE_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).map(fn => fn(miners, round));
}
```

### 2.7 game/VoteManager.ts

```typescript
import { CONFIG } from '../config';
import type { SubnetOwnerState } from '../../shared/types/game';

export function calculateOwnerWeight(owner: SubnetOwnerState): number {
  let w = CONFIG.OWNER_BASE_WEIGHT + CONFIG.OWNER_WEIGHT_PER_CHEAT * owner.confirmedCheats;
  if (owner.aiAnalysisPublic) w += CONFIG.OWNER_WEIGHT_PUBLIC_REPORT;
  return Math.min(w, 1.0);
}

export function checkVoteThreshold(votes: { for: number; against: number }): boolean {
  const total = votes.for + votes.against;
  return total > 0 && votes.for > total * CONFIG.VOTE_THRESHOLD;
}
```

### 2.8 game/GameEngine.ts

**最核心的模块。你需要实现的状态机**：

```
lobby ─→ declaration ─→ scoring ─→ audit ─→ distribution
                                                  │
                          ┌───────────────────────┘
                          ▼
                     若 round < 3 → 回到 declaration
                     若 round = 3 → trading → final_reveal
                                                  │
                        ┌─────────────────────────┘
                        ▼
                  final_audit → final_vote → settlement → finished
```

**关键函数**：

```typescript
import type { GameSession, PlayerState, MinerState, ValidatorState, SubnetOwnerState } from '../../shared/types/game';
import { CONFIG } from '../config';
import { generateClues } from './ClueGenerator';
import { resolveAudit, verifyReports, detectCollusion } from './AuditResolver';
import { calculateRoundDistribution, applyCheatPenalty, calculateTaotaoDistribution } from './ChipCalculator';
import { calculateOwnerWeight, checkVoteThreshold } from './VoteManager';

export class GameEngine {
  private sessions: Map<string, GameSession> = new Map();

  // ====== 会话生命周期 ======
  createSession(players: PlayerState[]): GameSession { /* ... */ }
  getSession(sessionId: string): GameSession { /* ... */ }

  // ====== 阶段推进（核心） ======
  advancePhase(sessionId: string): GamePhase {
    const session = this.getSession(sessionId);
    switch (session.phase) {
      case 'lobby':
        return this.startRound(session);
      case 'declaration':
        return this.startScoring(session);
      case 'scoring':
        return this.startAudit(session);
      case 'audit':
        return this.startDistribution(session);
      case 'distribution':
        return session.round >= session.maxRounds
          ? this.startTrading(session)
          : this.startRound(session);
      case 'trading':
        return this.startFinalReveal(session);
      case 'final_reveal':
        return this.startFinalAudit(session);
      case 'final_audit':
        return this.startFinalVote(session);
      case 'final_vote':
        return this.startSettlement(session);
      default:
        return session.phase;
    }
  }

  // ====== 各阶段实现 ======
  private startRound(session: GameSession): GamePhase {
    session.round += (session.phase === 'lobby' ? 0 : 1);
    // 为每名矿工生成真实质量 (1-5)
    // → 这个质量仅供引擎持有，在 Scoring 阶段告知矿工
    const miners = Object.values(session.players).filter(p => p.role === 'miner') as MinerState[];
    for (const m of miners) {
      const q = Math.floor(Math.random() * 5) + 1;
      m.roundData.push({ round: session.round, trueQuality: q, declaredQuality: null, isCheat: false, penaltyType: 'none', penaltyAmount: 0 });
    }
    return 'declaration';
  }

  // 矿工提交声明（由 Socket 事件触发）
  submitDeclaration(sessionId: string, minerId: string, declaredQuality: number): void {
    const session = this.getSession(sessionId);
    const miner = session.players[minerId] as MinerState;
    const rd = miner.roundData.find(r => r.round === session.round)!;
    rd.declaredQuality = declaredQuality;
    rd.isCheat = declaredQuality > rd.trueQuality;
  }

  private startScoring(session: GameSession): GamePhase {
    // 为每名验证者生成线索
    const validators = Object.values(session.players).filter(p => p.role === 'validator') as ValidatorState[];
    const miners = Object.values(session.players).filter(p => p.role === 'miner') as MinerState[];
    const clues = generateClues(miners, session.round, validators.length);
    for (let i = 0; i < validators.length; i++) {
      validators[i].roundData.push({
        round: session.round, clue: clues[i], scores: {}, reports: [], reportsCost: 0,
      });
    }
    return 'scoring';
  }

  // 验证者提交评分+举报（由 Socket 事件触发）
  submitScores(sessionId: string, validatorId: string, scores: Record<string, number>, reports: string[]): void {
    const session = this.getSession(sessionId);
    const validator = session.players[validatorId] as ValidatorState;
    const rd = validator.roundData.find(r => r.round === session.round)!;
    rd.scores = scores;
    rd.reports = reports;
    rd.reportsCost = reports.length * CONFIG.REPORT_COST;
    validator.chips -= rd.reportsCost;
  }

  // 审计（由 Socket 事件触发）
  executeAudit(sessionId: string, minerIds: string[], aiLevel?: 'low' | 'mid' | 'high', aiPublic?: boolean): {
    results: AuditResult[];
    reportRewards: Array<{ validatorId: string; amount: number }>;
    clues?: string[];
  } {
    // 对每个选中的矿工：揭示真实质量 → 判定是否虚报 → 执行罚款 → 核实举报
    // 如果使用了 AI 分析：返回随机挑选的可疑矿工
    // 返回审计结果 + 举报奖励 + AI 线索
  }

  private startDistribution(session: GameSession): GamePhase {
    // 计算排名 → 分配 6 筹码
    const miners = Object.values(session.players).filter(p => p.role === 'miner') as MinerState[];
    // 收集所有验证者的评分，取均值 → 排序 → 分配
    // ...
    return 'distribution';
  }

  // ====== 终局阶段 ======
  private startFinalReveal(session: GameSession): GamePhase {
    // V4.3：揭露全部 3 轮真实质量 + 声明 → 执行揭示惩罚（1 筹码/次）
    for (const player of Object.values(session.players)) {
      if (player.role === 'miner') {
        const miner = player as MinerState;
        for (const rd of miner.roundData) {
          if (rd.isCheat && rd.penaltyType === 'none') {
            const { minerChipsAfter, poolIncrease } = applyCheatPenalty(miner, rd.round, 'reveal');
            miner.chips = minerChipsAfter;
            session.publicPool += poolIncrease;
            rd.penaltyType = 'reveal';
            rd.penaltyAmount = CONFIG.CHEAT_PENALTY_REVEAL;
          }
        }
      }
    }
    return 'final_reveal';
  }

  private startSettlement(session: GameSession): GamePhase {
    // 计算终局排名（按筹码排序）→ 执行 TAO 阶梯分账
    const alivePlayers = Object.values(session.players).filter(p => p.isAlive);
    alivePlayers.sort((a, b) => b.chips - a.chips);
    const rankings = alivePlayers.map((p, i) => ({ playerId: p.playerId, rank: i + 1 }));
    const taotaoRewards = calculateTaotaoDistribution(rankings, session.taotaoPool, session.contractPassed!);
    // 更新每人 TAO 收益
    return 'settlement';
  }

  // ====== 视图过滤（V4.3：服务端决定每个玩家看到什么） ======
  buildViewState(sessionId: string, playerId: string): PlayerViewState {
    // 见 Step 5 中的详细实现
    // 核心：取 session 中的秘密数据 → 按角色过滤 → 返回该玩家有权看到的部分
  }
}
```

**验证**：写一个简单的 `test-engine.ts`，创建 7 个 Player，手动调用 `advancePhase` → `submitDeclaration` → `submitScores` → `executeAudit`，检查各阶段筹码是否按 V4.3 数值变更。能在 Node.js 中跑完整一轮即为通过。

---

## Step 3：前端路由 + Store + Socket 客户端（前端独立开发）

> 前端开发者独立做，预计 2 小时。后端同时做 Step 2。
> 目标：完成前端骨架——此时还没有真实 Socket 连接，先用 Mock 数据让页面能渲染。

### 文件清单

```
client/src/main.tsx                    ← 入口
client/src/App.tsx                     ← 路由
client/src/store/gameStore.ts          ← Zustand Store（最核心）
client/src/socket/socketClient.ts      ← Socket.IO 封装
client/src/hooks/useGameState.ts       ← 便捷 hook
client/src/pages/HomePage.tsx          ← 首页
client/src/pages/RoomPage.tsx          ← 等待室
client/src/pages/GamePage.tsx          ← 游戏主页面（骨架）
client/src/components/layout/TopBar.tsx
client/src/components/layout/PlayerList.tsx
client/src/components/layout/EventLog.tsx
```

### 3.1 main.tsx + App.tsx

```tsx
// main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';  // tailwind

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

// App.tsx
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';
import GamePage from './pages/GamePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
      <Route path="/room/:roomId/game" element={<GamePage />} />
    </Routes>
  );
}
```

### 3.2 store/gameStore.ts（核心）

```typescript
import { create } from 'zustand';
import type { PlayerViewState, RoleId } from '../../../shared/types/game';

interface GameStore {
  // 连接状态
  connected: boolean;
  // 房间
  roomId: string | null;
  sessionId: string | null;
  myPlayerId: string | null;
  myRole: RoleId | null;
  // 游戏视图（服务端推送）
  view: PlayerViewState | null;

  // 本地 UI 暂存
  selectedStars: number;
  pendingScores: Record<string, number>;
  pendingReports: string[];
  pendingAuditTargets: string[];
  pendingKickList: string[];

  // Actions
  setConnected: (v: boolean) => void;
  setRoom: (roomId: string, playerId: string, role: RoleId) => void;
  setView: (view: PlayerViewState) => void;
  setSelectedStars: (n: number) => void;
  setPendingScore: (minerId: string, score: number) => void;
  toggleReport: (minerId: string) => void;
  toggleAuditTarget: (minerId: string) => void;
  toggleKick: (minerId: string) => void;
  resetLocalState: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  connected: false,
  roomId: null,
  sessionId: null,
  myPlayerId: null,
  myRole: null,
  view: null,
  selectedStars: 3,
  pendingScores: {},
  pendingReports: [],
  pendingAuditTargets: [],
  pendingKickList: [],

  setConnected: (v) => set({ connected: v }),
  setRoom: (roomId, playerId, role) => set({
    roomId, myPlayerId: playerId, myRole: role,
    selectedStars: 3, pendingScores: {}, pendingReports: [], pendingAuditTargets: [], pendingKickList: [],
  }),
  setView: (view) => set({ view, sessionId: view.sessionId }),
  setSelectedStars: (n) => set({ selectedStars: n }),
  setPendingScore: (minerId, score) => set((s) => ({
    pendingScores: { ...s.pendingScores, [minerId]: score }
  })),
  toggleReport: (minerId) => set((s) => ({
    pendingReports: s.pendingReports.includes(minerId)
      ? s.pendingReports.filter(id => id !== minerId)
      : [...s.pendingReports, minerId]
  })),
  toggleAuditTarget: (minerId) => set((s) => ({
    pendingAuditTargets: s.pendingAuditTargets.includes(minerId)
      ? s.pendingAuditTargets.filter(id => id !== minerId)
      : [...s.pendingAuditTargets, minerId]
  })),
  toggleKick: (minerId) => set((s) => ({
    pendingKickList: s.pendingKickList.includes(minerId)
      ? s.pendingKickList.filter(id => id !== minerId)
      : [...s.pendingKickList, minerId]
  })),
  resetLocalState: () => set({
    selectedStars: 3, pendingScores: {}, pendingReports: [], pendingAuditTargets: [], pendingKickList: [],
  }),
}));
```

### 3.3 socket/socketClient.ts

```typescript
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

  // 核心事件：服务端推送最新视图
  s.on('state:updated', (view) => store.setView(view));

  // 私有事件
  s.on('game:miner_quality', ({ trueQuality }) => {
    // 仅矿工收到 → 更新 view.myTrueQuality（由 setView 处理）
  });

  s.on('game:clue', ({ clue }) => {
    // 仅验证者收到
  });

  s.on('game:phase_changed', ({ phase, remainingSeconds }) => {
    const v = useGameStore.getState().view;
    if (v) store.setView({ ...v, phase, remainingSeconds });
  });
}

// ====== Emit 函数（每个玩家操作对应一个） ======
export function emitJoinRoom(roomId: string) {
  getSocket().emit('room:join', { roomId });
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

export function emitAudit(minerIds: string[]) {
  getSocket().emit('player:audit', { minerIds });
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
```

### 3.4 pages/HomePage.tsx

```tsx
import { useNavigate } from 'react-router-dom';
import { connectSocket, emitJoinRoom } from '../socket/socketClient';
import { useGameStore } from '../store/gameStore';

export default function HomePage() {
  const navigate = useNavigate();
  const connected = useGameStore(s => s.connected);

  const handleCreateRoom = () => {
    connectSocket();
    // 临时：自己生成房间号。Step 4 后改为调用 POST /api/rooms
    const roomId = Math.random().toString(36).slice(2, 8);
    emitJoinRoom(roomId);
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">《Subnet：暗流》</h1>
        <p className="text-gray-400 mb-8">DEMO v3.0 · V4.3 规则</p>
        <button
          onClick={handleCreateRoom}
          className="px-8 py-3 bg-blue-600 rounded-lg hover:bg-blue-500 text-lg"
        >
          创建房间
        </button>
        <p className="mt-4 text-sm text-gray-500">
          其他玩家输入房间号即可加入 · 不足 7 人由 AI Bot 补齐
        </p>
      </div>
    </div>
  );
}
```

### 验证

- 浏览器打开 `http://localhost:5173`，看到"创建房间"按钮
- 点击后跳转到 `/room/xxxxx`
- 控制台无报错（Socket 连接在 Step 4 后端跑起来之前会是连接失败，正常）

---

---

## Step 4：后端 REST API + 房间系统

> 后端独立做，预计 2 小时。Step 2 完成后方可开始。
> 目标：Express 启动 + Socket.IO 初始化 + REST 路由 + SQLite 数据读写。

### 4.1 server/src/index.ts（入口）

```typescript
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { initDB } from './db/schema';
import { setupRoutes } from './network/routes';
import { setupSocketHandlers } from './network/socketHandler';
import { RoomManager } from './network/roomManager';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// 初始化数据库
initDB();

// 房间管理（全局单例）
const roomManager = new RoomManager();

// REST 路由
setupRoutes(app, roomManager);

// Socket 事件
setupSocketHandlers(io, roomManager);

const PORT = 3001;
server.listen(PORT, () => console.log(`Undercurrent DEMO server on :${PORT}`));
```

### 4.2 network/roomManager.ts

```typescript
import { v4 as uuid } from 'uuid';
import { GameEngine } from '../game/GameEngine';
import type { PlayerState, RoleId, PlayerType } from '../../shared/types/game';

interface Room {
  roomId: string;
  players: Map<string, { socketId: string; playerState: PlayerState | null }>;
  sessionId: string | null;
  gameEngine: GameEngine;
  gameStarted: boolean;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private gameEngine: GameEngine = new GameEngine();

  createRoom(): string {
    const roomId = uuid().slice(0, 6);
    this.rooms.set(roomId, {
      roomId,
      players: new Map(),
      sessionId: null,
      gameEngine: this.gameEngine,
      gameStarted: false,
    });
    return roomId;
  }

  joinRoom(roomId: string, socketId: string): { success: boolean; role?: RoleId; playerId?: string } {
    const room = this.rooms.get(roomId);
    if (!room || room.gameStarted) return { success: false };
    const playerId = uuid().slice(0, 8);
    // 角色分配：按加入顺序 Owner → Validator×3 → Miner×4
    const count = room.players.size;
    const role: RoleId = count === 0 ? 'subnet_owner'
      : count <= 3 ? 'validator' : 'miner';
    room.players.set(playerId, { socketId, playerState: null });
    return { success: true, role, playerId };
  }

  getRoom(roomId: string): Room | undefined { return this.rooms.get(roomId); }
  getGameEngine(): GameEngine { return this.gameEngine; }
}
```

### 4.3 network/routes.ts

```typescript
import { Express } from 'express';
import type { RoomManager } from './roomManager';

export function setupRoutes(app: Express, rm: RoomManager): void {
  app.post('/api/rooms', (_req, res) => {
    const roomId = rm.createRoom();
    res.json({ roomId });
  });

  app.get('/api/rooms/:id', (req, res) => {
    const room = rm.getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({
      roomId: room.roomId,
      playerCount: room.players.size,
      gameStarted: room.gameStarted,
    });
  });

  app.get('/api/sessions/:id/export/raw', async (req, res) => {
    // Step 9 实现
    res.json({ status: 'not implemented' });
  });

  app.get('/api/sessions/:id/export/labeled', async (req, res) => {
    res.json({ status: 'not implemented' });
  });
}
```

### 4.4 network/socketHandler.ts（骨架）

```typescript
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { RoomManager } from './roomManager';

export function setupSocketHandlers(io: SocketIOServer, rm: RoomManager): void {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('room:join', ({ roomId }: { roomId: string }) => {
      const result = rm.joinRoom(roomId, socket.id);
      if (!result.success) {
        socket.emit('error', { message: 'Failed to join room' });
        return;
      }
      socket.join(roomId);
      socket.emit('room:joined', { playerId: result.playerId, role: result.role });
      io.to(roomId).emit('room:player_joined', { playerId: result.playerId, role: result.role });
    });

    socket.on('game:start', () => {
      // Step 5 实现：创建 GameSession + 初始化 Bot + 广播 state:updated
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}
```

### 验证

- 启动后端：`cd server && npx tsx src/index.ts`
- 用浏览器或 curl 访问 `POST http://localhost:3001/api/rooms`，应返回 `{ "roomId": "abc123" }`
- 服务端控制台无报错

---

## Step 5：前后端握手（第一个 Socket 事件走通）

> 前后端首次联调，约 1 小时。Step 3 和 Step 4 均完成后方可开始。

### 5.1 目标

在本步骤结束时，浏览器上的玩家能够：
1. 点击"创建房间"→ 前端调用 `POST /api/rooms` → 收到 roomId
2. Socket 连接到服务端 → 发送 `room:join` → 服务端分配角色 → 前端收到 `room:joined`
3. 房间内所有玩家在左侧列表中看到彼此

### 5.2 前端改 HomePage 调用真实 API

```tsx
// 替换 handleCreateRoom 中的临时 roomId 生成
const handleCreateRoom = async () => {
  const res = await fetch('http://localhost:3001/api/rooms', { method: 'POST' });
  const { roomId } = await res.json();
  connectSocket();
  getSocket().on('connect', () => {
    getSocket().emit('room:join', { roomId });
  });
  getSocket().on('room:joined', ({ playerId, role }: any) => {
    useGameStore.getState().setRoom(roomId, playerId, role);
    navigate(`/room/${roomId}`);
  });
};
```

### 5.3 后端补全 `game:start` 流程

在 `socketHandler.ts` 中：

```typescript
socket.on('game:start', () => {
  const room = /* 通过 socket.rooms 找到对应房间 */;
  if (!room) return;

  // 创建 7 个 PlayerState
  const players: PlayerState[] = [];
  // 先加 human players
  for (const [pid, pinfo] of room.players) {
    players.push(/* 构造 PlayerState */);
  }
  // 不足 7 人：加 Bot（Step 7 完善，现在先补空占位）

  const engine = rm.getGameEngine();
  const session = engine.createSession(players);
  room.sessionId = session.sessionId;
  room.gameStarted = true;

  // 推进到 declaration
  const phase = engine.advancePhase(session.sessionId);

  // 向每个玩家推送经过滤的视图
  for (const [pid, pinfo] of room.players) {
    const view = engine.buildViewState(session.sessionId, pid);
    io.to(pinfo.socketId).emit('state:updated', view);
    // 如果该玩家是矿工 → 发送真实质量
    if (view.myRole === 'miner' && view.myTrueQuality !== undefined) {
      io.to(pinfo.socketId).emit('game:miner_quality', { trueQuality: view.myTrueQuality });
    }
  }

  io.to(room.roomId).emit('game:started', { sessionId: session.sessionId, phase });
});
```

### 5.4 GameEngine.buildViewState（核心）

这个函数是整个 DEMO 最关键的后端函数——它决定了每个玩家看到什么：

```typescript
buildViewState(sessionId: string, playerId: string, remainingSeconds: number = 120): PlayerViewState {
  const session = this.getSession(sessionId);
  const player = session.players[playerId];
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
    broadcastEvents: [],  // Step 10 补充
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

  // 逐步揭示审计结果
  if (session.phase !== 'declaration' && session.phase !== 'scoring') {
    // 收集所有已被审计的矿工信息（仅限被审计轮次）
    const auditResults: AuditResultView[] = [];
    for (const p of Object.values(session.players)) {
      if (p.role === 'miner') {
        const miner = p as MinerState;
        for (const rd of miner.roundData) {
          if (rd.penaltyType === 'process') {
            auditResults.push({
              minerId: miner.playerId,
              trueQuality: rd.trueQuality,
              isCheat: rd.isCheat,
              penaltyAmount: rd.penaltyAmount,
            });
          }
        }
      }
    }
    base.auditResults = auditResults;
  }

  return base;
}
```

### 验证

- 打开浏览器 → 创建房间 → 看到等待室页面
- 打开第二个 Tab → 加入同一房间 → 两个 Tab 左侧都显示对方
- 服务端控制台看到 `Socket connected` 日志
- 点击"开始游戏"→ 矿工 Tab 收到 `game:miner_quality`（控制台可见）

---

## Step 6：前端游戏界面（按阶段逐个实现）

> 前端独立做，预计 4 小时。需要 Step 5 握手通过之后（能收到 `state:updated`）。
> 每个阶段组件完成后，可连上后端测试该阶段的渲染。

### 6.1 实现顺序

```
GamePage 骨架（TopBar + PlayerList + EventLog）  [60 min]
    ↓
DeclarationPhase（矿工选星）                      [30 min]
    ↓
ScoringPhase（验证者打分+举报）                    [45 min]
    ↓
AuditPhase（所有者审计）                          [45 min]
    ↓
FinalVotePhase（全员投票）                        [30 min]
    ↓
SettlementPhase（终局结算动画）                    [60 min]
    ↓
TradingPhase（叛徒契约）                          [30 min]
```

### 6.2 GamePage.tsx（核心骨架）

```tsx
import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import TopBar from '../components/layout/TopBar';
import PlayerList from '../components/layout/PlayerList';
import EventLog from '../components/layout/EventLog';
import DeclarationPhase from '../components/phases/DeclarationPhase';
import ScoringPhase from '../components/phases/ScoringPhase';
import AuditPhase from '../components/phases/AuditPhase';
import DistributionPhase from '../components/phases/DistributionPhase';
import TradingPhase from '../components/phases/TradingPhase';
import FinalVotePhase from '../components/phases/FinalVotePhase';
import SettlementPhase from '../components/phases/SettlementPhase';
import { connectSocket, getSocket, emitNextPhase } from '../socket/socketClient';

export default function GamePage() {
  const view = useGameStore(s => s.view);
  const myRole = useGameStore(s => s.myRole);

  useEffect(() => {
    if (!getSocket().connected) connectSocket();
  }, []);

  if (!view) return <div className="text-white p-8">加载中...</div>;

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <PlayerList />
        <div className="flex-1 flex items-center justify-center p-4">
          {/* ====== 根据阶段 + 角色 渲染不同组件 ====== */}
          {view.phase === 'declaration' && myRole === 'miner' && <DeclarationPhase />}
          {view.phase === 'declaration' && myRole !== 'miner' && <WaitingBanner text="等待矿工提交质量声明..." />}

          {view.phase === 'scoring' && myRole === 'validator' && <ScoringPhase />}
          {view.phase === 'scoring' && myRole !== 'validator' && <WaitingBanner text="等待验证者评分..." />}

          {view.phase === 'audit' && myRole === 'subnet_owner' && <AuditPhase />}
          {view.phase === 'audit' && myRole !== 'subnet_owner' && <WaitingBanner text="等待所有者审计..." />}

          {view.phase === 'distribution' && <DistributionPhase />}

          {view.phase === 'trading' && <TradingPhase />}

          {view.phase === 'final_vote' && <FinalVotePhase />}

          {(view.phase === 'settlement' || view.phase === 'finished') && <SettlementPhase />}
        </div>
      </div>
      <EventLog />
    </div>
  );
}

function WaitingBanner({ text }: { text: string }) {
  const remainingSeconds = useGameStore(s => s.view?.remainingSeconds ?? 0);
  return (
    <div className="text-center">
      <div className="animate-pulse text-2xl text-gray-400">{text}</div>
      <div className="text-gray-500 mt-2">剩余 {remainingSeconds} 秒</div>
    </div>
  );
}
```

### 6.3 各阶段组件伪代码

**DeclarationPhase.tsx**：
```tsx
// 矿工看到：本轮真实质量 + 星星选择器 + 提交按钮
function DeclarationPhase() {
  const view = useGameStore(s => s.view);
  const selectedStars = useGameStore(s => s.selectedStars);
  const setSelectedStars = useGameStore(s => s.setSelectedStars);
  // 显示 view.myTrueQuality → "你的本轮真实质量：X 星"
  // 5 个星星按钮（1-5），点击高亮
  // 提交按钮 → emitDeclaration(selectedStars)
}
```

**ScoringPhase.tsx**：
```tsx
// 验证者看到：线索 + 4 名矿工的评分滑块(1-100) + 举报勾选框
function ScoringPhase() {
  // 顶部显示 view.validatorClue
  // 每个矿工一行：名字 + 滑块 + 举报 checkbox
  // 提交按钮 → emitScores(pendingScores) + emitReports(pendingReports)
  // ⚠️ 零方差检测放在服务端，前端不处理
}
```

**v4.3 修订版新增**：审计深度切换（浅审计/深审计）。AI 分析改为输出 risk_score 百分比条（0-100%）而非自然语言线索。AI 面板标注"仅供参考，不参与最终裁判"。

**AuditPhase.tsx**：
```tsx
// 所有者看到：4 名矿工列表 + 审计勾选 + AI 分析按钮(若未用)
function AuditPhase() {
  // 每名矿工：名字 + 审计 checkbox（显示成本 1 筹码）
  // AI 分析按钮（显示三档成本 1/3/6，若未使用）
  // 公开/保密 radio
  // 提交 → emitAudit(selectedIds) 或 emitAIAnalysis(level, isPublic)
}
```

**FinalVotePhase.tsx**：
```tsx
// 全员看到：投票面板
function FinalVotePhase() {
  // view.ownerVoteWeight 显示在所有者界面
  // 赞成 / 反对 按钮 → emitVote('for' / 'against')
}
```

**SettlementPhase.tsx**：
```tsx
// V4.3 终局揭示动画
function SettlementPhase() {
  const settlement = useGameStore(s => s.view?.settlement);
  if (!settlement) return <div>结算中...</div>;
  // 🔴 关键：从第 7 名到第 1 名逐人揭示（每 2 秒一个人）
  // 显示：排名、角色、筹码、TAO 收益、净盈亏
  // 第 7 名显示 "质押全损。收益 0 TAO。"
  // 第 1 名显示金色高亮 "冠军 +0.1164 TAO (+133%)"
}
```

### 验证

- 每个阶段组件完成后 → 启动后端 → 浏览器测试该阶段的 UI 是否按预期渲染
- 矿工 Tab 看不到验证者的评分界面
- 验证者 Tab 看到线索和打分界面

---

## Step 7：后端 Bot 玩家 + 倒计时系统

> 后端独立做，预计 2 小时。Step 5 完成后可开始。

### 7.1 Bot 决策函数

创建 `server/src/bot/BotPlayer.ts`：

```typescript
import type { GameSession, MinerState } from '../../shared/types/game';
import { CONFIG } from '../config';

// 矿工 Bot：知道真实质量，理性决策
export function botMinerDecide(trueQuality: number, round: number): number {
  // 真实 ≥ 4 → 诚实
  if (trueQuality >= 4) return trueQuality;
  // 真实 ≤ 2 → 40% 概率虚报 1-2 星
  if (trueQuality <= 2 && Math.random() < 0.4) {
    return Math.min(5, trueQuality + 1 + Math.floor(Math.random() * 2));
  }
  // 3 星 → 30% 虚报 1 星
  if (trueQuality === 3 && Math.random() < 0.3) return 4;
  return trueQuality;
}

// 验证者 Bot：基于线索 + 历史模式打分
export function botValidatorScore(
  minerId: string, clue: string, miners: MinerState[], round: number
): number {
  let base = 50 + Math.floor(Math.random() * 20) - 10;
  const miner = miners.find(m => m.playerId === minerId);
  if (!miner) return base;
  // 历史虚报记录 → 低分
  if (miner.roundData.some(r => r.isCheat && r.penaltyType === 'process')) base -= 20;
  // 线索暗示奇数且声明偶数（或反之）→ 可疑 → 低分
  return Math.max(1, Math.min(100, base));
}

// 验证者 Bot：只在虚报概率 > 60% 时才举报
export function botValidatorReports(miners: MinerState[], round: number): string[] {
  return miners.filter(m => {
    const rd = m.roundData.find(r => r.round === round);
    return rd && rd.isCheat && Math.random() < 0.6;
  }).map(m => m.playerId).slice(0, 2);
}

// 所有者 Bot：随机审计
export function botOwnerAudit(session: GameSession): string[] {
  const miners = Object.values(session.players).filter(p => p.role === 'miner');
  if (Math.random() < 0.7) return []; // 30% 概率不审计
  const shuffled = [...miners].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.random() < 0.5 ? 1 : 2).map(m => m.playerId);
}
```

### 7.2 倒计时系统

在 `GameEngine` 中添加：

```typescript
import { CONFIG } from '../config';

// 在 advancePhase 切换阶段后，启动定时器
private timers: Map<string, NodeJS.Timeout> = new Map();

private startPhaseTimer(sessionId: string, phase: GamePhase, callback: () => void): void {
  const seconds = this.getTimerForPhase(phase);
  // 存储剩余时间
  this.remainingSeconds.set(sessionId, seconds);
  // 每秒向房间广播 remainingSeconds 递减
  const timer = setInterval(() => {
    const remaining = this.remainingSeconds.get(sessionId)! - 1;
    this.remainingSeconds.set(sessionId, remaining);
    // 广播 → Socket 层处理
    if (remaining <= 0) {
      clearInterval(timer);
      callback(); // 超时 → 自动推进
    }
  }, 1000);
  this.timers.set(sessionId, timer);
}

private getTimerForPhase(phase: GamePhase): number {
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

// 超时默认行为：Bot 替未操作的玩家自动完成
private handleTimeout(sessionId: string): void {
  const session = this.getSession(sessionId);
  if (session.phase === 'declaration') {
    // 未提交声明的矿工 → Bot 自动声明
    for (const p of Object.values(session.players)) {
      if (p.role === 'miner' && p.playerType === 'bot' || /* 未提交 */) {
        // 调用 botMinerDecide → submitDeclaration
      }
    }
  }
  // scoring / audit / vote 类似处理
  this.advancePhase(sessionId);
}
```

### 验证

- 启动服务 → 创建房间（只有 1 个人类，其余 6 个 Bot）
- 开始游戏 → Bot 应该自动提交声明/评分/审计
- 等待 120 秒 → 声明阶段应自动超时推进到评分
- 整个游戏流程无需人类干预完成

---

## Step 8：前后端联调

> 两人一起，约 2 小时。Step 4-7 均完成后。

### 联调清单

| 测试场景 | 验证方法 |
|---------|---------|
| 1 人类 + 6 Bot 完整一局 | 人类选 Owner，Bot 自动完成宣言/评分/审计/投票 |
| 人类矿工收到真实质量 | 打开矿工 Tab，声明阶段看到"你的本轮真实质量：3 星" |
| 人类验证者收到线索 | 打开验证者 Tab，评分阶段看到随机线索 |
| 人类所有者审计 + 广播 | 审计一名矿工 → 所有 Tab 收到红色弹窗广播 |
| 终局揭示动画 | 游戏结束 → 从第 7 名开始逐人揭示 → 显示 TAO 收益 |
| 数据导出 | 终局后 `GET /api/sessions/:id/export/raw` 返回 JSON |

---

## Step 9：数据导出 + 报告页

> 后端 + 前端各 1 小时。

### 9.1 后端导出

```typescript
// server/src/data/DataExporter.ts
export function exportRawData(sessionId: string): EvidencePack {
  // 按 evidence pack 格式输出：action_log（事件序列）+ labeled_data（矿工声明/真实/审计标签）
}
```

在 `routes.ts` 中补全导出接口。

### 9.2 前端报告页

创建 `client/src/pages/ReportPage.tsx`：
- 三栏布局：游戏数据 | Miner 提交(模拟) | Validator 审计(模拟)
- 展示数据→子网数据的映射关系
- 下载 raw-data.json / labeled-data.json 按钮

---

## Step 10：V4.3 收尾功能

> 两人各 1 小时，完善 DEMO 体验。

### 10.1 事件广播系统

在 GameEngine 的审计/揭露/踢出等操作后，追加广播：

```typescript
// GameEngine 中
private addBroadcast(session: GameSession, type: string, message: string): void {
  session.eventLog.push({ type: type as any, message, timestamp: Date.now() } as any);
  // 下次 buildViewState 时，把这些事件塞进 broadcastEvents 字段
}
```

### 10.2 SettlementPhase 揭示动画

从第 7 名到第 1 名，每 2 秒揭示一人。用 `setTimeout` 链式调用或 `useEffect` + 本地状态。

### 10.3 筹码浮动动画

用 CSS `@keyframes` 做筹码 +/− 数字浮动效果。

### 10.4 RoomPage 等待室

```
玩家列表（显示已加入的玩家角色 + 人类/Bot + 准备状态）
房间号展示（供其他玩家输入加入）
[ 开始游戏 ] 按钮（仅所有者可见）
```

### 10.5 零方差检测

服务端 scoring 处理中：若某验证者的 4 个分数完全相同 → 标记 → 本轮剥夺该验证者的分配。

---

## 附录 A：Socket 事件速查

### 服务端 → 客户端

| 事件 | Payload | 接收者 |
|------|---------|--------|
| `state:updated` | `PlayerViewState` | 单人（按 socketId 推送） |
| `game:miner_quality` | `{ trueQuality }` | 单人（矿工） |
| `game:clue` | `{ clue }` | 单人（验证者） |
| `game:audit_result` | `{ minerId, trueQuality, isCheat, penalty }` | 全员 |
| `game:phase_changed` | `{ phase, remainingSeconds }` | 全员 |
| `game:settlement` | `SettlementData` | 全员 |
| `room:player_joined` | `{ playerId, role }` | 全员 |
| `room:player_left` | `{ playerId }` | 全员 |
| `broadcast:event` | `{ type, message }` | 全员 |

### 客户端 → 服务端

| 事件 | Payload | 谁可发 |
|------|---------|--------|
| `room:join` | `{ roomId }` | 任何人 |
| `game:start` | `{}` | 所有者 |
| `player:declare` | `{ declaredQuality }` | 矿工 |
| `player:score` | `{ scores }` | 验证者 |
| `player:report` | `{ minerIds }` | 验证者 |
| `player:audit` | `{ minerIds }` | 所有者 |
| `player:ai_analysis` | `{ level, isPublic }` | 所有者 |
| `player:vote` | `{ vote }` | 任何人 |
| `player:kick` | `{ playerIds }` | 所有者 |
| `player:next_phase` | `{}` | 所有者 |
| `traitor:recruit` | `{ targetId, bribe, task }` | 叛徒 |
| `traitor:defect` | `{}` | Contracted 矿工 |

---

## 附录 B：V4.3 数值表

| 参数 | 值 | 代码常量 |
|------|-----|---------|
| 初始筹码 | 15 | `INITIAL_CHIPS` |
| 所有者津贴 | 3（预付） | `OWNER_ALLOWANCE` |
| 公共池启动 | 14 | `PUBLIC_POOL_START` |
| TAO 收益池 | 0.35（7 × 0.05） | `TAOTAO_POOL_START` |
| 入场质押 | 0.05 TAO | `TAOTAO_ENTRY_STAKE` |
| 叛徒基金 | 6 | `TRAITOR_FUND` |
| 虚报罚款（过程审计） | 3 筹码 | `CHEAT_PENALTY_PROCESS` |
| 虚报罚款（揭示暴露） | 1 筹码 | `CHEAT_PENALTY_REVEAL` |
| 虚报罚款（深度审计） | 3 筹码 | `CHEAT_PENALTY_DEEP` |
| 审计成本 | 1 筹码/次 | `AUDIT_COST` |
| 浅审计成本 | 1 筹码/次 | `SHALLOW_AUDIT_COST` |
| 深审计成本 | 3 筹码/次 | `DEEP_AUDIT_COST` |
| 举报成本 | 1 筹码/次 | `REPORT_COST` |
| 举报成功返还 | 4 筹码 | `REPORT_REWARD` |
| 单轮分配 | 6 筹码 | `ROUND_DISTRIBUTION` |
| 矿工排名分配 | 50/25/15/10 | `MINER_RANK_SHARES` |
| 合谋罚没 | 5 筹码 | `COLLUSION_PENALTY` |
| 国库协议费 | 5% | `TREASURY_FEE` |
| 冠军分账 | 35% | `CHAMPION_SHARE` |
| 败者分账 | 0% | — |
| 声明倒计时 | 120 秒 | `TIMER_DECLARATION` |
| 评分倒计时 | 180 秒 | `TIMER_SCORING` |
| 审计倒计时 | 120 秒 | `TIMER_AUDIT` |
| 投票倒计时 | 90 秒 | `TIMER_VOTE` |

---

*V4.3 修订版核心变更：① 审计引入浅/深分层（浅审计 1筹=仅揭示，深审计 3筹=揭示+罚款）；② AI 分析重定位为 risk_score 风险引擎（0-100% 概率条），不参与最终裁判；③ 数据导出对齐 evidence pack 标准化格式（action_log + labeled_data）；④ 可选 commit-reveal 声明机制标注为进阶功能。*

*文档版本：v3.0-tutorial | 最后更新：2026-05-23 | 对齐规则：V4.3 实值收益版*

*本教程与以下文档配套使用：*
- *《Subnet：暗流》完整规则文档 V4.3 修订版（玩法定义）*
- *《Subnet：暗流》升级版技术方案 v3.0（全局架构 + 经济模型）*
