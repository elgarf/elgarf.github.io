export const setPanelHidden = (node, hidden) => {
  if (!node || !node.classList) return;
  node.classList.toggle("d-none", !!hidden);
};

export const getSelectionPanelKind = ({ rect, multi = false, isShapeRect, isNoteRect } = {}) => {
  const hasSelection = !!rect;
  const rectKind = String((rect && rect.kind) || "").toLowerCase();
  const isShape = !!(hasSelection && typeof isShapeRect === "function" && isShapeRect(rect));
  const isNote = !!(hasSelection && typeof isNoteRect === "function" && isNoteRect(rect));
  const isDevice = !!(hasSelection && rectKind === "device");
  return {
    hasSelection,
    isShape,
    isNote,
    isDevice,
    isScreen: !!(hasSelection && !isShape && !isNote && !isDevice),
    isObject: !!(hasSelection || multi)
  };
};

export const syncDynamicPanelVisibility = ({ el, rect, multi = false, isShapeRect, isNoteRect } = {}) => {
  const kind = getSelectionPanelKind({ rect, multi, isShapeRect, isNoteRect });
  setPanelHidden(el.emptySelectionHint, kind.isObject);
  setPanelHidden(el.objectNameField, !kind.isObject);
  setPanelHidden(el.rectTextSizeField, !(kind.isScreen || kind.isNote));
  setPanelHidden(el.quickGeoPanel, !kind.isObject);
  setPanelHidden(el.areaM2Field, !kind.isScreen);
  setPanelHidden(el.colorPanel, !kind.isObject);
  setPanelHidden(el.shapeOpacityField, !kind.isShape);
  setPanelHidden(el.autoContrastField, !kind.isScreen);
  setPanelHidden(el.randomColorField, !kind.isObject);
  setPanelHidden(el.cabinetSizePanel, !kind.isScreen);
  setPanelHidden(el.devicePropsPanel, !kind.isDevice);
  setPanelHidden(el.devicePortLabelField, !kind.isDevice);
  setPanelHidden(el.flowField, !kind.isScreen);
  setPanelHidden(el.numberCellsField, !kind.isScreen);
  setPanelHidden(el.splitVariantField, !kind.isScreen);
  setPanelHidden(el.screenActionsField, !kind.isScreen);
  setPanelHidden(el.convertRegionsField, !kind.isScreen);
  setPanelHidden(el.list, false);
  if (!kind.isShape) setPanelHidden(el.shapePointPanel, true);
  return kind;
};

export const mainPropNodes = el => [
  el.name,
  el.rectTextSize,
  el.x,
  el.y,
  el.rot,
  el.wm,
  el.hm,
  el.a,
  el.b,
  el.shapeOpacity,
  el.cx,
  el.cy,
  el.cUnit,
  el.dataFlow,
  el.dataFlowZ,
  el.numCells,
  el.splitVariant
  ,
  el.propDeviceType
];

export const trackedPropInputNodes = el => [
  el.name,
  el.x,
  el.y,
  el.rot,
  el.wm,
  el.hm,
  el.shapePointX,
  el.shapePointY,
  el.shapePointType,
  el.a,
  el.b,
  el.shapeOpacity,
  el.cx,
  el.cy,
  el.areaM2,
  el.dataFlow,
  el.dataFlowZ,
  el.numCells,
  el.splitVariant,
  el.rectTextSize
  ,
  el.propDeviceType,
  el.propDeviceInCount,
  el.propDeviceOutCount,
  el.propDevicePortLabel
];

export const liveApplyInputNodes = el => [
  el.name,
  el.x,
  el.y,
  el.rot,
  el.shapePointX,
  el.shapePointY,
  el.shapeOpacity,
  el.cx,
  el.cy
  ,
  el.propDeviceInCount,
  el.propDeviceOutCount,
  el.propDevicePortLabel
];

export const commitApplyInputNodes = el => [
  el.name,
  el.x,
  el.y,
  el.rot,
  el.wm,
  el.hm,
  el.shapePointX,
  el.shapePointY,
  el.shapeOpacity,
  el.cx,
  el.cy
  ,
  el.propDeviceInCount,
  el.propDeviceOutCount,
  el.propDevicePortLabel
];

export const changeApplyInputNodes = el => [
  el.dataFlow,
  el.dataFlowZ,
  el.splitVariant,
  el.shapePointType
  ,
  el.propDeviceType
];

export const fieldForPropNode = (el, node) => {
  if (node === el.name) return "name";
  if (node === el.x) return "x";
  if (node === el.y) return "y";
  if (node === el.rot) return "rotation";
  if (node === el.wm) return "widthM";
  if (node === el.hm) return "heightM";
  if (node === el.a) return "colorA";
  if (node === el.shapeOpacity) return "shapeOpacity";
  if (node === el.cx) return "cellX";
  if (node === el.cy) return "cellY";
  if (node === el.dataFlow) return "dataFlow";
  if (node === el.dataFlowZ) return "dataFlowZ";
  if (node === el.numCells) return "numberCells";
  if (node === el.splitVariant) return "splitVariant";
  if (node === el.areaM2) return "areaM2Px";
  if (node === el.shapePointX) return "shapePointX";
  if (node === el.shapePointY) return "shapePointY";
  if (node === el.shapePointType) return "shapePointType";
  if (node === el.propDeviceType) return "deviceType";
  if (node === el.propDeviceInCount) return "deviceInCount";
  if (node === el.propDeviceOutCount) return "deviceOutCount";
  if (node === el.propDevicePortLabel) return "devicePortLabel";
  return "";
};

export const setMainPropsDisabled = ({ el, disabled, uiSetDisabled } = {}) => {
  if (typeof uiSetDisabled !== "function") return;
  mainPropNodes(el).forEach(node => uiSetDisabled(node, !!disabled));
};
