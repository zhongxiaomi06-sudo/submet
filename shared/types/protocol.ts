import type {
  AiAnalysisLevel,
  AuditMode,
  ChatMessage,
  PlayerViewState,
  RoleId,
  TraitorContractOffer,
} from './game';

export interface JoinRoomRequest {
  roomId: string;
  playerName: string;
  preferredRole?: RoleId;
}

export interface JoinRoomResponse {
  roomId: string;
  sessionId: string;
  myPlayerId: string;
  myRole: RoleId;
}

export interface ClientToServerEvents {
  'room/join': (payload: JoinRoomRequest, cb?: (res: JoinRoomResponse) => void) => void;
  'room/leave': (payload: { roomId: string }) => void;

  'game/submitDeclaration': (payload: { sessionId: string; declaredQuality: number }) => void;
  'game/submitScores': (payload: {
    sessionId: string;
    scores: Record<string, number>;
    reports: string[];
  }) => void;
  'game/executeAudit': (payload: {
    sessionId: string;
    minerIds: string[];
    auditMode: Exclude<AuditMode, 'final_deep'>;
  }) => void;
  'game/aiAnalysis': (payload: {
    sessionId: string;
    level: AiAnalysisLevel;
    publicReport: boolean;
  }) => void;
  'game/finalDeepAudit': (payload: { sessionId: string; minerIds: string[] }) => void;
  'game/kickPlayers': (payload: { sessionId: string; playerIds: string[]; reason: string }) => void;
  'game/castVote': (payload: { sessionId: string; vote: 'for' | 'against' }) => void;
  'game/advancePhase': (payload: { sessionId: string }) => void;

  'chat/send': (payload: { sessionId: string; channel: 'public' | 'direct'; toPlayerId?: string; content: string }) => void;

  'traitor/offer': (payload: { sessionId: string; targetId: string; bribe: number; task: string }) => void;
  'traitor/respond': (payload: { sessionId: string; offerId: string; accept: boolean }) => void;
  'traitor/reveal': (payload: { sessionId: string; targetTraitorId: string }) => void;
  'traitor/defect': (payload: { sessionId: string; targetTraitorId: string }) => void;
}

export interface ServerToClientEvents {
  'room/joined': (payload: JoinRoomResponse) => void;
  'room/error': (payload: { code: string; message: string }) => void;

  'game/view': (view: PlayerViewState) => void;
  'game/error': (payload: { code: string; message: string }) => void;

  'chat/message': (msg: ChatMessage) => void;

  'traitor/contracts': (payload: { sessionId: string; contracts: TraitorContractOffer[] }) => void;
}

