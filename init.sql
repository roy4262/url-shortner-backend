-- SQL to create links table
CREATE TABLE IF NOT EXISTS links (
  code TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  clicks INT DEFAULT 0,
  last_clicked TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
