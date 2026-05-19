/* build:1779222473 */
const toKey = value => String(value || "");

export const getSelectedFlowLinkKeys = st => {
  const primary = toKey(st && st.flowLinkSelectedKey);
  const raw = Array.isArray(st && st.flowLinkSelectedKeys) ? st.flowLinkSelectedKeys : [];
  const out = [];
  const seen = new Set();
  for (const it of raw) {
    const key = toKey(it);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  if (primary && !seen.has(primary)) out.push(primary);
  return out;
};

export const getPrimarySelectedFlowLinkKey = st => {
  const keys = getSelectedFlowLinkKeys(st);
  return keys.length ? keys[keys.length - 1] : "";
};

export const syncSelectedFlowLinkState = st => {
  if (!st || typeof st !== "object") return [];
  const keys = getSelectedFlowLinkKeys(st);
  st.flowLinkSelectedKeys = keys.slice();
  st.flowLinkSelectedKey = keys.length ? keys[keys.length - 1] : "";
  return keys;
};

export const setSingleSelectedFlowLink = (st, key) => {
  if (!st || typeof st !== "object") return;
  const next = toKey(key);
  st.flowLinkSelectedKeys = next ? [next] : [];
  st.flowLinkSelectedKey = next;
};

export const clearSelectedFlowLinks = st => {
  if (!st || typeof st !== "object") return;
  st.flowLinkSelectedKey = "";
  st.flowLinkSelectedKeys = [];
};

export const toggleSelectedFlowLink = (st, key) => {
  if (!st || typeof st !== "object") return [];
  const next = toKey(key);
  if (!next) return syncSelectedFlowLinkState(st);
  const keys = getSelectedFlowLinkKeys(st);
  const idx = keys.indexOf(next);
  if (idx >= 0) keys.splice(idx, 1);
  else keys.push(next);
  st.flowLinkSelectedKeys = keys;
  st.flowLinkSelectedKey = keys.length ? keys[keys.length - 1] : "";
  return keys;
};

export const isFlowLinkSelected = (st, key) => {
  const target = toKey(key);
  if (!target) return false;
  return getSelectedFlowLinkKeys(st).includes(target);
};
