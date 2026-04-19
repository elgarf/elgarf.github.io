export const setupProjectActionsController = (deps = {}) => {
  const {
    bindProjectLoadHandlers,
    bindProjectLinkHandlers,
    bindClick,
    saveButton,
    buildProject,
    projectFileBase,
    saveBlobWithSystemDialog,
    getSaveLocationId
  } = deps;

  const bindAll = () => {
    if (typeof bindProjectLoadHandlers === "function") bindProjectLoadHandlers();
    if (typeof bindProjectLinkHandlers === "function") bindProjectLinkHandlers();
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
  };

  return { bindAll };
};
