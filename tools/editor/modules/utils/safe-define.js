export const safeDefine = (obj, key, value, enumerable = false) => {
  try {
    Object.defineProperty(obj, key, { value, writable: true, configurable: true, enumerable: !!enumerable });
  } catch (_e) {
    obj[key] = value;
  }
  return value;
};
