import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

export default function HomePage() {
  const [playerName, setPlayerName] = useState('');
  const navigate = useNavigate();
  const setRoom = useGameStore((state) => state.setRoom);

  const handleJoin = () => {
    if (!playerName) return;
    const roomId = 'default-room';
    const playerId = playerName;
    const role = 'miner'; // 默认角色，实际应由后端分配或选择
    setRoom(roomId, playerId, role);
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8">《Subnet：暗流》</h1>
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96">
        <input
          type="text"
          placeholder="输入玩家名称"
          className="w-full p-3 mb-4 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <button
          onClick={handleJoin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition duration-200"
        >
          进入游戏
        </button>
      </div>
    </div>
  );
}
