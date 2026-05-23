import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const myPlayerId = useGameStore((state) => state.myPlayerId);
  const myRole = useGameStore((state) => state.myRole);

  const handleStart = () => {
    navigate(`/room/${roomId}/game`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h2 className="text-3xl font-bold mb-4">游戏准备中</h2>
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96">
        <p className="mb-2">房间 ID: <span className="text-blue-400">{roomId}</span></p>
        <p className="mb-2">我的名称: <span className="text-green-400">{myPlayerId}</span></p>
        <p className="mb-6">我的角色: <span className="text-yellow-400">{myRole}</span></p>
        
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-2">玩家列表</h3>
          <ul className="space-y-1">
            <li className="flex justify-between items-center bg-gray-700 p-2 rounded">
              <span>{myPlayerId} (你)</span>
              <span className="text-xs bg-green-600 px-2 py-1 rounded">就绪</span>
            </li>
          </ul>
        </div>

        <button
          onClick={handleStart}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded transition duration-200"
        >
          开始游戏
        </button>
      </div>
    </div>
  );
}
