import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, getSocket } from '../socket/socketClient';
import { useGameStore } from '../store/gameStore';
import type { RoleId } from '../../../shared/types/game';

const ROLE_OPTIONS: Array<{ value: RoleId; label: string; emoji: string; desc: string }> = [
  { value: 'subnet_owner', label: '子网所有者', emoji: '👑', desc: '裁判 · 审计矿工' },
  { value: 'validator', label: '验证者', emoji: '🔍', desc: '侦探 · 打分+举报' },
  { value: 'miner', label: '矿工', emoji: '⛏️', desc: '声明质量 · 虚报与否' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<RoleId>('subnet_owner');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const navigateToRoom = (roomId: string) => {
    connectSocket();
    const sock = getSocket();
    sock.removeAllListeners('connect');
    sock.removeAllListeners('room:joined');
    sock.removeAllListeners('error');

    const cleanup = () => {
      sock.off('connect', onConnect);
      sock.off('room:joined', onJoined);
      sock.off('error', onError);
    };

    const onConnect = () => {
      getSocket().emit('room:join', { roomId, preferredRole: selectedRole });
    };

    const onJoined = ({ playerId, role }: { playerId: string; role: RoleId }) => {
      useGameStore.getState().setRoom(roomId, playerId, role);
      cleanup();
      navigate(`/room/${roomId}`);
    };

    const onError = ({ message }: { message: string }) => {
      cleanup();
      setError(message);
      setConnecting(false);
    };

    sock.on('connect', onConnect);
    sock.on('room:joined', onJoined);
    sock.on('error', onError);

    if (sock.connected) onConnect();
  };

  const handleCreateRoom = async () => {
    setConnecting(true);
    setError('');
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const { roomId } = await res.json();
      navigateToRoom(roomId);
    } catch {
      setError('无法连接服务器，请确认后端已启动 (:3001)');
      setConnecting(false);
    }
  };

  const handleJoinRoom = () => {
    const id = joinRoomId.trim().toLowerCase();
    if (!id) {
      setError('请输入房间号');
      return;
    }
    setConnecting(true);
    setError('');
    navigateToRoom(id);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-2">《Subnet：暗流》</h1>
      <p className="text-gray-400 mb-8">DEMO v3.0 · V4.3 修订版</p>

      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-[440px] mb-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 text-center">选择你的角色</h3>
        <div className="grid grid-cols-3 gap-3">
          {ROLE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedRole(opt.value)}
              className={`p-3 rounded-lg border-2 text-center transition-all ${
                selectedRole === opt.value
                  ? 'border-blue-500 bg-blue-900/30 scale-105'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
              }`}
            >
              <div className="text-2xl mb-1">{opt.emoji}</div>
              <div className="text-xs font-semibold">{opt.label}</div>
              <div className="text-xs text-gray-500 mt-0.5 leading-tight">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96">
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setMode('create')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              mode === 'create' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            创建新房间
          </button>
          <button
            onClick={() => setMode('join')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              mode === 'join' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            加入已有房间
          </button>
        </div>

        {mode === 'create' ? (
          <button
            onClick={handleCreateRoom}
            disabled={connecting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded transition duration-200 disabled:opacity-50"
          >
            {connecting ? '连接中...' : `创建房间（以${ROLE_OPTIONS.find((r) => r.value === selectedRole)?.label}身份）`}
          </button>
        ) : (
          <div>
            <input
              type="text"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              placeholder="输入房间号..."
              maxLength={12}
              className="w-full p-3 mb-3 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 text-center text-lg font-mono tracking-widest placeholder-gray-500"
            />
            <button
              onClick={handleJoinRoom}
              disabled={connecting || !joinRoomId.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded transition duration-200 disabled:opacity-50"
            >
              {connecting ? '连接中...' : `加入房间（以${ROLE_OPTIONS.find((r) => r.value === selectedRole)?.label}身份）`}
            </button>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400 text-center">{error}</p>}
      </div>

      <p className="mt-6 text-sm text-gray-500">不足 7 人由 AI Bot 补齐 · 多开 Tab = 多玩家</p>
    </div>
  );
}
