export const setupClusterInputController = (deps = {}) => {
  const {
    st,
    render,
    hit,
    cur,
    selectHoveredRectSmart,
    beginClusterHandleDragAtPoint,
    handleClusterEditAtPoint,
    updateClusterHandleDragAtPoint,
    updateClusterEditCursor,
    findClusterHandle,
    findActiveClusterBorder,
    findClusterStartMarker,
    cellFromWorldPoint,
    endClusterHandleDrag,
    finishPointerUp,
    resetClusterHoverTransient
  } = deps;

  const handlePointerDownCluster = p => {
    if (!beginClusterHandleDragAtPoint || !handleClusterEditAtPoint) return false;
    if (beginClusterHandleDragAtPoint(p.x, p.y)) {
      render();
      return true;
    }
    handleClusterEditAtPoint(p.x, p.y);
    return true;
  };

  const handleClusterPointerMove = p => {
    if (st.clusterDrag) {
      updateClusterHandleDragAtPoint(p.x, p.y);
      updateClusterEditCursor();
      render();
      return true;
    }
    const h = hit(p.x, p.y);
    selectHoveredRectSmart(h);
    const r = h || cur();
    st.clusterHandleHover = r ? findClusterHandle(p.x, p.y) : null;
    st.clusterBorderHover = r ? findActiveClusterBorder(r, p.x, p.y) : null;
    st.clusterStartHover = r ? findClusterStartMarker(r, p.x, p.y) : null;
    const cc = (r ? cellFromWorldPoint(r, p.x, p.y, true) : null);
    st.clusterCellHover = (r && cc ? { rectId: r.id, col: cc.col, row: cc.row } : null);
    updateClusterEditCursor();
    render();
    return true;
  };

  const handlePointerUpCluster = () => {
    if (!st.clusterDrag) return false;
    const changed = endClusterHandleDrag();
    finishPointerUp(changed);
    return true;
  };

  const handleClusterMouseLeave = () => {
    if (!(st.clusterHandleHover || st.clusterCellHover || st.clusterStartHover || st.clusterBorderHover)) return false;
    resetClusterHoverTransient();
    updateClusterEditCursor();
    render();
    return true;
  };

  return {
    handlePointerDownCluster,
    handleClusterPointerMove,
    handlePointerUpCluster,
    handleClusterMouseLeave
  };
};
