// js/features/project-manager/project.selectors.js
import { 
  DEFAULT_PROJECT_SCHEMA,
  APP_CONSTANTS
} from '../../config/app.constants.js';
import notificationPresenter from '../../shared-ui-components/notification.presenter.js';

/**
 * @typedef {import('../../core/state-store.js').AppState} AppState
 * @typedef {import('../../core/state-store.js').ProjectState} ProjectState
 * @typedef {Object} ProjectSelectors
 * @property {Function} getCurrentProject - استخراج المشروع الحالي
 * @property {Function} getCurrentProjectId - استخراج معرف المشروع
 * @property {Function} getCurrentProjectTitle - استخراج عنوان المشروع
 * @property {Function} hasActiveProject - التحقق من وجود مشروع نشط
 * @property {Function} isCurrentProjectDirty - التحقق من تعديل المشروع
 * @property {Function} getSavedProjects - استخراج قائمة المشاريع المحفوظة
 * @property {Function} getSavedProjectById - استخراج مشروع من القائمة المحفوظة عبر المعرف
 * @property {Function} getSavedProjectsCount - استخراج عدد المشاريع المحفوظة
 * @property {Function} hasSavedProjects - التحقق من وجود مشاريع محفوظة
 * @property {Function} getProjectQuranSelection - استخراج اختيار القرآن في المشروع
 * @property {Function} getProjectTextStyle - استخراج نمط النص في المشروع
 * @property {Function} getProjectBackground - استخراج إعدادات الخلفية
 * @property {Function} getProjectVideoComposition - استخراج إعدادات الفيديو
 * @property {Function} getProjectExportSettings - استخراج إعدادات التصدير
 * @property {Function} getProjectAyahTimings - استخراج توقيتات الآيات
 * @property {Function} getProjectCreationTime - استخراج وقت إنشاء المشروع
 * @property {Function} getProjectLastUpdateTime - استخراج وقت آخر تحديث
 * @property {Function} getProjectCustomText - استخراج نص المشروع المخصص
 * @property {Function} getProjectReciter - استخراج القارئ المحدد
 * @property {Function} getProjectTranslation - استخراج الترجمة المحددة
 * @property {Function} getProjectSurahId - استخراج معرف السورة
 * @property {Function} getProjectStartAyah - استخراج بداية الآية
 * @property {Function} getProjectEndAyah - استخراج نهاية الآية
 * @property {Function} getProjectVideoFilter - استخراج مرشح الفيديو
 * @property {Function} getProjectBackgroundMusic - استخراج إعدادات الموسيقى الخلفية
 * @property {Function} getProjectSubtitles - استخراج إعدادات الترجمة
 * @property {Function} getProjectExportResolution - استخراج دقة التصدير
 * @property {Function} getProjectExportFormat - استخراج صيغة التصدير
 * @property {Function} getProjectExportFPS - استخراج عدد الإطارات في الثانية
 * @property {Function} getProjectExportQuality - استخراج جودة التصدير
 */

// --- استخراج بيانات المشروع ---
/**
 * استخراج المشروع الحالي
 * @param {AppState} state - الحالة الحالية
 * @returns {ProjectState | null} - المشروع الحالي أو null
 */
export function getCurrentProject(state) {
  try {
    if (!state || typeof state !== 'object') {
      throw new Error('الحالة غير صحيحة');
    }
    
    return state.currentProject || null;
  } catch (error) {
    console.error('فشل في استرداد المشروع الحالي', error);
    notificationPresenter.showNotification({
      message: 'فشل في استرداد المشروع',
      type: 'error'
    });
    return null;
  }
}

/**
 * استخراج معرف المشروع
 * @param {AppState} state - الحالة الحالية
 * @returns {string | null} - معرف المشروع أو null
 */
export function getCurrentProjectId(state) {
  try {
    const project = getCurrentProject(state);
    return project?.id || null;
  } catch (error) {
    console.error('فشل في استرداد معرف المشروع', error);
    return null;
  }
}

/**
 * استخراج عنوان المشروع
 * @param {AppState} state - الحالة الحالية
 * @param {Object} [localizationService] - خدمة الترجمة
 * @returns {string} - عنوان المشروع أو الافتراضي
 */
export function getCurrentProjectTitle(state, localizationService) {
  try {
    const project = getCurrentProject(state);
    return project?.title || 
           localizationService.translate('project.default.title') || 
           DEFAULT_PROJECT_SCHEMA.title;
  } catch (error) {
    console.error('فشل في استرداد عنوان المشروع', error);
    return localizationService.translate('project.default.title') || 'مشروع جديد';
  }
}

/**
 * التحقق من وجود مشروع نشط
 * @param {AppState} state - الحالة الحالية
 * @returns {boolean} - هل هناك مشروع نشط؟
 */
export function hasActiveProject(state) {
  try {
    const project = getCurrentProject(state);
    return !!(project && project.id);
  } catch (error) {
    console.error('فشل في التحقق من وجود مشروع نشط', error);
    return false;
  }
}

/**
 * التحقق من وجود تعديلات غير محفوظة
 * @param {AppState} state - الحالة الحالية
 * @returns {boolean} - هل هناك تعديلات غير محفوظة؟
 */
export function isCurrentProjectDirty(state) {
  try {
    const project = getCurrentProject(state);
    const lastSaved = project?.lastSaved || 0;
    const lastUpdated = project?.updatedAt || 0;
    return lastUpdated > lastSaved;
  } catch (error) {
    console.error('فشل في التحقق من حالة المشروع', error);
    return false;
  }
}

// --- استخراج قائمة المشاريع ---
/**
 * استخراج قائمة المشاريع المحفوظة
 * @param {AppState} state - الحالة الحالية
 * @returns {Array<ProjectState>} - قائمة المشاريع أو مصفوفة فارغة
 */
export function getSavedProjects(state) {
  try {
    if (!state || typeof state !== 'object') {
      throw new Error('بيانات الحالة غير صحيحة');
    }
    
    return state.savedProjects || [];
  } catch (error) {
    console.error('فشل في استرداد المشاريع المحفوظة', error);
    return [];
  }
}

/**
 * استخراج مشروع من القائمة عبر المعرف
 * @param {AppState} state - الحالة الحالية
 * @param {string} projectId - معرف المشروع
 * @returns {ProjectState | undefined} - المشروع أو undefined
 */
export function getSavedProjectById(state, projectId) {
  try {
    if (!projectId) return undefined;
    
    const savedProjects = getSavedProjects(state);
    return savedProjects.find(p => p.id === projectId);
  } catch (error) {
    console.error('فشل في استرداد المشروع من القائمة', error);
    return undefined;
  }
}

/**
 * استخراج عدد المشاريع المحفوظة
 * @param {AppState} state - الحالة الحالية
 * @returns {number} - عدد المشاريع
 */
export function getSavedProjectsCount(state) {
  try {
    const savedProjects = getSavedProjects(state);
    return savedProjects.length;
  } catch (error) {
    console.error('فشل في استرداد عدد المشاريع', error);
    return 0;
  }
}

/**
 * التحقق من وجود مشاريع محفوظة
 * @param {AppState} state - الحالة الحالية
 * @returns {boolean} - هل توجد مشاريع؟
 */
export function hasSavedProjects(state) {
  try {
    const count = getSavedProjectsCount(state);
    return count > 0;
  } catch (error) {
    console.error('فشل في التحقق من وجود مشاريع', error);
    return false;
  }
}

// --- استخراج تفاصيل المشروع ---
/**
 * استخراج اختيار القرآن في المشروع
 * @param {AppState} state - الحالة الحالية
 * @returns {Object | null} - اختيار القرآن أو null
 */
export function getProjectQuranSelection(state) {
  try {
    const project = getCurrentProject(state);
    return project?.quranSelection || null;
  } catch (error) {
    console.error('فشل في استرداد اختيار القرآن', error);
    return null;
  }
}

/**
 * استخراج نمط النص في المشروع
 * @param {AppState} state - الحالة الحالية
 * @returns {Object | null} - نمط النص أو null
 */
export function getProjectTextStyle(state) {
  try {
    const project = getCurrentProject(state);
    return project?.textStyle || null;
  } catch (error) {
    console.error('فشل في استرداد نمط النص', error);
    return null;
  }
}

/**
 * استخراج إعدادات الخلفية في المشروع
 * @param {AppState} state - الحالة الحالية
 * @returns {Object | null} - إعدادات الخلفية أو null
 */
export function getProjectBackground(state) {
  try {
    const project = getCurrentProject(state);
    return project?.background || null;
  } catch (error) {
    console.error('فشل في استرداد إعدادات الخلفية', error);
    return null;
  }
}

/**
 * استخراج إعدادات الفيديو في المشروع
 * @param {AppState} state - الحالة الحالية
 * @returns {Object | null} - إعدادات الفيديو أو null
 */
export function getProjectVideoComposition(state) {
  try {
    const project = getCurrentProject(state);
    return project?.videoComposition || null;
  } catch (error) {
    console.error('فشل في استرداد إعدادات الفيديو', error);
    return null;
  }
}

/**
 * استخراج إعدادات التصدير في المشروع
 * @param {AppState} state - الحالة الحالية
 * @returns {Object | null} - إعدادات التصدير أو null
 */
export function getProjectExportSettings(state) {
  try {
    const project = getCurrentProject(state);
    return project?.exportSettings || null;
  } catch (error) {
    console.error('فشل في استرداد إعدادات التصدير', error);
    return null;
  }
}

/**
 * استخراج توقيتات الآيات في المشروع
 * @param {AppState} state - الحالة الحالية
 * @returns {Object.<number, {start: number, end: number}> | null} - توقيتات الآيات أو null
 */
export function getProjectAyahTimings(state) {
  try {
    const quranSelection = getProjectQuranSelection(state);
    return quranSelection?.ayahTimings || null;
  } catch (error) {
    console.error('فشل في استرداد توقيتات الآيات', error);
    return null;
  }
}

/**
 * استخراج وقت إنشاء المشروع
 * @param {AppState} state - الحالة الحالية
 * @returns {number | null} - وقت الإنشاء أو null
 */
export function getProjectCreationTime(state) {
  try {
    const project = getCurrentProject(state);
    return project?.createdAt || null;
  } catch (error) {
    console.error('فشل في استرداد وقت إنشاء المشروع', error);
    return null;
  }
}

/**
 * استخراج وقت آخر تحديث
 * @param {AppState} state - الحالة الحالية
 * @returns {number | null} - وقت التحديث أو null
 */
export function getProjectLastUpdateTime(state) {
  try {
    const project = getCurrentProject(state);
    return project?.updatedAt || null;
  } catch (error) {
    console.error('فشل في استرداد وقت آخر تحديث', error);
    return null;
  }
}

// --- استخراج تفاصيل القرآن ---
/**
 * استخراج معرف القارئ
 * @param {AppState} state - الحالة الحالية
 * @returns {string | null} - معرف القارئ أو null
 */
export function getProjectReciter(state) {
  try {
    const quranSelection = getProjectQuranSelection(state);
    return quranSelection?.reciterId || null;
  } catch (error) {
    console.error('فشل في استرداد معرف القارئ', error);
    return null;
  }
}

/**
 * استخراج معرف الترجمة
 * @param {AppState} state - الحالة الحالية
 * @returns {string | null} - معرف الترجمة أو null
 */
export function getProjectTranslation(state) {
  try {
    const quranSelection = getProjectQuranSelection(state);
    return quranSelection?.translationId || null;
  } catch (error) {
    console.error('فشل في استرداد معرف الترجمة', error);
    return null;
  }
}

/**
 * استخراج معرف السورة
 * @param {AppState} state - الحالة الحالية
 * @returns {number | null} - معرف السورة أو null
 */
export function getProjectSurahId(state) {
  try {
    const quranSelection = getProjectQuranSelection(state);
    return quranSelection?.surahId || null;
  } catch (error) {
    console.error('فشل في استرداد معرف السورة', error);
    return null;
  }
}

/**
 * استخراج بداية الآية
 * @param {AppState} state - الحالة الحالية
 * @returns {number | null} - بداية الآية أو null
 */
export function getProjectStartAyah(state) {
  try {
    const quranSelection = getProjectQuranSelection(state);
    return quranSelection?.startAyah || null;
  } catch (error) {
    console.error('فشل في استرداد بداية الآية', error);
    return null;
  }
}

/**
 * استخراج نهاية الآية
 * @param {AppState} state - الحالة الحالية
 * @returns {number | null} - نهاية الآية أو null
 */
export function getProjectEndAyah(state) {
  try {
    const quranSelection = getProjectQuranSelection(state);
    return quranSelection?.endAyah || null;
  } catch (error) {
    console.error('فشل في استرداد نهاية الآية', error);
    return null;
  }
}

/**
 * استخراج نص الآية المخصص
 * @param {AppState} state - الحالة الحالية
 * @returns {string | null} - نص الآية أو null
 */
export function getProjectCustomText(state) {
  try {
    const quranSelection = getProjectQuranSelection(state);
    return quranSelection?.customText || null;
  } catch (error) {
    console.error('فشل في استرداد نص الآية المخصص', error);
    return null;
  }
}

// --- استخراج إعدادات الفيديو ---
/**
 * استخراج مرشح الفيديو
 * @param {AppState} state - الحالة الحالية
 * @returns {string} - مرشح الفيديو أو الافتراضي
 */
export function getProjectVideoFilter(state) {
  try {
    const videoSettings = getProjectVideoComposition(state);
    return videoSettings?.videoFilter || 'none';
  } catch (error) {
    console.error('فشل في استرداد مرشح الفيديو', error);
    return 'none';
  }
}

/**
 * استخراج إعدادات الموسيقى الخلفية
 * @param {AppState} state - الحالة الحالية
 * @returns {Object | null} - إعدادات الموسيقى أو null
 */
export function getProjectBackgroundMusic(state) {
  try {
    const videoSettings = getProjectVideoComposition(state);
    return {
      enable: videoSettings?.enableBackgroundMusic || false,
      url: videoSettings?.backgroundMusicUrl || null,
      volume: videoSettings?.backgroundMusicVolume || 0.5
    };
  } catch (error) {
    console.error('فشل في استرداد إعدادات الموسيقى', error);
    return null;
  }
}

// --- استخراج إعدادات التصدير ---
/**
 * استخراج دقة التصدير
 * @param {AppState} state - الحالة الحالية
 * @returns {string} - الدقة أو الافتراضي
 */
export function getProjectExportResolution(state) {
  try {
    const exportSettings = getProjectExportSettings(state);
    return exportSettings?.resolution || '1080p';
  } catch (error) {
    console.error('فشل في استرداد دقة التصدير', error);
    return '1080p';
  }
}

/**
 * استخراج صيغة التصدير
 * @param {AppState} state - الحالة الحالية
 * @returns {string} - الصيغة أو الافتراضي
 */
export function getProjectExportFormat(state) {
  try {
    const exportSettings = getProjectExportSettings(state);
    return exportSettings?.format || 'mp4';
  } catch (error) {
    console.error('فشل في استرداد صيغة التصدير', error);
    return 'mp4';
  }
}

/**
 * استخراج عدد الإطارات في الثانية
 * @param {AppState} state - الحالة الحالية
 * @returns {number} - عدد الإطارات أو الافتراضي
 */
export function getProjectExportFPS(state) {
  try {
    const exportSettings = getProjectExportSettings(state);
    return exportSettings?.fps || 30;
  } catch (error) {
    console.error('فشل في استرداد fps', error);
    return 30;
  }
}

/**
 * استخراج جودة التصدير
 * @param {AppState} state - الحالة الحالية
 * @returns {string} - الجودة أو الافتراضي
 */
export function getProjectExportQuality(state) {
  try {
    const exportSettings = getProjectExportSettings(state);
    return exportSettings?.quality || 'high';
  } catch (error) {
    console.error('فشل في استرداد جودة التصدير', error);
    return 'high';
  }
}

// --- استخراج إعدادات الترجمة ---
/**
 * استخراج إعدادات الترجمة
 * @param {AppState} state - الحالة الحالية
 * @returns {Object | null} - إعدادات الترجمة أو null
 */
export function getProjectSubtitles(state) {
  try {
    const videoSettings = getProjectVideoComposition(state);
    return {
      enable: videoSettings?.enableSubtitles || true,
      fontSize: videoSettings?.subtitlesFontSize || 24,
      fontColor: videoSettings?.subtitlesFontColor || '#FFFFFF',
      background: videoSettings?.subtitlesBackground || 'rgba(0, 0, 0, 0.7)'
    };
  } catch (error) {
    console.error('فشل في استرداد إعدادات الترجمة', error);
    return null;
  }
}

// --- وظائف إضافية ---
/**
 * استخراج إعدادات الترجمة من المشروع
 * @param {AppState} state - الحالة الحالية
 * @param {string} [translationId='en.sahih'] - معرف الترجمة الافتراضية
 * @returns {Object | null} - إعدادات الترجمة أو null
 */
export function getProjectTranslationSettings(state, translationId = 'en.sahih') {
  try {
    const quranSelection = getProjectQuranSelection(state);
    const translationIdToUse = quranSelection?.translationId || translationId;
    
    return {
      translationId: translationIdToUse,
      enable: !!translationIdToUse
    };
  } catch (error) {
    console.error('فشل في استرداد إعدادات الترجمة', error);
    return null;
  }
}

/**
 * استخراج إعدادات التأثيرات من المشروع
 * @param {AppState} state - الحالة الحالية
 * @returns {Object | null} - إعدادات التأثيرات أو null
 */
export function getProjectAnimationSettings(state) {
  try {
    const textStyle = getProjectTextStyle(state);
    return {
      animation: textStyle?.textAnimation || 'fade',
      enable: textStyle?.textAnimation !== 'none'
    };
  } catch (error) {
    console.error('فشل في استرداد إعدادات التأثيرات', error);
    return null;
  }
}

/**
 * استخراج إعدادات اتجاه النص من المشروع
 * @param {AppState} state - الحالة الحالية
 * @returns {Object | null} - إعدادات اتجاه النص أو null
 */
export function getProjectTextDirectionSettings(state) {
  try {
    const textStyle = getProjectTextStyle(state);
    return {
      isRTL: textStyle?.isDirectionRTL || true,
      direction: textStyle?.isDirectionRTL ? 'rtl' : 'ltr'
    };
  } catch (error) {
    console.error('فشل في استرداد إعدادات اتجاه النص', error);
    return null;
  }
}

/**
 * استخراج إعدادات خلفية النص من المشروع
 * @param {AppState} state - الحالة الحالية
 * @returns {Object | null} - إعدادات خلفية النص أو null
 */
export function getProjectTextBackgroundSettings(state) {
  try {
    const textStyle = getProjectTextStyle(state);
    return {
      color: textStyle?.textBgColor || 'rgba(255, 255, 255, 0.7)',
      enable: textStyle?.textBgColor !== 'transparent'
    };
  } catch (error) {
    console.error('فشل في استرداد إعدادات خلفية النص', error);
    return null;
  }
}

/**
 * استخراج إعدادات ظل النص من المشروع
 * @param {AppState} state - الحالة الحالية
 * @returns {Object | null} - إعدادات ظل النص أو null
 */
export function getProjectTextShadowSettings(state) {
  try {
    const textStyle = getProjectTextStyle(state);
    return {
      enable: textStyle?.textShadow?.enableTextShadow || true,
      color: textStyle?.textShadow?.textShadowColor || '#000000',
      blur: textStyle?.textShadow?.textShadowBlur || 2,
      offsetX: textStyle?.textShadow?.textShadowOffsetX || 1,
      offsetY: textStyle?.textShadow?.textShadowOffsetY || 1
    };
  } catch (error) {
    console.error('فشل في استرداد إعدادات ظل النص', error);
    return null;
  }
}

// --- وظائف التحقق ---
/**
 * التحقق من صحة المشروع
 * @param {AppState} state - الحالة الحالية
 * @returns {boolean} - هل المشروع صحيح؟
 */
export function isProjectValid(state) {
  try {
    const project = getCurrentProject(state);
    if (!project) return false;
    
    const projectValidation = projectModel.validateProjectData(project);
    return projectValidation.isValid;
  } catch (error) {
    console.error('فشل في التحقق من صحة المشروع', error);
    return false;
  }
}

/**
 * التحقق من وجود نص مخصص في المشروع
 * @param {AppState} state - الحالة الحالية
 * @returns {boolean} - هل يوجد نص مخصص؟
 */
export function hasCustomVerseText(state) {
  try {
    const textStyle = getProjectTextStyle(state);
    return !!(textStyle?.customText);
  } catch (error) {
    console.error('فشل في التحقق من وجود نص مخصص', error);
    return false;
  }
}

/**
 * التحقق من وجود قارئ محدد في المشروع
 * @param {AppState} state - الحالة الحالية
 * @returns {boolean} - هل هناك قارئ محدد؟
 */
export function hasSelectedReciter(state) {
  try {
    const reciterId = getProjectReciter(state);
    return !!reciterId;
  } catch (error) {
    console.error('فشل في التحقق من وجود قارئ محدد', error);
    return false;
  }
}

/**
 * التحقق من وجود ترجمة محددة في المشروع
 * @param {AppState} state - الحالة الحالية
 * @returns {boolean} - هل هناك ترجمة محددة؟
 */
export function hasSelectedTranslation(state) {
  try {
    const translationId = getProjectTranslation(state);
    return !!translationId;
  } catch (error) {
    console.error('فشل في التحقق من وجود ترجمة محددة', error);
    return false;
  }
}

// --- وظائف التهيئة ---
/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 * @returns {ProjectSelectors} - واجهة عامة للوحدات
 */
export function initializeProjectSelectors(deps) {
  // تعيين الاعتمادات
  if (deps && deps.projectModel) {
    projectModel = deps.projectModel;
  }
  
  return {
    getCurrentProject,
    getCurrentProjectId,
    getCurrentProjectTitle,
    hasActiveProject,
    isCurrentProjectDirty,
    getSavedProjects,
    getSavedProjectById,
    getSavedProjectsCount,
    hasSavedProjects,
    getProjectQuranSelection,
    getProjectTextStyle,
    getProjectBackground,
    getProjectVideoComposition,
    getProjectExportSettings,
    getProjectAyahTimings,
    getProjectCreationTime,
    getProjectLastUpdateTime,
    getProjectReciter,
    getProjectTranslation,
    getProjectSurahId,
    getProjectStartAyah,
    getProjectEndAyah,
    getProjectCustomText,
    getProjectVideoFilter,
    getProjectBackgroundMusic,
    getProjectExportResolution,
    getProjectExportFormat,
    getProjectExportFPS,
    getProjectExportQuality,
    getProjectSubtitles,
    getProjectTranslationSettings,
    getProjectAnimationSettings,
    getProjectTextDirectionSettings,
    getProjectTextBackgroundSettings,
    getProjectTextShadowSettings,
    isProjectValid,
    hasCustomVerseText,
    hasSelectedReciter,
    hasSelectedTranslation
  };
}

export default {
  getCurrentProject,
  getCurrentProjectId,
  getCurrentProjectTitle,
  hasActiveProject,
  isCurrentProjectDirty,
  getSavedProjects,
  getSavedProjectById,
  getSavedProjectsCount,
  hasSavedProjects,
  getProjectQuranSelection,
  getProjectTextStyle,
  getProjectBackground,
  getProjectVideoComposition,
  getProjectExportSettings,
  getProjectAyahTimings,
  getProjectCreationTime,
  getProjectLastUpdateTime,
  getProjectReciter,
  getProjectTranslation,
  getProjectSurahId,
  getProjectStartAyah,
  getProjectEndAyah,
  getProjectCustomText,
  getProjectVideoFilter,
  getProjectBackgroundMusic,
  getProjectExportResolution,
  getProjectExportFormat,
  getProjectExportFPS,
  getProjectExportQuality,
  getProjectSubtitles,
  getProjectTranslationSettings,
  getProjectAnimationSettings,
  getProjectTextDirectionSettings,
  getProjectTextBackgroundSettings,
  getProjectTextShadowSettings,
  isProjectValid,
  hasCustomVerseText,
  hasSelectedReciter,
  hasSelectedTranslation
};
