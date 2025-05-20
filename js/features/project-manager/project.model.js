// js/features/project-manager/project.model.js
import { 
  DEFAULT_PROJECT_SCHEMA,
  APP_CONSTANTS
} from '../../config/app.constants.js';
import notificationPresenter from '../../shared-ui-components/notification.presenter.js';

/**
 * @typedef {Object} QuranSelectionModel
 * @property {number} surahId - رقم السورة (1-114)
 * @property {number} startAyah - بداية الآية داخل السورة
 * @property {number} endAyah - نهاية الآية داخل السورة
 * @property {string} reciterId - معرف القارئ/audio الإصدار
 * @property {string | null} translationId - معرف الترجمة
 * @property {number} delayBetweenAyahs - تأخير الآيات بالثواني
 * @property {Object.<number, {start: number, end: number}>} [ayahTimings] - توقيتات الآيات (المفتاح: رقم الآية العالمي)
 */

/**
 * @typedef {Object} BackgroundModel
 * @property {'solid' | 'image' | 'video'} type - نوع الخلفية
 * @property {string} source - مصدر الخلفية (URL أو hex color)
 * @property {string | null} [fileName] - اسم ملف الخلفية (إذا تم التحميل من الجهاز)
 * @property {AISuggestionsState} [aiSuggestions] - اقتراحات الذكاء الاصطناعي للخلفية
 */

/**
 * @typedef {Object} AISuggestionsState
 * @property {Array} photos - صور مُقترحة
 * @property {Array} videos - مقاطع فيديو مُقترحة
 * @property {string | null} query - آخر استعلام للذكاء الاصطناعي
 * @property {boolean} isLoading - هل يجري التحميل؟
 * @property {Error | null} error - أي أخطاء حدثت
 * @property {number | null} timestamp - وقت آخر تحديث
 */

/**
 * @typedef {Object} TextStyleModel
 * @property {string} fontFamily - خط النص (مثلاً "'Amiri Quran', serif")
 * @property {number} fontSize - حجم الخط بالبكسل
 * @property {string} fontColor - لون الخط (Hex أو rgba)
 * @property {string} textBgColor - لون خلفية النص (Hex أو rgba)
 * @property {string} textAnimation - نوع تأثير النص (مثلاً 'none', 'fade', 'typewriter')
 * @property {string} fontWeight - وزن الخط (normal, bold...)
 * @property {'center' | 'left' | 'right' | 'start' | 'end'} textAlign - محاذاة النص
 * @property {number} lineHeightMultiplier - مضاعف المسافة بين السطور
 * @property {number} letterSpacing - المسافة بين الحروف
 * @property {boolean} isDirectionRTL - اتجاه النص من اليمين لليسار
 * @property {TextShadowModel} textShadow - إعدادات ظل النص
 */

/**
 * @typedef {Object} TextShadowModel
 * @property {boolean} enableTextShadow - تمكين ظل النص
 * @property {string} textShadowColor - لون الظل
 * @property {number} textShadowBlur - درجة ضبابية الظل
 * @property {number} textShadowOffsetX - إزاحة الظل أفقيًا
 * @property {number} textShadowOffsetY - إزاحة الظل عموديًا
 */

/**
 * @typedef {Object} VideoCompositionModel
 * @property {string} aspectRatio - نسبة العرض إلى الارتفاع (مثلاً '16:9')
 * @property {string} videoFilter - مرشح الفيديو (مثلاً 'sepia', 'grayscale')
 * @property {number} videoVolume - مستوى الصوت في الفيديو
 * @property {boolean} enableSubtitles - تمكين الترجمة
 * @property {boolean} enableAutoPlay - تمكين التشغيل التلقائي
 * @property {boolean} enableLoop - تمكين التكرار
 * @property {boolean} enableBackgroundMusic - تمكين الموسيقى الخلفية
 * @property {string} backgroundMusicUrl - رابط الموسيقى الخلفية
 * @property {number} backgroundMusicVolume - مستوى صوت الموسيقى
 */

/**
 * @typedef {Object} ExportSettingsModel
 * @property {string} resolution - الدقة (مثلاً '1080p', '720p')
 * @property {string} format - الصيغة (مثلاً 'mp4', 'webm')
 * @property {number} fps - عدد الإطارات في الثانية
 * @property {string} quality - جودة الفيديو (مثلاً 'high', 'medium', 'low')
 * @property {boolean} includeSubtitles - تضمين الترجمة في التصدير
 * @property {boolean} includeAudio - تضمين الصوت في التصدير
 * @property {boolean} includeBackgroundMusic - تضمين الموسيقى الخلفية
 * @property {boolean} includeTextAnimation - تضمين تأثيرات النص
 */

/**
 * @typedef {Object} ProjectModelSchema
 * @property {string} id - معرف فريد للمشروع
 * @property {string} title - عنوان المشروع المُحدد من المستخدم
 * @property {number} createdAt - وقت الإنشاء (مللي ثانية)
 * @property {number} updatedAt - وقت آخر تحديث (مللي ثانية)
 * @property {QuranSelectionModel} quranSelection - اختيار القرآن
 * @property {BackgroundModel} background - إعدادات الخلفية
 * @property {TextStyleModel} textStyle - نمط النص
 * @property {VideoCompositionModel} videoComposition - إعدادات الفيديو
 * @property {ExportSettingsModel} exportSettings - إعدادات التصدير
 * // إضافة خصائص أخرى عند الحاجة
 */

// --- إعدادات افتراضية ---
/**
 * النموذج الافتراضي للمشروع
 * @type {ProjectModelSchema}
 */
export const defaultProjectSchema = {
  ...DEFAULT_PROJECT_SCHEMA,
  id: _generateId(),
  title: DEFAULT_PROJECT_SCHEMA.title || 'مشروع جديد',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  quranSelection: {
    surahId: null,
    startAyah: null,
    endAyah: null,
    reciterId: null,
    translationId: null,
    delayBetweenAyahs: Math.max(0.5, Math.min(5, DEFAULT_PROJECT_SCHEMA.quranSelection.delayBetweenAyahs || 1.0)),
    ayahTimings: {}
  },
  background: {
    type: 'solid',
    source: '#000000',
    fileName: null,
    aiSuggestions: {
      photos: [],
      videos: [],
      query: null,
      isLoading: false,
      error: null,
      timestamp: null
    }
  },
  textStyle: {
    fontFamily: "'Amiri Quran', serif",
    fontSize: Math.max(12, Math.min(72, DEFAULT_PROJECT_SCHEMA.textStyle.fontSize || 48)),
    fontColor: '#000000',
    textBgColor: 'rgba(255, 255, 255, 0.7)',
    textAnimation: 'fade',
    fontWeight: 'normal',
    textAlign: 'center',
    lineHeightMultiplier: Math.max(0.5, Math.min(2, DEFAULT_PROJECT_SCHEMA.textStyle.lineHeightMultiplier || 1.2)),
    letterSpacing: Math.max(0, Math.min(10, DEFAULT_PROJECT_SCHEMA.textStyle.letterSpacing || 0)),
    isDirectionRTL: true,
    textShadow: {
      enableTextShadow: true,
      textShadowColor: '#000000',
      textShadowBlur: Math.max(0, Math.min(10, DEFAULT_PROJECT_SCHEMA.textStyle.textShadowBlur || 2)),
      textShadowOffsetX: DEFAULT_PROJECT_SCHEMA.textStyle.textShadowOffsetX || 1,
      textShadowOffsetY: DEFAULT_PROJECT_SCHEMA.textStyle.textShadowOffsetY || 1
    }
  },
  videoComposition: {
    aspectRatio: '16:9',
    videoFilter: 'none',
    videoVolume: 1.0,
    enableSubtitles: true,
    enableAutoPlay: false,
    enableLoop: false,
    enableBackgroundMusic: true,
    backgroundMusicUrl: null,
    backgroundMusicVolume: 0.5
  },
  exportSettings: {
    resolution: '1080p',
    format: 'mp4',
    fps: 30,
    quality: 'high',
    includeSubtitles: true,
    includeAudio: true,
    includeBackgroundMusic: true,
    includeTextAnimation: true
  }
};

// --- وظائف النموذج ---
/**
 * إنشاء معرف فريد للمشروع
 * @private
 * @returns {string} - معرف المشروع
 */
function _generateId() {
  return `project_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * إنشاء كائن مشروع جديد
 * @param {Partial<ProjectModelSchema>} [initialOverrides={}] - تجاوزات القيم الافتراضية
 * @returns {ProjectModelSchema} - المشروع الجديد
 */
export function createNewProject(initialOverrides = {}) {
  const now = Date.now();
  
  // التحقق من صحة الإدخال
  if (!initialOverrides || typeof initialOverrides !== 'object') {
    initialOverrides = {};
  }
  
  try {
    // نسخة عميقة من الإعدادات الافتراضية
    const defaultProject = JSON.parse(JSON.stringify(DEFAULT_PROJECT_SCHEMA));
    
    // إنشاء كائن المشروع الأساسي
    const newProjectData = {
      id: initialOverrides.id || _generateId(),
      title: initialOverrides.title || defaultProject.title || 'مشروع جديد',
      createdAt: initialOverrides.createdAt || now,
      updatedAt: initialOverrides.updatedAt || now,
    };
    
    // دمج الإعدادات الافتراضية مع التجاوزات
    const nestedKeys = [
      'quranSelection', 
      'background', 
      'textStyle', 
      'videoComposition', 
      'exportSettings'
    ];
    
    nestedKeys.forEach(key => {
      newProjectData[key] = {
        ...(defaultProject[key] || {}),
        ...(initialOverrides[key] || {})
      };
    });
    
    // التأكد من أن aiSuggestions موجود
    if (initialOverrides.background?.aiSuggestions) {
      newProjectData.background.aiSuggestions = {
        ...defaultProject.background.aiSuggestions,
        ...initialOverrides.background.aiSuggestions
      };
    } else if (!newProjectData.background.aiSuggestions) {
      newProjectData.background.aiSuggestions = {
        photos: [],
        videos: [],
        query: null,
        isLoading: false,
        error: null,
        timestamp: null
      };
    }
    
    // التحقق من صحة الآيات
    if (newProjectData.quranSelection && newProjectData.quranSelection.surahId) {
      newProjectData.quranSelection.startAyah = newProjectData.quranSelection.startAyah || 1;
      newProjectData.quranSelection.endAyah = newProjectData.quranSelection.endAyah || 7;
    }
    
    // إضافة أي خصائص جديدة غير مغطاة
    for (const key in initialOverrides) {
      if (Object.prototype.hasOwnProperty.call(initialOverrides, key)) {
        if (!nestedKeys.includes(key) && !['id','title','createdAt','updatedAt'].includes(key)) {
          newProjectData[key] = initialOverrides[key];
        }
      }
    }
    
    return newProjectData;
  } catch (error) {
    console.error('فشل في إنشاء مشروع جديد', error);
    notificationPresenter.showNotification({
      message: 'فشل في إنشاء مشروع جديد',
      type: 'error'
    });
    
    // إرجاع المشروع الافتراضي في حالة الفشل
    return {
      ...defaultProjectSchema,
      id: _generateId(),
      title: 'مشروع جديد',
      createdAt: now,
      updatedAt: now
    };
  }
}

/**
 * التحقق من صحة بيانات المشروع
 * @param {ProjectModelSchema} projectData - بيانات المشروع
 * @returns {{isValid: boolean, errors: string[]}} - نتيجة التحقق
 */
export function validateProjectData(projectData) {
  const errors = [];
  
  // التحقق من صحة البيانات الأساسية
  if (!projectData || typeof projectData !== 'object') {
    errors.push('بيانات المشروع يجب أن تكون كائنًا');
    return { isValid: false, errors };
  }
  
  // التحقق من صحة المعرف
  if (typeof projectData.id !== 'string' || !projectData.id) {
    errors.push('معرف المشروع مطلوب ويجب أن يكون نصًا');
  }
  
  // التحقق من صحة العنوان
  if (typeof projectData.title !== 'string') {
    errors.push('عنوان المشروع يجب أن يكون نصًا');
  }
  
  // التحقق من صحة تواريخ الإنشاء والتحديث
  if (typeof projectData.createdAt !== 'number') {
    errors.push('وقت إنشاء المشروع مطلوب (Unix timestamp)');
  }
  
  if (typeof projectData.updatedAt !== 'number') {
    errors.push('وقت تحديث المشروع مطلوب (Unix timestamp)');
  }
  
  // التحقق من صحة الكائنات الفرعية
  const nestedObjects = ['quranSelection', 'background', 'textStyle', 'videoComposition', 'exportSettings'];
  
  nestedObjects.forEach(key => {
    if (typeof projectData[key] !== 'object' || projectData[key] === null) {
      errors.push(`${key} بيانات المشروع مطلوبة ويجب أن تكون كائنًا`);
    }
  });
  
  // التحقق من صحة الآيات
  if (projectData.quranSelection) {
    const { surahId, startAyah, endAyah } = projectData.quranSelection;
    
    if (surahId && (typeof surahId !== 'number' || surahId < 1 || surahId > 114)) {
      errors.push('رقم السورة غير صحيح');
    }
    
    if (startAyah && (typeof startAyah !== 'number' || startAyah < 1)) {
      errors.push('رقم الآية البداية غير صحيح');
    }
    
    if (endAyah && (typeof endAyah !== 'number' || endAyah < 1)) {
      errors.push('رقم الآية النهاية غير صحيح');
    }
  }
  
  // التحقق من صحة الخلفية
  if (projectData.background) {
    const { type, source } = projectData.background;
    
    if (type && !['solid', 'image', 'video'].includes(type)) {
      errors.push('نوع الخلفية غير صحيح');
    }
    
    if (source && typeof source !== 'string') {
      errors.push('مصدر الخلفية يجب أن يكون نصًا');
    }
  }
  
  // التحقق من صحة نمط النص
  if (projectData.textStyle) {
    const { fontFamily, fontSize, fontColor } = projectData.textStyle;
    
    if (fontFamily && typeof fontFamily !== 'string') {
      errors.push('خط النص يجب أن يكون نصًا');
    }
    
    if (fontSize && (typeof fontSize !== 'number' || fontSize < 12 || fontSize > 150)) {
      errors.push('حجم الخط غير صحيح');
    }
    
    if (fontColor && typeof fontColor !== 'string') {
      errors.push('لون الخط غير صحيح');
    }
  }
  
  // التحقق من صحة التصدير
  if (projectData.exportSettings) {
    const { resolution, format, fps } = projectData.exportSettings;
    
    if (resolution && typeof resolution !== 'string') {
      errors.push('دقة التصدير يجب أن تكون نصًا');
    }
    
    if (format && typeof format !== 'string') {
      errors.push('صيغة التصدير يجب أن تكون نصًا');
    }
    
    if (fps && (typeof fps !== 'number' || fps < 10 || fps > 60)) {
      errors.push('عدد الإطارات في الثانية يجب أن يكون بين 10 و 60');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * تنسيق المشروع بناءً على البيانات الجديدة
 * @param {ProjectModelSchema} currentProject - المشروع الحالي
 * @param {ProjectModelSchema} updates - التحديثات
 * @returns {ProjectModelSchema} - المشروع المنسق
 */
export function formatProject(currentProject, updates) {
  if (!currentProject || !updates) {
    return { ...defaultProjectSchema };
  }
  
  try {
    // دمج الإعدادات الافتراضية مع التحديثات
    const formattedProject = {
      ...currentProject,
      ...updates,
      quranSelection: {
        ...currentProject.quranSelection,
        ...updates.quranSelection
      },
      background: {
        ...currentProject.background,
        ...updates.background
      },
      textStyle: {
        ...currentProject.textStyle,
        ...updates.textStyle
      },
      videoComposition: {
        ...currentProject.videoComposition,
        ...updates.videoComposition
      },
      exportSettings: {
        ...currentProject.exportSettings,
        ...updates.exportSettings
      }
    };
    
    // التحقق من صحة الآيات
    if (formattedProject.quranSelection && formattedProject.quranSelection.surahId) {
      const surahInfo = formattedProject.quranSelection.surahId;
      
      if (surahInfo) {
        const maxAyahs = surahInfo.numberOfAyahs;
        
        if (formattedProject.quranSelection.startAyah > maxAyahs) {
          formattedProject.quranSelection.startAyah = maxAyahs;
        }
        
        if (formattedProject.quranSelection.endAyah > maxAyahs) {
          formattedProject.quranSelection.endAyah = maxAyahs;
        }
        
        if (formattedProject.quranSelection.startAyah > formattedProject.quranSelection.endAyah) {
          formattedProject.quranSelection.endAyah = formattedProject.quranSelection.startAyah;
        }
      }
    }
    
    // التحقق من صحة نمط النص
    if (formattedProject.textStyle) {
      const { fontSize, letterSpacing } = formattedProject.textStyle;
      
      if (fontSize) {
        formattedProject.textStyle.fontSize = Math.max(12, Math.min(150, fontSize));
      }
      
      if (letterSpacing) {
        formattedProject.textStyle.letterSpacing = Math.max(0, Math.min(10, letterSpacing));
      }
    }
    
    // التحقق من صحة التصدير
    if (formattedProject.exportSettings) {
      const { fps, resolution } = formattedProject.exportSettings;
      
      if (fps) {
        formattedProject.exportSettings.fps = Math.max(10, Math.min(60, fps));
      }
      
      if (resolution) {
        formattedProject.exportSettings.resolution = ['1080p', '720p', '480p'].includes(resolution) ? 
                                                    resolution : '1080p';
      }
    }
    
    return formattedProject;
  } catch (error) {
    console.error('فشل في تنسيق المشروع', error);
    notificationPresenter.showNotification({
      message: 'فشل في تنسيق المشروع',
      type: 'error'
    });
    
    return { ...defaultProjectSchema };
  }
}

/**
 * دمج مشروعين
 * @param {ProjectModelSchema} baseProject - المشروع الأساسي
 * @param {ProjectModelSchema} overrideProject - المشروع الذي يحتوي على التجاوزات
 * @returns {ProjectModelSchema} - المشروع بعد الدمج
 */
export function mergeProjects(baseProject, overrideProject) {
  if (!baseProject || !overrideProject) {
    return { ...defaultProjectSchema };
  }
  
  try {
    // دمج التجاوزات مع المشروع الأساسي
    return {
      ...baseProject,
      ...overrideProject,
      quranSelection: {
        ...baseProject.quranSelection,
        ...overrideProject.quranSelection
      },
      background: {
        ...baseProject.background,
        ...overrideProject.background
      },
      textStyle: {
        ...baseProject.textStyle,
        ...overrideProject.textStyle
      },
      videoComposition: {
        ...baseProject.videoComposition,
        ...overrideProject.videoComposition
      },
      exportSettings: {
        ...baseProject.exportSettings,
        ...overrideProject.exportSettings
      }
    };
  } catch (error) {
    console.error('فشل في دمج المشاريع', error);
    notificationPresenter.showNotification({
      message: 'فشل في دمج المشاريع',
      type: 'error'
    });
    
    return { ...defaultProjectSchema };
  }
}

/**
 * إنشاء نسخة من المشروع
 * @param {ProjectModelSchema} project - المشروع المراد نسخه
 * @returns {ProjectModelSchema} - النسخة
 */
export function cloneProject(project) {
  if (!project || typeof project !== 'object') {
    console.warn('بيانات المشروع غير صحيحة');
    return { ...defaultProjectSchema };
  }
  
  try {
    // إنشاء نسخة جديدة
    return {
      ...project,
      id: _generateId(),
      title: `${project.title || 'مشروع جديد'} (نسخ)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      quranSelection: { ...project.quranSelection },
      background: { ...project.background },
      textStyle: { ...project.textStyle },
      videoComposition: { ...project.videoComposition },
      exportSettings: { ...project.exportSettings }
    };
  } catch (error) {
    console.error('فشل في نسخ المشروع', error);
    notificationPresenter.showNotification({
      message: 'فشل في نسخ المشروع',
      type: 'error'
    });
    
    return { ...defaultProjectSchema };
  }
}

/**
 * إنشاء نسخة مبدئية من المشروع
 * @param {ProjectModelSchema} project - المشروع المراد تهيئة البيانات منه
 * @returns {ProjectModelSchema} - المشروع بعد التهيئة
 */
export function initializeProjectFrom(project) {
  if (!project || typeof project !== 'object') {
    return { ...defaultProjectSchema };
  }
  
  try {
    // إنشاء مشروع مبدئي
    return {
      ...defaultProjectSchema,
      ...project,
      id: project.id || _generateId(),
      title: project.title || 'مشروع جديد',
      createdAt: project.createdAt || Date.now(),
      updatedAt: project.updatedAt || Date.now(),
      quranSelection: {
        ...defaultProjectSchema.quranSelection,
        ...project.quranSelection
      },
      background: {
        ...defaultProjectSchema.background,
        ...project.background
      },
      textStyle: {
        ...defaultProjectSchema.textStyle,
        ...project.textStyle
      },
      videoComposition: {
        ...defaultProjectSchema.videoComposition,
        ...project.videoComposition
      },
      exportSettings: {
        ...defaultProjectSchema.exportSettings,
        ...project.exportSettings
      }
    };
  } catch (error) {
    console.error('فشل في تهيئة المشروع', error);
    notificationPresenter.showNotification({
      message: 'فشل في تهيئة المشروع',
      type: 'error'
    });
    
    return { ...defaultProjectSchema };
  }
}

/**
 * تحديث مشروع معين
 * @param {ProjectModelSchema} project - المشروع المراد تحديثه
 * @param {Partial<ProjectModelSchema>} updates - التحديثات
 * @returns {ProjectModelSchema} - المشروع بعد التحديث
 */
export function updateProject(project, updates) {
  if (!project || !updates) {
    return { ...defaultProjectSchema };
  }
  
  try {
    // تحديث المشروع باستخدام الدمج العميق
    const updatedProject = {
      ...project,
      ...updates
    };
    
    // تحديث الوقت
    updatedProject.updatedAt = Date.now();
    
    return updatedProject;
  } catch (error) {
    console.error('فشل في تحديث المشروع', error);
    notificationPresenter.showNotification({
      message: 'فشل في تحديث المشروع',
      type: 'error'
    });
    
    return { ...defaultProjectSchema };
  }
}

/**
 * إنشاء مشروع من نص آية
 * @param {string} verseText - نص الآية
 * @param {string} [title='مشروع جديد'] - عنوان المشروع
 * @returns {ProjectModelSchema} - المشروع من نص الآية
 */
export function createProjectFromVerseText(verseText, title = 'مشروع جديد') {
  if (!verseText || typeof verseText !== 'string') {
    console.warn('نص الآية غير صحيح');
    return { ...defaultProjectSchema };
  }
  
  try {
    // إنشاء مشروع من نص الآية
    const newProject = {
      ...defaultProjectSchema,
      id: _generateId(),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      quranSelection: {
        ...defaultProjectSchema.quranSelection,
        surahId: null,
        startAyah: null,
        endAyah: null,
        customText: verseText
      },
      background: {
        ...defaultProjectSchema.background,
        type: 'solid',
        source: '#000000'
      },
      exportSettings: {
        ...defaultProjectSchema.exportSettings,
        resolution: '1080p',
        format: 'mp4'
      }
    };
    
    return newProject;
  } catch (error) {
    console.error('فشل في إنشاء مشروع من نص الآية', error);
    notificationPresenter.showNotification({
      message: 'فشل في إنشاء مشروع من نص الآية',
      type: 'error'
    });
    
    return { ...defaultProjectSchema };
  }
}

/**
 * إنشاء مشروع من تحميل السورة
 * @param {number} surahId - معرف السورة
 * @param {number} startAyah - بداية الآية
 * @param {number} endAyah - نهاية الآية
 * @param {string} [title='مشروع جديد'] - عنوان المشروع
 * @returns {ProjectModelSchema} - المشروع من السورة
 */
export function createProjectFromSurah(surahId, startAyah, endAyah, title = 'مشروع جديد') {
  if (!surahId || !startAyah || !endAyah) {
    console.warn('بيانات السورة غير صحيحة');
    return { ...defaultProjectSchema };
  }
  
  try {
    // إنشاء مشروع من السورة
    const newProject = {
      ...defaultProjectSchema,
      id: _generateId(),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      quranSelection: {
        ...defaultProjectSchema.quranSelection,
        surahId,
        startAyah,
        endAyah
      },
      background: {
        ...defaultProjectSchema.background,
        type: 'solid',
        source: '#000000'
      },
      exportSettings: {
        ...defaultProjectSchema.exportSettings,
        resolution: '1080p',
        format: 'mp4'
      }
    };
    
    return newProject;
  } catch (error) {
    console.error('فشل في إنشاء مشروع من السورة', error);
    notificationPresenter.showNotification({
      message: 'فشل في إنشاء مشروع من السورة',
      type: 'error'
    });
    
    return { ...defaultProjectSchema };
  }
}

/**
 * إنشاء مشروع من تحميل الفيديو
 * @param {string} videoUrl - رابط الفيديو
 * @param {string} [title='مشروع جديد'] - عنوان المشروع
 * @returns {ProjectModelSchema} - المشروع من الفيديو
 */
export function createProjectFromVideo(videoUrl, title = 'مشروع جديد') {
  if (!videoUrl || typeof videoUrl !== 'string') {
    console.warn('رابط الفيديو غير صحيح');
    return { ...defaultProjectSchema };
  }
  
  try {
    // إنشاء مشروع من الفيديو
    const newProject = {
      ...defaultProjectSchema,
      id: _generateId(),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      background: {
        ...defaultProjectSchema.background,
        type: 'video',
        source: videoUrl
      },
      videoComposition: {
        ...defaultProjectSchema.videoComposition,
        enableBackgroundMusic: false
      },
      exportSettings: {
        ...defaultProjectSchema.exportSettings,
        includeBackgroundMusic: false
      }
    };
    
    return newProject;
  } catch (error) {
    console.error('فشل في إنشاء مشروع من الفيديو', error);
    notificationPresenter.showNotification({
      message: 'فشل في إنشاء مشروع من الفيديو',
      type: 'error'
    });
    
    return { ...defaultProjectSchema };
  }
}

/**
 * إنشاء مشروع من صورة خلفية
 * @param {string} imageUrl - رابط الصورة
 * @param {string} [title='مشروع جديد'] - عنوان المشروع
 * @returns {ProjectModelSchema} - المشروع من الصورة
 */
export function createProjectFromImage(imageUrl, title = 'مشروع جديد') {
  if (!imageUrl || typeof imageUrl !== 'string') {
    console.warn('رابط الصورة غير صحيح');
    return { ...defaultProjectSchema };
  }
  
  try {
    // إنشاء مشروع من الصورة
    const newProject = {
      ...defaultProjectSchema,
      id: _generateId(),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      background: {
        ...defaultProjectSchema.background,
        type: 'image',
        source: imageUrl
      },
      videoComposition: {
        ...defaultProjectSchema.videoComposition,
        enableSubtitles: false,
        enableBackgroundMusic: false
      },
      exportSettings: {
        ...defaultProjectSchema.exportSettings,
        includeSubtitles: false,
        includeBackgroundMusic: false
      }
    };
    
    return newProject;
  } catch (error) {
    console.error('فشل في إنشاء مشروع من الصورة', error);
    notificationPresenter.showNotification({
      message: 'فشل في إنشاء مشروع من الصورة',
      type: 'error'
    });
    
    return { ...defaultProjectSchema };
  }
}

/**
 * تعيين الاعتمادات
 * @param {Object} injectedDeps - الاعتمادات
 */
function _setDependencies(injectedDeps) {
  Object.keys(injectedDeps).forEach(key => {
    if (injectedDeps[key]) {
      dependencies[key] = injectedDeps[key];
    }
  });
}

// --- الواجهة العامة ---
const projectModel = {
  _setDependencies,
  createNewProject,
  validateProjectData,
  formatProject,
  mergeProjects,
  cloneProject,
  initializeProjectFrom,
  createProjectFromVerseText,
  createProjectFromSurah,
  createProjectFromVideo,
  createProjectFromImage
};

/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 * @returns {Object} - واجهة عامة للوحدة
 */
export function initializeProjectModel(deps) {
  projectModel._setDependencies(deps);
  
  return {
    createNewProject: projectModel.createNewProject,
    validateProjectData: projectModel.validateProjectData,
    formatProject: projectModel.formatProject,
    mergeProjects: projectModel.mergeProjects,
    cloneProject: projectModel.cloneProject,
    initializeProjectFrom: projectModel.initializeProjectFrom,
    createProjectFromVerseText: projectModel.createProjectFromVerseText,
    createProjectFromSurah: projectModel.createProjectFromSurah,
    createProjectFromVideo: projectModel.createProjectFromVideo,
    createProjectFromImage: projectModel.createProjectFromImage
  };
}

export default projectModel;
