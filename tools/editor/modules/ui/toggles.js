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
  for (const b of buttons) {
    if (!b) continue;
    b.classList.remove("btn-primary", "btn-danger", "btn-outline-secondary");
    b.classList.add(on ? "btn-danger" : "btn-outline-secondary");
    b.setAttribute("aria-pressed", on ? "true" : "false");
    const title = on ? "Разблокировать всё" : "Заблокировать всё";
    b.title = title;
    b.setAttribute("aria-label", title);
    const icon = b.querySelector("i");
    if (icon) icon.className = `fa-solid ${on ? "fa-lock" : "fa-unlock"}`;
  }
};
