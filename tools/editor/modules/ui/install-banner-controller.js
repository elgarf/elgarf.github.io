export const setupInstallBannerController = (deps = {}) => {
  const {
    el,
    bindClick,
    bindWindowEvent,
    isMobile,
    lsGet,
    lsSet,
    INSTALL_HINT_KEY
  } = deps;

  let deferredInstallPrompt = null;

  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent || "");

  const hideInstallBanner = () => {
    if (el && el.installBanner) el.installBanner.classList.remove("show");
  };

  const showInstallBanner = (text, actionText, actionFn) => {
    if (!isMobile() || isStandalone() || !el || !el.installBanner) return;
    el.installBannerText.textContent = text;
    el.installBannerAction.textContent = actionText;
    el.installBannerAction.onclick = actionFn;
    el.installBanner.classList.add("show");
  };

  const dismissInstallHint = () => {
    lsSet(INSTALL_HINT_KEY, "1");
    hideInstallBanner();
  };

  bindClick(el && el.installBannerClose, dismissInstallHint);
  bindClick(el && el.installApp, async () => {
    if (deferredInstallPrompt) {
      try {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        hideInstallBanner();
      } catch { /* noop */ }
      return;
    }
    if (isIOS()) {
      showInstallBanner("iOS: нажмите «Поделиться» и выберите «На экран Домой».", "Понятно", hideInstallBanner);
      return;
    }
    showInstallBanner("Установка недоступна в этом браузере.", "Ок", hideInstallBanner);
  });

  bindWindowEvent("beforeinstallprompt", e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (el && el.installApp) el.installApp.style.display = "inline-flex";
    showInstallBanner("Установить приложение на главный экран?", "Установить", async () => {
      if (!deferredInstallPrompt) return;
      try {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
      } catch { /* noop */ }
      deferredInstallPrompt = null;
      hideInstallBanner();
    });
  });

  bindWindowEvent("appinstalled", () => {
    deferredInstallPrompt = null;
    hideInstallBanner();
  });

  if (isMobile() && !isStandalone() && isIOS()) {
    const dismissed = lsGet(INSTALL_HINT_KEY, "") === "1";
    if (!dismissed) {
      setTimeout(() => showInstallBanner("Добавьте приложение на главный экран: «Поделиться» → «На экран Домой».", "Понятно", dismissInstallHint), 600);
    }
  }

  return { hideInstallBanner, showInstallBanner };
};


