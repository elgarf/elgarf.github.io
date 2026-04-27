const DEFAULT_TEXT_SIZE = 32;
const DEFAULT_FONT_FAMILY = "Roboto";

export const createProjectCodec = (deps) => {
  const d = deps || {};
  const PROJECT_QUERY_VERSION = String(d.PROJECT_QUERY_VERSION || "gz2");
  const PROJECT_QUERY_KEY_MAP = Object.freeze({
    version: "v", projectName: "pn", saveLocationId: "sl", camera: "c", settings: "s", nextId: "n", flowLinks: "fl", rectangles: "r",
    x: "x", y: "y", zoom: "z", textSize: "ts", fontFamily: "ff", viewMode: "vm", specCustomText: "sct", specCustomSections: "scs", lockAll: "la", snap: "sn", grid: "g", objects: "o", centers: "ct", gaps: "gp",
    installLayers: "il", text: "tx", flow: "fw",
    id: "i", name: "nm", rotation: "rt", width: "w", height: "h", scale: "sc", widthM: "wm", heightM: "hm", areaM2Px: "a2", colorA: "ca", autoContrastB: "ab", colorB: "cb",
    cellX: "cx", cellY: "cy", dataFlow: "df", dataFlowZ: "dz", numberCells: "nc", splitVariant: "sv", cellLinks: "cl", hiddenCells: "hc", flowLocks: "fk", flowLockRidToSig: "frs", flowLockCidToSeed: "fcs", manualClusters: "mc",
    rig: "rg", locked: "lk", kind: "kd", noteText: "nt", projectCache: "pc",
    from: "f", to: "t", rectId: "ri", rid: "rd", cid: "cd", startCid: "sd", startDir: "sr", startPinned: "sp", mode: "md", locks: "ls", index: "ix",
    sx: "sx", sy: "sy", c0: "c0", c1: "c1", r0: "r0", r1: "r1",
    suspends: "su", suspendLinks: "sk", frames: "fr", loads: "ld"
  });
  const PROJECT_QUERY_KEY_UNMAP = (() => {
    const out = {};
    for (const [k, v] of Object.entries(PROJECT_QUERY_KEY_MAP)) out[v] = k;
    return Object.freeze(out);
  })();

  const remapProjectKeysDeep = (value, map) => {
    if (Array.isArray(value)) return value.map(v => remapProjectKeysDeep(v, map));
    if (!value || typeof value !== "object") return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const nk = Object.prototype.hasOwnProperty.call(map, k) ? map[k] : k;
      out[nk] = remapProjectKeysDeep(v, map);
    }
    return out;
  };

  const base64UrlEncodeBytes = bytes => {
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    let bin = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < arr.length; i += CHUNK) {
      const part = arr.subarray(i, Math.min(arr.length, i + CHUNK));
      bin += String.fromCharCode(...part);
    }
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  };
  const base64UrlDecodeBytes = str => {
    const raw = String(str || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = raw + "===".slice((raw.length + 3) % 4);
    const bin = atob(padded);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  };
  const gzipText = async text => {
    if (typeof CompressionStream !== "function") throw new Error("gzip_unsupported");
    const src = new TextEncoder().encode(String(text || ""));
    const stream = new Blob([src]).stream().pipeThrough(new CompressionStream("gzip"));
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  };
  const ungzipToText = async bytes => {
    if (typeof DecompressionStream !== "function") throw new Error("ungzip_unsupported");
    const src = (bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []));
    const stream = new Blob([src]).stream().pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
  };

  const isPlainObject = v => !!v && typeof v === "object" && !Array.isArray(v);
  const isEmptyObject = v => isPlainObject(v) && !Object.keys(v).length;

  const normalizeProjectSchema = (raw) => {
    const input = (raw && typeof raw === "object") ? raw : {};
    const out = (typeof d.cloneProjectData === "function") ? d.cloneProjectData(input) : JSON.parse(JSON.stringify(input || {}));
    if (!Number.isFinite(Number(out.version))) out.version = 1;
    out.projectName = String(out.projectName || "project").trim() || "project";
    if (!isPlainObject(out.camera)) out.camera = { x: 0, y: 0, zoom: 1 };
    if (!isPlainObject(out.settings)) out.settings = {};
    if (!Number.isFinite(Number(out.settings.textSize))) out.settings.textSize = DEFAULT_TEXT_SIZE;
    out.settings.fontFamily = String(out.settings.fontFamily || DEFAULT_FONT_FAMILY).trim() || DEFAULT_FONT_FAMILY;
    if (!Number.isFinite(Number(out.settings.scale))) out.settings.scale = 256;
    out.settings.viewMode = String(out.settings.viewMode || "art");
    out.settings.specCustomText = String(out.settings.specCustomText || "");
    out.settings.specCustomSections = (out.settings.specCustomSections && typeof out.settings.specCustomSections === "object")
      ? { ...out.settings.specCustomSections }
      : {};
    out.settings.lockAll = !!out.settings.lockAll;
    if (!isPlainObject(out.settings.installLayers)) out.settings.installLayers = {};
    out.settings.installLayers = {
      text: out.settings.installLayers.text !== false,
      flow: out.settings.installLayers.flow !== false,
      rig: out.settings.installLayers.rig !== false
    };
    if (!isPlainObject(out.settings.snap)) out.settings.snap = {};
    const snap = out.settings.snap;
    if (snap.grid == null) snap.grid = false;
    if (snap.objects == null) snap.objects = true;
    if (snap.centers == null) snap.centers = true;
    if (snap.gaps == null) snap.gaps = true;
    if (!Array.isArray(out.flowLinks)) out.flowLinks = [];
    if (!Array.isArray(out.rectangles)) out.rectangles = [];
    if (!Number.isFinite(Number(out.nextId))) out.nextId = 1;
    return out;
  };

  const stripProjectCaches = data => {
    const base = normalizeProjectSchema(data || (typeof d.buildProject === "function" ? d.buildProject() : {}));
    if (Array.isArray(base.rectangles)) {
      base.rectangles = base.rectangles.map(rr => {
        const r = { ...(rr || {}) };
        delete r.projectCache;
        delete r._calcCache;
        return r;
      });
    }
    return base;
  };

  const compactRectForQuery = rr => {
    const r = { ...(rr || {}) };
    if ((Number(r.rotation) || 0) === 0) delete r.rotation;
    if ((Number(r.scale) || 256) === 256) delete r.scale;
    if ((Number(r.widthM) || 1) === 1) delete r.widthM;
    if ((Number(r.heightM) || 1) === 1) delete r.heightM;
    if ((Number(r.areaM2Px) || 65536) === 65536) delete r.areaM2Px;
    if ((Number(r.textSize) || 0) === 0) delete r.textSize;
    if ((Number(r.cellX) || 128) === 128) delete r.cellX;
    if ((Number(r.cellY) || 128) === 128) delete r.cellY;
    if (String(r.dataFlow || "none") === "none") delete r.dataFlow;
    if (!r.dataFlowZ) delete r.dataFlowZ;
    if (!r.numberCells) delete r.numberCells;
    if ((Number(r.splitVariant) || 0) === 0) delete r.splitVariant;
    if (r.autoContrastB !== false) {
      const cb = String(r.colorB || "");
      const ca = String(r.colorA || "#2fcaaf");
      if (!cb || (typeof d.autoContrast === "function" && cb === d.autoContrast(ca))) delete r.colorB;
      delete r.autoContrastB;
    }
    if (!r.locked) delete r.locked;
    if (!Array.isArray(r.cellLinks) || !r.cellLinks.length) delete r.cellLinks;
    if (!Array.isArray(r.hiddenCells) || !r.hiddenCells.length) delete r.hiddenCells;
    if (!Array.isArray(r.manualClusters) || !r.manualClusters.length) delete r.manualClusters;
    if (!isPlainObject(r.flowLocks) || !Object.keys((typeof d.normalizeFlowLocks === "function" ? d.normalizeFlowLocks(r.flowLocks) : r.flowLocks)).length) delete r.flowLocks;
    if (!isPlainObject(r.flowLockRidToSig) || !Object.keys((typeof d.normalizeFlowLockRidToSigMap === "function" ? d.normalizeFlowLockRidToSigMap(r.flowLockRidToSig) : r.flowLockRidToSig)).length) delete r.flowLockRidToSig;
    if (!isPlainObject(r.flowLockCidToSeed) || !Object.keys((typeof d.normalizeFlowLockCidToSeedMap === "function" ? d.normalizeFlowLockCidToSeedMap(r.flowLockCidToSeed) : r.flowLockCidToSeed)).length) delete r.flowLockCidToSeed;
    if (!r.kind) delete r.kind;
    if (!r.noteText) delete r.noteText;
    if (isPlainObject(r.rig)) {
      const rigNorm = (typeof d.normalizeRigData === "function") ? d.normalizeRigData(r.rig) : r.rig;
      const rigEmpty = (typeof d.normalizeRigData === "function") ? d.normalizeRigData(null) : {};
      const isRigDefault = JSON.stringify(rigNorm) === JSON.stringify(rigEmpty);
      if (isRigDefault) delete r.rig; else r.rig = rigNorm;
    } else delete r.rig;
    return r;
  };

  const compactProjectForQuery = data => {
    const out = stripProjectCaches(data || (typeof d.buildProject === "function" ? d.buildProject() : {}));
    if ((Number(out.version) || 1) === 1) delete out.version;
    if (!Array.isArray(out.flowLinks) || !out.flowLinks.length) delete out.flowLinks;
    if ((Number(out.nextId) || 0) <= 0) delete out.nextId;
    if (!out.saveLocationId) delete out.saveLocationId;
    if (isPlainObject(out.camera)) {
      if ((Number(out.camera.x) || 0) === 0) delete out.camera.x;
      if ((Number(out.camera.y) || 0) === 0) delete out.camera.y;
      if ((Number(out.camera.zoom) || 1) === 1) delete out.camera.zoom;
      if (isEmptyObject(out.camera)) delete out.camera;
    } else delete out.camera;
    if (isPlainObject(out.settings)) {
      if ((Number(out.settings.textSize) || DEFAULT_TEXT_SIZE) === DEFAULT_TEXT_SIZE) delete out.settings.textSize;
      if (String(out.settings.fontFamily || DEFAULT_FONT_FAMILY) === DEFAULT_FONT_FAMILY) delete out.settings.fontFamily;
      if ((Number(out.settings.scale) || 256) === 256) delete out.settings.scale;
      if (String(out.settings.viewMode || "art") === "art") delete out.settings.viewMode;
      if (!String(out.settings.specCustomText || "").trim()) delete out.settings.specCustomText;
      if (!out.settings.specCustomSections || !Object.keys(out.settings.specCustomSections).length) delete out.settings.specCustomSections;
      if (isPlainObject(out.settings.installLayers)) {
        const il = out.settings.installLayers;
        if (il.text === true) delete il.text;
        if (il.flow === true) delete il.flow;
        if (il.rig === true) delete il.rig;
        if (isEmptyObject(il)) delete out.settings.installLayers;
      } else delete out.settings.installLayers;
      if (isPlainObject(out.settings.snap)) {
        const sn = out.settings.snap;
        if (sn.grid === false) delete sn.grid;
        if (sn.objects === true) delete sn.objects;
        if (sn.centers === true) delete sn.centers;
        if (sn.gaps === true) delete sn.gaps;
        if (isEmptyObject(sn)) delete out.settings.snap;
      } else delete out.settings.snap;
      if (isEmptyObject(out.settings)) delete out.settings;
    } else delete out.settings;
    if (Array.isArray(out.rectangles)) out.rectangles = out.rectangles.map(compactRectForQuery);
    return out;
  };

  const encodeProjectToQueryValue = async data => {
    const payload = compactProjectForQuery(data || (typeof d.buildProject === "function" ? d.buildProject() : {}));
    const packedPayload = remapProjectKeysDeep(payload, PROJECT_QUERY_KEY_MAP);
    const packed = await gzipText(JSON.stringify(packedPayload));
    return `${PROJECT_QUERY_VERSION}.${base64UrlEncodeBytes(packed)}`;
  };

  const decodeProjectFromQueryValue = async raw => {
    const txt = String(raw || "").trim();
    if (!txt) return null;
    const dot = txt.indexOf(".");
    const ver = dot > 0 ? txt.slice(0, dot) : "";
    const body = dot > 0 ? txt.slice(dot + 1) : txt;
    if (ver && ver !== PROJECT_QUERY_VERSION && ver !== "gz1") throw new Error("project_param_version_unsupported");
    const bytes = base64UrlDecodeBytes(body);
    const json = await ungzipToText(bytes);
    const parsed = JSON.parse(json);
    const out = (ver === PROJECT_QUERY_VERSION) ? remapProjectKeysDeep(parsed, PROJECT_QUERY_KEY_UNMAP) : parsed;
    return normalizeProjectSchema(out);
  };

  return Object.freeze({
    PROJECT_QUERY_KEY_MAP,
    PROJECT_QUERY_KEY_UNMAP,
    remapProjectKeysDeep,
    normalizeProjectSchema,
    stripProjectCaches,
    compactRectForQuery,
    compactProjectForQuery,
    encodeProjectToQueryValue,
    decodeProjectFromQueryValue
  });
};
