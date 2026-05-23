import React, { useMemo, useState } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { defectTraitor, offerTraitorContract, respondTraitorContract, revealTraitor, sendChatMessage } from '../../socket/socketClient';

export default function TradingPhase() {
  const { myRole, view, sessionId, chatMessages, traitorContracts, myPlayerId } = useGameState();
  const [chatText, setChatText] = useState('');
  const [directTarget, setDirectTarget] = useState<string>('');

  const [contractTarget, setContractTarget] = useState<string>('');
  const [contractBribe, setContractBribe] = useState<number>(2);
  const [contractTask, setContractTask] = useState<string>('协助控制排名');

  const otherPlayers = useMemo(
    () => (view?.players ?? []).filter((p) => p.playerId !== myPlayerId),
    [view, myPlayerId],
  );
  const miners = useMemo(() => otherPlayers.filter((p) => p.role === 'miner'), [otherPlayers]);
  const myContracts = useMemo(
    () => traitorContracts.filter((c) => (myPlayerId ? c.targetId === myPlayerId || c.traitorId === myPlayerId : false)),
    [traitorContracts, myPlayerId],
  );

  const handleSendChat = (channel: 'public' | 'direct') => {
    if (!sessionId) return;
    const content = chatText.trim();
    if (!content) return;
    sendChatMessage(sessionId, { channel, toPlayerId: channel === 'direct' ? directTarget : undefined, content });
    setChatText('');
  };

  const handleOffer = () => {
    if (!sessionId) return;
    if (!contractTarget) return;
    offerTraitorContract(sessionId, { targetId: contractTarget, bribe: contractBribe, task: contractTask });
  };

  return (
    <div className="w-full max-w-5xl">
      <h3 className="text-2xl font-bold mb-6 text-center">契约交易阶段</h3>
      <p className="text-gray-400 text-center mb-8">公开聊天 + 私聊 + 叛徒契约（表单）</p>

      {myRole === 'miner' && view?.isTraitor && (
        <div className="bg-red-900/20 border border-red-800 p-6 rounded-xl mb-8 text-center">
          <h4 className="text-red-400 font-bold text-xl mb-2">你是叛徒！</h4>
          <p className="text-gray-300">你可以发起契约（贿赂 + 任务）收编其他矿工。</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-blue-400">聊天</h4>
            <span className="text-xs text-gray-400">支持公开/私聊</span>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-900/40 border border-gray-700 rounded-lg p-3 space-y-2 mb-4">
            {chatMessages.length === 0 && <div className="text-gray-500 text-sm">暂无消息</div>}
            {chatMessages.slice(-50).map((m) => (
              <div key={m.messageId} className="text-sm">
                <span className="text-gray-500 font-mono mr-2">[{new Date(m.timestamp).toLocaleTimeString()}]</span>
                <span className="text-gray-300 font-semibold mr-2">{m.fromPlayerId}</span>
                <span className="text-gray-500 mr-2">{m.channel === 'direct' ? `→ ${m.toPlayerId}` : ''}</span>
                <span className="text-gray-200">{m.content}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <textarea
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
              rows={2}
              placeholder="输入聊天内容"
            />
            <div className="flex flex-col md:flex-row gap-2">
              <button
                onClick={() => handleSendChat('public')}
                disabled={!sessionId}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 rounded transition"
              >
                发送公开消息
              </button>
              <div className="flex-1 flex gap-2">
                <select
                  value={directTarget}
                  onChange={(e) => setDirectTarget(e.target.value)}
                  className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="">选择私聊对象</option>
                  {otherPlayers.map((p) => (
                    <option key={p.playerId} value={p.playerId}>{p.playerId}</option>
                  ))}
                </select>
                <button
                  onClick={() => handleSendChat('direct')}
                  disabled={!sessionId || !directTarget}
                  className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-bold px-4 rounded transition"
                >
                  私聊
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h4 className="font-bold text-red-400 mb-4">叛徒契约</h4>

          {myRole === 'miner' && view?.isTraitor && (
            <div className="mb-6 bg-gray-900/40 border border-gray-700 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-3">发起契约（对单个矿工）</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <select
                  value={contractTarget}
                  onChange={(e) => setContractTarget(e.target.value)}
                  className="p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-red-500"
                >
                  <option value="">选择目标矿工</option>
                  {miners.map((p) => (
                    <option key={p.playerId} value={p.playerId}>{p.playerId}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={contractBribe}
                  min={0}
                  onChange={(e) => setContractBribe(Number(e.target.value))}
                  className="p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-red-500"
                  placeholder="贿赂金额"
                />
                <input
                  type="text"
                  value={contractTask}
                  onChange={(e) => setContractTask(e.target.value)}
                  className="p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-red-500"
                  placeholder="任务描述"
                />
              </div>
              <button
                onClick={handleOffer}
                disabled={!sessionId || !contractTarget}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2 rounded transition"
              >
                发起契约
              </button>
            </div>
          )}

          <div className="space-y-3">
            {myContracts.length === 0 && <div className="text-gray-500 text-sm">暂无契约</div>}
            {myContracts.map((c) => (
              <div key={c.offerId} className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-200">
                      {c.traitorId} → {c.targetId}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">贿赂: {c.bribe} | 任务: {c.task}</div>
                  </div>
                  <span className="text-xs text-gray-400">{c.state}</span>
                </div>

                {c.state === 'pending' && c.targetId === view?.myPlayerId && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => sessionId && respondTraitorContract(sessionId, { offerId: c.offerId, accept: true })}
                      disabled={!sessionId}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2 rounded"
                    >
                      接受
                    </button>
                    <button
                      onClick={() => sessionId && respondTraitorContract(sessionId, { offerId: c.offerId, accept: false })}
                      disabled={!sessionId}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-bold py-2 rounded"
                    >
                      拒绝
                    </button>
                  </div>
                )}

                {c.state === 'contracted' && c.targetId === view?.myPlayerId && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => sessionId && defectTraitor(sessionId, c.traitorId)}
                      disabled={!sessionId}
                      className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white font-bold py-2 rounded"
                    >
                      脱离叛徒
                    </button>
                    <button
                      onClick={() => sessionId && revealTraitor(sessionId, c.traitorId)}
                      disabled={!sessionId}
                      className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white font-bold py-2 rounded"
                    >
                      反叛揭露
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
