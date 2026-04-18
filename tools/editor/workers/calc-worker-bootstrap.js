"use strict";

let booted = false;
const preBootQueue = [];

const flushQueue = () => {
  if (!booted) return;
  while (preBootQueue.length) {
    const evt = preBootQueue.shift();
    try {
      if (typeof self.onmessage === "function") self.onmessage(evt);
    } catch (_e) { }
  }
};

self.addEventListener("message", evt => {
  const data = evt && evt.data ? evt.data : {};
  if (!booted) {
    if (data && data.kind === "boot" && typeof data.script === "string" && data.script.trim()) {
      try {
        (0, eval)(String(data.script));
        booted = true;
        self.postMessage({ kind: "booted" });
        flushQueue();
      } catch (err) {
        self.postMessage({ kind: "boot-error", error: String((err && err.message) || err) });
      }
      return;
    }
    preBootQueue.push(evt);
    return;
  }
  try {
    if (typeof self.onmessage === "function") self.onmessage(evt);
  } catch (_e) { }
});

