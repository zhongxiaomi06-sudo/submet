import React from 'react';
import { useGameState } from '../../hooks/useGameState';

export default function FinishedPhase() {
  const { view } = useGameState();

  return (
    <div className="w-full max-w-3xl text-center">
      <h3 className="text-3xl font-bold mb-4 text-green-400">对局已结束</h3>
      <p className="text-gray-400 mb-10">你可以查看结算页或返回大厅开始新对局。</p>

      {view?.settlement && (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 text-left">
          <div className="font-bold text-gray-200 mb-4">结算概览</div>
          <div className="space-y-2">
            {view.settlement.rankings.slice(0, 3).map((r) => (
              <div key={r.playerId} className="flex justify-between bg-gray-900/40 border border-gray-800 rounded p-3">
                <span className="font-semibold">{r.rank}. {r.playerId}</span>
                <span className="text-orange-400 font-mono">+{r.taotaoShare}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <button
          onClick={() => window.location.href = '/'}
          className="px-10 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition"
        >
          返回大厅
        </button>
      </div>
    </div>
  );
}

