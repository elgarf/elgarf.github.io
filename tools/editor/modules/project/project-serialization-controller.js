export const setupProjectSerializationController = (deps = {}) => {
  const {
    st,
    normalizeViewMode,
    normalizeFlowLinks,
    serializeRectForProject,
    genSaveLocationId,
    cloneJson
  } = deps;

  const buildProject = () => ({
    version: 1,
    projectName: st.projectName,
    saveLocationId: st.saveLocationId,
    camera: { x: st.camX, y: st.camY, zoom: st.zoom },
    settings: {
      textSize: st.textSize,
      fontFamily: st.fontFamily,
      scale: Math.max(1, Math.round(Number(st.globalScale) || 256)),
      viewMode: normalizeViewMode(st.viewMode),
      lockAll: !!st.lockAll,
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

  const makeEmptyProjectData = (name = "Новый проект") => ({
    version: 1,
    projectName: name,
    saveLocationId: genSaveLocationId(name),
    camera: { x: 0, y: 0, zoom: 1 },
    settings: {
      textSize: st.textSize,
      fontFamily: st.fontFamily,
      scale: Math.max(1, Math.round(Number(st.globalScale) || 256)),
      viewMode: "art",
      lockAll: !!st.lockAll,
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
