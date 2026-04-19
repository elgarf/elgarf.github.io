export const lsGet = (key, fallback = null) => {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : value;
  } catch (_e) {
    return fallback;
  }
};

export const lsSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (_e) {
    return false;
  }
};

export const cloneJson = (data, fallback = null) => {
  try {
    return JSON.parse(JSON.stringify(data));
  } catch (_e) {
    return typeof fallback === "function" ? fallback() : fallback;
  }
};

export const jsonEquals = (a, b) => {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (_e) {
    return false;
  }
};
