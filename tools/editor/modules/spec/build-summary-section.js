export const buildSummarySection = (deps = {}) => {
  const {
    group,
    rec,
    interSpec,
    mapToCabinetList,
    mapToCableList,
    mapToNamedCountList,
    mapToRigSizeList,
    mapToRigWeightList,
    sumMapCounts,
    fmtAreaM2,
    pushSpecListLine,
    pushSpecCountLine
  } = deps;

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
