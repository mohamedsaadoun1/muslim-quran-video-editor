// js/shared-ui-components/theme.controller.js

// لا تستورد DOMElements هنا مباشرة بعد الآن
// import DOMElements from '../core/dom-elements.js'; // <--- محذوف

import { ACTIONS, EVENTS, LS_KEYS } from '../config/app.constants.js';

/**
 * @typedef {Object} ThemeControllerDependencies
 * @property {Object} DOMElements - كائن عناصر DOM المُهيأ (سيتم حقنه)
 * @property {Object} stateStore - مخزن الحالة
 * @property {Object} eventAggregator - محرك الأحداث
 * @property {Object} errorLogger - مسجل الأخطاء
 * @property {Object} localizationServiceAPI - خدمة الترجمة
 */

// سيتم تهيئة هذه الاعتماديات من خلال دالة initializeThemeController
let deps = {
  DOMElements: null,
  stateStore: null,
  eventAggregator: null,
  errorLogger: console, // قيمة افتراضية
  localizationServiceAPI: { translate: (key) => key } // قيمة افتراضية
};

let currentDOMTheme = 'light'; // قيمة افتراضية، ستُحدّث من الحالة أو localStorage
const LS_KEY_THEME = LS_KEYS.THEME || 'appCurrentTheme'; // تأكد أن LS_KEYS.THEME موجود

/**
 * تطبيق التغييرات المرئية للثيم على DOM
 * @private
 * @param {string} theme - 'light' or 'dark'
 */
function _applyThemeToDOM(theme) {
  if (!document.body || !deps.DOMElements) {
    deps.errorLogger.warn?.({ // استخدام Optional Chaining و Nullish Coalescing
      message: 'عنصر body أو DOMElements غير متاح. لا يمكن تطبيق الموضوع.',
      origin: 'ThemeController._applyThemeToDOM'
    });
    return;
  }

  const newThemeClass = theme === 'dark' ? 'dark-theme' : 'light-theme';
  const oldThemeClass = theme === 'dark' ? 'light-theme' : 'dark-theme';

  document.body.classList.remove(oldThemeClass);
  document.body.classList.add(newThemeClass);

  const sunIconHTML = '<i class="fas fa-sun"></i>';
  const moonIconHTML = '<i class="fas fa-moon"></i>';
  const newIconHTML = theme === 'dark' ? sunIconHTML : moonIconHTML;

  const newAriaLabelKey = theme === 'dark' ? 'theme.toggle.switchToLight' : 'theme.toggle.switchToDark';
  const fallbackAriaLabel = theme === 'dark' ? 'تبديل إلى الوضع النهاري' : 'تبديل إلى الوضع الليلي';
  const newAriaLabel = deps.localizationServiceAPI.translate(newAriaLabelKey) || fallbackAriaLabel;

  const themeButtons = [
    deps.DOMElements.controls?.theme?.initial,
    deps.DOMElements.controls?.theme?.editor
  ];

  themeButtons.forEach(button => {
    if (button) {
      button.innerHTML = newIconHTML;
      button.setAttribute('title', newAriaLabel);
      button.setAttribute('aria-label', newAriaLabel);
    }
  });

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    const PWA_THEME_COLOR_DARK = '#0D0D0D';
    const PWA_THEME_COLOR_LIGHT = '#00796b';
    metaThemeColor.setAttribute('content', theme === 'dark' ? PWA_THEME_COLOR_DARK : PWA_THEME_COLOR_LIGHT);
  }

  currentDOMTheme = theme;
  // لا تقم بإرسال publish أو dispatch هنا مباشرة، دع ذلك يتم من خلال معالجات أخرى أو بعد تغيير الحالة الأساسية.
}

/**
 * معالج النقر على زر تبديل الثيم
 * @private
 */
function _handleThemeToggle() {
  if (!deps.stateStore) return;
  // نحصل على الثيم الحالي إما من currentDOMTheme (الأسرع) أو من الحالة لضمان الدقة
  // لكن الأفضل هو تبديل الثيم الحالي المطبق فعليًا على DOM
  const newTheme = currentDOMTheme === 'light' ? 'dark' : 'light';
  
  // الخطوة 1: إرسال التغيير إلى الحالة
  deps.stateStore.dispatch(ACTIONS.SET_THEME, newTheme);
  
  // الخطوة 2: نشر حدث (اختياري إذا كانت الحالة هي مصدر الحقيقة الوحيد)
  // deps.eventAggregator.publish(EVENTS.THEME_CHANGE_REQUESTED, { requestedTheme: newTheme });

  // ملاحظة: تطبيق الثيم على DOM (_applyThemeToDOM) سيحدث الآن من خلال مشترك stateStore
  // ويجب أيضًا أن يتم حفظ الثيم في localStorage بعد تغيير الحالة بنجاح
}

/**
 * ربط مستمعي الأحداث بأزرار الثيم
 * @private
 */
function _initializeEventListeners() {
  if (!deps.DOMElements?.controls?.theme) {
    deps.errorLogger.warn?.({
      message: 'كائن DOMElements.controls.theme غير مهيأ. لا يمكن ربط أحداث أزرار الثيم.',
      origin: 'ThemeController._initializeEventListeners'
    });
    return;
  }

  const { initial, editor } = deps.DOMElements.controls.theme;

  if (initial) {
    initial.removeEventListener('click', _handleThemeToggle); // إزالة القديم
    initial.addEventListener('click', _handleThemeToggle);
  } else {
    deps.errorLogger.warn?.({ message: "زر الثيم الأولي (initial) غير موجود في DOM.", origin: "ThemeController"});
  }

  if (editor) {
    editor.removeEventListener('click', _handleThemeToggle); // إزالة القديم
    editor.addEventListener('click', _handleThemeToggle);
  } else {
    deps.errorLogger.warn?.({ message: "زر الثيم في المحرر (editor) غير موجود في DOM.", origin: "ThemeController"});
  }
  deps.errorLogger.info?.({message: "[ThemeController] تم ربط مستمعي الأحداث لأزرار الثيم.", origin: "ThemeController"});
}

/**
 * التحقق من صلاحية اسم الثيم
 * @private
 */
function _validateTheme(theme) {
  return theme === 'light' || theme === 'dark';
}

/**
 * حفظ الثيم في localStorage
 * @private
 */
function _saveThemeToLocalStorage(theme) {
  if (!_validateTheme(theme)) return;
  try {
    const lsa = deps.localStorageAdapter || localStorage; // افترض أن localStorageAdapter يتم حقنه
    lsa.setItem(LS_KEY_THEME, theme);
  } catch (error) {
    deps.errorLogger.error?.({
      error,
      message: `فشل في حفظ الثيم في localStorage: ${theme}`,
      origin: 'ThemeController._saveThemeToLocalStorage'
    });
  }
}

/**
 * تحميل الثيم من localStorage
 * @private
 */
function _loadThemeFromLocalStorage() {
  try {
    const lsa = deps.localStorageAdapter || localStorage;
    return lsa.getItem(LS_KEY_THEME);
  } catch (error) {
    deps.errorLogger.error?.({
      error,
      message: 'فشل في تحميل الثيم من localStorage',
      origin: 'ThemeController._loadThemeFromLocalStorage'
    });
    return null;
  }
}


// ----- الواجهة العامة للمتحكم بالثيم -----
const themeControllerAPI = {
  applyTheme: (theme) => {
    if (_validateTheme(theme)) {
        // هذه الدالة يجب أن تقوم بتغيير الحالة أولاً
        deps.stateStore.dispatch(ACTIONS.SET_THEME, theme);
        // المشترك على الحالة سيتولى _applyThemeToDOM و _saveThemeToLocalStorage
    } else {
        deps.errorLogger.warn?.({message: `محاولة تطبيق ثيم غير صالح: ${theme}`, origin: "themeControllerAPI.applyTheme"});
    }
  },
  toggleTheme: _handleThemeToggle, //  _handleThemeToggle الآن يرسل فقط للحالة
  getActiveTheme: () => currentDOMTheme,
  isDarkMode: () => currentDOMTheme === 'dark',
};

/**
 * دالة التهيئة التي سيستدعيها moduleBootstrap
 * @param {ThemeControllerDependencies} injectedDependencies - الاعتماديات المحقونة
 * @returns {Object} - واجهة برمجة تطبيقات متحكم الثيم
 */
export function initializeThemeController(injectedDependencies) {
  deps.errorLogger.info?.({message: "[ThemeController] بدء التهيئة...", context: injectedDependencies, origin: "ThemeController"});

  // 1. حقن الاعتماديات
  if (injectedDependencies) {
    deps.DOMElements = injectedDependencies.DOMElements || deps.DOMElements;
    deps.stateStore = injectedDependencies.stateStore || deps.stateStore;
    deps.eventAggregator = injectedDependencies.eventAggregator || deps.eventAggregator;
    deps.errorLogger = injectedDependencies.errorLogger || deps.errorLogger;
    deps.localizationServiceAPI = injectedDependencies.localizationServiceAPI || deps.localizationServiceAPI;
    deps.localStorageAdapter = injectedDependencies.localStorageAdapter || localStorage; // إضافة هذا
  }

  if (!deps.DOMElements) {
    deps.errorLogger.error?.({message: "[ThemeController] DOMElements is missing. Theme functionality will be impaired.", origin: "ThemeController.init"});
    // لا يمكن المتابعة بدون DOMElements لمعالجات الأزرار
  }
  if (!deps.stateStore || !deps.stateStore.dispatch || !deps.stateStore.subscribe) {
     deps.errorLogger.error?.({message: "[ThemeController] StateStore is not fully available. Theme state management will be impaired.", origin: "ThemeController.init"});
     // قد يكون من الصعب المتابعة بدون stateStore
  }


  // 2. ربط مستمعي الأحداث بالأزرار (يعتمد على DOMElements المحقون)
  _initializeEventListeners();

  // 3. الاشتراك في تغييرات الحالة (من stateStore) لتحديث الـ DOM و localStorage
  if (deps.stateStore && typeof deps.stateStore.subscribe === 'function') {
    // يمكن تخزين دالة إلغاء الاشتراك إذا لزم الأمر
    const unsubscribe = deps.stateStore.subscribe((newState, oldState) => {
      const newThemeFromState = newState?.currentTheme || newState?.appSettings?.currentTheme;
      // تحقق إذا كان الثيم في الحالة قد تغير بالفعل وإذا كان مختلفًا عن المطبق حاليًا
      if (newThemeFromState && _validateTheme(newThemeFromState) && newThemeFromState !== currentDOMTheme) {
        deps.errorLogger.info?.({message:`[ThemeController] State changed. New theme: ${newThemeFromState}. Current DOM theme: ${currentDOMTheme}`, origin: "ThemeController.stateSubscription"});
        _applyThemeToDOM(newThemeFromState);
        _saveThemeToLocalStorage(newThemeFromState); // حفظ التغيير الذي جاء من الحالة
        // نشر حدث بأن الثيم قد تم تطبيقه فعليًا
        deps.eventAggregator.publish(EVENTS.THEME_APPLIED, { theme: newThemeFromState, timestamp: Date.now() });
      }
    });
    // themeControllerAPI.unsubscribeState = unsubscribe; // لتوفير إمكانية إلغاء الاشتراك
  } else {
    deps.errorLogger.warn?.({message: "[ThemeController] stateStore.subscribe is not available. Theme will not react to state changes.", origin: "ThemeController.init"});
  }

  // 4. تحميل وتطبيق الثيم الأولي
  // الأولوية للحالة، ثم localStorage، ثم الافتراضي
  const state = deps.stateStore?.getState?.();
  let initialTheme = state?.currentTheme || state?.appSettings?.currentTheme;

  if (!initialTheme || !_validateTheme(initialTheme)) {
    initialTheme = _loadThemeFromLocalStorage();
  }
  if (!initialTheme || !_validateTheme(initialTheme)) {
    // إذا لم يوجد في الحالة ولا في localStorage، استخدم تفضيل المتصفح
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
    initialTheme = prefersDark ? 'dark' : 'light';
  }
  if (!_validateTheme(initialTheme)) { // كضمان أخير
    initialTheme = 'light'; 
  }
  
  deps.errorLogger.info?.({message:`[ThemeController] Determining initial theme. From state: ${state?.currentTheme}, From localStorage: ${_loadThemeFromLocalStorage()}, Determined as: ${initialTheme}`, origin: "ThemeController.init"});

  // ضبط الحالة بالثيم الأولي إذا لم تكن مضبوطة أو إذا كانت مختلفة
  if (state && (state.currentTheme !== initialTheme && state.appSettings?.currentTheme !== initialTheme) ) {
      deps.stateStore.dispatch(ACTIONS.SET_THEME, initialTheme);
      // الـ subscriber سيتولى _applyThemeToDOM و _saveThemeToLocalStorage
  } else {
      // إذا كانت الحالة تحتوي بالفعل على الثيم الصحيح، أو لا يوجد stateStore، طبقه مباشرة
      _applyThemeToDOM(initialTheme);
      _saveThemeToLocalStorage(initialTheme); // تأكد من الحفظ إذا لم يقم الـ subscriber بذلك
  }
  
  deps.errorLogger.info?.({message:"[ThemeController] تهيئة مكتملة.", origin: "ThemeController"});
  return themeControllerAPI;
}

// لا نصدر الكائن `themeController` مباشرة كـ default
// `initializeThemeController` هي نقطة الدخول التي سيستخدمها `moduleBootstrap`.
// إذا كنت تريد تصدير افتراضي لسبب آخر، يمكن أن يكون themeControllerAPI أو init.
// export default themeControllerAPI; // أو initializeThemeController
