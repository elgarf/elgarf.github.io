export const setupNoteEditorController = (deps) => {
  const {
    wrap,
    getRectById,
    isNoteRect,
    invalidateRectCache,
    render,
    schedulePersist,
    rectAABB,
    w2s,
    focusAndSelect,
    getZoom
  } = deps || {};

  let noteEditorEl = null;

  const ensureNoteEditorEl = () => {
    if (noteEditorEl && noteEditorEl.parentElement) return noteEditorEl;
    if (!wrap) return null;
    const ta = document.createElement("textarea");
    ta.className = "note-editor-overlay";
    ta.spellcheck = false;
    ta.placeholder = "Введите текст примечания";
    ta.style.display = "none";
    ta.addEventListener("input", () => {
      const id = Math.round(Number(ta.dataset.rectId) || 0);
      if (!id) return;
      const r = getRectById(id);
      if (!r || !isNoteRect(r)) return;
      r.noteText = String(ta.value || "");
      invalidateRectCache(r, "appearance");
      render();
    });
    ta.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      closeNoteEditor(true);
    });
    ta.addEventListener("blur", () => closeNoteEditor(true));
    wrap.appendChild(ta);
    noteEditorEl = ta;
    return noteEditorEl;
  };

  function closeNoteEditor(commit = true) {
    const ta = ensureNoteEditorEl();
    if (!ta) return;
    const id = Math.round(Number(ta.dataset.rectId) || 0);
    if (commit && id) {
      const r = getRectById(id);
      if (r && isNoteRect(r)) {
        r.noteText = String(ta.value || "");
        invalidateRectCache(r, "appearance");
        schedulePersist("project");
      }
    }
    ta.dataset.rectId = "";
    ta.style.display = "none";
  }

  function updateNoteEditorOverlay() {
    const ta = ensureNoteEditorEl();
    if (!ta || ta.style.display === "none") return;
    const id = Math.round(Number(ta.dataset.rectId) || 0);
    if (!id) {
      ta.style.display = "none";
      return;
    }
    const r = getRectById(id);
    if (!r || !isNoteRect(r)) {
      ta.style.display = "none";
      return;
    }
    const bb = rectAABB(r);
    const p0 = w2s(bb.minX, bb.minY);
    const p1 = w2s(bb.maxX, bb.maxY);
    const left = Math.min(p0.x, p1.x);
    const top = Math.min(p0.y, p1.y);
    const width = Math.max(60, Math.abs(p1.x - p0.x));
    const height = Math.max(40, Math.abs(p1.y - p0.y));
    ta.style.left = `${Math.round(left)}px`;
    ta.style.top = `${Math.round(top)}px`;
    ta.style.width = `${Math.round(width)}px`;
    ta.style.height = `${Math.round(height)}px`;
    const zoom = Math.max(0.8, Number(getZoom?.()) || 1);
    ta.style.fontSize = `${Math.max(11, Math.min(26, Math.round(12 * zoom)))}px`;
  }

  function openNoteEditor(id) {
    const r = getRectById(id);
    if (!r || !isNoteRect(r)) return;
    const ta = ensureNoteEditorEl();
    if (!ta) return;
    ta.dataset.rectId = String(id);
    ta.value = String(r.noteText || "");
    ta.style.display = "block";
    updateNoteEditorOverlay();
    focusAndSelect(ta);
  }

  return {
    ensureNoteEditorEl,
    closeNoteEditor,
    openNoteEditor,
    updateNoteEditorOverlay
  };
};
