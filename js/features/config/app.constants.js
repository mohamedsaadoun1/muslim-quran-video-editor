// js/config/app.constants.js
import { 
  APP_NAME,
  APP_VERSION,
  LS_KEYS,
  ACTIONS,
  EVENTS,
  DEFAULT_PROJECT_SCHEMA,
  ENVIRONMENT,
  APP_SETTINGS,
  PROJECT_STORAGE_VERSION
} from './app.constants.js';

/**
 * الإعدادات الافتراضية للتطبيق
 * @type {Object}
 */
export const DEFAULT_APP_SETTINGS = {
  theme: 'dark',
  language: 'ar',
  autoSave: true,
  showTutorial: true,
  useAIForBackground: true,
  enableVoiceCommands: true,
  recentProjectsLimit: 5,
  defaultExportFormat: 'mp4',
  defaultResolution: '1080p',
  lastOpenedProjectId: null,
  lastUsedSurah: 2,
  lastUsedReciter: 'ar.alafasy',
  lastUsedTranslation: 'en.sahih',
  fontSize: 48,
  fontFamily: "'Amiri Quran', serif",
  textAnimation: 'fade'
};

/**
 * مفاتيح التخزين المحلي
 * @type {Object<string, string>}
 */
export const LS_KEY = {
  SAVED_PROJECTS: `${APP_NAME}_savedProjects_v${PROJECT_STORAGE_VERSION}`,
  CURRENT_THEME: `${APP_NAME}_currentTheme_v${PROJECT_STORAGE_VERSION}`,
  APP_SETTINGS: `${APP_NAME}_appSettings_v${PROJECT_STORAGE_VERSION}`,
  LAST_OPENED_PROJECT_ID: `${APP_NAME}_lastOpenedProjectId_v${PROJECT_STORAGE_VERSION}`,
  USER_PREFERENCES: `${APP_NAME}_userPreferences_v${PROJECT_STORAGE_VERSION}`,
  RECENT_PROJECTS: `${APP_NAME}_recentProjects_v${PROJECT_STORAGE_VERSION}`,
  AI_BACKGROUND_SUGGESTIONS: `${APP_NAME}_aiBackgroundSuggestions_v${PROJECT_STORAGE_VERSION}`,
  USER_HISTORY: `${APP_NAME}_userHistory_v${PROJECT_STORAGE_VERSION}`
};

/**
 * إعدادات التطبيق الافتراضية
 * @type {Object}
 */
export const APP_SETTINGS_DEFAULTS = {
  enableAutoSave: true,
  enableNotifications: true,
  enableVoiceCommands: true,
  enableAIAssist: true,
  enableTutorial: true,
  maxRecentProjects: 5,
  defaultExportFormat: 'mp4',
  defaultResolution: '1080p',
  defaultAspectRatio: '16:9',
  defaultTextFont: "'Amiri Quran', serif",
  defaultFontSize: 48,
  defaultDelayBetweenAyahs: 1.0,
  enableSubtitles: true,
  enableBackgroundMusic: true,
  enableTextShadow: true,
  defaultTextShadowColor: '#000000',
  defaultTextShadowBlur: 2,
  defaultTextShadowOffsetX: 1,
  defaultTextShadowOffsetY: 1,
  defaultBackgroundType: 'solid',
  defaultBackgroundColor: '#000000',
  defaultTextBgColor: 'rgba(255, 255, 255, 0.7)',
  defaultVideoFilter: 'none'
};

/**
 * إعدادات التحقق من صحة البيانات
 * @type {Object}
 */
export const VALIDATION_SETTINGS = {
  MAX_PROJECT_TITLE_LENGTH: 100,
  MIN_FONT_SIZE: 12,
  MAX_FONT_SIZE: 150,
  MIN_LETTER_SPACING: 0,
  MAX_LETTER_SPACING: 10,
  MIN_LINE_HEIGHT: 0.5,
  MAX_LINE_HEIGHT: 2,
  MIN_VIDEO_FPS: 10,
  MAX_VIDEO_FPS: 60,
  MIN_SURAH_NUMBER: 1,
  MAX_SURAH_NUMBER: 114,
  MIN_AYAH_NUMBER: 1,
  MAX_AYAH_NUMBER: 286, // أطول آية في سورة البقرة
  MIN_DELAY_BETWEEN_AYAH: 0.5,
  MAX_DELAY_BETWEEN_AYAH: 5
};

/**
 * إعدادات التصميم
 * @type {Object}
 */
export const DESIGN_SETTINGS = {
  ENABLE_PROJECT_DUPLICATION: true,
  ENABLE_UNSAVED_CHANGES_MODAL: true,
  UPDATE_PAGE_TITLE: true,
  SCREEN_DISPLAY_MODE: 'flex',
  SCREEN_TRANSITION_DURATION: 300,
  SELECTED_AYAH_HIGHLIGHT_DURATION: 3000,
  DEFAULT_VIDEO_FILTER: 'none',
  DEFAULT_BACKGROUND_OPACITY: 0.7,
  DEFAULT_TEXT_SHADOW: {
    enable: true,
    color: '#000000',
    blur: 2,
    offsetX: 1,
    offsetY: 1
  },
  DEFAULT_FONT_WEIGHT: 'normal',
  DEFAULT_TEXT_DIRECTION: 'rtl',
  DEFAULT_BACKGROUND_MUSIC_VOLUME: 0.5
};

/**
 * إعدادات البيئة
 * @type {Object}
 */
export const ENVIRONMENT = {
  NAME: process.env.NODE_ENV || 'development',
  VERSION: APP_VERSION,
  DEBUG: process.env.DEBUG || false,
  USE_DEFAULT_API_KEYS: process.env.USE_DEFAULT_API_KEYS || false,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ENABLE_ANALYTICS: process.env.ENABLE_ANALYTICS || false,
  ENABLE_CRASH_REPORTING: process.env.ENABLE_CRASH_REPORTING || false,
  ENABLE_DEBUG_PANEL: process.env.ENABLE_DEBUG_PANEL || false,
  ENABLE_PROFILING: process.env.ENABLE_PROFILING || false
};

/**
 * إعدادات التخزين المحلي
 * @type {Object}
 */
export const LOCAL_STORAGE_SETTINGS = {
  MAX_STORAGE_SIZE: 10 * 1024 * 1024, // 10 MB
  MAX_PROJECTS: 50,
  MAX_RECENT_PROJECTS: 10,
  MAX_AI_SUGGESTIONS: 20,
  MAX_USER_HISTORY_ENTRIES: 50,
  ENABLE_STORAGE_COMPRESSION: true,
  STORAGE_ENCRYPTION: false,
  STORAGE_TTL: 365 * 24 * 60 * 60 * 1000, // 1 year in ms
  STORAGE_CLEANUP_INTERVAL: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
};

/**
 * إعدادات الإنتاج
 * @type {Object}
 */
export const PRODUCTION_SETTINGS = {
  ENABLE_CONSOLE_LOGS: false,
  ENABLE_DEBUG_TOOLS: false,
  MAX_ERROR_LOG_ENTRIES: 100,
  ERROR_LOG_RETENTION: 30 * 24 * 60 * 60 * 1000, // 30 days
  PERFORMANCE_MONITORING: true,
  ERROR_REPORTING: true,
  USAGE_ANALYTICS: true
};

/**
 * إعدادات التطوير
 * @type {Object}
 */
export const DEVELOPMENT_SETTINGS = {
  ENABLE_CONSOLE_LOGS: true,
  ENABLE_DEBUG_TOOLS: true,
  PERFORMANCE_MONITORING: false,
  ERROR_REPORTING: false,
  USAGE_ANALYTICS: false,
  ENABLE_DEBUG_PANEL: true,
  ENABLE_PROFILING: true
};

/**
 * إعدادات التحقق من صحة البيانات
 * @type {Object}
 */
export const VALIDATION_RULES = {
  MAX_TITLE_LENGTH: 100,
  MIN_FONT_SIZE: 12,
  MAX_FONT_SIZE: 150,
  MIN_LETTER_SPACING: 0,
  MAX_LETTER_SPACING: 10,
  MIN_LINE_HEIGHT: 0.5,
  MAX_LINE_HEIGHT: 2,
  MIN_VIDEO_FPS: 10,
  MAX_VIDEO_FPS: 60
};

/**
 * إعدادات التفاعل
 * @type {Object}
 */
export const INTERACTION_SETTINGS = {
  ENABLE_KEYBOARD_SHORTCUTS: true,
  ENABLE_VOICE_COMMANDS: true,
  ENABLE_GESTURE_CONTROL: false,
  ENABLE_TOUCH_CONTROLS: true,
  ENABLE_MOUSE_WHEEL_ZOOM: true,
  ENABLE_DRAG_DROP: true,
  ENABLE_AUTO_SCROLL: true,
  ENABLE_ANIMATIONS: true,
  ANIMATION_SPEED: 0.3,
  ENABLE_TUTORIAL: true,
  TUTORIAL_STEPS: 7
};

/**
 * إعدادات التعددية
 * @type {Object}
 */
export const I18N_SETTINGS = {
  SUPPORTED_LANGUAGES: ['ar', 'en', 'ur', 'fr', 'es', 'tr'],
  DEFAULT_LANGUAGE: 'ar',
  FALLBACK_LANGUAGE: 'en',
  ENABLE_RTL: true,
  DATE_FORMAT: {
    ar: 'DD/MM/YYYY',
    en: 'MM/DD/YYYY',
    ur: 'DD/MM/YYYY',
    fr: 'DD/MM/YYYY',
    es: 'DD/MM/YYYY',
    tr: 'DD/MM/YYYY'
  },
  TIME_FORMAT: {
    ar: 'HH:mm:ss',
    en: 'HH:mm:ss',
    ur: 'HH:mm:ss',
    fr: 'HH:mm:ss',
    es: 'HH:mm:ss',
    tr: 'HH:mm:ss'
  }
};

/**
 * إعدادات الأداء
 * @type {Object}
 */
export const PERFORMANCE_SETTINGS = {
  MAX_RENDER_FPS: 60,
  MIN_RENDER_FPS: 25,
  ENABLE_GPU_RENDERING: true,
  MAX_CONCURRENT_RENDER_TASKS: 3,
  MAX_EXPORT_RETRIES: 3,
  EXPORT_TIMEOUT: 10 * 60 * 1000, // 10 minutes
  MAX_EXPORT_RESOLUTION: '4K',
  DEFAULT_EXPORT_RESOLUTION: '1080p',
  DEFAULT_EXPORT_FORMAT: 'mp4',
  DEFAULT_EXPORT_FPS: 30,
  DEFAULT_EXPORT_QUALITY: 'high'
};

/**
 * إعدادات الشبكة
 * @type {Object}
 */
export const NETWORK_SETTINGS = {
  API_BASE_URL: process.env.API_BASE_URL || 'https://api.example.com/v1 ',
  PEXELS_API_URL: 'https://api.pexels.com/v1 ',
  UNSPLASH_API_URL: 'https://api.unsplash.com ',
  YOUTUBE_API_URL: 'https://www.googleapis.com/youtube/v3 ',
  QURAN_API_URL: 'https://quran.api.example.com ',
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  REQUEST_TIMEOUT: 10000, // 10 seconds
  MAX_REQUEST_QUEUE_SIZE: 10,
  ENABLE_CACHE: true,
  CACHE_TTL: 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * إعدادات التخزين
 * @type {Object}
 */
export const STORAGE_SETTINGS = {
  MAX_PROJECTS: 50,
  MAX_PROJECT_SIZE: 50 * 1024 * 1024, // 50 MB per project
  MAX_EXPORT_PROJECT_SIZE: 100 * 1024 * 1024, // 100 MB for exported projects
  MAX_LOCAL_STORAGE: 5 * 1024 * 1024 * 1024, // 5 GB (theoretical limit)
  MAX_EXPORT_FILE_SIZE: 10 * 1024 * 1024 * 1024, // 10 GB for exported videos
  ENABLE_PROJECT_VERSIONING: true,
  MAX_VERSION_HISTORY: 10,
  ENABLE_CLOUD_SYNC: true,
  CLOUD_SYNC_INTERVAL: 5 * 60 * 1000, // Every 5 minutes
  CLOUD_SYNC_MAX_RETRIES: 3
};

/**
 * الإعدادات العامة للتطبيق
 * @type {Object}
 */
export const APP_CONSTANTS = {
  APP_NAME: 'Quran Video Editor',
  APP_VERSION: '1.0.0',
  LS_KEY: LS_KEYS,
  ACTIONS,
  EVENTS,
  DEFAULT_PROJECT_SCHEMA,
  ENVIRONMENT: ENVIRONMENT.NAME,
  ...DEFAULT_APP_SETTINGS,
  ...VALIDATION_SETTINGS,
  ...DESIGN_SETTINGS,
  ...PERFORMANCE_SETTINGS,
  ...STORAGE_SETTINGS,
  ...I18N_SETTINGS,
  ...NETWORK_SETTINGS
};

/**
 * وظائف التحقق من صحة البيانات
 */
export const validationRules = {
  /**
   * التحقق من صحة المعرف
   * @param {string} id - معرف المشروع
   * @returns {boolean} هل المعرف صالح؟
   */
  isValidId(id) {
    return typeof id === 'string' && id.startsWith('project_') && id.length > 10;
  },
  
  /**
   * التحقق من صحة العنوان
   * @param {string} title - عنوان المشروع
   * @returns {boolean} هل العنوان صالح؟
   */
  isValidTitle(title) {
    return typeof title === 'string' && 
           title.length > 0 && 
           title.length <= APP_CONSTANTS.MAX_PROJECT_TITLE_LENGTH;
  },
  
  /**
   * التحقق من صحة اختيار القرآن
   * @param {Object} quranSelection - اختيار القرآن
   * @returns {boolean} هل اختيار القرآن صحيح؟
   */
  isValidQuranSelection(quranSelection) {
    if (!quranSelection || typeof quranSelection !== 'object') return false;
    
    const { surahId, startAyah, endAyah } = quranSelection;
    
    return surahId >= APP_CONSTANTS.MIN_SURAH_NUMBER && 
           surahId <= APP_CONSTANTS.MAX_SURAH_NUMBER &&
           startAyah >= APP_CONSTANTS.MIN_AYAH_NUMBER &&
           endAyah >= startAyah;
  },
  
  /**
   * التحقق من صحة نمط النص
   * @param {Object} textStyle - نمط النص
   * @returns {boolean} هل نمط النص صحيح؟
   */
  isValidTextStyle(textStyle) {
    if (!textStyle || typeof textStyle !== 'object') return false;
    
    const { fontSize, letterSpacing } = textStyle;
    
    return fontSize >= APP_CONSTANTS.MIN_FONT_SIZE && 
           fontSize <= APP_CONSTANTS.MAX_FONT_SIZE &&
           letterSpacing >= APP_CONSTANTS.MIN_LETTER_SPACING && 
           letterSpacing <= APP_CONSTANTS.MAX_LETTER_SPACING;
  },
  
  /**
   * التحقق من صحة إعدادات الفيديو
   * @param {Object} videoSettings - إعدادات الفيديو
   * @returns {boolean} هل إعدادات الفيديو صحيحة؟
   */
  isValidVideoSettings(videoSettings) {
    if (!videoSettings || typeof videoSettings !== 'object') return false;
    
    const { fps } = videoSettings;
    
    return fps >= APP_CONSTANTS.MIN_VIDEO_FPS && 
           fps <= APP_CONSTANTS.MAX_VIDEO_FPS;
  },
  
  /**
   * التحقق من صحة إعدادات التصدير
   * @param {Object} exportSettings - إعدادات التصدير
   * @returns {boolean} هل إعدادات التصدير صحيحة؟
   */
  isValidExportSettings(exportSettings) {
    if (!exportSettings || typeof exportSettings !== 'object') return false;
    
    const { resolution, format, fps } = exportSettings;
    
    return typeof resolution === 'string' && 
           typeof format === 'string' && 
           fps >= APP_CONSTANTS.MIN_VIDEO_FPS && 
           fps <= APP_CONSTANTS.MAX_VIDEO_FPS;
  }
};

/**
 * وظائف الإعدادات
 */
export const appSettings = {
  /**
   * الحصول على إعدادات التطبيق
   * @returns {Object} - الإعدادات الافتراضية
   */
  getDefaultAppSettings() {
    return { ...DEFAULT_APP_SETTINGS };
  },
  
  /**
   * التحقق من صحة الإعدادات
   * @param {Object} settings - الإعدادات
   * @returns {boolean} هل الإعدادات صحيحة؟
   */
  validateAppSettings(settings) {
    if (!settings || typeof settings !== 'object') return false;
    
    const { theme, language, fontSize, fontFamily } = settings;
    
    return typeof theme === 'string' && 
           ['light', 'dark'].includes(theme) &&
           typeof language === 'string' && 
           APP_CONSTANTS.SUPPORTED_LANGUAGES.includes(language) &&
           fontSize >= APP_CONSTANTS.MIN_FONT_SIZE && 
           fontSize <= APP_CONSTANTS.MAX_FONT_SIZE &&
           typeof fontFamily === 'string';
  },
  
  /**
   * تحديث إعدادات التطبيق
   * @param {Object} currentSettings - الإعدادات الحالية
   * @param {Object} updates - التحديثات
   * @returns {Object} - الإعدادات المحدثة
   */
  updateAppSettings(currentSettings, updates) {
    if (!currentSettings || !updates) return { ...DEFAULT_APP_SETTINGS };
    
    return {
      ...currentSettings,
      ...updates,
      fontSize: Math.max(
        APP_CONSTANTS.MIN_FONT_SIZE, 
        Math.min(APP_CONSTANTS.MAX_FONT_SIZE, updates.fontSize || currentSettings.fontSize)
      ),
      letterSpacing: Math.max(
        APP_CONSTANTS.MIN_LETTER_SPACING, 
        Math.min(APP_CONSTANTS.MAX_LETTER_SPACING, updates.letterSpacing || currentSettings.letterSpacing)
      ),
      lineSpacing: Math.max(
        APP_CONSTANTS.MIN_LINE_HEIGHT, 
        Math.min(APP_CONSTANTS.MAX_LINE_HEIGHT, updates.lineSpacing || currentSettings.lineSpacing)
      )
    };
  },
  
  /**
   * تعيين إعدادات التطبيق
   * @param {Object} settings - الإعدادات
   */
  setAppSettings(settings) {
    if (!this.validateAppSettings(settings)) return false;
    
    try {
      localStorage.setItem(LS_KEYS.APP_SETTINGS, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('فشل في حفظ إعدادات التطبيق', error);
      return false;
    }
  },
  
  /**
   * استخراج إعدادات التطبيق
   * @returns {Object} - الإعدادات
   */
  getAppSettings() {
    try {
      const savedSettings = localStorage.getItem(LS_KEYS.APP_SETTINGS);
      return savedSettings ? JSON.parse(savedSettings) : { ...DEFAULT_APP_SETTINGS };
    } catch (error) {
      console.error('فشل في استرداد إعدادات التطبيق', error);
      return { ...DEFAULT_APP_SETTINGS };
    }
  }
};

/**
 * وظائف إعدادات التخزين
 */
export const storageSettings = {
  /**
   * التحقق من صحة المشروع قبل التخزين
   * @param {Object} project - المشروع
   * @returns {boolean} هل المشروع صالح؟
   */
  validateProject(project) {
    if (!project || typeof project !== 'object') return false;
    
    const { id, title, createdAt, updatedAt } = project;
    
    return typeof id === 'string' && 
           id.startsWith('project_') && 
           id.length > 10 &&
           typeof title === 'string' && 
           title.length > 0 &&
           typeof createdAt === 'number' && 
           typeof updatedAt === 'number';
  },
  
  /**
   * التحقق من صحة التخزين المحلي
   * @returns {boolean} هل التخزين محمل؟
   */
  isLocalStorageAvailable() {
    try {
      const testKey = '__storage_test';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  },
  
  /**
   * التحقق من تواريخ التخزين
   * @param {number} timestamp - وقت التخزين
   * @returns {boolean} هل الوقت صحيح؟
   */
  isValidTimestamp(timestamp) {
    return typeof timestamp === 'number' && 
           !isNaN(timestamp) && 
           timestamp > 0 && 
           timestamp < Date.now() + 1000 * 60 * 60 * 24 * 365; // لا يزيد عن سنة
  },
  
  /**
   * التحقق من صحة تكوين التخزين
   * @param {Object} settings - إعدادات التخزين
   * @returns {boolean} هل الإعدادات صحيحة؟
   */
  validateStorageConfig(settings) {
    if (!settings || typeof settings !== 'object') return false;
    
    const { MAX_PROJECTS, MAX_PROJECT_SIZE, MAX_EXPORT_PROJECT_SIZE } = settings;
    
    return typeof MAX_PROJECTS === 'number' && 
           typeof MAX_PROJECT_SIZE === 'number' && 
           typeof MAX_EXPORT_PROJECT_SIZE === 'number';
  }
};

/**
 * وظائف التنقل بين الشاشات
 */
export const screenNavigationUtils = {
  /**
   * التنقل إلى شاشة معينة مع مؤثر
   * @param {string} screenId - معرف الشاشة
   * @param {Object} [options] - خيارات التنقل
   * @returns {boolean} هل التنقل تم؟
   */
  navigateWithTransition(screenId, options = {}) {
    const { withTransition = true } = options;
    
    if (!withTransition) {
      return this.navigateTo(screenId);
    }
    
    try {
      const currentState = dependencies.stateStore.getState();
      const currentScreen = currentState.activeScreen;
      
      // إخفاء الشاشة الحالية بمؤثر
      const currentScreenEl = currentScreen === 'initial' ? 
                            dependencies.initialScreenElRef : 
                            dependencies.editorScreenElRef;
      
      if (currentScreenEl) {
        currentScreenEl.classList.add('screen-exit');
        
        setTimeout(() => {
          this.navigateTo(screenId);
          currentScreenEl.classList.remove('screen-exit');
        }, APP_CONSTANTS.SCREEN_TRANSITION_DURATION);
      } else {
        this.navigateTo(screenId);
      }
      
      return true;
    } catch (error) {
      console.error('فشل في مؤثر التنقل', error);
      return false;
    }
  },
  
  /**
   * التنقل إلى شاشة جديدة مع تأكيد
   * @param {string} screenId - معرف الشاشة
   * @param {Function} onConfirm - الوظيفة عند التأكيد
   * @param {Function} onCancel - الوظيفة عند الإلغاء
   * @returns {Promise<boolean>} هل التنقل تم؟
   */
  async navigateWithConfirm(screenId, onConfirm, onCancel) {
    const confirmed = await dependencies.modalFactoryAPI.showConfirm({
      title: dependencies.localizationService.translate('confirm.navigation.title') || 'تأكيد التنقل',
      message: dependencies.localizationService.translate('confirm.navigation.message', { screen: screenId }) || 
               `هل أنت متأكد من التنقل إلى شاشة ${screenId}?`,
      confirmText: dependencies.localizationService.translate('button.confirm') || 'تأكيد',
      cancelText: dependencies.localizationService.translate('button.cancel') || 'إلغاء',
      type: 'warning'
    });
    
    if (confirmed && onConfirm) {
      return onConfirm();
    } else if (!confirmed && onCancel) {
      return onCancel();
    }
    
    return false;
  },
  
  /**
   * التنقل إلى شاشة مع مشروع جديد
   * @returns {boolean} هل التنقل تم؟
   */
  navigateToEditorWithNewProject() {
    try {
      const newProject = dependencies.projectActionsAPI.createNewProject();
      dependencies.stateStore.dispatch(ACTIONS.LOAD_PROJECT, newProject);
      dependencies.eventAggregator.publish(EVENTS.PROJECT_LOADED, newProject);
      this.navigateTo('editor');
      
      return true;
    } catch (error) {
      console.error('فشل في التنقل مع مشروع جديد', error);
      return false;
    }
  }
};

/**
 * وظائف التفاعل مع المستخدم
 */
export const interactionSettings = {
  /**
   * التحقق من أن العنصر قابل للتعديل
   * @param {EventTarget} target - العنصر
   * @returns {boolean} هل العنصر قابل للتعديل؟
   */
  isInputFocused(target) {
    if (!target) return false;
    
    const tagName = target.tagName?.toUpperCase();
    return tagName === 'INPUT' || 
           tagName === 'TEXTAREA' || 
           target.isContentEditable;
  },
  
  /**
   * التحقق من أن العنصر هو زر
   * @param {EventTarget} target - العنصر
   * @returns {boolean} هل العنصر زر؟
   */
  isButton(target) {
    if (!target) return false;
    
    const tagName = target.tagName?.toUpperCase();
    return tagName === 'BUTTON' || 
           target.classList.contains('project-action-btn');
  },
  
  /**
   * التحقق من أن العنصر قابل للتفاعل
   * @param {EventTarget} target - العنصر
   * @returns {boolean} هل العنصر قابل للتفاعل؟
   */
  isInteractiveElement(target) {
    return this.isInputFocused(target) || this.isButton(target);
  },
  
  /**
   * التحقق من أن العنصر مخصص للبحث الصوتي
   * @param {EventTarget} target - العنصر
   * @returns {boolean} هل العنصر مخصص للبحث الصوتي؟
   */
  isVoiceSearchElement(target) {
    return target?.classList.contains('voice-search-btn') || 
           target?.id === 'voice-search-input';
  }
};
