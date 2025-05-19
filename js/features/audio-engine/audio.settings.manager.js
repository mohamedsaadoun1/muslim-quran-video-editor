// js/features/audio-engine/audio.settings.manager.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';
import localizationService from '../../core/localization.service.js';

/**
 * @typedef {Object} AudioSettings
 * @property {number} delayBetweenAyahs - تأثير بين الآيات (ثواني)
 */

/**
 * @typedef {Object} AudioSettingsManager
 * @property {(injectedDeps: Object) => void} _setDependencies - تعيين الاعتماديات
 * @property {() => void} initialize - تهيئة المدير
 * @property {() => void} cleanup - تنظيف الموارد
 * @property {() => number} getCurrentAyahDelay - الحصول على التأثير الحالي
 * @property {(delay: number) => void} setAyahDelay - تعيين التأثير بين الآيات
 */

const audioSettingsManager = (() => {
  // المتغيرات الداخلية
  const subscriptions = [];
  const eventHandlers = {};
  
  let dependencies = {
    stateStore: {
      getState: () => ({ currentProject: null }),
      dispatch: () => {},
      subscribe: (callback) => {
        subscriptions.push(callback);
        return () => {
          const index = subscriptions.indexOf(callback);
          if (index > -1) subscriptions.splice(index, 1);
        };
      }
    },
    errorLogger: console,
    localizationService
  };
  
  // المتغيرات المحلية
  let delayInput = null;
  let unsubscribeState = () => {};
  
  // الدوال المساعدة
  const getLogger = () => {
    return dependencies.errorLogger || console;
  };
  
  const getLocalization = () => {
    return dependencies.localizationService || localizationService;
  };
  
  const isNumeric = (value) => {
    return !isNaN(parseFloat(value)) && isFinite(value) && value >= 0;
  };
  
  const translate = (key, placeholders) => {
    const service = getLocalization();
    return service.translate(key, placeholders);
  };
  
  const validateDelay = (delay) => {
    if (!isNumeric(delay)) {
      const logger = getLogger();
      logger.handleError({
        message: `التأخير بين الآيات غير صالح: ${delay}`,
        origin: 'audio-settings-manager.validateDelay',
        severity: 'warning',
        context: { delay }
      });
      return false;
    }
    return true;
  };
  
  /**
   * تحديث تأثير بين الآيات في واجهة المستخدم
   * @param {number} delayInSeconds - التأثير بين الآيات (ثواني)
   */
  function updateDelayInput(delayInSeconds) {
    if (delayInput) {
      const min = parseFloat(delayInput.min) || 0;
      const max = parseFloat(delayInput.max) || Infinity;
      
      const validatedDelay = Math.max(min, Math.min(max, delayInSeconds));
      
      if (delayInput.value !== String(validatedDelay)) {
        delayInput.value = validatedDelay;
      }
    }
  }

  /**
   * التعامل مع تغييرات التأثير بين الآيات
   */
  function handleDelayInputChange() {
    if (delayInput) {
      const newDelay = parseFloat(delayInput.value);
      
      if (isNumeric(newDelay) && newDelay >= 0) {
        dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
          quranSelection: {
            delayBetweenAyahs: newDelay
          }
        });
      } else {
        const logger = getLogger();
        logger.logWarning({
          message: `قيمة التأثير غير صالحة: ${delayInput.value}`,
          origin: 'audio-settings-manager.handleDelayInputChange'
        });
        
        const currentProject = dependencies.stateStore.getState().currentProject;
        if (currentProject && currentProject.quranSelection) {
          updateDelayInput(currentProject.quranSelection.delayBetweenAyahs);
        }
      }
    }
  }

  /**
   * تهيئة مراقبة الحالة
   */
  function setupEventListeners() {
    delayInput = DOMElements.delayBetweenAyahsInput;
    
    if (delayInput) {
      delayInput.addEventListener('change', handleDelayInputChange);
    } else {
      const logger = getLogger();
      logger.logWarning({
        message: translate('AudioSettingsManager.DelayInputNotFound'),
        origin: 'audio-settings-manager.setupEventListeners'
      });
    }
  }

  /**
   * مراقبة تغييرات الحالة
   */
  function subscribeToStateChanges() {
    unsubscribeState = dependencies.stateStore.subscribe((newState) => {
      const project = newState.currentProject;
      
      if (project && project.quranSelection) {
        updateDelayInput(project.quranProject.delayBetweenAyahs);
      } else if (!project && delayInput) {
        updateDelayInput(DEFAULT_PROJECT_SCHEMA.quranSelection.delayBetweenAyahs);
        delayInput.disabled = true;
      } else if (delayInput) {
        delayInput.disabled = false;
      }
    });
  }

  /**
   * تعيين الاعتماديات
   * @param {Object} injectedDeps - الاعتماديات المُمررة
   */
  function setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) {
      dependencies.stateStore = injectedDeps.stateStore;
    }
    
    if (injectedDeps.errorLogger) {
      dependencies.errorLogger = injectedDeps.errorLogger;
    }
    
    if (injectedDeps.localizationService) {
      dependencies.localizationService = injectedDeps.localizationService;
    }
  }

  /**
   * تهيئة المدير
   */
  function initialize() {
    setupEventListeners();
    subscribeToStateChanges();
    
    const project = dependencies.stateStore.getState().currentProject;
    if (project && project.quranSelection) {
      updateDelayInput(project.quranSelection.delayBetweenAyahs);
    } else if (delayInput) {
      updateDelayInput(DEFAULT_PROJECT_SCHEMA.quranSelection.delayBetweenAyahs);
      delayInput.disabled = true;
    }
  }

  /**
   * تنظيف الموارد
   */
  function cleanup() {
    if (delayInput) {
      delayInput.removeEventListener('change', handleDelayInputChange);
    }
    
    unsubscribeState();
    subscriptions.length = 0;
    Object.keys(eventHandlers).forEach(key => delete eventHandlers[key]);
  }

  /**
   * الحصول على التأثير بين الآيات
   * @returns {number} التأثير بين الآيات (ثواني)
   */
  function getCurrentAyahDelay() {
    const project = dependencies.stateStore.getState().currentProject;
    if (project && project.quranSelection) {
      return project.quranSelection.delayBetweenAyahs;
    }
    return DEFAULT_PROJECT_SCHEMA.quranSelection.delayBetweenAyahs;
  }

  /**
   * تعيين التأثير بين الآيات
   * @param {number} delay - التأثير بين الآيات (ثواني)
   */
  function setAyahDelay(delay) {
    if (validateDelay(delay)) {
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
        quranSelection: {
          delayBetweenAyahs: delay
        }
      });
    }
  }

  return {
    _setDependencies: setDependencies,
    initialize,
    cleanup,
    getCurrentAyahDelay,
    setAyahDelay
  };
})();

/**
 * تهيئة مدير الإعدادات
 * @param {Object} injectedDependencies - الاعتماديات المُمررة
 * @returns {Object} واجهة المدير
 */
export function initializeAudioSettingsManager(injectedDependencies) {
  audioSettingsManager._setDependencies(injectedDependencies);
  audioSettingsManager.initialize();
  
  return {
    getCurrentAyahDelay: audioSettingsManager.getCurrentAyahDelay,
    setAyahDelay: audioSettingsManager.setAyahDelay,
    cleanup: audioSettingsManager.cleanup
  };
}

/**
 * التحقق من صحة المدير
 * @returns {boolean} نتيجة التحقق
 */
export function selfTest() {
  try {
    const testDelay = 2.5;
    audioSettingsManager.setAyahDelay(testDelay);
    return audioSettingsManager.getCurrentAyahDelay() === testDelay;
  } catch (e) {
    return false;
  }
}

// تصدير الكائن الافتراضي
export default audioSettingsManager;
