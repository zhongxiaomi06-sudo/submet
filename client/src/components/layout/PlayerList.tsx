import React from 'react';
import { useGameState } from '../../hooks/useGameState';

export default function PlayerList() {
  const { view, myPlayerId } = useGameState();

  return (
    <div className="p-4">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">存活玩家</h3>
      <div className="space-y-2">
        {view?.players.map((p) => (
          <div
            key={p.playerId}
            className={`p-3 rounded-lg border ${
              p.playerId === myPlayerId
                ? 'bg-blue-900/20 border-blue-800'
                : 'bg-gray-800/50 border-gray-800'
            }`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className={`font-medium ${p.playerId === myPlayerId ? 'text-blue-300' : 'text-gray-300'}`}>
                {p.playerId}
              </span>
              <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded uppercase">
                {p.role.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                筹码: {p.playerId === myPlayerId ? (view?.myChips ?? 0) : '—'}
              </span>
              {p.traitorState !== 'normal' && (
                <span className="text-[10px] text-red-400">● 契约中</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
