// js/config/api-keys.config.js
import { 
  APP_CONSTANTS,
  ENVIRONMENT
} from './app.constants.js';
import errorLogger from '../../core/error-logger.js';
import notificationPresenter from '../../shared-ui-components/notification.presenter.js';

/**
 * التحقق من سلامة مفاتيح API
 * @param {Object} keys - المفاتيح المزودة
 * @returns {Object} - المفاتيح بعد التحقق من صحتها
 */
function validateApiKeys(keys) {
  const validatedKeys = {};
  
  // التحقق من مفتاح Pexels API
  if (keys.PEXELS_API_KEY && APP_CONSTANTS.VALIDATE_API_KEYS) {
    if (_isKeyValid(keys.PEXELS_API_KEY, 'pexels')) {
      validatedKeys.PEXELS_API_KEY = keys.PEXELS_API_KEY;
    } else {
      validatedKeys.PEXELS_API_KEY = null;
      errorLogger.warn({
        message: 'مفتاح Pexels API غير صحيح أو فارغ',
        origin: 'validateApiKeys'
      });
    }
  }
  
  // التحقق من مفاتيح أخرى في المستقبل
  // يمكن إضافة التحقق من مفاتيح أخرى هنا
  
  return validatedKeys;
}

/**
 * التحقق من صحة المفتاح
 * @private
 * @param {string} key - المفتاح
 * @param {string} service - اسم الخدمة
 * @returns {boolean} هل المفتاح صالح؟
 */
function _isKeyValid(key, service) {
  if (!key || typeof key !== 'string') return false;
  
  switch (service) {
    case 'pexels':
      // التحقق من طول مفتاح Pexels (عادةً 32 حرفًا)
      return key.length === 32;
    case 'unsplash':
      // التحقق من صحة مفتاح Unsplash (عادةً 32 حرفًا)
      return key.length === 32;
    case 'youtube':
      // التحقق من مفتاح YouTube (عادةً 39 حرفًا)
      return key.length === 39;
    default:
      return true; // افتراض صحة المفاتيح الأخرى
  }
}

/**
 * وظيفة الحصول على مفتاح الخدمة
 * @param {string} serviceName - اسم الخدمة
 * @returns {string | null} - المفتاح أو null
 */
function getServiceApiKey(serviceName) {
  switch (serviceName) {
    case 'pexels':
      return PEXELS_API_KEY;
    case 'unsplash':
      return UNSPLASH_API_KEY;
    case 'youtube':
      return YOUTUBE_API_KEY;
    default:
      errorLogger.warn({
        message: `الخدمة ${serviceName} غير مدعومة`,
        origin: 'getServiceApiKey'
      });
      return null;
  }
}

/**
 * التحقق من توفر مفتاح الخدمة
 * @param {string} serviceName - اسم الخدمة
 * @returns {boolean} هل المفتاح متوفر وصحيح؟
 */
function isServiceKeyAvailable(serviceName) {
  const key = getServiceApiKey(serviceName);
  return key && _isKeyValid(key, serviceName);
}

/**
 * تحذير المستخدمين من مخاطر أمان المفاتيح
 */
function _warnAboutSecurity() {
  if (ENVIRONMENT === 'production' || ENVIRONMENT === 'staging') {
    if (PEXELS_API_KEY === 'u4eXg16pNHbWDuD16SBiks0vKbV21xHDziyLCHkRyN9z08ruazKntJj7') {
      notificationPresenter.showNotification({
        message: 'مفتاح Pexels API الافتراضي قيد الاستخدام. يُنصح باستخدام مفتاح خاص.',
        type: 'warning'
      });
      
      errorLogger.warn({
        message: 'مفتاح Pexels API الافتراضي قيد الاستخدام.',
        origin: 'PexelsApiKey.warning.default'
      });
    }
    
    // التحقق من أن الملف غير موجود في Git
    if (process.env.NODE_ENV !== 'development') {
      if (process.env.USE_DEFAULT_API_KEYS) {
        notificationPresenter.showNotification({
          message: 'مفاتيح API الافتراضية قيد الاستخدام في بيئة غير التطوير.',
          type: 'error'
        });
      }
    }
  }
}

// --- التحذير من استخدام المفاتيح الافتراضية ---
_warnAboutSecurity();

// --- التحقق من توفر الخدمة ---
const isPexelsAvailable = isServiceKeyAvailable('pexels');
const isUnsplashAvailable = isServiceKeyAvailable('unsplash');
const isYouTubeAvailable = isServiceKeyAvailable('youtube');

// --- التكامل مع باقي النظام ---
/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 * @returns {Object} - واجهة عامة للوحدة
 */
export function initializeApiKeysConfig(deps) {
  // تعيين الاعتمادات
  const { errorLogger, notificationServiceAPI } = deps;
  
  // التحقق من توفر المفاتيح
  const serviceKeys = {
    pexels: isPexelsAvailable,
    unsplash: isUnsplashAvailable,
    youtube: isYouTubeAvailable
  };
  
  // إرجاع واجهة عامة
  return {
    getServiceApiKey,
    isServiceKeyAvailable: (serviceName) => {
      const key = getServiceApiKey(serviceName);
      return key && _isKeyValid(key, serviceName);
    },
    getAvailableServices: () => {
      return Object.entries(serviceKeys)
        .filter(([service, available]) => available)
        .map(([service]) => service);
    },
    validateApiKeys: (keys) => validateApiKeys(keys),
    validatePexelsApiKey: () => validateServiceKey('pexels'),
    validateUnsplashApiKey: () => validateServiceKey('unsplash'),
    validateYouTubeApiKey: () => validateServiceKey('youtube')
  };
}

// --- التكامل مع `project.actions.js` ---
/**
 * حفظ المشروع الحالي إلى التخزين المحلي
 * @returns {boolean} هل تمت العملية؟
 */
export function saveCurrentProject() {
  const currentState = dependencies.stateStore.getState();
  const currentProject = currentState.currentProject;
  
  if (!currentProject || !currentProject.id) {
    dependencies.errorLogger.warn({
      message: 'لا يوجد مشروع حالي ليتم حفظه',
      origin: 'ProjectActions.saveCurrentProject'
    });
    
    dependencies.notificationServiceAPI?.showError(
      dependencies.localizationService.translate('project.save.no.current') || 'لا يوجد مشروع حالي للحفظ'
    );
    
    return false;
  }
  
  try {
    // الحصول على عنوان المشروع من DOM
    let projectTitleFromDOM = DOMElements.getProjectTitleInput?.textContent?.trim() || 
                             currentProject.title || 
                             DEFAULT_PROJECT_SCHEMA.title;
    
    // تحديث بيانات المشروع
    const projectToSave = {
      ...currentProject,
      title: projectTitleFromDOM,
      updatedAt: Date.now()
    };
    
    // قراءة البيانات من التخزين
    let savedProjects = dependencies.localStorageAdapter.getItem(LS_KEY_SAVED_PROJECTS, []);
    
    // التحقق من وجود المشروع
    const existingProjectIndex = savedProjects.findIndex(p => p.id === projectToSave.id);
    
    // تحديث أو إضافة المشروع
    if (existingProjectIndex > -1) {
      savedProjects[existingProjectIndex] = projectToSave;
    } else {
      savedProjects.push(projectToSave);
    }
    
    // ترتيب المشاريع حسب التاريخ
    savedProjects.sort((a, b) => {
      return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
    });
    
    // حفظ البيانات
    const success = dependencies.localStorageAdapter.setItem(LS_KEY_SAVED_PROJECTS, savedProjects);
    
    if (success) {
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_SAVED_PROJECTS_LIST, savedProjects);
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
        title: projectTitleFromDOM,
        updatedAt: projectToSave.updatedAt
      });
      
      dependencies.notificationServiceAPI?.showSuccess(
        dependencies.localizationService.translate('project.saved.success', { title: projectTitleFromDOM }) || 
        `تم حفظ مشروع "${projectTitleFromDOM}" بنجاح!`
      );
      
      dependencies.eventAggregator.publish(EVENTS.PROJECT_SAVED, projectToSave);
      return true;
    } else {
      throw new Error('فشل في كتابة البيانات إلى التخزين المحلي.');
    }
  } catch (error) {
    dependencies.errorLogger.error({
      error,
      message: dependencies.localizationService.translate('error.project.save', { title: currentProject.title }) || 
               'فشل حفظ المشروع.',
      origin: 'ProjectActions.saveCurrentProject'
    });
    
    dependencies.notificationServiceAPI?.showError(
      dependencies.localizationService.translate('project.save.failed', { title: currentProject.title }) || 
      `فشل حفظ المشروع "${currentProject.title}". قد تكون مساحة التخزين ممتلئة.`
    );
    
    return false;
  }
}
