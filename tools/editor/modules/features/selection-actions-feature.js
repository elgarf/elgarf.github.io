import { clearSelectedFlowLinks, getSelectedFlowLinkKeys } from "../utils/flow-link-selection-state.js";
import { getFlowLinks } from "../utils/flow-links-state.js";
import { filterOutSelectedFlowLinks } from "../utils/selected-flow-links.js";

export const setupSelectionActionsFeature = (deps = {}) => {
  const {
    st,
    isRectLocked,
    setSelection,
    resetTransientState,
    refreshPanels,
    updateClusterEditCursor,
    commitUiUpdate,
    normSelSet,
    getSelectedRects,
    cur,
    normalizeFlowLocks,
    normalizeManualClusters,
    normalizeRigData,
    autoContrast,
    syncProps,
    listRects,
    setMode,
    schedulePersist
  } = deps;

  const insertCloneAboveSource = (sourceId, clone) => {
    const idx = st.rects.findIndex(v => v.id === sourceId);
    if (idx >= 0) st.rects.splice(idx, 0, clone);
    else st.rects.unshift(clone);
  };
  const incrementNameNumberBeforeGroup = name => {
    const raw = String(name || "").trim() || "Rect";
    const at = raw.indexOf("@");
    const stem = (at >= 0 ? raw.slice(0, at) : raw).trim() || "Rect";
    const group = at >= 0 ? raw.slice(at).trim() : "";
    const m = stem.match(/^(.*?)(?:\s+(\d+))?$/);
    const base = String(m && m[1] || stem).trim() || "Rect";
    const next = m && m[2] ? Math.max(1, Math.round(Number(m[2]) || 0) + 1) : 1;
    return `${base} ${next}${group}`.trim();
  };

  const cloneRectModel = (src, overrides = null) => {
    const o = (overrides && typeof overrides === "object") ? overrides : {};
    const base = {
      ...src,
      rotation: src.rotation || 0,
      autoContrastB: src.autoContrastB !== false,
      colorB: (src.autoContrastB !== false) ? autoContrast(src.colorA) : src.colorB,
      cellLinks: Array.isArray(src.cellLinks) ? [...src.cellLinks] : [],
      hiddenCells: Array.isArray(src.hiddenCells) ? [...src.hiddenCells] : [],
      flowLocks: normalizeFlowLocks(src && src.flowLocks),
      manualClusters: normalizeManualClusters(src && src.manualClusters),
      rig: normalizeRigData(src && src.rig),
      shapePoints: Array.isArray(src && src.shapePoints)
        ? src.shapePoints.map(p => ({ ...p }))
        : []
    };
    return { ...base, ...o };
  };

  const cloneRectForClipboard = src => cloneRectModel(src, { id: src.id });
  const cloneRectForDuplicate = src => cloneRectModel(src, { id: st.next++, name: incrementNameNumberBeforeGroup(src.name), x: src.x + 20, y: src.y + 20 });

  const delSel = () => {
    normSelSet();
    if (!st.selSet.size && st.sel == null) {
      if (!getSelectedFlowLinkKeys(st).length) return;
      const list = getFlowLinks(st);
      const next = filterOutSelectedFlowLinks(st, list);
      if (next.length === list.length) return;
      st.flowLinks = next;
      clearSelectedFlowLinks(st);
      st.flowSegmentDrag = null;
      st.flowSegmentHover = null;
      st.flowSegmentPendingTap = null;
      st.flowSegmentSelectedHit = null;
      resetTransientState(false);
      refreshPanels();
      commitUiUpdate({ persist: true, render: true });
      return;
    }
    const ids = st.selSet.size ? new Set(st.selSet) : new Set([st.sel]);
    let removed = false;
    st.rects = st.rects.filter(r => {
      if (!ids.has(r.id)) return true;
      if (isRectLocked(r)) return true;
      removed = true;
      return false;
    });
    if (!removed) return;
    setSelection([], null);
    resetTransientState(false);
    refreshPanels();
    updateClusterEditCursor();
    commitUiUpdate({ persist: true, render: true });
  };

  const dupSel = () => {
    normSelSet();
    const src = getSelectedRects();
    if (!src.length) {
      const r = cur();
      if (!r) return;
      src.push(r);
    }
    const created = [];
    for (const r of src) {
      const c = cloneRectForDuplicate(r);
      insertCloneAboveSource(r.id, c);
      created.push(c.id);
    }
    setSelection(created, created[created.length - 1] || null);
    syncProps();
    listRects();
    setMode("select");
    schedulePersist("project");
  };

  return {
    insertCloneAboveSource,
    cloneRectModel,
    cloneRectForClipboard,
    cloneRectForDuplicate,
    delSel,
    dupSel
  };
};
