export const setupKeyboardController = (deps = {}) => {
  const {
    st, el, render,
    undoHistory, redoHistory, closeHelpModal, setMode,
    isMaskMode, applyMaskPath, delSel, dupSel, cur,
    cloneRectForClipboard, cloneRectForDuplicate, insertCloneAboveSource,
    selRect, schedulePersist, getEditableSelectedRects, commitUiUpdate,
    bindWindowEvent
  } = deps;

  if (!st || !bindWindowEvent) return {};

  const handleKeyDown = e => {
    const key = String((e && e.key) || "");
    const keyLower = key.toLowerCase();
    if (e.key === " ") st.keys.space = true;
    if (e.key === "Control") st.keys.ctrl = true;
    if (e.ctrlKey && keyLower === "z") { undoHistory(); e.preventDefault(); return; }
    if (e.ctrlKey && (keyLower === "y" || (e.shiftKey && keyLower === "z"))) { redoHistory(); e.preventDefault(); return; }
    if (e.key === "Escape") { if (el.helpModal && el.helpModal.classList.contains("show")) { closeHelpModal(); e.preventDefault(); return; } setMode("select"); e.preventDefault(); return; }
    if (isMaskMode() && e.key === "Enter") { applyMaskPath(); e.preventDefault(); return; }
    if (e.key === "Delete") { delSel(); e.preventDefault(); }
    if (e.ctrlKey && keyLower === "d") { dupSel(); e.preventDefault(); }
    if (e.ctrlKey && keyLower === "c") { const r = cur(); if (r) st.clip = cloneRectForClipboard(r); e.preventDefault(); }
    if (e.ctrlKey && keyLower === "v") { if (st.clip) { const c = cloneRectForDuplicate(st.clip); insertCloneAboveSource(st.clip.id, c); selRect(c.id); setMode("select"); schedulePersist("project"); } e.preventDefault(); }
    const selected = getEditableSelectedRects();
    if (selected.length) {
      const s = e.shiftKey ? 10 : 1;
      let dx = 0, dy = 0;
      if (e.key === "ArrowLeft") dx = -s;
      else if (e.key === "ArrowRight") dx = s;
      else if (e.key === "ArrowUp") dy = -s;
      else if (e.key === "ArrowDown") dy = s;
      if (dx || dy) {
        for (const it of selected) { it.x += dx; it.y += dy; }
        commitUiUpdate({ syncProps: true, listRects: true, persist: true, render: true });
        e.preventDefault();
      }
    }
  };
  const handleKeyUp = e => {
    if (e.key === " ") st.keys.space = false;
    if (e.key === "Control") { st.keys.ctrl = false; st.g.x = null; st.g.y = null; st.dg = null; render(); }
  };

  bindWindowEvent("keydown", handleKeyDown);
  bindWindowEvent("keyup", handleKeyUp);

  return { handleKeyDown, handleKeyUp };
};
