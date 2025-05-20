// js/config/feature.flags.config.js

/**
 * @typedef {Object.<string, boolean | { enabled: boolean, [key: string]: any }>} FeatureFlagsObject
 * كل مفتاح هو اسم علم الميزة.
 * القيمة يمكن أن تكون قيمة بوليانية (true لتفعيل، false لتعطيل).
 * أو يمكن أن تكون كائنًا يحتوي على خاصية `enabled` وخصائص أخرى خاصة بالميزة.
 */

/**
 * إعدادات الأعلام الافتراضية.
 * هذه هي الإعدادات الأساسية. يمكن تجاوزها باستخدام localStorage للتطوير.
 *
 * @type {FeatureFlagsObject}
 */
const DEFAULT_FEATURE_FLAGS = {
  // --- الميزات الأساسية ---
  enableProjectSaving: true,        // حفظ/تحميل المشاريع إلى localStorage
  enableThemeToggle: true,          // تبديل السمات
  enablePexelsAISuggestions: true,  // اقتراحات Pexels الذكية (يتطلب مفتاح API)
  // --- ميزات محرك الصوت ---
  enableBackgroundAudio: false,     // إضافة مسار صوتي خلفي
  enableAudioExtraction: false,     // استخراج الصوت من خلفية الفيديو (FFmpeg)
  // --- ميزات التصدير ---
  enableFFmpegIntegration: false,   // تكامل FFmpeg وتصدير MP4
  allowWebMWithAudioExport: false,  // إضافة صوت إلى WebM باستخدام FFmpeg
  enableGifQualitySettings: true,   // إعدادات جودة GIF في واجهة التصدير
  // --- تحسينات الواجهة ---
  showAdvancedTextControls: false,  // تحكم متقدم في النصوص (محاذاة، ظلال، إلخ)
  enableExperimentalTextEffects: false, // تأثيرات نصية تجريبية
  enableProjectTemplates: false,    // استخدام قوالب مشاريع محددة مسبقًا
  // --- أعلام التطور ---
  logVerboseStateChanges: false,    // تسجيل تفاصيل تغييرات الحالة
  logVerboseEventPublish: false,    // تسجيل جميع نشرات الأحداث
  showDebugInfoOverlay: false,      // عرض معلومات التصحيح (FPS، الحالة، إلخ)
};

const FEATURE_FLAG_LOCAL_STORAGE_KEY = 'MQVE_FeatureFlagOverrides';

/**
 * الحصول على الأعلام النشطة.
 * يتم دمج الأعلام الافتراضية مع أي تجاوزات موجودة في localStorage.
 * @returns {FeatureFlagsObject} الأعلام النشطة.
 */
function getActiveFeatureFlags() {
  let activeFlags = { ...DEFAULT_FEATURE_FLAGS };
  try {
    if (typeof localStorage !== 'undefined') {
      const overridesString = localStorage.getItem(FEATURE_FLAG_LOCAL_STORAGE_KEY);
      if (overridesString) {
        const overrides = JSON.parse(overridesString);
        activeFlags = { ...activeFlags, ...overrides };
      }
    }
  } catch (error) {
    console.warn('[Feature Flags] خطأ في قراءة أو تحليل التجاوزات:', error);
  }
  return activeFlags;
}

const currentActiveFlags = getActiveFeatureFlags();

/**
 * واجهة برمجية لإدارة أعلام الميزات
 */
const featureFlags = {
  /**
   * التحقق من تفعيل ميزة معينة
   * @param {string} flagName - اسم العلم
   * @returns {boolean} true إذا كانت الميزة مفعلة
   */
  isEnabled(flagName) {
    const flag = currentActiveFlags[flagName];
    if (typeof flag === 'boolean') return flag;
    if (typeof flag === 'object' && flag !== null && typeof flag.enabled === 'boolean') {
      return flag.enabled;
    }
    return false;
  },

  /**
   * الحصول على إعدادات العلم
   * @param {string} flagName - اسم العلم
   * @returns {object | boolean | undefined} إعدادات العلم
   */
  getFlagConfig(flagName) {
    return currentActiveFlags[flagName];
  },

  /**
   * (للتطوير فقط) تعيين قيمة جديدة للعلم
   * @param {string} flagName - اسم العلم
   * @param {boolean | object} value - القيمة الجديدة
   */
  setOverride(flagName, value) {
    if (typeof localStorage === 'undefined') {
      console.warn('[Feature Flags] localStorage غير متوفر');
      return;
    }
    try {
      const overridesString = localStorage.getItem(FEATURE_FLAG_LOCAL_STORAGE_KEY);
      const currentOverrides = overridesString ? JSON.parse(overridesString) : {};
      currentOverrides[flagName] = value;
      localStorage.setItem(FEATURE_FLAG_LOCAL_STORAGE_KEY, JSON.stringify(currentOverrides));
      currentActiveFlags[flagName] = value;
      console.log(`[Feature Flags] تم تعيين التجاوز لـ "${flagName}".`);
    } catch (error) {
      console.error('[Feature Flags] خطأ في تعيين التجاوز:', error);
    }
  },

  /**
   * (للتطوير فقط) مسح تجاوز العلم
   * @param {string} flagName - اسم العلم
   */
  clearOverride(flagName) {
    if (typeof localStorage === 'undefined') return;
    try {
      const overridesString = localStorage.getItem(FEATURE_FLAG_LOCAL_STORAGE_KEY);
      if (overridesString) {
        const currentOverrides = JSON.parse(overridesString);
        delete currentOverrides[flagName];
        localStorage.setItem(FEATURE_FLAG_LOCAL_STORAGE_KEY, JSON.stringify(currentOverrides));
        delete currentActiveFlags[flagName];
        if (DEFAULT_FEATURE_FLAGS[flagName] !== undefined) {
          currentActiveFlags[flagName] = DEFAULT_FEATURE_FLAGS[flagName];
        }
        console.log(`[Feature Flags] تم مسح التجاوز لـ "${flagName}".`);
      }
    } catch (error) {
      console.error('[Feature Flags] خطأ في مسح التجاوز:', error);
    }
  },

  /**
   * (للتطوير فقط) مسح جميع التجاوزات
   */
  clearAllOverrides() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(FEATURE_FLAG_LOCAL_STORAGE_KEY);
      Object.assign(currentActiveFlags, DEFAULT_FEATURE_FLAGS);
      console.log('[Feature Flags] تم مسح جميع التجاوزات.');
    }
  },

  /**
   * الحصول على جميع الأعلام النشطة
   * @returns {FeatureFlagsObject}
   */
  getAllActiveFlags: () => ({...currentActiveFlags}),

  /**
   * الحصول على جميع الأعلام الافتراضية
   * @returns {FeatureFlagsObject}
   */
  getAllDefaultFlags: () => ({...DEFAULT_FEATURE_FLAGS}),
};

/**
 * تهيئة أعلام الميزات
 * @param {Object} [dependencies] - التبعيات الاختيارية
 */
export function initializeFeatureFlags(dependencies = {}) {
  const { errorLogger } = dependencies;

  try {
    console.info('[FeatureFlags] تم تهيئته بنجاح');

    // جعل الوظائف متاحة عالميًا لتسهيل التصحيح
    if (typeof window !== 'undefined' && 
        (typeof process === 'undefined' || process.env.NODE_ENV === 'development')) {
      window.featureFlags = {
        isEnabled: featureFlags.isEnabled,
        getFlagConfig: featureFlags.getFlagConfig,
        setOverride: featureFlags.setOverride,
        clearOverride: featureFlags.clearOverride,
        clearAllOverrides: featureFlags.clearAllOverrides,
        list: featureFlags.getAllActiveFlags,
        defaults: featureFlags.getAllDefaultFlags
      };
    }

    return {
      isEnabled: featureFlags.isEnabled,
      getFlagConfig: featureFlags.getFlagConfig
    };
  } catch (error) {
    if (errorLogger) {
      errorLogger.logError(error, 'فشل في تهيئة FeatureFlags');
    } else {
      console.error('[FeatureFlags] فشل في التهيئة:', error);
    }

    return {
      isEnabled: () => false,
      getFlagConfig: () => undefined
    };
  }
}

export default featureFlags;
