import { parseRankingCsv } from '../../lib/ranking.js';
import { DAY_KEYS } from '../../lib/players.js';
import { loadRanking } from './players.js';

const MAX_IMPORT_BYTES = 3 * 1024 * 1024;
const CHUNK_SIZE = 200;

function isAuthorized(request, env) {
  const expected = env.IMPORT_PASSWORD;
  if (!expected) return false;
  const given = request.headers.get('x-import-password') ?? '';
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let index = 0; index < given.length; index++) diff |= given.charCodeAt(index) ^ expected.charCodeAt(index);
  return diff === 0;
}

export async function onRequestPost({ request, env }) {
  if (!env.IMPORT_PASSWORD) {
    return Response.json({ error: 'Import ist nicht eingerichtet: Secret IMPORT_PASSWORD fehlt.' }, { status: 500 });
  }
  if (!isAuthorized(request, env)) {
    return Response.json({ error: 'Falsches Import-Passwort.' }, { status: 401 });
  }

  try {
    const csvText = await request.text();
    if (csvText.length > MAX_IMPORT_BYTES) throw new Error('Die CSV ist größer als 3 MB.');
    const players = parseRankingCsv(csvText);

    // Ein Batch läuft in D1 als Transaktion: entweder wird alles ersetzt oder nichts.
    const insertChunk = env.DB.prepare(`
      INSERT INTO players (name, ${DAY_KEYS.join(', ')})
      SELECT ${['$.name', ...DAY_KEYS.map((_, index) => `$.d[${index}]`)].map((path) => `json_extract(value, '${path}')`).join(', ')}
      FROM json_each(?)
    `);
    const statements = [env.DB.prepare('DELETE FROM players')];
    for (let start = 0; start < players.length; start += CHUNK_SIZE) {
      const chunk = players.slice(start, start + CHUNK_SIZE).map((player) => ({ name: player.name, d: player.dailyPoints }));
      statements.push(insertChunk.bind(JSON.stringify(chunk)));
    }
    statements.push(env.DB.prepare(`
      INSERT INTO app_meta (key, value) VALUES ('updated_at', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).bind(new Date().toISOString()));
    await env.DB.batch(statements);

    return Response.json({ count: players.length, ...(await loadRanking(env.DB)) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
