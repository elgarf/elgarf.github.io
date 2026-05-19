/* build:1779222473 */
export const setupTargetActionsFeature = (deps = {}) => {
  const {
    getSelectedRects,
    cur,
    isRectLocked,
    syncProps,
    listRects,
    schedulePersist,
    render
  } = deps;

  const getActionTargets = () => {
    const selected = getSelectedRects();
    if (selected && selected.length) return selected.filter(r => !isRectLocked(r));
    const r = cur();
    return r && !isRectLocked(r) ? [r] : [];
  };

  const applyToTargets = (visitor, opts = {}) => {
    const ts = getActionTargets();
    if (!ts.length) return 0;
    for (const r of ts) visitor(r);
    const o = opts && typeof opts === "object" ? opts : {};
    if (o.syncProps) syncProps();
    if (o.listRects) listRects();
    if (o.persist) schedulePersist(o.persistKind || "project");
    if (o.render) render();
    return ts.length;
  };

  const applyToTargetsAndRender = (visitor, opts = {}, after = null) => {
    const base = (opts && typeof opts === "object") ? { ...opts } : {};
    base.render = false;
    const count = applyToTargets(visitor, base);
    if (!count) return 0;
    if (typeof after === "function") after();
    render();
    return count;
  };

  return {
    getActionTargets,
    applyToTargets,
    applyToTargetsAndRender
  };
};
