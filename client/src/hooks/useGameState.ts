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
    isMyTurn: true, // 简化逻辑，实际应根据 phase 和 role 判断
  };
};
