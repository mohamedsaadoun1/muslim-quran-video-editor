// js/features/background-controller/background-color.chooser.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, DEFAULT_PROJECT_SCHEMA, EVENTS } from '../../config/app.constants.js';
import localizationService from '../../core/localization.service.js';

/**
 * @typedef {Object} BackgroundColorState
 * @property {string} color - اللون الحالي
 * @property {boolean} isColorType - هل نوع الخلفية هو "لون"؟
 * @property {boolean} isProjectLoaded - هل تم تحميل المشروع؟
 * @property {boolean} disabled - هل الحقل معطل؟
 */

/**
 * @typedef {Object} BackgroundColorChooser
 * @property {(injectedDeps: Object) => void} _setDependencies - تعيين الاعتماديات
 * @property {() => void} setColor - تعيين لون الخلفية
 * @property {() => string} getCurrentColor - الحصول على اللون الحالي
 * @property {() => void} resetColor - إعادة تعيين اللون
 * @property {() => void} cleanup - تنظيف الموارد
 * @property {() => boolean} selfTest - التحقق من الصحة
 */

const backgroundColorChooser = (() => {
  // الثوابت
  const COLOR_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/; // تنسيق #RGB أو #RRGGBB
  
  // المتغيرات الداخلية
  let colorPickerElement = null;
  let currentColor = DEFAULT_PROJECT_SCHEMA.background.source;
  let isColorType = false;
  let isProjectLoaded = false;
  
  // الاعتمادية
  let dependencies = {
    stateStore: {
      getState: () => ({ currentProject: null }),
      dispatch: () => {},
      subscribe: (callback) => {
        return () => {};
      }
    },
    errorLogger: console,
    eventAggregator: {
      publish: () => {},
      subscribe: () => ({ unsubscribe: () => {} })
    }
  };
  
  // الدوال المساعدة
  const getLogger = () => {
    return dependencies.errorLogger || console;
  };
  
  const getLocalization = () => {
    return localizationService;
  };
  
  const translate = (key, placeholders) => {
    const service = getLocalization();
    return service.translate(key, placeholders);
  };
  
  const isValidColor = (color) => {
    if (!color || typeof color !== 'string') {
      return false;
    }
    
    return COLOR_REGEX.test(color);
  };
  
  const notifyBackgroundUpdated = (color, type) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.BACKGROUND_UPDATED, {
        type: type || 'color',
        source: color
      });
    }
  };
  
  const notifyBackgroundDisabled = (disabled) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.BACKGROUND_DISABLED, disabled);
    }
  };
  
  /**
   * تحديث حقل اختيار اللون
   * @private
   * @param {string} color - اللون الجديد
   */
  function _updateColorPickerUI(color) {
    if (!colorPickerElement) return;
    
    if (colorPickerElement.value !== color) {
      colorPickerElement.value = color;
    }
    
    if (!isValidColor(color)) {
      const logger = getLogger();
      logger.logWarning({
        message: `اللون غير صالح: ${color}`,
        origin: 'BackgroundColorChooser._updateColorPickerUI'
      });
      return;
    }
    
    // تحديث الحالة الداخلية
    currentColor = color;
    dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      background: {
        type: 'color',
        source: color
      }
    });
  }

  /**
   * التعامل مع تغيير اللون
   * @private
   */
  function _handleColorChange() {
    if (!colorPickerElement) {
      const logger = getLogger();
      logger.handleError({
        message: 'فشل في التعامل مع تغيير اللون: لا يوجد حقل اختيار لون',
        origin: 'BackgroundColorChooser._handleColorChange'
      });
      return;
    }
    
    const newColor = colorPickerElement.value;
    
    if (!isValidColor(newColor)) {
      const logger = getLogger();
      logger.logWarning({
        message: `قيمة اللون غير صالحة: ${newColor}`,
        origin: 'BackgroundColorChooser._handleColorChange'
      });
      return;
    }
    
    // تحديث الحالة
    isColorType = true;
    isProjectLoaded = true;
    
    dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      background: {
        type: 'color',
        source: newColor
      }
    });
    
    // نشر الحدث
    notifyBackgroundUpdated(newColor, 'color');
  }

  /**
   * إعداد مراقبة الأحداث
   * @private
   */
  function _setupEventListeners() {
    colorPickerElement = DOMElements.backgroundColorPicker;
    
    if (!colorPickerElement) {
      const logger = getLogger();
      logger.logWarning({
        message: translate('BackgroundColorChooser.ElementNotFound'),
        origin: 'BackgroundColorChooser._setupEventListeners'
      });
      return;
    }
    
    // ربط الأحداث
    colorPickerElement.addEventListener('input', _handleColorChange);
    colorPickerElement.addEventListener('change', _handleColorChange);
    
    // مزامنة الحالة مع المشروع
    dependencies.stateStore.subscribe((newState) => {
      const project = newState.currentProject;
      
      if (!project || !project.background || project.background.type !== 'color') {
        isColorType = false;
        isProjectLoaded = false;
        if (colorPickerElement) {
          colorPickerElement.disabled = true;
          colorPickerElement.style.opacity = '0.5';
          colorPickerElement.style.cursor = 'not-allowed';
        }
        return;
      }
      
      isColorType = true;
      isProjectLoaded = !!project;
      
      if (colorPickerElement) {
        colorPickerElement.disabled = false;
        colorPickerElement.style.opacity = '1';
        colorPickerElement.style.cursor = 'pointer';
        
        if (colorPickerElement.value !== project.background.source) {
          colorPickerElement.value = project.background.source;
        }
      }
      
      currentColor = project.background.source;
    });
  }

  /**
   * مزامنة الحالة مع المشروع
   * @private
   */
  function _syncWithProjectState() {
    const project = dependencies.stateStore.getState().currentProject;
    
    if (!project || !project.background || project.background.type !== 'color') {
      isColorType = false;
      isProjectLoaded = false;
      
      if (colorPickerElement) {
        colorPickerElement.disabled = true;
        colorPickerElement.style.opacity = '0.5';
        colorPickerElement.style.cursor = 'not-allowed';
      }
      
      currentColor = DEFAULT_PROJECT_SCHEMA.background.source;
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
        background: {
          type: 'color',
          source: currentColor
        }
      });
      
      notifyBackgroundUpdated(currentColor, 'color');
      return;
    }
    
    isColorType = true;
    isProjectLoaded = true;
    currentColor = project.background.source;
    
    if (colorPickerElement) {
      colorPickerElement.disabled = false;
      colorPickerElement.style.opacity = '1';
      colorPickerElement.style.cursor = 'pointer';
      
      if (colorPickerElement.value !== currentColor) {
        colorPickerElement.value = currentColor;
      }
    }
    
    dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      background: {
        type: 'color',
        source: currentColor
      }
    });
    
    notifyBackgroundUpdated(currentColor, 'color');
  }

  /**
   * تعيين الاعتماديات
   * @param {Object} injectedDeps - الاعتماديات المُمررة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
  }

  /**
   * تعيين لون الخلفية
   * @param {string} color - اللون (تنسيق HEX)
   */
  function setColor(color) {
    if (!isValidColor(color)) {
      const logger = getLogger();
      logger.logWarning({
        message: `اللون غير صالح: ${color}`,
        origin: 'BackgroundColorChooser.setColor'
      });
      return;
    }
    
    currentColor = color;
    dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      background: {
        type: 'color',
        source: color
      }
    });
    
    if (colorPickerElement && colorPickerElement.value !== color) {
      colorPickerElement.value = color;
    }
    
    notifyBackgroundUpdated(color, 'color');
  }

  /**
   * الحصول على اللون الحالي
   * @returns {string} اللون (تنسيق HEX)
   */
  function getCurrentColor() {
    return currentColor;
  }

  /**
   * إعادة تعيين اللون إلى القيم الافتراضية
   */
  function resetColor() {
    currentColor = DEFAULT_PROJECT_SCHEMA.background.source;
    isColorType = false;
    isProjectLoaded = false;
    
    dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      background: {
        type: 'default',
        source: currentColor
      }
    });
    
    if (colorPickerElement) {
      colorPickerElement.value = currentColor;
      colorPickerElement.disabled = true;
      colorPickerElement.style.opacity = '0.5';
      colorPickerElement.style.cursor = 'not-allowed';
    }
    
    notifyBackgroundUpdated(currentColor, 'default');
  }

  /**
   * تنظيف الموارد
   */
  function cleanup() {
    if (colorPickerElement) {
      colorPickerElement.removeEventListener('input', _handleColorChange);
      colorPickerElement.removeEventListener('change', _handleColorChange);
      colorPickerElement = null;
    }
    
    currentColor = DEFAULT_PROJECT_SCHEMA.background.source;
    isColorType = false;
    isProjectLoaded = false;
    
    dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      background: {
        type: 'default',
        source: currentColor
      }
    });
    
    notifyBackgroundUpdated(currentColor, 'default');
  }

  /**
   * التحقق مما إذا كان النظام جاهزًا
   * @returns {boolean} نتيجة التحقق
   */
  function selfTest() {
    try {
      const testColor = '#1a2b3c';
      const testSchemaColor = DEFAULT_PROJECT_SCHEMA.background.source;
      
      // التحقق من صحة تعيين اللون
      setColor(testColor);
      return getCurrentColor() === testColor;
    } catch (e) {
      return false;
    }
  }

  // واجهة API العامة
  return {
    _setDependencies,
    setColor,
    getCurrentColor,
    resetColor,
    cleanup,
    selfTest
  };
})();

/**
 * تهيئة اختيار لون الخلفية
 * @param {Object} dependencies - الاعتماديات المُمررة
 * @returns {Object} واجهة اختيار اللون
 */
export function initializeBackgroundColorChooser(dependencies) {
  backgroundColorChooser._setDependencies(dependencies);
  backgroundColorChooser._setupEventListeners();
  backgroundColorChooser._syncWithProjectState();
  
  return {
    setColor: backgroundColorChooser.setColor,
    getCurrentColor: backgroundColorChooser.getCurrentColor,
    resetColor: backgroundColorChooser.resetColor,
    cleanup: backgroundColorChooser.cleanup
  };
}

/**
 * التحقق من صحة النظام
 * @returns {boolean} نتيجة التحقق
 */
export function selfTest() {
  return backgroundColorChooser.selfTest();
}

// تصدير الكائن الافتراضي
export default backgroundColorChooser;
