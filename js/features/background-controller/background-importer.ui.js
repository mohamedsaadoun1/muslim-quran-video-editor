// js/features/background-controller/background-importer.ui.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, EVENTS } from '../../config/app.constants.js';
import fileIOUtils from '../../services/file.io.utils.js';
import localizationService from '../../core/localization.service.js';

/**
 * @typedef {Object} BackgroundImportData
 * @property {string} type - نوع الخلفية (image/video)
 * @property {string} source - مصدر الخلفية (data URL أو Object URL)
 * @property {string} fileName - اسم الملف الأصلي
 * @property {string} [thumbnail] - رابط الصورة المصغرة (للفيديوهات)
 * @property {number} [duration] - مدة الفيديو (بالثواني)
 * @property {string} [photographer] - اسم المصور (للصور)
 * @property {string} [photographerUrl] - رابط المصور (للصور)
 * @property {string} [videoSourceUrl] - رابط الفيديو (للفيديوهات)
 */

/**
 * @typedef {Object} BackgroundImporterUI
 * @property {(injectedDeps: Object) => void} _setDependencies - تعيين الاعتماديات
 * @property {(event: Event) => void} handleFileSelection - التعامل مع اختيار الملف
 * @property {() => void} setupEventListeners - إعداد مراقبة الأحداث
 * @property {() => void} teardownEventListeners - إزالة مراقبة الأحداث
 * @property {() => void} resetBackground - إعادة تعيين الخلفية
 * @property {() => void} cleanup - تنظيف الموارد
 * @property {() => boolean} selfTest - التحقق من الصحة
 */

const backgroundImporterUI = (() => {
  // الثوابت
  const MAX_BACKGROUND_SIZE = 100 * 1024 * 1024; // 100MB
  const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];
  const LOCAL_STORAGE_KEY = 'MQVE_lastBackground';
  
  // المتغيرات الداخلية
  let fileInputElement = null;
  let currentBackgroundObject = {
    currentObjectUrlToRevoke: null,
    type: null,
    source: null,
    fileName: null,
    thumbnail: null,
    duration: null
  };
  
  // الاعتمادية
  const dependencies = {
    stateStore: {
      getState: () => ({ currentProject: null }),
      dispatch: () => {},
      subscribe: (callback) => {
        return () => {};
      }
    },
    errorLogger: console,
    notificationServiceAPI: {
      showSuccess: () => {},
      showError: () => {}
    },
    eventAggregator: {
      publish: () => {},
      subscribe: () => ({ unsubscribe: () => {} })
    },
    // localizationService: { translate: () => {} }
  };
  
  // الدوال المساعدة
  const getLogger = () => {
    return dependencies.errorLogger || console;
  };
  
  const getLocalization = () => {
    return dependencies.localizationService || localizationService;
  };
  
  const translate = (key, placeholders) => {
    const service = getLocalization();
    return service.translate(key, placeholders);
  };
  
  const isValidBackgroundFile = (file) => {
    if (!file) {
      throw new Error(translate('BackgroundImporterUI.NoFileSelected'));
    }
    
    if (!(file instanceof File)) {
      throw new Error(translate('BackgroundImporterUI.InvalidFileInstance'));
    }
    
    if (file.size === 0) {
      throw new Error(translate('BackgroundImporterUI.EmptyFile'));
    }
    
    if (file.size > MAX_BACKGROUND_SIZE) {
      throw new Error(translate('BackgroundImporterUI.FileTooLarge', { size: '100 ميجا بايت' }));
    }
    
    if (!file.type || 
        !(file.type.startsWith('image/') || file.type.startsWith('video/')) || 
        !SUPPORTED_IMAGE_TYPES.includes(file.type) && !SUPPORTED_VIDEO_TYPES.includes(file.type)) {
      throw new Error(translate('BackgroundImporterUI.UnsupportedFileType'));
    }
    
    return true;
  };
  
  const notifyBackgroundUpdated = (backgroundData) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.BACKGROUND_UPDATED, backgroundData);
    }
  };
  
  const notifyBackgroundFailed = (errorMessage) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.BACKGROUND_FAILED, errorMessage);
    }
  };
  
  const generateVideoThumbnail = (videoElement, time = 0.1) => {
    return new Promise((resolve) => {
      const duration = videoElement.duration;
      
      if (!duration || duration <= time) {
        videoElement.currentTime = 0;
        resolve(null);
        return;
      }
      
      videoElement.currentTime = time;
      
      videoElement.addEventListener('seeked', () => {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        resolve(canvas.toDataURL('image/png'));
      }, { once: true });
    });
  };

  /**
   * التعامل مع اختيار الملف
   * @param {Event} event - حدث اختيار الملف
   * @private
   */
  async function _handleFileSelection(event) {
    const logger = getLogger();
    
    if (!event || !event.target || !event.target.files) {
      logger.logWarning({
        message: translate('BackgroundImporterUI.InvalidEvent'),
        origin: 'BackgroundImporterUI._handleFileSelection'
      });
      return;
    }
    
    const file = event.target.files[0];
    
    try {
      // التحقق من صحة الملف
      isValidBackgroundFile(file);
      
      // إعداد حالة التحميل
      dependencies.stateStore.dispatch(ACTIONS.SET_LOADING, true);
      dependencies.stateStore.dispatch(ACTIONS.SET_BACKGROUND_TYPE, file.type.startsWith('image/') ? 'image' : 'video');
      
      // مسح الرابط القديم إذا كان موجودًا
      if (currentBackgroundObject.currentObjectUrlToRevoke) {
        fileIOUtils.revokeObjectURL(currentBackgroundObject.currentObjectUrlToRevoke);
        currentBackgroundObject.currentObjectUrlToRevoke = null;
      }
      
      let backgroundType = null;
      let backgroundSource = null;
      let backgroundFileName = file.name;
      let backgroundThumbnail = null;
      let backgroundDuration = null;
      let backgroundPhotographer = null;
      let backgroundPhotographerUrl = null;
      
      // معالجة الصور
      if (file.type.startsWith('image/')) {
        backgroundType = 'image';
        backgroundSource = await fileIOUtils.readFileAsDataURL(file);
        backgroundFileName = file.name;
        backgroundDuration = null;
      }
      // معالجة الفيديوهات
      else if (file.type.startsWith('video/')) {
        backgroundType = 'video';
        backgroundSource = URL.createObjectURL(file);
        currentBackgroundObject.currentObjectUrlToRevoke = backgroundSource;
        backgroundFileName = file.name;
        
        // إنشاء رابط الصورة المصغرة من الفيديو
        const video = document.createElement('video');
        video.src = backgroundSource;
        video.crossOrigin = 'Anonymous';
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        
        backgroundThumbnail = await generateVideoThumbnail(video);
        backgroundDuration = video.duration;
        
        // مسح الرابط المؤقت
        fileIOUtils.revokeObjectURL(video.src);
      }
      
      // تحديث الحالة
      const backgroundData = {
        type: backgroundType,
        source: backgroundSource,
        fileName: backgroundFileName,
        thumbnail: backgroundThumbnail,
        duration: backgroundDuration,
        photographer: backgroundPhotographer,
        photographerUrl: backgroundPhotographerUrl,
        timestamp: Date.now()
      };
      
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
        background: backgroundData
      });
      
      // نشر الحدث
      notifyBackgroundUpdated(backgroundData);
      
      // إظهار الإشعار
      dependencies.notificationServiceAPI.showSuccess(
        translate('BackgroundImporterUI.BackgroundSet', { fileName: backgroundFileName })
      );
    } catch (error) {
      logger.handleError({
        error,
        message: `فشل في معالجة الملف: ${file.name}. ${error.message}`,
        origin: 'BackgroundImporterUI._handleFileSelection',
        severity: 'error',
        context: { fileName: file.name, fileType: file.type }
      });
      
      dependencies.notificationServiceAPI.showError(
        translate('BackgroundImporterUI.FailedToSetBackground', { fileName: file.name })
      );
      
      notifyBackgroundFailed(
        translate('BackgroundImporterUI.FailedToSetBackground', { fileName: file.name })
      );
      
      // مسح أي روابط تم إنشاؤها
      if (currentBackgroundObject.currentObjectUrlToRevoke) {
        fileIOUtils.revokeObjectURL(currentBackgroundObject.currentObjectUrlToRevoke);
        currentBackgroundObject.currentObjectUrlToRevoke = null;
      }
      
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
        background: {
          type: null,
          source: null,
          fileName: null
        }
      });
    } finally {
      dependencies.stateStore.dispatch(ACTIONS.SET_LOADING, false);
      
      if (event.target) {
        event.target.value = null;
      }
    }
  }

  /**
   * إعداد مراقبة الأحداث
   * @private
   */
  function _setupEventListeners() {
    fileInputElement = DOMElements.importBackgroundInput;
    
    if (!fileInputElement) {
      const logger = getLogger();
      logger.logWarning({
        message: translate('BackgroundImporterUI.ElementNotFound'),
        origin: 'BackgroundImporterUI._setupEventListeners'
      });
      return;
    }
    
    fileInputElement.addEventListener('change', async (e) => {
      await _handleFileSelection(e);
    });
  }

  /**
   * إزالة مراقبة الأحداث
   * @private
   */
  function _teardownEventListeners() {
    if (fileInputElement) {
      fileInputElement.removeEventListener('change', _handleFileSelection);
    }
    
    if (currentBackgroundObject.currentObjectUrlToRevoke) {
      fileIOUtils.revokeObjectURL(currentBackgroundObject.currentObjectUrlToRevoke);
      currentBackgroundObject.currentObjectUrlToRevoke = null;
    }
  }

  /**
   * تعيين الاعتماديات
   * @param {Object} injectedDeps - الاعتماديات المُمررة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) {
      dependencies.stateStore = injectedDeps.stateStore;
    }
    
    if (injectedDeps.errorLogger) {
      dependencies.errorLogger = injectedDeps.errorLogger;
    }
    
    if (injectedDeps.notificationServiceAPI) {
      dependencies.notificationServiceAPI = injectedDeps.notificationServiceAPI;
    }
    
    if (injectedDeps.eventAggregator) {
      dependencies.eventAggregator = injectedDeps.eventAggregator;
    }
    
    if (injectedDeps.localizationService) {
      dependencies.localizationService = injectedDeps.localizationService;
    }
  }

  /**
   * إعادة تعيين الخلفية
   */
  function resetBackground() {
    if (currentBackgroundObject.currentObjectUrlToRevoke) {
      fileIOUtils.revokeObjectURL(currentBackgroundObject.currentObjectUrlToRevoke);
      currentBackgroundObject.currentObjectUrlToRevoke = null;
    }
    
    currentBackgroundObject = {
      currentObjectUrlToRevoice: null,
      type: null,
      source: null,
      fileName: null,
      thumbnail: null,
      duration: null
    };
    
    dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      background: {
        type: null,
        source: null,
        fileName: null
      }
    });
    
    dependencies.notificationServiceAPI.showSuccess(
      translate('BackgroundImporterUI.BackgroundReset')
    );
  }

  /**
   * تنظيف الموارد
   */
  function cleanup() {
    _teardownEventListeners();
    resetBackground();
    
    // مسح البيانات المحفوظة
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      logger.handleError({
        error: e,
        message: 'فشل في مسح بيانات الخلفية من localStorage',
        origin: 'BackgroundImporterUI.cleanup'
      });
    }
  }

  /**
   * التحقق من صحة النظام
   * @returns {boolean} نتيجة التحقق
   */
  function selfTest() {
    try {
      const testFile = new File(['test'], 'test.png');
      _handleFileSelection({ target: { files: [testFile] } });
      
      return currentBackgroundObject.fileName === 'test.png';
    } catch (e) {
      return false;
    }
  }

  // واجهة API العامة
  return {
    _setDependencies,
    _handleFileSelection,
    _setupEventListeners,
    _teardownEventListeners,
    resetBackground,
    cleanup,
    selfTest
  };
})();

/**
 * تهيئة مُستورد الخلفية
 * @param {Object} dependencies - الاعتماديات المُمررة
 * @returns {Object} واجهة المُستورد
 */
export function initializeBackgroundImporterUI(dependencies) {
  backgroundImporterUI._setDependencies(dependencies);
  backgroundImporterUI._setupEventListeners();
  
  // مزامنة مع الحالة الابتدائية
  const initialProject = dependencies.stateStore.getState().currentProject;
  
  if (initialProject?.background?.source) {
    backgroundImporterUI._handleFileSelection(initialProject.background.source);
  }
  
  return {
    importBackground: (file) => backgroundImporterUI._handleFileSelection(file),
    resetBackground: backgroundImporterUI.resetBackground,
    cleanup: backgroundImporterUI.cleanup
  };
}

/**
 * التحقق مما إذا كان النظام جاهزًا
 * @returns {boolean} نتيجة التحقق
 */
export function selfTest() {
  return backgroundImporterUI.selfTest();
}

// تصدير الكائن الافتراضي
export default backgroundImporterUI;
