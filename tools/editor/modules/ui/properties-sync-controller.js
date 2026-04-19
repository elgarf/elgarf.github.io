export const setupPropertiesSyncController = (deps = {}) => {
  const {
    st,
    syncProps,
    requestFrame = cb => requestAnimationFrame(cb),
    cancelFrame = id => cancelAnimationFrame(id),
    setDelay = (cb, ms) => setTimeout(cb, ms),
    clearDelay = id => clearTimeout(id)
  } = deps;

  let syncPropsRaf = 0;

  const scheduleSyncProps = () => {
    if (syncPropsRaf) return;
    if (typeof requestFrame === "function") {
      syncPropsRaf = requestFrame(() => {
        syncPropsRaf = 0;
        syncProps();
      });
    } else {
      syncPropsRaf = setDelay(() => {
        syncPropsRaf = 0;
        syncProps();
      }, 16);
    }
  };

  const syncPropsSmart = () => {
    const hot = !!(st.drag || st.flowDrag || st.clusterDrag || st.pan || (st.touch && st.touch.type === "pinch"));
    if (hot) {
      scheduleSyncProps();
      return;
    }
    if (syncPropsRaf) {
      if (typeof cancelFrame === "function") {
        try { cancelFrame(syncPropsRaf); } catch (_e) { }
      } else {
        clearDelay(syncPropsRaf);
      }
      syncPropsRaf = 0;
    }
    syncProps();
  };

  return {
    scheduleSyncProps,
    syncPropsSmart
  };
};
