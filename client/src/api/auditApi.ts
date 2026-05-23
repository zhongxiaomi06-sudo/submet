export type AuditType = 'cheat_detection' | 'quality_scoring' | 'anomaly_detection';

export interface AuditApiDataPacket {
  data_id: string;
  action_sequence: unknown[];
  miner_address?: string;
  zk_proof?: string;
}

export interface AuditApiRequest {
  data_packets: AuditApiDataPacket[];
  audit_type: AuditType;
  context?: {
    game_type?: string;
    rules_hash?: string;
  };
}

export interface AuditApiResponse {
  results: Array<{
    data_id: string;
    honesty_score: number;
    honesty_probability: number;
    suspicious_features: Array<{
      feature: string;
      severity: number;
      description: string;
    }>;
    model_version: number;
    inference_time_ms: number;
  }>;
}

export async function postAudit(baseUrl: string, apiKey: string, req: AuditApiRequest): Promise<AuditApiResponse> {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const res = await fetch(`${normalizedBaseUrl}/v1/audit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Audit API failed: ${res.status} ${text}`);
  }

  return (await res.json()) as AuditApiResponse;
}
