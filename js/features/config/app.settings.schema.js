// js/features/config/app.settings.schema.js

// استيراد القيم الافتراضية من ملف الإعدادات
import { DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';

/**
 * @typedef {Object} ExportDefaultSettingsSchema
 * @property {string} resolution - دقة الفيديو (مثال: '1920x1080')
 * @property {string} format - صيغة التصدير (مثال: 'webm', 'mp4', 'gif')
 * @property {number} fps - عدد الإطارات في الثانية (مثال: 25، 30)
 * @property {number} [quality] - جودة التصدير (مثال: 1-100 للـ webm، 1-30 للـ gif)
 */

/**
 * @typedef {Object} AppSettingsSchema
 * @property {string} appVersion - إصدار ملف الإعدادات (للمهاجرة المستقبلية)
 * @property {string} preferredLanguage - رمز اللغة (مثال: 'ar'، 'en')
 * @property {'light' | 'dark'} preferredTheme - السمة المفضلة للمستخدم
 * @property {ExportDefaultSettingsSchema} defaultExportSettings - الإعدادات الافتراضية لتصدير الفيديو
 * @property {string} defaultReciterId - معرف القارئ الافتراضي
 * @property {boolean} autoSaveEnabled - هل تم تفعيل الحفظ التلقائي
 * @property {number} autoSaveIntervalMinutes - فترة الحفظ التلقائي بالدقائق
 * @property {boolean} showTooltips - هل يتم عرض التلميحات
 * @property {boolean} loadLastOpenedProject - هل يتم تحميل المشروع الأخير عند البدء
 */

/**
 * الإعدادات الافتراضية للتطبيق
 * @type {AppSettingsSchema}
 */
export const defaultAppSettings = {
  appVersion: '1.0.0',
  preferredLanguage: 'ar',
  preferredTheme: 'light',
  defaultExportSettings: {
    resolution: DEFAULT_PROJECT_SCHEMA.exportSettings.resolution,
    format: DEFAULT_PROJECT_SCHEMA.exportSettings.format,
    fps: DEFAULT_PROJECT_SCHEMA.exportSettings.fps,
    quality: 75, // الجودة الافتراضية للـ webm
  },
  defaultReciterId: DEFAULT_PROJECT_SCHEMA.quranSelection.reciterId,
  autoSaveEnabled: false,
  autoSaveIntervalMinutes: 5,
  showTooltips: true,
  loadLastOpenedProject: false,
};

/**
 * تقارن بين إصدارين
 * @param {string} v1 - الإصدار الأول
 * @param {string} v2 - الإصدار الثاني
 * @returns {number} -1 إذا كان v1 أقدم، 0 إذا كانت متساوية، 1 إذا كان v2 أقدم
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  
  return 0;
}

/**
 * دمج الإعدادات المحفوظة مع الإعدادات الافتراضية
 * @param {Partial<AppSettingsSchema>} savedSettings - الإعدادات المحملة من localStorage
 * @returns {AppSettingsSchema} - الكائن النهائي للإعدادات بعد الدمج والتحقق
 */
export function hydrateAppSettings(savedSettings) {
  if (!savedSettings || typeof savedSettings !== 'object') {
    return { ...defaultAppSettings };
  }

  const hydrated = {
    ...defaultAppSettings,
    ...savedSettings,
    defaultExportSettings: {
      ...(defaultAppSettings.defaultExportSettings || {}),
      ...(savedSettings.defaultExportSettings || {}),
    },
  };

  // التحقق من صحة الإصدار وتحديث الإعدادات إن لزم الأمر
  if (savedSettings.appVersion && 
      compareVersions(savedSettings.appVersion, defaultAppSettings.appVersion) < 0) {
      
    console.log(`[AppSettings] مهاجرة الإعدادات من الإصدار ${savedSettings.appVersion} إلى ${defaultAppSettings.appVersion}`);
    
    // مثال على ترحيل الإعدادات
    if (!('loadLastOpenedProject' in hydrated)) {
        hydrated.loadLastOpenedProject = defaultAppSettings.loadLastOpenedProject;
    }
    
    // تحديث الإصدار بعد الترحيل
    hydrated.appVersion = defaultAppSettings.appVersion;
  }

  // التحقق من صحة اللغة
  if (hydrated.preferredLanguage !== 'ar' && hydrated.preferredLanguage !== 'en') {
    hydrated.preferredLanguage = defaultAppSettings.preferredLanguage;
  }

  // التحقق من صحة السمة
  if (hydrated.preferredTheme !== 'light' && hydrated.preferredTheme !== 'dark') {
    hydrated.preferredTheme = defaultAppSettings.preferredTheme;
  }

  // التحقق من صحة FPS
  if (typeof hydrated.defaultExportSettings.fps !== 'number' || 
      hydrated.defaultExportSettings.fps < 1 || 
      hydrated.defaultExportSettings.fps > 60) {
      
    hydrated.defaultExportSettings.fps = defaultAppSettings.defaultExportSettings.fps;
  }

  // التحقق من صحة الجودة
  if (typeof hydrated.defaultExportSettings.quality !== 'number' ||
      (hydrated.defaultExportSettings.format === 'webm' && 
       (hydrated.defaultExportSettings.quality < 1 || hydrated.defaultExportSettings.quality > 100)) ||
      (hydrated.defaultExportSettings.format === 'gif' && 
       (hydrated.defaultExportSettings.quality < 1 || hydrated.defaultExportSettings.quality > 30))) {
      
    hydrated.defaultExportSettings.quality = defaultAppSettings.defaultExportSettings.quality;
  }

  // التحقق من صحة معرف القارئ
  if (typeof hydrated.defaultReciterId !== 'string' || hydrated.defaultReciterId.trim() === '') {
    hydrated.defaultReciterId = defaultAppSettings.defaultReciterId;
  }

  // التحقق من صحة فترة الحفظ التلقائي
  if (typeof hydrated.autoSaveIntervalMinutes !== 'number' || 
      hydrated.autoSaveIntervalMinutes < 1 || 
      hydrated.autoSaveIntervalMinutes > 60) {
      
    hydrated.autoSaveIntervalMinutes = defaultAppSettings.autoSaveIntervalMinutes;
  }

  // التحقق من صحة باقي القيم المنطقية
  if (typeof hydrated.autoSaveEnabled !== 'boolean') {
    hydrated.autoSaveEnabled = defaultAppSettings.autoSaveEnabled;
  }

  if (typeof hydrated.showTooltips !== 'boolean') {
    hydrated.showTooltips = defaultAppSettings.showTooltips;
  }

  if (typeof hydrated.loadLastOpenedProject !== 'boolean') {
    hydrated.loadLastOpenedProject = defaultAppSettings.loadLastOpenedProject;
  }

  return hydrated;
}

/**
 * تهيئة مكون الإعدادات
 * @param {Object} [dependencies] - التبعيات الاختيارية
 * @returns {Object} - الكائن النهائي للإعدادات
 */
export function initializeAppSettingsSchema(dependencies = {}) {
  const { errorLogger } = dependencies;
  
  try {
    console.info('[AppSettingsSchema] تم تهيئته بنجاح');
    
    return {
      defaultAppSettings,
      hydrateAppSettings,
    };
  } catch (error) {
    if (errorLogger) {
      errorLogger.logError(error, 'AppSettingsSchema initialization failed');
    } else {
      console.error('[AppSettingsSchema] فشل في التهيئة:', error);
    }
    
    // العودة إلى الإعدادات الافتراضية في حالة الفشل
    return {
      defaultAppSettings,
      hydrateAppSettings: (savedSettings) => ({ ...defaultAppSettings }),
    };
  }
}
