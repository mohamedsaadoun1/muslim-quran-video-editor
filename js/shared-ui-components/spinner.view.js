// js/shared-ui-components/spinner.view.js

import DOMElements from '../core/dom-elements.js';
import { EVENTS, ACTIONS } from '../config/app.constants.js';

/**
 * @typedef {Object} SpinnerViewDependencies
 * @property {Object} [stateStore] - مخزن الحالة
 * @property {Function} [stateStore.subscribe] - الاشتراك في تغييرات الحالة
 * @property {Function} [stateStore.getState] - الحصول على الحالة الحالية
 * @property {Object} [errorLogger] - مسجل الأخطاء
 * @property {Object} [eventAggregator] - محرك الأحداث
 */

/**
 * @typedef {Object} SpinnerViewState
 * @property {boolean} isAttached - هل العنصر مرتبط بالـ DOM
 * @property {boolean} isVisible - هل spinner مرئي
 * @property {string} message - الرسالة المعروضة مع spinner
 * @property {number} showTimestamp - وقت ظهور spinner
 * @property {Array<function>} visibilityChangeHandlers - معالجات تغيير الحالة
 */

/**
 * العرض الخاص بالـ spinner
 * @type {{}}
 */
const spinnerView = (() => {
  // المتغيرات الداخلية
  let spinnerState = {
    isVisible: false,
    isAttached: false,
    message: '',
    showTimestamp: null,
    visibilityChangeHandlers: []
  };
  
  let dependencies = {
    stateStore: {
      subscribe: (handler) => ({ unsubscribe: () => {} }),
      getState: () => ({ isLoading: false })
    },
    errorLogger: console,
    eventAggregator: {
      publish: () => {},
      subscribe: () => ({ unsubscribe: () => {} })
    }
  };
  
  /**
   * التحقق من وجود عنصر spinner
   * @private
   * @returns {boolean} true إذا وُجد العنصر
   */
  function _checkSpinnerElement() {
    if (!document.getElementById('global-loading-spinner')) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'عنصر spinner غير موجود في DOM.',
        origin: 'SpinnerView._checkSpinnerElement'
      });
      return false;
    }
    return true;
  }

  /**
   * عرض spinner مع رسالة
   * @param {string} [message='جار التحميل...'] - الرسالة المراد عرضها
   * @param {string} [customClass='default'] - فئة CSS مخصصة
   */
  function showSpinner(message = 'جار التحميل...', customClass = 'default') {
    // التحقق من صحة المدخلات
    if (typeof message !== 'string' || message.trim() === '') {
      message = 'جار التحميل...';
    }
    
    if (!_checkSpinnerElement()) {
      // إنشاء العنصر إن لم يكن موجودًا
      if (!_attachSpinnerToDOM()) {
        return;
      }
    }
    
    const spinnerElement = document.getElementById('global-loading-spinner');
    
    if (spinnerElement && !spinnerElement.classList.contains('visible')) {
      // تحديث الرسالة
      const messageElement = spinnerElement.querySelector('.spinner-message');
      
      if (messageElement) {
        messageElement.textContent = message;
      }
      
      // تحديث الفئة المخصصة
      const classes = ['spinner-small', 'spinner-medium', 'spinner-large', 'spinner-fullscreen'];
      
      classes.forEach(c => spinnerElement.classList.remove(c));
      
      if (classes.includes(customClass)) {
        spinnerElement.classList.add(customClass);
      } else {
        spinnerElement.classList.add('spinner-medium');
      }
      
      // عرض spinner
      spinnerElement.classList.add('visible');
      spinnerState.isVisible = true;
      spinnerState.message = message;
      spinnerState.showTimestamp = Date.now();
      
      // نشر الحدث
      dependencies.eventAggregator.publish(EVENTS.SPINNER_VISIBILITY_CHANGED, {
        visible: true,
        message: message
      });
      
      // تحديث الحالة
      if (dependencies.stateStore && dependencies.stateStore.dispatch) {
        dependencies.stateStore.dispatch(ACTIONS.SET_SPINNER_VISIBLE, {
          visible: true,
          message: message,
          timestamp: spinnerState.showTimestamp
        });
      }
      
      // تشغيل المعالجات
      spinnerState.visibilityChangeHandlers.forEach(handler => {
        if (typeof handler === 'function') {
          handler(true, message);
        }
      });
    }
  }

  /**
   * إخفاء spinner
   */
  function hideSpinner() {
    if (!_checkSpinnerElement()) {
      return;
    }
    
    const spinnerElement = document.getElementById('global-loading-spinner');
    
    if (spinnerElement && spinnerElement.classList.contains('visible')) {
      // إزالة الفئات
      spinnerElement.classList.remove('visible');
      spinnerElement.classList.remove('spinner-small');
      spinnerElement.classList.remove('spinner-medium');
      spinnerElement.classList.remove('spinner-large');
      spinnerElement.classList.remove('spinner-fullscreen');
      
      // تحديث الحالة
      spinnerState = {
        ...spinnerState,
        isVisible: false,
        message: '',
        showTimestamp: null
      };
      
      // نشر الحدث
      dependencies.eventAggregator.publish(EVENTS.SPINNER_VISIBILITY_CHANGED, {
        visible: false,
        message: ''
      });
      
      // تحديث الحالة
      if (dependencies.stateStore && dependencies.stateStore.dispatch) {
        dependencies.stateStore.dispatch(ACTIONS.SET_SPINNER_VISIBLE, {
          visible: false,
          message: '',
          timestamp: Date.now()
        });
      }
      
      // تشغيل المعالجات
      spinnerState.visibilityChangeHandlers.forEach(handler => {
        if (typeof handler === 'function') {
          handler(false, '');
        }
      });
    }
  }

  /**
   * تعيين رؤية spinner
   * @param {boolean} shouldBeVisible - هل spinner مرئي؟
   * @param {string} [message='جار التحميل...'] - الرسالة التي يجب عرضها
   * @param {string} [customClass='default'] - فئة CSS مخصصة
   */
  function setSpinnerVisibility(shouldBeVisible, message = 'جار التحميل...', customClass = 'default') {
    if (shouldBeVisible) {
      showSpinner(message, customClass);
    } else {
      hideSpinner();
    }
  }

  /**
   * عرض spinner مع رسالة
   * @param {string} message - الرسالة
   * @param {string} [customClass='default'] - الفئة المخصصة
   * @returns {boolean} true إذا تم العرض بنجاح
   */
  function showSpinnerWithMessage(message, customClass = 'default') {
    if (typeof message !== 'string' || message.trim() === '') {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'الرسالة المطلوبة لعرض spinner.',
        origin: 'SpinnerView.showSpinnerWithMessage'
      });
      return false;
    }
    
    showSpinner(message, customClass);
    return true;
  }

  /**
   * الحصول على حالة spinner
   * @returns {SpinnerViewState} الحالة الحالية لـ spinner
   */
  function getSpinnerState() {
    return {
      ...spinnerState,
      duration: spinnerState.isVisible ? Date.now() - spinnerState.showTimestamp : 0
    };
  }

  /**
   * الحصول على الرسالة الحالية
   * @returns {string} الرسالة المعروضة
   */
  function getSpinnerMessage() {
    return spinnerState.message || '';
  }

  /**
   * تعيين الرسالة المعروضة مع spinner
   * @param {string} newMessage - الرسالة الجديدة
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function setSpinnerMessage(newMessage) {
    if (typeof newMessage !== 'string' || newMessage.trim() === '') {
      return false;
    }
    
    spinnerState.message = newMessage;
    
    const spinnerElement = document.getElementById('global-loading-spinner');
    const messageElement = spinnerElement?.querySelector('.spinner-message');
    
    if (messageElement) {
      messageElement.textContent = newMessage;
    }
    
    return true;
  }

  /**
   * إضافة spinner إلى DOM
   * @private
   * @returns {boolean} true إذا تم إضافة spinner إلى الصفحة
   */
  function _attachSpinnerToDOM() {
    try {
      // التحقق مما إذا كان spinner موجودًا
      if (document.getElementById('global-loading-spinner')) {
        spinnerState.isAttached = true;
        return true;
      }
      
      // إنشاء عنصر spinner
      const spinner = document.createElement('div');
      spinner.id = 'global-loading-spinner';
      spinner.className = 'spinner-overlay';
      spinner.innerHTML = `
        <div class="spinner-container">
          <div class="spinner"></div>
          <span class="spinner-message">جار التحميل...</span>
        </div>
      `;
      
      // إضافة spinner إلى body
      document.body.appendChild(spinner);
      spinnerState.isAttached = true;
      
      return true;
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error,
        message: 'فشل في إضافة spinner إلى الصفحة.',
        origin: 'SpinnerView._attachSpinnerToDOM'
      });
      return false;
    }
  }

  /**
   * إزالة spinner من DOM
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function detachFromDOM() {
    try {
      const spinner = document.getElementById('global-loading-spinner');
      
      if (spinner && spinner.parentNode) {
        spinner.parentNode.removeChild(spinner);
        spinnerState.isAttached = false;
        return true;
      }
      
      return false;
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error,
        message: 'فشل في إزالة spinner من الصفحة.',
        origin: 'SpinnerView.detachFromDOM'
      });
      return false;
    }
  }

  /**
   * التحقق مما إذا كان spinner مرتبطًا بالـ DOM
   * @returns {boolean} true إذا كان spinner مرتبطًا
   */
  function isSpinnerAttached() {
    return spinnerState.isAttached && !!document.getElementById('global-loading-spinner');
  }

  /**
   * التحقق مما إذا كان spinner مرئيًا
   * @returns {boolean} true إذا كان spinner مرئيًا
   */
  function isSpinnerVisible() {
    return spinnerState.isVisible;
  }

  /**
   * إضافة معالج لتغيير حالة الرؤية
   * @param {function(boolean, string)} handler - وظيفة المعالج
   * @returns {function} وظيفة لإلغاء الاشتراك
   */
  function onVisibilityChange(handler) {
    if (typeof handler !== 'function') {
      return () => {};
    }
    
    spinnerState.visibilityChangeHandlers.push(handler);
    
    return () => {
      spinnerState.visibilityChangeHandlers = spinnerState.visibilityChangeHandlers.filter(h => h !== handler);
    };
  }

  /**
   * تعيين التبعيات الداخلية
   * @param {SpinnerViewDependencies} injectedDeps - التبعيات المُدخلة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    
    // الاشتراك في الأحداث
    if (dependencies.eventAggregator && dependencies.eventAggregator.subscribe) {
      dependencies.eventAggregator.subscribe(EVENTS.SHOW_LOADING_SPINNER, (config) => {
        if (config && config.message) {
          showSpinner(config.message, config.spinnerClass);
        } else {
          showSpinner();
        }
      });
      
      dependencies.eventAggregator.subscribe(EVENTS.HIDE_LOADING_SPINNER, hideSpinner);
    }
  }

  /**
   * تهيئة spinner
   * @param {SpinnerViewDependencies} injectedDeps - التبعيات المُدخلة
   */
  function initialize(injectedDeps) {
    // تعيين التبعيات
    _setDependencies(injectedDeps);
    
    // التحقق من وجود spinner في DOM
    spinnerState.isAttached = _checkSpinnerElement();
    
    // تعيين مراقبي الأحداث
    if (dependencies.stateStore && dependencies.stateStore.subscribe) {
      // الاشتراك في الحالة
      const unsubscribe = dependencies.stateStore.subscribe((newState) => {
        if (typeof newState.isLoading === 'boolean') {
          setSpinnerVisibility(newState.isLoading, 'جار التحميل...');
        }
      });
      
      spinnerState.unsubscribe = unsubscribe;
    }
    
    return {
      show: showSpinner,
      hide: hideSpinner,
      toggle: setSpinnerVisibility,
      isVisible: isSpinnerVisible,
      getSpinnerState,
      setSpinnerMessage,
      getSpinnerMessage,
      onVisibilityChange
    };
  }

  return {
    _setDependencies,
    initialize,
    show: showSpinner,
    hide: hideSpinner,
    toggle: setSpinnerVisibility,
    isVisible: isSpinnerVisible,
    getSpinnerState,
    setSpinnerMessage,
    getSpinnerMessage,
    onVisibilityChange
  };
})();

/**
 * تهيئة عرض spinner
 * @param {SpinnerViewDependencies} dependencies - التبعيات
 */
export function initializeSpinnerView(dependencies) {
  try {
    console.info('[SpinnerView] تم تهيئته بنجاح');
    
    // جعل spinner متاحًا عالميًا لتسهيل التصحيح
    if (typeof window !== 'undefined' && 
        (typeof process === 'undefined' || process.env.NODE_ENV === 'development')) {
      window.spinnerView = {
        ...spinnerView
      };
    }
    
    // تعيين التبعيات
    if (dependencies && (dependencies.stateStore || dependencies.errorLogger || dependencies.eventAggregator)) {
      spinnerView._setDependencies({
        stateStore: dependencies.stateStore || {
          subscribe: (handler) => ({ unsubscribe: () => {} }),
          getState: () => ({ isLoading: false })
        },
        errorLogger: dependencies.errorLogger || console,
        eventAggregator: dependencies.eventAggregator || {
          publish: () => {},
          subscribe: (event, handler) => ({ unsubscribe: () => {} })
        }
      });
    }
    
    // إرجاع الواجهة البرمجية
    const api = spinnerView.initialize(dependencies);
    
    return {
      show: api.show,
      hide: api.hide,
      toggle: api.toggle,
      isVisible: api.isVisible,
      getSpinnerState: api.getSpinnerState,
      setSpinnerMessage: api.setSpinnerMessage,
      getSpinnerMessage: api.getSpinnerMessage,
      onVisibilityChange: api.onVisibilityChange
    };
  } catch (error) {
    console.error('[SpinnerView] فشل في التهيئة:', error);
    return {};
  }
}

/**
 * التحقق من وجود spinner في DOM
 * @returns {boolean} true إذا كان spinner موجودًا
 */
function isSpinnerAttached() {
  return !!document.getElementById('global-loading-spinner');
}

/**
 * التحقق مما إذا كان spinner مرئيًا
 * @returns {boolean} true إذا كان spinner مرئيًا
 */
function isSpinnerVisible() {
  const spinner = document.getElementById('global-loading-spinner');
  return !!(spinner && spinner.classList.contains('visible'));
}

/**
 * عرض spinner مع رسالة
 * @param {string} [message='جار التحميل...'] - الرسالة المراد عرضها
 * @param {string} [customClass='default'] - الفئة المخصصة
 */
function showSpinner(message = 'جار التحميل...', customClass = 'default') {
  if (typeof message !== 'string' || message.trim() === '') {
    message = 'جار التحميل...';
  }
  
  if (!isSpinnerAttached()) {
    if (!_attachSpinnerToDOM()) {
      return;
    }
  }
  
  const spinnerElement = document.getElementById('global-loading-spinner');
  
  if (spinnerElement && !spinnerElement.classList.contains('visible')) {
    // تحديث الرسالة
    const messageElement = spinnerElement.querySelector('.spinner-message');
    
    if (messageElement) {
      messageElement.textContent = message;
    }
    
    // تحديث الفئة المخصصة
    const classes = ['spinner-small', 'spinner-medium', 'spinner-large', 'spinner-fullscreen'];
    
    classes.forEach(c => spinnerElement.classList.remove(c));
    
    if (classes.includes(customClass)) {
      spinnerElement.classList.add(customClass);
    } else {
      spinnerElement.classList.add('spinner-medium');
    }
    
    // عرض spinner
    spinnerElement.classList.add('visible');
    spinnerState.isVisible = true;
    spinnerState.message = message;
    spinnerState.showTimestamp = Date.now();
    
    // نشر الحدث
    dependencies.eventAggregator.publish(EVENTS.SPINNER_VISIBILITY_CHANGED, {
      visible: true,
      message: message
    });
    
    // تحديث الحالة
    if (dependencies.stateStore && dependencies.stateStore.dispatch) {
      dependencies.stateStore.dispatch(ACTIONS.SET_SPINNER_VISIBLE, {
        visible: true,
        message: message,
        timestamp: spinnerState.showTimestamp
      });
    }
    
    // تشغيل المعالجات
    spinnerState.visibilityChangeHandlers.forEach(handler => {
      if (typeof handler === 'function') {
        handler(true, message);
      }
    });
  }
}

/**
 * إخفاء spinner
 */
function hideSpinner() {
  if (!isSpinnerAttached()) {
    return;
  }
  
  const spinnerElement = document.getElementById('global-loading-spinner');
  
  if (spinnerElement && spinnerElement.classList.contains('visible')) {
    // إزالة الفئات
    spinnerElement.classList.remove('visible');
    spinnerElement.classList.remove('spinner-small');
    spinnerElement.classList.remove('spinner-medium');
    spinnerElement.classList.remove('spinner-large');
    spinnerElement.classList.remove('spinner-fullscreen');
    
    // تحديث الحالة
    spinnerState = {
      ...spinnerState,
      isVisible: false,
      message: '',
      showTimestamp: null
    };
    
    // نشر الحدث
    dependencies.eventAggregator.publish(EVENTS.SPINNER_VISIBILITY_CHANGED, {
      visible: false,
      message: ''
    });
    
    // تحديث الحالة
    if (dependencies.stateStore && dependencies.stateStore.dispatch) {
      dependencies.stateStore.dispatch(ACTIONS.SET_SPINNER_VISIBLE, {
        visible: false,
        message: '',
        timestamp: Date.now()
      });
    }
    
    // تشغيل المعالجات
    spinnerState.visibilityChangeHandlers.forEach(handler => {
      if (typeof handler === 'function') {
        handler(false, '');
      }
    });
  }
}

/**
 * تعيين رؤية spinner حسب الحالة
 * @param {boolean} shouldBeVisible - هل spinner مرئي؟
 * @param {string} [message='جار التحميل...'] - الرسالة التي يجب عرضها
 * @param {string} [customClass='default'] - الفئة المخصصة
 */
function setSpinnerVisibility(shouldBeVisible, message = 'جار التحميل...', customClass = 'default') {
  if (shouldBeVisible) {
    showSpinner(message, customClass);
  } else {
    hideSpinner();
  }
}

/**
 * إنشاء عنصر spinner وإضافته إلى الصفحة
 * @private
 * @returns {boolean} true إذا تمت العملية بنجاح
 */
function _attachSpinnerToDOM() {
  try {
    // التحقق مما إذا كان spinner موجودًا بالفعل
    if (document.getElementById('global-loading-spinner')) {
      spinnerState.isAttached = true;
      return true;
    }
    
    // إنشاء spinner
    const spinner = document.createElement('div');
    spinner.id = 'global-loading-spinner';
    spinner.className = 'spinner-overlay';
    spinner.innerHTML = `
      <div class="spinner-container">
        <div class="spinner"></div>
        <span class="spinner-message">جار التحميل...</span>
      </div>
    `;
    
    // إضافة spinner إلى body
    document.body.appendChild(spinner);
    spinnerState.isAttached = true;
    
    return true;
  } catch (error) {
    (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
      error,
      message: 'فشل في إضافة spinner إلى الصفحة.',
      origin: 'SpinnerView._attachSpinnerToDOM'
    });
    return false;
  }
}

/**
 * تعيين التبعيات الداخلية
 * @param {SpinnerViewDependencies} injectedDeps - التبعيات المُدخلة
 */
function _setDependencies(injectedDeps) {
  if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
  if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
  if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
}

/**
 * تهيئة spinner
 * @param {SpinnerViewDependencies} injectedDeps - التبعيات
 */
function initialize(injectedDeps) {
  // تعيين التبعيات
  _setDependencies(injectedDeps);
  
  // التحقق من وجود spinner في DOM
  spinnerState.isAttached = isSpinnerAttached();
  
  // تعيين مراقبي الأحداث
  if (dependencies.stateStore && dependencies.stateStore.subscribe) {
    // الاشتراك في الحالة
    const unsubscribe = dependencies.stateStore.subscribe((newState) => {
      if (typeof newState.isLoading === 'boolean') {
        setSpinnerVisibility(newState.isLoading, 'جار التحميل...');
      }
    });
    
    spinnerState.unsubscribe = unsubscribe;
  }
  
  // الاشتراك في الأحداث
  if (dependencies.eventAggregator && dependencies.eventAggregator.subscribe) {
    dependencies.eventAggregator.subscribe(EVENTS.SHOW_LOADING_SPINNER, (config) => {
      if (config && config.message) {
        showSpinner(config.message, config.spinnerClass);
      } else {
        showSpinner();
      }
    });
    
    dependencies.eventAggregator.subscribe(EVENTS.HIDE_LOADING_SPINNER, hideSpinner);
  }
  
  return {
    show: showSpinner,
    hide: hideSpinner,
    toggle: setSpinnerVisibility,
    isVisible: isSpinnerVisible,
    getSpinnerState: getSpinnerState,
    setSpinnerMessage: setSpinnerMessage,
    getSpinnerMessage: getSpinnerMessage,
    onVisibilityChange: onVisibilityChange
  };
}

/**
 * التحقق من وجود spinner في DOM
 * @returns {boolean} true إذا كان spinner موجودًا
 */
function isSpinnerAttached() {
  return !!document.getElementById('global-loading-spinner');
}

/**
 * التحقق مما إذا كان spinner مرئيًا
 * @returns {boolean} true إذا كان spinner مرئيًا
 */
function isSpinnerVisible() {
  const spinner = document.getElementById('global-loading-spinner');
  return !!(spinner && spinner.classList.contains('visible'));
}

/**
 * إضافة معالج لتغيير حالة الرؤية
 * @param {function(boolean, string)} handler - وظيفة المعالج
 * @returns {function} وظيفة لإلغاء الاشتراك
 */
function onVisibilityChange(handler) {
  if (typeof handler !== 'function') {
    return () => {};
  }
  
  spinnerState.visibilityChangeHandlers.push(handler);
  
  return () => {
    spinnerState.visibilityChangeHandlers = spinnerState.visibilityChangeHandlers.filter(h => h !== handler);
  };
}

/**
 * تعيين الرسالة المعروضة مع spinner
 * @param {string} newMessage - الرسالة الجديدة
 * @returns {boolean} true إذا تمت العملية بنجاح
 */
function setSpinnerMessage(newMessage) {
  if (typeof newMessage !== 'string' || newMessage.trim() === '') {
    return false;
  }
  
  spinnerState.message = newMessage;
  
  const spinnerElement = document.getElementById('global-loading-spinner');
  const messageElement = spinnerElement?.querySelector('.spinner-message');
  
  if (messageElement) {
    messageElement.textContent = newMessage;
    return true;
  }
  
  return false;
}

/**
 * الحصول على الرسالة الحالية المعروضة مع spinner
 * @returns {string} الرسالة الحالية
 */
function getSpinnerMessage() {
  return spinnerState.message || 'جار التحميل...';
}

/**
 * الحصول على الحالة الحالية لـ spinner
 * @returns {SpinnerViewState} الحالة الحالية
 */
function getSpinnerState() {
  return {
    ...spinnerState,
    duration: spinnerState.isVisible ? Date.now() - spinnerState.showTimestamp : 0
  };
}

/**
 * التحقق من وجود spinner في DOM
 * @returns {boolean} true إذا كان spinner مرتبطًا
 */
function isSpinnerAttached() {
  return !!document.getElementById('global-loading-spinner');
}

/**
 * التحقق مما إذا كان spinner مرئيًا
 * @returns {boolean} true إذا كان spinner مرئيًا
 */
function isSpinnerVisible() {
  const spinner = document.getElementById('global-loading-spinner');
  return !!(spinner && spinner.classList.contains('visible'));
}

/**
 * تعيين التبعيات الداخلية
 * @param {SpinnerViewDependencies} injectedDeps - التبعيات المُدخلة
 */
function _setDependencies(injectedDeps) {
  if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
  if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
  if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
}

/**
 * إضافة spinner إلى الصفحة
 * @private
 * @returns {boolean} true إذا تم إضافة spinner
 */
function _attachSpinnerToDOM() {
  try {
    // التحقق مما إذا كان spinner موجودًا
    if (document.getElementById('global-loading-spinner')) {
      spinnerState.isAttached = true;
      return true;
    }
    
    // إنشاء spinner
    const spinner = document.createElement('div');
    spinner.id = 'global-loading-spinner';
    spinner.className = 'spinner-overlay';
    spinner.innerHTML = `
      <div class="spinner-container">
        <div class="spinner"></div>
        <span class="spinner-message">جار التحميل...</span>
      </div>
    `;
    
    // إضافة spinner إلى body
    document.body.appendChild(spinner);
    spinnerState.isAttached = true;
    
    return true;
  } catch (error) {
    (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
      error,
      message: 'فشل في إضافة spinner إلى الصفحة.',
      origin: 'SpinnerView._attachSpinnerToDOM'
    });
    return false;
  }
}

/**
 * التحقق من صحة spinner
 * @returns {boolean} true إذا كان spinner صالحًا
 */
function validateSpinner() {
  if (!isSpinnerAttached()) {
    return false;
  }
  
  const spinner = document.getElementById('global-loading-spinner');
  const spinnerContainer = spinner.querySelector('.spinner-container');
  const spinnerElement = spinner.querySelector('.spinner');
  const messageElement = spinner.querySelector('.spinner-message');
  
  return !!(spinner && spinnerContainer && spinnerElement && messageElement);
}

export default spinnerView;

/**
 * تهيئة عرض spinner
 * @param {SpinnerViewDependencies} dependencies - التبعيات
 */
export function initializeSpinnerView(dependencies) {
  try {
    console.info('[SpinnerView] تم تهيئته بنجاح');
    
    // جعل spinner متاحًا عالميًا لتسهيل التصحيح
    if (typeof window !== 'undefined' && 
        (typeof process === 'undefined' || process.env.NODE_ENV === 'development')) {
      window.spinnerView = {
        ...spinnerView
      };
    }
    
    // تعيين التبعيات
    if (dependencies && (dependencies.stateStore || dependencies.errorLogger || dependencies.eventAggregator)) {
      spinnerView._setDependencies({
        stateStore: dependencies.stateStore || {
          subscribe: (handler) => ({ unsubscribe: () => {} }),
          getState: () => ({ isLoading: false })
        },
        errorLogger: dependencies.errorLogger || console,
        eventAggregator: dependencies.eventAggregator || {
          publish: () => {},
          subscribe: (event, handler) => ({ unsubscribe: () => {} })
        }
      });
    }
    
    // إرجاع الواجهة البرمجية
    const api = spinnerView.initialize(dependencies);
    
    return {
      show: api.show,
      hide: api.hide,
      toggle: api.toggle,
      isVisible: api.isVisible,
      getSpinnerState: api.getSpinnerState,
      setSpinnerMessage: api.setSpinnerMessage,
      getSpinnerMessage: api.getSpinnerMessage,
      onVisibilityChange: api.onVisibilityChange
    };
  } catch (error) {
    console.error('[SpinnerView] فشل في التهيئة:', error);
    return {};
  }
}
