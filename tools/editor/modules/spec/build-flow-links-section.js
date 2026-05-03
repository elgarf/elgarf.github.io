import { createSectionKeySequencer } from "./section-key-utils.js";

export const fmtAreaM2 = v => {
  const n = Math.max(0, Math.round((Number(v) || 0) * 1000) / 1000);
  return Number.isInteger(n) ? `${n.toFixed(0)}` : String(n).replace(/\.?0+$/, "");
};
const mapEntriesToList = (map, sortFn, fmtKey = k => k, countSuffix = "шт.") =>
  [...map.entries()]
    .filter(([, count]) => (Number(count) || 0) > 0)
    .sort(sortFn)
    .map(([key, count]) => `${fmtKey(key)} – ${count} ${countSuffix}`);
const mapToCabinetList = (map, unitM = "м", countSuffix = "шт.") =>
  mapEntriesToList(map, (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"), key => `${key}${unitM}`, countSuffix);
const mapToCableList = (map, countSuffix = "шт.") =>
  mapEntriesToList(map, (a, b) => parseFloat(a[0]) - parseFloat(b[0]), k => k, countSuffix);
const mapToNamedCountList = (map, countSuffix = "шт.") =>
  mapEntriesToList(map, (a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "ru"), k => k, countSuffix);
export const fmtMeters = v => {
  const n = Math.max(0, Math.round((Number(v) || 0) * 1000) / 1000);
  return Number.isInteger(n) ? n.toFixed(0) : String(n).replace(/\.?0+$/, "");
};
export const fmtOne = v => {
  const n = Math.round((Number(v) || 0) * 10) / 10;
  return Number.isInteger(n) ? `${n.toFixed(0)}` : n.toFixed(1);
};
const mapToRigSizeList = (map, unitM = "м", countSuffix = "шт.") =>
  mapEntriesToList(map, (a, b) => Number(a[0]) - Number(b[0]), key => `${fmtMeters(Number(key))}${unitM}`, countSuffix);
const mapToRigWeightList = (map, unitKg = "кг", countSuffix = "шт.") =>
  mapEntriesToList(map, (a, b) => Number(a[0]) - Number(b[0]), key => `${Math.round(Number(key))}${unitKg}`, countSuffix);
const pushSpecListLine = (out, label, items) => {
  if (Array.isArray(items) && items.length) out.push(`* ${label}: ${items.join("; ")}`);
};
const pushSpecCountLine = (out, label, count, suffix = "шт.") => {
  const n = Math.max(0, Math.round(Number(count) || 0));
  if (n > 0) out.push(`* ${label}: ${n} ${suffix}`);
};
const joinSpecLine = (label, items) => {
  const arr = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!arr.length) return "";
  return `* ${label}: ${arr.join("; ")}`;
};
export const addCountToMap = (map, key, count = 1) => {
  if (key == null || !Number.isFinite(Number(key))) return;
  map.set(key, (map.get(key) || 0) + count);
};
const mergeCountMap = (dst, src) => {
  for (const [k, v] of src.entries()) dst.set(k, (dst.get(k) || 0) + (v || 0));
};
const mergeNumericMap = (dst, src) => {
  for (const [k, v] of src.entries()) dst.set(k, (dst.get(k) || 0) + (Number(v) || 0));
};
const multiplyMap = (src, factor = 1) => {
  const out = new Map();
  const n = Math.max(1, Number(factor) || 1);
  for (const [k, v] of (src instanceof Map ? src.entries() : [])) {
    out.set(k, (Number(v) || 0) * n);
  }
  return out;
};
const sumMapCounts = map => {
  let sum = 0;
  for (const v of map.values()) sum += Math.max(0, Math.round(Number(v) || 0));
  return sum;
};
const mapSignature = map =>
  [...(map instanceof Map ? map.entries() : [])]
    .filter(([, count]) => (Number(count) || 0) > 0)
    .map(([key, count]) => [String(key), Number(count) || 0])
    .sort((a, b) => a[0].localeCompare(b[0], "ru", { numeric: true }) || a[1] - b[1]);
const createManualSectionResolver = (customMap = {}) => {
  const nextKey = createSectionKeySequencer();
  const getSectionManual = (level, parentTitle, title) => {
    const key = nextKey(level, parentTitle, title);
    return String((customMap && customMap[key]) || "").trim();
  };
  const getGlobalManual = () => String((customMap && customMap.__global__) || "").trim();
  return { getSectionManual, getGlobalManual };
};

const screenSeriesName = meta => {
  const name = String(meta && meta.name || "").trim();
  const m = name.match(/^(.*?)\s+\d+$/);
  return String(m ? m[1] : name).trim() || name || "Экран";
};
const isDeviceRect = r => String((r && r.kind) || "").toLowerCase() === "device";
const rectKind = r => String((r && r.kind) || "").toLowerCase();
const isSpecRect = r => {
  const k = rectKind(r);
  return k !== "note" && k !== "shape";
};
const baseNameWithoutTrailingNumber = name => {
  const s = String(name || "").trim();
  if (!s) return "Устройство";
  const m = s.match(/^(.*?)(?:\s+[#№]?\s*\d+)?$/);
  return String((m && m[1]) || s).trim() || s;
};

const createScreenSpecRecord = (deps = {}) => {
  const {
    rect,
    interSpec,
    parseScreenNameGroup,
    buildRectSpecData,
    buildRectRigSpecData,
    fmtMeters
  } = deps;
  const r = rect;
  const meta = parseScreenNameGroup(r);
  const specData = buildRectSpecData(r);
  const rigData = buildRectRigSpecData(r);
  const interOut = interSpec && interSpec.byRectOut ? interSpec.byRectOut.get(r.id) : null;
  const wM = fmtMeters((+r.width || 0) / Math.max(1, +r.scale || 256));
  const hM = fmtMeters((+r.height || 0) / Math.max(1, +r.scale || 256));
  return { rect: r, meta, specData, rigData, interOut, wM, hM };
};

const screenSpecKey = rec => JSON.stringify({
  width: Math.round(Number(rec.rect && rec.rect.width) || 0),
  height: Math.round(Number(rec.rect && rec.rect.height) || 0),
  scale: Math.max(1, Math.round(Number(rec.rect && rec.rect.scale) || 256)),
  cabinets: mapSignature(rec.specData.cabinetBySize),
  cables: mapSignature(rec.specData.cableByLen),
  supports: mapSignature(rec.rigData.supportBySize),
  frameCount: Number(rec.rigData.frameCount) || 0,
  bottomRowFrameCount: Number(rec.rigData.bottomRowFrameCount) || 0,
  bottomLoads: mapSignature(rec.rigData.bottomLoadByKg)
});

const buildScreenSpecSection = (deps = {}) => {
  const {
    records,
    manualText,
    t = value => value
  } = deps;
  const recs = Array.isArray(records) ? records.filter(Boolean) : [];
  const rec = recs[0];
  if (!rec) return "";
  const r = rec.rect;
  const { name } = rec.meta;
  const count = Math.max(1, recs.length);
  const cabinetBySize = multiplyMap(rec.specData.cabinetBySize, count);
  const cableByLen = multiplyMap(rec.specData.cableByLen, count);
  const supportBySize = multiplyMap(rec.rigData.supportBySize, count);
  const frameCount = (Number(rec.rigData.frameCount) || 0) * count;
  const bottomRowFrameCount = (Number(rec.rigData.bottomRowFrameCount) || 0) * count;
  const bottomLoadByKg = multiplyMap(rec.rigData.bottomLoadByKg, count);
  const cabinetList = mapToCabinetList(cabinetBySize, t("м"), t("шт."));
  const cableList = mapToCableList(cableByLen, t("шт."));
  const supportList = mapToRigSizeList(supportBySize, t("м"), t("шт."));
  const bottomLoadList = mapToRigWeightList(bottomLoadByKg, t("кг"), t("шт."));
  const frameBracketCount = frameCount + bottomRowFrameCount;
  const groupCounts = new Map();
  for (const item of recs) {
    const group = String(item.meta && item.meta.group || "").trim() || t("Общая");
    groupCounts.set(group, (groupCounts.get(group) || 0) + 1);
  }
  const groupList = mapToNamedCountList(groupCounts, t("шт."));
  const screenLabel = count > 1 ? `${screenSeriesName(rec.meta)}, ${count} ${t("шт.")}` : name;
  const out = [
    `###### ${screenLabel} (${Math.round(r.width)}x${Math.round(r.height)} px / ${rec.wM} x ${rec.hM} ${t("м")})`,
    count > 1 ? `* ${t("Количество экранов")}: ${count} ${t("шт.")}` : "",
    groupList.length === 1 ? `* ${t("Группа")}: ${String(recs[0].meta.group || t("Общая"))}` : `* ${t("Группы")}: ${groupList.join("; ")}`
  ];
  if (!out[1]) out.splice(1, 1);
  pushSpecListLine(out, t("Кабинеты"), cabinetList);
  pushSpecListLine(out, t("Коммутация"), cableList);
  pushSpecListLine(out, t("Подвесы"), supportList);
  pushSpecCountLine(out, t("Рамы"), frameCount, t("шт."));
  pushSpecListLine(out, t("Грузы"), bottomLoadList);
  pushSpecCountLine(out, t("Скоба монтажная для рамы"), frameBracketCount, t("шт."));
  pushSpecCountLine(out, t("Болт для крепления скобы"), frameBracketCount * 4, t("шт."));
  if (String(manualText || "").trim()) out.push("", String(manualText).trim());
  return out.join("\n");
};

const buildSummarySection = (deps = {}) => {
  const { group, rec, interSpec, manualText } = deps;
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
    `* Площадь экранов: ${fmtAreaM2(rec.visibleAreaM2)} м²`
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
  if (String(manualText || "").trim()) lines.push("", String(manualText).trim());
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
    fmtMeters,
    specCustomSections,
    specCustomText,
    projectName = "Проект",
    viewerUrl = "",
    includeManual = false,
    t = value => value
  } = deps;

  const allSpecRects = (Array.isArray(rects) ? rects : []).filter(r => isSpecRect(r));
  const screenRects = allSpecRects.filter(r => !isDeviceRect(r));
  const deviceRects = allSpecRects.filter(r => isDeviceRect(r));
  const interSpec = buildInterScreenSpecData();
  const manualResolver = includeManual
    ? createManualSectionResolver((specCustomSections && typeof specCustomSections === "object") ? specCustomSections : {})
    : { getSectionManual: () => "", getGlobalManual: () => "" };
  const globalManual = includeManual
    ? [manualResolver.getGlobalManual(), String(specCustomText || "").trim()].filter(Boolean).join("\n\n").trim()
    : "";
  const TOTAL_PARENT = t("Итоговая сумма");
  const byScreenSeries = new Map();
  for (const r of screenRects) {
    const meta = parseScreenNameGroup(r);
    const series = screenSeriesName(meta);
    if (!byScreenSeries.has(series)) byScreenSeries.set(series, []);
    byScreenSeries.get(series).push(r);
  }
  const screenBlocks = [...byScreenSeries.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "ru"))
    .map(([series, rows]) => {
      const records = rows
        .slice()
        .sort((a, b) => {
          const am = parseScreenNameGroup(a);
          const bm = parseScreenNameGroup(b);
          return String(am.name || "").localeCompare(String(bm.name || ""), "ru", { numeric: true })
            || String(am.group || "").localeCompare(String(bm.group || ""), "ru")
            || (Number(a.id) || 0) - (Number(b.id) || 0);
        })
        .map(r => createScreenSpecRecord({
          rect: r,
          interSpec,
          parseScreenNameGroup,
          buildRectSpecData,
          buildRectRigSpecData,
          fmtMeters
        }));
      const bySpec = new Map();
      for (const rec of records) {
        const key = screenSpecKey(rec);
        if (!bySpec.has(key)) bySpec.set(key, []);
        bySpec.get(key).push(rec);
      }
      const blocks = [...bySpec.values()].map(recs => {
        const rec = recs[0];
        const titleLabel = recs.length > 1 ? `${series}, ${recs.length} ${t("шт.")}` : rec.meta.name;
        const title = `${titleLabel} (${Math.round(rec.rect.width)}x${Math.round(rec.rect.height)} px / ${rec.wM} x ${rec.hM} ${t("м")})`;
        return buildScreenSpecSection({
          records: recs,
          manualText: manualResolver.getSectionManual(6, series, title),
          t
        });
      });
      return [`##### ${series}`, ...blocks].join("\n\n");
    })
    .join("\n\n");
  const screenListLines = [];
  for (const r of screenRects.slice().sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0))) {
    const meta = parseScreenNameGroup(r);
    const wM = fmtMeters((+r.width || 0) / Math.max(1, +r.scale || 256));
    const hM = fmtMeters((+r.height || 0) / Math.max(1, +r.scale || 256));
    screenListLines.push(`* ${meta.name} (${wM} x ${hM} ${t("м")}, ${meta.group})`);
  }
  const deviceNameGroups = new Map();
  for (const r of deviceRects) {
    const name = baseNameWithoutTrailingNumber(r && r.name);
    deviceNameGroups.set(name, (deviceNameGroups.get(name) || 0) + 1);
  }
  const deviceBlocks = mapToNamedCountList(deviceNameGroups, t("шт.")).map(item => `* ${item}`).join("\n");

  const byGroup = new Map();
  for (const r of screenRects) {
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

  const groupBlocks = [...byGroup.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "ru"))
    .map(([group, rec]) => {
      const cab = mapToCabinetList(rec.cabinetBySize, t("м"), t("шт."));
      const cbl = mapToCableList(rec.cableByLen, t("шт."));
      const interGroup = interSpec && interSpec.byGroupOut ? interSpec.byGroupOut.get(group) : null;
      const icbl = interGroup ? mapToCableList(interGroup.cableByLen, t("шт.")) : [];
      const irts = interGroup ? mapToNamedCountList(interGroup.routes, t("шт.")) : [];
      const sup = mapToRigSizeList(rec.supportBySize, t("м"), t("шт."));
      const btm = mapToRigWeightList(rec.bottomLoadByKg, t("кг"), t("шт."));
      const manualText = manualResolver.getSectionManual(6, TOTAL_PARENT, `${t("Группа")}: ${group}`);
      const bulletLines = [
        `* ${t("Площадь экранов")}: ${fmtAreaM2(rec.visibleAreaM2)} ${t("м²")}`,
        joinSpecLine(t("Кабинеты"), cab),
        joinSpecLine(t("Коммутация"), cbl),
        joinSpecLine(t("Межэкранные связи"), irts),
        joinSpecLine(t("Межэкранная коммутация"), icbl),
        joinSpecLine(t("Подвесы"), sup),
        rec.frameCount > 0 ? `* ${t("Рамы")}: ${rec.frameCount} ${t("шт.")}` : "",
        joinSpecLine(t("Грузы"), btm),
        String(manualText || "").trim()
      ].filter(Boolean);
      return [`###### ${group}`, ...bulletLines].join("\n");
    })
    .join("\n\n");
  const commutationHeader = `##### ${t("Сигнальная и силовая коммутация")}`;
  const commutationText = [globalManual, String(specCustomText || "").trim()].filter(Boolean).join("\n\n").trim();

  return [
    `### ${String(projectName || "Проект").trim() || "Проект"}`,
    "",
    String(viewerUrl || "").trim(),
    "",
    ...screenListLines,
    "",
    groupBlocks,
    "",
    commutationHeader,
    ...(commutationText ? ["", commutationText] : []),
    "",
    `##### ${t("Устройства")}`,
    ...(deviceBlocks ? [deviceBlocks] : [`* ${t("Нет устройств")}`])
  ].join("\n");
};
