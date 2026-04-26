import { setupRectListController } from "../rect-list-controller.js";

export const setupSelectionUiFeature = (deps = {}) => {
  const {
    st,
    el,
    bindEvent,
    eventClosest,
    getRectById,
    isRectLocked,
    hasRect,
    normSelSet,
    toggleSelect,
    selectOnly,
    resetSelectionTransient,
    findManualClusterById,
    isNoteRect,
    closeNoteEditor,
    syncProps,
    updateModeBadges,
    updateClusterEditCursor,
    render,
    isSelected,
    toggleRectLockById,
    persistProjectAndRender,
    syncPropsSmart
  } = deps;

  const syncSelectionProps = () => {
    if (typeof syncPropsSmart === "function") syncPropsSmart();
    else syncProps();
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => {
      if (typeof syncPropsSmart === "function") syncPropsSmart();
      else syncProps();
    });
  };

  const selRect = (id, opts) => {
    if (id != null) {
      const rr = getRectById(id);
      if (rr && isRectLocked(rr)) return;
    }
    const o = (opts && typeof opts === "object") ? opts : {};
    if (o.toggle) toggleSelect(id);
    else if (o.add) {
      normSelSet();
      if (id != null && hasRect(id)) { st.selSet.add(id); st.sel = id; }
      if (typeof deps.refreshMultiSelectionBase === "function") deps.refreshMultiSelectionBase();
    } else selectOnly(id);
    resetSelectionTransient();
    const r = getRectById(st.sel) || null;
    if (!r || !findManualClusterById(r, st.clusterActiveId)) st.clusterActiveId = null;
    if (!r || !isNoteRect(r)) closeNoteEditor(true);
    syncSelectionProps();
    listRects();
    updateModeBadges(r);
    updateClusterEditCursor();
    render();
  };

  const cur = () => getRectById(st.sel) || null;

  const listCtrl = setupRectListController({
    st, el, bindEvent, eventClosest,
    toggleRectLockById, getRectById, isRectLocked, selRect,
    onReorder: () => { listRects(); persistProjectAndRender(); }
  });

  const listRects = () => {
    listCtrl.ensureListEvents();
    if (!st.rects.length) {
      listCtrl.listNodeCache.clear();
      listCtrl.clearListDropMarker();
      el.list.innerHTML = "<p class='hint' style='margin:0'>Экранов пока нет.</p>";
      return;
    }
    const fragment = document.createDocumentFragment();
    const live = new Set();
    for (const r of st.rects) {
      const id = Math.round(Number(r.id) || 0);
      if (!id) continue;
      live.add(id);
      let node = listCtrl.listNodeCache.get(id);
      if (!node) {
        node = document.createElement("div");
        node.className = "rect-item";
        node.draggable = true;
        node.dataset.id = String(id);
        const head = document.createElement("div");
        head.className = "rect-item-head";
        const title = document.createElement("strong");
        title.className = "rect-item-title";
        const lockBtn = document.createElement("button");
        lockBtn.type = "button";
        lockBtn.className = "btn btn-outline-secondary btn-sm rect-item-lock";
        lockBtn.title = "Блокировка экрана";
        lockBtn.setAttribute("aria-label", "Блокировка экрана");
        const meta = document.createElement("div");
        meta.className = "text-secondary";
        head.appendChild(title);
        head.appendChild(lockBtn);
        node.appendChild(head);
        node.appendChild(meta);
        node._title = title;
        node._lock = lockBtn;
        node._meta = meta;
        listCtrl.listNodeCache.set(id, node);
      }
      node.classList.toggle("active", isSelected(id));
      node.classList.toggle("locked", isRectLocked(r));
      if (node._lock) {
        const on = isRectLocked(r);
        const ic = on ? "fa-solid fa-lock" : "fa-solid fa-lock-open";
        if (node._lock.innerHTML !== `<i class="${ic}"></i>`) node._lock.innerHTML = `<i class="${ic}"></i>`;
        node._lock.classList.toggle("btn-primary", on);
        node._lock.classList.toggle("btn-outline-secondary", !on);
        node._lock.title = on ? "Разблокировать экран" : "Заблокировать экран";
        node._lock.setAttribute("aria-label", node._lock.title);
      }
      const titleText = String(r.name || `Rect ${id}`);
      if (node._title.textContent !== titleText) node._title.textContent = titleText;
      const metaText = `${r.width}x${r.height} @ (${r.x}, ${r.y})`;
      if (node._meta.textContent !== metaText) node._meta.textContent = metaText;
      fragment.appendChild(node);
    }
    for (const [id, node] of listCtrl.listNodeCache) {
      if (live.has(id)) continue;
      if (node && node.parentNode) node.parentNode.removeChild(node);
      listCtrl.listNodeCache.delete(id);
    }
    el.list.replaceChildren(fragment);
  };

  return {
    selRect,
    cur,
    listRects
  };
};
