const splitNameGroup = name => {
  const raw = String(name || "").trim();
  const at = raw.indexOf("@");
  const groupName = at >= 0 ? raw.slice(at + 1).split("@")[0].trim() : "";
  return {
    stem: (at >= 0 ? raw.slice(0, at) : raw).trim(),
    group: groupName ? `@${groupName}` : ""
  };
};

export const normalizeNumberedBaseInput = value => {
  const parts = splitNameGroup(value);
  const m = parts.stem.match(/^(.*?)\s+\d+$/);
  return String(m ? m[1] : parts.stem).trim();
};

export const parseNumberedBaseInput = value => {
  const parts = splitNameGroup(value);
  const m = parts.stem.match(/^(.*?)\s+(\d+)$/);
  return {
    base: String(m ? m[1] : parts.stem).trim(),
    startNumber: m ? Math.max(1, Math.round(Number(m[2]) || 1)) : null,
    group: parts.group || ""
  };
};

export const parseNumberedName = name => {
  const parts = splitNameGroup(name);
  const m = parts.stem.match(/^(.*?)\s+(\d+)$/);
  if (!m) return null;
  const base = String(m[1] || "").trim();
  if (!base) return null;
  return { base, number: Math.max(1, Math.round(Number(m[2]) || 1)), group: parts.group };
};

export const multiNumberedBase = rects => {
  if (!Array.isArray(rects) || !rects.length) return "";
  let base = null;
  let group = null;
  for (const r of rects) {
    const parsed = parseNumberedName(r && r.name);
    if (!parsed) return "";
    if (base == null) base = parsed.base;
    else if (base !== parsed.base) return "";
    if (group == null) group = parsed.group || "";
    else if (group !== (parsed.group || "")) group = "";
  }
  return `${base || ""}${group || ""}`.trim();
};

export const multiNumberedStart = rects => {
  if (!Array.isArray(rects) || !rects.length) return null;
  const items = rects
    .map(r => ({ r, parsed: parseNumberedName(r && r.name) }))
    .filter(it => it.parsed)
    .sort((a, b) => (Number(a.r && a.r.x) || 0) - (Number(b.r && b.r.x) || 0)
      || (Number(a.r && a.r.y) || 0) - (Number(b.r && b.r.y) || 0)
      || (Number(a.r && a.r.id) || 0) - (Number(b.r && b.r.id) || 0));
  if (items.length !== rects.length) return null;
  return items[0].parsed.number;
};

export const numberedNameFor = (base, index, prevName, groupOverride = null) => {
  const parts = splitNameGroup(prevName);
  const group = groupOverride != null ? groupOverride : parts.group;
  return `${String(base || "").trim()} ${index}${group || ""}`.trim();
};
