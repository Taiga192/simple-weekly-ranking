const DAILY_LIMIT = 2_300_000;
const playerRows = document.querySelector('#player-rows');
const searchInput = document.querySelector('#search-input');
const fileInput = document.querySelector('#csv-file');
const importButton = document.querySelector('#import-button');
const syncState = document.querySelector('#sync-state');
const toast = document.querySelector('#toast');
const podium = document.querySelector('#podium');
const filterGroup = document.querySelector('#filter');
const dayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
let players = [];
let activeFilter = 'all';
let toastTimer;

function formatPoints(points, decimals = 1) {
  if (points === null || points === undefined) return '–';
  return `${(points / 1_000_000).toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}M`;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function makeCell(className, content) {
  const cell = el('td', className);
  if (content instanceof Node) cell.append(content);
  else cell.textContent = content;
  return cell;
}

function playerStatus(player) {
  if (player.daysAtOrBelowLimit === 6) return 'remove';
  if (player.daysAtOrBelowLimit > 0) return 'warning';
  return 'ok';
}

function renderPodium() {
  const top = players.slice(0, 3);
  podium.hidden = top.length === 0;
  podium.replaceChildren();
  for (const player of top) {
    const card = el('article', `podium-card place-${player.rank}`);
    card.append(el('span', 'podium-rank', String(player.rank)));
    card.append(el('strong', 'podium-name', player.name));
    card.append(el('span', 'podium-points', formatPoints(player.totalPoints, 2)));
    card.append(el('span', 'podium-meta', `Ø ${formatPoints(player.dailyAverage, 2)} pro Tag`));
    podium.append(card);
  }
}

function render() {
  const search = searchInput.value.trim().toLocaleLowerCase('de-DE');
  const visiblePlayers = players.filter((player) => {
    if (!player.name.toLocaleLowerCase('de-DE').includes(search)) return false;
    const status = playerStatus(player);
    if (activeFilter === 'warning') return status === 'warning';
    if (activeFilter === 'remove') return status === 'remove';
    return true;
  });
  const best = players[0]?.totalPoints || 1;
  playerRows.replaceChildren();

  for (const player of visiblePlayers) {
    const row = el('tr');
    const status = playerStatus(player);
    if (status === 'remove') row.classList.add('row-remove');
    row.append(makeCell('cell-rank', el('span', `rank-badge${player.rank <= 3 ? ` rank-${player.rank}` : ''}`, String(player.rank))));
    row.append(makeCell('cell-player', player.name));

    for (const [index, points] of player.dailyPoints.entries()) {
      const chip = el('span', 'chip', points === null ? '–' : formatPoints(points));
      if (points !== null) {
        chip.classList.add(points < DAILY_LIMIT ? 'chip-bad' : points === DAILY_LIMIT ? 'chip-edge' : 'chip-good');
        chip.setAttribute('aria-label', `${dayLabels[index]}: ${points.toLocaleString('de-DE')} Punkte`);
      } else {
        chip.classList.add('chip-empty');
      }
      row.append(makeCell('cell-day', chip));
    }

    const total = el('div', 'total');
    total.append(el('span', 'total-value', formatPoints(player.totalPoints)));
    const bar = el('span', 'total-bar');
    const fill = el('i');
    fill.style.width = `${Math.max(2, (player.totalPoints / best) * 100)}%`;
    bar.append(fill);
    total.append(bar);
    row.append(makeCell('cell-total', total));
    row.append(makeCell('cell-avg', formatPoints(player.dailyAverage, 2)));

    const crit = el('span', 'count', `${player.daysAtOrBelowLimit}/${player.daysEntered || 0}`);
    crit.classList.add(player.daysAtOrBelowLimit === 0 ? 'count-clear' : player.daysAtOrBelowLimit >= 3 ? 'count-high' : 'count-some');
    row.append(makeCell('cell-crit', crit));

    const label = { ok: 'OK', warning: 'Warnung', remove: 'Entfernung' }[status];
    const pill = el('span', `status status-${status}`, label);
    if (status !== 'ok') {
      pill.title = status === 'remove'
        ? 'An allen sechs Tagen bei oder unter dem Tagesziel'
        : `${player.daysAtOrBelowLimit} Tag(e) bei oder unter dem Tagesziel`;
    }
    row.append(makeCell('cell-status', pill));
    playerRows.append(row);
  }

  document.querySelector('#empty-state').hidden = visiblePlayers.length > 0;
  document.querySelector('#visible-count').textContent = `${visiblePlayers.length} von ${players.length} Spielern`;
  document.querySelector('#player-count').textContent = String(players.length);
  document.querySelector('#leader-name').textContent = players[0]?.name ?? '–';
  document.querySelector('#leader-points').textContent = formatPoints(players[0]?.totalPoints, 2);
  renderPodium();
}

function showToast(message, isError = false) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle('toast-error', isError);
  toast.classList.add('toast-visible');
  toastTimer = window.setTimeout(() => toast.classList.remove('toast-visible'), 4200);
}

function updateTimestamp(value) {
  document.querySelector('#updated-at').textContent = value
    ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : 'Noch kein Import';
}

async function loadPlayers() {
  const response = await fetch('/api/players');
  if (!response.ok) throw new Error('Die Rangliste konnte nicht geladen werden.');
  const data = await response.json();
  players = data.players;
  updateTimestamp(data.updatedAt);
  render();
}

function importPassword() {
  const saved = sessionStorage.getItem('importPassword');
  if (saved) return saved;
  const entered = window.prompt('Import-Passwort:');
  if (!entered) return null;
  sessionStorage.setItem('importPassword', entered);
  return entered;
}

searchInput.addEventListener('input', render);
filterGroup.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter;
  for (const item of filterGroup.querySelectorAll('button')) item.classList.toggle('is-active', item === button);
  render();
});
importButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return;
  const password = importPassword();
  if (password === null) {
    fileInput.value = '';
    return;
  }
  importButton.disabled = true;
  syncState.classList.add('sync-busy');
  try {
    const response = await fetch('/api/import', {
      method: 'POST',
      headers: { 'content-type': 'text/csv; charset=utf-8', 'x-import-password': password },
      body: await file.text(),
    });
    const result = await response.json();
    if (response.status === 401) sessionStorage.removeItem('importPassword');
    if (!response.ok) throw new Error(result.error ?? 'Der Import ist fehlgeschlagen.');
    players = result.players;
    updateTimestamp(result.updatedAt);
    render();
    showToast(`${result.count} Spieler importiert.`);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    fileInput.value = '';
    importButton.disabled = false;
    syncState.classList.remove('sync-busy');
  }
});

loadPlayers().catch((error) => {
  const cell = makeCell('loading-cell', error.message);
  cell.colSpan = 12;
  playerRows.replaceChildren(cell);
  showToast(error.message, true);
});
