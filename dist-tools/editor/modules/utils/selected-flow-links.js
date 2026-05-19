/* build:1779222473 */
import { flowLinkKeyOf } from "./flow-link-key-utils.js";
import { getSelectedFlowLinkKeys } from "./flow-link-selection-state.js";

export const getSelectedFlowLinkKeySet = st => new Set(getSelectedFlowLinkKeys(st));

export const getSelectedFlowLinks = (st, flowLinks) => {
  const list = Array.isArray(flowLinks) ? flowLinks : [];
  const selectedKeys = getSelectedFlowLinkKeys(st);
  if (!selectedKeys.length || !list.length) return [];
  const byKey = new Map();
  for (const ln of list) {
    const key = flowLinkKeyOf(ln);
    if (!key || byKey.has(key)) continue;
    byKey.set(key, ln);
  }
  const out = [];
  for (const key of selectedKeys) {
    const link = byKey.get(key);
    if (link) out.push(link);
  }
  return out;
};

export const filterOutSelectedFlowLinks = (st, flowLinks) => {
  const list = Array.isArray(flowLinks) ? flowLinks : [];
  if (!list.length) return [];
  const selectedKeySet = getSelectedFlowLinkKeySet(st);
  if (!selectedKeySet.size) return list.slice();
  return list.filter(link => !selectedKeySet.has(flowLinkKeyOf(link)));
};
