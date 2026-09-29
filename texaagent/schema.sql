CREATE TABLE IF NOT EXISTS bots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter',
  chat_credits INTEGER NOT NULL DEFAULT 500,
  email_credits INTEGER NOT NULL DEFAULT 20,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  bot_id TEXT NOT NULL,
  name TEXT,
  email TEXT NOT NULL,
  company TEXT,
  notes TEXT,
  draft TEXT,
  status TEXT NOT NULL DEFAULT 'drafted',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
