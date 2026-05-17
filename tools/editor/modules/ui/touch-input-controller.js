export const setupTouchInputController = (deps = {}) => {
  const {
    cv,
    st,
    render,
    s2w,
    zc,
    getViewMetrics,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    hitLayerButton
  } = deps;
  const DOUBLE_TAP_MS = 330;
  const DOUBLE_TAP_MAX_DIST = 24;
  let lastTap = null;

  const touchDist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const touchMid = (a, b, rect) => ({
    sx: ((a.clientX + b.clientX) / 2) - rect.left,
    sy: ((a.clientY + b.clientY) / 2) - rect.top
  });

  const handleTouchStart = e => {
    const rect = cv.getBoundingClientRect();
    if (e.touches.length === 2) {
      const m = touchMid(e.touches[0], e.touches[1], rect);
      st.touch = {
        type: "pinch",
        startDist: touchDist(e.touches[0], e.touches[1]),
        startZoom: st.zoom,
        worldMid: s2w(m.sx, m.sy)
      };
      st.drag = null;
      st.selBox = null;
      st.pan = false;
      st.draft = null;
      st.draftPending = null;
      e.preventDefault();
      return;
    }
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const sx = t.clientX - rect.left;
    const sy = t.clientY - rect.top;
    const p = s2w(sx, sy);
    const now = Date.now();
    let clickCount = 1;
    if (lastTap) {
      const dt = now - Number(lastTap.ts || 0);
      const dd = Math.hypot(sx - Number(lastTap.sx || 0), sy - Number(lastTap.sy || 0));
      if (dt > 0 && dt <= DOUBLE_TAP_MS && dd <= DOUBLE_TAP_MAX_DIST) clickCount = 2;
    }
    lastTap = { ts: now, sx, sy };
    st.touch = { type: "single" };
    if (typeof hitLayerButton === "function" && hitLayerButton(p.x, p.y)) {
      handleCanvasPointerDown(p, { shiftToggle: false, touchLike: true, clickCount, sx, sy });
      e.preventDefault();
      return;
    }
    if (clickCount >= 2) {
      handleCanvasPointerDown(p, { shiftToggle: false, touchLike: true, clickCount, sx, sy });
      e.preventDefault();
      return;
    }
    if (st.lockAll) {
      st.pan = true;
      st.panS = { sx, sy, cx: st.camX, cy: st.camY };
      render();
      e.preventDefault();
      return;
    }
    handleCanvasPointerDown(p, { shiftToggle: false, touchLike: true, clickCount, sx, sy });
    e.preventDefault();
  };

  const handleTouchMove = e => {
    const rect = cv.getBoundingClientRect();
    if (st.touch && st.touch.type === "pinch" && e.touches.length >= 2) {
      const m = touchMid(e.touches[0], e.touches[1], rect);
      const dist = Math.max(1, touchDist(e.touches[0], e.touches[1]));
      const vm = getViewMetrics();
      st.zoom = zc(st.touch.startZoom * (dist / st.touch.startDist));
      st.camX = st.touch.worldMid.x - (m.sx - vm.centerX) / st.zoom;
      st.camY = st.touch.worldMid.y - (m.sy - vm.centerY) / st.zoom;
      render();
      e.preventDefault();
      return;
    }
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const sx = t.clientX - rect.left;
    const sy = t.clientY - rect.top;
    const p = s2w(sx, sy);
    if (handleCanvasPointerMove(p, { sx, sy, ctrlSnap: false, altResize: false })) e.preventDefault();
  };

  const handleTouchEnd = e => {
    if (st.touch && st.touch.type === "pinch" && e.touches.length >= 1) {
      e.preventDefault();
      return;
    }
    if (e.touches.length === 0) {
      st.touch = null;
      handleCanvasPointerUp();
      e.preventDefault();
    }
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
};
