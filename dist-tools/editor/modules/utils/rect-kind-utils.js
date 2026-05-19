/* build:1779222473 */
export const rectKind = rect => String((rect && rect.kind) || "").toLowerCase();

export const isNoteRectKind = rect => rectKind(rect) === "note";
export const isDeviceRectKind = rect => rectKind(rect) === "device";
export const isShapeRectKind = rect => rectKind(rect) === "shape";
export const isScreenRectKind = rect => !!rect && !isNoteRectKind(rect) && !isDeviceRectKind(rect) && !isShapeRectKind(rect);

export const isNoteHiddenInArtView = (rect, viewMode) => (
  isNoteRectKind(rect)
  && String(viewMode || "") === "art"
  && rect.noteIncludeInArtRender === false
);

export const isNoteExcludedFromContentBounds = rect => (
  isNoteRectKind(rect)
  && rect.noteIncludeInArtRender === false
);
