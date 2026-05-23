export interface EvidencePack {
  schema_version: '1.0.0';
  session_id: string;
  exported_at: string;
  source: {
    game_id: 'undercurrent-demo';
    collector_type: 'game_session';
  };
  action_log: Array<{
    seq: number;
    phase: string;
    actor: string;
    actor_role: string;
    action_type: string;
    payload: Record<string, unknown>;
    state_hash_before: string;
    state_hash_after: string;
    timestamp_offset_ms: number;
  }>;
  labeled_data: Array<{
    miner_id: string;
    round: number;
    declared_quality: number | null;
    true_quality: number;
    is_cheat: boolean;
    penalty_type: string;
    penalty_amount: number;
    audit_depth?: string;
  }>;
}

export function exportRawData(sessionId: string, session: any): EvidencePack {
  const actionLog: EvidencePack['action_log'] = [];
  const labeledData: EvidencePack['labeled_data'] = [];

  if (session?.eventLog) {
    session.eventLog.forEach((ev: any, i: number) => {
      actionLog.push({
        seq: i,
        phase: ev.phase ?? session.phase,
        actor: ev.actor ?? 'system',
        actor_role: 'system',
        action_type: ev.type,
        payload: ev.payload ?? {},
        state_hash_before: '',
        state_hash_after: '',
        timestamp_offset_ms: (ev.timestamp ?? Date.now()) - new Date(session.createdAt).getTime(),
      });
    });
  }

  if (session?.players) {
    for (const player of Object.values(session.players) as any[]) {
      if (player.role === 'miner' && player.roundData) {
        for (const rd of player.roundData) {
          labeledData.push({
            miner_id: player.playerId,
            round: rd.round,
            declared_quality: rd.declaredQuality,
            true_quality: rd.trueQuality,
            is_cheat: rd.isCheat,
            penalty_type: rd.penaltyType,
            penalty_amount: rd.penaltyAmount,
            audit_depth: rd.penaltyType === 'process' ? 'deep' : 'shallow',
          });
        }
      }
    }
  }

  return {
    schema_version: '1.0.0',
    session_id: sessionId,
    exported_at: new Date().toISOString(),
    source: {
      game_id: 'undercurrent-demo',
      collector_type: 'game_session',
    },
    action_log: actionLog,
    labeled_data: labeledData,
  };
}

export function exportLabeledData(session: any): object {
  if (!session?.players) return { session_id: session?.sessionId, labeled: [] };

  const labeled = Object.values(session.players)
    .filter((p: any) => p.role === 'miner')
    .map((p: any) => ({
      player_id: p.playerId,
      rounds: (p.roundData ?? []).map((rd: any) => ({
        round: rd.round,
        true_quality: rd.trueQuality,
        declared_quality: rd.declaredQuality,
        is_cheat: rd.isCheat,
        penalty_type: rd.penaltyType,
        penalty_amount: rd.penaltyAmount,
      })),
    }));

  return {
    schema_version: '1.0.0',
    session_id: session.sessionId,
    exported_at: new Date().toISOString(),
    labeled,
  };
}
