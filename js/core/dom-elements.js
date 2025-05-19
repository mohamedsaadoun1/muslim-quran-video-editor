// js/core/dom-elements.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

/**
 * @module dom-elements
 * @description كائن مركزي يحتوي على جميع عناصر الواجهة الرئيسية للمشروع، مُنظم حسب المكونات
 * 
 * الهيكل:
 * - app: عناصر تطبيق
 * - editor: عناصر محرر الفيديو
 * - panels: لوحات الإعدادات
 * - controls: عناصر التحكم
 * - previews: عناصر المعاينة
 * - export: إعدادات التصدير
 * - loading: عناصر التحميل
 * - utils: أدوات مساعدة
 */

const DOMElements = {
  /**
   * @type {Object} app - عناصر تطبيق
   * @property {HTMLElement} container - الحاوية الرئيسية
   * @property {HTMLElement} initialScreen - الشاشة الابتدائية
   * @property {HTMLElement} editorScreen - شاشة المحرر
   */
  app: {
    container: null,
    initialScreen: null,
    editorScreen: null
  },

  /**
   * @type {Object} editor - عناصر محرر الفيديو
   * @property {HTMLElement} mainArea - المنطقة الرئيسية
   * @property {HTMLElement} controlsArea - منطقة التحكم
   */
  editor: {
    mainArea: null,
    controlsArea: null
  },

  /**
   * @type {Object} panels - لوحات الإعدادات
   * @property {Object} quranSelection - لوحة اختيار القرآن
   * @property {Object} backgroundSettings - إعدادات الخلفية
   * @property {Object} textSettings - إعدادات النص
   * @property {Object} audioSettings - إعدادات الصوت
   * @property {Object} exportSettings - إعدادات التصدير
   */
  panels: {
    quranSelection: {},
    backgroundSettings: {},
    textSettings: {},
    audioSettings: {},
    exportSettings: {}
  },

  /**
   * @type {Object} controls - عناصر التحكم
   * @property {Object} playback - تحكم التشغيل
   * @property {Object} navigation - التنقل
   * @property {Object} theme - التحكم في الثيم
   */
  controls: {
    playback: {},
    navigation: {},
    theme: {}
  },

  /**
   * @type {Object} previews - عناصر المعاينة
   * @property {HTMLElement} canvas - كanvas المعاينة
   * @property {HTMLElement} overlay - طبقة المعاينة
   */
  previews: {
    canvas: null,
    overlay: {}
  },

  /**
   * @type {Object} export - إعدادات التصدير
   * @property {Object} resolution - الدقة
   * @property {Object} format - التنسيق
   * @property {Object} progress - تقدم التصدير
   */
  export: {
    resolution: {},
    format: {},
    progress: {}
  },

  /**
   * @type {Object} loading - عناصر التحميل
   * @property {HTMLElement} spinner - مؤشر التحميل
   */
  loading: {
    spinner: null
  },

  /**
   * @type {Object} utils - أدوات مساعدة
   * @property {Function} getElementById - دالة آمنة للحصول على عنصر
   * @property {Function} validateElement - دالة للتحقق من صحة العنصر
   */
  utils: {
    getElementById: null,
    validateElement: null
  }
};

/**
 * @typedef {Object} ElementConfig
 * @property {string} id - معرف العنصر
 * @property {string} name - اسم وصفي للعنصر
 * @property {boolean} [required=false] - هل العنصر ضروري
 * @property {string[]} [classes=[]] - الكلاسات المتوقعة
 * @property {string} [type='default'] - نوع العنصر (input, button, etc.)
 */

/**
 * دالة للحصول على عنصر DOM مع التحقق من صحته
 * @param {ElementConfig} config - تكوين العنصر
 * @param {Object} logger - مسجل الأخطاء
 * @returns {HTMLElement|null} العنصر أو null
 */
function getDOMElement(config, logger) {
  try {
    const element = document.getElementById(config.id);
    
    // التحقق من وجود العنصر
    if (!element) {
      if (config.required) {
        throw new Error(`العنصر المطلوب غير موجود: ${config.name} (${config.id})`);
      }
      
      logger.warn?.({
        message: `عنصر غير موجود: ${config.name} (${config.id})`,
        origin: 'dom-elements.getDOMElement',
        severity: 'warning'
      });
      
      return null;
    }
    
    // التحقق من الكلاسات
    if (config.classes?.length > 0) {
      const missingClasses = config.classes.filter(cls => !element.classList.contains(cls));
      if (missingClasses.length > 0) {
        logger.warn?.({
          message: `العنصر ${config.id} يفتقر إلى الكلاسات: ${missingClasses.join(', ')}`,
          origin: 'dom-elements.getDOMElement',
          severity: 'warning'
        });
      }
    }
    
    return element;
  } catch (error) {
    logger.error?.({
      error,
      message: `خطأ في الحصول على عنصر DOM: ${config.id}`,
      origin: 'dom-elements.getDOMElement',
      severity: 'error'
    });
    return null;
  }
}

/**
 * تهيئة عناصر DOM الأساسية
 * @param {Object} config - تكوين التهيئة
 * @param {Object} config.logger - مسجل الأخطاء
 * @param {boolean} [config.strictMode=true] - وضع التحقق الصارم
 * @returns {Object} كائن DOMElements
 */
export function initializeCoreDomElements({ logger, strictMode = true } = {}) {
  if (!logger) {
    throw new Error('يجب توفير مسجل أخطاء');
  }

  const logError = (message, error = null) => {
    logger.error?.({
      error,
      message,
      origin: 'dom-elements.initializeCoreDomElements',
      severity: 'critical'
    });
  };

  // عناصر التطبيق الأساسية
  const appElements = [
    { id: 'app-container', name: 'حاوية التطبيق', required: true },
    { id: 'initial-screen', name: 'شاشة البداية', required: true },
    { id: 'editor-screen', name: 'شاشة المحرر', required: true }
  ];

  // تحقق من وجود العناصر الأساسية
  const coreElements = {};
  for (const config of appElements) {
    const element = getDOMElement(config, logger);
    if (config.required && !element && strictMode) {
      const error = new Error(`العنصر المطلوب غير موجود: ${config.id}`);
      logError(`فشل التهيئة - العنصر غير موجود: ${config.id}`, error);
      throw error;
    }
    coreElements[config.id] = element;
  }

  // تعيين العناصر الأساسية
  DOMElements.app.container = coreElements['app-container'];
  DOMElements.app.initialScreen = coreElements['initial-screen'];
  DOMElements.app.editorScreen = coreElements['editor-screen'];

  // عناصر التحكم في الثيم
  DOMElements.controls.theme = {
    initial: getDOMElement({ id: 'theme-toggle-initial', name: 'تبديل الثيم (الشاشة الابتدائية)' }, logger),
    editor: getDOMElement({ id: 'theme-toggle-editor', name: 'تبديل الثيم (المحرر)' }, logger)
  };

  // عناصر الشاشة الابتدائية
  DOMElements.panels.initial = {
    projectsList: getDOMElement({ id: 'projects-list-container', name: 'حاوية المشاريع' }, logger),
    noProjectsMessage: getDOMElement({ id: 'no-projects-message', name: 'رسالة عدم وجود مشاريع' }, logger),
    goToEditorBtn: getDOMElement({ id: 'go-to-editor-btn', name: 'زر الذهاب إلى المحرر' }, logger),
    currentYearSpan: getDOMElement({ id: 'current-year', name: 'سنة النص' }, logger)
  };

  // عناصر التحكم في المحرر
  DOMElements.controls.navigation = {
    backToInitial: getDOMElement({ id: 'back-to-initial-screen-btn', name: 'زر العودة للشاشة الابتدائية' }, logger),
    projectTitle: getDOMElement({ id: 'current-project-title-editor', name: 'عنوان المشروع' }, logger),
    saveProjectBtn: getDOMElement({ id: 'save-project-btn-editor', name: 'زر حفظ المشروع' }, logger)
  };

  // عناصر منطقة المعاينة
  DOMElements.previews.mainArea = getDOMElement({ id: 'editor-main-area-new', name: 'منطقة المعاينة الرئيسية' }, logger);
  DOMElements.previews.canvas = getDOMElement({ id: 'video-preview-canvas', name: 'Canvas المعاينة' }, logger);
  
  // عناصر المعاينة
  DOMElements.previews.overlay = {
    container: getDOMElement({ id: 'video-preview-card-container', name: 'حاوية المعاينة' }, logger),
    backgroundBlur: getDOMElement({ id: 'video-preview-background-blur', name: 'تأثير التمويه' }, logger),
    content: getDOMElement({ id: 'preview-overlay-content', name: 'محتوى المعاينة' }, logger),
    surahTitle: getDOMElement({ id: 'preview-surah-title-overlay', name: 'عنوان السورة' }, logger),
    ayahText: getDOMElement({ id: 'preview-ayah-text-overlay', name: 'نص الآية' }, logger),
    translationText: getDOMElement({ id: 'preview-translation-text-overlay', name: 'الترجمة' }, logger)
  };

  // مشغل الصوت
  DOMElements.previews.audioPlayer = getDOMElement({ id: 'main-audio-player', name: 'مشغل الصوت الرئيسي' }, logger);

  // عناصر التحكم في التشغيل
  DOMElements.controls.playback = {
    timelineSection: getDOMElement({ id: 'playback-timeline-section', name: 'قسم الجدول الزمني' }, logger),
    timelineContainer: getDOMElement({ id: 'timeline-container', name: 'حاوية الجدول الزمني' }, logger),
    currentTime: getDOMElement({ id: 'current-time-display', name: 'وقت التشغيل الحالي' }, logger),
    timelineSlider: getDOMElement({ id: 'timeline-slider', name: 'محدد الجدول الزمني' }, logger),
    totalTime: getDOMElement({ id: 'total-time-display', name: 'إجمالي الوقت' }, logger),
    mainControls: getDOMElement({ id: 'main-playback-controls', name: 'التحكمات الأساسية' }, logger),
    undo: getDOMElement({ id: 'undo-btn', name: 'زر التراجع' }, logger),
    prevAyah: getDOMElement({ id: 'prev-ayah-btn', name: 'الآية السابقة' }, logger),
    playPause: getDOMElement({ id: 'play-pause-main-btn', name: 'تشغيل/إيقاف' }, logger),
    nextAyah: getDOMElement({ id: 'next-ayah-btn', name: 'الآية التالية' }, logger),
    redo: getDOMElement({ id: 'redo-btn', name: 'إعادة' }, logger),
    tabBar: getDOMElement({ id: 'main-bottom-tab-bar', name: 'شريط التبويب السفلي' }, logger)
  };

  // حاوية لوحات التحكم
  DOMElements.panels.container = getDOMElement({ id: 'active-control-panels-container', name: 'حاوية لوحات التحكم' }, logger);

  // لوحات الإعدادات
  DOMElements.panels.quranSelection = {
    surahSelect: getDOMElement({ id: 'surah-select', name: 'اختيار السورة' }, logger),
    ayahStart: getDOMElement({ id: 'ayah-start-select', name: 'الآية الابتدائية' }, logger),
    ayahEnd: getDOMElement({ id: 'ayah-end-select', name: 'الآية النهائية' }, logger),
    reciterSelect: getDOMElement({ id: 'reciter-select', name: 'اختيار القارئ' }, logger),
    voiceSearchBtn: getDOMElement({ id: 'voice-search-quran-btn', name: 'زر البحث الصوتي' }, logger),
    voiceSearchStatus: getDOMElement({ id: 'voice-search-status', name: 'حالة البحث الصوتي' }, logger),
    translationSelect: getDOMElement({ id: 'translation-select', name: 'اختيار الترجمة' }, logger)
  };

  DOMElements.panels.backgroundSettings = {
    importInput: getDOMElement({ id: 'import-background-input', name: 'استيراد الخلفية' }, logger),
    aiSuggestBtn: getDOMElement({ id: 'ai-suggest-bg-btn', name: 'اقتراح ذكاء اصطناعي للخلفية' }, logger),
    aiLoader: getDOMElement({ id: 'ai-bg-suggestions-loader', name: 'محمل اقتراحات الذكاء الاصطناعي' }, logger),
    aiContainer: getDOMElement({ id: 'ai-bg-suggestions-container', name: 'حاوية اقتراحات الذكاء الاصطناعي' }, logger),
    colorPicker: getDOMElement({ id: 'background-color-picker', name: 'منتقي لون الخلفية' }, logger)
  };

  DOMElements.panels.textSettings = {
    aspectRatio: getDOMElement({ id: 'aspect-ratio-select', name: 'نسبة العرض إلى الارتفاع' }, logger),
    videoFilter: getDOMElement({ id: 'video-filter-select', name: 'فلتر الفيديو' }, logger),
    fontFamily: getDOMElement({ id: 'font-family-select', name: 'عائلة الخط' }, logger),
    fontSizeSlider: getDOMElement({ id: 'font-size-slider', name: 'محدد حجم الخط' }, logger),
    fontSizeDisplay: getDOMElement({ id: 'font-size-value-display', name: 'عرض حجم الخط' }, logger),
    fontColor: getDOMElement({ id: 'font-color-picker', name: 'منتقي لون الخط' }, logger),
    textBgColor: getDOMElement({ id: 'ayah-text-bg-color-picker', name: 'لون خلفية النص' }, logger),
    textAnimation: getDOMElement({ id: 'text-animation-select', name: 'تحريك النص' }, logger)
  };

  DOMElements.panels.audioSettings = {
    statusText: getDOMElement({ id: 'audio-preview-status-text', name: 'حالة الصوت' }, logger),
    delayInput: getDOMElement({ id: 'delay-between-ayahs-input', name: 'تأخير بين الآيات' }, logger),
    addBgMusicBtn: getDOMElement({ id: 'add-bg-music-btn', name: 'إضافة موسيقى خلفية' }, logger)
  };

  DOMElements.panels.exportSettings = {
    resolution: getDOMElement({ id: 'export-resolution-select', name: 'دقة التصدير' }, logger),
    format: getDOMElement({ id: 'export-format-select', name: 'تنسيق التصدير' }, logger),
    fps: getDOMElement({ id: 'export-fps-select', name: 'سرعة الإطارات' }, logger),
    exportBtn: getDOMElement({ id: 'export-video-btn', name: 'زر التصدير' }, logger),
    processNote: getDOMElement({ id: 'export-process-note', name: 'ملاحظة التصدير' }, logger),
    progressBar: {
      container: getDOMElement({ id: 'export-progress-bar-container', name: 'حاوية شريط التقدم' }, logger),
      bar: getDOMElement({ id: 'export-progress-bar', name: 'شريط التقدم' }, logger),
      text: getDOMElement({ id: 'export-progress-text', name: 'نص شريط التقدم' }, logger)
    }
  };

  // مؤشر التحميل
  DOMElements.loading.spinner = getDOMElement({ id: 'global-loading-spinner', name: 'مؤشر التحميل العالمي' }, logger);

  // أدوات مساعدة
  DOMElements.utils = {
    getElementById: (id) => document.getElementById(id),
    validateElement: (element, id, logger) => {
      if (!element) {
        logger.warn?.({
          message: `عنصر غير موجود: ${id}`,
          origin: 'dom-elements.utils.validateElement',
          severity: 'warning'
        });
        return false;
      }
      return true;
    }
  };

  // التحقق من صحة التهيئة
  if (strictMode && (!DOMElements.app.container || !DOMElements.previews.canvas)) {
    const error = new Error('فشل التهيئة - عناصر أساسية مفقودة');
    logError('عناصر أساسية غير موجودة بعد التهيئة', error);
    throw error;
  }

  return DOMElements;
}

/**
 * تحقق من صحة العناصر المهيأة
 * @returns {boolean} نتيجة التحقق
 */
export function validateDOMElements() {
  try {
    // التحقق من وجود العناصر الأساسية
    if (!DOMElements.app.container || !DOMElements.previews.canvas) {
      return false;
    }
    
    // التحقق من وجود بعض العناصر المهمة
    const essentialElements = [
      DOMElements.controls.navigation.backToInitial,
      DOMElements.controls.playback.playPause,
      DOMElements.panels.quranSelection.surahSelect
    ];
    
    return essentialElements.every(element => element !== null);
  } catch (error) {
    console.warn('فشل التحقق من صحة العناصر:', error);
    return false;
  }
}

/**
 * إعادة تهيئة العناصر
 * @param {Object} config - تكوين التهيئة
 * @returns {Object} كائن DOMElements
 */
export function reinitializeDOMElements(config) {
  // مسح العناصر الحالية
  Object.keys(DOMElements).forEach(key => {
    if (typeof DOMElements[key] === 'object' && DOMElements[key] !== null) {
      Object.keys(DOMElements[key]).forEach(subKey => {
        DOMElements[key][subKey] = null;
      });
    } else {
      DOMElements[key] = null;
    }
  });
  
  // تهيئة جديدة
  return initializeCoreDomElements(config);
}

// تصدير الكائن الافتراضي
export default DOMElements;
