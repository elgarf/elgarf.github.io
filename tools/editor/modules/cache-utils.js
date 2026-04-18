export const pruneCacheByAge = (map, now, maxSize, maxAge, getLastSeen) => {
  if (!(map instanceof Map)) return;
  const limit = Math.max(1, Math.round(Number(maxSize) || 1));
  if (map.size <= limit) return;
  for (const [k, v] of map) {
    const lastSeen = Number(getLastSeen ? getLastSeen(v) : (v && v.lastSeen));
    if (Number.isFinite(lastSeen) && (now - (lastSeen | 0)) > maxAge) map.delete(k);
    if (map.size <= limit) break;
  }
};

export const setCacheWithPrune = (map, key, value, now, maxSize, maxAge, getLastSeen) => {
  if (!(map instanceof Map)) return;
  map.set(key, value);
  pruneCacheByAge(map, now, maxSize, maxAge, getLastSeen);
};

export const touchProgressState = (map, key, total, now, maxSize = 64, maxAge = 8) => {
  if (!(map instanceof Map)) return { total: Math.max(0, total | 0), drawn: 0, lastSeen: now };
  let s = map.get(key);
  if (!s) {
    s = { total: Math.max(0, total | 0), drawn: 0, lastSeen: now };
    map.set(key, s);
  }
  if ((s.total | 0) !== (total | 0)) {
    s.total = Math.max(0, total | 0);
    s.drawn = 0;
  }
  s.lastSeen = now;
  pruneCacheByAge(map, now, maxSize, maxAge, v => (v && v.lastSeen));
  return s;
};
