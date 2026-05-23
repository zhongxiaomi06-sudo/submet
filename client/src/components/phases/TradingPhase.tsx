import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGameState } from '../../hooks/useGameState';
import { defectTraitor, getSocket, offerTraitorContract, respondTraitorContract, revealTraitor, sendChatMessage } from '../../socket/socketClient';

export default function TradingPhase() {
  const { myRole, view, sessionId, chatMessages, traitorContracts, myPlayerId } = useGameState();
  const [chatText, setChatText] = useState('');
  const [directTarget, setDirectTarget] = useState<string>('');

  const [voiceJoined, setVoiceJoined] = useState(false);
  const voiceJoinedRef = useRef(false);
  const [voiceParticipants, setVoiceParticipants] = useState<string[]>([]);
  const [voiceError, setVoiceError] = useState('');
  const [remoteStreams, setRemoteStreams] = useState<Array<{ playerId: string; stream: MediaStream }>>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const negotiatedRef = useRef<Set<string>>(new Set());

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

  const closeVoice = () => {
    for (const pc of Object.values(peerConnectionsRef.current)) {
      pc.close();
    }
    peerConnectionsRef.current = {};
    negotiatedRef.current = new Set();
    for (const t of localStreamRef.current?.getTracks() ?? []) {
      t.stop();
    }
    localStreamRef.current = null;
    setRemoteStreams([]);
    setVoiceParticipants([]);
    setVoiceJoined(false);
  };

  const ensurePeerConnection = (peerId: string): RTCPeerConnection => {
    const existing = peerConnectionsRef.current[peerId];
    if (existing) return existing;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const local = localStreamRef.current;
    if (local) {
      for (const track of local.getTracks()) {
        pc.addTrack(track, local);
      }
    }

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      getSocket().emit('voice:signal', {
        to: peerId,
        data: { type: 'ice', candidate: ev.candidate },
      });
    };

    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      if (!stream) return;
      setRemoteStreams((prev) => {
        const existing = prev.find((s) => s.playerId === peerId);
        if (existing) return prev;
        return [...prev, { playerId: peerId, stream }];
      });
    };

    peerConnectionsRef.current[peerId] = pc;
    return pc;
  };

  useEffect(() => {
    voiceJoinedRef.current = voiceJoined;
  }, [voiceJoined]);

  useEffect(() => {
    const sock = getSocket();

    const onParticipants = ({ participants }: { participants: string[] }) => {
      setVoiceParticipants(participants);
      if (!myPlayerId) return;
      if (!voiceJoinedRef.current) return;

      for (const pid of participants) {
        if (pid === myPlayerId) continue;
        ensurePeerConnection(pid);
      }

      for (const pid of participants) {
        if (pid === myPlayerId) continue;
        const shouldInitiate = myPlayerId < pid;
        if (!shouldInitiate) continue;
        if (negotiatedRef.current.has(pid)) continue;
        negotiatedRef.current.add(pid);
        (async () => {
          const pc = ensurePeerConnection(pid);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sock.emit('voice:signal', {
            to: pid,
            data: { type: 'offer', sdp: offer },
          });
        })().catch(() => {});
      }
    };

    const onSignal = ({ from, data }: { from: string; data: any }) => {
      if (!voiceJoinedRef.current) return;
      if (!myPlayerId) return;

      const run = async () => {
        const pc = ensurePeerConnection(from);

        if (data?.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sock.emit('voice:signal', { to: from, data: { type: 'answer', sdp: answer } });
          negotiatedRef.current.add(from);
          return;
        }

        if (data?.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          negotiatedRef.current.add(from);
          return;
        }

        if (data?.type === 'ice' && data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      };

      run().catch(() => {});
    };

    const onVoiceError = ({ message }: { message: string }) => {
      setVoiceError(message);
      closeVoice();
    };

    sock.on('voice:participants', onParticipants);
    sock.on('voice:signal', onSignal);
    sock.on('voice:error', onVoiceError);

    return () => {
      sock.off('voice:participants', onParticipants);
      sock.off('voice:signal', onSignal);
      sock.off('voice:error', onVoiceError);
      if (voiceJoinedRef.current) sock.emit('voice:leave');
      closeVoice();
    };
  }, [myPlayerId]);

  const handleJoinVoice = async () => {
    setVoiceError('');
    if (voiceJoined) return;
    if (!myPlayerId) {
      setVoiceError('未获取到玩家身份，请重新进入房间');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      setVoiceJoined(true);
      getSocket().emit('voice:join');
    } catch {
      setVoiceError('无法获取麦克风权限');
    }
  };

  const handleLeaveVoice = () => {
    if (!voiceJoined) return;
    getSocket().emit('voice:leave');
    closeVoice();
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

      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-bold text-emerald-400">语音讨论</h4>
          <div className="flex gap-2">
            {!voiceJoined ? (
              <button
                onClick={handleJoinVoice}
                disabled={!sessionId}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded font-bold text-sm"
              >
                加入语音
              </button>
            ) : (
              <button
                onClick={handleLeaveVoice}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded font-bold text-sm"
              >
                离开语音
              </button>
            )}
          </div>
        </div>
        <div className="text-xs text-gray-400">
          参与人数: {voiceParticipants.length || (voiceJoined ? 1 : 0)} / 8
        </div>
        {voiceError && <div className="mt-2 text-sm text-red-400">{voiceError}</div>}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
          {remoteStreams.map((rs) => (
            <div key={rs.playerId} className="flex items-center justify-between bg-gray-900/40 border border-gray-700 rounded p-3">
              <div className="text-sm text-gray-300">{rs.playerId}</div>
              <audio autoPlay playsInline ref={(el) => { if (el) el.srcObject = rs.stream; }} />
            </div>
          ))}
          {voiceJoined && remoteStreams.length === 0 && (
            <div className="text-sm text-gray-500">已加入语音，等待其他人加入...</div>
          )}
        </div>
      </div>

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
