export const setupToolbarWiringFeature = (deps = {}) => {
  const {
    el,
    bindClick,
    commitProjectChange,
    setupToolbarActionsController
  } = deps;

  const bindProxyClick = (source, target) => bindClick(source, () => { if (target) target.click(); });

  setupToolbarActionsController(deps);

  return { bindProxyClick };
};
