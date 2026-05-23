import { getDb, saveDb } from './connection';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  phase TEXT NOT NULL DEFAULT 'lobby',
  round INTEGER NOT NULL DEFAULT 1,
  max_rounds INTEGER NOT NULL DEFAULT 3,
  public_pool REAL NOT NULL DEFAULT 14,
  taotao_pool REAL NOT NULL DEFAULT 0.35,
  traitor_fund REAL NOT NULL DEFAULT 6,
  public_goal TEXT,
  ai_analysis_used INTEGER NOT NULL DEFAULT 0,
  contract_passed INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS players (
  player_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('subnet_owner','validator','miner')),
  player_type TEXT NOT NULL CHECK(player_type IN ('human','bot')),
  socket_id TEXT,
  chips REAL NOT NULL DEFAULT 15,
  is_alive INTEGER NOT NULL DEFAULT 1,
  is_traitor INTEGER NOT NULL DEFAULT 0,
  traitor_state TEXT NOT NULL DEFAULT 'normal',
  round_data_json TEXT DEFAULT '[]',
  vote TEXT,
  vote_weight REAL DEFAULT 1.0,
  confirmed_cheats INTEGER DEFAULT 0,
  final_rank INTEGER,
  taotao_reward REAL,
  PRIMARY KEY (player_id, session_id)
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  round INTEGER NOT NULL,
  phase TEXT NOT NULL,
  type TEXT NOT NULL,
  actor TEXT,
  payload TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export async function initDB(): Promise<void> {
  const db = await getDb();
  db.run(SCHEMA_SQL);
  saveDb();
}
