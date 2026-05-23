import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { emitStartGame } from '../socket/socketClient';

const ROLE_LABELS: Record<string, string> = {
  subnet_owner: '子网所有者',
  validator: '验证者',
  miner: '矿工',
};

const ROLE_EMOJIS: Record<string, string> = {
  subnet_owner: '👑',
  validator: '🔍',
  miner: '⛏️',
};

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const myPlayerId = useGameStore((state) => state.myPlayerId);
  const myRole = useGameStore((state) => state.myRole);
  const connected = useGameStore((state) => state.connected);
  const view = useGameStore((state) => state.view);
  const roleCounts = useGameStore((state) => state.roleCounts);
  const [copied, setCopied] = useState(false);

  const totalPlayers = view?.players?.length ?? 0;

  const handleStart = () => {
    emitStartGame();
    navigate(`/room/${roomId}/game`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h2 className="text-3xl font-bold mb-4">游戏准备中</h2>
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96">
        <div className="mb-4 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">房间 ID</p>
          <div className="flex items-center justify-center space-x-2">
            <p className="text-2xl font-mono text-blue-400 tracking-widest">{roomId}</p>
            <button
              onClick={handleCopy}
              className="px-2 py-1 text-[10px] bg-gray-700 hover:bg-gray-600 rounded transition"
            >
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        </div>

        <p className="mb-2 text-sm text-gray-400">
          我的名称: <span className="text-green-400 font-mono">{myPlayerId}</span>
        </p>
        <p className="mb-6 text-sm text-gray-400">
          我的角色: <span className="text-yellow-400 font-mono">{myRole ? `${ROLE_EMOJIS[myRole]} ${ROLE_LABELS[myRole]}` : '...'}</span>
        </p>

        <div className="mb-6">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">角色配额</h3>
          <div className="space-y-1">
            {roleCounts ? Object.entries(roleCounts).map(([role, counts]) => (
              <div key={role} className="flex justify-between items-center text-xs p-2 bg-gray-700/50 rounded">
                <span>{ROLE_EMOJIS[role]} {ROLE_LABELS[role]}</span>
                <span className="font-mono">
                  <span className={counts.filled >= counts.max ? 'text-red-400' : 'text-green-400'}>
                    {counts.filled}
                  </span>
                  <span className="text-gray-500">/{counts.max}</span>
                </span>
              </div>
            )) : (
              <p className="text-xs text-gray-600">加载中...</p>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            已加入玩家 ({totalPlayers}/7)
          </h3>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {view?.players?.length ? view.players.map((p) => (
              <li key={p.playerId} className="flex justify-between items-center bg-gray-700 p-2 rounded text-sm">
                <span className={p.playerId === myPlayerId ? 'text-blue-300' : ''}>
                  {p.playerId === myPlayerId ? '⭐ 你' : p.playerId.slice(0, 8)}
                </span>
                <span className="text-xs bg-gray-600 px-2 py-0.5 rounded text-gray-400">
                  {ROLE_EMOJIS[p.role]} {ROLE_LABELS[p.role]}
                </span>
              </li>
            )) : (
              <li className="text-gray-500 text-sm text-center py-2">等待玩家加入...</li>
            )}
          </ul>
        </div>

        {myRole === 'subnet_owner' && (
          <button
            onClick={handleStart}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded transition duration-200"
          >
            开始游戏 ({totalPlayers} 人 + {7 - totalPlayers} Bot)
          </button>
        )}

        {myRole !== 'subnet_owner' && (
          <p className="text-center text-gray-500 text-sm">等待所有者开始游戏...</p>
        )}

        <p className="mt-4 text-center text-[10px] text-gray-600">
          连接状态：{connected ? '已连接' : '未连接'}
        </p>
      </div>
    </div>
  );
}
