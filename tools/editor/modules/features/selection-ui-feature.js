import { setupRectListController } from "../rect-list-controller.js";
import { runSmartSyncProps } from "../utils/sync-props.js";

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
    syncPropsSmart,
    t = value => value
  } = deps;
  const groupCollapsed = {
    notes: false,
    devices: false,
    screens: false
  };
  let groupToggleBound = false;
  const clampByte = v => Math.max(0, Math.min(255, Math.round(Number(v) || 0)));
  const parseHexColor = value => {
    const s = String(value || "").trim();
    const hex = s.startsWith("#") ? s.slice(1) : s;
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16)
      };
    }
    if (/^[0-9a-fA-F]{6}$/.test(hex)) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
      };
    }
    return null;
  };
  const relativeLuminance = rgb => {
    const toLin = c => {
      const v = clampByte(c) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.0722 * toLin(rgb.b);
  };
  const contrastTextColor = bgHex => {
    const rgb = parseHexColor(bgHex);
    if (!rgb) return "#f8fafc";
    const lum = relativeLuminance(rgb);
    return lum > 0.45 ? "#0f172a" : "#f8fafc";
  };

  const syncSelectionProps = () => {
    runSmartSyncProps(syncPropsSmart, syncProps);
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => {
      runSmartSyncProps(syncPropsSmart, syncProps);
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
    if (!groupToggleBound && el.list) {
      groupToggleBound = true;
      bindEvent(el.list, "click", e => {
        const btn = eventClosest(e, ".rect-list-group-toggle");
        if (!btn) return;
        const key = String(btn.getAttribute("data-group") || "");
        if (!Object.prototype.hasOwnProperty.call(groupCollapsed, key)) return;
        groupCollapsed[key] = !groupCollapsed[key];
        listRects();
      });
    }
    if (!st.rects.length) {
      listCtrl.listNodeCache.clear();
      listCtrl.clearListDropMarker();
      el.list.innerHTML = `<p class='hint' style='margin:0'>${t("Экранов пока нет.")}</p>`;
      return;
    }
    const fragment = document.createDocumentFragment();
    const noteNodes = [];
    const deviceNodes = [];
    const screenNodes = [];
    const appendGroup = (groupKey, titleText, nodes) => {
      if (!nodes.length) return;
      const collapsed = !!groupCollapsed[groupKey];
      const group = document.createElement("section");
      group.className = "rect-list-group";
      group.setAttribute("data-group", groupKey);
      const title = document.createElement("button");
      title.type = "button";
      title.className = "rect-list-group-title rect-list-group-toggle";
      title.setAttribute("data-group", groupKey);
      title.setAttribute("aria-expanded", collapsed ? "false" : "true");
      title.innerHTML = `<i class="fa-solid ${collapsed ? "fa-chevron-right" : "fa-chevron-down"}"></i><span>${titleText}</span>`;
      group.appendChild(title);
      if (!collapsed) {
        const body = document.createElement("div");
        body.className = "rect-list-group-body";
        for (const node of nodes) body.appendChild(node);
        group.appendChild(body);
      }
      fragment.appendChild(group);
    };
    const kindOf = r => String((r && r.kind) || "").toLowerCase();
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
        lockBtn.title = t("Блокировка экрана");
        lockBtn.setAttribute("aria-label", t("Блокировка экрана"));
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
        node._lock.title = on ? t("Разблокировать экран") : t("Заблокировать экран");
        node._lock.setAttribute("aria-label", node._lock.title);
      }
      const titleText = String(r.name || `Rect ${id}`);
      if (node._title.textContent !== titleText) node._title.textContent = titleText;
      const metaText = `${r.width}x${r.height} @ (${r.x}, ${r.y})`;
      if (node._meta.textContent !== metaText) node._meta.textContent = metaText;
      const baseColor = String(r && r.colorA || "").trim();
      if (baseColor) {
        const textColor = contrastTextColor(baseColor);
        node.style.background = baseColor;
        node.style.borderColor = baseColor;
        node.style.color = textColor;
        if (node._meta) node._meta.style.setProperty("color", textColor, "important");
        if (node._lock) {
          node._lock.style.color = textColor;
          node._lock.style.borderColor = textColor;
          node._lock.style.background = "transparent";
        }
      } else {
        node.style.background = "";
        node.style.borderColor = "";
        node.style.color = "";
        if (node._meta) node._meta.style.removeProperty("color");
        if (node._lock) {
          node._lock.style.color = "";
          node._lock.style.borderColor = "";
          node._lock.style.background = "";
        }
      }
      const kind = kindOf(r);
      if (kind === "note") noteNodes.push(node);
      else if (kind === "device") deviceNodes.push(node);
      else screenNodes.push(node);
    }
    for (const [id, node] of listCtrl.listNodeCache) {
      if (live.has(id)) continue;
      if (node && node.parentNode) node.parentNode.removeChild(node);
      listCtrl.listNodeCache.delete(id);
    }
    appendGroup("notes", t("Примечания"), noteNodes);
    appendGroup("devices", t("Устройства"), deviceNodes);
    appendGroup("screens", t("Экраны"), screenNodes);
    el.list.replaceChildren(fragment);
  };

  return {
    selRect,
    cur,
    listRects
  };
};
