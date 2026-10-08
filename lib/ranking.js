import { parse } from 'csv-parse/sync';

export const DAILY_LIMIT = 2_300_000;

const DAY_COLUMNS = [
  'Montag Punkte',
  'Dienstag Punkte',
  'Mittwoch Punkte',
  'Donnerstag Punkte',
  'Freitag Punkte',
  'Samstag Punkte',
];

function parsePoints(value, rowNumber, column) {
  if (value === undefined || value.trim() === '') return null;
  const points = Number(value.trim());
  if (!Number.isSafeInteger(points) || points < 0) {
    throw new Error(`Invalid point value in row ${rowNumber}, column "${column}".`);
  }
  return points;
}

export function parseRankingCsv(csvText) {
  let records;
  try {
    records = parse(csvText, {
      bom: true,
      columns: true,
      delimiter: ';',
      skip_empty_lines: true,
      trim: true,
    });
  } catch (error) {
    throw new Error(`Could not read CSV: ${error.message}`);
  }

  const headers = Object.keys(records[0] ?? {});
  const requiredColumns = ['Name', ...DAY_COLUMNS];
  const missingColumns = requiredColumns.filter((column) => !headers.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`Missing CSV columns: ${missingColumns.join(', ')}.`);
  }

  const players = records.map((record, index) => {
    const name = record.Name?.trim();
    if (!name) throw new Error(`Player name is missing in row ${index + 2}.`);
    const dailyPoints = DAY_COLUMNS.map((column) => parsePoints(record[column], index + 2, column));
    const enteredPoints = dailyPoints.filter((points) => points !== null);
    const totalPoints = enteredPoints.reduce((total, points) => total + points, 0);
    const daysAtOrBelowLimit = enteredPoints.filter((points) => points <= DAILY_LIMIT).length;

    return {
      name,
      dailyPoints,
      totalPoints,
      dailyAverage: enteredPoints.length ? totalPoints / enteredPoints.length : null,
      daysAtOrBelowLimit,
      daysEntered: enteredPoints.length,
    };
  });

  if (players.length === 0) throw new Error('The CSV contains no players.');

  players.sort((left, right) => right.totalPoints - left.totalPoints || left.name.localeCompare(right.name));
  return players.map((player, index) => ({ ...player, rank: index + 1 }));
}