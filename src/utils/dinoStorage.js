const KEY = 'trexo_dino_collection';

const DEFAULTS = {
  trexo:  { level: 1, unlocked: true,  fragments: 0, maxFragments: 5 },
  trike:  { level: 0, unlocked: false, fragments: 0, maxFragments: 5 },
  ptero:  { level: 0, unlocked: false, fragments: 0, maxFragments: 5 },
  diplo:  { level: 0, unlocked: false, fragments: 0, maxFragments: 5 },
  raptor: { level: 0, unlocked: false, fragments: 0, maxFragments: 5 },
};

export function getCollection() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Object.fromEntries(
        Object.entries(DEFAULTS).map(([k, v]) => [k, { ...v, ...(parsed[k] || {}) }])
      );
    }
  } catch {}
  return structuredClone ? structuredClone(DEFAULTS) : JSON.parse(JSON.stringify(DEFAULTS));
}

export function saveCollection(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

export function addFragment(dinoKey) {
  const col = getCollection();
  if (!col[dinoKey]) return;
  col[dinoKey].fragments = Math.min(col[dinoKey].fragments + 1, col[dinoKey].maxFragments);
  saveCollection(col);
}
