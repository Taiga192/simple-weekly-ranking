import { buildPlayerList } from '../../lib/players.js';

export async function loadRanking(db) {
  const [{ results: rows }, meta] = await db.batch([
    db.prepare('SELECT name, monday, tuesday, wednesday, thursday, friday, saturday FROM players'),
    db.prepare("SELECT value FROM app_meta WHERE key = 'updated_at'"),
  ]);
  return { players: buildPlayerList(rows), updatedAt: meta.results[0]?.value ?? null };
}

export async function onRequestGet({ env }) {
  return Response.json(await loadRanking(env.DB));
}
