export const fmtAreaM2 = v => {
  const n = Math.max(0, Math.round((Number(v) || 0) * 1000) / 1000);
  return Number.isInteger(n) ? `${n.toFixed(0)}` : String(n).replace(/\.?0+$/, "");
};

export const mapToCabinetList = m =>
  [...m.entries()]
    .filter(([, count]) => (Number(count) || 0) > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .map(([size, count]) => `${size}м – ${count} шт.`);

export const mapToCableList = m =>
  [...m.entries()]
    .filter(([, count]) => (Number(count) || 0) > 0)
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
    .map(([len, count]) => `${len} – ${count} шт.`);

export const mapToNamedCountList = map =>
  [...map.entries()]
    .filter(([, count]) => (Number(count) || 0) > 0)
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "ru"))
    .map(([name, count]) => `${name} – ${count} шт.`);

const defaultFmtMeters = v => {
  const n = Math.max(0, Math.round((Number(v) || 0) * 1000) / 1000);
  return Number.isInteger(n) ? n.toFixed(0) : String(n).replace(/\.?0+$/, "");
};

export const mapToRigSizeList = (map, fmtMeters = defaultFmtMeters) =>
  [...map.entries()]
    .filter(([, count]) => (Number(count) || 0) > 0)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([size, count]) => `${fmtMeters(Number(size))}м – ${count} шт.`);

export const mapToRigWeightList = map =>
  [...map.entries()]
    .filter(([, count]) => (Number(count) || 0) > 0)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([kg, count]) => `${Math.round(Number(kg))}кг – ${count} шт.`);

export const pushSpecListLine = (out, label, items) => {
  if (Array.isArray(items) && items.length) out.push(`- ${label}: ${items.join("; ")}`);
};

export const pushSpecCountLine = (out, label, count, suffix = "шт.") => {
  const n = Math.max(0, Math.round(Number(count) || 0));
  if (n > 0) out.push(`- ${label}: ${n} ${suffix}`);
};
