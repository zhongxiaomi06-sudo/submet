import React from 'react';
import { useGameState } from '../../hooks/useGameState';
import { emitRecruit } from '../../socket/socketClient';

export default function TradingPhase() {
  const { myRole, view } = useGameState();

  const handleRecruit = (targetId: string) => {
    emitRecruit(targetId, 2, '');
  };

  return (
    <div className="w-full max-w-4xl">
      <h3 className="text-2xl font-bold mb-6 text-center">契约交易阶段</h3>
      <p className="text-gray-400 text-center mb-8">
        当前叛徒基金: <span className="text-red-400 font-bold">{view?.taotaoPool}</span> (筹码)
      </p>

      {myRole === 'miner' && view?.isTraitor && (
        <div className="bg-red-900/20 border border-red-800 p-6 rounded-xl mb-8 text-center">
          <h4 className="text-red-400 font-bold text-xl mb-2">你是叛徒！</h4>
          <p className="text-gray-300">你可以尝试招募其他矿工加入你的阵营。</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {view?.players.filter(p => p.role === 'miner' && p.playerId !== view.myPlayerId).map(p => (
          <div key={p.playerId} className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex justify-between items-center">
            <div>
              <div className="font-bold text-lg">{p.playerId}</div>
              <div className="text-sm text-gray-500">状态: {p.traitorState}</div>
            </div>
            {myRole === 'miner' && view?.isTraitor && p.traitorState === 'normal' && (
              <button
                onClick={() => handleRecruit(p.playerId)}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition"
              >
                尝试招募
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
