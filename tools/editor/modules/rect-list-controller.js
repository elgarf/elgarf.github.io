export const setupRectListController = (deps = {}) => {
  const {
    st, el, bindEvent, eventClosest,
    toggleRectLockById, getRectById, isRectLocked, selRect,
    onReorder
  } = deps;

  const state = {
    listDragId: null,
    listDropNode: null,
    listDropAfter: false,
    listListBound: false,
    listNodeCache: new Map()
  };

  const clearListDropMarker = () => {
    if (!state.listDropNode) return;
    state.listDropNode.classList.remove("drop-before", "drop-after");
    state.listDropNode = null;
    state.listDropAfter = false;
  };

  const reorderRects = (dragId, targetId, after = false) => {
    const from = st.rects.findIndex(r => r.id === dragId);
    const to0 = st.rects.findIndex(r => r.id === targetId);
    if (from < 0 || to0 < 0 || from === to0) return false;
    const [item] = st.rects.splice(from, 1);
    let to = to0;
    if (from < to) to--;
    if (after) to++;
    to = Math.max(0, Math.min(st.rects.length, to));
    st.rects.splice(to, 0, item);
    return true;
  };

  const ensureListEvents = () => {
    if (state.listListBound || !el.list) return;
    state.listListBound = true;

    bindEvent(el.list, "click", e => {
      const lockBtn = eventClosest(e, ".rect-item-lock");
      if (lockBtn) {
        const row = lockBtn.closest(".rect-item");
        const id = Math.round(Number(row && row.dataset && row.dataset.id) || 0);
        if (id) toggleRectLockById(id);
        return;
      }
      const it = eventClosest(e, ".rect-item");
      if (!it) return;
      const id = Math.round(Number(it.dataset.id) || 0);
      if (!id) return;
      const rr = getRectById(id);
      if (rr && isRectLocked(rr)) return;
      selRect(id, { toggle: !!e.shiftKey });
    });

    bindEvent(el.list, "dragstart", e => {
      const it = eventClosest(e, ".rect-item");
      if (!it) return;
      const id = Math.round(Number(it.dataset.id) || 0);
      if (!id) return;
      const rr = getRectById(id);
      if (rr && isRectLocked(rr)) { e.preventDefault(); return; }
      state.listDragId = id;
      it.classList.add("dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", String(id)); } catch { /* noop */ }
      }
    });

    bindEvent(el.list, "dragend", e => {
      const it = eventClosest(e, ".rect-item");
      if (it) it.classList.remove("dragging");
      state.listDragId = null;
      clearListDropMarker();
    });

    bindEvent(el.list, "dragover", e => {
      if (state.listDragId == null) return;
      const it = eventClosest(e, ".rect-item");
      if (!it) return;
      e.preventDefault();
      const rect = it.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      if (it === state.listDropNode && after === state.listDropAfter) return;
      clearListDropMarker();
      state.listDropNode = it;
      state.listDropAfter = after;
      it.classList.add(after ? "drop-after" : "drop-before");
    });

    bindEvent(el.list, "drop", e => {
      if (state.listDragId == null) return;
      const it = eventClosest(e, ".rect-item");
      e.preventDefault();
      if (!it) {
        state.listDragId = null;
        clearListDropMarker();
        return;
      }
      const targetId = Math.round(Number(it.dataset.id) || 0);
      const after = state.listDropNode === it ? state.listDropAfter : false;
      if (targetId && reorderRects(state.listDragId, targetId, after)) {
        if (typeof onReorder === "function") onReorder();
      }
      state.listDragId = null;
      clearListDropMarker();
    });
  };

  return {
    ensureListEvents,
    clearListDropMarker,
    listNodeCache: state.listNodeCache
  };
};


