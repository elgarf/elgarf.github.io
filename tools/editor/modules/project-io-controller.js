export const setupProjectIoController = (deps = {}) => {
  const {
    PROJECT_QUERY_VERSION,
    PROJECT_STORE_API_URL, PROJECT_ID_PARAM, PROJECT_QUERY_PARAM,
    toTrimmed, toPosInt, decodeProjectFromQueryValue, encodeProjectToQueryValue, buildPortableProject
  } = deps;

  const fetchJsonWithTimeout = async (url, options = {}, timeoutMs = 5000) => {
    const ctl = (typeof AbortController === "function") ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), Math.max(500, Math.round(Number(timeoutMs) || 5000))) : null;
    try {
      const res = await fetch(url, { ...(options || {}), signal: ctl ? ctl.signal : undefined });
      let json = null;
      try { json = await res.json(); } catch { json = null; }
      return { ok: !!(res && res.ok), status: res ? res.status : 0, json };
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const saveProjectToServer = async (name, encodedData, projectGuid = "") => {
    const api = toTrimmed(PROJECT_STORE_API_URL || "");
    if (!api) return null;
    const payload = {
      name: toTrimmed(name || "") || "project",
      data: String(encodedData || ""),
      projectGuid: toTrimmed(projectGuid || "")
    };
    if (!payload.data) return null;
    const r = await fetchJsonWithTimeout(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, 6000);
    if (!r.ok || !r.json || r.json.ok !== true || !Number.isFinite(Number(r.json.id))) return null;
    return toPosInt(r.json.id, 1);
  };

  const loadProjectByIdFromServer = async id => {
    const api = toTrimmed(PROJECT_STORE_API_URL || "");
    if (!api) return null;
    const pid = toPosInt(id, 1);
    if (!pid) return null;
    const u = new URL(api, location.href);
    u.searchParams.set("id", String(pid));
    const r = await fetchJsonWithTimeout(u.toString(), { method: "GET" }, 6000);
    if (!r.ok || !r.json || r.json.ok !== true) return null;
    const rec = r.json.project && typeof r.json.project === "object" ? r.json.project : null;
    const raw = String(rec && rec.data || "");
    if (!raw) return null;
    return await decodeProjectFromQueryValue(raw);
  };

  const getProjectDataFromQueryParam = async () => {
    try {
      const params = new URLSearchParams(location.search || "");
      const pidRaw = params.get(PROJECT_ID_PARAM) || "";
      const pid = toPosInt(pidRaw, 0);
      if (pid > 0) {
        const byId = await loadProjectByIdFromServer(pid);
        if (byId && typeof byId === "object") return byId;
      }
    } catch { /* noop */ }
    let raw = "";
    try {
      const params = new URLSearchParams(location.search || "");
      raw = params.get(PROJECT_QUERY_PARAM) || "";
    } catch {
      raw = "";
    }
    if (!raw) return null;
    const data = await decodeProjectFromQueryValue(raw);
    if (!data || typeof data !== "object") return null;
    return data;
  };

  const clearProjectQueryParamFromUrl = () => {
    try {
      const u = new URL(location.href);
      if (!u.searchParams.has(PROJECT_QUERY_PARAM) && !u.searchParams.has(PROJECT_ID_PARAM)) return;
      u.searchParams.delete(PROJECT_QUERY_PARAM);
      u.searchParams.delete(PROJECT_ID_PARAM);
      const nextUrl = `${u.pathname}${u.search}${u.hash}`;
      history.replaceState(history.state, "", nextUrl);
    } catch { /* noop */ }
  };

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
    } catch { /* noop */ }
  };

  return {
    fetchJsonWithTimeout,
    saveProjectToServer,
    loadProjectByIdFromServer,
    getProjectDataFromQueryParam,
    clearProjectQueryParamFromUrl,
    attachProjectCodecBridge
  };
};


