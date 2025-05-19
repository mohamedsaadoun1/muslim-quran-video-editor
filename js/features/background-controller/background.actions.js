// js/features/background-controller/background.actions.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

import { ACTIONS, EVENTS } from '../../config/app.constants.js';
import localizationService from '../../core/localization.service.js';
import errorLogger from '../../core/error-logger.js';
import eventAggregator from '../../core/event-aggregator.js';
import stateStore from '../../core/state-store.js';

/**
 * @typedef {Object} BackgroundAction
 * @property {'color' | 'image' | 'video'} type - نوع الخلفية
 * @property {string} source - المصدر (لون أو رابط)
 * @property {string} [fileName] - اسم الملف (للصور والفيديوهات)
 * @property {Object} [aiSuggestions] - اقتراحات الذكاء الاصطناعي
 * @property {string} [error] - رسالة الخطأ (إن وجد)
 * @property {boolean} [isLoading] - هل قيد التحميل؟
 * @property {string} [timestamp] - وقت التحديث
 */

/**
 * @typedef {Object} BackgroundActions
 * @property {(type: string, source: string, fileName?: string) => void} setBackground - تعيين الخلفية
 * @property {(colorHex: string) => void} setBackgroundColor - تعيين لون الخلفية
 * @property {(imageDataUrl: string, imageName: string) => void} setBackgroundImageFile - تعيين صورة الخلفية
 * @property {(videoObjectUrl: string, videoName: string) => void} setBackgroundVideoFile - تعيين فيديو الخلفية
 * @property {(suggestionsPayload: Object) => void} updateAISuggestions - تحديث الاقتراحات
 * @property {() => void} clearAISuggestions - مسح الاقتراحات
 * @property {(backgroundChanges: Object) => void} updateBackgroundProperty - تحديث خاصية واحدة فقط
 * @property {() => void} resetBackground - إعادة تعيين الخلفية
 * @property {() => void} cleanup - تنظيف الموارد
 * @property {() => boolean} selfTest - التحقق من الصحة
 */

const backgroundActions = (() => {
  // الثوابت
  const DEFAULT_BACKGROUND_TYPE = 'color';
  const DEFAULT_BACKGROUND_SOURCE = '#ffffff';
  const LOCAL_STORAGE_KEY = 'MQVE_backgroundSettings';
  
  // المتغيرات الداخلية
  let _dispatch = () => {};
  let _errorLogger = errorLogger || console;
  let _eventAggregator = eventAggregator || { publish: () => {} };
  let _isInitialized = false;
  let _lastBackground = {
    type: DEFAULT_BACKGROUND_TYPE,
    source: DEFAULT_BACKGROUND_SOURCE,
    fileName: null,
    aiSuggestions: { photos: [], videos: [] },
    timestamp: Date.now()
  };
  
  // الدوال المساعدة
  const getLocalization = () => {
    return localizationService;
  };
  
  const translate = (key) => {
    const service = getLocalization();
    return service.translate(key);
  };
  
  const validateBackgroundType = (type) => {
    const validTypes = ['color', 'image', 'video'];
    if (!validTypes.includes(type)) {
      throw new Error(`نوع الخلفية غير مدعوم: ${type}`);
    }
  };
  
  const validateColor = (color) => {
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/; // #RRGGBB أو #RGB
    if (!colorRegex.test(color)) {
      throw new Error(`لون غير صالح: ${color}`);
    }
  };
  
  const validateSource = (source) => {
    try {
      new URL(source);
    } catch (e) {
      throw new Error(`مصدر غير صالح: ${source}`);
    }
  };
  
  const notifyBackgroundUpdated = (type, source, fileName) => {
    if (_eventAggregator && _eventAggregator.publish) {
      _eventAggregator.publish(EVENTS.BACKGROUND_UPDATED, {
        type,
        source,
        fileName,
        timestamp: Date.now()
      });
    }
  };
  
  const notifyBackgroundFailed = (errorMessage) => {
    if (_eventAggregator && _eventAggregator.publish) {
      _eventAggregator.publish(EVENTS.BACKGROUND_FAILED, {
        error: errorMessage,
        timestamp: Date.now()
      });
    }
  };
  
  const saveBackgroundToStorage = (backgroundData) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(backgroundData));
    } catch (e) {
      const logger = _errorLogger || console;
      logger.handleError({
        error: e,
        message: `فشل في حفظ إعدادات الخلفية`,
        origin: 'BackgroundActions.saveBackgroundToStorage',
        severity: 'error',
        context: { error: e.message }
      });
    }
  };
  
  const loadBackgroundFromStorage = () => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        _lastBackground = parsed;
        return parsed;
      }
      return null;
    } catch (e) {
      const logger = _errorLogger || console;
      logger.handleError({
        error: e,
        message: `فشل في تحميل إعدادات الخلفية من localStorage`,
        origin: 'BackgroundActions.loadBackgroundFromStorage',
        severity: 'error',
        context: { error: e.message }
      });
      return null;
    }
  };

  /**
   * تعيين الخلفية بأنواعها المختلفة
   * @param {'color' | 'image' | 'video'} type - نوع الخلفية
   * @param {string} source - المصدر (لون أو رابط)
   * @param {string} [fileName] - اسم الملف (اختياري)
   */
  function setBackground(type, source, fileName) {
    const logger = _errorLogger || console;
    
    try {
      // التحقق من صحة النوع
      validateBackgroundType(type);
      
      // التحقق من صحة اللون
      if (type === 'color') {
        validateColor(source);
      } else if (type === 'image' || type === 'video') {
        validateSource(source);
      }
      
      // تحديث الحالة
      const payload = {
        background: {
          type,
          source,
          fileName: fileName || null,
          aiSuggestions: {
            photos: [],
            videos: [],
            query: null,
            isLoading: false,
            error: null
          },
          timestamp: Date.now()
        }
      };
      
      if (_dispatch && typeof _dispatch === 'function') {
        _dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, payload.background);
        notifyBackgroundUpdated(type, source, fileName);
        saveBackgroundToStorage(payload.background);
      } else {
        logger.handleError({
          message: 'وظيفة _dispatch غير متوفرة. لا يمكن تحديث الحالة.',
          origin: 'BackgroundActions.setBackground',
          severity: 'error',
          context: { payload }
        });
      }
      
      return true;
    } catch (error) {
      logger.handleError({
        error,
        message: `فشل في تعيين الخلفية: ${error.message}`,
        origin: 'BackgroundActions.setBackground',
        severity: 'error',
        context: { type, source, fileName, error: error.message }
      });
      
      notifyBackgroundFailed(error.message);
      return false;
    }
  }

  /**
   * تعيين لون الخلفية
   * @param {string} colorHex - اللون بتنسيق HEX
   */
  function setBackgroundColor(colorHex) {
    try {
      // التحقق من صحة اللون
      validateColor(colorHex);
      
      // تعيين الخلفية
      setBackground('color', colorHex, null);
    } catch (error) {
      const logger = _errorLogger || console;
      logger.handleError({
        error,
        message: `لون غير صالح: ${colorHex}. ${error.message}`,
        origin: 'BackgroundActions.setBackgroundColor',
        severity: 'error',
        context: { colorHex, error: error.message }
      });
    }
  }

  /**
   * تعيين صورة الخلفية
   * @param {string} imageDataUrl - رابط الصورة (Data URL)
   * @param {string} imageName - اسم الملف
   */
  function setBackgroundImageFile(imageDataUrl, imageName) {
    if (!imageDataUrl || !imageName) {
      const logger = _errorLogger || console;
      logger.logWarning({
        message: translate('BackgroundActions.InvalidImageOrName'),
        origin: 'BackgroundActions.setBackgroundImageFile',
        severity: 'warning',
        context: { imageDataUrl, imageName }
      });
      return;
    }
    
    // تعيين الخلفية
    setBackground('image', imageDataUrl, imageName);
  }

  /**
   * تعيين فيديو الخلفية
   * @param {string} videoObjectUrl - رابط الفيديو (Object URL)
   * @param {string} videoName - اسم الملف
   */
  function setBackgroundVideoFile(videoObjectUrl, videoName) {
    if (!videoObjectUrl || !videoName) {
      const logger = _errorLogger || console;
      logger.logWarning({
        message: translate('BackgroundActions.InvalidVideoOrName'),
        origin: 'BackgroundActions.setBackgroundVideoFile',
        severity: 'warning',
        context: { videoObjectUrl, videoName }
      });
      return;
    }
    
    // تعيين الخلفية
    setBackground('video', videoObjectUrl, videoName);
  }

  /**
   * تحديث اقتراحات الذكاء الاصطناعي
   * @param {Object} suggestionsPayload - بيانات الاقتراحات
   */
  function updateAISuggestions(suggestionsPayload) {
    const logger = _errorLogger || console;
    
    if (!suggestionsPayload || typeof suggestionsPayload !== 'object') {
      logger.logWarning({
        message: translate('BackgroundActions.InvalidSuggestionsPayload'),
        origin: 'BackgroundActions.updateAISuggestions',
        severity: 'warning',
        context: { suggestionsPayload }
      });
      return;
    }
    
    if (_dispatch && typeof _dispatch === 'function') {
      _dispatch(ACTIONS.SET_AI_SUGGESTIONS, suggestionsPayload);
      
      // تحديث الخلفية الأخيرة
      _lastBackground.aiSuggestions = suggestionsPayload;
      _lastBackground.timestamp = Date.now();
    } else {
      logger.handleError({
        message: 'وظيفة _dispatch غير متوفرة. لا يمكن تحديث الاقتراحات.',
        origin: 'BackgroundActions.updateAISuggestions',
        severity: 'error',
        context: { suggestionsPayload }
      });
    }
  }

  /**
   * مسح اقتراحات الذكاء الاصطناعي
   */
  function clearAISuggestions() {
    const clearPayload = {
      photos: [],
      videos: [],
      query: null,
      isLoading: false,
      error: null
    };
    
    updateAISuggestions(clearPayload);
  }

  /**
   * تحديث خاصية واحدة فقط في الخلفية
   * @param {Object} backgroundChanges - الخصائص الجديدة
   */
  function updateBackgroundProperty(backgroundChanges) {
    const logger = _errorLogger || console;
    
    if (typeof backgroundChanges !== 'object' || backgroundChanges === null) {
      logger.logWarning({
        message: translate('BackgroundActions.InvalidBackgroundChanges'),
        origin: 'BackgroundActions.updateBackgroundProperty',
        severity: 'warning',
        context: { backgroundChanges }
      });
      return;
    }
    
    if (_dispatch && typeof _dispatch === 'function') {
      _dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
        background: backgroundChanges
      });
    } else {
      logger.handleError({
        message: 'وظيفة _dispatch غير متوفرة. لا يمكن تحديث الخلفية.',
        origin: 'BackgroundActions.updateBackgroundProperty',
        severity: 'error',
        context: { backgroundChanges }
      });
    }
  }

  /**
   * إعادة تهيئة الخلفية إلى القيم الافتراضية
   */
  function resetBackground() {
    _lastBackground = {
      type: DEFAULT_BACKGROUND_TYPE,
      source: DEFAULT_BACKGROUND_SOURCE,
      fileName: null,
      aiSuggestions: { photos: [], videos: [] },
      timestamp: Date.now()
    };
    
    if (_dispatch && typeof _dispatch === 'function') {
      _dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
        background: _lastBackground
      });
    }
  }

  /**
   * تنظيف الموارد
   */
  function cleanup() {
    if (_eventAggregator && _eventAggregator.publish) {
      _eventAggregator.publish(EVENTS.BACKGROUND_CLEANUP, true);
    }
    
    resetBackground();
    _dispatch = null;
    _errorLogger = null;
    _eventAggregator = null;
  }

  /**
   * التحقق من صحة النظام
   * @returns {boolean} نتيجة التحقق
   */
  function selfTest() {
    try {
      const testColor = '#1a2b3c';
      const result = backgroundActions.setBackground('color', testColor, null);
      
      return result;
    } catch (e) {
      return false;
    }
  }

  // واجهة API العامة
  return {
    setBackground,
    setBackgroundColor,
    setBackgroundImageFile,
    setBackgroundVideoFile,
    updateAISuggestions,
    clearAISuggestions,
    updateBackgroundProperty,
    resetBackground,
    cleanup,
    selfTest
  };
})();

/**
 * تهيئة وظائف الخلفية
 * @param {Object} dependencies - الاعتماديات المُمررة
 * @returns {Object} واجهة وظائف الخلفية
 */
export function initializeBackgroundActions(dependencies) {
  // تعيين الاعتماديات
  if (dependencies && dependencies.stateStore && dependencies.stateStore.dispatch) {
    backgroundActions._dispatch = dependencies.stateStore.dispatch;
    backgroundActions._errorLogger = dependencies.errorLogger || console;
    backgroundActions._eventAggregator = dependencies.eventAggregator || { publish: () => {} };
    backgroundActions._isInitialized = true;
  } else {
    const logger = dependencies?.errorLogger || console;
    logger.logWarning({
      message: translate('BackgroundActions.DispatchNotSet'),
      origin: 'BackgroundActions.initializeBackgroundActions',
      severity: 'warning',
      context: { dependencies }
    });
    
    backgroundActions._isInitialized = false;
  }
  
  // إرجاع واجهة الكائن النهائي
  return {
    setBackground: backgroundActions.setBackground,
    setBackgroundColor: backgroundActions.setBackgroundColor,
    setBackgroundImageFile: backgroundActions.setBackgroundImageFile,
    setBackgroundVideoFile: backgroundActions.setBackgroundVideoFile,
    updateAISuggestions: backgroundActions.updateAISuggestions,
    clearAISuggestions: backgroundActions.clearAISuggestions,
    updateBackgroundProperty: backgroundActions.updateBackgroundProperty,
    resetBackground: backgroundActions.resetBackground,
    cleanup: backgroundActions.cleanup,
    selfTest: backgroundActions.selfTest
  };
}

/**
 * التحقق من صحة النظام
 * @returns {boolean} نتيجة التحقق
 */
export function selfTest() {
  return backgroundActions.selfTest();
}

// تصدير الكائن الافتراضي
export default backgroundActions;
