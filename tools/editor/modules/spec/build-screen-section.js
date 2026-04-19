export const buildScreenSpecSection = (deps = {}) => {
  const {
    rect,
    interSpec,
    parseScreenNameGroup,
    buildRectSpecData,
    buildRectRigSpecData,
    mapToCableList,
    mapToNamedCountList,
    mapToRigSizeList,
    mapToRigWeightList,
    fmtMeters,
    pushSpecListLine,
    pushSpecCountLine
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
