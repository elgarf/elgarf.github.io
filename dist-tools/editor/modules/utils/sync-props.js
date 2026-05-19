/* build:1779222473 */
export const runSmartSyncProps = (syncPropsSmart, syncProps) => {
  if (typeof syncPropsSmart === "function") syncPropsSmart();
  else if (typeof syncProps === "function") syncProps();
};
