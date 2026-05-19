/* build:1779222473 */
export const setupChangeOpsController = (deps = {}) => {
  const {
    syncProps,
    syncPropsSmart,
    listRects,
    render,
    schedulePersist
  } = deps;

  const refreshPropsListRender = () => {
    if (typeof syncProps === "function") syncProps();
    if (typeof listRects === "function") listRects();
    if (typeof render === "function") render();
  };

  const persistProjectAndRender = () => {
    if (typeof schedulePersist === "function") schedulePersist("project");
    if (typeof render === "function") render();
  };

  const refreshPanels = () => {
    if (typeof syncProps === "function") syncProps();
    if (typeof listRects === "function") listRects();
  };

  const commitProjectChange = (opts = {}) => {
    const o = (opts && typeof opts === "object") ? opts : {};
    if (o.syncProps && typeof syncPropsSmart === "function") syncPropsSmart();
    if (o.refreshPanels) refreshPanels();
    if (o.listRects && typeof listRects === "function") listRects();
    if (o.persist !== false && typeof schedulePersist === "function") schedulePersist(o.persistKind || "project");
    if (o.render !== false && typeof render === "function") render();
  };

  const commitUiUpdate = (opts = {}) => {
    const o = opts && typeof opts === "object" ? opts : {};
    if (o.syncProps && typeof syncProps === "function") syncProps();
    if (o.listRects && typeof listRects === "function") listRects();
    if (o.persist && typeof schedulePersist === "function") schedulePersist(o.persistKind || "project");
    if (o.render !== false && typeof render === "function") render();
  };

  return {
    refreshPropsListRender,
    persistProjectAndRender,
    refreshPanels,
    commitProjectChange,
    commitUiUpdate
  };
};
