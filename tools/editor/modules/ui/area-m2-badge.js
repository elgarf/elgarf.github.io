const formatNum = value => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return String(Math.round(n * 100) / 100).replace(".", ",");
};

export const getAreaM2ExpressionLabel = input => {
  const source = String(input ?? "").trim();
  if (!source) return "";
  const match = source.match(/^\s*(\d+(?:[.,]\d+)?)\s*[xх×*]\s*(\d+(?:[.,]\d+)?)\s*$/i);
  if (!match) return "";
  const a = Number(String(match[1]).replace(",", "."));
  const b = Number(String(match[2]).replace(",", "."));
  if (!(a > 0 && b > 0)) return "";
  return `${formatNum(a)}×${formatNum(b)}`;
};

export const getAreaM2SqrtLabel = value => {
  const n = Math.max(0, Number(value) || 0);
  if (!(n > 0)) return "";
  const side = Math.sqrt(n);
  return `≈${formatNum(side)}×${formatNum(side)}`;
};

export const getAreaM2PresetLabel = (parsedValue, presetValues = []) => {
  const target = Math.max(1, Math.round(Number(parsedValue) || 0));
  for (const preset of Array.isArray(presetValues) ? presetValues : []) {
    const label = getAreaM2ExpressionLabel(preset);
    if (!label) continue;
    const parts = label.split("×").map(v => Number(String(v).replace(",", ".")));
    const product = Math.max(1, Math.round((parts[0] || 0) * (parts[1] || 0)));
    if (product === target) return label;
  }
  return "";
};

export const getAreaM2PresetValues = (root = document) => (
  Array.from(root.querySelectorAll("[data-area-m2-preset]"))
    .map(node => node.getAttribute("data-area-m2-preset") || "")
    .filter(Boolean)
);

export const getAreaM2BadgeLabel = (input, parsedValue, savedExpression = "", presetValues = []) => (
  getAreaM2PresetLabel(parsedValue, presetValues)
  || getAreaM2ExpressionLabel(input)
  || getAreaM2ExpressionLabel(savedExpression)
  || getAreaM2SqrtLabel(parsedValue)
);

export const setAreaM2ExpressionSource = (rect, input) => {
  if (!rect || typeof rect !== "object") return "";
  const expression = getAreaM2ExpressionLabel(input);
  if (expression) {
    try { Object.defineProperty(rect, "_areaM2Expression", { value: expression, writable: true, configurable: true }); }
    catch (_e) { rect._areaM2Expression = expression; }
  } else {
    try { delete rect._areaM2Expression; } catch (_e) { rect._areaM2Expression = ""; }
  }
  return expression;
};

export const updateAreaM2Badge = (badgeEl, label) => {
  if (!badgeEl) return;
  const value = String(label || "").trim();
  badgeEl.textContent = value;
  badgeEl.hidden = !value;
};
