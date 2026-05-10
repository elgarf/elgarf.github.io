export const getFlowLinks = st => (Array.isArray(st && st.flowLinks) ? st.flowLinks : []);

export const getFlowLinksCopy = st => getFlowLinks(st).slice();
