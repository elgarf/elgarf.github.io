export const setupProjectCodecBridge = (deps = {}) => {
  const {
    PROJECT_QUERY_VERSION,
    PROJECT_QUERY_PARAM,
    encodeProjectToQueryValue,
    decodeProjectFromQueryValue,
    buildPortableProject
  } = deps;

  const attachProjectCodecBridge = () => {
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
    } catch (_e) { }
  };

  return {
    attachProjectCodecBridge
  };
};
