export const setupProjectLoadController = (deps = {}) => {
  const {
    el,
    bindClick,
    withUiErrorBoundary,
    extractProjectFromPngBytes,
    PNG_PROJECT_META_KEY,
    showMessageModal,
    showErrorModal,
    loadProjectIntoActiveState,
    syncActiveTabSnapshot,
    renderProjectTabs,
    schedulePersist
  } = deps;

  const applyLoadedProjectData = (data, persistKind = "all") => {
    loadProjectIntoActiveState(data);
    syncActiveTabSnapshot();
    renderProjectTabs();
    schedulePersist(persistKind);
  };

  const loadProjectFromFile = async f => {
    const name = String(f && f.name || "").toLowerCase();
    const type = String(f && f.type || "").toLowerCase();
    const isPng = type === "image/png" || name.endsWith(".png");
    if (isPng) {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const text = extractProjectFromPngBytes(bytes, PNG_PROJECT_META_KEY);
      if (!text) {
        showMessageModal("Данное изображение не содержит данных проекта", "Импорт PNG");
        return;
      }
      try {
        const d = JSON.parse(text);
        applyLoadedProjectData(d, "all");
      } catch (err) {
        showErrorModal("Ошибка импорта", err, "Ошибка данных проекта в PNG");
      }
      return;
    }
    const text = await f.text();
    try {
      const d = JSON.parse(String(text || "{}"));
      applyLoadedProjectData(d, "all");
    } catch (err) {
      showErrorModal("Ошибка импорта", err, "Ошибка JSON");
    }
  };

  const bindProjectLoadHandlers = () => {
    bindClick(el && el.load, () => {
      if (el && el.file) el.file.click();
    });
    if (!el || !el.file) return;
    el.file.addEventListener("change", async () => {
      const f = el.file.files && el.file.files[0];
      if (!f) return;
      try {
        await withUiErrorBoundary("Ошибка загрузки", async () => await loadProjectFromFile(f), "Ошибка загрузки файла");
      } finally {
        el.file.value = "";
      }
    });
  };

  return {
    applyLoadedProjectData,
    loadProjectFromFile,
    bindProjectLoadHandlers
  };
};
