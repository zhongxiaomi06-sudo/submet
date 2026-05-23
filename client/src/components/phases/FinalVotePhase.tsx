import React from 'react';
import { useGameState } from '../../hooks/useGameState';
import { emitVote } from '../../socket/socketClient';

export default function FinalVotePhase() {
  const { view, myRole, sessionId } = useGameState();

  const handleVote = (vote: 'for' | 'against') => {
    emitVote(vote);
  };

  return (
    <div className="max-w-2xl w-full text-center">
      <h3 className="text-3xl font-bold mb-4 text-purple-400">最终表决</h3>
      <p className="text-gray-400 mb-8">
        是否通过《暗流契约》进行最终分账？
        <br />
        通过需要 2/3 赞成票。
      </p>

      <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 mb-8">
        <div className="flex justify-around items-center">
          <button
            onClick={() => handleVote('for')}
            disabled={!sessionId}
            className="group flex flex-col items-center disabled:opacity-50"
          >
            <div className="w-20 h-20 bg-green-600 group-hover:bg-green-500 rounded-full flex items-center justify-center text-4xl mb-2 transition">
              👍
            </div>
            <span className="font-bold text-green-400">赞成</span>
          </button>

          <div className="h-16 w-px bg-gray-700" />

          <button
            onClick={() => handleVote('against')}
            disabled={!sessionId}
            className="group flex flex-col items-center disabled:opacity-50"
          >
            <div className="w-20 h-20 bg-red-600 group-hover:bg-red-500 rounded-full flex items-center justify-center text-4xl mb-2 transition">
              👎
            </div>
            <span className="font-bold text-red-400">反对</span>
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-500">
        你的角色权重: <span className="text-blue-400 font-bold">{myRole === 'subnet_owner' ? view?.ownerVoteWeight : 1.0}</span>
      </div>
    </div>
  );
}
