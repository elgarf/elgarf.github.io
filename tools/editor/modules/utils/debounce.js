export const createDebounced = (fn, delayMs = 0) => {
  let timer = null;
  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const schedule = (...args) => {
    cancel();
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, Math.max(0, Math.round(Number(delayMs) || 0)));
  };
  return { schedule, cancel };
};
