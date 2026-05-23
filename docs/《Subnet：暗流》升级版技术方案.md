# 《Subnet：暗流》技术规格与开发指南

## v3.1 — 对齐 V4.3 游戏规则：实值 TAO 经济 + 在线竞技 + 数据飞轮

---

## 目录

- [1. 概述与阅读指南](#1-概述与阅读指南)
- [2. 项目愿景与定位](#2-项目愿景与定位)
- [3. 系统全景架构](#3-系统全景架构)
- [4. 组件层架构详述](#4-组件层架构详述)
- [5. 端到端工作流](#5-端到端工作流)
- [6. 技术组件规格](#6-技术组件规格)
- [7. 经济模型与代币机制](#7-经济模型与代币机制)
- [8. 安全体系与抗攻击设计](#8-安全体系与抗攻击设计)
- [9. 开发路线图](#9-开发路线图)
- [10. 部署与运维指南](#10-部署与运维指南)
- [11. 项目分析：新颖性、实用性与可行性](#11-项目分析新颖性实用性与可行性)
- [12. 附录](#12-附录)

---

## 1. 概述与阅读指南

### 1.1 文档目的

本文档是 **Undercurrent（《Subnet：暗流》）** 子网的完整技术规格书，面向以下读者群体：

| 读者角色 | 建议阅读章节 | 预期收获 |
|----------|-------------|----------|
| **架构师 / 技术决策者** | 第 2、3、7、8、11 章 | 理解系统全局设计逻辑、经济安全性与项目可行性 |
| **后端 / 合约开发者** | 第 4、5、6、12 章 | 获取合约接口、数据结构、API 规格，可直接开工 |
| **前端 / 游戏开发者** | 第 4.2、6.2、12 章 | 理解游戏客户端架构、SDK 接口、数据上报协议 |
| **AI / 数据工程师** | 第 4.5、6.3、6.4 章 | 理解审计模型架构、训练管线、ZK 电路设计 |
| **运维 / DevOps** | 第 9、10 章 | 获取部署架构、节点配置、监控指标 |
| **投资人 / 社区成员** | 第 2、7、9、11 章 | 理解商业逻辑、代币经济、发展路线图、项目分析 |

### 1.2 前置知识

阅读本文档前，建议对以下概念有基本了解：

- **Bittensor 网络**：子网注册机制、Subtensor 链、TAO 代币、Yuma Consensus
- **博弈论基础**：非对称信息博弈、commit-reveal、惩罚均衡
- **零知识证明**：ZK-SNARKs（Groth16）、算术电路、公开/私有见证
- **可信执行环境（TEE）**：Intel SGX / AMD SEV 远程证明
- **可验证延迟函数（VDF）**：Wesolowski 构造、时间锁

对上述概念不熟悉的读者，可先阅读附录 12.1 术语表，或沿各章节内嵌的"前置知识"提示按顺序阅读。

### 1.3 文档约定

- **必须（MUST）**：不可协商的硬性要求，违反将导致系统安全性或经济性崩溃
- **应当（SHOULD）**：推荐做法，在多数情况下适用，偏离时需有充分理由并记录
- **可以（MAY）**：可选优化，不影响核心功能正确性
- 所有代币金额以 TAO 为计价单位，除非特别注明
- 所有链上数据格式使用 JSON Schema 描述，字段类型标注为 `string` / `uint256` / `bytes32` / `address` / `bool`

---

## 2. 项目愿景与定位

### 2.1 一句话定位

**Undercurrent 是一个运行在 Bittensor 上的功能型子网。它出售的不是算力或 AI 模型，而是一套通过经济博弈持续产出可信数据与 AI 审计能力的"信任生产流水线"。**

### 2.2 核心数字商品

子网对外提供三类数字商品，强调「监督数据质量验证流程」：

| 商品 | 形态 | 消费者 | 商业模式 |
|------|------|--------|----------|
| **监督数据包** | JSON 数据包（标签 + 元数据 + 生成证明/日志 + 哈希上链） | AI 公司、研究机构 | 按数据包购买或订阅 |
| **可复用审计规则模板** | 智能合约模板 + 部署脚本 + evidence pack 示例 | 其他 Bittensor 子网 | 一次性授权费 + 维护费 |
| **可跑机制配置包** | 游戏包（交互前端 + 数据采集器） + 参数模板 + 复现脚本 | Web3 游戏、其他子网 | 授权费 |

### 2.2b 验证成本漏斗（v3.1 新增）

验证流程采用 4 阶段漏斗设计，确保便宜→昂贵的渐进式资源消耗：

```
Stage 1 静态检查：格式/签名/重复/commit 校验（便宜，自动执行）
    ↓
Stage 2 基准评测：在正确版本/留出集上必须通过（Pclean gating，中等成本）
    ↓
Stage 3 风险驱动动态抽检：p_audit = p0 + k·risk_score（中等成本，AI 辅助）
    ↓
Stage 4 挑战仲裁：evidence pack 复现 + 深审（昂贵，仅对少量样本）
```

| 阶段 | 游戏内对应 | 成本 | 触发条件 |
|------|-----------|------|----------|
| Stage 1 | 声明格式校验 | 0 筹码（自动） | 每轮自动 |
| Stage 2 | 浅审计（揭示质量） | 1 筹码/矿工 | 所有者选择 |
| Stage 3 | 深审计（揭示 + 罚款） | 3 筹码/矿工 | 所有者选择 + AI 风险评分辅助 |
| Stage 4 | 终局深度审计 + 踢出 | 3 筹码/矿工 + 踢出权 | 终局揭示后可选 |

**核心原则**：AI 输出 risk_score（0-100）用于驱动抽检概率，不参与最终裁判。

### 2.3 与 Bittensor 生态的关系

```
                        Bittensor 网络
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         Subnet 1        Undercurrent      Subnet N
       (文本生成)         (信任验证)      (图像生成)
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         外部消费者      其他子网消费者      游戏玩家
       (购买API/数据)   (跨子网调用)     (产生原始数据)
```

Undercurrent 在生态中的角色是 **"信任基础设施"**——其他子网和外部应用不需要自建数据验证管线，只需调用 Undercurrent 的 API，即可获得经过经济博弈验证的可信评分。

### 2.4 核心设计原则

1. **博弈即验证**：数据质量不由中心化权威判定，而是通过 Miner 与 Validator 之间的非对称信息博弈自然浮现
2. **游戏即数据前端，亦为经济入口**：同名网页游戏《暗流》是子网的交互式前端、经济模型沙盘、数据采集入口——同时是子网的 TAO 消费者入口。玩家以 TAO 质押入场，博弈产生的数据注入子网训练管线，终局按排名分账
3. **可组合性优先**：所有合约接口标准化，声誉 NFT 可被外部合约读取，审计结果可被跨子网消费
4. **隐私与验证兼得**：通过 ZK 证明实现"可验证但不可见"的数据审计
5. **渐进去中心化**：从 TEE + 社会共识的双层 Ground Truth 建立，到 AI 模型从陪审团引导期渐进过渡至完全自治

### 2.5 游戏与子网的双向经济闭环（v3.0 新增）

《暗流》游戏与 Undercurrent 子网形成完整的经济闭环：

```
玩家质押 TAO → 竞技博弈 → 产出行为数据 → 注入子网训练管线
                                              │
                                              ▼
                   AI 审计模型进化 ← Miner 竞争标注数据
                         │
                         ▼
               AI 审计 API 外售 → 收入部分回流游戏收益池
                         │
                         ▼
              玩家获得声誉 NFT → 入场质押减免 → 再次博弈
```

**游戏为子网贡献**：

| 产出 | 消费方式 | 对应合约 |
|------|---------|---------|
| 博弈行为序列 + 声明/评分/审计/举报轨迹 | 注入 Raw Data Pool → Miner 竞争标注 | `DataCommitment.submitDataBatch()` |
| 矿工声明+真实质量+审计标签 | 形成 Labeled Dataset → AI LoRA 微调 | `ModelRegistry` 版本更新 |
| 验证者线索→评分推理链 | AI 学习"部分信息下的判断模式" | AI 审计引擎训练特征 |
| 玩家入场质押 TX | 链上真实 TAO 流转带动网络活跃度 | `StakingRegistry` + `RewardDistributor` |

**子网回馈游戏**：

| 回馈 | 玩家感知 | 合约对应 |
|------|---------|---------|
| TAO 阶梯分账 | "冠军拿走 35%，败者全损" | `RewardDistributor.distributeEpochRewards()` |
| 外部 API 收入部分注入收益池 | "今日外部消费增厚奖金池 5%" | `CrossSubnetGateway` → 游戏收益池 |
| 声誉 NFT 入场质押减免 | "Stage 7 NFT = 下局入场费减 30%" | `calculateStakeDiscount(tokenId)` |
| AI 审计 API 返回大模型分析 | "AI 提示：Miner_C 虚报概率 82%" | `POST /v1/audit`

---

## 3. 系统全景架构

### 3.1 架构总览图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          外部消费者层                                        │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐         │
│   │ AI 公司   │  │Web3 游戏  │  │其他子网   │  │ NFT 交易市场       │         │
│   │(购买数据) │  │(API调用)  │  │(跨子网)   │  │(声誉NFT流转)      │         │
│   └─────┬─────┘  └─────┬────┘  └─────┬────┘  └─────────┬──────────┘         │
│         │              │             │                  │                    │
├─────────┼──────────────┼─────────────┼──────────────────┼────────────────────┤
│         ▼              ▼             ▼                  ▼                    │
│   ┌─────────────────────────────────────────────────────────────────┐       │
│   │                    API & Market Gateway Layer                   │       │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │       │
│   │  │数据查询API   │  │审计调用API   │  │Cross-Subnet Gateway    │  │       │
│   │  │(REST/GraphQL)│  │(REST/WS)    │  │(Substrate Pallet/SC)   │  │       │
│   │  └──────┬───────┘  └──────┬──────┘  └───────────┬─────────────┘  │       │
│   └─────────┼─────────────────┼─────────────────────┼────────────────┘       │
│             │                 │                     │                         │
├─────────────┼─────────────────┼─────────────────────┼─────────────────────────┤
│             ▼                 ▼                     ▼                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      Bittensor 子网运行时（Subnet Runtime）          │   │
│   │                                                                      │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐   │   │
│   │  │ Miner    │  │Validator │  │Challenger│  │ Ground Truth       │   │   │
│   │  │ 节点     │  │ 节点     │  │ 合约     │  │ Registry 合约      │   │   │
│   │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────────┬──────────┘   │   │
│   │       │             │             │                    │             │   │
│   │  ┌────┴─────────────┴─────────────┴────────────────────┴────────┐   │   │
│   │  │                    Subnet Core Contracts                      │   │   │
│   │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │   │   │
│   │  │  │质押注册   │  │数据提交   │  │验证评分   │  │奖励分配      │  │   │   │
│   │  │  │Registry   │  │Commitment│  │Scoring    │  │Distributor  │  │   │   │
│   │  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │   │   │
│   │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │   │   │
│   │  │  │挑战仲裁   │  │声誉NFT    │  │参数治理   │  │VDF 验证      │  │   │   │
│   │  │  │Challenge  │  │Reputation │  │DAO Gov   │  │Verifier      │  │   │   │
│   │  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │   │   │
│   │  └──────────────────────────────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                          链下服务层                                           │
│                                                                              │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│   │ AI审计引擎   │  │ TEE游戏服务  │  │ VDF Prover   │  │ 数据索引器    │    │
│   │(模型训练+    │  │(SGX Enclave) │  │(Wesolowski)  │  │(SubQuery/   │    │
│   │ 推理服务)     │  │              │  │              │  │ The Graph)  │    │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│          │                 │                 │                  │            │
├──────────┼─────────────────┼─────────────────┼──────────────────┼────────────┤
│          ▼                 ▼                 ▼                  ▼            │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         数据存储层                                  │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │   │
│   │  │Raw Data  │  │Labeled   │  │模型参数   │  │审计日志 & 事件    │    │   │
│   │  │Pool      │  │Dataset   │  │Registry   │  │存储 (IPFS/Arweave)│    │   │
│   │  │(IPFS)    │  │(IPFS+SQL)│  │(Hugging  │  │                  │    │   │
│   │  │          │  │          │  │Face/链上) │  │                  │    │   │
│   │  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                          客户端层                                            │
│                                                                              │
│   ┌──────────────────────────┐    ┌──────────────────────────────────┐      │
│   │ 《暗流》网页游戏客户端    │    │ 外部游戏（通过 Data SDK 接入）    │      │
│   │ ┌────────┐ ┌───────────┐ │    │ ┌────────┐ ┌──────────────────┐ │      │
│   │ │游戏逻辑 │ │数据上报     │ │    │ │SDK集成  │ │原始数据上报      │ │      │
│   │ │引擎    │ │(DataHunter)│ │    │ │(3行代码)│ │(opt-in 隐私保护) │ │      │
│   │ └────────┘ └───────────┘ │    │ └────────┘ └──────────────────┘ │      │
│   │ ┌────────────────────┐   │    │                                 │      │
│   │ │ZK Prover (本地)    │   │    └─────────────────────────────────┘      │
│   │ │状态转换证明生成     │   │                                            │
│   │ └────────────────────┘   │                                            │
│   └──────────────────────────┘                                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 架构分层职责

| 层 | 职责 | 关键技术 |
|----|------|----------|
| **外部消费者层** | 购买数据/API/NFT 的外部实体 | 传统 Web2 API 集成或链上合约调用 |
| **API & Market Gateway** | 鉴权、计费、路由、跨子网结算 | REST/GraphQL、Substrate Pallet、TAO 计价 |
| **Bittensor 子网运行时** | Miner/Validator 共识、质押、挑战、奖励分配 | Bittensor SDK (Python)、Subtensor 链 |
| **链下服务层** | AI 模型训练/推理、TEE 游戏托管、VDF 计算、数据索引 | PyTorch、SGX SDK、Rust、SubQuery |
| **数据存储层** | 原始数据、标注数据、模型参数、审计日志持久化 | IPFS、Arweave、PostgreSQL、Hugging Face |
| **客户端层** | 游戏运行、用户交互、数据上报、ZK 证明生成 | Unity/Three.js、Circom、WASM |

---

## 4. 组件层架构详述

### 4.1 客户端层

#### 4.1.1 《暗流》网页游戏客户端

游戏客户端是子网的第一数据入口，也是用户理解子网经济模型的交互式沙盘。

**技术栈**：
- 渲染引擎：Three.js / Phaser 3（WebGL 2.0）
- 状态管理：自研确定性状态机（Deterministic State Machine, DSM）
- 网络层：WebSocket 连接到 TEE 游戏服务器
- ZK Prover：通过 WASM 编译的 Circom 证明生成器（本地浏览器内执行）

**核心模块**：

```
游戏客户端
├── GameEngine（游戏逻辑引擎）
│   ├── StateMachine（确定性状态机，管理 S_0 → S_n 转换序列）
│   ├── RuleResolver（规则解析器，加载当前 Epoch 的游戏规则哈希）
│   └── RandomSource（随机数源，来自 TEE 服务器的 Beacon 或本地承诺方案）
├── UIModule（用户界面模块）
│   ├── GameView（游戏画面渲染）
│   ├── EconomyPanel（经济面板：质押状态、奖励历史、声誉分）
│   └── AuditSimulator（审计模拟器：让玩家体验 Validator 视角）
├── DataModule（数据模块）
│   ├── DataCollector（行为数据采集器：记录玩家每一步操作）
│   ├── DataHunterReporter（Data Hunter 模式下的自动上报）
│   └── LocalCache（本地缓存，网络中断时暂存数据）
└── ZKProver（零知识证明模块）
    ├── CircuitLoader（加载 GameStateTransitionCircuit WASM）
    ├── WitnessGenerator（从状态序列生成私有见证）
    └── ProofAggregator（聚合多步证明为单一批量证明）
```

**确定性状态机的设计原则**：

游戏的所有核心逻辑（技能判定、随机数使用、胜负结算）必须实现为确定性函数 `f: (S_prev, Action, RandomSeed) → S_next`。这意味着给定相同的初始状态和随机种子，重放必须产生完全相同的结果。这是后续 ZK 证明生成和 Ground Truth 重放验证的基础。

#### 4.1.2 外部游戏 Data SDK

SDK 将《暗流》客户端的数据采集能力解耦为独立包，允许任何外部网页游戏接入。

**包名**：`@undercurrent/data-sdk`

**安装**：
```bash
npm install @undercurrent/data-sdk
```

**集成（3 行代码）**：
```javascript
import { UndercurrentSDK } from '@undercurrent/data-sdk';

const sdk = new UndercurrentSDK({
  gameId: 'my-web3-game',
  apiKey: 'uc_live_xxxxxxxx',  // 从 Undercurrent 开发者门户申请
  privacyMode: 'opt-in'        // 仅采集明确同意的用户数据
});

// SDK 自动监听游戏状态变更并上报至 Raw Data Pool
sdk.attach(window.gameStateManager);
```

**SDK 内部架构**：

```
@undercurrent/data-sdk
├── core/
│   ├── StateObserver.ts      // 监听游戏状态变更
│   ├── ActionSerializer.ts   // 序列化玩家操作为标准 ActionLog 格式
│   └── PrivacyFilter.ts      // 根据用户授权级别过滤敏感字段
├── transport/
│   ├── HTTPTransport.ts      // 批量上报（低延迟场景）
│   ├── IPFSTransport.ts      // 直接写入 IPFS（高数据量场景）
│   └── RetryQueue.ts         // 断网重试队列
└── types/
    ├── ActionLog.ts           // 标准数据格式定义
    └── GameConfig.ts         // 游戏元数据配置
```

**隐私保护机制**：

| 授权级别 | 采集内容 | 默认状态 |
|----------|----------|----------|
| `none` | 不采集任何数据 | 默认（需用户手动开启） |
| `anonymous` | 操作序列（无玩家 ID）、胜负结果、时间戳 | 用户点击"同意匿名贡献"后启用 |
| `pseudonymous` | 操作序列 + 匿名 ID + 技能偏好模型 | 用户主动升级授权 |
| `full` | 全部数据 + 可选的 ZK 证明 | 仅 Miner 角色可用 |

#### 4.1.3 ZK Prover 模块

ZK Prover 在客户端本地运行（浏览器 WASM 或 Node.js 原生），负责为 Miner 提交的数据包生成"数据来自真实游戏对局"的零知识证明。

**生成流程**：

```
游戏对局结束
      │
      ▼
1. StateMachine 输出完整状态转换序列:
   S_0 →(a_1)→ S_1 →(a_2)→ ... →(a_n)→ S_n
      │
      ▼
2. WitnessGenerator 为每步转换生成见证:
   witness_i = {
     prev_state: S_{i-1},
     next_state: S_i,
     action: a_i,
     randomness: r_i,
     merkle_proof: proof_of_state_in_tree
   }
      │
      ▼
3. ProofGenerator 调用 GameStateTransitionCircuit:
   π_i = Prove(public_inputs, witness_i)
   其中 public_inputs = (hash(S_{i-1}), hash(S_i), game_rules_hash)
      │
      ▼
4. ProofAggregator 生成聚合证明:
   Π_batch = Groth16_Aggregate([π_1, π_2, ..., π_n])
      │
      ▼
5. 输出: (Π_batch, [public_inputs_1, ..., public_inputs_n])
   → 提交给 Miner 节点，附带在数据包中
```

**性能指标（目标值）**：

| 指标 | 目标值 | 测量条件 |
|------|--------|----------|
| 单步证明生成 | < 20ms | 浏览器 WASM，Chrome 120+ |
| 100步批量聚合 | < 1s | Node.js 原生，16核 CPU |
| 证明体积 | < 10KB（Groth16） | 100步聚合后 |
| 验证时间 | < 50ms | EVM / Subtensor 链上 |

---

### 4.2 数据存储层

#### 4.2.1 Raw Data Pool（原始数据池）

Raw Data Pool 是所有游戏行为数据的汇聚点。它不存储个人身份信息（PII），仅存储匿名化后的游戏操作序列。

**存储方案**：IPFS + Filecoin（持久化层），辅助 MySQL/PostgreSQL 索引（可查询层）

**数据格式**：

```json
{
  "schema_version": "1.0.0",
  "data_id": "keccak256(content)",
  "source": {
    "game_id": "undercurrent-main",
    "client_version": "2.1.0",
    "collector_type": "data_hunter",
    "anonymous_id": "0xabcd...1234",
    "session_id": "uuid"
  },
  "game_session": {
    "game_type": "zero_sum_duel",
    "rules_hash": "0x...（当前Epoch游戏规则版本哈希）",
    "start_time": "2026-05-23T10:00:00Z",
    "duration_ms": 243000,
    "outcome": "player_1_wins"
  },
  "action_sequence": [
    {
      "seq": 0,
      "actor": "player_1",
      "action_type": "skill_cast",
      "action_id": "skill_fireball",
      "target": "player_2",
      "timestamp_offset_ms": 1520,
      "state_hash_before": "0x...",
      "state_hash_after": "0x..."
    }
  ],
  "enclave_attestation": {
    "enclave_hash": "0x...",
    "outcome_hash": "0x...",
    "attestation_signature": "0x..."
  },
  "zk_proof": null,
  "submitted_at": "2026-05-23T10:05:00Z"
}
```

**索引策略**：

```sql
CREATE INDEX idx_raw_data_game_type ON raw_data_pool((data->>'game_type'));
CREATE INDEX idx_raw_data_source_game ON raw_data_pool((data->'source'->>'game_id'));
CREATE INDEX idx_raw_data_time ON raw_data_pool((data->'game_session'->>'start_time'));
```

#### 4.2.2 Labeled Dataset（标注数据集）

Miner 从 Raw Data Pool 选取数据并标注后，形成 Labeled Dataset。这是子网对外销售的核心数据商品。

**存储方案**：IPFS（数据体）+ Arweave（永久存档）+ PostgreSQL（元数据索引）

**标注数据格式**：

```json
{
  "dataset_id": "keccak256(merkle_root_of_all_entries)",
  "miner_address": "0x...",
  "reference_data": [
    {
      "raw_data_id": "0x...",
      "raw_data_cid": "ipfs://..."
    }
  ],
  "labels": [
    {
      "raw_data_id": "0x...",
      "label_type": "cheat_probability",
      "label_value": 0.87,
      "confidence": 0.92,
      "annotation_policy": "基于技能使用频率偏差 + 反应时间异常",
      "annotator": "miner_0x..."
    }
  ],
  "batch_zk_proof": "0x...（聚合ZK证明）",
  "commitment_tx": "0x...（链上提交交易哈希）",
  "timestamp": "2026-05-23T12:00:00Z"
}
```

#### 4.2.3 模型参数 Registry

AI 审计模型的版本、参数哈希、训练数据范围存储在链上，确保模型的可审计性和可复现性。

```solidity
struct ModelVersion {
    uint256 versionId;
    bytes32 modelHash;          // 模型参数的 keccak256
    bytes32 trainingDataRange;  // 训练数据集的 Merkle Root
    uint256 trainedAt;          // 训练完成时的区块号
    uint8   precision;          // 在留出集上的查准率（百分比整数）
    uint8   recall;             // 在留出集上的查全率（百分比整数）
    bool    isActive;           // 当前是否使用中
}
```

---

### 4.3 链下服务层

#### 4.3.1 AI 审计引擎

AI 审计引擎是子网的"智能辅助验证器"，负责学习 Miner 的作弊模式并辅助 Validator 做出更准确的评分。

**架构**：

```
AI 审计引擎
├── TrainingPipeline（训练管线）
│   ├── SyntheticDataGenerator（合成数据生成器）
│   │   ├── OpenSpiel 环境适配器
│   │   ├── 作弊模式注入器（合谋、虚报、回溯）
│   │   └── 标签自动生成器
│   ├── DataLoader（数据加载器）
│   │   ├── IPFS 数据拉取
│   │   ├── 数据清洗与标准化
│   │   └── 特征工程管道
│   ├── ModelTrainer（模型训练器）
│   │   ├── 基础模型：DistilBERT-base（分类头）
│   │   ├── 训练框架：PyTorch 2.x + Hugging Face Trainer
│   │   ├── 在线微调：LoRA 适配器（每 Epoch 更新）
│   │   └── 评估：留出集 + 陪审团偏差度量
│   └── ModelRegistry（模型注册表）
│       ├── 版本管理
│       ├── 回滚机制
│       └── A/B 测试框架
└── InferenceService（推理服务）
    ├── REST API（`POST /v1/audit`）
    ├── BatchProcessor（批量推理，最多 1000 条/次）
    ├── ScoreNormalizer（评分归一化到 0-100）
    └── ExplanationGenerator（生成可疑特征列表）
```

**API 接口**：

```
POST /v1/audit
Content-Type: application/json
Authorization: Bearer <api_key>

Request:
{
  "data_packets": [
    {
      "data_id": "0x...",
      "action_sequence": [...],
      "miner_address": "0x...",
      "zk_proof": "0x...（可选，若有ZK证明则优先验证）"
    }
  ],
  "audit_type": "cheat_detection",  // cheat_detection | quality_scoring | anomaly_detection
  "context": {
    "game_type": "zero_sum_duel",
    "rules_hash": "0x..."
  }
}

Response:
{
  "results": [
    {
      "data_id": "0x...",
      "honesty_score": 87.3,
      "honesty_probability": 0.92,
      "suspicious_features": [
        {
          "feature": "reaction_time_anomaly",
          "severity": 0.65,
          "description": "技能释放间隔异常短于人类反应时间下限（<150ms）"
        }
      ],
      "model_version": 42,
      "inference_time_ms": 8.3
    }
  ]
}
```

**训练数据集构建规范**：

| 阶段 | 数据来源 | 数据量 | 标签来源 | 用途 |
|------|----------|--------|----------|------|
| Phase 0（启动前） | 合成博弈数据 | ≥100 万局 | 自动标签（已知 Ground Truth） | 预训练 |
| Phase 1（陪审团期） | 链上真实数据 + 合成数据混合 | 持续增长 | 人类陪审团裁决 | 在线微调 |
| Phase 2（混合验证） | 链上真实数据为主 | 持续增长 | AI 评分 + 10% 人工抽样 | 在线微调 |
| Phase 3（完全自治） | 全量链上真实数据 | 持续增长 | AI 评分 + 异常触发复审 | 持续优化 |

**v3.1 角色收窄：小模型风险引擎**

> 修订版明确：AI 审计模型只作为风险引擎输出 `risk_score`（0-100），用于驱动审计抽检概率与押金比例，**不参与最终裁判**。最终裁判权始终在 Validator 博弈评分与人类陪审团（正式版）/ 游戏内所有者审计决策（DEMO）。

#### 4.3.2 TEE 游戏服务器

TEE 游戏服务器承载《暗流》游戏的多人对局逻辑，并利用 Intel SGX / AMD SEV 在可信执行环境中运行，以生成可验证的远程证明。

**部署架构**：

```
                   ┌──────────────────────────────┐
                   │      TEE Host Machine         │
                   │  ┌────────────────────────┐   │
                   │  │   SGX Enclave           │   │
                   │  │  ┌──────────────────┐   │   │
                   │  │  │ GameLogicEngine   │   │   │
                   │  │  │ (确定性规则执行)  │   │   │
                   │  │  └────────┬─────────┘   │   │
                   │  │           │               │   │
                   │  │  ┌────────▼─────────┐   │   │
                   │  │  │ AttestationModule │   │   │
                   │  │  │ (生成远程证明)    │   │   │
                   │  │  └────────┬─────────┘   │   │
                   │  │           │               │   │
                   │  │  ┌────────▼─────────┐   │   │
                   │  │  │ BeaconRandom     │   │   │
                   │  │  │ (安全随机数生成) │   │   │
                   │  │  └──────────────────┘   │   │
                   │  └────────────────────────┘   │
                   │                                │
                   │  ┌────────────────────────┐   │
                   │  │ Untrusted Host (通信层) │   │
                   │  │ WebSocket Server        │   │
                   │  │ TLS Termination         │   │
                   │  └────────────────────────┘   │
                   └──────────────────────────────┘
```

**远程证明（Remote Attestation）流程**：

```
1. 游戏启动 → TEE Enclave 生成 RA 报告
2. RA 报告格式:
   {
     "quote": "0x...（Intel SGX Quote / AMD SEV Attestation Report）",
     "enclave_measurement": "0x...（Enclave 代码哈希，可公开审计）",
     "game_initial_state_hash": "0x...",
     "timestamp": "2026-05-23T10:00:00Z"
   }
3. 客户端验证 Quote（通过 IAS/DCAP 服务） → 确认 Enclave 代码未被篡改
4. 对局过程中每条随机数均来自 Enclave Beacon → 客户端可验证随机数确实来自 TEE
5. 对局结束 → Enclave 生成 Outcome Attestation
6. Outcome Attestation 附在 Raw Data 中提交至 IPFS
```

**Ground Truth 建立的双层机制**：

TEE 锚点是优先路径。当 TEE 不可用时（例如移动端浏览器不支持 WebSocket 到 TEE 服务器的低延迟连接），系统自动切换到 **社会共识预言机** 模式：

```python
# GroundTruthRegistry 合约中的决策逻辑（伪代码）
def establish_ground_truth(epoch_id: int, game_seeds: List[bytes32]):
    tee_attestations = query_tee_attestations(epoch_id, game_seeds)

    if len(tee_attestations) >= THRESHOLD_TEE:
        return select_majority_tee_result(tee_attestations)
    else:
        committee = select_committee(epoch_id, top_n=5)
        commitments = collect_commit_reveal(committee, game_seeds)

        # 附加 VDF 时间锁
        vdf_commitments = [vdf_eval(c, T=BLOCKS_PER_EPOCH) for c in commitments]
        wait_blocks(BLOCKS_PER_EPOCH)

        results = collect_reveals(committee, vdf_commitments)
        return majority_vote(results, 3/5)
```

#### 4.3.3 VDF Prover 节点

VDF（Verifiable Delay Function）Prover 负责为 Ground Truth 委员会的 commit-reveal 提供时间锁定功能。

**算法选择**：Wesolowski VDF（基于 RSA 群的快速验证变体）

**实现**（Rust）：

```rust
use vdf::{WesolowskiVDF, VDF};

pub struct VDFProver {
    vdf: WesolowskiVDF,
    n: BigUint,  // RSA modulus
    t: u64,      // 时间参数（迭代次数）
}

impl VDFProver {
    pub fn eval(&self, input: &[u8]) -> VDFOutput {
        let input_hash = keccak256(input);
        let (output, proof) = self.vdf.evaluate(&input_hash, self.t);
        VDFOutput {
            commitment: output,
            proof,
            t: self.t,
        }
    }

    pub fn verify(&self, input: &[u8], output: &VDFOutput) -> bool {
        self.vdf.verify(&keccak256(input), &output.commitment, &output.proof, output.t)
    }
}
```

**参数配置**：

| 参数 | 值 | 说明 |
|------|----|------|
| RSA 模数位数 | 2048 bit | 安全性与计算开销的平衡 |
| T（迭代次数） | 100 blocks 对应的秒数 | 由 Epoch 长度动态决定 |
| Prover 节点数量 | 5（与委员会成员一致） | 各成员自行计算或委托 |
| 委托费用 | 质押的 0.1% / 轮 | 委托给专用 Prover 的费用 |

---

### 4.4 Bittensor 子网运行时（合约层）

#### 4.4.1 合约总览

子网核心合约部署在 Bittensor 的 Subtensor 链上，包含以下模块：

```
Subnet Core Contracts
│
├── StakingRegistry.sol (质押注册合约)
│   ├── registerMiner(address, uint256 stake)
│   ├── registerValidator(address, uint256 stake)
│   ├── deregister(address)
│   ├── getStake(address) → uint256
│   └── getRole(address) → enum { None, Miner, Validator }
│
├── DataCommitment.sol (数据提交合约)
│   ├── submitDataBatch(bytes32 datasetHash, bytes proof, uint256 stake)
│   ├── challengeDataDuplicate(bytes32 datasetHash, uint256 challengeStake)
│   ├── resolveDataChallenge(bytes32 datasetHash, bool success)
│   └── getDataBatchStatus(bytes32 datasetHash) → enum { Pending, Challenged, Accepted, Rejected }
│
├── GroundTruthRegistry.sol (真值注册合约)
│   ├── submitTEEResult(uint256 epochId, bytes attestation)
│   ├── submitCommitteeCommitment(uint256 epochId, bytes32 commitment)
│   ├── submitCommitteeReveal(uint256 epochId, bytes result)
│   └── getGroundTruth(uint256 epochId) → bytes
│
├── VerificationScoring.sol (验证评分合约)
│   ├── submitScores(uint256 epochId, address[] miners, uint8[] scores)
│   ├── aggregateScores(uint256 epochId) → RankingResult
│   └── getMinerRanking(uint256 epochId, address miner) → uint256
│
├── RewardDistributor.sol (奖励分配合约)
│   ├── distributeEpochRewards(uint256 epochId)
│   ├── claimRewards(address beneficiary)
│   └── getPendingRewards(address beneficiary) → uint256
│
├── ChallengeArbitration.sol (挑战仲裁合约)
│   ├── initiateChallenge(bytes32 targetId, uint256 bond, string reason)
│   ├── selectArbitrators(uint256 challengeId) → address[3]
│   ├── submitArbitrationVote(uint256 challengeId, bool forChallenger)
│   └── executeArbitration(uint256 challengeId)
│
├── ReputationNFT.sol (声誉NFT合约)
│   ├── mintReputationNFT(address to, ReputationData data) → uint256
│   ├── evolveNFT(uint256 tokenId)
│   ├── mergeNFTs(uint256 tokenIdA, uint256 tokenIdB) → uint256
│   └── getReputation(uint256 tokenId) → ReputationData
│
├── DAOGovernance.sol (参数治理合约)
│   ├── proposeParameterChange(string param, uint256 newValue)
│   ├── voteOnProposal(uint256 proposalId, bool support)
│   └── executeProposal(uint256 proposalId)
│
├── CrossSubnetGateway.sol (跨子网网关合约)
│   ├── requestAudit(bytes32 dataHash, uint256 subnetId, uint256 maxPrice)
│   ├── fulfillAudit(bytes32 requestId, AuditResult result)
│   └── settlePayment(bytes32 requestId)
│
└── VDFVerifier.sol (VDF链上验证合约)
    ├── submitVDFCommitment(uint256 epochId, bytes32 commitment)
    ├── submitVDFReveal(uint256 epochId, bytes input, VDFOutput output)
    └── verifyVDF(bytes input, VDFOutput output) → bool
```

#### 4.4.2 质押注册合约详细接口

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IStakingRegistry {
    enum Role { None, Miner, Validator }

    event MinerRegistered(address indexed miner, uint256 stake);
    event ValidatorRegistered(address indexed validator, uint256 stake);
    event Deregistered(address indexed account, Role role);
    event StakeSlashed(address indexed account, uint256 amount, string reason);

    // 注册为 Miner，质押至少 15 TAO
    function registerMiner() external payable;

    // 注册为 Validator，质押至少 20 TAO
    function registerValidator() external payable;

    // 注销角色（质押退还需等待冷却期）
    function deregister() external;

    // 罚没质押金
    // @param account 被罚没地址
    // @param amount 罚没金额
    // @param recipient 接收方（挑战者或国库）
    // @param reason 罚没原因
    function slash(
        address account,
        uint256 amount,
        address recipient,
        string calldata reason
    ) external returns (bool);

    // 只能由其他核心合约调用
    modifier onlyCoreContract() {
        require(isCoreContract[msg.sender], "Caller not authorized");
        _;
    }
}
```

#### 4.4.3 数据提交合约的防复制机制

```solidity
interface IDataCommitment {
    struct DataBatchCommitment {
        bytes32 datasetHash;          // 数据集的唯一哈希
        bytes   zkProof;              // 聚合 ZK 证明
        uint256 originalStake;        // 原创声明质押
        address miner;
        uint256 submittedAt;
        DataBatchStatus status;
    }

    enum DataBatchStatus { Pending, Challenged, Accepted, Rejected }

    // Miner 提交数据批次
    // @param datasetHash 数据集的 keccak256(ipfs_cid + merkle_root)
    // @param zkProof 零知识证明（证明数据来自合法游戏对局）
    // @param originalityStake 原创声明质押（≥ 2 TAO 等值）
    function submitDataBatch(
        bytes32 datasetHash,
        bytes calldata zkProof,
        uint256 originalityStake
    ) external payable;

    // 任何人发起"重复数据"挑战
    // @param datasetHash 被挑战的数据集哈希
    // @param evidenceCid 证据（指向重复原始数据的 IPFS CID）
    // @param challengeStake 挑战质押（≥ 5 TAO 等值）
    function challengeDataDuplicate(
        bytes32 datasetHash,
        string calldata evidenceCid,
        uint256 challengeStake
    ) external payable;

    // 随机仲裁员裁决
    function resolveDataChallenge(
        bytes32 datasetHash,
        bool challengeSuccessful
    ) external onlyArbitrator;
}
```

---

### 4.5 API & Market Gateway 层

#### 4.5.1 数据查询 API

```
Base URL: https://api.undercurrent.ai/v1

GET /datasets
  Query Params:
    - game_type: string (可选，如 "zero_sum_duel")
    - quality_min: float (可选，最低质量评分，0-100)
    - miner_address: string (可选，指定矿工)
    - limit: int (默认 20，最大 100)
    - offset: int (默认 0)
  Response: { datasets: [...], total: int }

GET /datasets/:id
  Response: { dataset: {...} }  // 完整标注数据 + 审计轨迹

POST /datasets/purchase
  Body: { dataset_ids: string[], payment_tx: string }
  Response: { download_urls: string[], expires_at: timestamp }

GET /ground-truth/:epoch_id
  Response: { epoch_id: int, ground_truth: bytes, source: "tee" | "committee", attestation: bytes }
```

#### 4.5.2 跨子网网关接口

```rust
// Substrate Pallet 接口定义（Rust）
#[pallet::call]
impl<T: Config> Pallet<T> {
    // 其他子网发起审计请求
    #[pallet::call_index(0)]
    #[pallet::weight(10_000)]
    pub fn request_cross_subnet_audit(
        origin: OriginFor<T>,
        data_hash: H256,
        target_subnet_id: u16,
        audit_type: AuditType,
        max_price: BalanceOf<T>,
    ) -> DispatchResult;

    // Undercurrent 子网完成审计后回调
    #[pallet::call_index(1)]
    #[pallet::weight(10_000)]
    pub fn fulfill_cross_subnet_audit(
        origin: OriginFor<T>,
        request_id: H256,
        result: AuditResult,
    ) -> DispatchResult;

    // 结算跨子网支付
    #[pallet::call_index(2)]
    #[pallet::weight(10_000)]
    pub fn settle_cross_subnet_payment(
        origin: OriginFor<T>,
        request_id: H256,
    ) -> DispatchResult;
}
```

---

## 5. 端到端工作流

本章描述子网一个完整 Epoch（约 360 个区块，~1 小时）中所有参与者的交互序列。每个阶段标注输入、输出、参与者和链上/链下状态变更。

### 5.1 阶段 0：系统初始化（一次性）

**时机**：子网上线前执行一次

| 步骤 | 操作 | 执行者 | 链上状态变更 |
|------|------|--------|-------------|
| 0.1 | 部署全部核心合约到 Subtensor 测试网 | 子网所有者 | 合约地址注册 |
| 0.2 | 设置初始参数（质押门槛、挑战期长度、奖励分配比等） | 子网所有者 | 参数写入 Governance 合约 |
| 0.3 | 运行合成数据预训练管线，产出 AI 基线模型 v1.0 | AI 工程师 | 模型哈希写入 ModelRegistry |
| 0.4 | 部署 TEE 游戏服务器 + VDF Prover 集群 | DevOps | Enclave 公钥注册到 GroundTruthRegistry |
| 0.5 | 发布《暗流》游戏客户端 v1.0 + Data SDK v0.1 | 前端团队 | 客户端版本哈希上链 |
| 0.6 | 启动子网，进入 Bittensor 网络的子网注册流程 | 子网所有者 | Subtensor 上子网状态变为 Active |

### 5.2 阶段 1：角色注册

**触发**：任何人调用合约

**参与方**：Miner 候选者、Validator 候选者

| 步骤 | 操作 | 前置条件 | 链上状态变更 |
|------|------|----------|-------------|
| 1.1 | 调用 `registerMiner()`，质押 ≥15 TAO | 地址未注册其他角色 | 地址标记为 Miner，质押锁定 |
| 1.2 | 调用 `registerValidator()`，质押 ≥20 TAO | 地址未注册其他角色 | 地址标记为 Validator，质押锁定 |
| 1.3 | Miner 在游戏客户端中绑定链上地址 | 已完成 1.1 | 客户端开启 ZK Prover 和 DataHunter 模式 |

### 5.3 阶段 2：游戏数据生成

**时机**：Epoch N 开始后持续进行

**参与方**：玩家（含 Data Hunter 和 Miner 自身）、TEE 游戏服务器、ZK Prover

```
玩家发起一局游戏
      │
      ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ 客户端      │────▶│ TEE 游戏服务器│────▶│ ZK Prover   │
│ (操作输入)  │     │ (规则执行)    │     │ (本地证明)   │
└─────────────┘     └──────┬───────┘     └──────┬──────┘
                           │                    │
                           ▼                    │
                    ┌──────────────┐            │
                    │ TEE生成      │            │
                    │ Attestation  │            │
                    └──────┬───────┘            │
                           │                    │
                           ▼                    ▼
                    ┌──────────────────────────────────┐
                    │         数据组装与上报              │
                    │  Raw Data + Attestation + ZK Proof│
                    └──────────────────┬───────────────┘
                                       │
                          ┌────────────┴────────────┐
                          ▼                         ▼
                   ┌────────────┐           ┌──────────────┐
                   │ IPFS 存储   │           │ PostgreSQL   │
                   │ (数据体)    │           │ (元数据索引)  │
                   └────────────┘           └──────────────┘
```

**输出**：
- Raw Data 写入 IPFS，返回 CID
- Raw Data 元数据写入 PostgreSQL 索引
- 若为 TEE 对局，Attestation 附带在数据中
- 若为 Miner 自身对局，ZK Proof 附带在数据中

### 5.4 阶段 3：Miner 数据提交

**时机**：Epoch N 的第 1-200 区块

**参与方**：Miner

| 步骤 | 操作 | 输入 | 输出 |
|------|------|------|------|
| 3.1 | Miner 从 Raw Data Pool 检索数据片段 | game_type, 时间范围 | 数据片段列表 |
| 3.2 | Miner 为每条数据生成作弊/质量标签 | 原始操作序列 | 带标签的数据包 |
| 3.3 | Miner 打包为 DataBatch，计算 datasetHash | 多个带标签数据包 | datasetHash |
| 3.4 | Miner 调用 `submitDataBatch(datasetHash, zkProof, stake)` | datasetHash, ZK证明, 2 TAO | 链上提交记录 |
| 3.5 | 如果 Miner 未附带 ZK 证明，数据包状态标记为 `PendingNoZK`，评分自动扣 30 分 | — | 数据包状态更新 |

**链上交易**：
```json
{
  "function": "submitDataBatch",
  "params": {
    "datasetHash": "0xabcd...",
    "zkProof": "0x...（聚合Groth16证明，若无可为空）",
    "originalityStake": "2000000000"  // 2 TAO，单位：RAO (1e9)
  },
  "value": "2000000000"  // 质押金额
}
```

### 5.5 阶段 4：Ground Truth 建立

**时机**：Epoch N 的第 50-150 区块（与数据提交期部分重叠）

**参与方**：Ground Truth 委员会、TEE 服务器、VDF Prover 节点

**路径 A：TEE 优先路径**

| 步骤 | 操作 | 条件 |
|------|------|------|
| 4.1 | TEE 服务器对本 Epoch 的游戏种子进行 Enclave 内确定性重放 | TEE 节点在线 + Enclave 公钥已验证 |
| 4.2 | 调用 `submitTEEResult(epochId, attestation)` | — |
| 4.3 | 若有 ≥3 个独立 TEE 节点提交且 Attestation 一致，GT 直接确认 | TEE 节点数 ≥3 |
| 4.4 | GT 写入 GroundTruthRegistry，标记 `source: "tee"` | — |

**路径 B：社会共识预言机路径（TEE 不足时自动触发）**

| 步骤 | 操作 | 条件 |
|------|------|------|
| 4.1b | 合约从 Validator 中按信誉分加权随机抽取 5 名委员会成员 | TEE 路径不满足 |
| 4.2b | 委员会成员各自运行确定性模拟器，计算 `GT_i = Simulate(seeds)` | — |
| 4.3b | 成员提交 `VDF_commitment_i = VDF_Eval(GT_i, T=100blocks)` | 第 50-80 区块 |
| 4.4b | 合约对比 VDF_commitment，取 3/5 一致的轮次进入下一阶段 | 3/5 一致 |
| 4.5b | VDF 窗口期结束后（第 181 区块起），成员提交 `GT_i` 原文 | 时间锁到期 |
| 4.6b | 合约验证 `VDF_Verify(GT_i, commitment_i, T)` 并取多数一致结果 | 验证通过 |
| 4.7b | GT 写入 GroundTruthRegistry，标记 `source: "committee"` | — |

**委员会损益**：

| 情形 | 损益 |
|------|------|
| 按时提交 VDF Commitment + Reveal，且结果与多数一致 | 获得本 Epoch 奖励池的 0.5%（5 人均分） |
| 未按时提交 VDF Commitment | 本轮奖励取消，声誉分 -1 |
| 连续 3 轮提交结果偏离共识 | 罚没质押的 5%，声誉分 -3 |
| 恶意合谋被举报且查实 | 罚没全部质押，永久取消委员会资格 |

### 5.6 阶段 5：验证与评分

**时机**：Epoch N 的第 200-280 区块（GT 建立完成后）

**参与方**：Validator、AI 审计引擎

| 步骤 | 操作 | 执行者 |
|------|------|--------|
| 5.1 | 获取本 Epoch 的 Ground Truth | Validator 从 GroundTruthRegistry 读取 |
| 5.2 | VRF 随机分配 Miner 数据包给各 Validator | 合约内置 VRF |
| 5.3 | Validator 对分配到的每个数据包打分（0-100）：<br>— 若数据包附带 ZK 证明且验证通过：基准分 +10<br>— 若数据包标签与 GT 一致：基准分 = 100<br>— 若存在偏差：按偏差量线性扣分<br>— 同时调用 AI 审计 API 获取建议评分作为参考 | Validator |
| 5.4 | Validator 调用 `submitScores(epochId, miners[], scores[])` | Validator |
| 5.5 | 合约聚合所有 Validator 的评分：<br>— 对每个 Miner 收集所有 Validator 的打分<br>— 去除最高和最低各 10% 的评分（极端值过滤）<br>— 取剩余评分的加权平均（权重 = Validator 质押量） | 合约自动执行 |
| 5.6 | 输出本 Epoch 的 Miner 排名列表 | RankingResult 事件上链 |

**AI 审计引擎的评分参考权重**：

| 子网阶段 | AI 评分的权重 | 人类评分的权重 |
|----------|-------------|---------------|
| 陪审团引导期（0-8 周） | 0%（仅供参考） | 100%（陪审团中位数） |
| 混合验证期（9 周起，偏差 < 5 分） | 40% | 60%（3 人陪审团中位数） |
| 混合验证期（偏差 < 3 分） | 70% | 30%（1 人抽样） |
| 完全自治期 | 100%（AI），异常触发人工复审 | 0%（复审时 100%） |

### 5.7 阶段 6：排名与奖励分配

**时机**：Epoch N 的第 280-300 区块

**参与方**：RewardDistributor 合约

| 步骤 | 操作 |
|------|------|
| 6.1 | 合约根据最终排名计算各 Miner 的奖励份额 |
| 6.2 | 按预设分配模式分配：默认 Validator 70%，Miner 30%（DAO 可调整） |
| 6.3 | 奖励自动计入各地址的 `pendingRewards` |
| 6.4 | 参与者可随时调用 `claimRewards()` 提取奖励 |
| 6.5 | 未附带 ZK 证明的 Miner 数据包奖励减少 30%（惩罚系数） |

**奖励分配公式**：

```
Miner_i_reward = TotalEpochReward × 0.30 × (Score_i / Σ All_Scores)

Validator_j_reward = TotalEpochReward × 0.70 × (Stake_j × Accuracy_j / Σ (Stake × Accuracy))

其中 Accuracy_j = 1 - |Validator评分 - GT| / 100
```

### 5.8 阶段 7：挑战与仲裁

**时机**：Epoch N+1 的第 1-100 区块（挑战期 = 100 blocks）

**参与方**：挑战者、被挑战方、随机仲裁员

```
       任何人
         │
         ▼
  调用 initiateChallenge()
         │
         ├── 挑战类型 1: "数据重复"
         │     challengeStake ≥ 5 TAO
         │     evidenceCid 指向重复证据
         │
         ├── 挑战类型 2: "Validator打分不公"
         │     challengeStake ≥ 10 TAO
         │     对比该Validator评分 vs GT偏差
         │
         └── 挑战类型 3: "Ground Truth 被操纵"
               challengeStake ≥ 50 TAO
               指控委员会合谋 / TEE Enclave 被篡改
               │
               ▼
       合约随机抽取 3 名在线 Validator 作为仲裁员
               │
               ▼
       仲裁员在 50 blocks 内提交投票
               │
       ┌───────┴───────┐
       ▼               ▼
  挑战成功          挑战失败
       │               │
       ▼               ▼
  罚没被挑战方      罚没挑战者
  质押 100%         挑战质押 100%
       │               │
       ▼               ▼
  挑战者获 70%      被挑战方获 70%
  国库获 30%        国库获 30%
```

**惩罚金额速查表**：

| 违规类型 | 罚没比例 | 挑战者奖励 | 国库收入 |
|----------|----------|-----------|----------|
| Miner 数据重复 | 原创质押的 100% | 70% | 30% |
| Miner 无 ZK 证明 | 评分扣 30 分 + 奖励减 30% | 无（自动执行） | 减少的奖励回流池子 |
| Validator 恶意评分 | 质押的 50% | 70% | 30% |
| Validator 合谋 | 质押的 100% + 永久封禁 | 70%（按举报比例分配） | 30% |
| 委员会合谋 | 全部质押 + 永久取消资格 | 举报者获 40% | 60% |
| 恶意挑战（连续 3 次失败） | 挑战质押 + 30 天冷却期 | — | 100% |

### 5.9 阶段 8：AI 模型在线微调

**时机**：每 Epoch 结束时自动触发

**输入**：
- 本 Epoch 所有 Miner 数据包 + Validator 评分 + GT
- 本 Epoch 所有挑战记录与仲裁结果
- 当前模型版本 v_N

**输出**：
- 更新后的模型 v_{N+1}（LoRA 适配器参数）
- 模型性能报告（在留出集上的查准率、查全率）
- 与人类评审的偏差度量

**过渡决策**：
当连续 4 个 Epoch 满足 `|AI_score - Human_median| < 5` 时，自动触发阶段升级（如：陪审团人数 5→3）

---

## 6. 技术组件规格

### 6.1 智能合约部署结构与依赖关系

```
部署顺序（拓扑排序）：

1. StakingRegistry（无依赖）
2. GroundTruthRegistry（依赖 StakingRegistry，需要 Validator 列表）
3. VDFVerifier（无依赖，独立工具合约）
4. DataCommitment（依赖 StakingRegistry + VDFVerifier）
5. VerificationScoring（依赖 DataCommitment + GroundTruthRegistry）
6. RewardDistributor（依赖 VerificationScoring + StakingRegistry）
7. ChallengeArbitration（依赖 上述全部）
8. ReputationNFT（依赖 StakingRegistry + VerificationScoring）
9. DAOGovernance（依赖 上述全部）
10. CrossSubnetGateway（依赖 VerificationScoring + RewardDistributor）

所有合约升级使用 UUPS Proxy 模式
```

### 6.2 游戏客户端技术规格

**运行环境**：
- 浏览器：Chrome 120+, Firefox 121+, Safari 17+, Edge 120+
- Node.js（ZK Prover 原生模式）：v20 LTS+
- WASM 运行时（ZK Prover 浏览器模式）：WebAssembly SIMD + SharedArrayBuffer

**性能目标**：

| 指标 | 目标值 |
|------|--------|
| 首屏加载时间 | < 3s（3G 网络） |
| 游戏帧率 | 60 FPS（桌面端）、30 FPS（移动端） |
| ZK 证明生成（100 步） | < 2s（桌面端浏览器 WASM） |
| 数据上报延迟 | < 500ms（批量模式） |
| 离线缓存容量 | 最多 50 局未上报数据 |
| 内存占用（包含 ZK Prover） | < 512MB |

### 6.3 ZK 电路规格

**电路名称**：`GameStateTransitionCircuit`

**电路语言**：Circom 2.x

**电路结构**：

```
GameStateTransitionCircuit
├── Public Inputs:
│   ├── prev_state_hash: bytes32（前状态 Merkle Root）
│   ├── next_state_hash: bytes32（后状态 Merkle Root）
│   └── rules_version_hash: bytes32（游戏规则版本哈希）
│
├── Private Witness:
│   ├── prev_state: State（前状态完整数据）
│   ├── player_action: Action（玩家操作）
│   ├── randomness: bytes32（该步使用的随机数）
│   ├── next_state: State（后状态完整数据）
│   └── merkle_path: MerkleProof[]（状态在 Sparse Merkle Tree 中的路径）
│
├── Sub-circuits:
│   ├── StateUpdateValidator: 验证 S_prev + Action + Randomness → S_next 的确定性转换
│   ├── RuleComplianceChecker: 验证 Action 在当前规则版本下的合法性
│   ├── MerklePathVerifier: 验证状态哈希与 Merkle Tree 的一致性
│   └── SignatureValidator: 验证随机数承诺的签名
│
└── Constraints:
    ├── 状态转换确定性：f(S_prev, Action, Randomness) MUST == S_next
    ├── 规则合规性：Action MUST 在 rules_version_hash 对应规则集中合法
    ├── Merkle 一致性：prev_state_hash MUST == MerkleRoot(prev_state)
    └── 随机数签名：Randomness MUST 由 Miner 私钥签名承诺
```

**约束数量估计**：

| 子电路 | 估计约束数 | 说明 |
|--------|-----------|------|
| StateUpdateValidator | ~500,000 | 游戏状态约 64 个叶子节点 |
| RuleComplianceChecker | ~200,000 | 规则集约 50 条规则 |
| MerklePathVerifier | ~10,000 | 标准 Merkle 证明 |
| SignatureValidator | ~100,000 | EdDSA / ECDSA 验证 |
| **总计（单步）** | **~810,000** | 单步证明 |
| **总计（100步聚合）** | 使用 Groth16 批验证，体积 ≈ 1.2 × 单步 | — |

**电路审计要求**：

电路正式部署前必须通过独立安全审计，审计范围包括：
- 约束完整性（无漏约束导致伪造状态转换）
- 抗侧信道攻击
- 随机性使用是否正确
- 与游戏规则代码的一致性（代码审查 + 形式化验证）

### 6.4 AI 审计模型规格

**模型架构**：

```
AuditModel
├── Text Encoder: DistilBERT-base (6层 Transformer)
│   └── 输入: 序列化的操作序列文本表示
├── Numerical Encoder: 2层 MLP (128→256→128)
│   └── 输入: 数值特征（反应时间、技能冷却、胜率曲线）
├── Cross-Attention Fusion Layer
│   └── 文本特征 × 数值特征的交叉注意力融合
└── Classification Head: 3层 MLP (256→128→2)
    └── 输出: [诚实概率, 作弊概率]
```

**训练配置**：

```yaml
training:
  base_model: "distilbert-base-uncased"
  optimizer: "AdamW"
  learning_rate: 2e-5
  batch_size: 32
  epochs: 10 (预训练) / 1 (每epoch微调)
  lora_config:
    r: 16
    alpha: 32
    target_modules: ["query", "value"]
    dropout: 0.1

evaluation:
  metrics: ["precision", "recall", "f1", "auc_roc"]
  holdout_set: 10% 随机抽样
  human_agreement_threshold: 5 分偏差
```

### 6.5 声誉 NFT 规格

**合约标准**：ERC-721 + 自定义扩展接口

```solidity
interface IReputationNFT is IERC721 {
    struct ReputationData {
        uint8   role;               // 0: Miner, 1: Validator
        uint16  honestyRate;        // 诚实率 (0-10000，即 0%-100.00%)
        uint32  totalSubmissions;   // 总提交/审计次数
        uint16  challengeDefenseRate; // 挑战防御率
        uint16  avgQualityScore;    // 平均质量评分
        uint8   evolutionStage;     // 进化阶段 (1-10)
        uint32  lastEvolutionAt;    // 上次进化的区块号
        bool    isCorrupted;        // 是否已腐化
    }

    // 铸造新 NFT（由核心合约自动调用，非用户直接调用）
    function mintReputationNFT(
        address to,
        ReputationData calldata data
    ) external onlyCoreContract returns (uint256 tokenId);

    // 进化事件（每 100 次操作或 30 天触发）
    function evolve(uint256 tokenId) external returns (ReputationData memory newData);

    // 合并两个 Stage ≥ 3 的 NFT（继承部分属性）
    function merge(uint256 tokenIdA, uint256 tokenIdB)
        external returns (uint256 newTokenId);

    // 查询声誉数据（供外部子网调用）
    function getReputation(uint256 tokenId)
        external view returns (ReputationData memory);

    // 计算质押减免比例
    function calculateStakeDiscount(uint256 tokenId)
        external view returns (uint16 discountBasisPoints);
        // discountBasisPoints: 0-3000 (0%-30%)
        // honestyRate ≥ 9000 且 stage ≥ 3 → 30% (3000 bps)
        // honestyRate ≥ 8000 且 stage ≥ 2 → 20% (2000 bps)
        // honestyRate ≥ 7000 → 10% (1000 bps)
}
```

**进化规则详细逻辑**：

```
function evolve(tokenId):
    data = getReputation(tokenId)

    if data.isCorrupted:
        // 腐化不可逆回
        data.evolutionStage = max(1, data.evolutionStage - 1)
        return data

    if data.honestyRate >= 9000 AND data.challengeDefenseRate >= 8500:
        data.evolutionStage = min(10, data.evolutionStage + 1)
        // 解锁新属性槽（影响 NFT 视觉稀有度）
    elif data.honestyRate < 7000 OR recentFailedChallenges(tokenId) >= 2:
        data.isCorrupted = true
        // 标记为风险资产，DEX 中显著标识
    else:
        // 维持不变，但记录 epoch 时间戳
        pass

    data.lastEvolutionAt = block.number
    return data
```

---

## 7. 经济模型与代币机制

> v3.0 修订：对齐《暗流》V4.3 游戏规则。本章描述的经济模型覆盖两个层面——① 子网运行时经济（Miner/Validator 质押与 Epoch 奖励）② 游戏层经济（TAO 入场质押与阶梯收益分账）。两层共享 TAO 作为价值载体，通过声誉 NFT 和收益池注入形成闭环。

### 7.1 双层经济架构

```
┌─────────────────────────────────────────────────────────────┐
│                      子网运行时层（链上）                      │
│                                                              │
│  外部消费者 / 跨子网网关                                      │
│       │ 支付 TAO                                             │
│       ▼                                                     │
│  ┌─────────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │ Epoch 奖励池  │───→│Validator │    │ Miner             │   │
│  │              │    │ 70%      │    │ 30%               │   │
│  │              │    └──────────┘    └──────────────────┘   │
│  │              │                                           │
│  │ API收入 10%  │───→ 注入游戏收益池（跨层通道）              │
│  └─────────────┘                                           │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐              │
│  │声誉 NFT   │  │挑战仲裁   │  │DAO 参数治理   │              │
│  │质押减免   │  │罚没分配   │  │              │              │
│  └──────────┘  └──────────┘  └──────────────┘              │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                      游戏层（链下 + 链上结算）                  │
│                                                              │
│  7 名玩家 × 0.05 TAO 入场质押                                │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────┐               │
│  │          游戏收益池（0.35 TAO 基础）       │               │
│  │  + 子网 API 收入 10% 注入（正式版）        │               │
│  └────────────────┬────────────────────────┘               │
│                   │                                         │
│                   ▼                                         │
│  ┌─────────────────────────────────────────┐               │
│  │           终局阶梯分账                     │               │
│  │  🥇 35%  🥈 25%  🥉 18%  4-5 15%        │               │
│  │  6 7%  💀 7 0%  国库 5%                  │               │
│  └─────────────────────────────────────────┘               │
│                                                              │
│  局内筹码（操作货币）：15/人，仅用于审计/举报/交易，不兑换TAO   │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 子网运行时经济（不变）

| 参数 | 默认值 | 可调整性 |
|------|--------|----------|
| Miner 最低质押 | 15 TAO | DAO 投票 |
| Validator 最低质押 | 20 TAO | DAO 投票 |
| Epoch 奖励分配 | V:70% / M:30% | DAO 投票 |
| 挑战质押门槛 | 5/10/50 TAO（按类型） | DAO 投票 |
| 跨子网 API 费率 | 0.1 TAO/千次 | DAO 投票 |
| API 收入注入游戏比例 | 10% | DAO 投票 |

### 7.3 游戏层经济（v3.0 新增）

#### 入场与收益

```
玩家质押 0.05 TAO → 7 人池 = 0.35 TAO
    + 外部 API 收入注入（正式版）
    = 游戏收益池
         │
    国库抽 5% 协议费
         │
    剩余 95% 阶梯分账
```

| 排名 | 收益池份额 | 0.35 TAO 池下的金额 | 净收益（扣 0.05） |
|------|----------|-------------------|------------------|
| 🥇 冠军 | 35% × 0.95 | 0.1164 TAO | **+0.0664 (+133%)** |
| 🥈 亚军 | 25% × 0.95 | 0.0831 TAO | +0.0331 (+66%) |
| 🥉 季军 | 18% × 0.95 | 0.0599 TAO | +0.0099 (+20%) |
| 4-5 名 | 15% × 0.95（均分） | ~0.025 TAO | −0.025 (−50%) |
| 6 名 | 7% × 0.95 | 0.0233 TAO | −0.0267 (−53%) |
| 💀 7 名 | 0% | **0 TAO** | **−0.05 (−100%)** |

#### 筹码与 TAO 的分离设计

局内「筹码」是操作货币——用于审计（1 筹码/次）、举报（1 筹码/次）、交易。终局时筹码**不兑换 TAO**。TAO 收益仅按终局排名从收益池分配。

**设计理由**：避免了「囤积筹码 = 暴富」的套利策略。玩家必须通过博弈竞争排名——筹码是竞争工具，排名是竞争结果，TAO 是结果的价值体现。

#### 声誉 NFT 质押减免

正式版中，声誉 NFT 的 Stage 影响下一局入场质押：

| NFT Stage | 诚实率 | 质押减免 |
|-----------|--------|---------|
| 1-3 | ≥ 60% | 10% |
| 4-6 | ≥ 80% | 20% |
| 7-9 | ≥ 90% | 30% |
| 10 | ≥ 95% | 40% |

链上调用：`calculateStakeDiscount(tokenId) → discountBasisPoints`

#### 完整经济闭环

```
质押入场 → 博弈排名 → TAO 收益/亏损 → 声誉 NFT 升级/腐化
    ↑                                          │
    └────────── 入场质押减免 ←──────────────────┘

外部 API 消费 → 子网 Epoch 奖励（Validator/Miner）
    │
    └── 10% 注入游戏收益池 → 增大每局奖金 → 更多玩家入场 → 更多数据
```

### 7.4 参与者损益分析（v3.0 修订）

| 参与者 | 投入 | 收益 | 风险 |
|--------|------|------|------|
| **游戏玩家（矿工角色）** | 0.05 TAO 入场 + 博弈时间 | 冠军最高 0.1164 TAO（+133%） | 排名第 7 → 质押 100% 清零 |
| **游戏玩家（验证者角色）** | 同上 | 精准举报可推高排名 → 进入前三即盈利 | 合谋标记 → 罚 5 筹码 → 排名暴跌 |
| **游戏玩家（所有者角色）** | 同上 | 合约达成 → 排名升一档；冠军分 35% | 躺平 → 合约失败 → 排名降档 |
| **子网 Miner** | ≥15 TAO 质押 + 计算资源 | Epoch 奖励 + 标注数据出售 | 数据造假被罚没 |
| **子网 Validator** | ≥20 TAO 质押 + 审计劳动 | Epoch 奖励 70% | 评分偏离被挑战 |
| **外部 API 消费者** | 0.1 TAO/千次 | 可信评分数据 | 无 |
| **声誉 NFT 持有者** | 市场购买 / 游戏产出 | 质押减免（最高 40%）+ 跨子网通行证 | 排名连败 → NFT 腐化 |
| **子网国库** | — | 游戏 5% 协议费 + 罚没 30% + NFT 版税 | — |

### 7.5 代币经济参数总览（v3.0）

| 参数 | 默认值 | 可调整性 |
|------|--------|----------|
| 游戏入场质押 | 0.05 TAO | DAO 投票 |
| 收益池冠军份额 | 35% | DAO 投票 |
| 国库协议费 | 5% | DAO 投票 |
| API 收入注入游戏比例 | 10% | DAO 投票 |
| 声誉 NFT 质押减免上限 | 40% | DAO 投票 |
| Miner 子网质押 | 15 TAO | DAO 投票 |
| Validator 子网质押 | 20 TAO | DAO 投票 |
| Epoch 奖励分配 | V:70% / M:30% | DAO 投票 |
| 跨子网 API 费率 | 0.1 TAO/千次 | DAO 投票 |

---

## 8. 安全体系与抗攻击设计

### 8.1 攻击面与防御矩阵

| 攻击向量 | 威胁等级 | 防御措施 | 处罚 |
|----------|----------|----------|------|
| **Miner 提交重复数据** | 中 | 原创声明质押 + 挑战机制 + ZK 证明唯一性 | 罚没全部质押 |
| **Miner 伪造数据（非来自真实游戏）** | 高 | ZK 证明必须验证 GameStateTransitionCircuit；无 ZK 证明自动扣 30 分 | 罚没全部质押 + 永久封号 |
| **Miner 抄袭开源数据** | 中 | 开源数据对比 + 挑战仲裁 | 罚没全部质押 + 永久封号 |
| **Validator 恶意低分** | 高 | 评分与 GT 偏差检测 + 挑战机制 | 罚没 50% 质押 |
| **Validator 合谋** | 极高 | VRF 随机分配审查对象 + 随机抽检 + 举报奖励 | 罚没 100% 质押 + 永久封禁 |
| **女巫攻击** | 高 | 每身份 ≥15 TAO 质押（经济门槛）+ GitHub/邮箱验证 + 关联分析 | 关联账户全部罚没 |
| **Ground Truth 委员会合谋** | 极高 | VDF 时间锁 + commit-reveal + 社会共识交叉验证 + 举报机制 | 全部质押罚没 + 永久取消资格 |
| **TEE Enclave 被篡改** | 极高 | Enclave 代码哈希公开审计 + 多独立 TEE 节点交叉验证 + RA 验证 | 该 TEE 节点输出被忽略 |
| **AI 模型被投毒** | 高 | 模型参数哈希上链 + 留出集盲测 + 人类陪审团偏差监控 | 回滚至前一版本模型 |
| **VDF 时间锁被绕过** | 中 | Wesolowski VDF 的密码学安全性 + 链上 VDF_Verify 强制验证 | 未通过验证的 GT 被忽略 |

### 8.2 非对称信息博弈的保持

所有架构设计必须遵循一个核心原则：**不破坏 Miner 与 Validator 之间的非对称信息博弈张力**。

| 设计决策 | 如何保持博弈张力 |
|----------|-----------------|
| VRF 随机分配审查对象 | Miner 无法预知哪个 Validator 会审查自己，无法定向贿赂 |
| ZK 证明仅验证"数据来自游戏" | 标注的诚实度仍需 Validator 判定，维持信息不对称 |
| Ground Truth 委员会随机轮换 | 委员会成员无法长期垄断真值定义权 |
| VDF 时间锁 | Validator 在评分提交前无法预知 GT，消除信息优势 |
| AI 仅提供"建议评分"（初期） | 最终裁决权在人类，AI 不能替代博弈过程 |
| commit-reveal 声明机制 | 矿工先提交哈希承诺，延迟揭示明文声明；未 reveal 视为无效；same-sample 按 first-to-chain 判定归属 |

### 8.3 紧急响应机制

子网所有者保留有限的紧急权限，但每次使用都会上链并触发强制 DAO 审查：

| 紧急操作 | 条件 | 限制 |
|----------|------|------|
| 暂停数据提交 | 检测到大规模欺诈攻击 | 最多持续 24 小时，需要 DAO 事后投票确认 |
| 冻结恶意地址 | 挑战成功 2 次以上的地址 | 自动执行，不可手动干预 |
| 回滚 AI 模型版本 | 连续 3 Epoch 偏差 >10 分 | 自动触发，不可手动干预 |
| 调整挑战质押门槛 | 检测到挑战机制被滥用 | 临时调整，需 72 小时内 DAO 投票追认 |

---

## 9. 开发路线图

### 9.1 阶段划分

```
Phase 0: DEMO 竞技游戏原型          Phase 1: 子网测试网上线
├── Month 1-2                       ├── Month 3-4
│   ├── 智能合约开发 + 审计          │   ├── 子网在 Bittensor 测试网注册
│   ├── ZK 电路开发 + 审计           │   ├── 陪审团引导期启动（5人）
│   ├── AI 基线模型预训练            │   ├── 《暗流》竞技游戏上线（含 TAO 模拟结算）
│   ├── 游戏竞技前端（React+Socket）  │   ├── 阶梯分账 + 事件广播 + 终局揭示动画
│   ├── TEE 服务器部署               │   └── Data SDK v0.1 发布
│   └── VDF Prover 开发              │
                                    │
Phase 2: 混合验证期                 Phase 3: 完全自治 + 主网上线
├── Month 5-6                       ├── Month 7+
│   ├── AI 过渡至混合验证模式        │   ├── 主网正式上线（游戏 TAO 实值结算）
│   ├── 跨子网网关部署               │   ├── 外部 API 收入注入游戏收益池
│   ├── 声誉 NFT 铸造+交易市场       │   ├── 声誉 NFT 质押减免生效
│   ├── 外部游戏 SDK 合作扩展        │   ├── 跨子网 API 开放
│   └── 游戏社区运营启动             │   └── 社区治理 DAO 移交
```

### 9.2 详细里程碑与交付物

| 里程碑 | 时间 | 交付物 | 验收标准 |
|--------|------|--------|----------|
| M1: 合约开发完成 | Week 4 | 10 个核心合约 + 单元测试 + Gas 报告 | 测试覆盖率 ≥ 90%，无 Critical/High 审计问题 |
| M2: ZK 电路完成 | Week 6 | GameStateTransitionCircuit + 审计报告 | 约束完整性验证通过 |
| M3: AI 基线模型 | Week 8 | 预训练模型 v1.0 + 评估报告 | 查准率 ≥ 85%，查全率 ≥ 80% |
| M4: 游戏 DEMO | Week 10 | 竞技游戏可玩（含模拟 TAO 结算 + 阶梯分账 + 事件广播） | 7 人完整对局无中断，数据导出符合 Schema |
| M5: 测试网上线 | Week 14 | 子网运行 + 陪审团引导期 | 连续运行 2 周无中断 |
| M6: 陪审团引导期结束 | Week 22 | AI 过渡至混合验证 | 连续 4 Epoch 偏差 < 5 分 |
| M7: 主网上线 | Week 28 | 全功能上线（TAO 实值结算 + 声誉 NFT + API 注入） | 稳定运行 2 周，无安全事件 |

### 9.3 团队配置建议

| 角色 | 人数 | 技能要求 |
|------|------|----------|
| 智能合约工程师 | 2 | Solidity, Substrate, Foundry/Hardhat |
| ZK 电路工程师 | 1-2 | Circom/Halo2, Groth16, 密码学 |
| AI/ML 工程师 | 1-2 | PyTorch, Hugging Face, NLP |
| 前端/游戏工程师 | 2-3 | React, TypeScript, Socket.IO, Three.js/Phaser, Zustand |
| 后端/DevOps | 1-2 | Node.js, Express, IPFS, TEE/SGX, Docker, K8s |
| 安全审计（外部） | 按需 | 智能合约审计 + ZK 电路审计 |
| 产品/社区 | 1 | Bittensor 生态, Web3 游戏社区, 代币经济设计 |

---

## 10. 部署与运维指南

### 10.1 节点部署架构

```
生产环境推荐拓扑：

                    ┌─────────────┐
                    │  Load       │
                    │  Balancer   │
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌────────────┐  ┌────────────┐  ┌────────────┐
   │ API Gateway│  │ API Gateway│  │ API Gateway│
   │ (Nginx)    │  │ (Nginx)    │  │ (Nginx)    │
   └──────┬─────┘  └──────┬─────┘  └──────┬─────┘
          │                │                │
          ▼                ▼                ▼
   ┌─────────────────────────────────────────────┐
   │            Kubernetes Cluster                │
   │                                              │
   │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
   │  │ AI推理   │ │ 数据查询  │ │ 跨子网网关    │ │
   │  │ Service  │ │ Service  │ │ Service      │ │
   │  │ (GPU)   │ │ (CPU)    │ │ (CPU)        │ │
   │  └──────────┘ └──────────┘ └──────────────┘ │
   │                                              │
   │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
   │  │ Miner    │ │Validator │ │ TEE Server   │ │
   │  │ Node     │ │ Node     │ │ (SGX Machine)│ │
   │  │ (CPU)    │ │ (CPU)    │ │ (Dedicated)  │ │
   │  └──────────┘ └──────────┘ └──────────────┘ │
   └─────────────────────────────────────────────┘

数据存储层（独立部署）：
   ┌──────────┐  ┌──────────┐  ┌──────────────┐
   │ PostgreSQL│  │ IPFS     │  │ Redis        │
   │ (Primary  │  │ Cluster  │  │ (缓存+队列)   │
   │ +Replica) │  │          │  │              │
   └──────────┘  └──────────┘  └──────────────┘
```

### 10.2 环境变量配置

```bash
# .env.production

# Bittensor 网络配置
BT_NETWORK=finney                    # 主网: finney, 测试网: test
BT_WALLET_NAME=undercurrent_validator
BT_WALLET_HOTKEY=default
BT_SUBNET_UID=                       # 子网上线后的 UID

# 链上合约地址
CONTRACT_STAKING_REGISTRY=0x...
CONTRACT_DATA_COMMITMENT=0x...
CONTRACT_GROUND_TRUTH_REGISTRY=0x...
CONTRACT_VERIFICATION_SCORING=0x...
CONTRACT_REWARD_DISTRIBUTOR=0x...
CONTRACT_CHALLENGE_ARBITRATION=0x...
CONTRACT_REPUTATION_NFT=0x...
CONTRACT_DAO_GOVERNANCE=0x...
CONTRACT_CROSS_SUBNET_GATEWAY=0x...
CONTRACT_VDF_VERIFIER=0x...

# TEE 配置
TEE_ENABLED=true
TEE_SGX_ENCLAVE_PATH=/opt/undercurrent/enclave.signed.so
TEE_IAS_API_KEY=...

# VDF 配置
VDF_RSA_MODULUS_BITS=2048
VDF_TIME_PARAMETER=100

# AI 模型配置
MODEL_PATH=/opt/undercurrent/models/audit_v1
MODEL_REGISTRY_URL=https://huggingface.co/undercurrent/audit-model
LORA_ADAPTER_PATH=/opt/undercurrent/models/lora_latest

# 数据存储
IPFS_API_URL=http://ipfs-cluster:5001
DATABASE_URL=postgresql://user:pass@postgres:5432/undercurrent
REDIS_URL=redis://redis:6379

# API 配置
API_PORT=3000
API_RATE_LIMIT=1000                    # 每分钟最大请求数
API_JWT_SECRET=...
API_CORS_ORIGINS=https://game.undercurrent.ai,https://api.undercurrent.ai
```

### 10.3 监控指标

| 指标类别 | 关键指标 | 告警阈值 |
|----------|----------|----------|
| **子网健康** | 活跃 Miner 数 | < 5 |
| | 活跃 Validator 数 | < 5 |
| | Epoch 完成率 | < 95% |
| | 挑战发起率 | > 20%（可能遭受攻击） |
| **AI 模型** | 评分与人类陪审团偏差 | > 10 分持续 3 Epoch |
| | 推理延迟 | > 50ms P99 |
| | 模型留出集 AUC-ROC | < 0.85 |
| **链下服务** | TEE 节点在线率 | < 100% |
| | VDF Prover 响应时间 | > 15s |
| | IPFS 可用性 | < 99% |
| **经济安全** | 最大单一 Miner 数据占比 | > 40% |
| | 罚没事件触发频率 | 突增 > 5x 均值 |

---

## 11. 项目分析：新颖性、实用性与可行性

> 本章为 v3.0 新增。从新颖性（novelty）、实用性（practicality）、可行性（feasibility）三个维度对 Undercurrent 项目进行系统评估。

### 11.1 新颖性分析

#### 11.1.1 相对于现有 Bittensor 子网的差异化

Bittensor 生态现有 50+ 子网，绝大多数出售的是"算力"或"模型"——让 Miner 运行同一类 AI 推理任务，Validator 评分。Undercurrent 的差异化在于：

| 维度 | 典型子网（如文本生成） | Undercurrent |
|------|---------------------|-------------|
| **核心商品** | AI 模型推理 | 信任验证流程本身 |
| **数据来源** | 公开数据集 | 经济博弈中**实时产生**的真实人类策略数据 |
| **Miner 任务** | 运行模型 | 从游戏中标注博弈行为数据 |
| **Validator 输入** | 模型输出 vs 预期 | 侦查线索 + 历史模式 + 博弈推理 |
| **信任建立** | 模型准确率 | 经济博弈（虚报→审计→惩罚的完整链条） |
| **外部收入** | API 调用费 | API + 游戏入场质押 + NFT 市场 + 数据销售 |

**核心新颖点**：Undercurrent 是 Bittensor 生态中第一个将"博弈过程本身"作为数据生产管线的子网。其他子网验证的是模型输出，Undercurrent 验证的是**人的诚实度**。

#### 11.1.2 相对于 Web3 游戏的差异化

| 维度 | 典型 Web3 游戏（如 Axie） | 《暗流》 |
|------|-------------------------|---------|
| **玩家行为** | 战斗/养成/收集 | 声明/评分/举报/审计——博弈决策 |
| **数据产出** | 游戏日志（低价值） | 结构化博弈决策序列（高价值训练数据） |
| **经济模型** | Play-to-Earn（通货膨胀风险） | Stake-to-Play（零通胀，零和+外部注入） |
| **与链的关系** | 代币+ NFT 集成 | 链上合约 + ZK 证明 + 声誉 NFT + 子网经济 |
| **可持续性** | 依赖新玩家入场 | 双重收入源：游戏质押 + 外部 API 消费 |

**核心新颖点**：《暗流》不是"带代币的游戏"，而是"从游戏中提取高价值 AI 训练数据的竞技平台"。玩家的每一步操作都有对应的子网经济合约映射——声明=数据提交、审计=验证、举报=挑战。

#### 11.1.3 已知参考对比

| 项目 | 相同 | 不同 |
|------|------|------|
| **Bittensor Subnet 1（文本提示）** | 同生态 | 卖模型，不卖信任 |
| **Numerai** | 链上数据标注竞赛 | 无实时博弈，无游戏化前端 |
| **Axie Infinity / STEPN** | Web3 游戏 | X-to-Earn 通胀模型，无 AI 数据产出 |
| **Ocean Protocol** | 数据市场 | 不提供链上博弈验证机制 |
| **Avalon / 狼人杀类** | 社交推理博弈 | 无经济合约，无 TAO 质押，无 AI 训练闭环 |

Undercurrent 的独特组合是：**Bittensor 子网 × 经济博弈 × 在线竞技游戏 × AI 训练数据生产**——这四者在当前市场中没有已知的直接竞品。

### 11.2 实用性分析

#### 11.2.1 解决的实际问题

| 问题 | 传统方案 | Undercurrent 方案 | 节省/提升 |
|------|---------|-----------------|----------|
| 高质量标注数据获取 | 雇佣标注团队（$0.1-1/条） | 全球玩家博弈竞争产生（代币激励） | 成本降至接近零边际 |
| 数据质量验证 | 内部 QC 团队抽查（人力偏差） | 经济博弈自动浮现质量（Validator+ 挑战） | 偏差 → 博弈均衡 |
| AI 审计模型训练 | 购买公开数据集（缺乏博弈痕迹） | 游戏产出的真实人类博弈决策序列 | 训练数据包含"作弊动机"特征 |
| 反作弊系统 | 自建规则引擎（中心化，易绕过） | 经济博弈验证 API（去中心化，抗合谋） | 抗绕过能力 ↑ |
| Web3 游戏用户留存 | 纯经济激励（通胀倦怠） | 竞技排名 + TAO 收益 + 声誉建设 | 留存来自竞争快感而非通胀 |

#### 11.2.2 应用场景

**场景 A：AI 公司购买博弈数据集**

某 AI 创业公司需要训练一个"识别商业谈判中欺骗行为"的模型。它在 Undercurrent 数据市场购买 10,000 条《暗流》博弈数据——每条数据包含「矿工知道真实质量→决定是否虚报→验证者根据线索评分→所有者审计→结果」的完整链路。这比任何合成数据都更接近真实人类的欺骗决策模式。

**场景 B：Web3 游戏接入反作弊 API**

某 FPS 链游需要识别自瞄外挂。它将玩家操作数据提交到 Undercurrent API（`POST /v1/audit`）→ Miner 竞争标注哪些行为可疑 → Validator 审计 → API 返回作弊概率评分。成本比自建反作弊团队低 70%。

**场景 C：其他 Bittensor 子网消费审计服务**

某 Bittensor 文本生成子网需要验证 Miner 提交内容的质量。它通过跨子网网关调用 Undercurrent 审计 API——用其原生代币支付，Subtensor 中继结算。

#### 11.2.3 对 Bittensor 生态的价值

1. **降低新子网启动门槛**：可参数化规则模板让其他子网一键部署类似验证机制
2. **增加 TAO 流通速度**：游戏入场质押 → 链上 TX → 收益分配，每局产生 7+ 笔链上交易
3. **吸引非加密用户**：游戏是接触点——玩家不需要理解子网机制，只需要理解"声明星数→有人审计→前三名赚钱"
4. **数据飞轮外溢**：Undercurrent 训练的 AI 审计模型可作为 Bittensor 生态的公共品——任何子网都可调用

### 11.3 可行性分析

#### 11.3.1 技术可行性

| 组件 | 技术成熟度 | 风险 | 缓解 |
|------|----------|------|------|
| Bittensor 子网（Python SDK） | ✅ 生产级 | Subtensor API 变更 | 锁定 SDK 版本 + CI 兼容测试 |
| Express + Socket.IO 游戏服务器 | ✅ 成熟 | 7 人并发同步 | Socket.IO 房间模式，压力测试 |
| SQLite + better-sqlite3 | ✅ 零风险 | 无横向扩展 | DEMO 阶段单机足够；正式版迁移 PG |
| Circom ZK 电路 | ⚠️ 中风险 | 电路约束遗漏 | 独立安全审计 + 形式化验证 |
| Intel SGX TEE | ⚠️ 中风险 | 硬件依赖 + IAS 服务停服 | AMD SEV 备选 + 社会共识预言机作为 fallback |
| DistilBERT LoRA 微调 | ✅ 低风险 | 过拟合 | 留出集 + 人类陪审团偏差监控 |
| React + Zustand + Vite | ✅ 成熟 | — | — |

**DEMO 可交付性**：Phase 1-4 全部技术组件（Express + SQLite + React + Socket.IO）均为成熟技术栈，无技术阻塞点。ZK 和 TEE 已在 DEMO 范围外（标注预留位），不阻塞 DEMO 交付。

#### 11.3.2 经济可行性

**DEMO 阶段**：零链上成本。入场质押 = 模拟值。服务端单机运行。

**正式版启动成本**：

| 项目 | 估算 |
|------|------|
| 智能合约审计（10 合约） | $80,000-150,000 |
| ZK 电路审计 | $50,000-100,000 |
| SGX 服务器（3 节点） | $3,000/月 |
| IPFS 存储 | $200/月 |
| 初始流动性（收益池种子） | 1-5 TAO × 首月预期局数 |

**盈亏平衡**：若每日 50 局 × 0.35 TAO = 17.5 TAO 流水。国库 5% = 0.875 TAO/日。外部 API 消费（1000 次/日 × 0.0001 TAO = 0.1 TAO/日）。月收入 ≈ 29 TAO（按当前 ≈$10/TAO = $290/月，初期预期）。随着外部 API 消费者增长和游戏玩家基数扩大，国库收入线性增长。

**关键假设**：游戏玩家基数 ≥ 35 DAU（每日 5 局 × 7 人）。这在 Web3 游戏领域中属于极低门槛——任何有基本社区的 Web3 项目都能达到。

#### 11.3.3 市场可行性

| 市场信号 | 证据 |
|---------|------|
| Bittensor 生态增长 | TAO 市值 $2B+，子网数 50+ 且增长中 |
| AI 训练数据缺口 | 高质量标注数据市场规模 $7B+（2027 预测） |
| 链游竞技化趋势 | 从 X-to-Earn 转向 Skill-to-Earn |
| 监管友好 | Stake-to-Play（零和+外部注入）规避了 Play-to-Earn 的证券法风险 |

#### 11.3.4 风险矩阵

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 游戏玩家基数不足 | 中 | 高 | ① 单人+Bot 模式确保可运行 ② SDK 接入外部游戏导流 ③ 声誉 NFT 激励长期参与 |
| Bittensor 生态政策变更 | 低 | 中 | 子网核心逻辑与 Subtensor 解耦，合约层面独立 |
| TAO 价格剧烈波动 | 中 | 中 | 入场质押以 TAO 计价——TAO 涨→玩家多，TAO 跌→门槛低 |
| ZK 电路安全漏洞 | 低 | 极高 | 独立审计 + Bug Bounty + 渐进部署（先无 ZK，后接入） |
| 验证者合谋未被检测 | 低 | 中 | V4.3 反合谋机制（零方差惩罚 + 合谋自动检测 + 举报奖励） |
| 监管（证券法） | 低 | 中 | Stake-to-Play 模型（不承诺收益，排名决定回报）区分于证券 |

### 11.4 综合评估

| 维度 | 评分（1-5） | 说明 |
|------|-----------|------|
| **新颖性** | ⭐⭐⭐⭐⭐ | Bittensor × 经济博弈 × 在线竞技 × AI 训练数据的四维组合无已知竞品 |
| **实用性** | ⭐⭐⭐⭐ | 解决数据标注成本、验证偏差、AI 训练数据质量三个真实痛点 |
| **技术可行性** | ⭐⭐⭐⭐ | 核心栈成熟；ZK/TEE 有 fallback；DEMO 零阻塞 |
| **经济可行性** | ⭐⭐⭐⭐ | 零和+外部注入模型可持续；启动成本可控；盈亏平衡门槛低 |
| **市场可行性** | ⭐⭐⭐ | 依赖 Bittensor 生态增长 + 游戏社区建设；需验证玩家获取成本 |
| **综合** | ⭐⭐⭐⭐ | 具备 DEMO 开发条件。核心风险在社区增长而非技术实现。 |

---

## 12. 附录

### 12.1 术语表

| 术语 | 英文 | 定义 |
|------|------|------|
| 子网 | Subnet | Bittensor 网络中由特定激励机制驱动的独立市场 |
| 矿工 | Miner | 提交数据的参与者，竞争获得 TAO 奖励 |
| 验证者 | Validator | 审计数据质量的参与者，根据评分获得奖励 |
| 挑战者 | Challenger | 发起作弊指控的参与者 |
| 真值 | Ground Truth | 用于判定数据质量的基准答案 |
| TEE | Trusted Execution Environment | 可信执行环境（如 Intel SGX、AMD SEV） |
| VDF | Verifiable Delay Function | 可验证延迟函数，用于实现时间锁 |
| ZK | Zero-Knowledge | 零知识证明 |
| ZK Prover | — | 生成零知识证明的进程/模块 |
| ZK Circuit | — | 用约束语言（Circom/Halo2）编写的算术电路 |
| Epoch | — | 子网中的一轮工作周期（默认 360 blocks） |
| TAO | — | Bittensor 网络的原生代币 |
| RAO | — | TAO 的最小单位（1 TAO = 1e9 RAO） |
| commit-reveal | — | 先提交哈希承诺、后公开原文的两阶段协议 |
| LoRA | Low-Rank Adaptation | 低秩适配，一种高效的大模型微调方法 |
| Merkle Tree | — | 默克尔树，用于高效验证数据完整性 |
| Enclave | — | TEE 中的安全区域 |
| Remote Attestation | — | 远程证明，验证 Enclave 代码完整性的机制 |
| UUPS | Universal Upgradeable Proxy Standard | 通用可升级代理标准 |
| Data Hunter | — | 零质押、零代币门槛的轻量级数据贡献角色 |

### 12.2 数据格式规范

#### 12.2.1 ActionLog 标准格式

```json
{
  "$schema": "https://standards.undercurrent.ai/action-log/v1",
  "type": "object",
  "required": ["schema_version", "session_id", "action_sequence"],
  "properties": {
    "schema_version": { "type": "string", "const": "1.0.0" },
    "session_id": { "type": "string", "format": "uuid" },
    "source": {
      "type": "object",
      "properties": {
        "game_id": { "type": "string" },
        "client_version": { "type": "string" },
        "collector_type": { "enum": ["data_hunter", "miner", "sdk"] },
        "anonymous_id": { "type": "string", "pattern": "^0x[a-fA-F0-9]{64}$" }
      }
    },
    "game_session": {
      "type": "object",
      "properties": {
        "game_type": { "type": "string" },
        "rules_hash": { "type": "string", "pattern": "^0x[a-fA-F0-9]{64}$" },
        "start_time": { "type": "string", "format": "date-time" },
        "duration_ms": { "type": "integer", "minimum": 0 },
        "outcome": { "type": "string" }
      }
    },
    "action_sequence": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "seq": { "type": "integer" },
          "actor": { "type": "string" },
          "action_type": { "type": "string" },
          "action_id": { "type": "string" },
          "target": { "type": "string" },
          "timestamp_offset_ms": { "type": "integer" },
          "state_hash_before": { "type": "string" },
          "state_hash_after": { "type": "string" }
        }
      }
    },
    "attestation": {
      "type": "object",
      "properties": {
        "type": { "enum": ["tee", "none"] },
        "enclave_hash": { "type": "string" },
        "quote": { "type": "string" },
        "outcome_hash": { "type": "string" }
      }
    },
    "zk_proof": {
      "type": "object",
      "properties": {
        "proof_type": { "enum": ["groth16_aggregated", "none"] },
        "proof_data": { "type": "string" },
        "public_inputs": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

#### 12.2.2 GroundTruth 链上存储格式

```solidity
struct GroundTruthRecord {
    uint256 epochId;
    bytes32 gtHash;             // Ground Truth 的 keccak256
    GTType  sourceType;        // TEE 或 COMMITTEE
    uint256 establishedAt;     // 确认时的区块号
    bytes   attestationData;   // TEE 远程证明或委员会提交记录
}

enum GTType { TEE, COMMITTEE }
```

### 12.3 外部依赖与服务

| 服务 | 用途 | 方案 |
|------|------|------|
| Bittensor Subtensor | 子网注册、共识、TAO 结算 | 原生 |
| IPFS + Filecoin | 原始数据与标注数据的持久化存储 | Pinata / Web3.Storage / 自建节点 |
| Arweave | 关键审计日志的永久存档 | Bundlr Network |
| Ethereum / L2 | 声誉 NFT 交易市场（如 OpenSea） | ERC-721 跨链桥 |
| Hugging Face | 模型托管与版本管理 | Hugging Face Hub |
| The Graph / SubQuery | 链上数据索引（供前端查询） | SubQuery (Substrate 原生支持) |
| Intel SGX IAS / DCAP | TEE 远程证明验证 | IAS API v5 |

### 12.4 参考文档

- Bittensor 开发者文档：https://docs.bittensor.com
- Subtensor 区块链浏览器：https://taostats.io
- Wesolowski VDF 论文：https://eprint.iacr.org/2018/623
- Groth16 证明系统：https://eprint.iacr.org/2016/260
- OpenSpiel 博弈论框架：https://github.com/google-deepmind/open_spiel
- PettingZoo 多智能体环境：https://pettingzoo.farama.org

---

*文档版本：v3.1 | 最后更新：2026-05-23 | 对齐游戏规则：V4.3 实值收益版 | 维护：Undercurrent Core Team*

*本文档面向具备 Bittensor 生态基础知识的开发者。所有链上合约地址、部署参数和测试网启动时间以正式版本发布公告为准。*
