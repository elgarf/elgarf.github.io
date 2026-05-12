const LANGUAGE_KEY = "led-mask-editor-language";
let currentLanguage = null;

const EN = {
  "Редактор масок LED экранов": "LED Screen Mask Editor",
  "Новая вкладка": "New tab",
  "Язык": "Language",
  "Язык: русский": "Language: Russian",
  "Проект": "Project",
  "Инструкция": "Help",
  "Заблокировать всё": "Lock all",
  "Разблокировать всё": "Unlock all",
  "Режим отображения": "View mode",
  "Для художников": "Art view",
  "Для монтажников": "Install view",
  "Спецификация": "Specification",
  "Выделить": "Select",
  "Добавить": "Add",
  "Добавить контур": "Add contour",
  "Примечание": "Note",
  "Скрыть или показать часть экрана": "Hide or show screen area",
  "Объединить или разделить кабинеты": "Join or split cabinets",
  "Исправить поток": "Edit flow",
  "Разделить на регионы вручную": "Split into regions manually",
  "Установить или подвесить": "Mount or suspend",
  "Копировать": "Copy",
  "Копировать и отразить": "Copy and mirror",
  "Копировать и отразить по вертикали": "Copy and mirror vertically",
  "Удалить": "Delete",
  "Отдалить": "Zoom out",
  "Приблизить": "Zoom in",
  "Сбросить масштаб": "Reset zoom",
  "Вписать": "Fit",
  "Отменить": "Undo",
  "Отменить (Ctrl+Z)": "Undo (Ctrl+Z)",
  "Повторить": "Redo",
  "Повторить (Ctrl+Y)": "Redo (Ctrl+Y)",
  "Новый проект": "New project",
  "Сохранить JSON": "Save JSON",
  "Сохранить проект в ссылку": "Save project to link",
  "Загрузить JSON": "Load JSON",
  "Экспорт пакета": "Export package",
  "Экспорт пакета (PNG + PNG+F + спецификация)": "Export package",
  "Ещё": "More",
  "Переключатели слоёв": "Layer toggles",
  "Устройства": "Devices",
  "Сигнальная и силовая коммутация": "Signal and power wiring",
  "Действия массового выделения": "Multi-selection actions",
  "Масштабирование выделения": "Selection resizing",
  "Панель свойств": "Properties panel",
  "Параметры": "Settings",
  "Свернуть инструменты": "Collapse tools",
  "Развернуть инструменты": "Expand tools",
  "Установить приложение": "Install app",
  "Тема": "Theme",
  "Авто": "Auto",
  "Светлая": "Light",
  "Тёмная": "Dark",
  "Закрыть спецификацию": "Close specification",
  "Свойства экрана": "Screen properties",
  "Параметры проекта и экрана": "Project and screen settings",
  "Закрыть": "Close",
  "Групповое редактирование: W/H масштабируют расстояния, минимум — исходный bbox": "Group editing: W/H scale distances, minimum is the original bbox",
  "Глобальные настройки": "Global settings",
  "Настройки проекта": "Project settings",
  "Выделите объект для редактирования его свойств": "Select an object to edit its properties",
  "Название проекта": "Project name",
  "Размер текста (px)": "Text size (px)",
  "Шрифт": "Font",
  "Масштаб проекта (px/м)": "Project scale (px/m)",
  "Снаппинг": "Snapping",
  "Сетка": "Grid",
  "Объекты": "Objects",
  "Центры": "Centers",
  "Зазоры": "Gaps",
  "Имя@Группа": "Name@Group",
  "Размер шрифта экрана (0 = глобальный)": "Screen font size (0 = global)",
  "Глобальный размер": "Global size",
  "Поворот (°)": "Rotation (deg)",
  "Ширина (м)": "Width (m)",
  "Высота (м)": "Height (m)",
  "Параметры опорной точки": "Anchor point settings",
  "Опорная точка X (px)": "Anchor point X (px)",
  "Опорная точка Y (px)": "Anchor point Y (px)",
  "Сглаженная точка (кривая)": "Smooth point (curve)",
  "Количество пикселей в 1м² экрана": "Pixels per 1 m² of screen",
  "Выбрать пресет": "Choose preset",
  "Основной": "Primary",
  "Дополнительный": "Secondary",
  "Прозрачность (%)": "Opacity (%)",
  "Авто дополнительный: вкл": "Auto secondary: on",
  "Авто дополнительный: выкл": "Auto secondary: off",
  "Случайный цвет": "Random color",
  "Размер кабинета X": "Cabinet size X",
  "Размер кабинета Y": "Cabinet size Y",
  "Ед.": "Unit",
  "Единица размера кабинета": "Cabinet size unit",
  "Направление потока данных": "Data flow direction",
  "Без потока": "No flow",
  "Снизу слева-направо": "Bottom left-to-right",
  "Сверху слева-направо": "Top left-to-right",
  "Снизу справа-налево": "Bottom right-to-left",
  "Сверху справа-налево": "Top right-to-left",
  "Слева снизу-вверх": "Left bottom-to-top",
  "Справа снизу-вверх": "Right bottom-to-top",
  "Слева сверху-вниз": "Left top-to-bottom",
  "Справа сверху-вниз": "Right top-to-bottom",
  "Нумеровать кабинеты": "Number cabinets",
  "Вариант разделения по сигналам": "Signal split variant",
  "Предыдущий вариант": "Previous variant",
  "Следующий вариант": "Next variant",
  "Ручное разбиение": "Manual split",
  "Удалить маски": "Clear masks",
  "Сброс потока": "Reset flow",
  "Сброс регионов": "Reset regions",
  "Преобразовать регионы в экраны": "Convert regions to screens",
  "Установить приложение на главный экран?": "Install app to home screen?",
  "Установить": "Install",
  "Позже": "Later",
  "Автосейв": "Autosave",
  "Работа с холстом": "Canvas controls",
  "ПК": "Desktop",
  "Мобильные": "Mobile",
  "Иконки инструментов (сверху вниз):": "Tool icons (top to bottom):",
  "ЛКМ: выделение/перемещение объектов и работа активным": "LMB: select/move objects and use the active",
  "инструментом.": "tool.",
  "ПКМ или": "RMB or",
  "Space + ЛКМ:": "Space + LMB:",
  "панорамирование холста.": "pan the canvas.",
  "Колесо мыши: масштаб в точке курсора.": "Mouse wheel: zoom at the cursor.",
  "Ctrl при перетаскивании: временно отключает снаппинг.": "Ctrl while dragging: temporarily disables snapping.",
  "Esc: выход в инструмент выделения. Delete: удалить выбранный": "Esc: switch back to the select tool. Delete: delete the selected",
  "объект.": "object.",
  "1 касание: взаимодействие с объектом по выбранному инструменту.": "1 touch: interact with the object using the selected tool.",
  "1 касание по пустому месту (в некоторых режимах):": "1 touch on empty space (in some modes):",
  "панорамирование.": "pan.",
  "2 касания: масштаб и панорамирование одновременно.": "2 touches: zoom and pan at the same time.",
  "Нижняя плавающая панель: быстрый доступ к инструментам и зуму.": "Bottom floating dock: quick access to tools and zoom.",
  "Выбор экрана и перетаскивание. Ctrl временно отключает снап.": "Select a screen and drag it. Ctrl temporarily disables snapping.",
  "Создание нового экрана протяжкой мыши или пальцем. Нажатие переключает экран, примечание и контур; удержание открывает подменю.": "Create a new screen by dragging with the mouse or finger. Press to cycle screen, note, and contour; hold to open the submenu.",
  "Создание текстового блока. Двойной клик по примечанию открывает редактирование прямо на холсте.": "Create a text block. Double-click a note to edit it directly on the canvas.",
  "Кликами ставьте опорные точки замкнутой фигуры, двойной клик завершает контур. Точки можно редактировать, удалять двойным кликом и делать сглаженными: у такой точки появляются ручки изгиба.": "Click to place anchor points of a closed shape, double-click to finish the contour. Points can be edited, deleted with a double-click, and made smooth: this shows curve handles for the point.",
  "Клики по узлам сетки. Замкните контур, чтобы": "Click grid nodes. Close the contour to",
  "инвертировать видимость кабинетов внутри контура.": "invert cabinet visibility inside the contour.",
  "Клик по общей границе кабинетов включает или выключает": "Click a shared cabinet edge to turn",
  "склейку.": "joining on or off.",
  "Кнопка имеет режимы А и М. А — правка автоматического потока: перенос старта, выбор направления и межэкранные связи. М — ручная расстановка потока по кабинетам кликами или протягиванием; кнопка сброса рядом со стартом возвращает регион к автоматике.": "The button has A and M modes. A edits automatic flow: moving the start, choosing direction, and inter-screen links. M places the cabinet flow manually by clicking or dragging; the reset button near the start returns the region to automatic mode.",
  "Перетаскивайте точки потока внутри региона. Стартовую точку можно": "Drag flow points inside the region. The start point can be",
  "перенести, направление задаётся стрелками рядом со стартом, двойной клик по старту сбрасывает правки": "moved, direction is set with arrows near the start, double-clicking the start resets edits",
  "региона. Межэкранная связь: протяните от конечной точки потока одного экрана к стартовой точке": "for the region. Inter-screen link: drag from the end flow point of one screen to the start point",
  "другого. Превью красное, если связь недопустима. Клик по связи удаляет её.": "of another. The preview is red if the link is invalid. Click a link to remove it.",
  "Клик по кабинету создаёт регион. Клик по метке региона": "Click a cabinet to create a region. Click the region label",
  "удаляет регион. Стрелки вокруг старта растягивают регион с учётом лимита площади.": "to delete the region. Arrows around the start expand the region within the area limit.",
  "Клик по вертикальному стыку добавляет/убирает раму. Клик снизу": "Click a vertical joint to add/remove a frame. Click below",
  "стыка добавляет/убирает груз. Клик сверху кабинета добавляет подвес, клик между подвесами": "the joint to add/remove a weight. Click above a cabinet to add a suspension, click between suspensions",
  "объединяет/разрезает подвесы.": "to join/split suspensions.",
  "Создаёт копию выбранного экрана со смещением.": "Creates an offset copy of the selected screen.",
  "Создаёт копию с отражением масок и связей клеток по": "Creates a copy with masks and cell links mirrored",
  "вертикали.": "vertically.",
  "Удаляет выбранный экран.": "Deletes the selected screen.",
  "Уменьшает масштаб холста.": "Zooms the canvas out.",
  "Увеличивает масштаб холста.": "Zooms the canvas in.",
  "Возвращает масштаб холста к 100%.": "Returns the canvas zoom to 100%.",
  "Подгоняет камеру под все экраны на сцене.": "Fits the camera to all screens in the scene.",
  "Отменяет последнее изменение проекта без отката позиции камеры.": "Undoes the last project change without reverting the camera position.",
  "Возвращает отменённое изменение проекта без изменения позиции камеры.": "Redoes the undone project change without changing the camera position.",
  "Режим предпросмотра экрана для подготовки изображения.": "Screen preview mode for preparing artwork.",
  "Монтажный режим с потоками, ригом, сеткой и рабочими оверлеями.": "Install mode with flows, rigging, grid, and working overlays.",
  "Открывает список экранов, кабинетов, коммутации, рига и замечаний.": "Opens the list of screens, cabinets, wiring, rigging, and notes.",
  "Очищает сцену и создаёт проект с настройками по умолчанию.": "Clears the scene and creates a project with default settings.",
  "Сохраняет проект в файл JSON.": "Saves the project to a JSON file.",
  "Создаёт ссылку с данными проекта.": "Creates a link containing the project data.",
  "Загружает проект из файла JSON или PNG с сохранёнными данными.": "Loads a project from a JSON file or PNG with saved data.",
  "Экспортирует PNG-варианты, спецификацию и резервный JSON проекта.": "Exports PNG variants, the specification, and a backup project JSON.",
  "Переключает язык интерфейса.": "Switches the interface language.",
  "Переключает светлую, тёмную или системную тему.": "Switches the light, dark, or system theme.",
  "Кнопки у общего bounding box в монтажном режиме скрывают или показывают текст, потоки и риг на холсте.": "Buttons near the overall bounding box in install mode hide or show text, flows, and rigging on the canvas.",
  "Кнопки у bounding box выделения прижимают экраны к краям, расставляют рядом, распределяют между крайними и поворачивают группу.": "Buttons near the selection bounding box align screens to edges, pack them together, distribute them between the extremes, and rotate the group.",
  "Маркеры по сторонам bounding box меняют ширину или высоту группы; Alt масштабирует от центра.": "Handles on the bounding box sides change the group width or height; Alt scales from the center.",
  "Загрузка": "Loading",
  "QR-код ссылки проекта": "Project link QR code",
  "Сохранение...": "Saving...",
  "Ошибка автосейва": "Autosave error",
  "Автосейв включен": "Autosave enabled",
  "Защита автосейва: пустой проект не записан": "Autosave protection: empty project was not written",
  "Сообщение": "Message",
  "Ошибка": "Error",
  "Ошибка сохранения": "Save error",
  "Ошибка импорта": "Import error",
  "Ошибка JSON": "JSON error",
  "Ошибка загрузки": "Load error",
  "Ошибка загрузки файла": "File load error",
  "Импорт PNG": "PNG import",
  "Данное изображение не содержит данных проекта": "This image does not contain project data",
  "Ошибка данных проекта в PNG": "Project data error in PNG",
  "Ошибка нативного сохранения (Tauri)": "Native save error (Tauri)",
  "Имя файла:": "File name:",
  "Параметр проекта в URL повреждён или не поддерживается": "Project URL parameter is corrupted or unsupported",
  "Нечего экспортировать": "Nothing to export",
  "Ошибка экспорта": "Export error",
  "Пакет экспортирован": "Package exported",
  "Недостаточно регионов для преобразования": "Not enough regions to convert",
  "Формируем ссылку...": "Creating link...",
  "Подготовка...": "Preparing...",
  "Ссылка проекта": "Project link",
  "Не удалось сформировать ссылку проекта": "Could not create project link",
  "Скопировать ссылку": "Copy link",
  "Ссылка скопирована": "Link copied",
  "Скопируйте ссылку проекта": "Copy project link",
  "Введите текст примечания": "Enter note text",
  "Двойной клик для ввода текста": "Double-click to enter text",
  "Включать в рендер режима для художника": "Include in art view render",
  "Экранов пока нет.": "No screens yet.",
  "Блокировка экрана": "Screen lock",
  "Разблокировать экран": "Unlock screen",
  "Заблокировать экран": "Lock screen",
  "Текущий экран заблокирован. Разблокируйте слой для редактирования.": "Current screen is locked. Unlock the layer to edit.",
  "Блок": "Block",
  "Секция": "Section",
  "Экран": "Screen",
  "Кабинет": "Cabinet",
  "Кабинет не выбран": "Cabinet not selected",
  "Нет данных для спецификации": "No specification data",
  "Общее дополнение": "General addition",
  "Общие замечания": "General notes",
  "Доп. пункт": "Extra item",
  "Перенесено": "Moved",
  "Итоговая сумма": "Grand total",
  "Группа": "Group",
  "Группы": "Groups",
  "Общая": "General",
  "Количество экранов": "Screen count",
  "Кабинеты": "Cabinets",
  "Коммутация": "Wiring",
  "Межэкранные связи": "Inter-screen links",
  "Межэкранная коммутация": "Inter-screen wiring",
  "Подвесы": "Suspensions",
  "Рамы": "Frames",
  "Грузы": "Weights",
  "Скоба такелажная": "Rigging shackle",
  "Стропа": "Sling",
  "Скоба монтажная для рамы": "Frame mounting bracket",
  "Болт для крепления скобы": "Bracket mounting bolt",
  "Площадь экранов": "Screen area",
  "Итого": "Total",
  "Кабинетов": "Cabinets",
  "Локальный размер": "Local size",
  "Режим": "Mode",
  "Нажмите для переключения": "Press to switch",
  "Тема: тёмная": "Theme: dark",
  "Тема: светлая": "Theme: light",
  "Тема: авто": "Theme: auto",
  "Номер разбиения": "Split number",
  "Действие": "Action",
  "Прижать к левому краю": "Align left",
  "Прижать к правому краю": "Align right",
  "Прижать к верхнему краю": "Align top",
  "Прижать к нижнему краю": "Align bottom",
  "Расставить рядом по горизонтали": "Pack horizontally",
  "Расставить рядом по вертикали": "Pack vertically",
  "Распределить по горизонтали": "Distribute horizontally",
  "Распределить по вертикали": "Distribute vertically",
  "Текст": "Text",
  "Потоки": "Flows",
  "Нет устройств": "No devices",
  "Риг": "Rig",
  "Направление потока": "Flow direction",
  "Влево": "Left",
  "Вправо": "Right",
  "Вверх": "Up",
  "Вниз": "Down",
  "Сбросить ручной поток": "Reset manual flow",
  "Некорректный PNG": "Invalid PNG",
  "Некорректная PNG сигнатура": "Invalid PNG signature",
  "PNG IEND не найден": "PNG IEND not found",
  "Сжатые PNG метаданные не поддерживаются": "Compressed PNG metadata is not supported",
  "iOS: нажмите «Поделиться» и выберите «На экран Домой».": "iOS: tap Share and choose Add to Home Screen.",
  "Установка недоступна в этом браузере.": "Installation is unavailable in this browser.",
  "Добавьте приложение на главный экран: «Поделиться» → «На экран Домой».": "Add the app to the home screen: Share -> Add to Home Screen.",
  "Понятно": "OK",
  "Ок": "OK",
  "м": "m",
  "м²": "m²",
  "кг": "kg",
  "шт.": "pcs"
};

const TRANSLATIONS = { ru: {}, en: EN };
const LANGS = ["ru", "en"];
const ATTRS = ["title", "aria-label", "placeholder"];

const normalizeLang = lang => LANGS.includes(String(lang || "").toLowerCase().slice(0, 2))
  ? String(lang || "").toLowerCase().slice(0, 2)
  : "ru";

const detectLanguage = (navigatorRef = navigator) => {
  const langs = [navigatorRef && navigatorRef.language, ...Array.from((navigatorRef && navigatorRef.languages) || [])]
    .filter(Boolean)
    .map(v => String(v).toLowerCase());
  for (const lang of langs) {
    const code = lang.slice(0, 2);
    if (LANGS.includes(code)) return code;
  }
  return "ru";
};

export const getCurrentLanguage = () => normalizeLang(currentLanguage || detectLanguage());

export const translateText = (value, lang = getCurrentLanguage()) => {
  const text = String(value == null ? "" : value);
  if (normalizeLang(lang) === "ru" || !text) return text;
  const dict = TRANSLATIONS.en;
  if (dict[text]) return dict[text];
  const leading = text.match(/^\s*/)[0];
  const trailing = text.match(/\s*$/)[0];
  const core = text.trim();
  if (dict[core]) return `${leading}${dict[core]}${trailing}`;
  const compactCore = core.replace(/\s+/g, " ");
  if (dict[compactCore]) return `${leading}${dict[compactCore]}${trailing}`;
  return text;
};

export const setupI18n = (deps = {}) => {
  const {
    documentRef = document,
    navigatorRef = navigator,
    languageToggle,
    onLanguageChange
  } = deps;
  let lang = detectLanguage(navigatorRef);
  currentLanguage = lang;

  const translateNode = node => {
    if (!node || normalizeLang(lang) === "ru") return;
    if (node.nodeType === Node.TEXT_NODE) {
      const raw = node.nodeValue;
      if (!raw || !/[А-Яа-яЁё]/.test(raw)) return;
      if (!node.parentElement || node.parentElement.closest("script,style,textarea,input")) return;
      if (node.parentElement.closest("[data-i18n-skip]")) return;
      if (!node.__i18nSource) node.__i18nSource = raw;
      node.nodeValue = translateText(node.__i18nSource, lang);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.closest("[data-i18n-skip]")) return;
    for (const attr of ATTRS) {
      const raw = node.getAttribute(attr);
      if (!raw || !/[А-Яа-яЁё]/.test(raw)) continue;
      const sourceAttr = `data-i18n-source-${attr}`;
      if (!node.hasAttribute(sourceAttr)) node.setAttribute(sourceAttr, raw);
      node.setAttribute(attr, translateText(node.getAttribute(sourceAttr), lang));
    }
    if (node.tagName === "OPTION") {
      if (!node.__i18nSourceText && /[А-Яа-яЁё]/.test(node.textContent || "")) node.__i18nSourceText = node.textContent;
      if (node.__i18nSourceText) node.textContent = translateText(node.__i18nSourceText, lang);
    }
  };

  const restoreNode = node => {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.__i18nSource) node.nodeValue = node.__i18nSource;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    for (const attr of ATTRS) {
      const sourceAttr = `data-i18n-source-${attr}`;
      if (node.hasAttribute(sourceAttr)) node.setAttribute(attr, node.getAttribute(sourceAttr));
    }
    if (node.tagName === "OPTION" && node.__i18nSourceText) node.textContent = node.__i18nSourceText;
  };

  const walk = (root, fn) => {
    if (!root) return;
    fn(root);
    const walker = documentRef.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      fn(node);
      node = walker.nextNode();
    }
  };

  const syncToggle = () => {
    if (!languageToggle) return;
    languageToggle.textContent = lang.toUpperCase();
    languageToggle.title = lang === "ru" ? "Язык: русский" : "Language: English";
    languageToggle.setAttribute("aria-label", languageToggle.title);
  };

  const applyLanguage = nextLang => {
    lang = normalizeLang(nextLang);
    currentLanguage = lang;
    try { localStorage.removeItem(LANGUAGE_KEY); } catch { /* noop */ }
    documentRef.documentElement.lang = lang;
    walk(documentRef.body, lang === "ru" ? restoreNode : translateNode);
    syncToggle();
    if (typeof onLanguageChange === "function") onLanguageChange(lang);
  };

  if (languageToggle) {
    languageToggle.type = "button";
    languageToggle.classList.add("language-toggle");
    languageToggle.addEventListener("click", () => applyLanguage(lang === "ru" ? "en" : "ru"));
  }
  applyLanguage(lang);

  return {
    getLanguage: () => lang,
    setLanguage: applyLanguage,
    t: value => translateText(value, lang),
    translateDom: root => walk(root || documentRef.body, lang === "ru" ? restoreNode : translateNode)
  };
};


