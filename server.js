import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { parseRankingCsv } from './lib/ranking.js';
import { buildPlayerList } from './lib/players.js';

const root = dirname(fileURLToPath(import.meta.url));
const publicDirectory = resolve(root, 'public');
const databasePath = resolve(process.env.DATABASE_PATH ?? resolve(root, 'data/rangliste.sqlite'));
const seedCsvPath = resolve(root, 'data/rangliste.csv');
const port = Number(process.env.PORT ?? 3000);
const maxImportBytes = 3 * 1024 * 1024;

mkdirSync(dirname(databasePath), { recursive: true });
const database = new DatabaseSync(databasePath);
database.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    monday INTEGER,
    tuesday INTEGER,
    wednesday INTEGER,
    thursday INTEGER,
    friday INTEGER,
    saturday INTEGER
  );
  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const playerCount = database.prepare('SELECT COUNT(*) AS count FROM players').get().count;
if (playerCount === 0) {
  try {
    importCsv(readFileSync(seedCsvPath, 'utf8'));
  } catch (error) {
    console.error(`CSV-Startimport fehlgeschlagen: ${error.message}`);
  }
}

function importCsv(csvText) {
  const players = parseRankingCsv(csvText);
  const columns = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const insert = database.prepare(`
    INSERT INTO players (name, ${columns.join(', ')})
    VALUES (?, ${columns.map(() => '?').join(', ')})
  `);

  database.exec('BEGIN IMMEDIATE');
  try {
    database.exec('DELETE FROM players');
    for (const player of players) insert.run(player.name, ...player.dailyPoints);
    database.prepare(`
      INSERT INTO app_meta (key, value) VALUES ('updated_at', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(new Date().toISOString());
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
  return players.length;
}

function getPlayers() {
  const rows = database.prepare(`
    SELECT name, monday, tuesday, wednesday, thursday, friday, saturday
    FROM players
  `).all();
  const updatedAt = database.prepare("SELECT value FROM app_meta WHERE key = 'updated_at'").get()?.value ?? null;
  return { players: buildPlayerList(rows), updatedAt };
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxImportBytes) throw new Error('Die CSV ist größer als 3 MB.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (url.pathname === '/api/players' && request.method === 'GET') {
    sendJson(response, 200, getPlayers());
    return;
  }

  if (url.pathname === '/api/import' && request.method === 'POST') {
    try {
      const csvText = await readRequestBody(request);
      const count = importCsv(csvText);
      sendJson(response, 200, { count, ...getPlayers() });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Methode nicht erlaubt.' });
    return;
  }

  const fileName = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  if (!['index.html', 'app.js', 'styles.css'].includes(fileName)) {
    sendJson(response, 404, { error: 'Nicht gefunden.' });
    return;
  }
  try {
    const body = readFileSync(resolve(publicDirectory, fileName));
    response.writeHead(200, { 'content-type': contentTypes[extname(fileName)] });
    response.end(body);
  } catch {
    sendJson(response, 404, { error: 'Nicht gefunden.' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Rangliste läuft auf http://localhost:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      database.close();
      process.exit(0);
    });
  });
}