const fmtAreaM2 = v => {
  const n = Math.max(0, Math.round((Number(v) || 0) * 1000) / 1000);
  return Number.isInteger(n) ? `${n.toFixed(0)}` : String(n).replace(/\.?0+$/, "");
};
const mapToCabinetList = m =>
  [...m.entries()]
    .filter(([, count]) => (Number(count) || 0) > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .map(([size, count]) => `${size}м – ${count} шт.`);
const mapToCableList = m =>
  [...m.entries()]
    .filter(([, count]) => (Number(count) || 0) > 0)
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
    .map(([len, count]) => `${len} – ${count} шт.`);
const mapToNamedCountList = map =>
  [...map.entries()]
    .filter(([, count]) => (Number(count) || 0) > 0)
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "ru"))
    .map(([name, count]) => `${name} – ${count} шт.`);
const defaultFmtMeters = v => {
  const n = Math.max(0, Math.round((Number(v) || 0) * 1000) / 1000);
  return Number.isInteger(n) ? n.toFixed(0) : String(n).replace(/\.?0+$/, "");
};
const mapToRigSizeList = (map, fmtMeters = defaultFmtMeters) =>
  [...map.entries()]
    .filter(([, count]) => (Number(count) || 0) > 0)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([size, count]) => `${fmtMeters(Number(size))}м – ${count} шт.`);
const mapToRigWeightList = map =>
  [...map.entries()]
    .filter(([, count]) => (Number(count) || 0) > 0)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([kg, count]) => `${Math.round(Number(kg))}кг – ${count} шт.`);
const pushSpecListLine = (out, label, items) => {
  if (Array.isArray(items) && items.length) out.push(`- ${label}: ${items.join("; ")}`);
};
const pushSpecCountLine = (out, label, count, suffix = "шт.") => {
  const n = Math.max(0, Math.round(Number(count) || 0));
  if (n > 0) out.push(`- ${label}: ${n} ${suffix}`);
};
const addCountToMap = (map, key, count = 1) => {
  if (key == null || !Number.isFinite(Number(key))) return;
  map.set(key, (map.get(key) || 0) + count);
};
const mergeCountMap = (dst, src) => {
  for (const [k, v] of src.entries()) dst.set(k, (dst.get(k) || 0) + (v || 0));
};
const mergeNumericMap = (dst, src) => {
  for (const [k, v] of src.entries()) dst.set(k, (dst.get(k) || 0) + (Number(v) || 0));
};
const sumMapCounts = map => {
  let sum = 0;
  for (const v of map.values()) sum += Math.max(0, Math.round(Number(v) || 0));
  return sum;
};

const buildScreenSpecSection = (deps = {}) => {
  const {
    rect,
    interSpec,
    parseScreenNameGroup,
    buildRectSpecData,
    buildRectRigSpecData,
    fmtMeters
  } = deps;
  const r = rect;
  const { name, group } = parseScreenNameGroup(r);
  const { cabinetBySize, cableByLen } = buildRectSpecData(r);
  const { supportBySize, frameCount, bottomRowFrameCount, bottomLoadByKg } = buildRectRigSpecData(r);
  const interOut = interSpec && interSpec.byRectOut ? interSpec.byRectOut.get(r.id) : null;
  const cabinetList = [...cabinetBySize.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .map(([size, count]) => `${size}м – ${count} шт.`);
  const cableList = [...cableByLen.entries()]
    .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
    .map(([len, count]) => `${len} – ${count} шт.`);
  const interCableList = interOut ? mapToCableList(interOut.cableByLen) : [];
  const interTargetList = interOut ? mapToNamedCountList(interOut.targets) : [];
  const supportList = mapToRigSizeList(supportBySize);
  const bottomLoadList = mapToRigWeightList(bottomLoadByKg);
  const frameBracketCount = frameCount + bottomRowFrameCount;
  const wM = fmtMeters((+r.width || 0) / Math.max(1, +r.scale || 256));
  const hM = fmtMeters((+r.height || 0) / Math.max(1, +r.scale || 256));
  const out = [
    `###### ${name} (${Math.round(r.width)}x${Math.round(r.height)} px / ${wM} x ${hM} м)`,
    `- Группа: ${group}`
  ];
  pushSpecListLine(out, "Кабинеты", cabinetList);
  pushSpecListLine(out, "Коммутация", cableList);
  pushSpecListLine(out, "Межэкранные связи", interTargetList);
  pushSpecListLine(out, "Межэкранная коммутация", interCableList);
  pushSpecListLine(out, "Подвесы", supportList);
  pushSpecCountLine(out, "Рамы", frameCount);
  pushSpecListLine(out, "Грузы", bottomLoadList);
  pushSpecCountLine(out, "Скоба монтажная для рамы", frameBracketCount);
  pushSpecCountLine(out, "Болт для крепления скобы", frameBracketCount * 4);
  return out.join("\n");
};

const buildSummarySection = (deps = {}) => {
  const { group, rec, interSpec } = deps;
  const cab = mapToCabinetList(rec.cabinetBySize);
  const cbl = mapToCableList(rec.cableByLen);
  const interGroup = interSpec && interSpec.byGroupOut ? interSpec.byGroupOut.get(group) : null;
  const icbl = interGroup ? mapToCableList(interGroup.cableByLen) : [];
  const irts = interGroup ? mapToNamedCountList(interGroup.routes) : [];
  const sup = mapToRigSizeList(rec.supportBySize);
  const btm = mapToRigWeightList(rec.bottomLoadByKg);
  const supportCount = sumMapCounts(rec.supportBySize);
  const frameBracketCount = rec.frameCount + rec.bottomRowFrameCount;
  const lines = [
    `###### Группа: ${group}`,
    `- Площадь экранов: ${fmtAreaM2(rec.visibleAreaM2)} м²`
  ];
  pushSpecListLine(lines, "Кабинеты", cab);
  pushSpecListLine(lines, "Коммутация", cbl);
  pushSpecListLine(lines, "Межэкранные связи", irts);
  pushSpecListLine(lines, "Межэкранная коммутация", icbl);
  pushSpecListLine(lines, "Подвесы", sup);
  pushSpecCountLine(lines, "Рамы", rec.frameCount);
  pushSpecListLine(lines, "Грузы", btm);
  pushSpecCountLine(lines, "Скоба такелажная", supportCount * 2);
  pushSpecCountLine(lines, "Стропа", supportCount * 2);
  pushSpecCountLine(lines, "Скоба монтажная для рамы", frameBracketCount);
  pushSpecCountLine(lines, "Болт для крепления скобы", frameBracketCount * 4);
  return lines.join("\n");
};

export const buildFlowLinksSpecText = (deps = {}) => {
  const {
    rects,
    isNoteRect,
    buildInterScreenSpecData,
    parseScreenNameGroup,
    buildRectSpecData,
    buildRectRigSpecData,
    fmtMeters
  } = deps;

  const specRects = (Array.isArray(rects) ? rects : []).filter(r => !isNoteRect(r));
  const interSpec = buildInterScreenSpecData();
  const screenBlocks = specRects
    .map(r => buildScreenSpecSection({ rect: r, interSpec, parseScreenNameGroup, buildRectSpecData, buildRectRigSpecData, fmtMeters }))
    .join("\n\n");

  const byGroup = new Map();
  for (const r of specRects) {
    const { group } = parseScreenNameGroup(r);
    const data = buildRectSpecData(r);
    const rigData = buildRectRigSpecData(r);

    let rec = byGroup.get(group);
    if (!rec) {
      rec = {
        cabinetBySize: new Map(),
        cableByLen: new Map(),
        supportBySize: new Map(),
        frameCount: 0,
        bottomRowFrameCount: 0,
        bottomLoadByKg: new Map(),
        visibleAreaM2: 0
      };
      byGroup.set(group, rec);
    }

    mergeCountMap(rec.cabinetBySize, data.cabinetBySize);
    mergeCountMap(rec.cableByLen, data.cableByLen);
    mergeNumericMap(rec.supportBySize, rigData.supportBySize);
    mergeNumericMap(rec.bottomLoadByKg, rigData.bottomLoadByKg);

    rec.frameCount += Number(rigData.frameCount) || 0;
    rec.bottomRowFrameCount += Number(rigData.bottomRowFrameCount) || 0;
    rec.visibleAreaM2 += Number(data.visibleAreaM2) || 0;
  }

  const totalBlocks = [...byGroup.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "ru"))
    .map(([group, rec]) => buildSummarySection({ group, rec, interSpec }))
    .join("\n\n");

  return [
    "##### Спецификация",
    "",
    screenBlocks,
    "",
    "##### Итоговая сумма",
    "",
    totalBlocks
  ].join("\n");
};
