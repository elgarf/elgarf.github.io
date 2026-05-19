/* build:1779222473 */
export const syncModeToggleButton = (button, isActive, activeTitle, inactiveTitle) => {
  if (!button) return;
  button.classList.remove("btn-secondary", "btn-primary");
  button.classList.add("btn-outline-secondary");
  button.classList.toggle("mode-install", !!isActive);
  button.classList.toggle("mode-art", !isActive);
  const title = isActive ? activeTitle : inactiveTitle;
  button.title = title;
  button.setAttribute("aria-label", `${title}. Нажмите для переключения.`);
  button.setAttribute("aria-pressed", isActive ? "true" : "false");
};

export const syncLockButtons = (buttons, on) => {
  const theme = String(document && document.documentElement && document.documentElement.getAttribute("data-bs-theme") || "").toLowerCase();
  const offClass = theme === "light" ? "btn-outline-dark" : "btn-outline-light";
  for (const b of buttons) {
    if (!b) continue;
    b.classList.remove("btn-primary", "btn-danger", "btn-secondary", "btn-outline-secondary", "btn-outline-light", "btn-outline-dark");
    b.classList.add(on ? "btn-danger" : offClass);
    b.setAttribute("aria-pressed", on ? "true" : "false");
    const title = on ? "Разблокировать всё" : "Заблокировать всё";
    b.title = title;
    b.setAttribute("aria-label", title);
    const icon = b.querySelector("i");
    if (icon) icon.className = `fa-solid ${on ? "fa-lock" : "fa-unlock"}`;
  }
};
