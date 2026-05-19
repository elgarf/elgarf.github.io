/* build:1779222473 */
export const fontFamilyCss = value => {
  const parts = String(value || "Roboto, Segoe UI, Arial").split(",").map(s => s.trim()).filter(Boolean);
  if (!parts.length) return "\"Segoe UI\", Arial";
  return parts.map(p => {
    if ((p.startsWith("\"") && p.endsWith("\"")) || (p.startsWith("'") && p.endsWith("'"))) return p;
    return /\s/.test(p) ? `"${p.replace(/"/g, "\\\"")}"` : p;
  }).join(", ");
};

export const escXml = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
