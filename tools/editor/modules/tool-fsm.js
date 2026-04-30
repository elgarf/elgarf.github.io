export const TOOL_MODE_LIST = Object.freeze(["select", "draw", "note", "shape", "maskEdit", "cellEdit", "flowEdit", "clusterEdit", "rigEdit"]);

export const createModePredicates = st => ({
  isMaskMode: () => st.mode === "maskEdit",
  isCellEditMode: () => st.mode === "cellEdit",
  isClusterEditMode: () => st.mode === "clusterEdit",
  isRigEditMode: () => st.mode === "rigEdit",
  isNoteMode: () => st.mode === "note"
});

export const createToolFsm = (opts = {}) => {
  const isInstallOnlyToolMode = typeof opts.isInstallOnlyToolMode === "function" ? opts.isInstallOnlyToolMode : (() => false);
  const isInstallViewMode = typeof opts.isInstallViewMode === "function" ? opts.isInstallViewMode : (() => true);
  const defaultMode = String(opts.defaultMode || "select");

  const normalize = mode => {
    const m = String(mode || defaultMode);
    return TOOL_MODE_LIST.includes(m) ? m : defaultMode;
  };

  const isAllowed = mode => {
    const m = normalize(mode);
    if (isInstallOnlyToolMode(m) && !isInstallViewMode()) return false;
    return true;
  };

  const resolve = mode => {
    const m = normalize(mode);
    return isAllowed(m) ? m : defaultMode;
  };

  const nextOnToolClick = (currentMode, targetMode) => {
    const cur = resolve(currentMode);
    const target = resolve(targetMode);
    if (target !== "select" && cur === target) return "select";
    return target;
  };

  return Object.freeze({
    normalize,
    isAllowed,
    resolve,
    nextOnToolClick
  });
};
