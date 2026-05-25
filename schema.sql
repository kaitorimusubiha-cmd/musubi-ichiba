CREATE TABLE IF NOT EXISTS kobutsu_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('buy', 'sell')),
  source TEXT NOT NULL DEFAULT 'manual',
  item_name TEXT NOT NULL,
  item_description TEXT DEFAULT '',
  quantity INTEGER DEFAULT 1,
  amount INTEGER NOT NULL,
  counterparty_name TEXT DEFAULT '',
  counterparty_address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);
