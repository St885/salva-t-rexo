const INV_KEY     = 'trexo_booster_inventory';
const PENDING_KEY = 'trexo_pending_boosters';
const COINS_KEY   = 'trexo_coins';

const DEFAULTS = { rocket: 5, bomb: 5, colorBomb: 3, ptero: 4 };

export function getInventory() {
  try {
    const raw = localStorage.getItem(INV_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

export function saveInventory(inv) {
  try { localStorage.setItem(INV_KEY, JSON.stringify(inv)); } catch {}
}

export function setPendingBoosters(sel) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(sel)); } catch {}
}

export function getCoins() {
  try { return parseInt(localStorage.getItem(COINS_KEY) ?? '0', 10) || 0; } catch { return 0; }
}

export function addCoins(amount) {
  try { localStorage.setItem(COINS_KEY, String(getCoins() + amount)); } catch {}
}
