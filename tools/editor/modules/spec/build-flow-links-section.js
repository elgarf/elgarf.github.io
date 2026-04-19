export const buildFlowLinksSpecText = (deps = {}) => {
  const {
    rects,
    isNoteRect,
    buildInterScreenSpecData,
    parseScreenNameGroup,
    buildRectSpecData,
    buildRectRigSpecData,
    mergeCountMap,
    mergeNumericMap,
    buildScreenSpecSection,
    buildSummarySection
  } = deps;

  const specRects = (Array.isArray(rects) ? rects : []).filter(r => !isNoteRect(r));
  const interSpec = buildInterScreenSpecData();
  const screenBlocks = specRects
    .map(r => buildScreenSpecSection({ rect: r, interSpec }))
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
