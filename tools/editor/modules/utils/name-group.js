export const withNameSuffixBeforeGroup = (name, suffix) => {
  const src = String(name || "").trim() || "Rect";
  const add = String(suffix || "").trim();
  if (!add) return src;
  const at = src.indexOf("@");
  if (at < 0) return `${src} ${add}`.trim();
  const base = src.slice(0, at).trim() || "Rect";
  const group = src.slice(at);
  return `${base} ${add}${group}`.trim();
};

export const parseScreenNameGroup = rect => {
  const fallback = `Экран #${rect && rect.id != null ? rect.id : "?"}`;
  const raw = String((rect && rect.name) || fallback).trim() || fallback;
  const at = raw.indexOf("@");
  if (at < 0) return { name: raw, group: "Общая" };
  const name = raw.slice(0, at).trim() || fallback;
  const group = raw.slice(at + 1).trim() || "Общая";
  return { name, group };
};
