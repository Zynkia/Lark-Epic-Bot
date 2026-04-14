import { EpicGame } from './epic';

export async function cleanupExpiredGames(db: D1Database): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare('DELETE FROM games WHERE end_date < ?').bind(now).run();
}

export async function saveGames(db: D1Database, games: EpicGame[]): Promise<void> {
  if (games.length === 0) return;
  const stmt = db.prepare('INSERT OR IGNORE INTO games (id, title, description, url, image_url, start_date, end_date, is_pushed) VALUES (?, ?, ?, ?, ?, ?, ?, 0)');
  const batch = games.map(g => stmt.bind(g.id, g.title, g.description, g.url, g.image_url, g.start_date, g.end_date));
  await db.batch(batch);
}

export async function getUnpushedGames(db: D1Database): Promise<EpicGame[]> {
  const { results } = await db.prepare('SELECT * FROM games WHERE is_pushed = 0').all<EpicGame>();
  return results || [];
}

export async function markGamesAsPushed(db: D1Database, gameIds: string[]): Promise<void> {
  if (gameIds.length === 0) return;
  // Use simple parameter binding loop since SQLite limit in D1 batch is flexible
  const stmt = db.prepare('UPDATE games SET is_pushed = 1 WHERE id = ?');
  const batch = gameIds.map(id => stmt.bind(id));
  await db.batch(batch);
}

export async function getCurrentFreeGames(db: D1Database): Promise<EpicGame[]> {
  const now = new Date().toISOString();
  const { results } = await db.prepare('SELECT * FROM games WHERE start_date <= ? AND end_date >= ?').bind(now, now).all<EpicGame>();
  return results || [];
}

export async function addSubscription(db: D1Database, chatId: string, chatType: string): Promise<void> {
  await db.prepare('INSERT OR REPLACE INTO subscriptions (chat_id, chat_type) VALUES (?, ?)').bind(chatId, chatType).run();
}

export async function removeSubscription(db: D1Database, chatId: string): Promise<void> {
  await db.prepare('DELETE FROM subscriptions WHERE chat_id = ?').bind(chatId).run();
}

export async function getSubscriptions(db: D1Database): Promise<{ chat_id: string, chat_type: string }[]> {
  const { results } = await db.prepare('SELECT chat_id, chat_type FROM subscriptions').all<{ chat_id: string, chat_type: string }>();
  return results || [];
}
