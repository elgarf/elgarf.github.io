import { setupProjectLinkActionsController } from "../ui/project-link-actions-controller.js";

export const setupProjectActionsFeature = (deps = {}) => {
  const {
    windowRef = window,
    documentRef = document,
    navigatorRef = navigator,
    locationRef = location,
    promptFn = prompt,
    showErrorModal,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    getCurrentSaveLocationId,

    el,
    bindClick,
    withUiErrorBoundary,
    extractProjectFromPngBytes,
    PNG_PROJECT_META_KEY,
    showMessageModal,
    loadProjectIntoActiveState,
    syncActiveTabSnapshot,
    renderProjectTabs,
    schedulePersist,

    bindEvent,
    eventClosest,
    showProjectLinkModal,
    encodeProjectToQueryValue,
    buildPortableProject,
    saveProjectToServer,
    getProjectName,
    PROJECT_QUERY_PARAM,
    PROJECT_ID_PARAM,

    saveButton,
    buildProject,
    projectFileBase,
    getSaveLocationId
  } = deps;

  const askFileName = (def, ext) => {
    const raw = promptFn("Имя файла:", def);
    if (raw == null) return null;
    let name = String(raw).trim();
    if (!name) name = def;
    if (!String(name).toLowerCase().endsWith(ext)) name += ext;
    return name;
  };
  const isTauriRuntime = () => {
    const ua = (navigatorRef && navigatorRef.userAgent) || "";
    const protocol = (locationRef && locationRef.protocol) || "";
    return !!(
      windowRef.__TAURI_INTERNALS__ ||
      windowRef.__TAURI__ ||
      windowRef.__TAURI_IPC__ ||
      /\bTauri\b/i.test(ua) ||
      protocol === "tauri:" ||
      protocol === "asset:"
    );
  };
  const tauriInvoke = (cmd, args) => {
    if (windowRef.__TAURI_INTERNALS__ && typeof windowRef.__TAURI_INTERNALS__.invoke === "function") return windowRef.__TAURI_INTERNALS__.invoke(cmd, args);
    if (windowRef.__TAURI__ && windowRef.__TAURI__.core && typeof windowRef.__TAURI__.core.invoke === "function") return windowRef.__TAURI__.core.invoke(cmd, args);
    if (windowRef.__TAURI__ && typeof windowRef.__TAURI__.invoke === "function") return windowRef.__TAURI__.invoke(cmd, args);
    throw new Error("Tauri invoke API not available");
  };
  const blobToBase64 = async blob => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const chunk = 0x8000;
    let bin = "";
    for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
    return btoa(bin);
  };
  const saveBlobWithSystemDialog = async (blob, suggestedName, mime, ext, description, saveLocationId = null) => {
    const currentId = typeof getCurrentSaveLocationId === "function" ? getCurrentSaveLocationId() : "";
    const globalId = typeof getGlobalSaveLocationId === "function" ? getGlobalSaveLocationId() : "";
    const effectiveSaveLocationId = setGlobalSaveLocationId(saveLocationId || currentId || globalId);
    if (isTauriRuntime()) {
      try {
        const dataBase64 = await blobToBase64(blob);
        await tauriInvoke("save_file_dialog", { suggestedName, dataBase64 });
        return;
      } catch (err) {
        if (typeof showErrorModal === "function") showErrorModal("Ошибка сохранения", err, "Ошибка нативного сохранения (Tauri)");
        return;
      }
    }
    if (windowRef.showSaveFilePicker) {
      try {
        const handle = await windowRef.showSaveFilePicker({
          id: effectiveSaveLocationId,
          suggestedName,
          types: [{ description, accept: { [mime]: [ext] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
        console.warn("showSaveFilePicker failed, fallback to download:", err);
      }
    }
    const name = askFileName(suggestedName, ext);
    if (!name) return;
    const url = URL.createObjectURL(blob);
    const a = documentRef.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        applyLoadedProjectData(JSON.parse(text), "all");
      } catch (err) {
        showErrorModal("Ошибка импорта", err, "Ошибка данных проекта в PNG");
      }
      return;
    }
    try {
      applyLoadedProjectData(JSON.parse(String(await f.text() || "{}")), "all");
    } catch (err) {
      showErrorModal("Ошибка импорта", err, "Ошибка JSON");
    }
  };
  const bindProjectLoadHandlers = () => {
    bindClick(el && el.load, () => { if (el && el.file) el.file.click(); });
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

  const { bindProjectLinkHandlers } = setupProjectLinkActionsController({
    el,
    bindEvent,
    eventClosest,
    showProjectLinkModal,
    withUiErrorBoundary,
    encodeProjectToQueryValue,
    buildPortableProject,
    saveProjectToServer,
    getProjectName,
    PROJECT_QUERY_PARAM,
    PROJECT_ID_PARAM
  });

  bindProjectLoadHandlers();
  bindProjectLinkHandlers();
  if (typeof bindClick === "function" && saveButton) {
    bindClick(saveButton, async () => {
      const text = JSON.stringify(buildProject(), null, 2);
      const blob = new Blob([text], { type: "application/json" });
      await saveBlobWithSystemDialog(
        blob,
        `${projectFileBase()}.json`,
        "application/json",
        ".json",
        "JSON files",
        getSaveLocationId()
      );
    });
  }

  return {
    saveBlobWithSystemDialog
  };
};
