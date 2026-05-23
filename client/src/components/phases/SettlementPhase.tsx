import React from 'react';
import { useGameState } from '../../hooks/useGameState';

export default function SettlementPhase() {
  const { view } = useGameState();
  const settlement = view?.settlement;

  return (
    <div className="w-full max-w-4xl">
      <h3 className="text-3xl font-bold mb-2 text-center text-green-400">游戏结束</h3>
      <p className="text-center text-gray-400 mb-8">
        {settlement?.contractPassed ? '《暗流契约》已通过' : '《暗流契约》被否决'}
      </p>

      <div className="space-y-4">
        {settlement?.rankings.map((res) => (
          <div 
            key={res.playerId} 
            className={`p-4 rounded-xl border flex items-center justify-between ${
              res.rank === 1 ? 'bg-yellow-900/20 border-yellow-500' : 'bg-gray-800 border-gray-700'
            }`}
          >
            <div className="flex items-center">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-4 ${
                res.rank === 1 ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-300'
              }`}>
                {res.rank}
              </span>
              <div>
                <div className="font-bold">{res.playerId}</div>
                <div className="text-xs text-gray-500 uppercase">{res.role}</div>
              </div>
            </div>

            <div className="flex space-x-8 text-right">
              <div>
                <div className="text-[10px] text-gray-500 uppercase">最终筹码</div>
                <div className="font-mono font-bold text-blue-400">{res.finalChips}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase">TAO 收益</div>
                <div className="font-mono font-bold text-orange-400">+{res.taotaoShare}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <button
          onClick={() => window.location.href = '/'}
          className="px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition"
        >
          返回大厅
        </button>
      </div>
    </div>
  );
}
