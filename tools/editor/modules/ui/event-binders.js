export const createEventBinders = (deps = {}) => {
  const { bindCommitInput } = deps;

  const bindClick = (node, handler) => { if (node) node.onclick = handler; };
  const bindEvent = (node, event, handler, options) => { if (node) node.addEventListener(event, handler, options); };
  const bindWindowEvent = (event, handler, options) => {
    if (typeof window !== "undefined" && window) window.addEventListener(event, handler, options);
  };
  const bindEvents = (nodes, event, handler, options) => {
    for (const node of (Array.isArray(nodes) ? nodes : [])) bindEvent(node, event, handler, options);
  };
  const eventClosest = (e, selector) => {
    const target = e && e.target;
    return (target && target.closest) ? target.closest(selector) : null;
  };
  const bindCommitInputs = (nodes, onCommit) => {
    for (const node of (Array.isArray(nodes) ? nodes : [])) {
      if (typeof bindCommitInput === "function") bindCommitInput(node, onCommit);
    }
  };
  const focusAndSelect = node => {
    try {
      if (node) {
        node.focus();
        node.select();
      }
    } catch (_e) { }
  };

  return {
    bindClick,
    bindEvent,
    bindWindowEvent,
    bindEvents,
    eventClosest,
    bindCommitInputs,
    focusAndSelect
  };
};
