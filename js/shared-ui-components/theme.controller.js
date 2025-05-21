// js/shared-ui-components/theme.controller.js

// لا تستورد DOMElements هنا مباشرة
// import DOMElements from '../core/dom-elements.js'; // <--- إزالة هذا السطر

// استورد الثوابت فقط
import { ACTIONS, EVENTS, LS_KEYS } from '../config/app.constants.js'; // افترض أن LS_KEYS.CURRENT_THEME هو ما تستخدمه


/**
 * @typedef {Object} ThemeControllerDependencies
 * @property {Object} DOMElements - كائن عناصر DOM المُهيأ  // <--- إضافة هذا
 * @property {Object} stateStore
 * @property {Object} eventAggregator
 * @property {Object} errorLogger
 * @property {Object} localizationServiceAPI // أو localizationService، حسب ما يوفره moduleBootstrap
 */

const themeControllerInternal = (() => {
  // متغير داخلي لتخزين الاعتماديات، بما في ذلك DOMElements
  let internalDeps = {
    DOMElements: null, // سيتم تعيينه عبر _setDependencies
    stateStore: {
      getState: () => ({ appSettings: { currentTheme: 'light' } }), // تم تعديل المسار ليناسب stateStore
      dispatch: () => {},
      subscribe: () => ({ unsubscribe: () => {} })
    },
    eventAggregator: {
      publish: () => {},
      subscribe: () => ({ unsubscribe: () => {} })
    },
    errorLogger: console,
    localizationServiceAPI: { // تم تغيير الاسم ليطابق ما يُقدم عادة
      translate: (key) => key
    }
  };
  let currentDOMTheme = 'light'; // يمكن تهيئتها لاحقًا من الحالة أو localStorage
  const LS_KEY_CURRENT_THEME = LS_KEYS.THEME || 'appCurrentTheme'; // استخدم الثابت

  /**
   * تطبيق الموضوع على DOM
   * @private
   * @param {string} theme - نوع الموضوع ('light' أو 'dark')
   */
  function _applyThemeToDOM(theme) {
    if (!document.body) {
      (internalDeps.errorLogger.warn || console.warn).call(internalDeps.errorLogger, { // استخدم warn بدل logWarning إذا كان errorLogger لا يحتوي عليها
        message: 'عنصر body غير موجود. لا يمكن تطبيق الموضوع.',
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
    const newAriaLabel = internalDeps.localizationServiceAPI.translate(newAriaLabelKey) || fallbackAriaLabel;
    
    // --- استخدام internalDeps.DOMElements ---
    if (internalDeps.DOMElements?.controls?.theme?.initial) { // تحقق من المسار الكامل
      internalDeps.DOMElements.controls.theme.initial.innerHTML = newIconHTML;
      internalDeps.DOMElements.controls.theme.initial.setAttribute('title', newAriaLabel);
      internalDeps.DOMElements.controls.theme.initial.setAttribute('aria-label', newAriaLabel);
    }
    
    if (internalDeps.DOMElements?.controls?.theme?.editor) { // تحقق من المسار الكامل
      internalDeps.DOMElements.controls.theme.editor.innerHTML = newIconHTML;
      internalDeps.DOMElements.controls.theme.editor.setAttribute('title', newAriaLabel);
      internalDeps.DOMElements.controls.theme.editor.setAttribute('aria-label', newAriaLabel);
    }
    // --- نهاية استخدام internalDeps.DOMElements ---
    
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const PWA_THEME_COLOR_DARK = '#0D0D0D'; // أو من إعدادات التطبيق
      const PWA_THEME_COLOR_LIGHT = '#00796b'; // أو من إعدادات التطبيق
      metaThemeColor.setAttribute('content', theme === 'dark' ? PWA_THEME_COLOR_DARK : PWA_THEME_COLOR_LIGHT);
    }
    
    currentDOMTheme = theme;
    
    internalDeps.eventAggregator.publish(EVENTS.THEME_CHANGED, { theme, timestamp: Date.now() });
    
    // لا تقم بإرسال dispatch(ACTIONS.SET_THEME, theme) هنا إذا كنت ستعتمد على stateStore.subscribe
    // لتجنب الحلقات. دع الحالة تتغير أولاً، ثم يتفاعل الـ subscribe.
  }
  
  /**
   * معالجة نقر زر تبديل الموضوع
   * @private
   */
  function _handleThemeToggle() {
    // احصل على الحالة الحالية من internalDeps.stateStore
    const currentState = internalDeps.stateStore.getState();
    // المسار الصحيح لموضوع الحالة قد يكون appSettings.currentTheme أو ما شابه
    // لنفترض أنه currentTheme مباشرة للحظة
    const currentThemeInState = currentState?.currentTheme || currentState?.appSettings?.currentTheme || 'light'; 
    const newTheme = currentThemeInState === 'light' ? 'dark' : 'light';
    
    // فقط قم بإرسال التغيير إلى الحالة، والـ subscriber سيتولى _applyThemeToDOM
    internalDeps.stateStore.dispatch(ACTIONS.SET_THEME, newTheme);
  }

  /**
   * تعيين المعالجات
   * @private
   */
  function _initializeEventListeners() {
    const setupButtonListener = (buttonElement) => {
      if (buttonElement) {
        // أزل أي معالج قديم قبل إضافة واحد جديد (مهم إذا تم استدعاء التهيئة أكثر من مرة)
        buttonElement.removeEventListener('click', _handleThemeToggle);
        buttonElement.addEventListener('click', _handleThemeToggle);
      } else {
        (internalDeps.errorLogger.warn || console.warn).call(internalDeps.errorLogger, {
             message: 'أحد أزرار الثيم غير موجود في DOM عند محاولة ربط الأحداث.',
             origin: 'ThemeController._initializeEventListeners'
         });
      }
    };
    
    // --- استخدام internalDeps.DOMElements ---
    if (internalDeps.DOMElements?.controls?.theme) {
        setupButtonListener(internalDeps.DOMElements.controls.theme.initial);
        setupButtonListener(internalDeps.DOMElements.controls.theme.editor);
    } else {
        (internalDeps.errorLogger.warn || console.warn).call(internalDeps.errorLogger, {
             message: 'كائن DOMElements.controls.theme غير موجود.',
             origin: 'ThemeController._initializeEventListeners'
         });
    }
    // --- نهاية استخدام internalDeps.DOMElements ---
  }

  function _validateTheme(theme) {
    const validThemes = ['light', 'dark'];
    if (!validThemes.includes(theme)) {
      (internalDeps.errorLogger.warn || console.warn).call(internalDeps.errorLogger, {
        message: `الموضوع غير صالح: ${theme}. يجب أن يكون 'light' أو 'dark'.`,
        origin: 'ThemeController._validateTheme'
      });
      return false;
    }
    return true;
  }
  
  function _applyThemeAndPersist(theme) {
    if (!_validateTheme(theme)) return false;
    try {
      _applyThemeToDOM(theme); // هذا بالفعل يرسل dispatch إذا كان currentDOMTheme قد تغير
                               // ويفترض أن StateStore.subscribe هو الذي يستدعي هذا
                               // يجب أن يكون التدفق: Click -> dispatch SET_THEME -> State changes -> subscribe fires -> _applyThemeToDOM
                               // لذلك، استدعاء dispatch هنا مرة أخرى قد يكون تكرارًا أو يسبب مشكلة
                               // لكن _applyThemeToDOM حاليًا يستدعي dispatch
                               // لنتركها كما هي الآن، لكن هذا قد يحتاج لمراجعة لتدفق الحالة

      // إذا كان الهدف من هذه الدالة هو التغيير والتخزين بغض النظر عن الحالة، فاستمر
      _saveThemeToLocalStorage(theme);
      return true;
    } catch (error) {
      (internalDeps.errorLogger.error || console.error).call(internalDeps.errorLogger, { // استخدم error بدل handleError إذا كان API مختلفًا
        error,
        message: `فشل في تطبيق وحفظ الموضوع: ${theme}`,
        origin: 'ThemeController._applyThemeAndPersist'
      });
      return false;
    }
  }

  function _saveThemeToLocalStorage(theme) {
    if (!_validateTheme(theme)) return false;
    try {
      // افترض أن internalDeps.localStorageAdapter موجود أو استخدم localStorage مباشرة
      const lsa = internalDeps.localStorageAdapter || localStorage;
      lsa.setItem(LS_KEY_CURRENT_THEME, theme);
      return true;
    } catch (error) {
      (internalDeps.errorLogger.error || console.error).call(internalDeps.errorLogger, {
        error,
        message: `فشل في حفظ الموضوع في localStorage: ${theme}`,
        origin: 'ThemeController._saveThemeToLocalStorage'
      });
      return false;
    }
  }

  function _loadThemeFromLocalStorage() {
    try {
      const lsa = internalDeps.localStorageAdapter || localStorage;
      if (typeof lsa !== 'undefined') {
        return lsa.getItem(LS_KEY_CURRENT_THEME);
      }
      return null;
    } catch (error) {
      (internalDeps.errorLogger.error || console.error).call(internalDeps.errorLogger, {
        error,
        message: 'فشل في تحميل الموضوع من localStorage',
        origin: 'ThemeController._loadThemeFromLocalStorage'
      });
      return null;
    }
  }
  
  // تعيين التبعيات الداخلية
  // هذه الدالة ستُستدعى من initializeThemeController
  function _setInternalDependencies(injectedDeps) {
    // قم بدمج الاعتماديات، مع إعطاء الأولوية للـ injectedDeps
    internalDeps.DOMElements = injectedDeps.DOMElements || internalDeps.DOMElements;
    internalDeps.stateStore = injectedDeps.stateStore || internalDeps.stateStore;
    internalDeps.eventAggregator = injectedDeps.eventAggregator || internalDeps.eventAggregator;
    internalDeps.errorLogger = injectedDeps.errorLogger || internalDeps.errorLogger;
    internalDeps.localizationServiceAPI = injectedDeps.localizationServiceAPI || internalDeps.localizationServiceAPI; // تم تغيير الاسم ليطابق
    
    console.log('[ThemeController] Dependencies set:', internalDeps); // للتصحيح
  }

  function getActiveThemeInternal() {
    return currentDOMTheme;
  }

  // الدوال العامة التي سيتم إرجاعها بواسطة initializeThemeController
  const publicAPI = {
    setDependencies: _setInternalDependencies, // لتسهيل التهيئة من الخارج
    applyTheme: _applyThemeAndPersist, // هذه تطبق وتحفظ
    getActiveTheme: getActiveThemeInternal,
    toggleTheme: () => {
        const newTheme = currentDOMTheme === 'light' ? 'dark' : 'light';
        // بدلاً من استدعاء _applyThemeAndPersist، اترك الحالة تقود التغيير
        internalDeps.stateStore.dispatch(ACTIONS.SET_THEME, newTheme);
        // الـ subscriber على StateStore سيتولى تطبيق الثيم على DOM
        // ولكن قد تحتاج أيضًا للحفظ في localStorage هنا إذا لم يكن subscriber يفعل ذلك
        _saveThemeToLocalStorage(newTheme); // <--- أضف هذا للحفظ الفوري
        return true; // أو يمكنك إرجاع newTheme
    },
    initializeEventListeners: _initializeEventListeners, // اجعلها جزءًا من الواجهة العامة ليتم استدعاؤها بعد التهيئة
    loadThemeFromLocalStorage: _loadThemeFromLocalStorage, // اجعلها عامة
    // _validateTheme يمكن أن تكون داخلية فقط
  };

  // دالة التهيئة الأولية للوحدة التي يتم استدعاؤها بواسطة moduleBootstrap
  // وستُرجع الواجهة العامة publicAPI
  function init(dependencies) {
    _setInternalDependencies(dependencies); // حقن الاعتماديات الفعلية
    
    _initializeEventListeners(); // ربط الأحداث بأزرار الثيم

    // الاشتراك في تغييرات الحالة لتطبيق الثيم عند تغيره في StateStore
    if (internalDeps.stateStore && typeof internalDeps.stateStore.subscribe === 'function') {
      const unsubscribe = internalDeps.stateStore.subscribe((newState, oldState) => {
        const newThemeInState = newState?.currentTheme || newState?.appSettings?.currentTheme;
        if (newThemeInState && _validateTheme(newThemeInState) && newThemeInState !== currentDOMTheme) {
          _applyThemeToDOM(newThemeInState); // طبق على DOM فقط، لا تقم بـ dispatch مرة أخرى
          // الحفظ في localStorage يجب أن يتم عند تغيير الحالة أو بواسطة dispatch SET_THEME إذا أردت
          // إذا لم يتم الحفظ عند تغيير الحالة، قم بالحفظ هنا أيضًا.
          _saveThemeToLocalStorage(newThemeInState);
        }
      });
      // يمكنك تخزين unsubscribe إذا أردت إلغاء الاشتراك لاحقًا
      publicAPI.unsubscribeState = unsubscribe; 
    } else {
        (internalDeps.errorLogger.warn || console.warn).call(internalDeps.errorLogger, {
            message: 'StateStore أو دالة subscribe غير متاحة. لن يتم تحديث الثيم بناءً على تغييرات الحالة.',
            origin: 'ThemeController.init'
        });
    }

    // تحميل الثيم الأولي من localStorage أو الحالة وتطبيقه
    const state = internalDeps.stateStore.getState();
    const initialThemeFromState = state?.currentTheme || state?.appSettings?.currentTheme;
    const themeFromStorage = _loadThemeFromLocalStorage();
    
    let themeToApply = 'light'; // افتراضي

    if (initialThemeFromState && _validateTheme(initialThemeFromState)) {
        themeToApply = initialThemeFromState;
    } else if (themeFromStorage && _validateTheme(themeFromStorage)) {
        themeToApply = themeFromStorage;
    }
    // قد ترغب في إرسال هذا الثيم الأولي إلى الحالة إذا لم يكن موجودًا
    if (themeToApply !== initialThemeFromState) {
        internalDeps.stateStore.dispatch(ACTIONS.SET_THEME, themeToApply);
    }
    _applyThemeToDOM(themeToApply); // طبق الثيم المختار أخيرًا

    (internalDeps.errorLogger.info || console.info).call(internalDeps.errorLogger, `[ThemeController] Initialized. Applied theme: ${themeToApply}`);

    return publicAPI; // أرجع الواجهة العامة
  }
  
  // الكائن الذي يحتوي على دالة init هو ما يتم تصديره لـ moduleBootstrap
  return { init };

})(); // نهاية الـ IIFE

// الدالة المصدرة التي سيستخدمها moduleBootstrap كـ initFn
export function initializeThemeController(dependencies) {
  // themeControllerInternal الآن هو الكائن الذي يحتوي على دالة init
  // dependencies ستحتوي على DOMElements من moduleBootstrap
  return themeControllerInternal.init(dependencies);
}

// يمكنك أيضًا تصدير الواجهة مباشرة إذا كنت لن تستخدم moduleBootstrap دائمًا
// export default themeControllerInternal.init; // أو publicAPI إذا أردت ذلك مباشرة
