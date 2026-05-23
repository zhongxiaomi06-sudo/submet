import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { useGameState } from '../../hooks/useGameState';
import { emitScores } from '../../socket/socketClient';

export default function ScoringPhase() {
  const { view, myRole, sessionId } = useGameState();
  const pendingScores = useGameStore((state) => state.pendingScores);
  const setPendingScore = useGameStore((state) => state.setPendingScore);
  const pendingReports = useGameStore((state) => state.pendingReports);
  const toggleReport = useGameStore((state) => state.toggleReport);
  const resetPending = useGameStore((state) => state.resetPending);

  const handleSubmit = () => {
    emitScores(pendingScores, pendingReports);
    resetPending();
  };

  if (myRole !== 'validator') {
    return (
      <div className="text-center">
        <p className="text-xl text-gray-400">验证者正在评分和举报，请稍候...</p>
      </div>
    );
  }

  const miners = view?.players.filter((p) => p.role === 'miner') ?? [];
  const scoreValues = miners.map((m) => pendingScores[m.playerId] ?? 50);
  const uniqueScoreCount = new Set(scoreValues).size;
  const hasZeroVariance = miners.length >= 2 && uniqueScoreCount === 1;

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-8 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
        <h4 className="text-blue-400 font-bold mb-1">本轮线索</h4>
        <p className="text-gray-300">{view?.validatorClue || '正在生成线索...'}</p>
      </div>

      {hasZeroVariance && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg">
          <div className="text-red-400 font-bold mb-1">评分不合法</div>
          <div className="text-gray-300 text-sm">所有矿工评分完全相同会导致本轮分配资格被剥夺。</div>
        </div>
      )}

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
                <span className="text-gray-400">评分 (1-100)</span>
                <span className="text-blue-400 font-mono">{pendingScores[miner.playerId] ?? 50}</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={pendingScores[miner.playerId] ?? 50}
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
          disabled={hasZeroVariance}
          className="px-12 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg shadow-lg transition"
        >
          提交评分与举报
        </button>
      </div>
    </div>
  );
}
