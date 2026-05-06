export const setupProjectSerializationController = (deps = {}) => {
  const {
    st,
    normalizeViewMode,
    normalizeFlowLinks,
    serializeRectForProject,
    genSaveLocationId,
    cloneJson,
    t = value => value
  } = deps;
  const createProjectGuid = () => {
    try {
      if (typeof crypto !== "undefined" && crypto && typeof crypto.randomUUID === "function") {
        return String(crypto.randomUUID());
      }
    } catch { /* noop */ }
    return `pg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  };
  const ensureProjectGuid = value => {
    const v = String(value || "").trim();
    return v || createProjectGuid();
  };

  const buildProject = () => ({
    version: 1,
    projectGuid: ensureProjectGuid(st.projectGuid),
    projectName: st.projectName,
    saveLocationId: st.saveLocationId,
    camera: { x: st.camX, y: st.camY, zoom: st.zoom },
    settings: {
      textSize: st.textSize,
      fontFamily: st.fontFamily,
      scale: Math.max(1, Math.round(Number(st.globalScale) || 256)),
      viewMode: normalizeViewMode(st.viewMode),
      specCustomText: String(st.specCustomText || ""),
      specCustomSections: (st.specCustomSections && typeof st.specCustomSections === "object") ? { ...st.specCustomSections } : {},
      lockAll: !!st.lockAll,
      installLayers: {
        contours: !(st.installLayers && st.installLayers.contours === false),
        text: !(st.installLayers && st.installLayers.text === false),
        flow: !(st.installLayers && st.installLayers.flow === false),
        devices: !(st.installLayers && st.installLayers.devices === false),
        rig: !(st.installLayers && st.installLayers.rig === false)
      },
      snap: {
        grid: !!(st.snap && st.snap.grid),
        objects: !!(st.snap && st.snap.objects),
        centers: !!(st.snap && st.snap.centers),
        gaps: !!(st.snap && st.snap.gaps)
      }
    },
    nextId: st.next,
    flowLinks: normalizeFlowLinks(st.flowLinks),
    rectangles: st.rects.map(serializeRectForProject)
  });

  const cloneProjectData = data => cloneJson(data, buildProject);

  const DEFAULT_TEXT_SIZE = 32;
  const DEFAULT_FONT_FAMILY = "Roboto";
  const DEFAULT_SCALE = 256;

  const makeEmptyProjectData = (name = t("Новый проект")) => ({
    version: 1,
    projectGuid: createProjectGuid(),
    projectName: name,
    saveLocationId: genSaveLocationId(name),
    camera: { x: 0, y: 0, zoom: 1 },
    settings: {
      textSize: DEFAULT_TEXT_SIZE,
      fontFamily: DEFAULT_FONT_FAMILY,
      scale: DEFAULT_SCALE,
      viewMode: "art",
      specCustomText: "",
      specCustomSections: {},
      lockAll: false,
      installLayers: { contours: true, text: true, flow: true, devices: true, rig: true },
      snap: { grid: false, objects: true, centers: true, gaps: true }
    },
    nextId: 1,
    flowLinks: [],
    rectangles: []
  });

  const buildPortableProject = stripProjectCaches => {
    const out = stripProjectCaches(buildProject());
    if (out && typeof out === "object") delete out.camera;
    return out;
  };

  return {
    buildProject,
    cloneProjectData,
    makeEmptyProjectData,
    buildPortableProject
  };
};
