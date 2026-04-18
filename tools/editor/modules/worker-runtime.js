export const isWorkerBootMessage = data => {
  const kind = String(data && data.kind || "");
  return kind === "booted" || kind === "boot-error";
};

export const buildWorkerMessage = (kind, reqId, payload) => ({ kind, reqId, payload });

export const collectSetValues = value => [...(value && typeof value.forEach === "function" ? value : new Set())];
