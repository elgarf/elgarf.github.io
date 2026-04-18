export const buildCalcWorkerScript = ({ constants, fns }) => {
  const c = constants || {};
  const s = [];
  s.push(`const FLOW_WORKER_TIMEOUT_MS=${c.FLOW_WORKER_TIMEOUT_MS};`);
  s.push(`const REGION_WORKER_TIMEOUT_MS=${c.REGION_WORKER_TIMEOUT_MS};`);
  s.push(`const CALC_TIMEOUT_MS=${c.CALC_TIMEOUT_MS};`);
  s.push(`const FLOW_SEARCH_NODE_LIMIT_STRICT=${c.FLOW_SEARCH_NODE_LIMIT_STRICT};`);
  s.push(`const FLOW_SEARCH_NODE_LIMIT_RELAXED=${c.FLOW_SEARCH_NODE_LIMIT_RELAXED};`);
  s.push(`const FLOW_REFINE_MAX_POINTS=${c.FLOW_REFINE_MAX_POINTS};`);
  s.push(`const FLOW_OPTIMIZE_MAX_POINTS=${c.FLOW_OPTIMIZE_MAX_POINTS};`);
  s.push(`const SPLIT_VARIANT_MAX=${c.SPLIT_VARIANT_MAX};`);
  s.push(`const AREA_LIMIT_EPS=${c.AREA_LIMIT_EPS};`);
  s.push(`const REGION_ZONE_COLORS=${JSON.stringify(c.REGION_ZONE_COLORS || [])};`);
  s.push(`const DATA_FLOW_MODES=new Set(${JSON.stringify([...(c.DATA_FLOW_MODES || [])])});`);
  s.push(`const FLOW_DIR_SET=new Set(${JSON.stringify([...(c.FLOW_DIR_SET || [])])});`);
  const addFn = name => s.push(`const ${name}=${fns[name].toString()};`);
  for (const name of [
    "calcNow", "makeCalcBudget", "checkCalcTimeout", "maskCellKey", "toLetters", "splitIndicesBySize",
    "normalizeDataFlow", "sortNums", "buildSnakeOrder", "buildZOrder", "flowDist", "flowBoxGap", "ptX", "ptY",
    "segIntersects", "wouldSelfCross", "flowCandidateOrder", "flowSearchOrder", "flowPathLength", "pathSelfCrosses",
    "flowCrossCount", "flowPathCost", "optimizeFlowPathShortest", "refineFlowOrder", "buildSingleRegionPlan",
    "normalizeFlowLocks", "getFlowRegionConfig", "getFlowLocksRegion", "getFlowStartRoutingRegion", "getFlowModeRegion",
    "resolveFlowModeFromStartAndDir", "applyFlowStartRouting", "applyFlowLocksToOrdered", "getDataFlowGroupsUncached",
    "planNumberRegionsUncached"
  ]) addFn(name);
  s.push(`
self.onmessage=e=>{
  const d=e&&e.data?e.data:{};
  const kind=d.kind;
  const reqId=d.reqId;
  const payload=d.payload||{};
  let ok=true,result=null,timedOut=false,elapsed=0;
  const started=calcNow();
  try{
    const hsSet=new Set(Array.isArray(payload.hs)?payload.hs.map(v=>String(v)):[]);
    if(kind==="regions"){
      const budget=makeCalcBudget();
      result=planNumberRegionsUncached(payload.r,payload.cx,payload.cy,payload.topo,hsSet,budget);
      timedOut=!!(budget&&budget.timedOut)||!!(result&&result._timedOut);
    }else if(kind==="flow"){
      const budget=makeCalcBudget();
      const reg=payload.regions&&typeof payload.regions==="object"?payload.regions:null;
      const regions=reg?{nx:reg.nx||1,colToGroup:Array.isArray(reg.colToGroup)?reg.colToGroup:[],rowToGroup:Array.isArray(reg.rowToGroup)?reg.rowToGroup:[],cellToRegion:Array.isArray(reg.cellToRegion)?reg.cellToRegion:[],regionsById:new Map(Object.entries(reg.labels||{}).map(([k,v])=>[Math.max(0,Math.round(Number(k)||0)),{id:Math.max(0,Math.round(Number(k)||0)),label:String(v||"")}]))}:null;
      result=getDataFlowGroupsUncached(payload.r,payload.cx,payload.cy,payload.topo,hsSet,regions,budget);
      timedOut=!!(budget&&budget.timedOut);
    }else{
      ok=false;
    }
  }catch(_e){ok=false;result=null;}
  elapsed=calcNow()-started;
  self.postMessage({kind,reqId,ok,result,timedOut,elapsed});
};`);
  return s.join("\n");
};
