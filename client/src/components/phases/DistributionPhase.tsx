import React from 'react';
import { useGameState } from '../../hooks/useGameState';

export default function DistributionPhase() {
  const { view } = useGameState();
  const dist = view?.roundDistribution;
  const miners = view?.players.filter(p => p.role === 'miner').sort((a, b) => (b.chips ?? 0) - (a.chips ?? 0)) || [];
  const validators = view?.players.filter(p => p.role === 'validator') || [];

  return (
    <div className="w-full max-w-4xl">
      <h3 className="text-2xl font-bold mb-6 text-center">本轮收益结算</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h4 className="text-blue-400 font-bold mb-4 flex items-center">
            <span className="mr-2">Miner</span> 收益排名
          </h4>
          <div className="space-y-3">
            {miners.map((p, idx) => {
              const reward = dist?.minerRewards?.[p.playerId];
              return (
                <div key={p.playerId} className="flex justify-between items-center p-3 bg-gray-900/50 rounded">
                  <div className="flex items-center">
                    <span className="w-6 h-6 flex items-center justify-center bg-gray-700 rounded-full text-xs mr-3">
                      {idx + 1}
                    </span>
                    <span className="font-medium">{p.playerId.slice(0, 8)}</span>
                  </div>
                  <span className="text-green-400 font-mono">
                    +{reward !== undefined ? reward.toFixed(2) : '--'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h4 className="text-purple-400 font-bold mb-4 flex items-center">
            <span className="mr-2">Validator</span> 收益
          </h4>
          <div className="space-y-3">
            {validators.map((p) => {
              const reward = dist?.validatorRewards?.[p.playerId];
              return (
                <div key={p.playerId} className="flex justify-between items-center p-3 bg-gray-900/50 rounded">
                  <span className="font-medium">{p.playerId.slice(0, 8)}</span>
                  <span className="text-green-400 font-mono">
                    +{reward !== undefined ? reward.toFixed(2) : '--'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-gray-500 italic">等待下一轮开始...</p>
      </div>
    </div>
  );
}
