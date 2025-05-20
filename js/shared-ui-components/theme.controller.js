// js/shared-ui-components/theme.controller.js

import DOMElements from '../core/dom-elements.js';
import { ACTIONS, EVENTS } from '../config/app.constants.js';

/**
 * @typedef {Object} ThemeControllerDependencies
 * @property {Object} stateStore - مخزن الحالة
 * @property {Function} stateStore.dispatch - إرسال تغييرات الحالة
 * @property {Function} stateStore.getState - الحصول على الحالة الحالية
 * @property {Object} stateStore.subscribe - الاشتراك في تغييرات الحالة
 * @property {Object} eventAggregator - محرك الأحداث
 * @property {Function} eventAggregator.publish - نشر الأحداث
 * @property {Function} eventAggregator.subscribe - الاشتراك في الأحداث
 * @property {Object} errorLogger - مسجل الأخطاء
 * @property {Object} localizationService - خدمة الترجمة
 */

/**
 * @typedef {Object} ThemeControllerState
 * @property {string} activeTheme - نوع الموضوع النشط ('light' أو 'dark')
 * @property {boolean} isInitialized - هل تم تهيئة المدير
 * @property {'light'|'dark'} currentDOMTheme - موضوع DOM الحالي
 * @property {boolean} isDarkMode - هل الوضع الليلي مفعّل
 * @property {boolean} isLightMode - هل الوضع النهاري مفعّل
 * @property {number} themeChangeCount - عدد تغييرات الموضوع
 * @property {Object} lastThemeChange - بيانات آخر تغيير للموضوع
 * @property {string} lastThemeChange.theme - نوع الموضوع
 * @property {number} lastThemeChange.timestamp - وقت التغيير
 * @property {string} [customTheme] - موضوع مخصص إن وُجد
 */

/**
 * مدير الموضوعات (السمات)
 * @type {{}}
 */
const themeController = (() => {
  // المتغيرات الداخلية
  let currentDOMTheme = 'light'; // تتبع الموضوع الحالي المطبّق على DOM
  let dependencies = {
    stateStore: {
      getState: () => ({ currentTheme: 'light' }),
      dispatch: () => {},
      subscribe: () => ({ unsubscribe: () => {} })
    },
    eventAggregator: {
      publish: () => {},
      subscribe: () => ({ unsubscribe: () => {} })
    },
    errorLogger: console,
    localizationService: {
      translate: (key) => key
    }
  };
  
  /**
   * تطبيق الموضوع على DOM
   * @private
   * @param {string} theme - نوع الموضوع ('light' أو 'dark')
   */
  function _applyThemeToDOM(theme) {
    if (!document.body) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'عنصر body غير موجود. لا يمكن تطبيق الموضوع.',
        origin: 'ThemeController._applyThemeToDOM'
      });
      return;
    }
    
    const newThemeClass = theme === 'dark' ? 'dark-theme' : 'light-theme';
    const oldThemeClass = theme === 'dark' ? 'light-theme' : 'dark-theme';
    
    document.body.classList.remove(oldThemeClass);
    document.body.classList.add(newThemeClass);
    
    // أيقونات الموضوع
    const sunIconHTML = '<i class="fas fa-sun"></i>';
    const moonIconHTML = '<i class="fas fa-moon"></i>';
    const newIconHTML = theme === 'dark' ? sunIconHTML : moonIconHTML;
    const newAriaLabel = theme === 'dark' ? 
        (dependencies.localizationService.translate('theme.toggle.switchToLight') || 'تبديل إلى الوضع النهاري') : 
        (dependencies.localizationService.translate('theme.toggle.switchToDark') || 'تبديل إلى الوضع الليلي');
    
    // تحديث زر التبديل
    if (DOMElements.themeToggleInitial) {
      DOMElements.themeToggleInitial.innerHTML = newIconHTML;
      DOMElements.themeToggleInitial.setAttribute('title', newAriaLabel);
      DOMElements.themeToggleInitial.setAttribute('aria-label', newAriaLabel);
    }
    
    if (DOMElements.themeToggleEditor) {
      DOMElements.themeToggleEditor.innerHTML = newIconHTML;
      DOMElements.themeToggleEditor.setAttribute('title', newAriaLabel);
      DOMElements.themeToggleEditor.setAttribute('aria-label', newAriaLabel);
    }
    
    // تحديث لون الموضوع للمتصفح
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (metaThemeColor) {
      const PWA_THEME_COLOR_DARK = '#0D0D0D';
      const PWA_THEME_COLOR_LIGHT = '#00796b';
      
      metaThemeColor.setAttribute('content', theme === 'dark' ? PWA_THEME_COLOR_DARK : PWA_THEME_COLOR_LIGHT);
    }
    
    currentDOMTheme = theme;
    
    // نشر حدث تغيير الموضوع
    dependencies.eventAggregator.publish(EVENTS.THEME_CHANGED, {
      theme,
      timestamp: Date.now()
    });
    
    // تحديث الحالة
    if (dependencies.stateStore && dependencies.stateStore.dispatch) {
      dependencies.stateStore.dispatch(ACTIONS.SET_THEME, theme);
    }
  }
  
  /**
   * معالجة نقر زر تبديل الموضوع
   * @private
   */
  function _handleThemeToggle() {
    const currentTheme = dependencies.stateStore.getState().currentTheme;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    dependencies.stateStore.dispatch(ACTIONS.SET_THEME, newTheme);
  }
  
  /**
   * تعيين التبعيات الداخلية
   * @param {ThemeControllerDependencies} injectedDeps - التبعيات المُدخلة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService;
  }
  
  /**
   * تعيين التبعيات الداخلية
   * @param {ThemeControllerDependencies} injectedDeps - التبعيات المُدخلة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService;
  }
  
  /**
   * تطبيق الموضوع على DOM
   * @private
   * @param {string} theme - نوع الموضوع ('light' أو 'dark')
   */
  function _applyThemeToDOM(theme) {
    if (!document.body) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'عنصر body غير موجود. لا يمكن تطبيق الموضوع.',
        origin: 'ThemeController._applyThemeToDOM'
      });
      return;
    }
    
    const newThemeClass = theme === 'dark' ? 'dark-theme' : 'light-theme';
    const oldThemeClass = theme === 'dark' ? 'light-theme' : 'dark-theme';
    
    document.body.classList.remove(oldThemeClass);
    document.body.classList.add(newThemeClass);
    
    // تحديث زر التبديل
    const sunIconHTML = '<i class="fas fa-sun"></i>';
    const moonIconHTML = '<i class="fas fa-moon"></i>';
    const newIconHTML = theme === 'dark' ? sunIconHTML : moonIconHTML;
    const newAriaLabel = theme === 'dark' ? 
        (dependencies.localizationService.translate('theme.toggle.switchToLight') || 'تبديل إلى الوضع النهاري') : 
        (dependencies.localizationService.translate('theme.toggle.switchToDark') || 'تبديل إلى الوضع الليلي');
    
    if (DOMElements.themeToggleInitial) {
      DOMElements.themeToggleInitial.innerHTML = newIconHTML;
      DOMElements.themeToggleInitial.setAttribute('title', newAriaLabel);
      DOMElements.themeToggleInitial.setAttribute('aria-label', newAriaLabel);
    }
    
    if (DOMElements.themeToggleEditor) {
      DOMElements.themeToggleEditor.innerHTML = newIconHTML;
      DOMElements.themeToggleEditor.setAttribute('title', newAriaLabel);
      DOMElements.themeToggleEditor.setAttribute('aria-label', newAriaLabel);
    }
    
    // تحديث لون الموضوع للمتصفح
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    
    if (metaThemeColor) {
      const PWA_THEME_COLOR_DARK = '#0D0D0D';
      const PWA_THEME_COLOR_LIGHT = '#00796b';
      
      metaThemeColor.setAttribute('content', theme === 'dark' ? PWA_THEME_COLOR_DARK : PWA_THEME_COLOR_LIGHT);
    }
    
    currentDOMTheme = theme;
    
    // نشر حدث تغيير الموضوع
    dependencies.eventAggregator.publish(EVENTS.THEME_CHANGED, {
      theme,
      timestamp: Date.now()
    });
    
    // تحديث الحالة
    if (dependencies.stateStore && dependencies.stateStore.dispatch) {
      dependencies.stateStore.dispatch(ACTIONS.SET_THEME, theme);
    }
  }
  
  /**
   * تعيين المعالجات
   * @private
   */
  function initializeEventListeners() {
    const setupButtonListener = (buttonElement) => {
      if (buttonElement) {
        buttonElement.addEventListener('click', _handleThemeToggle);
      }
    };
    
    setupButtonListener(DOMElements.themeToggleInitial);
    setupButtonListener(DOMElements.themeToggleEditor);
  }
  
  /**
   * التحقق من صحة الموضوع
   * @param {string} theme - نوع الموضوع
   * @returns {boolean} true إذا كان الموضوع صالحًا
   */
  function validateTheme(theme) {
    const validThemes = ['light', 'dark'];
    
    if (!validThemes.includes(theme)) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: `الموضوع غير صالح: ${theme}. يجب أن يكون 'light' أو 'dark'.`,
        origin: 'ThemeController.validateTheme'
      });
      return false;
    }
    
    return true;
  }
  
  /**
   * تطبيق الموضوع مباشرة
   * @param {string} theme - نوع الموضوع
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function applyTheme(theme) {
    if (!validateTheme(theme)) {
      return false;
    }
    
    try {
      _applyThemeToDOM(theme);
      saveThemeToLocalStorage(theme);
      return true;
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error,
        message: `فشل في تطبيق الموضوع: ${theme}`,
        origin: 'ThemeController.applyTheme'
      });
      return false;
    }
  }
  
  /**
   * التحقق مما إذا كان الموضوع الداكن مفعّلًا
   * @returns {boolean} true إذا كان الموضوع الداكن مفعّلًا
   */
  function isDarkTheme() {
    return currentDOMTheme === 'dark';
  }
  
  /**
   * التحقق مما إذا كان الموضوع النهاري مفعّلًا
   * @returns {boolean} true إذا كان الموضوع النهاري مفعّلًا
   */
  function isLightTheme() {
    return currentDOMTheme === 'light';
  }
  
  /**
   * التحقق من نوع الموضوع الحالي
   * @returns {string} نوع الموضوع ('light' أو 'dark')
   */
  function getActiveTheme() {
    return currentDOMTheme;
  }
  
  /**
   * تبديل الموضوع
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function toggleTheme() {
    const newTheme = currentDOMTheme === 'light' ? 'dark' : 'light';
    return applyTheme(newTheme);
  }
  
  /**
   * حفظ الموضوع في localStorage
   * @param {string} theme - نوع الموضوع
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function saveThemeToLocalStorage(theme) {
    if (!validateTheme(theme)) {
      return false;
    }
    
    try {
      localStorage.setItem(LS_KEY_CURRENT_THEME, theme);
      return true;
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error,
        message: `فشل في حفظ الموضوع في localStorage: ${theme}`,
        origin: 'ThemeController.saveThemeToLocalStorage'
      });
      return false;
    }
  }
  
  /**
   * تحميل الموضوع من localStorage
   * @returns {string | null} نوع الموضوع أو null إذا لم يُوجد
   */
  function loadThemeFromLocalStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(LS_KEY_CURRENT_THEME);
      }
      return null;
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error,
        message: 'فشل في تحميل الموضوع من localStorage',
        origin: 'ThemeController.loadThemeFromLocalStorage'
      });
      return null;
    }
  }
  
  /**
   * تحديث زر التبديل للموضوع
   * @param {string} theme - نوع الموضوع
   */
  function updateThemeToggleButton(theme) {
    if (!DOMElements.themeToggleInitial && !DOMElements.themeToggleEditor) {
      return;
    }
    
    const sunIconHTML = '<i class="fas fa-sun"></i>';
    const moonIconHTML = '<i class="fas fa-moon"></i>';
    const newIconHTML = theme === 'dark' ? sunIconHTML : moonIconHTML;
    const newAriaLabel = theme === 'dark' ? 
        (dependencies.localizationService.translate('theme.toggle.switchToLight') || 'تبديل إلى الوضع النهاري') : 
        (dependencies.localizationService.translate('theme.toggle.switchToDark') || 'تبديل إلى الوضع الليلي');
    
    if (DOMElements.themeToggleInitial) {
      DOMElements.themeToggleInitial.innerHTML = newIconHTML;
      DOMElements.themeToggleInitial.setAttribute('title', newAriaLabel);
      DOMElements.themeToggleInitial.setAttribute('aria-label', newAriaLabel);
    }
    
    if (DOMElements.themeToggleEditor) {
      DOMElements.themeToggleEditor.innerHTML = newIconHTML;
      DOMElements.themeToggleEditor.setAttribute('title', newAriaLabel);
      DOMElements.themeToggleEditor.setAttribute('aria-label', newAriaLabel);
    }
  }
  
  /**
   * التحقق من تفعيل الوضع الداكن
   * @returns {boolean} true إذا كان الوضع الداكن مفعّلًا
   */
  function isDarkModeEnabled() {
    return document.body.classList.contains('dark-theme');
  }
  
  /**
   * التحقق من تفعيل الوضع النهاري
   * @returns {boolean} true إذا كان الوضع النهاري مفعّلًا
   */
  function isLightModeEnabled() {
    return document.body.classList.contains('light-theme');
  }
  
  /**
   * تعيين الموضوع بناءً على تفضيل المستخدم
   * @param {string} [theme='auto'] - نوع الموضوع أو 'auto' لاستخدام التفضيلات
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function setThemeBasedOnUserPreference(theme = 'auto') {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      theme = prefersDark ? 'dark' : 'light';
    }
    
    return applyTheme(theme);
  }
  
  /**
   * تعيين الموضوع بناءً على تفضيل المستخدم
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function autoDetectAndSetTheme() {
    try {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const detectedTheme = prefersDark ? 'dark' : 'light';
      
      if (currentDOMTheme !== detectedTheme) {
        applyTheme(detectedTheme);
      }
      return true;
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error,
        message: 'فشل في اكتشاف الموضوع.',
        origin: 'ThemeController.autoDetectAndSetTheme'
      });
      return false;
    }
  }
  
  /**
   * تعيين الموضوع بناءً على تفضيل المستخدم
   * @param {string} [theme='auto'] - نوع الموضوع أو 'auto' لاستخدام التفضيلات
   * @param {boolean} [persist=true] - هل يتم حفظه في localStorage
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function setTheme(theme = 'auto', persist = true) {
    if (theme === 'auto') {
      return autoDetectAndSetTheme();
    }
    
    const success = applyTheme(theme);
    
    if (success && persist) {
      saveThemeToLocalStorage(theme);
    }
    
    return success;
  }
  
  /**
   * تعيين المعالجات
   * @param {ThemeControllerDependencies} injectedDeps - التبعيات المُدخلة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService;
  }
  
  /**
   * التحقق من تفعيل الموضوع
   * @returns {boolean} true إذا كان الموضوع مفعّلًا
   */
  function isThemeApplied() {
    return isDarkModeEnabled() || isLightModeEnabled();
  }
  
  /**
   * تعيين الموضوع الافتراضي
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function setDefaultTheme() {
    const savedTheme = loadThemeFromLocalStorage();
    
    if (savedTheme && validateTheme(savedTheme)) {
      return applyTheme(savedTheme);
    }
    
    return applyTheme('light');
  }
  
  /**
   * تعيين الموضوع من خلال الحالة
   * @param {ThemeControllerDependencies} injectedDeps - التبعيات
   */
  function initializeThemeFromState(injectedDeps) {
    const { stateStore } = injectedDeps;
    
    if (!stateStore || !stateStore.getState || !stateStore.dispatch) {
      return;
    }
    
    const state = stateStore.getState();
    
    if (state && state.currentTheme) {
      applyTheme(state.currentTheme);
    } else {
      setDefaultTheme();
    }
  }
  
  /**
   * تهيئة الموضوع
   * @param {ThemeControllerDependencies} injectedDeps - التبعيات
   */
  function initializeThemeController(injectedDeps) {
    try {
      console.info('[ThemeController] تم تهيئته بنجاح');
      
      // جعل الموضوع متاحًا عالميًا لتسهيل التصحيح
      if (typeof window !== 'undefined' && 
          (typeof process === 'undefined' || process.env.NODE_ENV === 'development')) {
        window.themeController = {
          ...themeController
        };
      }
      
      // تعيين التبعيات
      if (injectedDeps && (injectedDeps.stateStore || injectedDeps.errorLogger || injectedDeps.localizationService)) {
        themeController._setDependencies({
          stateStore: injectedDeps.stateStore || {
            getState: () => ({ currentTheme: 'light' }),
            dispatch: () => {},
            subscribe: () => ({ unsubscribe: () => {} })
          },
          errorLogger: injectedDeps.errorLogger || console,
          localizationService: injectedDeps.localizationService || {
            translate: (key) => key
          }
        });
      }
      
      // تعيين مراقبي الأحداث
      if (DOMElements.themeToggleInitial || DOMElements.themeToggleEditor) {
        initializeEventListeners();
      }
      
      // تعيين الموضوع من خلال الحالة
      if (injectedDeps.stateStore) {
        const unsubscribe = injectedDeps.stateStore.subscribe((newState) => {
          if (newState && typeof newState.currentTheme === 'string' && newState.currentTheme !== currentDOMTheme) {
            applyTheme(newState.currentTheme);
          }
        });
        
        if (typeof unsubscribe === 'function') {
          themeController.unsubscribe = unsubscribe;
        }
      }
      
      // تحميل الموضوع من localStorage
      const savedTheme = loadThemeFromLocalStorage();
      
      if (savedTheme && validateTheme(savedTheme)) {
        applyTheme(savedTheme);
      }
      
      return {
        ...themeController,
        applyTheme,
        isDarkTheme,
        isLightTheme,
        getActiveTheme,
        toggleTheme,
        saveThemeToLocalStorage,
        loadThemeFromLocalStorage,
        isThemeApplied,
        setThemeBasedOnUserPreference
      };
    } catch (error) {
      console.error('[ThemeController] فشل في التهيئة:', error);
      return {};
    }
  }

  return {
    _setDependencies,
    applyTheme,
    isDarkTheme,
    isLightTheme,
    getActiveTheme,
    toggleTheme,
    saveThemeToLocalStorage,
    loadThemeFromLocalStorage,
    isThemeApplied,
    setThemeBasedOnUserPreference,
    setDefaultTheme,
    setTheme,
    updateThemeToggleButton,
    isDarkModeEnabled,
    isLightModeEnabled
  };
})();

/**
 * تهيئة مدير الموضوعات
 * @param {ThemeControllerDependencies} dependencies - التبعيات
 */
export function initializeThemeController(dependencies) {
  try {
    console.info('[ThemeController] تم تهيئته بنجاح');
    
    // جعل الموضوع متاحًا عالميًا لتسهيل التصحيح
    if (typeof window !== 'undefined' && 
        (typeof process === 'undefined' || process.env.NODE_ENV === 'development')) {
      window.themeController = {
        ...themeController
      };
    }
    
    // تعيين التبعيات
    if (dependencies && (dependencies.stateStore || dependencies.errorLogger || dependencies.localizationService)) {
      themeController._setDependencies({
        stateStore: dependencies.stateStore || {
          getState: () => ({ currentTheme: 'light' }),
          dispatch: () => {},
          subscribe: () => ({ unsubscribe: () => {} })
        },
        errorLogger: dependencies.errorLogger || console,
        localizationService: dependencies.localizationService || {
          translate: (key) => key
        }
      });
    }
    
    // تعيين مراقبي الأحداث
    if (DOMElements.themeToggleInitial || DOMElements.themeToggleEditor) {
      themeController.initializeEventListeners();
    }
    
    // تعيين الموضوع من خلال الحالة
    if (dependencies.stateStore) {
      const unsubscribe = dependencies.stateStore.subscribe((newState) => {
        if (newState && typeof newState.currentTheme === 'string' && newState.currentTheme !== themeController.getActiveTheme()) {
          themeController.applyTheme(newState.currentTheme);
        }
      });
      
      if (typeof unsubscribe === 'function') {
        themeController.unsubscribe = unsubscribe;
      }
    }
    
    // تحميل الموضوع من localStorage
    const savedTheme = themeController.loadThemeFromLocalStorage();
    
    if (savedTheme && themeController.validateTheme(savedTheme)) {
      themeController.applyTheme(savedTheme);
    } else {
      themeController.setDefaultTheme();
    }
    
    return {
      ...themeController,
      applyTheme: themeController.applyTheme,
      isDarkTheme: themeController.isDarkTheme,
      isLightTheme: themeController.isLightTheme,
      getActiveTheme: themeController.getActiveTheme,
      toggleTheme: themeController.toggleTheme,
      saveThemeToLocalStorage: themeController.saveThemeToLocalStorage,
      loadThemeFromLocalStorage: themeController.loadThemeFromLocalStorage,
      isThemeApplied: themeController.isThemeApplied,
      setThemeBasedOnUserPreference: themeController.setThemeBasedOnUserPreference,
      setDefaultTheme: themeController.setDefaultTheme,
      updateThemeToggleButton: themeController.updateThemeToggleButton,
      isDarkModeEnabled: themeController.isDarkModeEnabled,
      isLightModeEnabled: themeController.isLightModeEnabled
    };
  } catch (error) {
    console.error('[ThemeController] فشل في التهيئة:', error);
    return {};
  }
}

export default themeController;
