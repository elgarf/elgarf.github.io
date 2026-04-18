export const createRectStore = getRects => ({
  getById(id) {
    const list = typeof getRects === "function" ? getRects() : [];
    const target = Math.round(Number(id) || 0);
    return list.find(it => Math.round(Number(it && it.id) || 0) === target) || null;
  }
});
