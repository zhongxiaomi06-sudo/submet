import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

/* ======================== */
/*  类型 & 翻译              */
/* ======================== */
type Lang = 'zh' | 'en';

const T = {
  zh: {
    /* Hero */
    heroBadge1: 'Bittensor 子网',
    heroBadge2: '信任基础设施',
    heroTagline: '去中心化信任验证基础设施',
    heroDesc: '首个将博弈过程本身作为数据生产管线的 Bittensor 子网。',
    heroDesc2: '以经济博弈替代中心化审核，持续产出可信行为数据与 AI 审计能力。',
    heroBtnDemo: '进入 DEMO',
    heroBtnLearn: '了解产出',
    heroVersion: 'DEMO v3.0 · V4.3 Rules · 1 Human + 6 AI Bot',

    /* Section Labels */
    labelProblem: '核心问题',
    labelProducts: '核心产出',
    labelHow: '运作机制',
    labelEcosystem: '生态角色',
    labelInnovations: '技术创新',
    labelRoles: '游戏角色',

    /* Pain */
    painTitle: '去中心化 AI 的',
    painTitleHighlight: '数据真实性困境',
    painDesc: '现有方案无法捕捉真实世界中 AI 代理面临的核心挑战——信息不对称、昂贵信号、声誉效应、多轮惩罚',

    /* Products */
    productTitle: '三大数字商品',
    productDesc: '每局 7 人博弈，转换为结构化、可交易、可验证的数字资产',
    funnelTitle: '数据验证漏斗',
    funnelDesc: '4 阶段验证管线，从格式校验到终局仲裁',

    /* Pipeline */
    pipelineTitle: '博弈即验证引擎',
    pipelineDesc: '游戏是前端，博弈是引擎，数据是产品——从质押入场到 API 输出的完整闭环',
    phaseSectionTitle: '单局博弈流程',
    phaseSectionMeta: '7 名玩家 · 非对称信息 · 三轮博弈',

    /* Ecosystem */
    ecosystemTitle: 'Bittensor 生态中的',
    ecosystemTitleHighlight: '信任中间件',
    ecosystemDesc: '不是又一个模型训练子网，而是让其他子网可以调用的去中心化验证基础设施',

    /* Innovations */
    innovationTitle: '技术与经济创新',

    /* Roles */
    rolesTitle: '三重身份 · 信息',
    rolesTitleHighlight: '不对称博弈',

    /* CTA */
    ctaTitle: '加入博弈',
    ctaDesc: '进入 DEMO，亲身体验非对称信息博弈如何生产可信数据',
    ctaBtn: '进入 DEMO',
    ctaFooter: 'DEMO v3.0 · V4.3 Rules · 不足 7 人由 AI Bot 补齐',

    /* Footer */
    footer: '© 2025 SubNet：暗流 — Bittensor 功能型子网 · 信任验证基础设施',
  },

  en: {
    heroBadge1: 'Bittensor Subnet',
    heroBadge2: 'Trust Layer',
    heroTagline: 'Mining Trust. One Game at a Time.',
    heroDesc: 'Undercurrent turns economic gameplay into a trust verification pipeline on Bittensor.',
    heroDesc2: 'No central authority. No manual auditing. Just real stakes, real players, and real data.',
    heroBtnDemo: 'Play the DEMO',
    heroBtnLearn: 'See What It Produces',
    heroVersion: 'DEMO v3.0 · V4.3 Rules · 1 Human + 6 AI Bots',

    labelProblem: 'THE PROBLEM',
    labelProducts: 'WHAT IT PRODUCES',
    labelHow: 'HOW IT WORKS',
    labelEcosystem: 'ECOSYSTEM ROLE',
    labelInnovations: 'INNOVATIONS',
    labelRoles: 'GAME ROLES',

    painTitle: 'Decentralized AI Has a ',
    painTitleHighlight: 'Trust Problem',
    painDesc: 'Synthetic simulations can\'t replicate real economic stakes. Crowdsourcing is static. Centralized rule engines are brittle. AI agents need data that reflects how rational actors actually behave when money is on the line.',

    productTitle: 'What Every Round Produces',
    productDesc: 'Seven players enter. Structured, verifiable data comes out. Every move is logged — every bluff, every audit, every penalty.',
    funnelTitle: 'The Verification Pipeline',
    funnelDesc: 'From lightweight integrity checks to full challenge arbitration — 4 tiers of escalating scrutiny',

    pipelineTitle: 'Play to Verify',
    pipelineDesc: 'The game is the frontend. Game theory is the engine. Data is the output. A closed loop from staking to API.',
    phaseSectionTitle: 'How a Round Unfolds',
    phaseSectionMeta: '7 Players · Hidden Information · 3 Rounds',

    ecosystemTitle: 'A ',
    ecosystemTitleHighlight: 'Trust Middleware',
    ecosystemDesc: 'for Bittensor. Not another model-training subnet — a verification primitive that every subnet can plug into.',

    innovationTitle: 'What Makes It Different',

    rolesTitle: 'Three Roles. ',
    rolesTitleHighlight: 'Incomplete Information.',

    ctaTitle: 'Step Into the Game',
    ctaDesc: 'Try the DEMO. See how adversarial gameplay generates the data that AI desperately needs.',
    ctaBtn: 'Launch DEMO',
    ctaFooter: 'DEMO v3.0 · V4.3 Rules · AI bots backfill empty seats',

    footer: '© 2025 SubNet: Undercurrent — A Bittensor Subnet · Trust Infrastructure',
  },
};

/* ======================== */
/*  多语言数据              */
/* ======================== */
const PAIN_POINTS_DATA: Record<Lang, { label: string; problem: string; ours: string }[]> = {
  zh: [
    { label: '合成模拟', problem: '无真实经济利害，代理行为不可信', ours: 'TAO 实值质押，理性人博弈' },
    { label: '众包标注', problem: '单轮静态场景，无博弈深度', ours: '多轮非对称信息博弈闭环' },
    { label: '中心化反作弊', problem: '规则引擎易绕过，缺乏经济验证', ours: '去中心化经济博弈验证 API' },
  ],
  en: [
    { label: 'Synthetic Sims', problem: 'No skin in the game. Zero-cost behavior is meaningless.', ours: 'Real TAO on the line. Rational actors only.' },
    { label: 'Crowdsourcing', problem: 'One-and-done labeling. No strategic depth.', ours: 'Multi-round hidden-information games with reputation at stake.' },
    { label: 'Centralized Anti-Cheat', problem: 'Static rules. Easy to game. No economic teeth.', ours: 'Decentralized economic verification — cheating has a price tag.' },
  ],
};

const PRODUCTS_DATA: Record<Lang, { icon: string; title: string; en: string; desc: string; tags: string[]; color: string }[]> = {
  zh: [
    { icon: '📦', title: '监督数据包', en: 'Supervised Data Packet', desc: '每局博弈产出完整的行为日志 + 标注真值数据，含声明-审计-惩罚全链路事件。IPFS 锚定，哈希上链。', tags: ['行为标注', '真值验证', 'IPFS 存证'], color: '#6366f1' },
    { icon: '🔧', title: '可复用审计规则模板', en: 'Audit Rule Template', desc: '浅审计 / 深审计分层机制 + 合谋检测 + 叛徒契约，可参数化部署到其他 Bittensor 子网。', tags: ['智能合约', '参数化', '跨子网'], color: '#a855f7' },
    { icon: '⚙️', title: '可跑机制配置包', en: 'Runnable Mechanism Pack', desc: '前端交互组件 + 数据采集器 + 参数模板，其他 Web3 项目一键集成博弈验证能力。', tags: ['交互前端', '数据采集', '开箱即用'], color: '#06b6d4' },
  ],
  en: [
    { icon: '📦', title: 'Labeled Datasets', en: 'Supervised Data Packet', desc: 'Every round produces a complete behavior trace: every claim, every score, every audit, every penalty. Full event chain. IPFS-anchored. Hash on-chain. Ready for training.', tags: ['Behavior Labels', 'Ground Truth', 'IPFS Proof'], color: '#6366f1' },
    { icon: '🔧', title: 'Audit Rule Templates', en: 'Audit Rule Template', desc: 'Tiered light/deep audit logic. Collusion detection. Traitor contracts. Fully parameterized. Deploy the same verification DNA to any Bittensor subnet.', tags: ['Smart Contracts', 'Parameterized', 'Cross-Subnet'], color: '#a855f7' },
    { icon: '⚙️', title: 'Plug-and-Play Mechanism Packs', en: 'Runnable Mechanism Pack', desc: 'UI components + data collectors + parameter presets. Drop game verification into any Web3 project in a single integration.', tags: ['UI Kit', 'Data Collector', 'Drop-in Ready'], color: '#06b6d4' },
  ],
};

const FUNNEL_STAGES_DATA: Record<Lang, { stage: string; label: string; detail: string; cost: string; accent: string }[]> = {
  zh: [
    { stage: 'Stage 1', label: '静态检查', detail: '格式 / 签名 / 重复', cost: '0 成本', accent: '#475569' },
    { stage: 'Stage 2', label: '基准评测', detail: 'Pclean gating', cost: '浅审计 · 1 筹码', accent: '#6366f1' },
    { stage: 'Stage 3', label: '风险驱动抽检', detail: 'AI risk_score', cost: '深审计 · 3 筹码', accent: '#a855f7' },
    { stage: 'Stage 4', label: '挑战仲裁', detail: 'evidence pack 复现', cost: '终局深度审计', accent: '#06b6d4' },
  ],
  en: [
    { stage: 'Stage 1', label: 'Static Integrity', detail: 'Format · Signature · Uniqueness', cost: 'Free', accent: '#475569' },
    { stage: 'Stage 2', label: 'Baseline Gating', detail: 'Pclean threshold', cost: 'Light Audit · 1 chip', accent: '#6366f1' },
    { stage: 'Stage 3', label: 'Risk-Weighted Sampling', detail: 'AI risk_score', cost: 'Deep Audit · 3 chips', accent: '#a855f7' },
    { stage: 'Stage 4', label: 'Challenge & Arbitration', detail: 'Full evidence pack replay', cost: 'Final adjudication', accent: '#06b6d4' },
  ],
};

const PIPELINE_STEPS_DATA: Record<Lang, { phase: string; label: string; detail: string }[]> = {
  zh: [
    { phase: '输入', label: 'TAO 质押入场', detail: '7 名玩家，每人 0.05 TAO' },
    { phase: '博弈', label: '非对称信息博弈', detail: '声明→打分→审计→举报→裁决' },
    { phase: '产出', label: '结构化数据', detail: '行为日志 + 标注真值 + evidence pack' },
    { phase: '消费', label: 'API 输出', detail: 'AI 训练数据 / 审计模型 / 跨子网服务' },
  ],
  en: [
    { phase: 'Stake', label: 'Buy-In', detail: '7 players · 0.05 TAO each' },
    { phase: 'Play', label: 'Hidden-Info Game', detail: 'Claim → Score → Audit → Report → Judge' },
    { phase: 'Extract', label: 'Structured Data', detail: 'Behavior trace + ground truth + evidence pack' },
    { phase: 'Serve', label: 'API Delivery', detail: 'Training data · Audit models · Cross-subnet calls' },
  ],
};

const PHASES_DATA: Record<Lang, { num: string; title: string; role: string; desc: string }[]> = {
  zh: [
    { num: '01', title: '声明阶段', role: '矿工', desc: '基于私有质量信息，向全网公开发布评分声明' },
    { num: '02', title: '打分阶段', role: '验证者', desc: '基于有限线索对所有矿工进行排名打分' },
    { num: '03', title: '交易阶段', role: '全员', desc: '筹码交易、叛徒契约、信息博弈' },
    { num: '04', title: '审计阶段', role: '所有者', desc: '消耗筹码对被举报矿工执行浅/深审计' },
    { num: '05', title: '终局投票', role: '全员', desc: '公开投票、最终揭示、结果公示' },
    { num: '06', title: '结算分账', role: '系统', desc: '阶梯分账 + Evidence Pack 生成' },
  ],
  en: [
    { num: '01', title: 'Claim', role: 'Miner', desc: 'Armed with private quality data, miners stake their reputation on public claims. Honest or bluff? Only they know.' },
    { num: '02', title: 'Score', role: 'Validator', desc: 'Validators work with limited clues. Rank everyone. Spot the liars. Every judgment carries weight.' },
    { num: '03', title: 'Trade', role: 'All', desc: 'Chips change hands. Deals are struck. Traitor contracts signed. The information market heats up.' },
    { num: '04', title: 'Audit', role: 'Owner', desc: 'The subnet owner spends hard-earned chips to investigate. Light peek or deep dive — each costs differently.' },
    { num: '05', title: 'Reveal', role: 'All', desc: 'Public vote. Final unmasking. The truth about every claim comes to light — and so do the consequences.' },
    { num: '06', title: 'Settle', role: 'System', desc: 'Tiered payouts. Evidence packs sealed. Winners collect. The ledger never forgets.' },
  ],
};

const ECO_DATA: Record<Lang, { title: string; desc: string }[]> = {
  zh: [
    { title: '降低新子网启动门槛', desc: '可参数化的审计规则模板让其他子网一键部署验证机制，无需自建反作弊系统' },
    { title: '数据飞轮外溢', desc: '产出的 AI 审计模型和博弈行为数据集，作为 Bittensor 生态公共品对外输出' },
    { title: '吸引非加密用户', desc: '游戏是天然接触点——玩家无需理解子网机制，只需参与博弈即可贡献数据' },
    { title: '增加 TAO 流通', desc: '每局产生 7+ 笔链上交易，为 Bittensor 网络提供真实经济活动' },
    { title: '激励设计验证', desc: '审计分层、合谋检测、惩罚均衡等机制模板，经实践检验后向生态开放' },
    { title: '跨子网 API 服务', desc: '正式版通过 CrossSubnetGateway 合约，其他子网可调用验证 API' },
  ],
  en: [
    { title: 'Zero-Friction Subnet Launch', desc: 'Drop in our parameterized audit templates. Verification from day one. No need to build anti-cheat infrastructure from scratch.' },
    { title: 'Data Flywheel for the Ecosystem', desc: 'AI audit models and behavioral datasets become public goods. Every subnet benefits from the growing intelligence.' },
    { title: 'Onboard Non-Crypto Users', desc: 'It\'s a game first. Players don\'t need to understand subnets or tokens. They just play — and the data flows.' },
    { title: 'Real Economic Velocity', desc: 'Every round writes 7+ on-chain transactions. Real TAO moving. Real economic activity on Bittensor.' },
    { title: 'Proven Incentive Patterns', desc: 'Audit tiering, collusion detection, penalty equilibrium — battle-tested mechanism designs, open-sourced for the ecosystem.' },
    { title: 'Cross-Subnet Verification API', desc: 'Production-ready APIs exposed through the CrossSubnetGateway. Any subnet can call in for trust scores.' },
  ],
};

const INNOVATIONS_DATA: Record<Lang, { icon: string; title: string; desc: string; tag: string }[]> = {
  zh: [
    { icon: '🎯', title: '博弈即验证', desc: '数据质量不由中心化权威判定，而是通过 Miner 与 Validator 之间的非对称信息博弈自然浮现', tag: '核心范式' },
    { icon: '🕹️', title: '游戏即数据前端', desc: '同名网页游戏同时是子网的交互式前端、经济模型沙盘和结构化数据采集入口', tag: '架构创新' },
    { icon: '🔬', title: '审计分层机制', desc: '浅审计（信息侦查）vs 深审计（经济惩罚），区分信息获取与惩罚执行', tag: 'V4.3 亮点' },
    { icon: '💎', title: 'Stake-to-Play', desc: '先质押后博弈，零通胀设计。局内筹码与 TAO 分离，杜绝 Ponzi 风险', tag: '经济模型' },
    { icon: '🪪', title: '声誉 NFT 闭环', desc: '博弈表现铸造声誉 NFT，影响入场门槛、数据权重，形成正向螺旋', tag: '增长飞轮' },
    { icon: '🔗', title: '双层经济架构', desc: '子网运行层 + 游戏博弈层以 TAO 为共同载体，API 收入注入游戏奖池', tag: '生态设计' },
  ],
  en: [
    { icon: '🎯', title: 'Truth Through Gameplay', desc: 'No oracle. No central judge. Data quality surfaces organically as miners and validators play to win.', tag: 'Core Insight' },
    { icon: '🕹️', title: 'The Game Is the Frontend', desc: 'The same web app is your subnet dashboard, your economic sandbox, and your structured data collector — in one.', tag: 'Architecture' },
    { icon: '🔬', title: 'Two-Tier Auditing', desc: 'Want to investigate? Spend 1 chip for a light peek. Want to punish? Spend 3 chips for a deep audit. Information has a price.', tag: 'V4.3 Innovation' },
    { icon: '💎', title: 'Stake-to-Play Economics', desc: 'Put skin in the game first. Zero inflation. Chips ≠ TAO. No Ponzi. No printing tokens out of thin air.', tag: 'Tokenomics' },
    { icon: '🪪', title: 'Reputation NFTs', desc: 'Your play history becomes a soulbound NFT. Higher rep = lower entry fees + higher data weight. A virtuous spiral.', tag: 'Growth Engine' },
    { icon: '🔗', title: 'Dual-Layer Value Loop', desc: 'The subnet runtime layer and the game layer share TAO as their common value carrier. API revenue flows back into the prize pool.', tag: 'Ecosystem Design' },
  ],
};

const ROLES_DATA: Record<Lang, { emoji: string; title: string; en: string; desc: string; tags: string[]; color: string; tagBg: string; tagBorder: string; tagColor: string }[]> = {
  zh: [
    { emoji: '👑', title: '子网所有者', en: 'Subnet Owner', desc: '裁判角色。消耗筹码执行浅审计 / 深审计，裁定惩罚。裁决权是博弈平衡的最后一道防线。', tags: ['审计矿工', '裁定惩罚', '维护公平'], color: '#6366f1', tagBg: 'rgba(99, 102, 241, 0.1)', tagBorder: 'rgba(99, 102, 241, 0.2)', tagColor: '#a5b4fc' },
    { emoji: '🔍', title: '验证者', en: 'Validator', desc: '侦探角色。基于有限线索打分排名与举报。精准判断换来奖励，错误举报代价自负。', tags: ['打分评估', '举报虚报', '赚取奖励'], color: '#a855f7', tagBg: 'rgba(168, 85, 247, 0.1)', tagBorder: 'rgba(168, 85, 247, 0.2)', tagColor: '#c4b5fd' },
    { emoji: '⛏️', title: '矿工', en: 'Miner', desc: '博弈核心。每次声明是决策：诚实换稳定收益，还是虚报追求更高回报？被举报的代价可能让一切归零。', tags: ['声明质量', '诚实/虚报', '承受风险'], color: '#06b6d4', tagBg: 'rgba(6, 182, 212, 0.1)', tagBorder: 'rgba(6, 182, 212, 0.2)', tagColor: '#67e8f9' },
  ],
  en: [
    { emoji: '👑', title: 'Subnet Owner', en: 'Subnet Owner', desc: 'The judge. Spends chips to investigate. Decides who gets punished. The final backstop keeping the game honest.', tags: ['Audit Miners', 'Pass Judgment', 'Guard the Rules'], color: '#6366f1', tagBg: 'rgba(99, 102, 241, 0.1)', tagBorder: 'rgba(99, 102, 241, 0.2)', tagColor: '#a5b4fc' },
    { emoji: '🔍', title: 'Validator', en: 'Validator', desc: 'The detective. Works with partial intel. Scores everyone. Files reports. Get it right and earn. Get it wrong and pay.', tags: ['Score & Rank', 'Call Out Bluffs', 'Earn Rewards'], color: '#a855f7', tagBg: 'rgba(168, 85, 247, 0.1)', tagBorder: 'rgba(168, 85, 247, 0.2)', tagColor: '#c4b5fd' },
    { emoji: '⛏️', title: 'Miner', en: 'Miner', desc: 'The wildcard. Every claim is a bet. Play it straight for steady income, or bluff big for the jackpot. Get caught, and it all burns.', tags: ['Stake Claims', 'Bluff or Fold', 'Risk It All'], color: '#06b6d4', tagBg: 'rgba(6, 182, 212, 0.1)', tagBorder: 'rgba(6, 182, 212, 0.2)', tagColor: '#67e8f9' },
  ],
};

/* ======================== */
/*  Canvas hooks            */
/* ======================== */
interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number; hue: number;
}

function useParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const timeRef = useRef(0);
  const rafRef = useRef(0);

  const initParticles = useCallback((width: number, height: number) => {
    const count = Math.min(120, Math.floor((width * height) / 8000));
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width, y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6,
        life: Math.random() * 200, maxLife: 200 + Math.random() * 200,
        size: Math.random() * 2 + 0.5, hue: 240 + Math.random() * 60,
      });
    }
    return particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particlesRef.current = initParticles(canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener('mousemove', handleMouse);

    const animate = () => {
      timeRef.current += 0.01;
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const particles = particlesRef.current;
      const mx = mouseRef.current.x, my = mouseRef.current.y, t = timeRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.life--;
        if (p.life <= 0) {
          const edge = Math.floor(Math.random() * 4);
          switch (edge) {
            case 0: p.x = Math.random() * width; p.y = -10; break;
            case 1: p.x = width + 10; p.y = Math.random() * height; break;
            case 2: p.x = Math.random() * width; p.y = height + 10; break;
            case 3: p.x = -10; p.y = Math.random() * height; break;
          }
          p.vx = (Math.random() - 0.5) * 0.6; p.vy = (Math.random() - 0.5) * 0.6;
          p.life = p.maxLife; p.hue = 240 + Math.random() * 60;
          continue;
        }
        const fa = Math.sin(p.y * 0.005 + t * 0.3) * 1.5 + Math.cos(p.x * 0.005 + t * 0.2) * 1.5;
        p.vx += Math.cos(fa) * 0.02; p.vy += Math.sin(fa) * 0.02;
        const dx = mx - p.x, dy = my - p.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) { const f = (150 - dist) / 150; p.vx -= (dx / dist) * f * 0.03; p.vy -= (dy / dist) * f * 0.03; }
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > 1.2) { p.vx = (p.vx / spd) * 1.2; p.vy = (p.vy / spd) * 1.2; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20) p.life = 0;
      }

      while (particles.length < 120) {
        particles.push({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, life: 200, maxLife: 200 + Math.random() * 200, size: Math.random() * 2 + 0.5, hue: 240 + Math.random() * 60 });
      }

      ctx.strokeStyle = 'rgba(99, 102, 241, 0.12)'; ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j], dx = a.x - b.x, dy = a.y - b.y, dist = dx * dx + dy * dy;
          if (dist < 10000) { ctx.globalAlpha = (1 - dist / 10000) * 0.15; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
      }
      for (const p of particles) {
        const alpha = Math.min(1, p.life / 60) * 0.7;
        ctx.globalAlpha = alpha; ctx.fillStyle = `hsla(${p.hue}, 70%, 65%, ${alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize); window.removeEventListener('mousemove', handleMouse); };
  }, [initParticles]);
  return canvasRef;
}

function useRevealOnScroll() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }); },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
    );
    document.querySelectorAll('.reveal-section, .stagger-children, .section-underline, .tab-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ======================== */
/*  Main                     */
/* ======================== */
export default function LandingPage() {
  const navigate = useNavigate();
  const canvasRef = useParticleCanvas();
  const [lang, setLang] = useState<Lang>('zh');
  useRevealOnScroll();

  const t = T[lang];
  const painPoints = PAIN_POINTS_DATA[lang];
  const products = PRODUCTS_DATA[lang];
  const funnelStages = FUNNEL_STAGES_DATA[lang];
  const pipelineSteps = PIPELINE_STEPS_DATA[lang];
  const phases = PHASES_DATA[lang];
  const ecoItems = ECO_DATA[lang];
  const innovations = INNOVATIONS_DATA[lang];
  const roles = ROLES_DATA[lang];

  return (
    <div className="landing-page min-h-screen">
      <div className="noise-overlay" />
      <canvas ref={canvasRef} className="particle-canvas" />
      <div className="aurora-bg" />
      <div className="grid-bg" />

      {/* ===== Lang Toggle ===== */}
      <div className="lang-toggle">
        <button
          className={`lang-btn ${lang === 'zh' ? 'active' : ''}`}
          onClick={() => setLang('zh')}
        >
          中文
        </button>
        <div className="lang-divider" />
        <button
          className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
          onClick={() => setLang('en')}
        >
          EN
        </button>
      </div>

      <div className="content-wrapper">
        {/* ===== HERO ===== */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20">
          <div className="ring-decoration fast" style={{ width: '300px', height: '300px', top: '15%', left: '10%', opacity: 0.3 }} />
          <div className="ring-decoration slow" style={{ width: '200px', height: '200px', top: '25%', right: '15%', opacity: 0.25 }} />
          <div className="ring-decoration fast" style={{ width: '400px', height: '400px', bottom: '20%', left: '50%', transform: 'translateX(-50%)', opacity: 0.15 }} />
          <div className="floating-orb purple" />
          <div className="floating-orb cyan" />
          <div className="floating-orb indigo" />
          <div className="floating-orb rose" />

          <div className="text-center z-10 animate-fade-in-up max-w-4xl">
            <div className="hero-line" />
            <div className="mb-4">
              <span className="hero-badge">{t.heroBadge1}</span>
              <span className="hero-badge" style={{ marginLeft: '0.75rem' }}>{t.heroBadge2}</span>
            </div>
            <h1 className="hero-title">暗流</h1>
            <p className="hero-subtitle gradient-text">Undercurrent</p>
            <p className="hero-tagline">{t.heroTagline}</p>
            <p className="hero-desc">
              {t.heroDesc}<br />{t.heroDesc2}
            </p>
            <div className="flex items-center justify-center gap-4 mt-10">
              <button onClick={() => navigate('/home')} className="cta-button group">
                {t.heroBtnDemo}
                <span className="inline-block transition-transform duration-300 ease-out-expo group-hover:translate-x-1">→</span>
              </button>
              <a href="#products" className="cta-outline">{t.heroBtnLearn}</a>
            </div>
            <p className="hero-version">{t.heroVersion}</p>
          </div>

          <div className="scroll-indicator">
            <div className="scroll-track"><div className="scroll-dot" /></div>
          </div>
        </section>

        {/* ===== PAIN POINTS ===== */}
        <section id="pain" className="section-wrapper">
          <div className="section-container max-w-5xl">
            <div className="reveal-section text-center mb-20">
              <div className="section-label">{t.labelProblem}</div>
              <h2 className="section-title">{t.painTitle}<span className="gradient-text">{t.painTitleHighlight}</span></h2>
              <p className="section-desc">{t.painDesc}</p>
            </div>
            <div className="stagger-children grid grid-cols-1 md:grid-cols-3 gap-6">
              {painPoints.map((item) => (
                <div key={item.label} className="pain-card">
                  <div className="pain-label">{item.label}</div>
                  <div className="pain-problem"><span className="pain-icon">✕</span> {item.problem}</div>
                  <div className="pain-divider" />
                  <div className="pain-ours"><span className="pain-icon-check">✓</span> {item.ours}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PRODUCTS ===== */}
        <section id="products" className="section-wrapper">
          <div className="section-container max-w-6xl">
            <div className="reveal-section text-center mb-20">
              <div className="section-label">{t.labelProducts}</div>
              <h2 className="section-title"><span className="section-underline gradient-text">{t.productTitle}</span></h2>
              <p className="section-desc">{t.productDesc}</p>
            </div>
            <div className="stagger-children grid grid-cols-1 md:grid-cols-3 gap-8">
              {products.map((prod) => (
                <div key={prod.title} className="product-card">
                  <div className="product-icon-wrap" style={{ borderColor: `${prod.color}30` }}><span className="product-icon">{prod.icon}</span></div>
                  <h3 className="product-title">{prod.title}</h3>
                  <p className="product-en">{prod.en}</p>
                  <p className="product-desc">{prod.desc}</p>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {prod.tags.map((tag) => (
                      <span key={tag} className="product-tag" style={{ borderColor: `${prod.color}30`, color: prod.color }}>{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="reveal-section reveal-scale mt-20">
              <div className="funnel-card">
                <h3 className="text-center text-xl font-bold mb-3" style={{ color: 'rgba(226, 232, 240, 0.9)' }}>{t.funnelTitle}</h3>
                <p className="text-center mb-10 text-sm" style={{ color: 'rgba(148, 163, 184, 0.55)' }}>{t.funnelDesc}</p>
                <div className="funnel-stages">
                  {funnelStages.map((s, i) => (
                    <div key={s.stage} className="funnel-stage">
                      <div className="funnel-num" style={{ color: s.accent }}>{s.stage}</div>
                      <div className="funnel-label">{s.label}</div>
                      <div className="funnel-detail">{s.detail}</div>
                      <div className="funnel-cost">{s.cost}</div>
                      {i < 3 && <div className="funnel-arrow">→</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== PIPELINE ===== */}
        <section className="section-wrapper">
          <div className="section-container max-w-5xl">
            <div className="reveal-section text-center mb-20">
              <div className="section-label">{t.labelHow}</div>
              <h2 className="section-title"><span className="section-underline gradient-text">{t.pipelineTitle}</span></h2>
              <p className="section-desc">{t.pipelineDesc}</p>
            </div>
            <div className="reveal-section reveal-scale">
              <div className="pipeline-wrap">
                {pipelineSteps.map((step, i) => (
                  <div key={step.phase} className="pipeline-step">
                    <div className="pipeline-phase">{step.phase}</div>
                    <div className="pipeline-label">{step.label}</div>
                    <div className="pipeline-detail">{step.detail}</div>
                    {i < pipelineSteps.length - 1 && <div className="pipeline-connector">▸</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="reveal-section mt-20">
              <div className="text-center mb-12">
                <h3 className="text-xl font-bold mb-2">{t.phaseSectionTitle}</h3>
                <p className="text-sm" style={{ color: 'rgba(148, 163, 184, 0.55)' }}>{t.phaseSectionMeta}</p>
              </div>
              <div className="phase-grid">
                {phases.map((ph) => (
                  <div key={ph.num} className="phase-item">
                    <div className="phase-num">{ph.num}</div>
                    <div className="phase-content">
                      <div className="phase-title">{ph.title}</div>
                      <div className="phase-role">{ph.role}</div>
                      <div className="phase-desc">{ph.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== ECOSYSTEM ===== */}
        <section className="section-wrapper">
          <div className="section-container max-w-5xl">
            <div className="reveal-section text-center mb-20">
              <div className="section-label">{t.labelEcosystem}</div>
              <h2 className="section-title">{t.ecosystemTitle}<span className="gradient-text">{t.ecosystemTitleHighlight}</span></h2>
              <p className="section-desc">{t.ecosystemDesc}</p>
            </div>
            <div className="stagger-children grid grid-cols-1 md:grid-cols-2 gap-6">
              {ecoItems.map((item, i) => (
                <div key={i} className="eco-card">
                  <div className="eco-dot" />
                  <div>
                    <h4 className="eco-title">{item.title}</h4>
                    <p className="eco-desc">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== INNOVATIONS ===== */}
        <section className="section-wrapper">
          <div className="section-container max-w-6xl">
            <div className="reveal-section text-center mb-20">
              <div className="section-label">{t.labelInnovations}</div>
              <h2 className="section-title"><span className="section-underline gradient-text">{t.innovationTitle}</span></h2>
            </div>
            <div className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {innovations.map((item) => (
                <div key={item.title} className="innovation-card">
                  <div className="innovation-tag">{item.tag}</div>
                  <div className="innovation-icon">{item.icon}</div>
                  <h4 className="innovation-title">{item.title}</h4>
                  <p className="innovation-desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== ROLES ===== */}
        <section className="section-wrapper">
          <div className="section-container max-w-5xl">
            <div className="reveal-section text-center mb-20">
              <div className="section-label">{t.labelRoles}</div>
              <h2 className="section-title">{t.rolesTitle}<span className="gradient-text">{t.rolesTitleHighlight}</span></h2>
            </div>
            <div className="stagger-children grid grid-cols-1 md:grid-cols-3 gap-8">
              {roles.map((role) => (
                <div key={role.title} className="role-card group">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="text-4xl">{role.emoji}</span>
                    <div className="w-px h-8 self-stretch" style={{ background: `${role.color}30` }} />
                  </div>
                  <h3 className="text-xl font-bold mb-1 gradient-text">{role.title}</h3>
                  <p className="text-sm mb-4" style={{ color: 'rgba(148, 163, 184, 0.5)' }}>{role.en}</p>
                  <p className="leading-relaxed mb-5" style={{ color: 'rgba(148, 163, 184, 0.8)', fontSize: '0.9375rem' }}>{role.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {role.tags.map((tag) => (
                      <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{ background: role.tagBg, border: `1px solid ${role.tagBorder}`, color: role.tagColor }}>{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== CTA ===== */}
        <section className="section-wrapper py-40">
          <div className="section-container max-w-3xl text-center">
            <div className="reveal-section">
              <h2 className="text-5xl md:text-6xl font-black mb-6" style={{ color: '#e2e8f0' }}>
                <span className="glitch-text" data-text={t.ctaTitle}>{t.ctaTitle}</span>
              </h2>
              <p className="text-lg md:text-xl mb-12" style={{ color: 'rgba(148, 163, 184, 0.7)' }}>{t.ctaDesc}</p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <button onClick={() => navigate('/home')} className="cta-button group">
                  <span>⚡</span> {t.ctaBtn}
                  <span className="inline-block transition-transform duration-300 ease-out-expo group-hover:translate-x-1">→</span>
                </button>
              </div>
              <p className="mt-8 text-sm" style={{ color: 'rgba(148, 163, 184, 0.3)' }}>{t.ctaFooter}</p>
            </div>
          </div>
        </section>

        <footer className="section-wrapper py-12 text-center">
          <p style={{ color: 'rgba(148, 163, 184, 0.2)', fontSize: '0.8125rem' }}>{t.footer}</p>
        </footer>
      </div>
    </div>
  );
}
