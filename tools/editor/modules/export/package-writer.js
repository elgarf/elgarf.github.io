export const createExportPackageWriter = (deps = {}) => {
  const {
    st,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    saveStatus,
    saveBlobWithSystemDialog,
    projectFileBase
  } = deps;

  const writeFileToDirectory = async (dirHandle, fileName, blob) => {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  };

  return async ({ pngArt, pngFlow, specBlob }) => {
    const baseName = projectFileBase();
    const fileArt = `${baseName}.png`;
    const fileFlow = `${baseName}-flow.png`;
    const fileSpec = `${baseName}-flow.md`;
    if (window.showDirectoryPicker) {
      try {
        const dirHandle = await window.showDirectoryPicker({ mode: "readwrite", id: setGlobalSaveLocationId(st.saveLocationId || getGlobalSaveLocationId()) });
        await writeFileToDirectory(dirHandle, fileArt, pngArt);
        await writeFileToDirectory(dirHandle, fileFlow, pngFlow);
        await writeFileToDirectory(dirHandle, fileSpec, specBlob);
        saveStatus.saved("Пакет экспортирован");
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
        console.warn("showDirectoryPicker failed, fallback to save dialogs:", err);
      }
    }
    await saveBlobWithSystemDialog(pngArt, fileArt, "image/png", ".png", "PNG images", st.saveLocationId);
    await saveBlobWithSystemDialog(pngFlow, fileFlow, "image/png", ".png", "PNG images", st.saveLocationId);
    await saveBlobWithSystemDialog(specBlob, fileSpec, "text/markdown", ".md", "Markdown files", st.saveLocationId);
  };
};
