export const createExportPackageWriter = (deps = {}) => {
  const {
    st,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    saveStatus,
    saveBlobWithSystemDialog,
    projectFileBase,
    t = value => value
  } = deps;

  const writeFileToDirectory = async (dirHandle, fileName, blob) => {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  };

  const requestPackageDirectory = async () => {
    if (!window.showDirectoryPicker) return null;
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: "readwrite", id: setGlobalSaveLocationId(st.saveLocationId || getGlobalSaveLocationId()) });
      return { dirHandle };
    } catch (err) {
      if (err && err.name === "AbortError") return { aborted: true };
      console.warn("showDirectoryPicker failed, fallback to save dialogs:", err);
      return null;
    }
  };

  const writePackageFiles = async ({ pngArt, pngFlow, pngRig, pngFlowOnly, specBlob, projectBlob }, opts = {}) => {
    const baseName = projectFileBase();
    const fileArt = `${baseName}.png`;
    const fileFlow = `${baseName}-flow.png`;
    const fileRig = `${baseName}-rig.png`;
    const fileFlowOnly = `${baseName}-flow-only.png`;
    const fileSpec = `${baseName}.md`;
    const fileProject = `${baseName}.json`;
    const dirHandle = opts && opts.dirHandle;
    if (dirHandle) {
      await writeFileToDirectory(dirHandle, fileArt, pngArt);
      await writeFileToDirectory(dirHandle, fileFlow, pngFlow);
      if (pngRig) await writeFileToDirectory(dirHandle, fileRig, pngRig);
      if (pngFlowOnly) await writeFileToDirectory(dirHandle, fileFlowOnly, pngFlowOnly);
      await writeFileToDirectory(dirHandle, fileSpec, specBlob);
      if (projectBlob) await writeFileToDirectory(dirHandle, fileProject, projectBlob);
      saveStatus.saved(t("Пакет экспортирован"));
      return;
    }
    await saveBlobWithSystemDialog(pngArt, fileArt, "image/png", ".png", "PNG images", st.saveLocationId);
    await saveBlobWithSystemDialog(pngFlow, fileFlow, "image/png", ".png", "PNG images", st.saveLocationId);
    if (pngRig) await saveBlobWithSystemDialog(pngRig, fileRig, "image/png", ".png", "PNG images", st.saveLocationId);
    if (pngFlowOnly) await saveBlobWithSystemDialog(pngFlowOnly, fileFlowOnly, "image/png", ".png", "PNG images", st.saveLocationId);
    await saveBlobWithSystemDialog(specBlob, fileSpec, "text/markdown", ".md", "Markdown files", st.saveLocationId);
    if (projectBlob) await saveBlobWithSystemDialog(projectBlob, fileProject, "application/json", ".json", "JSON files", st.saveLocationId);
  };

  return {
    requestPackageDirectory,
    writePackageFiles
  };
};
