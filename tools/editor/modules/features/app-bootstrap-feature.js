import { setupAppInitController } from "../app-init-controller.js";
import { setupKeyboardController } from "../keyboard-controller.js";
import { setupUiBinders } from "../ui-binders.js";

export const setupAppBootstrapFeature = (deps = {}) => {
  const {
    PROJECT_QUERY_VERSION,
    PROJECT_QUERY_PARAM,
    encodeProjectToQueryValue,
    decodeProjectFromQueryValue,
    buildPortableProject
  } = deps;

  setupUiBinders(deps);
  setupKeyboardController(deps);
  const { initializeAppUi, initProjectState } = setupAppInitController(deps);
  initializeAppUi();
  initProjectState();

  try {
    window.ledMaskProjectCodec = {
      version: PROJECT_QUERY_VERSION,
      async toQueryValue() { return await encodeProjectToQueryValue(buildPortableProject()); },
      async toUrl() {
        const u = new URL(location.href);
        u.searchParams.set(PROJECT_QUERY_PARAM, await encodeProjectToQueryValue(buildPortableProject()));
        return u.toString();
      },
      async fromQueryValue(value) { return await decodeProjectFromQueryValue(value); }
    };
  } catch { /* noop */ }
};


