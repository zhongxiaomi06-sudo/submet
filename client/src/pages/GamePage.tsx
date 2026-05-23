import React, { useEffect } from 'react';
import TopBar from '../components/layout/TopBar';
import PlayerList from '../components/layout/PlayerList';
import EventLog from '../components/layout/EventLog';
import { useGameState } from '../hooks/useGameState';
import { connectSocket, getSocket } from '../socket/socketClient';

import DeclarationPhase from '../components/phases/DeclarationPhase';
import ScoringPhase from '../components/phases/ScoringPhase';
import AuditPhase from '../components/phases/AuditPhase';
import DistributionPhase from '../components/phases/DistributionPhase';
import TradingPhase from '../components/phases/TradingPhase';
import FinalRevealPhase from '../components/phases/FinalRevealPhase';
import FinalAuditPhase from '../components/phases/FinalAuditPhase';
import FinalVotePhase from '../components/phases/FinalVotePhase';
import SettlementPhase from '../components/phases/SettlementPhase';
import FinishedPhase from '../components/phases/FinishedPhase';

export default function GamePage() {
  const { phase, round } = useGameState();

  useEffect(() => {
    if (!getSocket().connected) connectSocket();
  }, []);

  const renderPhaseContent = () => {
    switch (phase) {
      case 'declaration':
        return <DeclarationPhase />;
      case 'scoring':
        return <ScoringPhase />;
      case 'audit':
        return <AuditPhase />;
      case 'distribution':
        return <DistributionPhase />;
      case 'trading':
        return <TradingPhase />;
      case 'final_reveal':
        return <FinalRevealPhase />;
      case 'final_audit':
        return <FinalAuditPhase />;
      case 'final_vote':
        return <FinalVotePhase />;
      case 'settlement':
        return <SettlementPhase />;
      case 'finished':
        return <FinishedPhase />;
      case 'lobby':
        return <div className="text-center text-gray-400">游戏即将开始...</div>;
      default:
        return (
          <div className="text-center">
            <p className="text-gray-400 text-lg mb-4">当前阶段: {phase}</p>
            <div className="animate-pulse flex space-x-4 justify-center">
              <div className="rounded-full bg-gray-700 h-10 w-10"></div>
              <div className="rounded-full bg-gray-700 h-10 w-10"></div>
              <div className="rounded-full bg-gray-700 h-10 w-10"></div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden">
      <TopBar />
      
      <main className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-gray-900 border-r border-gray-800">
          <PlayerList />
        </aside>

        <section className="flex-1 flex flex-col p-6 overflow-y-auto">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-blue-400 capitalize">
              {phase === 'settlement' || phase === 'finished' 
                ? '游戏结算' 
                : `第 ${round} 轮 - ${phase.replace('_', ' ')}`}
            </h2>
          </div>
          
          <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 p-8 flex items-start justify-center">
             {renderPhaseContent()}
          </div>
        </section>

        <aside className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
          <EventLog />
        </aside>
      </main>
    </div>
  );
}
