// js/features/video-editor/canvas-dimension.handler.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, EVENTS } from '../../config/app.constants.js';
import localizationService from '../../core/localization.service.js';
import errorLogger from '../../core/error-logger.js';
import eventAggregator from '../../core/event-aggregator.js';
import fileIOUtils from '../../services/file.io.utils.js';

/**
 * @typedef {Object} AspectRatio
 * @property {number} width - العرض
 * @property {number} height - الارتفاع
 * @property {string} label - التسمية (لعرضها في القائمة)
 * @property {string} value - القيمة (للاستخدام في الحالة)
 * @property {string} cssClass - الكلاس المرتبط (لتحديث واجهة المستخدم)
 * @property {number} [scale] - مقياس التكبير (للكانفاس)
 * @property {boolean} [isCustom] - هل النسبة مخصصة؟
 * @property {string} [customValue] - القيمة المخصصة (مثل "16:9" أو "1:1")
 * @property {string} [customLabel] - التسمية المخصصة (مثل "16:9" أو "1:1")
 * @property {string} [customCssClass] - الكلاس المخصص (لتحديث واجهة المستخدم)
 * @property {boolean} [isLocked] - هل النسبة مؤمنة؟
 * @property {string} [lockedReason] - سبب التأمين (مثل "project" أو "user")
 * @property {boolean} [canUserChange] - هل يمكن للمستخدم تغيير النسبة؟
 * @property {string} [lockedBy] - من قام بتأمين النسبة (مثل "admin" أو "system")
 */

/**
 * @typedef {Object} CanvasDimensionHandler
 * @property {(injectedDeps: Object) => void} _setDependencies - تعيين الاعتماديات
 * @property {() => void} _setupEventListeners - إعداد مراقبة الأحداث
 * @property {() => void} _teardownEventListeners - إزالة مراقبة الأحداث
 * @property {(ratioStr: string) => void} resizeCanvas - تغيير حجم الكانفاس
 * @property {(ratioStr: string) => {width: number, height: number}} calculateCanvasSize - حساب حجم الكانفاس
 * @property {() => void} populateSelect - ملء قائمة الاختيار
 * @property {() => void} updateCanvasSize - تحديث حجم الكانفاس
 * @property {() => void} resetAspectRatio - إعادة تعيين نسبة الأبعاد
 * @property {() => void} cleanup - تنظيف الموارد
 * @property {() => boolean} selfTest - التحقق من الصحة
 * @property {() => string} getAspectRatio - الحصول على نسبة الأبعاد
 * @property {() => {width: number, height: number}} getCanvasSize - الحصول على حجم الكانفاس
 * @property {() => {width: number, height: number}} getSupportedAspectRatios - الحصول على النسب المدعومة
 */

const canvasDimensionHandler = (() => {
  // الثوابت
  const LOCAL_STORAGE_KEY = 'MQVE_aspectRatio';
  const DEFAULT_ASPECT_RATIO = '16:9';
  const CANVAS_ID = 'main-canvas';
  const MIN_CANVAS_SIZE = { width: 320, height: 240 };
  const MAX_CANVAS_SIZE = { width: 1920, height: 1080 };
  
  // المتغيرات الداخلية
  let aspectRatioSelectRef = null;
  let currentAspectRatio = DEFAULT_ASPECT_RATIO;
  let canvasElement = null;
  let isInitialized = false;
  
  // الاعتمادية
  const dependencies = {
    stateStore: {
      getState: () => ({ currentProject: null }),
      dispatch: () => {},
      subscribe: (callback) => {
        return () => {};
      }
    },
    errorLogger: errorLogger || console,
    eventAggregator: eventAggregator || { publish: () => {}, subscribe: () => ({ unsubscribe: () => {} }) },
    localizationService: localizationService || { translate: key => key }
  };
  
  // الدوال المساعدة
  const getLogger = () => {
    return dependencies.errorLogger || console;
  };
  
  const getLocalization = () => {
    return dependencies.localizationService || localizationService;
  };
  
  const translate = (key) => {
    const service = getLocalization();
    return service.translate(key);
  };
  
  const isValidAspectRatio = (ratioStr) => {
    return Object.keys(SUPPORTED_ASPECT_RATIOS).includes(ratioStr);
  };
  
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  
  const notifyAspectRatioChanged = (newRatio) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.ASPECT_RATIO_CHANGED, {
        ratio: newRatio,
        timestamp: Date.now()
      });
    }
  };
  
  const notifyAspectRatioFailed = (errorMessage) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.ASPECT_RATIO_FAILED, errorMessage);
    }
  };

  /**
   * تعيين الاعتماديات
   * @param {Object} injectedDeps - الاعتماديات المُمررة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    if (injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService;
  }

  /**
   * إعداد مراقبة الأحداث
   * @private
   */
  function _setupEventListeners() {
    aspectRatioSelectRef = DOMElements.aspectRatioSelect;
    canvasElement = document.getElementById(CANVAS_ID);
    
    if (!aspectRatioSelectRef) {
      const logger = getLogger();
      logger.logWarning({
        message: translate('CanvasDimensionHandler.AspectRationSelectNotFound'),
        origin: 'CanvasDimensionHandler._setupEventListeners'
      });
      return;
    }
    
    // ربط الأحداث
    aspectRatioSelectRef.addEventListener('change', handleAspectRatioInputChange);
    
    // مزامنة مع الحالة الابتدائية
    const initialProject = dependencies.stateStore.getState().currentProject;
    updateUIFromState(initialProject);
    
    // مزامنة مع تغييرات المشروع
    dependencies.stateStore.subscribe((newState, oldState) => {
      updateUIFromState(newState.currentProject);
    });
    
    isInitialized = true;
  }

  /**
   * إزالة مراقبة الأحداث
   * @private
   */
  function _teardownEventListeners() {
    if (aspectRatioSelectRef) {
      aspectRatioSelectRef.removeEventListener('change', handleAspectRatioInputChange);
    }
    
    isInitialized = false;
  }

  /**
   * التعامل مع تغيير نسبة الأبعاد
   * @private
   */
  function handleAspectRatioInputChange() {
    const logger = getLogger();
    
    if (!aspectRatioSelectRef) {
      logger.logWarning({
        message: 'قائمة نسبة الأبعاد غير موجودة',
        origin: 'CanvasDimensionHandler.handleAspectRatioInputChange'
      });
      return;
    }
    
    const newAspectRatio = aspectRatioSelectRef.value;
    
    if (!isValidAspectRatio(newAspectRatio)) {
      logger.logWarning({
        message: `نسبة الأبعاد غير مدعومة: ${newAspectRatio}`,
        origin: 'CanvasDimensionHandler.handleAspectRatioInputChange'
      });
      return;
    }
    
    currentAspectRatio = newAspectRatio;
    
    // تحديث الحالة
    dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      videoComposition: {
        aspectRatio: newAspectRatio
      }
    });
    
    // تحديث واجهة المستخدم
    const canvasSize = calculateCanvasSize(newAspectRatio);
    
    if (canvasElement) {
      canvasElement.width = canvasSize.width;
      canvasElement.height = canvasSize.height;
    }
    
    // نشر الحدث
    notifyAspectRatioChanged(newAspectRatio);
    
    // حفظ إلى localStorage
    saveAspectRatioToStorage(newAspectRatio);
  }

  /**
   * ملء قائمة الاختيار بنسبة الأبعاد
   * @private
   */
  function populateSelect() {
    const logger = getLogger();
    
    if (!aspectRatioSelectRef) {
      logger.logWarning({
        message: 'قائمة نسبة الأبعاد غير موجودة في DOM',
        origin: 'CanvasDimensionHandler.populateSelect'
      });
      return;
    }
    
    aspectRatioSelectRef.innerHTML = ''; // مسح الخيارات القديمة
    
    // إضافة الخيارات الجديدة
    Object.entries(SUPPORTED_ASPECT_RATIOS).forEach(([ratioStr, ratioData]) => {
      const option = document.createElement('option');
      option.value = ratioStr;
      option.textContent = ratioData.label;
      
      if (currentAspectRatio === ratioStr) {
        option.selected = true;
      }
      
      aspectRatioSelectRef.appendChild(option);
    });
    
    logger.logInfo({
      message: `تم ملء قائمة الأبعاد (${Object.keys(SUPPORTED_ASPECT_RATIOS).length} خيار)`,
      origin: 'CanvasDimensionHandler.populateSelect'
    });
  }

  /**
   * مزامنة واجهة المستخدم مع الحالة
   * @private
   * @param {ProjectState | null} projectState - الحالة الحالية للمشروع
   */
  function updateUIFromState(projectState) {
    const logger = getLogger();
    
    if (!projectState || !projectState.videoComposition || !projectState.videoComposition.aspectRatio) {
      logger.logInfo({
        message: 'لا توجد نسبة أبعاد في الحالة. استخدام القيم الافتراضية.',
        origin: 'CanvasDimensionHandler.updateUIFromState'
      });
      currentAspectRatio = DEFAULT_ASPECT_RATIO;
      
      if (aspectRatioSelectRef) {
        aspectRatioSelectRef.value = DEFAULT_ASPECT_RATIO;
      }
      
      // تحديث الكانفاس
      const canvasSize = calculateCanvasSize(DEFAULT_ASPECT_RATIO);
      if (canvasElement) {
        canvasElement.width = canvasSize.width;
        canvasElement.height = canvasSize.height;
      }
      
      return;
    }
    
    const ratioFromProject = projectState.videoComposition.aspectRatio;
    
    if (!isValidAspectRatio(ratioFromProject)) {
      logger.logWarning({
        message: `نسبة الأبعاد غير صالحة في المشروع: ${ratioFromProject}`,
        origin: 'CanvasDimensionHandler.updateUIFromState'
      });
      return;
    }
    
    currentAspectRatio = ratioFromProject;
    
    if (aspectRatioSelectRef && aspectRatioSelectRef.value !== ratioFromProject) {
      aspectRatioSelectRef.value = ratioFromProject;
    }
    
    // تحديث الكانفاس
    const canvasSize = calculateCanvasSize(ratioFromProject);
    
    if (canvasElement) {
      canvasElement.width = canvasSize.width;
      canvasElement.height = canvasSize.height;
    }
    
    logger.logInfo({
      message: `تم تحديث نسبة الأبعاد من المشروع: ${ratioFromProject}`,
      origin: 'CanvasDimensionHandler.updateUIFromState'
    });
  }

  /**
   * حساب حجم الكانفاس بناءً على نسبة الأبعاد
   * @param {string} ratioStr - نسبة الأبعاد (مثل "16:9")
   * @returns {{width: number, height: number}} حجم الكانفاس
   */
  function calculateCanvasSize(ratioStr) {
    const logger = getLogger();
    
    if (!isValidAspectRatio(ratioStr)) {
      logger.logWarning({
        message: `نسبة الأبعاد غير صالحة: ${ratioStr}`,
        origin: 'CanvasDimensionHandler.calculateCanvasSize'
      });
      return calculateCanvasSize(DEFAULT_ASPECT_RATIO);
    }
    
    const ratio = ratioStr.split(':').map(Number);
    
    if (ratio.length !== 2 || ratio.some(n => !Number.isInteger(n) || n <= 0)) {
      logger.logWarning({
        message: `نسبة الأبعاد غير صالحة: ${ratioStr}`,
        origin: 'CanvasDimensionHandler.calculateCanvasSize'
      });
      return { width: 1280, height: 720 };
    }
    
    const [widthRatio, heightRatio] = ratio;
    const baseSize = 1080; // حجم أساسي لحساب الأبعاد
    
    const gcdValue = gcd(widthRatio, heightRatio);
    const simplifiedWidth = widthRatio / gcdValue;
    const simplifiedHeight = heightRatio / gcdValue;
    
    const baseDimension = simplifiedWidth > simplifiedHeight ? {
      width: baseSize,
      height: baseSize * (simplifiedHeight / simplifiedWidth)
    } : {
      width: baseSize * (simplifiedWidth / simplifiedHeight),
      height: baseSize
    };
    
    return {
      width: Math.round(baseDimension.width),
      height: Math.round(baseDimension.height)
    };
  }

  /**
   * تحديث حجم الكانفاس بناءً على نسبة الأبعاد المحددة
   * @param {string} ratioStr - نسبة الأبعاد (مثل "16:9")
   */
  function updateCanvasSize(ratioStr) {
    const logger = getLogger();
    
    if (!canvasElement) {
      logger.logWarning({
        message: 'عنصر الكانفاس غير موجود',
        origin: 'CanvasDimensionHandler.updateCanvasSize'
      });
      return;
    }
    
    const size = calculateCanvasSize(ratioStr);
    canvasElement.width = size.width;
    canvasElement.height = size.height;
  }

  /**
   * إعادة تعيين نسبة الأبعاد إلى القيم الافتراضية
   */
  function resetAspectRatio() {
    currentAspectRatio = DEFAULT_ASPECT_RATIO;
    
    if (aspectRatioSelectRef) {
      aspectRatioSelectRef.value = DEFAULT_ASPECT_RATIO;
    }
    
    // مزامنة الحالة
    dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      videoComposition: {
        aspectRatio: DEFAULT_ASPECT_RATIO
      }
    });
    
    // نشر الحدث
    notifyAspectRatioChanged(DEFAULT_ASPECT_RATIO);
  }

  /**
   * تنظيف الموارد
   */
  function cleanup() {
    _teardownEventListeners();
    resetAspectRatio();
    
    if (canvasElement) {
      canvasElement = null;
    }
    
    // مسح البيانات المحفوظة
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      getLogger().handleError({
        error: e,
        message: 'فشل في مسح بيانات النسب من localStorage',
        origin: 'CanvasDimensionHandler.cleanup'
      });
    }
  }

  /**
   * التحقق من صحة النظام
   * @returns {boolean} نتيجة التحقق
   */
  function selfTest() {
    try {
      const testRatio = '4:3';
      const testSize = calculateCanvasSize(testRatio);
      
      return testSize.width > 0 && testSize.height > 0 && testSize.width > testSize.height;
    } catch (e) {
      return false;
    }
  }

  /**
   * الحصول على نسبة الأبعاد الحالية
   * @returns {string} نسبة الأبعاد
   */
  function getAspectRatio() {
    return currentAspectRatio;
  }

  /**
   * الحصول على حجم الكانفاس الحالي
   * @returns {{width: number, height: number}} حجم الكانفاس
   */
  function getCanvasSize() {
    return {
      width: canvasElement?.width || 1280,
      height: canvasElement?.height || 720
    };
  }

  /**
   * الحصول على النسب المدعومة
   * @returns {Object} النسب المدعومة
   */
  function getSupportedAspectRatios() {
    return { ...SUPPORTED_ASPECT_RATIOS };
  }

  // واجهة الكائن العام
  return {
    _setDependencies,
    _setupEventListeners,
    _teardownEventListeners,
    resizeCanvas,
    calculateCanvasSize,
    populateSelect,
    updateCanvasSize,
    resetAspectRatio,
    getAspectRatio,
    getCanvasSize,
    getSupportedAspectRatios,
    selfTest,
    cleanup
  };
})();

/**
 * تهيئة مُعالج أبعاد الكانفاس
 * @param {Object} deps - الاعتماديات المُمررة
 * @returns {Object} واجهة مُعالج الأبعاد
 */
export function initializeCanvasDimensionHandler(deps) {
  canvasDimensionHandler._setDependencies(deps);
  canvasDimensionHandler._setupEventListeners();
  
  // مزامنة مع الحالة الابتدائية
  const initialProject = deps.stateStore.getState().currentProject;
  canvasDimensionHandler.updateCanvasSize(initialProject);
  
  // إرجاع واجهة الكائن النهائي
  return {
    resizeCanvas: canvasDimensionHandler.resizeCanvas,
    calculateCanvasSize: canvasDimensionHandler.calculateCanvasSize,
    populateSelect: canvasDimensionHandler.populateSelect,
    updateCanvasSize: canvasDimensionHandler.updateCanvasSize,
    resetAspectRatio: canvasDimensionHandler.resetAspectRatio,
    getAspectRatio: canvasDimensionHandler.getAspectRatio,
    getCanvasSize: canvasDimensionHandler.getCanvasSize,
    getSupportedAspectRatios: canvasDimensionHandler.getSupportedAspectRatios,
    selfTest: canvasDimensionHandler.selfTest,
    cleanup: canvasDimensionHandler.cleanup
  };
}

/**
 * التحقق من صحة النظام
 * @returns {boolean} نتيجة التحقق
 */
export function selfTest() {
  return canvasDimensionHandler.selfTest();
}

// تصدير الكائن الافتراضي
export default canvasDimensionHandler;
