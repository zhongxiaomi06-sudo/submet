import { useGameStore } from '../store/gameStore';

export const useGameState = () => {
  const view = useGameStore((state) => state.view);
  const myPlayerId = useGameStore((state) => state.myPlayerId);
  const myRole = useGameStore((state) => state.myRole);
  const connected = useGameStore((state) => state.connected);

  return {
    view,
    myPlayerId,
    myRole,
    connected,
    phase: view?.phase ?? 'lobby',
    round: view?.round ?? 0,
    myChips: view?.myChips ?? 0,
    isMyTurn: ((): boolean => {
      const phase = view?.phase;
      const role = myRole;
      if (phase === 'declaration' && role === 'miner') return true;
      if (phase === 'scoring' && role === 'validator') return true;
      if (phase === 'audit' && role === 'subnet_owner') return true;
      if (phase === 'final_vote') return true;
      return false;
    })(),
  };
};
