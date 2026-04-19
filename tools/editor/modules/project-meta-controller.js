export const setupProjectMetaController = (deps = {}) => {
  const {
    normalizeSaveLocationId,
    lsGet,
    lsSet,
    SAVE_LOCATION_ID_KEY,
    getProjectName
  } = deps;

  const genSaveLocationId = (seed = "project") => {
    const slug = String(seed || "project")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    return normalizeSaveLocationId(`proj-${slug || "project"}`);
  };

  const getGlobalSaveLocationId = () => {
    try {
      return normalizeSaveLocationId(lsGet(SAVE_LOCATION_ID_KEY, "") || "");
    } catch (_e) {
      return "ledmask-default";
    }
  };

  const setGlobalSaveLocationId = id => {
    const norm = normalizeSaveLocationId(id);
    lsSet(SAVE_LOCATION_ID_KEY, norm);
    return norm;
  };

  const projectFileBase = () => {
    const raw = (typeof getProjectName === "function" ? getProjectName() : "project") || "project";
    const base = String(raw).trim() || "project";
    const sanitized = base.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").trim();
    return sanitized || "project";
  };

  return {
    genSaveLocationId,
    getGlobalSaveLocationId,
    setGlobalSaveLocationId,
    projectFileBase
  };
};
