import { create } from 'zustand';
import type { ChatMessage, PlayerViewState, RoleId, TraitorContractOffer } from '../../../shared/types/game';

interface GameStore {
  connected: boolean;
  roomId: string | null;
  sessionId: string | null;
  myPlayerId: string | null;
  myRole: RoleId | null;
  view: PlayerViewState | null;
  lobbyPlayers: Array<{ playerId: string; role: RoleId }>;
  roleCounts: Record<string, { filled: number; max: number }> | null;
  chatMessages: ChatMessage[];
  traitorContracts: TraitorContractOffer[];

  selectedStars: number;
  pendingScores: Record<string, number>;
  pendingReports: string[];
  pendingAuditTargets: string[];
  pendingKickList: string[];

  setConnected: (v: boolean) => void;
  setRoom: (roomId: string, playerId: string, role: RoleId) => void;
  setSessionId: (sessionId: string) => void;
  setView: (view: PlayerViewState) => void;
  upsertLobbyPlayer: (playerId: string, role: RoleId) => void;
  setRoleCounts: (counts: Record<string, { filled: number; max: number }> | null) => void;
  pushChatMessage: (msg: ChatMessage) => void;
  setTraitorContracts: (contracts: TraitorContractOffer[]) => void;
  setSelectedStars: (n: number) => void;
  setPendingScore: (minerId: string, score: number) => void;
  toggleReport: (minerId: string) => void;
  toggleAuditTarget: (minerId: string) => void;
  toggleKick: (minerId: string) => void;
  resetPending: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  connected: false,
  roomId: null,
  sessionId: null,
  myPlayerId: null,
  myRole: null,
  view: null,
  lobbyPlayers: [],
  chatMessages: [],
  traitorContracts: [],
  roleCounts: null,

  selectedStars: 0,
  pendingScores: {},
  pendingReports: [],
  pendingAuditTargets: [],
  pendingKickList: [],

  setSessionId: (sessionId: string) => set({ sessionId }),
  setConnected: (connected: boolean) => set({ connected }),
  setRoom: (roomId: string, myPlayerId: string, myRole: RoleId) =>
    set({
      roomId,
      myPlayerId,
      myRole,
      lobbyPlayers: [{ playerId: myPlayerId, role: myRole }],
      selectedStars: 0,
      pendingScores: {},
      pendingReports: [],
      pendingAuditTargets: [],
      pendingKickList: [],
    }),
  setView: (view: PlayerViewState) => set({ view, sessionId: view.sessionId }),
  upsertLobbyPlayer: (playerId: string, role: RoleId) =>
    set((state: GameStore) => {
      const existing = state.lobbyPlayers.find((p) => p.playerId === playerId);
      if (existing) {
        return {
          lobbyPlayers: state.lobbyPlayers.map((p) => (p.playerId === playerId ? { playerId, role } : p)),
        };
      }
      return { lobbyPlayers: [...state.lobbyPlayers, { playerId, role }] };
    }),
  pushChatMessage: (msg: ChatMessage) =>
    set((state: GameStore) => ({ chatMessages: [...state.chatMessages, msg] })),
  setTraitorContracts: (traitorContracts: TraitorContractOffer[]) => set({ traitorContracts }),
  setRoleCounts: (roleCounts) => set({ roleCounts }),
  setSelectedStars: (selectedStars: number) => set({ selectedStars }),
  setPendingScore: (minerId: string, score: number) =>
    set((state: GameStore) => ({
      pendingScores: { ...state.pendingScores, [minerId]: score }
    })),
  toggleReport: (minerId: string) =>
    set((state: GameStore) => ({
      pendingReports: state.pendingReports.includes(minerId)
        ? state.pendingReports.filter((id: string) => id !== minerId)
        : [...state.pendingReports, minerId],
    })),
  toggleAuditTarget: (minerId: string) =>
    set((state: GameStore) => ({
      pendingAuditTargets: state.pendingAuditTargets.includes(minerId)
        ? state.pendingAuditTargets.filter((id: string) => id !== minerId)
        : [...state.pendingAuditTargets, minerId],
    })),
  toggleKick: (minerId: string) =>
    set((state: GameStore) => ({
      pendingKickList: state.pendingKickList.includes(minerId)
        ? state.pendingKickList.filter((id: string) => id !== minerId)
        : [...state.pendingKickList, minerId],
    })),
  resetPending: () =>
    set({
      selectedStars: 0,
      pendingScores: {},
      pendingReports: [],
      pendingAuditTargets: [],
      pendingKickList: [],
    }),
}));
