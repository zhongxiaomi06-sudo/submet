import React from 'react';
import { useGameState } from '../../hooks/useGameState';

export default function DistributionPhase() {
  const { view } = useGameState();

  return (
    <div className="w-full max-w-4xl">
      <h3 className="text-2xl font-bold mb-6 text-center">本轮收益结算</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 矿工收益 */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h4 className="text-blue-400 font-bold mb-4 flex items-center">
             <span className="mr-2">Miner</span> 收益排名
          </h4>
          <div className="space-y-3">
             {view?.players.filter(p => p.role === 'miner').map((p, idx) => (
               <div key={p.playerId} className="flex justify-between items-center p-3 bg-gray-900/50 rounded">
                 <div className="flex items-center">
                   <span className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded-full text-xs mr-3">{idx + 1}</span>
                   <span className="font-medium">{p.playerId}</span>
                 </div>
                 <span className="text-green-400 font-mono">+{/* 实际应从 eventLog 或 view 扩展字段获取轮次收益 */}--</span>
               </div>
             ))}
          </div>
        </div>

        {/* 验证者收益 */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h4 className="text-purple-400 font-bold mb-4 flex items-center">
             <span className="mr-2">Validator</span> 收益
          </h4>
          <div className="space-y-3">
             {view?.players.filter(p => p.role === 'validator').map((p) => (
               <div key={p.playerId} className="flex justify-between items-center p-3 bg-gray-900/50 rounded">
                 <span className="font-medium">{p.playerId}</span>
                 <span className="text-green-400 font-mono">+{/* 实际收益 */}--</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-gray-500 italic">等待下一轮开始...</p>
      </div>
    </div>
  );
}
