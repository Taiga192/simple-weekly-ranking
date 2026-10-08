import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRankingCsv } from '../lib/ranking.js';

const header = 'Rang Montag;Name;Montag Punkte;Dienstag Punkte;Mittwoch Punkte;Donnerstag Punkte;Freitag Punkte;Samstag Punkte;Wöchentliche Punkte;Tagesdurchschnitt;Tage unter 2.300.000;Tage genau 2.300.000;Tage kritisch (<= 2.300.000);Beteiligung über Minimum (%);Status';
const makeRow = (values) => Array.from({ length: 15 }, (_, index) => values[index] ?? '').join(';');

test('recalculates totals, averages, critical days, and rank from daily values', () => {
  const csv = [
    header,
    makeRow(['1', 'Alpha', '2400000', '2300000', '2100000', '', '', '', 'formula', 'formula']),
    makeRow(['2', 'Bravo', '4000000', '', '', '', '', '', '', 'formula']),
  ].join('\n');
  const players = parseRankingCsv(csv);

  assert.equal(players[0].name, 'Alpha');
  assert.equal(players[0].rank, 1);
  assert.equal(players[0].totalPoints, 6_800_000);
  assert.equal(players[0].dailyAverage, 2_266_666.6666666665);
  assert.equal(players[0].daysAtOrBelowLimit, 2);
  assert.equal(players[1].name, 'Bravo');
  assert.equal(players[1].totalPoints, 4_000_000);
  assert.equal(players[1].dailyAverage, 4_000_000);
  assert.deepEqual(players[0].dailyPoints, [2_400_000, 2_300_000, 2_100_000, null, null, null]);
});

test('rejects a missing player name and malformed point values', () => {
  assert.throws(() => parseRankingCsv(`${header}\n${makeRow(['1', '', ''])}`), /name is missing/);
  assert.throws(() => parseRankingCsv(`${header}\n${makeRow(['1', 'Alpha', 'keine'])}`), /Invalid point value/);
});

test('requires the daily score columns but ignores spreadsheet formulas', () => {
  assert.throws(() => parseRankingCsv('Name;Montag Punkte\nAlpha;2300000'), /Missing CSV columns/);
});