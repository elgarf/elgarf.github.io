const escapeHtml = value => String(value == null ? "" : value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const parseSpecSections = text => {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const raw = [];
  let cur = null;
  const flush = () => {
    if (!cur) return;
    raw.push({
      key: "",
      title: cur.title || "Блок",
      level: cur.level || 5,
      body: cur.body.join("\n").trim()
    });
    cur = null;
  };
  for (const line of lines) {
    const h = line.match(/^(#{5,6})\s+(.+)\s*$/);
    if (h) {
      flush();
      cur = { key: "", title: String(h[2] || "").trim(), level: h[1].length, body: [] };
      continue;
    }
    if (!cur) cur = { key: "", title: "Спецификация", level: 5, body: [] };
    cur.body.push(line);
  }
  flush();
  const out = [];
  let parentTitle = "Спецификация";
  const counts = new Map();
  const inc = k => {
    const n = (counts.get(k) || 0) + 1;
    counts.set(k, n);
    return n;
  };
  for (const s of raw) {
    const level = Number(s && s.level) || 5;
    const title = String(s && s.title || "").trim() || (level <= 5 ? "Секция" : "Экран");
    if (level <= 5) {
      parentTitle = title;
      const sem = `h5:${normalizeSemanticToken(title)}`;
      const occ = inc(sem);
      out.push({ ...s, key: `${sem}:${occ}`, title, level: 5 });
      continue;
    }
    const sem = `h6:${normalizeSemanticToken(parentTitle)}:${normalizeSemanticToken(title)}`;
    const occ = inc(sem);
    out.push({ ...s, key: `${sem}:${occ}`, title, level: 6 });
  }
  return out;
};

const toDomId = (prefix, raw) => {
  const base = String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "item";
  return `${prefix}-${base}`;
};

const groupSpecSections = sections => {
  const groups = [];
  let current = null;
  for (const s of (Array.isArray(sections) ? sections : [])) {
    const level = Number(s && s.level) || 5;
    if (level <= 5) {
      current = { parent: s, children: [] };
      groups.push(current);
      continue;
    }
    if (!current) {
      current = {
        parent: { key: "__root__", title: "Спецификация", level: 5, body: "" },
        children: []
      };
      groups.push(current);
    }
    current.children.push(s);
  }
  return groups;
};

const normalizeSemanticToken = raw => String(raw || "")
  .toLowerCase()
  .replace(/\s+/g, " ")
  .trim()
  .replace(/[^a-zа-я0-9@._ -]+/gi, "")
  .replace(/\s+/g, "-");

const sectionSemanticId = section => {
  const level = Number(section && section.level) || 0;
  const title = normalizeSemanticToken(section && section.title);
  return `${level}:${title}`;
};

const extractLegacyTitleFromKey = key => {
  const s = String(key || "");
  const sem = s.match(/^h6:[^:]*:(.*):\d+$/);
  if (sem) return sem[1] || "";
  const m = s.match(/^sec:\d+:(.*)$/);
  if (m) return m[1] || "";
  return s;
};

export const setupSpecViewController = (deps = {}) => {
  const {
    st,
    el,
    wrap,
    normalizeViewMode,
    commitProjectChange,
    getAutoSpecText
  } = deps;

  let autoTextCache = "";
  let autoSig = "";
  let persistTimer = 0;
  let sections = [];
  let sectionGroups = [];
  const editorMap = new Map();
  let easyMdeFailed = false;
  const GLOBAL_SPEC_KEY = "__global__";
  let specEventsBound = false;

  const isSpecMode = () => normalizeViewMode(st.viewMode) === "spec";
  const isEditableSection = s => Number(s && s.level) === 6;
  const hasEasyMde = () => !easyMdeFailed && typeof window !== "undefined" && typeof window.EasyMDE === "function";

  const ensureCustomMap = () => {
    if (!st.specCustomSections || typeof st.specCustomSections !== "object") st.specCustomSections = {};
    return st.specCustomSections;
  };

  const schedulePersist = () => {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = 0;
      if (typeof commitProjectChange === "function") {
        commitProjectChange({ persist: true, persistKind: "project", render: false });
      }
    }, 180);
  };

  const getRectSig = () => {
    const parts = [];
    for (const r of (Array.isArray(st.rects) ? st.rects : [])) {
      parts.push([
        r.id, r.x, r.y, r.width, r.height, r.rotation, r.scale,
        r.cellX, r.cellY, r.dataFlow, r.splitVariant,
        Array.isArray(r.hiddenCells) ? r.hiddenCells.length : 0,
        Array.isArray(r.cellLinks) ? r.cellLinks.length : 0,
        Array.isArray(r.manualClusters) ? r.manualClusters.length : 0
      ].join(":"));
    }
    return `${parts.join(";")}|L${Array.isArray(st.flowLinks) ? st.flowLinks.length : 0}`;
  };

  const disposeEditors = () => {
    for (const [, editor] of editorMap.entries()) {
      try { if (editor && typeof editor.toTextArea === "function") editor.toTextArea(); } catch (_e) { }
    }
    editorMap.clear();
  };

  const bindPlainTextarea = (ta, key) => {
    ta.addEventListener("input", () => {
      const map = ensureCustomMap();
      const text = String(ta.value || "");
      if (text.trim()) map[key] = text;
      else delete map[key];
      const sub = findSubSectionByKey(key);
      if (sub) sub.classList.toggle("has-manual", !!text.trim());
      const parent = findParentSectionByKey(key);
      if (parent && key === GLOBAL_SPEC_KEY) parent.classList.toggle("has-manual", !!text.trim());
      schedulePersist();
    });
  };

  const findSubSectionByKey = key => {
    if (!el.specAutoBlocks) return null;
    const items = el.specAutoBlocks.querySelectorAll(".spec-mode-sub[data-section-key]");
    for (const item of items) {
      if (String(item.getAttribute("data-section-key") || "") === String(key || "")) return item;
    }
    return null;
  };

  const findParentSectionByKey = key => {
    if (!el.specAutoBlocks) return null;
    const items = el.specAutoBlocks.querySelectorAll(".spec-mode-parent[data-section-key]");
    for (const item of items) {
      if (String(item.getAttribute("data-section-key") || "") === String(key || "")) return item;
    }
    return null;
  };

  const bindSpecBlockEvents = () => {
    if (specEventsBound || !el.specAutoBlocks) return;
    specEventsBound = true;
    el.specAutoBlocks.addEventListener("shown.bs.collapse", evt => {
      const target = evt && evt.target;
      if (!target || !(target instanceof HTMLElement)) return;
      const sub = target.closest(".spec-mode-sub[data-section-key]");
      if (!sub) return;
      const key = String(sub.getAttribute("data-section-key") || "");
      if (!key) return;
      const editor = editorMap.get(key);
      if (editor && editor.codemirror) {
        const text = String((ensureCustomMap()[key] ?? ""));
        if (String(editor.value() || "") !== text) editor.value(text);
        try { editor.codemirror.refresh(); } catch (_e) { }
        return;
      }
      const ta = target.querySelector("textarea[data-spec-edit]");
      if (ta instanceof HTMLTextAreaElement) {
        const text = String((ensureCustomMap()[key] ?? ta.value ?? ""));
        if (ta.value !== text) ta.value = text;
      }
    });
  };

  const initEditors = () => {
    if (!el.specAutoBlocks) return;
    bindSpecBlockEvents();
    disposeEditors();
    const customMap = ensureCustomMap();
    const textareas = el.specAutoBlocks.querySelectorAll("textarea[data-spec-edit]");
    for (const ta of textareas) {
      const key = String(ta.getAttribute("data-spec-edit") || "");
      if (!key) continue;
      ta.value = String(customMap[key] ?? ta.value ?? "");
      if (!hasEasyMde()) {
        bindPlainTextarea(ta, key);
        continue;
      }
      try {
        const editor = new window.EasyMDE({
          element: ta,
          autofocus: false,
          spellChecker: false,
          status: false,
          autoDownloadFontAwesome: false,
          forceSync: true,
          lineWrapping: true,
          sideBySideFullscreen: false,
          toolbar: [
            "bold", "italic", "heading", "|",
            "unordered-list", "ordered-list", "|",
            "quote", "code", "link"
          ]
        });
        editor.value(String(customMap[key] ?? ta.value ?? ""));
        editor.codemirror.on("change", () => {
          const map = ensureCustomMap();
          const text = String(editor.value() || "");
          if (text.trim()) map[key] = text;
          else delete map[key];
          const sub = findSubSectionByKey(key);
          if (sub) sub.classList.toggle("has-manual", !!text.trim());
          const parent = findParentSectionByKey(key);
          if (parent && key === GLOBAL_SPEC_KEY) parent.classList.toggle("has-manual", !!text.trim());
          schedulePersist();
        });
        editorMap.set(key, editor);
        setTimeout(() => {
          try { editor.codemirror.refresh(); } catch (_e) { }
        }, 0);
      } catch (_e) {
        easyMdeFailed = true;
        bindPlainTextarea(ta, key);
      }
    }
  };

  const renderSections = () => {
    if (!el.specAutoBlocks) return;
    if (!sectionGroups.length) {
      el.specAutoBlocks.innerHTML = `<div class="spec-mode-empty">Нет данных для спецификации</div>`;
      disposeEditors();
      return;
    }
    const map = ensureCustomMap();
    const renderChild = (s, parentAccordionId) => {
      const custom = String(map[s.key] || "");
      const hasManual = !!custom.trim();
      const manual = isEditableSection(s)
        ? (`<div class="spec-mode-manual">`
          + `<div class="spec-mode-manual-edit">`
          + `<textarea class="form-control form-control-sm" spellcheck="false" data-spec-edit="${escapeHtml(s.key)}" placeholder="- Доп. пункт 1&#10;- Доп. пункт 2">${escapeHtml(custom)}</textarea>`
          + `</div>`
          + `</div>`)
        : "";
      const itemId = toDomId("spec-sub", s.key);
      const headingId = `${itemId}-h`;
      const collapseId = `${itemId}-c`;
      return (
        `<div class="accordion-item spec-mode-sub ${hasManual ? "has-manual" : ""}" data-section-key="${escapeHtml(s.key)}">`
        + `<h2 class="accordion-header" id="${escapeHtml(headingId)}">`
        + `<button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${escapeHtml(collapseId)}" aria-expanded="false" aria-controls="${escapeHtml(collapseId)}">`
        + `${escapeHtml(s.title || "Блок")}`
        + `</button>`
        + `</h2>`
        + `<div id="${escapeHtml(collapseId)}" class="accordion-collapse collapse" aria-labelledby="${escapeHtml(headingId)}" data-bs-parent="#${escapeHtml(parentAccordionId)}">`
        + `<div class="accordion-body">`
        + `<pre>${escapeHtml(String(s.body || "").trim() || "—")}</pre>`
        + manual
        + `</div>`
        + `</div>`
        + `</div>`
      );
    };
    const globalText = String(map[GLOBAL_SPEC_KEY] || "");
    const globalHasManual = !!globalText.trim();
    const globalBlock = (
      `<section class="spec-mode-block spec-mode-parent ${globalHasManual ? "has-manual" : ""}" data-section-key="${GLOBAL_SPEC_KEY}">`
      + `<header>Общее дополнение</header>`
      + `<div class="spec-mode-manual">`
      + `<div class="spec-mode-manual-edit">`
      + `<textarea class="form-control form-control-sm" spellcheck="false" data-spec-edit="${GLOBAL_SPEC_KEY}" placeholder="- Общие замечания">${escapeHtml(globalText)}</textarea>`
      + `</div>`
      + `</div>`
      + `</section>`
    );
    const html = globalBlock + sectionGroups.map((g, idx) => {
      const parent = g && g.parent ? g.parent : { title: "Секция", body: "" };
      const parentBody = String(parent.body || "").trim();
      const parentPre = parentBody ? `<pre>${escapeHtml(parentBody)}</pre>` : "";
      const parentAccordionId = `spec-accordion-${idx}`;
      const children = (Array.isArray(g && g.children) ? g.children : []).map(s => renderChild(s, parentAccordionId)).join("");
      const accordion = children ? `<div id="${escapeHtml(parentAccordionId)}" class="accordion spec-mode-accordion">${children}</div>` : "";
      return (
        `<section class="spec-mode-block spec-mode-parent" data-section-key="${escapeHtml(parent.key || "")}">`
        + `<header>${escapeHtml(parent.title || "Секция")}</header>`
        + parentPre
        + accordion
        + `</section>`
      );
    }).join("");
    el.specAutoBlocks.innerHTML = html;
    initEditors();
  };

  const migrateLegacyCustomText = () => {
    const map = ensureCustomMap();
    if (Object.keys(map).length) return;
    if (!String(st.specCustomText || "").trim()) return;
    const firstEditable = sections.find(isEditableSection);
    if (!firstEditable) return;
    map[firstEditable.key] = String(st.specCustomText || "");
    st.specCustomText = "";
    renderSections();
    schedulePersist();
  };

  const remapCustomSectionsBySemantic = nextSections => {
    const map = ensureCustomMap();
    const entries = Object.entries(map || {});
    if (!entries.length) return false;
    const editable = (Array.isArray(nextSections) ? nextSections : []).filter(isEditableSection);
    if (!editable.length) return false;

    const direct = new Set(editable.map(s => s.key));
    let needRemap = false;
    for (const [k] of entries) {
      if (!direct.has(k)) { needRemap = true; break; }
    }
    if (!needRemap) return false;

    const buckets = new Map();
    for (const s of editable) {
      const sem = sectionSemanticId(s);
      if (!buckets.has(sem)) buckets.set(sem, []);
      buckets.get(sem).push(s.key);
    }

    const nextMap = {};
    const orphans = [];
    for (const [k, v] of entries) {
      const text = String(v || "");
      if (!text.trim()) continue;
      if (k === GLOBAL_SPEC_KEY) {
        nextMap[k] = text;
        continue;
      }
      if (direct.has(k)) {
        nextMap[k] = text;
        continue;
      }
      const legacySem = `6:${normalizeSemanticToken(extractLegacyTitleFromKey(k))}`;
      const list = buckets.get(legacySem) || [];
      const slot = list.find(id => !nextMap[id]);
      if (slot) nextMap[slot] = text;
      else orphans.push(text);
    }
    if (orphans.length) {
      const prev = String(nextMap[GLOBAL_SPEC_KEY] || "");
      const tail = orphans.map((t, i) => `- Перенесено (${i + 1}): ${t}`).join("\n");
      nextMap[GLOBAL_SPEC_KEY] = prev ? `${prev}\n${tail}` : tail;
    }

    const changed = JSON.stringify(map) !== JSON.stringify(nextMap);
    if (!changed) return false;
    st.specCustomSections = nextMap;
    return true;
  };

  const refreshAutoSpec = (force = false) => {
    if (!isSpecMode() && !force) return;
    const nextSig = getRectSig();
    if (!force && nextSig === autoSig) {
      if (editorMap.size === 0) initEditors();
      return;
    }
    autoSig = nextSig;
    const text = (typeof getAutoSpecText === "function") ? String(getAutoSpecText() || "") : "";
    if (!force && text === autoTextCache) {
      if (editorMap.size === 0) initEditors();
      return;
    }
    autoTextCache = text;
    sections = parseSpecSections(text);
    const remapped = remapCustomSectionsBySemantic(sections);
    sectionGroups = groupSpecSections(sections);
    renderSections();
    if (remapped) schedulePersist();
    migrateLegacyCustomText();
  };

  const updateSpecViewUi = (force = false) => {
    const show = isSpecMode();
    if (wrap) wrap.dataset.viewMode = show ? "spec" : "canvas";
    if (el.specModePanel) el.specModePanel.classList.toggle("d-none", !show);
    if (el.viewModeSpec) {
      el.viewModeSpec.classList.remove("btn-secondary");
      el.viewModeSpec.classList.toggle("btn-primary", show);
      el.viewModeSpec.classList.toggle("btn-outline-secondary", !show);
      el.viewModeSpec.setAttribute("aria-pressed", show ? "true" : "false");
    }
    if (el.mViewModeSpec) {
      el.mViewModeSpec.classList.remove("btn-secondary");
      el.mViewModeSpec.classList.toggle("btn-primary", show);
      el.mViewModeSpec.classList.toggle("btn-outline-secondary", !show);
      el.mViewModeSpec.setAttribute("aria-pressed", show ? "true" : "false");
    }
    if (!show) {
      disposeEditors();
      return;
    }
    easyMdeFailed = false;
    refreshAutoSpec(!!force);
  };

  return {
    isSpecMode,
    refreshAutoSpec,
    updateSpecViewUi
  };
};
