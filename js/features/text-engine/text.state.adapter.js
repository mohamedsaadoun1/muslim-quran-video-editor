// js/features/text-engine/text.state.adapter.js

import { 
  DEFAULT_PROJECT_SCHEMA,
  APP_CONSTANTS
} from '../../config/app.constants.js';

/**
 * @typedef {Object} TextStyleStateSchema
 * @property {string} fontFamily - الخط المستخدم (مثلاً "'Amiri Quran', serif")
 * @property {number} fontSize - حجم الخط بالبكسل
 * @property {string} fontColor - لون الخط (Hex أو rgba)
 * @property {string} textBgColor - لون خلفية النص (Hex أو rgba)
 * @property {string} textAnimation - نوع التأثير (مثلاً 'none', 'fade', 'typewriter')
 * @property {string} fontWeight - وزن الخط (normal, bold...)
 * @property {'center' | 'left' | 'right' | 'start' | 'end'} textAlign - محاذاة النص
 * @property {number} lineHeightMultiplier - مضاعف المسافة بين السطور
 * @property {number} letterSpacing - المسافة بين الحروف
 * @property {boolean} isDirectionRTL - اتجاه النص من اليمين لليسار
 * @property {boolean} enableTextShadow - تمكين ظل النص
 * @property {string} textShadowColor - لون ظل النص
 * @property {number} textShadowBlur - درجة ضبابية الظل
 * @property {number} textShadowOffsetX - إزاحة الظل أفقيًا
 * @property {number} textShadowOffsetY - إزاحة الظل عموديًا
 * @property {number} translationFontSizeRatio - نسبة حجم ترجمة النص
 * @property {string} translationFontColor - لون ترجمة النص
 * @property {string} translationFontFamily - خط ترجمة النص
 * @property {boolean} showTranslation - إظهار الترجمة
 */

/**
 * النمط الافتراضي لنص القرآن الكريم
 * يجب أن يكون متسقًا مع DEFAULT_PROJECT_SCHEMA.textStyle
 * @type {TextStyleStateSchema}
 */
export const defaultTextStyleState = {
  ...DEFAULT_PROJECT_SCHEMA.textStyle,
  // التأكد من أن جميع الخصائص المطلوبة موجودة
  fontFamily: DEFAULT_PROJECT_SCHEMA.textStyle.fontFamily || "'Amiri Quran', serif",
  fontSize: Math.max(12, Math.min(72, DEFAULT_PROJECT_SCHEMA.textStyle.fontSize || 36)),
  fontColor: DEFAULT_PROJECT_SCHEMA.textStyle.fontColor || '#000000',
  textBgColor: DEFAULT_PROJECT_SCHEMA.textStyle.textBgColor || 'rgba(255,255,255,0.7)',
  textAnimation: DEFAULT_PROJECT_SCHEMA.textStyle.textAnimation || 'fade',
  fontWeight: DEFAULT_PROJECT_SCHEMA.textStyle.fontWeight || 'normal',
  textAlign: DEFAULT_PROJECT_SCHEMA.textStyle.textAlign || 'center',
  lineHeightMultiplier: Math.max(0.5, Math.min(2, DEFAULT_PROJECT_SCHEMA.textStyle.lineHeightMultiplier || 1.5)),
  letterSpacing: Math.max(0, Math.min(10, DEFAULT_PROJECT_SCHEMA.textStyle.letterSpacing || 0)),
  isDirectionRTL: DEFAULT_PROJECT_SCHEMA.textStyle.isDirectionRTL !== undefined ? 
                   DEFAULT_PROJECT_SCHEMA.textStyle.isDirectionRTL : true,
  enableTextShadow: DEFAULT_PROJECT_SCHEMA.textStyle.enableTextShadow !== undefined ? 
                    DEFAULT_PROJECT_SCHEMA.textStyle.enableTextShadow : true,
  textShadowColor: DEFAULT_PROJECT_SCHEMA.textStyle.textShadowColor || '#000000',
  textShadowBlur: Math.max(0, Math.min(10, DEFAULT_PROJECT_SCHEMA.textStyle.textShadowBlur || 2)),
  textShadowOffsetX: DEFAULT_PROJECT_SCHEMA.textStyle.textShadowOffsetX || 1,
  textShadowOffsetY: DEFAULT_PROJECT_SCHEMA.textStyle.textShadowOffsetY || 1,
  translationFontSizeRatio: Math.max(0.3, Math.min(0.9, DEFAULT_PROJECT_SCHEMA.textStyle.translationFontSizeRatio || 0.6)),
  translationFontColor: DEFAULT_PROJECT_SCHEMA.textStyle.translationFontColor || '#333333',
  translationFontFamily: DEFAULT_PROJECT_SCHEMA.textStyle.translationFontFamily || "'Tajawal', sans-serif",
  showTranslation: DEFAULT_PROJECT_SCHEMA.textStyle.showTranslation !== undefined ? 
                   DEFAULT_PROJECT_SCHEMA.textStyle.showTranslation : true
};

// --- SELECTORS ---
// المحددات (Selectors) لاسترداد خصائص نمط النص من حالة المشروع

/**
 * استرداد نمط النص الكامل من حالة المشروع
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {TextStyleStateSchema} - نمط النص
 */
export function getTextStyleSettings(projectState) {
  try {
    if (!projectState || typeof projectState !== 'object') {
      return { ...defaultTextStyleState };
    }
    
    return {
      ...defaultTextStyleState,
      ...projectState.textStyle
    };
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد إعدادات نمط النص:', error);
    return { ...defaultTextStyleState };
  }
}

/**
 * استرداد خط النص القرآني
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {string} - خط النص
 */
export function getFontFamily(projectState) {
  try {
    return projectState?.textStyle?.fontFamily || defaultTextStyleState.fontFamily;
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد خط النص:', error);
    return defaultTextStyleState.fontFamily;
  }
}

/**
 * استرداد حجم خط النص القرآني
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {number} - حجم الخط
 */
export function getFontSize(projectState) {
  try {
    const size = projectState?.textStyle?.fontSize || defaultTextStyleState.fontSize;
    return Math.max(12, Math.min(72, size));
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد حجم الخط:', error);
    return defaultTextStyleState.fontSize;
  }
}

/**
 * استرداد لون خط النص
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {string} - لون الخط
 */
export function getFontColor(projectState) {
  try {
    return projectState?.textStyle?.fontColor || defaultTextStyleState.fontColor;
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد لون الخط:', error);
    return defaultTextStyleState.fontColor;
  }
}

/**
 * استرداد لون خلفية النص
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {string} - لون الخلفية
 */
export function getTextBackgroundColor(projectState) {
  try {
    return projectState?.textStyle?.textBgColor || defaultTextStyleState.textBgColor;
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد لون خلفية النص:', error);
    return defaultTextStyleState.textBgColor;
  }
}

/**
 * استرداد نوع تأثير النص
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {string} - نوع التأثير
 */
export function getTextAnimation(projectState) {
  try {
    return projectState?.textStyle?.textAnimation || defaultTextStyleState.textAnimation;
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد نوع التأثير:', error);
    return defaultTextStyleState.textAnimation;
  }
}

/**
 * استرداد وزن الخط
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {string} - وزن الخط
 */
export function getFontWeight(projectState) {
  try {
    return projectState?.textStyle?.fontWeight || defaultTextStyleState.fontWeight;
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد وزن الخط:', error);
    return defaultTextStyleState.fontWeight;
  }
}

/**
 * استرداد محاذاة النص
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {'center' | 'left' | 'right' | 'start' | 'end'} - محاذاة النص
 */
export function getTextAlign(projectState) {
  try {
    return projectState?.textStyle?.textAlign || defaultTextStyleState.textAlign;
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد محاذاة النص:', error);
    return defaultTextStyleState.textAlign;
  }
}

/**
 * استرداد مضاعف المسافة بين السطور
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {number} - مضاعف المسافة بين السطور
 */
export function getLineHeightMultiplier(projectState) {
  try {
    const multiplier = projectState?.textStyle?.lineHeightMultiplier || 
                       defaultTextStyleState.lineHeightMultiplier;
    return Math.max(0.5, Math.min(2, multiplier));
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد مضاعف المسافة بين السطور:', error);
    return defaultTextStyleState.lineHeightMultiplier;
  }
}

/**
 * استرداد المسافة بين الحروف
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {number} - المسافة بين الحروف
 */
export function getLetterSpacing(projectState) {
  try {
    const spacing = projectState?.textStyle?.letterSpacing || 
                    defaultTextStyleState.letterSpacing;
    return Math.max(0, Math.min(10, spacing));
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد المسافة بين الحروف:', error);
    return defaultTextStyleState.letterSpacing;
  }
}

/**
 * استرداد اتجاه النص (من اليمين لليسار أو العكس)
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {boolean} - هل النص من اليمين لليسار؟
 */
export function getIsDirectionRTL(projectState) {
  try {
    return projectState?.textStyle?.isDirectionRTL !== undefined ? 
           projectState.textStyle.isDirectionRTL : 
           defaultTextStyleState.isDirectionRTL;
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد اتجاه النص:', error);
    return defaultTextStyleState.isDirectionRTL;
  }
}

/**
 * استرداد تمكين ظل النص
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {boolean} - هل تم تمكين ظل النص؟
 */
export function getEnableTextShadow(projectState) {
  try {
    return projectState?.textStyle?.enableTextShadow !== undefined ? 
           projectState.textStyle.enableTextShadow : 
           defaultTextStyleState.enableTextShadow;
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد تمكين ظل النص:', error);
    return defaultTextStyleState.enableTextShadow;
  }
}

/**
 * استرداد لون ظل النص
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {string} - لون ظل النص
 */
export function getTextShadowColor(projectState) {
  try {
    return projectState?.textStyle?.textShadowColor || 
           defaultTextStyleState.textShadowColor;
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد لون ظل النص:', error);
    return defaultTextStyleState.textShadowColor;
  }
}

/**
 * استرداد درجة ضبابية ظل النص
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {number} - درجة ضبابية ظل النص
 */
export function getTextShadowBlur(projectState) {
  try {
    const blur = projectState?.textStyle?.textShadowBlur || 
                 defaultTextStyleState.textShadowBlur;
    return Math.max(0, Math.min(10, blur));
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد درجة ضبابية ظل النص:', error);
    return defaultTextStyleState.textShadowBlur;
  }
}

/**
 * استرداد إزاحة ظل النص أفقيًا
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {number} - إزاحة ظل النص أفقيًا
 */
export function getTextShadowOffsetX(projectState) {
  try {
    return projectState?.textStyle?.textShadowOffsetX || 
           defaultTextStyleState.textShadowOffsetX;
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد إزاحة ظل النص أفقيًا:', error);
    return defaultTextStyleState.textShadowOffsetX;
  }
}

/**
 * استرداد إزاحة ظل النص عموديًا
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {number} - إزاحة ظل النص عموديًا
 */
export function getTextShadowOffsetY(projectState) {
  try {
    return projectState?.textStyle?.textShadowOffsetY || 
           defaultTextStyleState.textShadowOffsetY;
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد إزاحة ظل النص عموديًا:', error);
    return defaultTextStyleState.textShadowOffsetY;
  }
}

/**
 * استرداد نسبة حجم ترجمة النص
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @param {number} [defaultRatio=0.6] - نسبة افتراضية إذا لم توجد في الحالة
 * @returns {number} - حجم ترجمة النص
 */
export function getTranslationFontSize(projectState, defaultRatio = 0.6) {
  try {
    const mainFontSize = getFontSize(projectState);
    const ratio = projectState?.textStyle?.translationFontSizeRatio || 
                  defaultRatio;
    return Math.max(12, Math.round(mainFontSize * Math.max(0.3, Math.min(0.9, ratio))));
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد حجم ترجمة النص:', error);
    return Math.max(12, Math.round(getFontSize(projectState) * defaultRatio));
  }
}

/**
 * استرداد لون ترجمة النص
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {string} - لون ترجمة النص
 */
export function getTranslationFontColor(projectState) {
  try {
    return projectState?.textStyle?.translationFontColor || 
           defaultTextStyleState.translationFontColor;
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد لون ترجمة النص:', error);
    return defaultTextStyleState.translationFontColor;
  }
}

/**
 * استرداد خط ترجمة النص
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {string} - خط ترجمة النص
 */
export function getTranslationFontFamily(projectState) {
  try {
    return projectState?.textStyle?.translationFontFamily || 
           defaultTextStyleState.translationFontFamily;
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد خط ترجمة النص:', error);
    return defaultTextStyleState.translationFontFamily;
  }
}

/**
 * استرداد تمكين إظهار الترجمة
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @returns {boolean} - هل يتم إظهار الترجمة؟
 */
export function getShowTranslation(projectState) {
  try {
    return projectState?.textStyle?.showTranslation !== undefined ? 
           projectState.textStyle.showTranslation : 
           defaultTextStyleState.showTranslation;
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد إظهار الترجمة:', error);
    return defaultTextStyleState.showTranslation;
  }
}

/**
 * (مثال على محدد مشتق)
 * استرداد أبعاد النص مع جميع العوامل المؤثرة
 * @param {import('../../core/state-store.js').ProjectState | null} projectState - حالة المشروع
 * @param {number} contentWidth - عرض المحتوى المتاح
 * @returns {Object} - أبعاد النص
 */
export function getTextDimensions(projectState, contentWidth = 800) {
  try {
    const fontSize = getFontSize(projectState);
    const lineHeight = fontSize * getLineHeightMultiplier(projectState);
    const letterSpacing = getLetterSpacing(projectState);
    
    // هذه قيمة تقريبية، في التطبيق الفعلي يمكن استخدام Canvas لقياس الأبعاد بدقة
    const estimatedCharsPerLine = Math.floor((contentWidth - (2 * APP_CONSTANTS.VIDEO_PADDING)) / 
                                            (fontSize * 0.5)); // 0.5 هو معامل تقريبي
                                            
    return {
      fontSize,
      lineHeight,
      letterSpacing,
      estimatedCharsPerLine,
      padding: APP_CONSTANTS.VIDEO_PADDING,
      maxWidth: contentWidth
    };
  } catch (error) {
    console.error('[TextStateAdapter] خطأ في استرداد أبعاد النص:', error);
    return {
      fontSize: defaultTextStyleState.fontSize,
      lineHeight: defaultTextStyleState.fontSize * defaultTextStyleState.lineHeightMultiplier,
      letterSpacing: defaultTextStyleState.letterSpacing,
      estimatedCharsPerLine: 40,
      padding: APP_CONSTANTS.VIDEO_PADDING,
      maxWidth: contentWidth
    };
  }
}

/**
 * وظيفة التهيئة للوحدة
 * @param {object} [dependencies] - الاعتمادات الاختيارية
 * @param {Function} [dependencies.logger] - وظيفة تسجيل الأخطاء
 */
export function initializeTextStateAdapter(dependencies = {}) {
  const { logger } = dependencies;
  
  try {
    // تسجيل بدء التهيئة
    logger?.info?.('[TextStateAdapter] بدء تهيئة المحددات...');
    
    // التحقق من صحة الإعدادات الافتراضية
    if (!defaultTextStyleState || typeof defaultTextStyleState !== 'object') {
      throw new Error('الإعدادات الافتراضية غير صحيحة');
    }
    
    // تسجيل النجاح
    logger?.info?.('[TextStateAdapter] تهيئة المحددات بنجاح');
    
    // إرجاع جميع المحددات ككائن واحد
    return {
      getTextStyleSettings,
      getFontFamily,
      getFontSize,
      getFontColor,
      getTextBackgroundColor,
      getTextAnimation,
      getFontWeight,
      getTextAlign,
      getLineHeightMultiplier,
      getLetterSpacing,
      getIsDirectionRTL,
      getEnableTextShadow,
      getTextShadowColor,
      getTextShadowBlur,
      getTextShadowOffsetX,
      getTextShadowOffsetY,
      getTranslationFontSize,
      getTranslationFontColor,
      getTranslationFontFamily,
      getShowTranslation,
      getTextDimensions,
      defaultTextStyleState
    };
  } catch (error) {
    // تسجيل الخطأ
    logger?.error?.('[TextStateAdapter] خطأ في تهيئة المحددات:', error);
    
    // إرجاع المحددات الافتراضية
    return {
      getTextStyleSettings: () => ({ ...defaultTextStyleState }),
      getFontFamily: () => defaultTextStyleState.fontFamily,
      getFontSize: () => defaultTextStyleState.fontSize,
      getFontColor: () => defaultTextStyleState.fontColor,
      getTextBackgroundColor: () => defaultTextStyleState.textBgColor,
      getTextAnimation: () => defaultTextStyleState.textAnimation,
      getFontWeight: () => defaultTextStyleState.fontWeight,
      getTextAlign: () => defaultTextStyleState.textAlign,
      getLineHeightMultiplier: () => defaultTextStyleState.lineHeightMultiplier,
      getLetterSpacing: () => defaultTextStyleState.letterSpacing,
      getIsDirectionRTL: () => defaultTextStyleState.isDirectionRTL,
      getEnableTextShadow: () => defaultTextStyleState.enableTextShadow,
      getTextShadowColor: () => defaultTextStyleState.textShadowColor,
      getTextShadowBlur: () => defaultTextStyleState.textShadowBlur,
      getTextShadowOffsetX: () => defaultTextStyleState.textShadowOffsetX,
      getTextShadowOffsetY: () => defaultTextStyleState.textShadowOffsetY,
      getTranslationFontSize: (projectState, defaultRatio = 0.6) => 
        Math.max(12, Math.round(defaultTextStyleState.fontSize * defaultRatio)),
      getTranslationFontColor: () => defaultTextStyleState.translationFontColor,
      getTranslationFontFamily: () => defaultTextStyleState.translationFontFamily,
      getShowTranslation: () => defaultTextStyleState.showTranslation,
      getTextDimensions: (projectState, contentWidth = 800) => ({
        fontSize: defaultTextStyleState.fontSize,
        lineHeight: defaultTextStyleState.fontSize * defaultTextStyleState.lineHeightMultiplier,
        letterSpacing: defaultTextStyleState.letterSpacing,
        estimatedCharsPerLine: 40,
        padding: APP_CONSTANTS.VIDEO_PADDING,
        maxWidth: contentWidth
      }),
      defaultTextStyleState: { ...defaultTextStyleState }
    };
  }
}
