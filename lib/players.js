import { DAILY_LIMIT } from './ranking.js';

export const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function buildPlayerList(rows) {
  const players = rows.map((row) => {
    const dailyPoints = DAY_KEYS.map((day) => row[day]);
    const enteredPoints = dailyPoints.filter((points) => points !== null);
    const totalPoints = enteredPoints.reduce((total, points) => total + points, 0);
    return {
      name: row.name,
      dailyPoints,
      totalPoints,
      dailyAverage: enteredPoints.length ? totalPoints / enteredPoints.length : null,
      daysAtOrBelowLimit: enteredPoints.filter((points) => points <= DAILY_LIMIT).length,
      daysEntered: enteredPoints.length,
    };
  });
  players.sort((left, right) => right.totalPoints - left.totalPoints || left.name.localeCompare(right.name));
  return players.map((player, index) => ({ ...player, rank: index + 1 }));
}
