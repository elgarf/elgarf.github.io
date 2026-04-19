export const setupInputWiring = (deps = {}) => {
  const {
    createEditorServices,
    setupInputController,
    services
  } = deps;
  const inputServices = createEditorServices(services || {});
  setupInputController(inputServices);
  return { inputServices };
};

export const setupBootstrapWiring = (deps = {}) => {
  const {
    setupAppBootstrapRuntime,
    runtimeDeps
  } = deps;
  return setupAppBootstrapRuntime(runtimeDeps || {});
};
