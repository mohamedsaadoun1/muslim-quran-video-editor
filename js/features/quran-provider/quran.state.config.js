// js/features/quran-provider/quran.state.config.js

import { 
  DEFAULT_PROJECT_SCHEMA,
  APP_CONSTANTS
} from '../../config/app.constants.js';

/**
 * @typedef {Object} QuranSelectionStateSchema
 * @property {number | null} surahId - رقم السورة المحددة (1-114)
 * @property {number | null} startAyah - بداية الآية داخل السورة المحددة
 * @property {number | null} endAyah - نهاية الآية داخل السورة المحددة
 * @property {string | null} reciterId - معرف القارئ المحدد
 * @property {string | null} translationId - معرف الترجمة المحددة
 * @property {number} delayBetweenAyahs - التأخير بالثواني بين الآيات المتتالية
 * @property {Object.<number, {start: number, end: number, text?: string}>} [ayahTimings] - خاص: تخزين توقيتات كل آية عالمية
 * @property {Array<PlaylistItemFromState>} [currentPlaylistItems] - خاص: تمثيل قائمة التشغيل
 */
export const QuranSelectionStateSchema = {
  surahId: null,
  startAyah: null,
  endAyah: null,
  reciterId: null,
  translationId: null,
  delayBetweenAyahs: 1.0,
  ayahTimings: {},
  currentPlaylistItems: []
};

/**
 * @typedef {Object} PlaylistItemFromState
 * @property {number} ayahGlobalNumber - الرقم العالمي للآية
 * @property {string | null} text - النص العربي
 * @property {string | null} translationText - النص المترجم إذا كانت الترجمة مفعلة
 * @property {string | null} audioUrl - سيتم تعبئته من قبل المسترجِع
 * @property {number | null} duration - سيتم تعبئته من قبل المسترجِع
 */

/**
 * الحالة الافتراضية لاختيار القرآن ضمن المشروع
 * @type {QuranSelectionStateSchema}
 */
export const defaultQuranSelectionState = {
  ...DEFAULT_PROJECT_SCHEMA.quranSelection,
  surahId: DEFAULT_PROJECT_SCHEMA.quranSelection.surahId || null,
  startAyah: DEFAULT_PROJECT_SCHEMA.quranSelection.startAyah || null,
  endAyah: DEFAULT_PROJECT_SCHEMA.quranSelection.endAyah || null,
  reciterId: DEFAULT_PROJECT_SCHEMA.quranSelection.reciterId || null,
  translationId: DEFAULT_PROJECT_SCHEMA.quranSelection.translationId || null,
  delayBetweenAyahs: Math.max(
    0.5, 
    Math.min(5, DEFAULT_PROJECT_SCHEMA.quranSelection.delayBetweenAyahs || 1.0)
  ),
  ayahTimings: DEFAULT_PROJECT_SCHEMA.quranSelection.ayahTimings || {},
  currentPlaylistItems: DEFAULT_PROJECT_SCHEMA.quranSelection.currentPlaylistItems || []
};

/**
 * استخراج حالة اختيار القرآن من حالة المشروع
 * @param {Object} projectState - حالة المشروع
 * @returns {QuranSelectionStateSchema} - حالة اختيار القرآن
 */
export function getQuranSelectionSettings(projectState) {
  try {
    if (!projectState || typeof projectState !== 'object') {
      return { ...defaultQuranSelectionState };
    }
    
    return {
      ...defaultQuranSelectionState,
      ...projectState.quranSelection
    };
  } catch (error) {
    console.error('فشل في استرداد حالة اختيار القرآن', error);
    return { ...defaultQuranSelectionState };
  }
}

/**
 * استخراج معرف السورة المحددة
 * @param {Object} projectState - حالة المشروع
 * @returns {number | null} - معرف السورة أو null
 */
export function getSelectedSurahId(projectState) {
  try {
    const selection = getQuranSelectionSettings(projectState);
    return selection.surahId;
  } catch (error) {
    console.error('فشل في استرداد معرف السورة', error);
    return null;
  }
}

/**
 * استخراج بداية الآية المحددة
 * @param {Object} projectState - حالة المشروع
 * @returns {number | null} - بداية الآية أو null
 */
export function getSelectedStartAyah(projectState) {
  try {
    const selection = getQuranSelectionSettings(projectState);
    return selection.startAyah;
  } catch (error) {
    console.error('فشل في استرداد بداية الآية', error);
    return null;
  }
}

/**
 * استخراج نهاية الآية المحددة
 * @param {Object} projectState - حالة المشروع
 * @returns {number | null} - نهاية الآية أو null
 */
export function getSelectedEndAyah(projectState) {
  try {
    const selection = getQuranSelectionSettings(projectState);
    return selection.endAyah;
  } catch (error) {
    console.error('فشل في استرداد نهاية الآية', error);
    return null;
  }
}

/**
 * استخراج معرف القارئ المحدد
 * @param {Object} projectState - حالة المشروع
 * @returns {string | null} - معرف القارئ أو null
 */
export function getSelectedReciterId(projectState) {
  try {
    const selection = getQuranSelectionSettings(projectState);
    return selection.reciterId;
  } catch (error) {
    console.error('فشل في استرداد معرف القارئ', error);
    return null;
  }
}

/**
 * استخراج معرف الترجمة المحددة
 * @param {Object} projectState - حالة المشروع
 * @returns {string | null} - معرف الترجمة أو null
 */
export function getSelectedTranslationId(projectState) {
  try {
    const selection = getQuranSelectionSettings(projectState);
    return selection.translationId;
  } catch (error) {
    console.error('فشل في استرداد معرف الترجمة', error);
    return null;
  }
}

/**
 * استخراج التأخير بين الآيات
 * @param {Object} projectState - حالة المشروع
 * @returns {number} - التأخير بالثواني
 */
export function getDelayBetweenAyahs(projectState) {
  try {
    const selection = getQuranSelectionSettings(projectState);
    return Math.max(0.5, Math.min(5, selection.delayBetweenAyahs));
  } catch (error) {
    console.error('فشل في استرداد التأخير بين الآيات', error);
    return 1.0;
  }
}

/**
 * استخراج توقيتات الآيات
 * @param {Object} projectState - حالة المشروع
 * @returns {Object} - توقيتات الآيات
 */
export function getAyahTimings(projectState) {
  try {
    const selection = getQuranSelectionSettings(projectState);
    return { ...selection.ayahTimings };
  } catch (error) {
    console.error('فشل في استرداد توقيتات الآيات', error);
    return {};
  }
}

/**
 * استخراج قائمة التشغيل الحالية
 * @param {Object} projectState - حالة المشروع
 * @returns {Array<PlaylistItemFromState>} - قائمة التشغيل
 */
export function getCurrentPlaylistItems(projectState) {
  try {
    const selection = getQuranSelectionSettings(projectState);
    return selection.currentPlaylistItems || [];
  } catch (error) {
    console.error('فشل في استرداد قائمة التشغيل', error);
    return [];
  }
}

/**
 * إنشاء عنصر قائمة تشغيل
 * @param {number} globalAyahNumber - الرقم العالمي للآية
 * @param {Object} verseData - بيانات الآية
 * @param {string} verseData.text - نص الآية
 * @param {string} verseData.translation - ترجمة الآية
 * @param {string} verseData.audioUrl - رابط الصوت
 * @param {number} verseData.duration - مدة التشغيل
 * @returns {PlaylistItemFromState} - عنصر قائمة التشغيل
 */
export function createPlaylistItem(globalAyahNumber, verseData) {
  if (!verseData || !verseData.text) {
    throw new Error('بيانات الآية غير صحيحة');
  }
  
  return {
    ayahGlobalNumber: globalAyahNumber,
    text: verseData.text,
    translationText: verseData.translation || null,
    audioUrl: verseData.audioUrl || null,
    duration: verseData.duration || null
  };
}

/**
 * إنشاء قائمة تشغيل كاملة
 * @param {number} surahId - معرف السورة
 * @param {number} startAyah - بداية الآية
 * @param {number} endAyah - نهاية الآية
 * @param {string} reciterId - معرف القارئ
 * @param {string} translationId - معرف الترجمة
 * @param {number} delayBetweenAyahs - التأخير بين الآيات
 * @returns {Array<PlaylistItemFromState>} - قائمة تشغيل الآيات
 */
export function createFullPlaylist(surahId, startAyah, endAyah, reciterId, translationId, delayBetweenAyahs = 1.0) {
  if (!surahId || !startAyah || !endAyah || !reciterId) {
    throw new Error('البيانات المطلوبة غير متوفرة لإنشاء قائمة التشغيل');
  }
  
  // سيتم تطبيق هذا الجزء باستخدام quranDataCache و quranVerseAnalyzer
  // في الملف النهائي، سيتم استبدال هذا الجزء بتنفيذ كامل
  
  const playlist = [];
  let currentTime = 0;
  
  // في الملف النهائي، سيتم استخدام quranDataCache.getAyahsForSurah
  // وسيتم حساب التوقيتات بدقة
  
  for (let i = startAyah; i <= endAyah; i++) {
    playlist.push(createPlaylistItem(i, {
      text: `الآية ${i}`,
      translation: `Translation for ayah ${i}`,
      audioUrl: `https://example.com/audio/ ${surahId}/${i}/${reciterId}`,
      duration: 5.0
    }));
    
    currentTime += 5.0 + delayBetweenAyahs;
  }
  
  return playlist;
}

/**
 * تحديث حالة اختيار القرآن
 * @param {Object} currentState - الحالة الحالية
 * @param {Object} updates - التحديثات
 * @returns {QuranSelectionStateSchema} - الحالة المحدثة
 */
export function updateQuranSelectionState(currentState, updates) {
  if (!currentState || !updates) {
    return { ...defaultQuranSelectionState };
  }
  
  const updatedState = {
    ...currentState,
    ...updates,
    // التأكد من أن القيم المنطقية صحيحة
    delayBetweenAyahs: Math.max(
      0.5, 
      Math.min(5, updates.delayBetweenAyahs || currentState.delayBetweenAyahs || 1.0)
    )
  };
  
  // التأكد من صحة الآيات
  if (updatedState.surahId) {
    const surahInfo = quranVerseAnalyzer.getSurahInfo(updatedState.surahId);
    
    if (surahInfo) {
      const maxAyahs = surahInfo.numberOfAyahs;
      
      // التحقق من صحة القيم
      if (updatedState.startAyah && updatedState.startAyah > maxAyahs) {
        updatedState.startAyah = maxAyahs;
      }
      
      if (updatedState.endAyah && updatedState.endAyah > maxAyahs) {
        updatedState.endAyah = maxAyahs;
      }
      
      // التأكد من أن نهاية الآية لا تسبق بدايتها
      if (updatedState.startAyah > updatedState.endAyah) {
        updatedState.endAyah = updatedState.startAyah;
      }
    }
  }
  
  return updatedState;
}

/**
 * إنشاء حالة اختيار جديدة
 * @param {number} surahId - معرف السورة
 * @param {number} startAyah - بداية الآية
 * @param {number} endAyah - نهاية الآية
 * @param {string} reciterId - معرف القارئ
 * @param {string} translationId - معرف الترجمة
 * @param {number} delayBetweenAyahs - التأخير بين الآيات
 * @returns {QuranSelectionStateSchema} - الحالة الجديدة
 */
export function createNewQuranSelectionState(surahId, startAyah, endAyah, reciterId, translationId, delayBetweenAyahs = 1.0) {
  return updateQuranSelectionState(defaultQuranSelectionState, {
    surahId,
    startAyah,
    endAyah,
    reciterId,
    translationId,
    delayBetweenAyahs
  });
}

/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 * @returns {Object} - واجهة عامة للوحدة
 */
export function initializeQuranStateConfig(deps) {
  // تعيين الاعتمادات
  if (deps && deps.quranVerseAnalyzer) {
    quranVerseAnalyzer = deps.quranVerseAnalyzer;
  }
  
  // إرجاع الواجهة العامة
  return {
    defaultQuranSelectionState,
    getQuranSelectionSettings,
    getSelectedSurahId,
    getSelectedStartAyah,
    getSelectedEndAyah,
    getSelectedReciterId,
    getSelectedTranslationId,
    getDelayBetweenAyahs,
    getAyahTimings,
    getCurrentPlaylistItems,
    createPlaylistItem,
    createFullPlaylist,
    updateQuranSelectionState,
    createNewQuranSelectionState
  };
}
