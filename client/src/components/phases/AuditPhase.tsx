import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useGameState } from '../../hooks/useGameState';
import { emitAudit, emitAIAnalysis } from '../../socket/socketClient';

export default function AuditPhase() {
  const { view, myRole } = useGameState();
  const { pendingAuditTargets, toggleAuditTarget } = useGameStore();
  const [auditDepth, setAuditDepth] = useState<'shallow' | 'deep'>('shallow');
  const aiRiskScores = view?.aiRiskScores;

  const costPerMiner = auditDepth === 'deep' ? 3 : 1;
  const totalCost = pendingAuditTargets.length * costPerMiner;

  const handleAudit = () => {
    if (pendingAuditTargets.length > 0) {
      emitAudit(pendingAuditTargets, auditDepth);
    }
  };

  const handleAI = (level: 'low' | 'mid' | 'high') => {
    emitAIAnalysis(level, false);
  };

  if (myRole !== 'subnet_owner') {
    return (
      <div className="text-center">
        <p className="text-xl text-gray-400">子网所有者正在进行审计，请稍候...</p>
        {view?.auditResults && view.auditResults.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 max-w-md mx-auto">
             {view.auditResults.map(res => (
               <div key={res.minerId} className="bg-gray-800 p-3 rounded border border-gray-700 flex justify-between">
                 <span>{res.minerId}</span>
                 <span className={res.isCheat ? 'text-red-400' : 'text-green-400'}>
                   {res.isCheat ? `虚报 (真:${res.trueQuality})` : '诚实'}
                 </span>
               </div>
             ))}
          </div>
        )}
      </div>
    );
  }

  const miners = view?.players.filter(p => p.role === 'miner') || [];

  return (
    <div className="w-full max-w-4xl">
      <h3 className="text-2xl font-bold mb-6 text-center">选择审计目标</h3>

      <div className="flex justify-center space-x-4 mb-6">
        <button
          onClick={() => setAuditDepth('shallow')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
            auditDepth === 'shallow' ? 'bg-blue-600 text-white' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-500'
          }`}
        >
          浅审计 (1筹) — 仅揭示质量
        </button>
        <button
          onClick={() => setAuditDepth('deep')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition ${
            auditDepth === 'deep' ? 'bg-red-600 text-white' : 'bg-gray-800 border border-gray-700 text-gray-400 hover:border-gray-500'
          }`}
        >
          深审计 (3筹) — 揭示 + 罚款
        </button>
      </div>

      {aiRiskScores && Object.keys(aiRiskScores).length > 0 && (
        <div className="bg-purple-900/20 border border-purple-800 p-4 rounded-lg mb-6">
          <p className="text-xs text-purple-400 font-bold uppercase tracking-wider mb-3">AI 风险评分（仅供参考，不参与最终裁判）</p>
          <div className="space-y-2">
            {Object.entries(aiRiskScores).map(([minerId, score]) => (
              <div key={minerId} className="flex justify-between items-center text-xs">
                <span className="text-gray-400">{minerId.slice(0, 8)}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${score > 60 ? 'bg-red-500' : score > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className={`font-mono w-10 text-right ${score > 60 ? 'text-red-400' : score > 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {miners.map((miner) => (
          <button
            key={miner.playerId}
            onClick={() => toggleAuditTarget(miner.playerId)}
            className={`p-4 rounded-xl border-2 transition-all ${
              pendingAuditTargets.includes(miner.playerId)
                ? 'bg-purple-900/30 border-purple-500 scale-105'
                : 'bg-gray-800 border-gray-700 hover:border-gray-500'
            }`}
          >
            <div className="text-lg font-bold mb-1">{miner.playerId}</div>
            <div className="text-xs text-gray-500">筹码: {miner.chips}</div>
            {aiRiskScores?.[miner.playerId] !== undefined && (
              <div className={`text-xs mt-1 font-mono ${aiRiskScores[miner.playerId] > 60 ? 'text-red-400' : 'text-yellow-400'}`}>
                风险 {aiRiskScores[miner.playerId]}%
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h4 className="font-bold mb-4 text-purple-400">审计工具</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleAudit()}
            disabled={pendingAuditTargets.length === 0}
            className={`p-4 rounded-lg text-left transition ${
              pendingAuditTargets.length === 0
                ? 'bg-gray-700 opacity-50 cursor-not-allowed'
                : auditDepth === 'deep' ? 'bg-red-900/40 hover:bg-red-800/40 border border-red-700' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            <div className="font-bold">{auditDepth === 'deep' ? '🔍 深度审计' : '👁 浅审计'}</div>
            <div className="text-xs text-gray-400">
              {auditDepth === 'shallow' ? '揭示选中矿工本轮真实质量，不执行罚款。' : '揭示真实质量 + 证实虚报则罚款 3 筹码。'}
            </div>
            <div className="text-xs text-gray-500 mt-1">选中 {pendingAuditTargets.length} 人，共 {totalCost} 筹码</div>
          </button>
          {!aiRiskScores && (
            <button
              onClick={() => handleAI('low')}
              className="p-4 bg-purple-900/40 hover:bg-purple-800/40 border border-purple-700 rounded-lg text-left"
            >
              <div className="font-bold">AI 初级分析 (1 筹码)</div>
              <div className="text-xs text-gray-400">输出各矿工虚报风险评分 (0-100)。整局限 1 次。</div>
            </button>
          )}
          {!aiRiskScores && (
            <button
              onClick={() => handleAI('mid')}
              className="p-4 bg-purple-900/40 hover:bg-purple-800/40 border border-purple-700 rounded-lg text-left"
            >
              <div className="font-bold">AI 进阶分析 (3 筹码)</div>
              <div className="text-xs text-gray-400">更高精度的风险评分。</div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
