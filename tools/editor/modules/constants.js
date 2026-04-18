export const FLOW_DRAW_BATCH_THRESHOLD = 280;
export const FLOW_DRAW_BATCH_STEP = 360;
export const FLOW_POINT_INDEX_CELL = 48;

export const INSTALL_HINT_KEY = "led-mask-editor-install-hint-dismissed";
export const HELP_SEEN_KEY = "led-mask-editor-help-seen-v1";
export const SAVE_LOCATION_ID_KEY = "led-mask-editor.save-location-id.v1";

export const RIG_DEFAULT_LOAD_KG = 25;
export const LOAD_ICON_VIEWBOX = 640;
export const LOAD_ICON_PATH_D = "M288 160C288 142.3 302.3 128 320 128C337.7 128 352 142.3 352 160C352 177.7 337.7 192 320 192C302.3 192 288 177.7 288 160zM410.5 192C414 182 416 171.2 416 160C416 107 373 64 320 64C267 64 224 107 224 160C224 171.2 225.9 182 229.5 192L207.7 192C179.4 192 154.5 210.5 146.4 237.6L66.4 504.2C64.8 509.4 64 514.8 64 520.2C64 551 89 576 119.8 576L520.2 576C551 576 576 551 576 520.2C576 514.8 575.2 509.4 573.6 504.2L493.6 237.7C485.5 210.6 460.6 192.1 432.3 192.1L410.5 192.1z";

export const DATA_FLOW_MODES = new Set(["none", "h_bl_lr", "h_tl_lr", "h_br_rl", "h_tr_rl", "v_lb_bu", "v_rb_bu", "v_lt_td", "v_rt_td"]);
export const FLOW_SEARCH_NODE_LIMIT_STRICT = 4000;
export const FLOW_SEARCH_NODE_LIMIT_RELAXED = 2000;
export const FLOW_REFINE_MAX_POINTS = 36;
export const FLOW_OPTIMIZE_MAX_POINTS = 96;
export const FLOW_DIR_SET = new Set(["right", "left", "down", "up"]);

export const PROJECT_CACHE_VERSION = 2;

export const SPLIT_VARIANT_MAX = 25;
export const AREA_LIMIT_EPS = 1e-6;
export const REGION_ZONE_COLORS = [[255, 0, 0], [0, 255, 0], [0, 0, 255], [255, 255, 0], [255, 0, 255], [0, 255, 255]];
export const CALC_TIMEOUT_MS = 500;
export const FLOW_WORKER_TIMEOUT_MS = 30000;
export const REGION_WORKER_TIMEOUT_MS = 30000;
export const CALC_WORKER_BOOT_URL = "./editor/workers/calc-worker-bootstrap.js";

export const AUTO_SAVE_KEY = "led-mask-editor.autosave.v1";
export const TABS_SAVE_KEY = "led-mask-editor.tabs.v1";
export const THEME_MODE_KEY = "led-mask-editor.theme-mode.v1";
export const PERSIST_DEBOUNCE_MS = 120;

export const PROJECT_QUERY_PARAM = "project";
export const PROJECT_ID_PARAM = "projectid";
export const PROJECT_QUERY_VERSION = "gz2";
export const PROJECT_STORE_SERVER_URL = "https://static.93.189.179.185.ip.webhost1.net";
export const PROJECT_STORE_API_PATH = "/project_store.php";
export const PROJECT_STORE_API_URL = (String(PROJECT_STORE_SERVER_URL || "").trim()
  ? `${String(PROJECT_STORE_SERVER_URL || "").trim().replace(/\/+$/, "")}${PROJECT_STORE_API_PATH}`
  : "./project_store.php");

export const PNG_PROJECT_META_KEY = "ledmask-project";
