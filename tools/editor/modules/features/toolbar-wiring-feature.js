export const setupToolbarWiringFeature = (deps = {}) => {
  const {
    el,
    st,
    bindClick,
    bindEvent,
    setViewMode,
    isInstallViewMode,
    activateToolOrSelect,
    setLockAll,
    newProject,
    dupSel,
    dupMirrorSel,
    delSel,
    getViewMetrics,
    zoomAt,
    render,
    fit,
    getActionTargets,
    applyToTargets,
    autoContrast,
    invalidateRectCache,
    randomColor,
    undoHistory,
    redoHistory,
    commitProjectChange,
    setupToolbarActionsController
  } = deps;

  const bindProxyClick = (source, target) => bindClick(source, () => { if (target) target.click(); });

  setupToolbarActionsController({
    el,
    st,
    bindClick: (...args) => bindClick(...args),
    bindEvent: (...args) => bindEvent(...args),
    setViewMode: (mode, persist) => setViewMode(mode, persist),
    isInstallViewMode: () => isInstallViewMode(),
    activateToolOrSelect: mode => activateToolOrSelect(mode),
    setLockAll: (next, persist) => setLockAll(next, persist),
    newProject: () => newProject(),
    dupSel: () => dupSel(),
    dupMirrorSel: () => dupMirrorSel(),
    delSel: () => delSel(),
    getViewMetrics: () => getViewMetrics(),
    zoomAt: (x, y, next) => zoomAt(x, y, next),
    render: () => render(),
    fit: () => fit(),
    getActionTargets: () => getActionTargets(),
    applyToTargets: (fn, opts) => applyToTargets(fn, opts),
    autoContrast,
    invalidateRectCache: (r, kind) => invalidateRectCache(r, kind),
    randomColor: () => randomColor(),
    undoHistory: () => undoHistory(),
    redoHistory: () => redoHistory(),
    commitProjectChange: opts => commitProjectChange(opts)
  });

  return { bindProxyClick };
};
