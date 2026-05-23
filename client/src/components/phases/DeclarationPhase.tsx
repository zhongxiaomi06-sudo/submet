import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { useGameState } from '../../hooks/useGameState';
import { emitDeclaration } from '../../socket/socketClient';

export default function DeclarationPhase() {
  const { view, myRole, sessionId } = useGameState();
  const selectedStars = useGameStore((state) => state.selectedStars);
  const setSelectedStars = useGameStore((state) => state.setSelectedStars);
  const resetPending = useGameStore((state) => state.resetPending);

  const handleSubmit = () => {
    emitDeclaration(selectedStars);
    resetPending();
  };

  if (myRole !== 'miner') {
    return (
      <div className="text-center">
        <p className="text-xl text-gray-400">矿工正在申报质量，请稍候...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full">
      <h3 className="text-2xl font-bold mb-6 text-center">申报本轮质量</h3>
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-6">
        <p className="text-gray-400 mb-4">你的真实质量为: <span className="text-blue-400 font-bold text-2xl">{view?.myTrueQuality}</span> 星</p>
        <div className="flex justify-between mb-8">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setSelectedStars(n)}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                selectedStars === n
                  ? 'bg-blue-600 border-blue-400 scale-110'
                  : 'bg-gray-700 border-gray-600 hover:border-gray-400'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500 mb-6">
          提示：虚报（申报 {'>'} 真实）可能获得更高收益，但面临被审计罚款的风险。
        </p>
        <button
          onClick={handleSubmit}
          disabled={selectedStars === 0}
          className={`w-full py-3 rounded-lg font-bold transition ${
            selectedStars === 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          确认提交
        </button>
      </div>
    </div>
  );
}
