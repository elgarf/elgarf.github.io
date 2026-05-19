/* build:1779222473 */
export const normalizeSemanticToken = raw => String(raw || "")
  .toLowerCase()
  .replace(/\s+/g, " ")
  .trim()
  .replace(/[^a-zа-я0-9@._ -]+/gi, "")
  .replace(/\s+/g, "-");

export const createSectionKeySequencer = () => {
  const counts = new Map();
  return (level, parentTitle, title) => {
    const lvl = Number(level) || 0;
    if (lvl <= 5) {
      const sem = `h5:${normalizeSemanticToken(title)}`;
      const occ = (counts.get(sem) || 0) + 1;
      counts.set(sem, occ);
      return `${sem}:${occ}`;
    }
    const sem = `h6:${normalizeSemanticToken(parentTitle)}:${normalizeSemanticToken(title)}`;
    const occ = (counts.get(sem) || 0) + 1;
    counts.set(sem, occ);
    return `${sem}:${occ}`;
  };
};
