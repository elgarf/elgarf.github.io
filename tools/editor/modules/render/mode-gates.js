export const computeRectRenderFlags = ({
  stMode,
  sel,
  rectId,
  selectedId,
  installView,
  flowEnabledByMode,
  flowInteractivePause,
  showNumbers
}) => {
  const flowEditingThisRect = !!(stMode === "flowEdit" && sel && rectId === selectedId);
  const wantsFlowDraw = !!(installView && flowEnabledByMode && !flowInteractivePause);
  const wantsFlowForNumbers = !!(showNumbers && flowEnabledByMode && !flowInteractivePause);
  return { flowEditingThisRect, wantsFlowDraw, wantsFlowForNumbers };
};
