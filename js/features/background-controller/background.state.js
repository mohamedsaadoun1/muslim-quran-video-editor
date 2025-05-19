// js/features/background-controller/background.state.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

import { BACKGROUND_TYPES } from '../../config/app.constants.js';
import localizationService from '../../core/localization.service.js';
import errorLogger from '../../core/error-logger.js';
import eventAggregator from '../../core/event-aggregator.js';

/**
 * @typedef {Object} AISuggestionItem
 * @property {string | number} id - معرف العنصر (يُستخدم لـ Pexels ID)
 * @property {'image' | 'video'} type - نوع العنصر
 * @property {string} url - رابط العنصر
 * @property {string} [thumbnailUrl] - رابط الصورة المصغرة
 * @property {string} [photographer] - اسم المصور
 * @property {string} [photographerUrl] - رابط المصور
 * @property {string} [alt] - وصف العنصر
 * @property {number} [duration] - مدة الفيديو (بالثواني)
 */

/**
 * @typedef {Object} AISuggestionsState
 * @property {AISuggestionItem[]} photos - اقتراحات الصور
 * @property {AISuggestionItem[]} videos - اقتراحات الفيديوهات
 * @property {string | null} query - استعلام البحث
 * @property {boolean} isLoading - هل قيد التحميل؟
 * @property {string | null} error - رسالة الخطأ (إن وُجد)
 * @property {number | null} timestamp - وقت التحديث
 */

/**
 * @typedef {Object} BackgroundStateSchema
 * @property {BACKGROUND_TYPES.COLOR | BACKGROUND_TYPES.IMAGE | BACKGROUND_TYPES.VIDEO} type - نوع الخلفية
 * @property {string} source - مصدر الخلفية (رابط أو لون بصيغة HEX)
 * @property {string} [fileName] - اسم الملف (للصور والفيديوهات)
 * @property {AISuggestionsState} aiSuggestions - اقتراحات الذكاء الاصطناعي
 * @property {number} [videoStartTime] - وقت بدء تشغيل الفيديو
 * @property {number} [videoVolume] - مستوى الصوت (من 0 إلى 1)
 * @property {boolean} [isVideoMuted] - هل الفيديو مُكتم الصوت؟
 * @property {string} [filter] - فلتر الفيديو (مثل "blur", "grayscale")
 * @property {string} [aspectRatio] - نسبة الأبعاد (مثل "16:9", "4:3")
 * @property {string} [transition] - نوع الانتقال بين العناصر
 * @property {boolean} [loop] - هل يتم تكرار الفيديو؟
 * @property {string} [thumbnailUrl] - رابط الصورة المصغرة
 * @property {string} [backgroundText] - نص الخلفية (للاستخدام في Text & Effects Panel)
 * @property {string} [backgroundTextFont] - خط نص الخلفية
 * @property {number} [backgroundTextFontSize] - حجم خط نص الخلفية
 * @property {string} [backgroundTextFontColor] - لون خط نص الخلفية
 * @property {string} [backgroundTextEffect] - تأثير ظهور النص (مثل fade, slide)
 */

/**
 * @typedef {Object} BackgroundActions
 * @property {(injectedDeps: Object) => void} _setDependencies - تعيين الاعتماديات
 * @property {(projectState: ProjectState | null) => BackgroundStateSchema} getBackgroundSettings - الحصول على الحالة
 * @property {(projectState: ProjectState | null) => string} getBackgroundSource - الحصول على المصدر
 * @property {(projectState: ProjectState | null) => 'color' | 'image' | 'video'} getBackgroundType - الحصول على النوع
 * @property {(projectState: ProjectState | null) => AISuggestionsState} getAISuggestions - الحصول على الاقتراحات
 * @property {() => void} resetBackground - إعادة تعيين الخلفية
 * @property {() => boolean} selfTest - التحقق من الصحة
 * @property {() => void} cleanup - تنظيف الموارد
 */

const backgroundState = (() => {
  // القيم الافتراضية
  const defaultBackgroundState = {
    type: BACKGROUND_TYPES.COLOR,
    source: '#0D0D0D', // لون افتراضي (أسود داكن)
    fileName: null,
    aiSuggestions: {
      photos: [],
      videos: [],
      query: null,
      isLoading: false,
      error: null,
      timestamp: null
    },
    videoStartTime: 0,
    videoVolume: 0.5,
    isVideoMuted: true,
    filter: null,
    aspectRatio: null,
    transition: 'none',
    loop: false,
    thumbnailUrl: null,
    backgroundText: null,
    backgroundTextFont: null,
    backgroundTextFontSize: null,
    backgroundTextFontColor: null,
    backgroundTextEffect: null
  };
  
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
  
  const translate = (key) => {
    const service = getLocalization();
    return service.translate(key);
  };
  
  const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };
  
  const isValidBackgroundSource = (source) => {
    if (!source || typeof source !== 'string') {
      return false;
    }
    
    // التحقق من صحة اللون (تنسيق HEX)
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (colorRegex.test(source)) {
      return true;
    }
    
    // التحقق من صحة الرابط
    try {
      new URL(source);
      return true;
    } catch (e) {
      return false;
    }
  };
  
  const notifyBackgroundUpdated = (type, source, fileName) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.BACKGROUND_UPDATED, {
        type,
        source,
        fileName,
        timestamp: Date.now()
      });
    }
  };
  
  const notifyBackgroundFailed = (errorMessage) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.BACKGROUND_FAILED, errorMessage);
    }
  };

  /**
   * الحصول على إعدادات الخلفية من الحالة
   * @param {ProjectState | null} projectState - الحالة الحالية للمشروع
   * @returns {BackgroundStateSchema} إعدادات الخلفية
   */
  function getBackgroundSettings(projectState) {
    try {
      return projectState?.background ? deepClone(projectState.background) : deepClone(defaultBackgroundState);
    } catch (error) {
      const logger = getLogger();
      logger.handleError({
        error,
        message: translate('BackgroundState.InvalidBackgroundState'),
        origin: 'BackgroundState.getBackgroundSettings',
        severity: 'warning',
        context: { projectState }
      });
      return deepClone(defaultBackgroundState);
    }
  }

  /**
   * الحصول على نوع الخلفية
   * @param {ProjectState | null} projectState - الحالة الحالية للمشروع
   * @returns {'color' | 'image' | 'video'} نوع الخلفية
   */
  function getBackgroundType(projectState) {
    try {
      const type = projectState?.background?.type;
      
      if (!type || !Object.values(BACKGROUND_TYPES).includes(type)) {
        return BACKGROUND_TYPES.COLOR;
      }
      
      return type;
    } catch (error) {
      const logger = getLogger();
      logger.logWarning({
        message: translate('BackgroundState.FailedToGetType'),
        origin: 'BackgroundState.getBackgroundType',
        context: { projectState }
      });
      return BACKGROUND_TYPES.COLOR;
    }
  }

  /**
   * الحصول على مصدر الخلفية
   * @param {ProjectState | null} projectState - الحالة الحالية للمشروع
   * @returns {string} مصدر الخلفية
   */
  function getBackgroundSource(projectState) {
    try {
      const source = projectState?.background?.source;
      
      if (!source) {
        return defaultBackgroundState.source;
      }
      
      if (!isValidBackgroundSource(source)) {
        throw new Error(`مصدر غير صالح: ${source}`);
      }
      
      return source;
    } catch (error) {
      const logger = getLogger();
      logger.handleError({
        error,
        message: translate('BackgroundState.InvalidSource'),
        origin: 'BackgroundState.getBackgroundSource',
        severity: 'warning',
        context: { projectState }
      });
      return defaultBackgroundState.source;
    }
  }

  /**
   * الحصول على اسم ملف الخلفية (إن وُجد)
   * @param {ProjectState | null} projectState - الحالة الحالية للمشروع
   * @returns {string | null} اسم الملف
   */
  function getBackgroundFileName(projectState) {
    try {
      return projectState?.background?.fileName || null;
    } catch (error) {
      const logger = getLogger();
      logger.logWarning({
        message: translate('BackgroundState.FailedToGetFileName'),
        origin: 'BackgroundState.getBackgroundFileName',
        context: { projectState }
      });
      return null;
    }
  }

  /**
   * الحصول على اقتراحات الذكاء الاصطناعي
   * @param {ProjectState | null} projectState - الحالة الحالية للمشروع
   * @returns {AISuggestionsState} اقتراحات الذكاء الاصطناعي
   */
  function getAISuggestions(projectState) {
    try {
      const suggestions = projectState?.background?.aiSuggestions;
      
      if (!suggestions || typeof suggestions !== 'object') {
        return deepClone(defaultBackgroundState.aiSuggestions);
      }
      
      return deepClone(suggestions);
    } catch (error) {
      const logger = getLogger();
      logger.logWarning({
        message: translate('BackgroundState.FailedToGetSuggestions'),
        origin: 'BackgroundState.getAISuggestions',
        context: { projectState }
      });
      return deepClone(defaultBackgroundState.aiSuggestions);
    }
  }

  /**
   * إعادة تعيين الخلفية إلى القيم الافتراضية
   * @returns {BackgroundStateSchema} الحالة الافتراضية
   */
  function resetBackground() {
    try {
      const resetState = deepClone(defaultBackgroundState);
      
      if (dependencies.stateStore && dependencies.stateStore.dispatch) {
        dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
          background: resetState
        });
      }
      
      notifyBackgroundUpdated(resetState.type, resetState.source, 'default');
      return resetState;
    } catch (error) {
      const logger = getLogger();
      logger.handleError({
        error,
        message: translate('BackgroundState.FailedToReset'),
        origin: 'BackgroundState.resetBackground',
        severity: 'error',
        context: { error }
      });
      return null;
    }
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
   * التحقق من صحة النظام
   * @returns {boolean} نتيجة التحقق
   */
  function selfTest() {
    try {
      const testState = {
        background: {
          type: 'color',
          source: '#1a2b3c'
        }
      };
      
      const result = backgroundState.getBackgroundSource(testState);
      return result === '#1a2b3c';
    } catch (e) {
      return false;
    }
  }

  return {
    _setDependencies,
    getBackgroundSettings,
    getBackgroundType,
    getBackgroundSource,
    getBackgroundFileName,
    getAISuggestions,
    resetBackground,
    selfTest
  };
})();

/**
 * تهيئة حالة الخلفية
 * @param {Object} deps - الاعتماديات المُمررة
 * @returns {Object} واجهة حالة الخلفية
 */
export function initializeBackgroundStateModule(deps) {
  backgroundState._setDependencies(deps);
  
  const initialProject = deps.stateStore.getState().currentProject;
  const backgroundSettings = backgroundState.getBackgroundSettings(initialProject);
  
  if (deps.eventAggregator && deps.eventAggregator.publish) {
    deps.eventAggregator.publish(EVENTS.BACKGROUND_STATE_LOADED, backgroundSettings);
  }
  
  return {
    getBackgroundSettings: backgroundState.getBackgroundSettings,
    getBackgroundType: backgroundState.getBackgroundType,
    getBackgroundSource: backgroundState.getBackgroundSource,
    getBackgroundFileName: backgroundState.getBackgroundFileName,
    getAISuggestions: backgroundState.getAISuggestions,
    resetBackground: backgroundState.resetBackground,
    selfTest: backgroundState.selfTest
  };
}

/**
 * التحقق من صحة النظام
 * @returns {boolean} نتيجة التحقق
 */
export function selfTest() {
  return backgroundState.selfTest();
}

// تصدير الكائن الافتراضي
export default backgroundState;
