import React, { useEffect, useRef } from 'react';
import { useGameState } from '../../hooks/useGameState';

export default function EventLog() {
  const { view } = useGameState();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [view?.broadcastEvents]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">系统广播</h3>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm"
      >
        {view?.broadcastEvents.map((event, idx) => (
          <div key={idx} className="flex space-x-2">
            <span className="text-gray-600">[{new Date(event.timestamp).toLocaleTimeString()}]</span>
            <span className={getEventColor(event.type)}>{event.message}</span>
          </div>
        ))}
        {(!view?.broadcastEvents || view.broadcastEvents.length === 0) && (
          <div className="text-gray-600 italic">等待事件记录...</div>
        )}
      </div>
    </div>
  );
}

function getEventColor(type: string): string {
  switch (type) {
    case 'penalty': return 'text-red-400';
    case 'reward': return 'text-green-400';
    case 'phase': return 'text-blue-400';
    default: return 'text-gray-300';
  }
}
