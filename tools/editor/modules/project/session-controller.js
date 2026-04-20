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
    onTabActivated,
    schedulePersistRef,
    lsGet,
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
    loadProjectIntoActiveState,
    onTabActivated,
    schedulePersist: (...args) => schedulePersist(...args)
  });

  const persistence = setupPersistenceController({
    el,
    lsGet,
    lsSet,
    buildTabsBundle: tabsController.buildTabsBundle,
    buildProject,
    TABS_SAVE_KEY,
    AUTO_SAVE_KEY,
    PERSIST_DEBOUNCE_MS,
    historyCommitIfChanged
  });

  schedulePersist = persistence.schedulePersist;
  if (typeof tabsController.setPersistAfterTabSwitch === "function") {
    tabsController.setPersistAfterTabSwitch(() => {
      persistence.schedulePersist("all");
      persistence.persistNow();
    });
  }
  if (typeof schedulePersistRef === "function") schedulePersistRef(schedulePersist);

  return {
    ...tabsController,
    ...persistence
  };
};
