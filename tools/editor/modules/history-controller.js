export const setupHistoryController = (deps = {}) => {
  const {
    st, el, cloneJson, buildProject, jsonEquals,
    applyProjectData, schedulePersist, historyCap = 80
  } = deps;

  const syncButtons = () => {
    if (el && el.undo) el.undo.disabled = !(st && st.history && st.history.undo && st.history.undo.length);
    if (el && el.redo) el.redo.disabled = !(st && st.history && st.history.redo && st.history.redo.length);
  };

  const initHistoryCurrent = () => {
    if (!st || !st.history) return;
    st.history.current = cloneJson(buildProject(), () => buildProject());
  };

  const historyCommitIfChanged = () => {
    if (!st || !st.history || st.history.suspend) return;
    const next = cloneJson(buildProject(), () => buildProject());
    const cur = st.history.current;
    if (!cur) {
      st.history.current = next;
      return;
    }
    if (jsonEquals(cur, next)) return;
    st.history.undo.push(cur);
    if (st.history.undo.length > historyCap) st.history.undo.shift();
    st.history.current = next;
    st.history.redo = [];
    syncButtons();
  };

  const historyApplySnapshot = snap => {
    if (!snap || !st || !st.history) return;
    st.history.suspend = true;
    applyProjectData(cloneJson(snap, () => buildProject()), { syncTabSnapshot: true, renderTabs: true, render: true });
    st.history.suspend = false;
    st.history.current = cloneJson(buildProject(), () => buildProject());
    syncButtons();
  };

  const undoHistory = () => {
    if (!st || !st.history || !st.history.undo.length) return;
    const prev = st.history.undo.pop();
    const curSnap = cloneJson(buildProject(), () => buildProject());
    st.history.redo.push(curSnap);
    historyApplySnapshot(prev);
    schedulePersist("project");
  };

  const redoHistory = () => {
    if (!st || !st.history || !st.history.redo.length) return;
    const next = st.history.redo.pop();
    const curSnap = cloneJson(buildProject(), () => buildProject());
    st.history.undo.push(curSnap);
    historyApplySnapshot(next);
    schedulePersist("project");
  };

  const resetHistoryUi = () => {
    if (!st || !st.history || st.history.suspend) return;
    st.history.undo = [];
    st.history.redo = [];
    initHistoryCurrent();
    syncButtons();
  };

  return {
    initHistoryCurrent,
    historyCommitIfChanged,
    undoHistory,
    redoHistory,
    resetHistoryUi
  };
};
