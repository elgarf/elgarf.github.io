export const setupProjectSaveDialogController = (deps = {}) => {
  const {
    windowRef = window,
    documentRef = document,
    navigatorRef = navigator,
    locationRef = location,
    promptFn = prompt,
    showErrorModal,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    getCurrentSaveLocationId
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
        if (typeof showErrorModal === "function") {
          showErrorModal("Ошибка сохранения", err, "Ошибка нативного сохранения (Tauri)");
        }
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

  return {
    askFileName,
    isTauriRuntime,
    saveBlobWithSystemDialog
  };
};
