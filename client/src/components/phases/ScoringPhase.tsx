import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { useGameState } from '../../hooks/useGameState';
import { emitEvent } from '../../socket/socketClient';

export default function ScoringPhase() {
  const { view, myRole } = useGameState();
  const { pendingScores, setPendingScore, pendingReports, toggleReport } = useGameStore();

  const handleSubmit = () => {
    emitEvent('submit_scores', { 
      scores: pendingScores, 
      reports: pendingReports 
    });
  };

  if (myRole !== 'validator') {
    return (
      <div className="text-center">
        <p className="text-xl text-gray-400">验证者正在评分和举报，请稍候...</p>
      </div>
    );
  }

  const miners = view?.players.filter(p => p.role === 'miner') || [];

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-8 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
        <h4 className="text-blue-400 font-bold mb-1">本轮线索</h4>
        <p className="text-gray-300">{view?.validatorClue || '正在生成线索...'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {miners.map((miner) => (
          <div key={miner.playerId} className="bg-gray-800 p-5 rounded-xl border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-lg">{miner.playerId}</span>
              <button
                onClick={() => toggleReport(miner.playerId)}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  pendingReports.includes(miner.playerId)
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {pendingReports.includes(miner.playerId) ? '已标记举报' : '举报虚报'}
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">评分 (0-100)</span>
                <span className="text-blue-400 font-mono">{pendingScores[miner.playerId] || 0}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={pendingScores[miner.playerId] || 0}
                onChange={(e) => setPendingScore(miner.playerId, parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          className="px-12 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg transition"
        >
          提交评分与举报
        </button>
      </div>
    </div>
  );
}
