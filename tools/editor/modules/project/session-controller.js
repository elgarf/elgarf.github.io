import { setupTabsController } from "../tabs-controller.js";
import { setupPersistenceController } from "../persistence-controller.js";

export const setupProjectSessionController = (deps = {}) => {
  const {
    st,
    el,
    wrap,
    bindEvent,
    eventClosest,
    render,
    cloneProjectData,
    makeEmptyProjectData,
    buildProject,
    loadProjectIntoActiveState,
    schedulePersistRef,
    lsSet,
    TABS_SAVE_KEY,
    AUTO_SAVE_KEY,
    PERSIST_DEBOUNCE_MS,
    historyCommitIfChanged
  } = deps;

  let schedulePersist = (_kind = "project") => {};

  const tabsController = setupTabsController({
    st,
    el,
    wrap,
    bindEvent,
    eventClosest,
    render,
    cloneProjectData,
    makeEmptyProjectData,
    buildProject,
    loadProjectIntoActiveState: data => loadProjectIntoActiveState(data),
    schedulePersist: (...args) => schedulePersist(...args)
  });

  const persistence = setupPersistenceController({
    el,
    lsSet,
    buildTabsBundle: () => tabsController.buildTabsBundle(),
    buildProject: () => buildProject(),
    TABS_SAVE_KEY,
    AUTO_SAVE_KEY,
    PERSIST_DEBOUNCE_MS,
    historyCommitIfChanged: () => historyCommitIfChanged()
  });

  schedulePersist = (...args) => persistence.schedulePersist(...args);
  if (typeof schedulePersistRef === "function") schedulePersistRef(schedulePersist);

  return {
    ...tabsController,
    ...persistence
  };
};
