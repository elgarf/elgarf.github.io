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

export const syncDynamicPanelVisibility = ({ el, rect, multi = false, isShapeRect, isNoteRect, hasFlowLinkSelection = false } = {}) => {
  const kind = getSelectionPanelKind({ rect, multi, isShapeRect, isNoteRect });
  const hasAnySelection = !!(kind.isObject || hasFlowLinkSelection);
  setPanelHidden(el.emptySelectionHint, hasAnySelection);
  setPanelHidden(el.objectNameField, !kind.isObject);
  setPanelHidden(el.rectTextSizeField, !(kind.isScreen || kind.isNote));
  setPanelHidden(el.noteArtRenderField, !kind.isNote);
  setPanelHidden(el.quickGeoPanel, !kind.isObject);
  setPanelHidden(el.areaM2Field, !kind.isScreen);
  setPanelHidden(el.colorPanel, !kind.isObject);
  setPanelHidden(el.colorBField, kind.isNote);
  setPanelHidden(el.shapeOpacityField, !kind.isShape);
  setPanelHidden(el.autoContrastField, !kind.isScreen);
  setPanelHidden(el.randomColorField, !kind.isObject);
  setPanelHidden(el.cabinetSizePanel, !kind.isScreen);
  setPanelHidden(el.devicePropsPanel, !kind.isDevice);
  setPanelHidden(el.devicePortLabelField, !kind.isDevice);
  setPanelHidden(el.flowLinkPropsPanel, !hasFlowLinkSelection);
  setPanelHidden(el.flowField, !kind.isScreen);
  setPanelHidden(el.numberCellsField, !kind.isScreen);
  setPanelHidden(el.splitVariantField, !kind.isScreen);
  setPanelHidden(el.screenActionsField, !kind.isScreen);
  setPanelHidden(el.convertRegionsField, !kind.isScreen);
  setPanelHidden(el.list, false);
  if (!kind.isShape) setPanelHidden(el.shapePointPanel, true);
  return kind;
};

const PROP_DEFS = [
  { key: "name", field: "name", main: true, tracked: true, live: true, commit: true },
  { key: "rectTextSize", main: true, tracked: true },
  { key: "propNoteArtRender", field: "noteIncludeInArtRender", main: true, tracked: true, change: true },
  { key: "x", field: "x", main: true, tracked: true, live: true, commit: true },
  { key: "y", field: "y", main: true, tracked: true, live: true, commit: true },
  { key: "rot", field: "rotation", main: true, tracked: true, live: true, commit: true },
  { key: "wm", field: "widthM", main: true, tracked: true, commit: true },
  { key: "hm", field: "heightM", main: true, tracked: true, commit: true },
  { key: "shapePointX", field: "shapePointX", tracked: true, live: true, commit: true },
  { key: "shapePointY", field: "shapePointY", tracked: true, live: true, commit: true },
  { key: "shapePointType", field: "shapePointType", tracked: true, change: true },
  { key: "a", field: "colorA", main: true, tracked: true },
  { key: "b", main: true, tracked: true },
  { key: "shapeOpacity", field: "shapeOpacity", main: true, tracked: true, live: true, commit: true },
  { key: "cx", field: "cellX", main: true, tracked: true, live: true, commit: true },
  { key: "cy", field: "cellY", main: true, tracked: true, live: true, commit: true },
  { key: "cUnit", main: true },
  { key: "areaM2", field: "areaM2Px", tracked: true },
  { key: "dataFlow", field: "dataFlow", main: true, tracked: true, change: true },
  { key: "dataFlowZ", field: "dataFlowZ", main: true, tracked: true, change: true },
  { key: "numCells", field: "numberCells", main: true, tracked: true },
  { key: "splitVariant", field: "splitVariant", main: true, tracked: true, change: true },
  { key: "propDeviceType", field: "deviceType", main: true, tracked: true, commit: true, change: true },
  { key: "propDeviceOrientation", field: "deviceOrientation", main: true, tracked: true, live: true, commit: true, change: true },
  { key: "propDeviceInCount", field: "deviceInCount", tracked: true, live: true, commit: true },
  { key: "propDeviceOutCount", field: "deviceOutCount", tracked: true, live: true, commit: true },
  { key: "propDevicePortLabel", field: "devicePortLabel", tracked: true, live: true, commit: true },
  { key: "propFlowLinkOrthogonal", field: "flowLinkOrthogonal", tracked: true, live: true, change: true },
  { key: "propFlowLinkControlCount", field: "flowLinkControlPointCount", tracked: true, live: true, change: true },
  { key: "propFlowLinkColor", field: "flowLinkColor", tracked: true, live: true, change: true },
  { key: "propFlowLinkWidth", field: "flowLinkWidth", tracked: true, live: true, change: true },
  { key: "propFlowLinkLineType", field: "flowLinkLineType", tracked: true, live: true, change: true },
  { key: "propFlowLinkIsCommutation", field: "flowLinkIsCommutation", tracked: true, live: true, change: true },
  { key: "propFlowLinkCommutationName", field: "flowLinkCommutationName", tracked: true, live: true, change: true, commit: true }
];

const collectNodes = (el, flag) => PROP_DEFS.filter(def => !!def[flag]).map(def => el[def.key]);

export const mainPropNodes = el => collectNodes(el, "main");
export const trackedPropInputNodes = el => collectNodes(el, "tracked");
export const liveApplyInputNodes = el => collectNodes(el, "live");
export const commitApplyInputNodes = el => collectNodes(el, "commit");
export const changeApplyInputNodes = el => collectNodes(el, "change");

export const fieldForPropNode = (el, node) => {
  for (const def of PROP_DEFS) {
    if (node === el[def.key]) return def.field || "";
  }
  return "";
};

export const setMainPropsDisabled = ({ el, disabled, uiSetDisabled } = {}) => {
  if (typeof uiSetDisabled !== "function") return;
  mainPropNodes(el).forEach(node => uiSetDisabled(node, !!disabled));
};
