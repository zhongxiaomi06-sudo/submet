import React, { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useGameState } from '../../hooks/useGameState';
import { finalDeepAudit, kickPlayers } from '../../socket/socketClient';

export default function FinalAuditPhase() {
  const { view, myRole, sessionId } = useGameState();
  const pendingAuditTargets = useGameStore((state) => state.pendingAuditTargets);
  const toggleAuditTarget = useGameStore((state) => state.toggleAuditTarget);
  const resetPending = useGameStore((state) => state.resetPending);

  const [kickReason, setKickReason] = useState('终局深度审计证实违规');
  const [kickSelection, setKickSelection] = useState<string[]>([]);

  const miners = useMemo(() => view?.players.filter((p) => p.role === 'miner') ?? [], [view]);

  const handleFinalDeepAudit = () => {
    if (!sessionId) return;
    finalDeepAudit(sessionId, pendingAuditTargets);
    resetPending();
  };

  const toggleKick = (playerId: string) => {
    setKickSelection((prev) => (prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]));
  };

  const handleKick = () => {
    if (!sessionId) return;
    if (kickSelection.length === 0) return;
    kickPlayers(sessionId, kickSelection, kickReason);
    setKickSelection([]);
  };

  if (myRole !== 'subnet_owner') {
    return (
      <div className="w-full max-w-3xl">
        <h3 className="text-2xl font-bold mb-4 text-center">终局深度审计</h3>
        <p className="text-center text-gray-400 mb-8">等待子网所有者执行终局深度审计与踢出操作...</p>
        {view?.kickedPlayers && view.kickedPlayers.length > 0 && (
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h4 className="font-bold text-red-400 mb-4">已踢出玩家</h4>
            <div className="space-y-2">
              {view.kickedPlayers.map((k) => (
                <div key={k.playerId} className="flex justify-between bg-gray-900/40 border border-gray-800 rounded p-3">
                  <span className="font-semibold">{k.playerId}</span>
                  <span className="text-gray-400 text-sm">{k.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl">
      <h3 className="text-2xl font-bold mb-6 text-center">终局深度审计（可选）</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h4 className="font-bold text-purple-400 mb-4">选择深审目标</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {miners.map((m) => (
              <button
                key={m.playerId}
                onClick={() => toggleAuditTarget(m.playerId)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  pendingAuditTargets.includes(m.playerId)
                    ? 'bg-purple-900/30 border-purple-500'
                    : 'bg-gray-900/40 border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="font-bold">{m.playerId}</div>
              </button>
            ))}
          </div>
          <button
            onClick={handleFinalDeepAudit}
            disabled={!sessionId || pendingAuditTargets.length === 0}
            className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-bold py-3 rounded"
          >
            执行终局深审
          </button>

          {view?.auditResults && view.auditResults.length > 0 && (
            <div className="mt-6 space-y-2">
              {view.auditResults.map((r) => (
                <div key={r.minerId} className="flex justify-between bg-gray-900/40 border border-gray-800 rounded p-3">
                  <span className="font-semibold">{r.minerId}</span>
                  <span className={r.isCheat ? 'text-red-400' : 'text-green-400'}>
                    {r.isCheat ? `虚报（真:${r.trueQuality}）-罚:${r.penaltyAmount}` : '诚实'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h4 className="font-bold text-red-400 mb-4">踢出玩家（可选）</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {(view?.players ?? []).filter((p) => p.isAlive).map((p) => (
              <button
                key={p.playerId}
                onClick={() => toggleKick(p.playerId)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  kickSelection.includes(p.playerId)
                    ? 'bg-red-900/20 border-red-500'
                    : 'bg-gray-900/40 border-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="font-bold">{p.playerId}</div>
                <div className="text-xs text-gray-500">{p.role}</div>
              </button>
            ))}
          </div>

          <input
            value={kickReason}
            onChange={(e) => setKickReason(e.target.value)}
            className="w-full p-3 mb-3 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-red-500"
            placeholder="踢出原因"
          />

          <button
            onClick={handleKick}
            disabled={!sessionId || kickSelection.length === 0}
            className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded"
          >
            确认踢出
          </button>
        </div>
      </div>
    </div>
  );
}

