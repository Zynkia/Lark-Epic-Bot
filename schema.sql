CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    url TEXT,
    image_url TEXT,
    start_date TEXT,
    end_date TEXT,
    is_pushed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS subscriptions (
    chat_id TEXT PRIMARY KEY,
    chat_type TEXT NOT NULL
);
