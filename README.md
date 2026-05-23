# 《Subnet：暗流》 / Undercurrent DEMO

基于 Bittensor 子网的经济博弈验证 DEMO。7 人实值竞技博弈网页游戏 — 矿工声明质量、验证者打分举报、子网所有者审计惩罚，三轮博弈后按阶梯分 TAO。

## 项目结构

```
submet/
├── client/                 # 前端：React 18 + Vite 6 + Zustand 5 + Tailwind 3 + Socket.IO
│   └── src/
│       ├── pages/          # HomePage / RoomPage / GamePage
│       ├── components/
│       │   ├── layout/     # TopBar / PlayerList / EventLog
│       │   └── phases/     # 7 个游戏阶段组件
│       ├── store/          # Zustand 全局状态
│       ├── socket/         # Socket.IO 客户端封装
│       └── hooks/          # useGameState
├── server/                 # 后端：Express 4 + Socket.IO 4 + sql.js (SQLite)
│   └── src/
│       ├── game/           # 规则引擎（GameEngine / ChipCalculator / AuditResolver 等）
│       ├── bot/            # AI Bot 决策逻辑
│       ├── db/             # 数据库连接 + 建表
│       ├── network/        # REST API + Socket.IO 事件处理
│       └── data/           # 数据导出（evidence pack 格式）
├── shared/                 # 前后端共享：TypeScript 类型 + V4.3 数值常量
│   └── types/game.ts
└── docs/                   # 设计文档（规则文档 / 技术方案 / DEMO 开发教程）
```

## 快速启动

```bash
# 1. 安装依赖
cd client && npm install && cd ..
cd server && npm install && cd ..

# 2. 启动后端（端口 3001）
cd server && npx tsx src/index.ts

# 3. 启动前端（端口 5173）
cd client && npx vite

# 4. 打开浏览器 http://localhost:5173
```

## 游戏流程

| 角色 | 人数 | 能力 |
|------|------|------|
| 👑 子网所有者 | 1 | 浅/深审计 · AI 风险分析 · 投票加权 |
| 🔍 验证者 | 3 | 线索侦查 · 打分(1-100) · 举报 |
| ⛏️ 矿工 | 4 | 真实质量已知 · 声明质量 · 虚报/诚实决策 |

每轮：声明(120s) → 评分(180s) → 审计(120s) → 分配 → 3轮后终局揭示 → 投票 → TAO 阶梯分账

## 审计机制（V4.3 修订版）

| 审计类型 | 成本 | 效果 |
|---------|------|------|
| 浅审计 | 1 筹码/矿工 | 揭示真实质量，不执行罚款 |
| 深审计 | 3 筹码/矿工 | 揭示质量 + 虚报罚款 + 举报奖励 |
| AI 风险分析 | 1/3/6 筹码 | 输出 risk_score (0-100%)，仅供参考，不参与裁判 |

## 技术栈

- **前端**: React 18 · Vite 6 · Zustand 5 · Tailwind 3 · Socket.IO Client · react-router-dom 6
- **后端**: Express 4 · Socket.IO 4 · sql.js (SQLite) · TypeScript 5 · tsx
- **共享**: TypeScript 类型定义 + V4.3 规则引擎数值常量

## 相关文档

- [《Subnet：暗流》完整规则文档 V4.0 修订版](docs/《Subnet：暗流》完整规则文档 V4.0 修订版.md)
- [《Subnet：暗流》升级版技术方案 v3.1](docs/《Subnet：暗流》升级版技术方案.md)
- [《Subnet：暗流》最小化DEMO开发文档](docs/《Subnet：暗流》最小化DEMO开发文档.md)
