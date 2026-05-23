import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { useGameState } from '../../hooks/useGameState';
import { emitEvent } from '../../socket/socketClient';

export default function AuditPhase() {
  const { view, myRole } = useGameState();
  const { pendingAuditTargets, toggleAuditTarget } = useGameStore();

  const handleAudit = (aiLevel?: 'low' | 'mid' | 'high') => {
    emitEvent('execute_audit', { 
      minerIds: pendingAuditTargets,
      aiLevel
    });
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
          </button>
        ))}
      </div>

      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <h4 className="font-bold mb-4 text-purple-400">审计工具</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleAudit()}
            disabled={pendingAuditTargets.length === 0}
            className="p-4 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-left"
          >
            <div className="font-bold">常规审计 (1 筹码/人)</div>
            <div className="text-xs text-gray-400">直接揭示选中矿工本轮真实质量。</div>
          </button>
          <button
            onClick={() => handleAudit('low')}
            className="p-4 bg-purple-900/40 hover:bg-purple-800/40 border border-purple-700 rounded-lg text-left"
          >
            <div className="font-bold">AI 初级分析 (1 筹码)</div>
            <div className="text-xs text-gray-400">标记 1 名可疑矿工。</div>
          </button>
        </div>
      </div>
    </div>
  );
}
