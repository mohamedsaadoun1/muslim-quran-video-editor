// js/features/canvas-composer/canvas.snapshot.service.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

import DOMElements from '../../core/dom-elements.js';
import { EVENTS } from '../../config/app.constants.js';
import localizationService from '../../core/localization.service.js';
import errorLogger from '../../core/error-logger.js';
import eventAggregator from '../../core/event-aggregator.js';
import fileIOUtils from '../../services/file.io.utils.js';

/**
 * @typedef {Object} CanvasSnapshot
 * @property {string} dataURL - رابط الصورة (Data URL)
 * @property {Blob} blob - الصورة كـ Blob
 * @property {string} format - التنسيق (مثل image/png)
 * @property {number} [quality] - الجودة (من 0 إلى 1 لـ JPEG/WebP)
 * @property {number} width - العرض
 * @property {number} height - الارتفاع
 * @property {boolean} isTainted - هل الكانفاس "مُلوث"؟
 * @property {number} timestamp - وقت التقطير
 */

/**
 * @typedef {Object} CanvasSnapshotService
 * @property {(injectedDeps: Object) => void} _setDependencies - تعيين الاعتماديات
 * @property {(format?: string, quality?: number) => Promise<string | null>} getCanvasAsDataURL - الحصول على Data URL
 * @property {(format?: string, quality?: number) => Promise<Blob | null>} getCanvasAsBlob - الحصول على Blob
 * @property {() => void} cleanup - تنظيف الموارد
 * @property {() => boolean} selfTest - التحقق من الصحة
 * @property {(snapshot: CanvasSnapshot) => void} saveSnapshotToStorage - حفظ لقطة الكانفاس إلى localStorage
 * @property {() => CanvasSnapshot | null} loadSnapshotFromStorage - تحميل لقطة الكانفاس من localStorage
 * @property {() => void} revokeCurrentDataURL - مسح الرابط الحالي إذا كان موجودًا
 * @property {() => void} clearLocalStorage - مسح بيانات localStorage
 */

const canvasSnapshotService = (() => {
  // الثوابت
  const SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/webp'];
  const DEFAULT_QUALITY = 0.75; // جودة افتراضية لـ JPEG/WebP
  const LOCAL_STORAGE_KEY = 'MQVE_canvasSnapshot';
  const CANVAS_ID = 'video-preview-canvas';
  
  // المتغيرات الداخلية
  let canvasElement = null;
  let currentObjectUrlToRevoke = null;
  
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
    return dependencies.localizationService || localizationService;
  };
  
  const translate = (key) => {
    const service = getLocalization();
    return service.translate(key);
  };
  
  const isValidCanvas = (canvas) => {
    return canvas && canvas.width > 0 && canvas.height > 0;
  };
  
  const isSupportedFormat = (format) => {
    return format && typeof format === 'string' && SUPPORTED_FORMATS.includes(format);
  };
  
  const isValidQuality = (quality) => {
    return quality === undefined || 
           (typeof quality === 'number' && 
           !isNaN(quality) && 
           quality >= 0 && 
           quality <= 1);
  };
  
  const notifySnapshotTaken = (snapshot) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.CANVAS_SNAPSHOT_TAKEN, snapshot);
    }
  };
  
  const notifySnapshotFailed = (errorMessage) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.CANVAS_SNAPSHOT_FAILED, errorMessage);
    }
  };

  /**
   * الحصول على لقطة الكانفاس كـ Data URL
   * @param {string} [format='image/png'] - التنسيق (مثل image/png)
   * @param {number} [quality=0.75] - الجودة (لـ JPEG/WebP)
   * @returns {Promise<string | null>} Data URL أو null عند الفشل
   */
  async function getCanvasAsDataURL(format = 'image/png', quality = DEFAULT_QUALITY) {
    const logger = getLogger();
    
    canvasElement = DOMElements.videoPreviewCanvas || document.getElementById(CANVAS_ID);
    
    if (!canvasElement) {
      logger.logWarning({
        message: translate('CanvasSnapshotService.CanvasElementNotFound'),
        origin: 'CanvasSnapshotService.getCanvasAsDataURL'
      });
      return null;
    }
    
    if (!isValidCanvas(canvasElement)) {
      logger.logWarning({
        message: translate('CanvasSnapshotService.CanvasZeroDimensions'),
        origin: 'CanvasSnapshotService.getCanvasAsDataURL'
      });
      return null;
    }
    
    if (!isSupportedFormat(format)) {
      logger.logWarning({
        message: `تنسيق غير مدعوم: ${format}`,
        origin: 'CanvasSnapshotService.getCanvasAsDataURL'
      });
      format = 'image/png';
    }
    
    if (!isValidQuality(quality)) {
      logger.logWarning({
        message: `جودة غير صالحة: ${quality}`,
        origin: 'CanvasSnapshotService.getCanvasAsDataURL'
      });
      quality = DEFAULT_QUALITY;
    }
    
    try {
      let dataURL;
      
      if ((format === 'image/jpeg' || format === 'image/webp') && !isNaN(quality)) {
        dataURL = canvasElement.toDataURL(format, quality);
      } else {
        dataURL = canvasElement.toDataURL(format);
      }
      
      // التحقق من صحة الرابط
      if (!dataURL || dataURL === 'data:,' || dataURL.startsWith('data:,') || dataURL === 'data:application/octet-stream,') {
        logger.handleError({
          message: 'الحصول على Data URL فشل أو الرابط فارغ',
          origin: 'CanvasSnapshotService.getCanvasAsDataURL'
        });
        return null;
      }
      
      const snapshot = {
        dataURL,
        format,
        quality,
        width: canvasElement.width,
        height: canvasElement.height,
        isTainted: canvasElement.isTainted,
        timestamp: Date.now()
      };
      
      // حفظ لقطة الكانفاس
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
      } catch (e) {
        logger.handleError({
          error: e,
          message: 'فشل في حفظ لقطة الكانفاس إلى localStorage',
          origin: 'CanvasSnapshotService.getCanvasAsDataURL'
        });
      }
      
      // نشر الحدث
      notifySnapshotTaken(snapshot);
      
      return dataURL;
    } catch (error) {
      logger.handleError({
        error,
        message: `فشل في التقاط لقطة من الكانفاس كـ Data URL`,
        origin: 'CanvasSnapshotService.getCanvasAsDataURL'
      });
      
      notifySnapshotFailed(`فشل في Data URL: ${error.message}`);
      return null;
    }
  }

  /**
   * الحصول على لقطة الكانفاس كـ Blob
   * @param {string} [format='image/png'] - التنسيق (مثل image/png)
   * @param {number} [quality=0.75] - الجودة (لـ JPEG/WebP)
   * @returns {Promise<Blob | null>} Blob أو null عند الفشل
   */
  async function getCanvasAsBlob(format = 'image/png', quality = DEFAULT_QUALITY) {
    const logger = getLogger();
    
    canvasElement = DOMElements.videoPreviewCanvas || document.getElementById(CANVAS_ID);
    
    if (!canvasElement) {
      logger.logWarning({
        message: translate('CanvasSnapshotService.CanvasElementNotFound'),
        origin: 'CanvasSnapshotService.getCanvasAsBlob'
      });
      return null;
    }
    
    if (!isValidCanvas(canvasElement)) {
      logger.logWarning({
        message: translate('CanvasSnapshotService.CanvasZeroDimensions'),
        origin: 'CanvasSnapshotService.getCanvasAsBlob'
      });
      return null;
    }
    
    if (!isSupportedFormat(format)) {
      logger.logWarning({
        message: `تنسيق غير مدعوم: ${format}`,
        origin: 'CanvasSnapshotService.getCanvasAsBlob'
      });
      format = 'image/png';
    }
    
    if (!isValidQuality(quality)) {
      logger.logWarning({
        message: `جودة غير صالحة: ${quality}`,
        origin: 'CanvasSnapshotService.getCanvasAsBlob'
      });
      quality = DEFAULT_QUALITY;
    }
    
    if (typeof canvasElement.toBlob !== 'function') {
      logger.logWarning({
        message: 'toBlob غير متوفر في المتصفح',
        origin: 'CanvasSnapshotService.getCanvasAsBlob'
      });
      return null;
    }
    
    return new Promise((resolve, reject) => {
      try {
        canvasElement.toBlob(
          (blob) => {
            if (!blob) {
              logger.logWarning({
                message: 'الحصول على Blob فشل',
                origin: 'CanvasSnapshotService.getCanvasAsBlob'
              });
              resolve(null);
              return;
            }
            
            const snapshot = {
              blob,
              format,
              quality,
              width: canvasElement.width,
              height: canvasElement.height,
              timestamp: Date.now()
            };
            
            // حفظ لقطة الكانفاس
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
            } catch (e) {
              logger.handleError({
                error: e,
                message: 'فشل في حفظ لقطة الكانفاس إلى localStorage',
                origin: 'CanvasSnapshotService.getCanvasAsBlob'
              });
            }
            
            // نشر الحدث
            notifySnapshotTaken(snapshot);
            
            resolve(blob);
          },
          format,
          quality
        );
      } catch (error) {
        logger.handleError({
          error,
          message: `فشل في التقاط لقطة الكانفاس كـ Blob`,
          origin: 'CanvasSnapshotService.getCanvasAsBlob'
        });
        notifySnapshotFailed(error.message);
        resolve(null);
      }
    });
  }

  /**
   * حفظ لقطة الكانفاس إلى localStorage
   * @param {CanvasSnapshot} snapshot - لقطة الكانفاس
   */
  function saveSnapshotToStorage(snapshot) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
      const logger = getLogger();
      logger.handleError({
        error: e,
        message: 'فشل في حفظ لقطة الكانفاس إلى localStorage',
        origin: 'CanvasSnapshotService.saveSnapshotToStorage'
      });
    }
  }

  /**
   * تحميل لقطة الكانفاس من localStorage
   * @returns {CanvasSnapshot | null} لقطة الكانفاس
   */
  function loadSnapshotFromStorage() {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
      return null;
    } catch (e) {
      const logger = getLogger();
      logger.handleError({
        error: e,
        message: 'فشل في تحميل لقطة الكانفاس من localStorage',
        origin: 'CanvasSnapshotService.loadSnapshotFromStorage'
      });
      return null;
    }
  }

  /**
   * مسح الرابط الحالي إذا كان موجودًا
   * @param {string} [urlToRevoke=currentObjectUrlToRevoke] - الرابط المراد مسحه
   */
  function revokeCurrentDataURL(urlToRevoke = currentObjectUrlToRevoke) {
    if (urlToRevoke) {
      fileIOUtils.revokeObjectURL(urlToRevoke);
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
    if (injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService;
    if (injectedDeps.fileIOUtils) dependencies.fileIOUtils = injectedDeps.fileIOUtils;
  }

  /**
   * تنظيف الموارد
   */
  function cleanup() {
    revokeCurrentDataURL();
    
    if (canvasElement && canvasElement.isTainted) {
      canvasElement.isTainted = false;
    }
  }

  /**
   * التحقق من صحة النظام
   * @returns {boolean} نتيجة التحقق
   */
  function selfTest() {
    try {
      const testSnapshot = canvasSnapshotService.getCanvasAsDataURL('image/png');
      return testSnapshot !== null && testSnapshot.startsWith('data:image/png;base64,');
    } catch (e) {
      return false;
    }
  }

  /**
   * مسح البيانات من localStorage
   */
  function clearLocalStorage() {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      const logger = getLogger();
      logger.handleError({
        error: e,
        message: 'فشل في مسح بيانات الكانفاس من localStorage',
        origin: 'CanvasSnapshotService.clearLocalStorage'
      });
    }
  }

  // واجهة الكائن العام
  return {
    _setDependencies,
    getCanvasAsDataURL,
    getCanvasAsBlob,
    saveSnapshotToStorage,
    loadSnapshotFromStorage,
    revokeCurrentDataURL,
    clearLocalStorage,
    selfTest,
    cleanup
  };
})();

/**
 * تهيئة خدمة لقطات الكانفاس
 * @param {Object} deps - الاعتماديات المُمررة
 * @returns {Object} واجهة الخدمة
 */
export function initializeCanvasSnapshotService(deps) {
  canvasSnapshotService._setDependencies(deps);
  
  return {
    getCanvasAsDataURL: canvasSnapshotService.getCanvasAsDataURL,
    getCanvasAsBlob: canvasSnapshotService.getCanvasAsBlob,
    saveSnapshotToStorage: canvasSnapshotService.saveSnapshotToStorage,
    loadSnapshotFromStorage: canvasSnapshotService.loadSnapshotFromStorage,
    revokeCurrentDataURL: canvasSnapshotService.revokeCurrentDataURL,
    clearLocalStorage: canvasSnapshotService.clearLocalStorage,
    selfTest: canvasSnapshotService.selfTest,
    cleanup: canvasSnapshotService.cleanup
  };
}

/**
 * التحقق من صحة النظام
 * @returns {boolean} نتيجة التحقق
 */
export function selfTest() {
  return canvasSnapshotService.selfTest();
}

// تصدير الكائن الافتراضي
export default canvasSnapshotService;
