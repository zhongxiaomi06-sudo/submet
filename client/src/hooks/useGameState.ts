import { useGameStore } from '../store/gameStore';

export const useGameState = () => {
  const view = useGameStore((state) => state.view);
  const myPlayerId = useGameStore((state) => state.myPlayerId);
  const myRole = useGameStore((state) => state.myRole);
  const connected = useGameStore((state) => state.connected);
  const sessionId = useGameStore((state) => state.sessionId);
  const chatMessages = useGameStore((state) => state.chatMessages);
  const traitorContracts = useGameStore((state) => state.traitorContracts);

  const phase = view?.phase ?? 'lobby';
  const isMyTurn =
    phase === 'final_vote' ||
    (myRole === 'miner' && phase === 'declaration') ||
    (myRole === 'validator' && phase === 'scoring') ||
    (myRole === 'subnet_owner' && (phase === 'audit' || phase === 'final_audit'));

  return {
    view,
    myPlayerId,
    myRole,
    connected,
    sessionId,
    chatMessages,
    traitorContracts,
    phase,
    round: view?.round ?? 0,
    myChips: view?.myChips ?? 0,
    isMyTurn,
  };
};
