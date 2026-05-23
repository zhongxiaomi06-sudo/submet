import React from 'react';
import { useGameState } from '../../hooks/useGameState';

export default function TopBar() {
  const { view, connected } = useGameState();

  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          《Subnet：暗流》
        </h1>
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
        <span className="text-xs text-gray-400">{connected ? '已连接' : '未连接'}</span>
      </div>

      <div className="flex items-center space-x-8">
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">公共池</span>
          <span className="text-yellow-500 font-mono font-bold">{view?.publicPool ?? 0}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">淘淘池</span>
          <span className="text-orange-500 font-mono font-bold">{view?.taotaoPool ?? 0}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">我的筹码</span>
          <span className="text-green-500 font-mono font-bold">{view?.myChips ?? 0}</span>
        </div>
        <div className="bg-gray-800 px-4 py-1 rounded-full border border-gray-700">
          <span className="text-blue-400 font-mono text-sm">{view?.remainingSeconds ?? 0}s</span>
        </div>
      </div>
    </header>
  );
}
