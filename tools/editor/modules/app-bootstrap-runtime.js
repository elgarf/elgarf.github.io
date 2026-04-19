export const setupAppBootstrapRuntime = (deps = {}) => {
  const {
    createEditorServices,
    setupUiBinders,
    setupKeyboardController,
    setupAppInitController,
    setupProjectCodecBridge,
    uiServices,
    keyboardDeps,
    appInitDeps,
    codecDeps
  } = deps;

  const editorServices = createEditorServices(uiServices || {});
  setupUiBinders(editorServices);

  setupKeyboardController({
    ...(keyboardDeps || {}),
    st: editorServices.st,
    el: editorServices.el,
    schedulePersist: editorServices.schedulePersist,
    bindWindowEvent: editorServices.bindWindowEvent
  });

  const appInitServices = createEditorServices(appInitDeps || {});
  const { initializeAppUi, initProjectState } = setupAppInitController(appInitServices);
  initializeAppUi();
  initProjectState();

  const { attachProjectCodecBridge } = setupProjectCodecBridge(codecDeps || {});
  attachProjectCodecBridge();

  return { editorServices, appInitServices };
};
