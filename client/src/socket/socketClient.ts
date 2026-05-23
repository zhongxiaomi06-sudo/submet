import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import type { PlayerViewState } from '../../../shared/types/game';

let socket: Socket | null = null;

export const connectSocket = (url: string) => {
  if (socket) return socket;

  socket = io(url);

  socket.on('connect', () => {
    useGameStore.getState().setConnected(true);
  });

  socket.on('disconnect', () => {
    useGameStore.getState().setConnected(false);
  });

  socket.on('game_update', (view: PlayerViewState) => {
    useGameStore.getState().setView(view);
  });

  return socket;
};

export const getSocket = () => socket;

export const emitEvent = (event: string, data?: any) => {
  if (socket) {
    socket.emit(event, data);
  }
};
