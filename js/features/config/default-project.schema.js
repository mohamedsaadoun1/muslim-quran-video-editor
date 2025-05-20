// js/features/config/default-project.schema.js

/**
 * @typedef {Object} QuranSelectionSchema
 * @property {number} surahId - رقم السورة (1-114)
 * @property {number} startAyah - بداية الآية
 * @property {number} endAyah - نهاية الآية
 * @property {string} reciterId - معرف القارئ
 * @property {string|null} translationId - معرف الترجمة (إن وجدت)
 * @property {number} delayBetweenAyahs - تأخير بين الآيات بالثواني
 * @property {Object} ayahTimings - أوقات الآيات { globalAyahNum: { start, end } }
 */

/**
 * @typedef {Object} BackgroundSchema
 * @property {'color'|'image'|'video'} type - نوع الخلفية
 * @property {string} source - مصدر الخلفية (لون، URL، أو مسار ملف)
 * @property {string|null} fileName - اسم ملف الخلفية المستورد
 * @property {Object} aiSuggestions - اقتراحات الذكاء الاصطناعي
 * @property {Array} aiSuggestions.photos - صور مقترحة
 * @property {Array} aiSuggestions.videos - فيديوهات مقترحة
 * @property {string|null} aiSuggestions.query - آخر استعلام
 * @property {boolean} aiSuggestions.isLoading - حالة التحميل
 * @property {string|null} aiSuggestions.error - رسالة الخطأ
 * @property {number|null} aiSuggestions.timestamp - وقت آخر تحديث
 */

/**
 * @typedef {Object} TextStyleSchema
 * @property {string} fontFamily - خط النص
 * @property {number} fontSize - حجم الخط بالبكسل
 * @property {string} fontColor - لون الخط
 * @property {string} textBgColor - لون خلفية النص
 * @property {'none'|'fade'|'typewriter'} textAnimation - نوع الحركة
 * @property {string} [translationFontFamily] - خط الترجمة (إن وجد)
 * @property {number} [translationFontSizeRatio] - نسبة حجم خط الترجمة
 */

/**
 * @typedef {Object} VideoCompositionSchema
 * @property {string} aspectRatio - نسبة العرض إلى الارتفاع (مثال: '9:16')
 * @property {'none'|'grayscale'|'sepia'|'invert'} videoFilter - مرشح الفيديو
 */

/**
 * @typedef {Object} ExportSettingsSchema
 * @property {string} resolution - الدقة (مثال: '1920x1080')
 * @property {'webm'|'mp4'|'gif'} format - صيغة التصدير
 * @property {number} fps - عدد الإطارات في الثانية
 * @property {number} [quality] - جودة التصدير (مثال: 1-100 للـ webm)
 */

/**
 * @typedef {Object} ProjectModelSchema
 * @property {string|null} id - معرف المشروع (يتم إنشاؤه عند التخزين)
 * @property {string} title - عنوان المشروع
 * @property {number} createdAt - وقت الإنشاء (ملي ثانية)
 * @property {number} updatedAt - وقت آخر تحديث (ملي ثانية)
 * @property {QuranSelectionSchema} quranSelection - خيارات القرآن
 * @property {BackgroundSchema} background - إعدادات الخلفية
 * @property {TextStyleSchema} textStyle - إعدادات نمط النص
 * @property {VideoCompositionSchema} videoComposition - إعدادات الفيديو
 * @property {ExportSettingsSchema} exportSettings - إعدادات التصدير
 * @property {boolean} [isDirty] - هل هناك تغييرات غير محفوظة
 * @property {Object} [audioSettings] - إعدادات الصوت (اختياري)
 * @property {Object} [transitions] - إعدادات الانتقالات (اختياري)
 */

/**
 * يحدد هيكل القيم الافتراضية لمشروع جديد
 * @type {ProjectModelSchema}
 */
export const DEFAULT_PROJECT_SCHEMA = {
  id: null, // سيتم إنشاؤه عند التخزين
  title: 'مشروع جديد', // العنوان الافتراضي (يمكن ترجمته حسب إعدادات التطبيق)
  createdAt: 0, // سيتم تعيينه إلى Date.now() عند الإنشاء
  updatedAt: 0, // سيتم تعيينه إلى Date.now() عند الإنشاء

  quranSelection: {
    surahId: 1,             // السورة الافتراضية: الفاتحة
    startAyah: 1,
    endAyah: 7,
    reciterId: 'ar.alafasy', // القارئ الافتراضي (تأكد من وجوده في قائمة القراء)
    translationId: null,     // لا توجد ترجمة افتراضية
    delayBetweenAyahs: 1.0,  // تأخير بين الآيات بالثواني
    ayahTimings: {},         // لتخزين أوقات الآيات { globalAyahNum: { start, end } }
  },

  background: {
    type: 'color',                  // 'color', 'image', 'video'
    source: '#0D0D0D',              // لون خلفية افتراضي (أسود داكن)
    fileName: null,                 // اسم ملف الخلفية المستورد
    aiSuggestions: {                // حالة اقتراحات الذكاء الاصطناعي
      photos: [],
      videos: [],
      query: null,
      isLoading: false,
      error: null,
      timestamp: null,
    },
  },

  textStyle: {
    fontFamily: "'Amiri Quran', serif", // خط القرآن الافتراضي
    fontSize: 48,                       // حجم الخط بالبكسل
    fontColor: '#FFFFFF',               // لون الخط الأبيض
    textBgColor: 'rgba(0,0,0,0.3)',   // خلفية نص شبه شفافة
    textAnimation: 'fade',              // الحركة الافتراضية: التلاشي
  },

  videoComposition: {
    aspectRatio: '9:16',        // افتراضي: عمودي للمحتوى الاجتماعي (مثل Shorts, Reels)
    videoFilter: 'none',        // لا يوجد مرشح افتراضي
  },

  exportSettings: {
    resolution: '1920x1080',    // دقة Full HD
    format: 'webm',             // صيغة WebM (جودة/حجم جيدة، مدعومة من CCapture)
    fps: 25,                    // معدل الإطارات الشائع
    quality: 75,                // الجودة الافتراضية للـ webm
  },

  // isDirty: false, // علامة اختيارية لتتبع التغييرات غير المحفوظة (يتم إدارتها منطقيًا)
};

/**
 * التحقق من صحة مشروع القرآن
 * @param {ProjectModelSchema} project - المشروع المراد التحقق منه
 * @returns {boolean} - true إذا كان المشروع صالحًا
 */
export function validateProjectSchema(project) {
  // التحقق من وجود المشروع
  if (!project) return false;
  
  // التحقق من السورة
  if (typeof project.quranSelection.surahId !== 'number' || 
      project.quranSelection.surahId < 1 || 
      project.quranSelection.surahId > 114) {
    return false;
  }
  
  // التحقق من الآيات
  if (typeof project.quranSelection.startAyah !== 'number' || 
      typeof project.quranSelection.endAyah !== 'number' ||
      project.quranSelection.startAyah < 1 || 
      project.quranSelection.endAyah < project.quranSelection.startAyah) {
    return false;
  }
  
  // التحقق من نوع الخلفية
  if (!['color', 'image', 'video'].includes(project.background.type)) {
    return false;
  }
  
  // التحقق من حجم الخط
  if (typeof project.textStyle.fontSize !== 'number' || 
      project.textStyle.fontSize < 12 || 
      project.textStyle.fontSize > 100) {
    return false;
  }
  
  // التحقق من نسبة العرض إلى الارتفاع
  if (!/^\d+:\d+$/.test(project.videoComposition.aspectRatio)) {
    return false;
  }
  
  // التحقق من صيغة التصدير
  if (!['webm', 'mp4', 'gif'].includes(project.exportSettings.format)) {
    return false;
  }
  
  // التحقق من الدقة
  if (!/^\d+x\d+$/.test(project.exportSettings.resolution)) {
    return false;
  }
  
  // التحقق من FPS
  if (typeof project.exportSettings.fps !== 'number' || 
      project.exportSettings.fps < 1 || 
      project.exportSettings.fps > 60) {
    return false;
  }
  
  // التحقق من الجودة
  if (typeof project.exportSettings.quality !== 'number' ||
      (project.exportSettings.format === 'webm' && 
       (project.exportSettings.quality < 1 || project.exportSettings.quality > 100)) ||
      (project.exportSettings.format === 'gif' && 
       (project.exportSettings.quality < 1 || project.exportSettings.quality > 30))) {
    return false;
  }
  
  // التحقق من مرشح الفيديو
  if (!['none', 'grayscale', 'sepia', 'invert'].includes(project.videoComposition.videoFilter)) {
    return false;
  }
  
  return true;
}

/**
 * إنشاء مشروع جديد بناءً على المخطط القياسي
 * @returns {ProjectModelSchema} - مشروع جديد
 */
export function createNewProject() {
  const newProject = JSON.parse(JSON.stringify(DEFAULT_PROJECT_SCHEMA));
  const now = Date.now();
  
  newProject.id = `project_${now}`;
  newProject.createdAt = now;
  newProject.updatedAt = now;
  
  return newProject;
}

/**
 * تهيئة مكون المخطط القياسي للمشروع
 * @param {Object} [dependencies] - التبعيات الاختيارية
 * @returns {Object} - الكائن النهائي للمخطط
 */
export function initializeDefaultProjectSchema(dependencies = {}) {
  const { errorLogger } = dependencies;
  
  try {
    console.info('[DefaultProjectSchema] تم تهيئته بنجاح');
    
    return {
      DEFAULT_PROJECT_SCHEMA: JSON.parse(JSON.stringify(DEFAULT_PROJECT_SCHEMA)),
      validateProjectSchema,
      createNewProject
    };
  } catch (error) {
    if (errorLogger) {
      errorLogger.logError(error, 'DefaultProjectSchema initialization failed');
    } else {
      console.error('[DefaultProjectSchema] فشل في التهيئة:', error);
    }
    
    // العودة إلى المخطط القياسي في حالة الفشل
    return {
      DEFAULT_PROJECT_SCHEMA: JSON.parse(JSON.stringify(DEFAULT_PROJECT_SCHEMA)),
      validateProjectSchema: () => true,
      createNewProject: () => JSON.parse(JSON.stringify(DEFAULT_PROJECT_SCHEMA))
    };
  }
}
