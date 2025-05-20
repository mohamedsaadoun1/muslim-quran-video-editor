// js/features/text-engine/text.styling.options.js

/**
 * الخطوط القرآنية المدعومة
 * @type {Object<string, {name: string, rtl?: boolean, weight?: string}>}
 */
export const SUPPORTED_QURAN_FONTS = {
  "'Amiri Quran', serif": { 
    name: 'Amiri Quran (نسخ تقليدي)', 
    rtl: true,
    weight: 'normal'
  },
  "'Noto Naskh Arabic', serif": { 
    name: 'Noto Naskh Arabic (نسخ واضح)', 
    rtl: true,
    weight: 'normal'
  },
  "'Uthmanic Hafs', 'KFGQPC Uthmanic Script Hafs', serif": { 
    name: 'Uthmanic Hafs (مصحف المدينة)', 
    rtl: true,
    weight: 'bold'
  },
  "'Katibeh', cursive": { 
    name: 'Katibeh (رقعة/ديواني بسيط)',
    rtl: true,
    weight: 'normal'
  },
  "'Tajawal', sans-serif": { 
    name: 'Tajawal (حديث وبسيط)', 
    rtl: true,
    weight: 'normal'
  },
  "'Arial', sans-serif": { 
    name: 'Arial (نظام)', 
    rtl: false,
    weight: 'normal'
  }
};

/**
 * الخطوط المدعومة للترجمة
 * @type {Object<string, {name: string, rtl?: boolean, weight?: string}>}
 */
export const SUPPORTED_TRANSLATION_FONTS = {
  "'Tajawal', sans-serif": { 
    name: 'Tajawal (واجهة المستخدم - الافتراضي)', 
    rtl: true,
    weight: 'normal'
  },
  "'Roboto', sans-serif": { 
    name: 'Roboto (نظام)', 
    rtl: false,
    weight: 'normal'
  },
  "'Open Sans', sans-serif": { 
    name: 'Open Sans (نظام)', 
    rtl: false,
    weight: 'normal'
  },
  "'Noto Sans', sans-serif": { 
    name: 'Noto Sans (دعم متعدد اللغات)', 
    rtl: false,
    weight: 'normal'
  }
};

/**
 * إعدادات الحجم
 * @type {Object}
 * @property {number} MIN_FONT_SIZE_PX - الحد الأدنى لحجم الخط بالبكسل
 * @property {number} MAX_FONT_SIZE_PX - الحد الأقصى لحجم الخط بالبكسل
 * @property {number} DEFAULT_FONT_SIZE_PX - حجم الخط الافتراضي
 * @property {number} DEFAULT_TRANSLATION_FONT_SIZE_RATIO - نسبة حجم الترجمة من حجم الخط الرئيسي
 * @property {number} DEFAULT_LINE_HEIGHT_MULTIPLIER - مضاعف المسافة بين السطور
 * @property {number} DEFAULT_LETTER_SPACING - المسافة الافتراضية بين الحروف
 */
export const FONT_SIZE_SETTINGS = {
  MIN_FONT_SIZE_PX: 12,
  MAX_FONT_SIZE_PX: 150,
  DEFAULT_FONT_SIZE_PX: 48,
  DEFAULT_TRANSLATION_FONT_SIZE_RATIO: 0.6,
  DEFAULT_LINE_HEIGHT_MULTIPLIER: 1.2,
  DEFAULT_LETTER_SPACING: 0
};

/**
 * تأثيرات النص المدعومة
 * @type {Object<string, {name: string, defaultDurationMs: number, cssAnimation?: string}>}
 */
export const SUPPORTED_TEXT_ANIMATIONS = {
  'none': { 
    name: 'بدون تأثير', 
    defaultDurationMs: 0
  },
  'fade': { 
    name: 'تلاشي (Fade In)', 
    defaultDurationMs: 700,
    cssAnimation: 'fadeIn'
  },
  'typewriter': { 
    name: 'كتابة تدريجية (Typewriter)', 
    defaultDurationMs: 1000,
    cssAnimation: 'typewriter'
  },
  'slideUp': { 
    name: 'انزلاق للأعلى (Slide Up)', 
    defaultDurationMs: 500,
    cssAnimation: 'slideUp'
  },
  'zoom': { 
    name: 'تكبير (Zoom)', 
    defaultDurationMs: 600,
    cssAnimation: 'zoomIn'
  },
  'swipe': { 
    name: 'مسح (Swipe)', 
    defaultDurationMs: 800,
    cssAnimation: 'swipe'
  }
};

/**
 * ألوان الخط الافتراضية
 * @type {Object<string, {name: string, value: string, contrastColor?: string}>}
 */
export const PREDEFINED_FONT_COLORS = {
  white: { 
    name: 'أبيض', 
    value: '#FFFFFF',
    contrastColor: '#000000'
  },
  black: { 
    name: 'أسود', 
    value: '#000000',
    contrastColor: '#FFFFFF'
  },
  lightGolden: { 
    name: 'ذهبي فاتح', 
    value: '#FFD700',
    contrastColor: '#000000'
  },
  lightBlue: { 
    name: 'أزرق سماوي', 
    value: '#ADD8E6',
    contrastColor: '#000000'
  },
  darkGreen: { 
    name: 'أخضر داكن', 
    value: '#006400',
    contrastColor: '#FFFFFF'
  },
  royalPurple: { 
    name: 'بنفسجي ملكي', 
    value: '#702963',
    contrastColor: '#FFFFFF'
  }
};

/**
 * ألوان خلفية النص الافتراضية
 * @type {Object<string, {name: string, value: string, isTransparent?: boolean}>}
 */
export const PREDEFINED_TEXT_BACKGROUND_COLORS = {
  transparent: { 
    name: 'شفاف', 
    value: 'transparent',
    isTransparent: true
  },
  semiBlack: { 
    name: 'أسود شبه شفاف', 
    value: 'rgba(0, 0, 0, 0.5)',
    isTransparent: true
  },
  semiWhite: { 
    name: 'أبيض شبه شفاف', 
    value: 'rgba(255, 255, 255, 0.3)',
    isTransparent: true
  },
  darkGray: { 
    name: 'رمادي داكن', 
    value: 'rgba(50, 50, 50, 0.7)',
    isTransparent: true
  },
  lightBeige: { 
    name: 'بيج فاتح', 
    value: 'rgba(245, 245, 220, 0.6)',
    isTransparent: true
  }
};

/**
 * خيارات محاذاة النص
 * @type {Object<string, {name: string, cssValue: string, rtlOnly?: boolean}>}
 */
export const SUPPORTED_TEXT_ALIGNMENTS = {
  'center': { 
    name: 'توسيط', 
    cssValue: 'center'
  },
  'right': { 
    name: 'يمين', 
    cssValue: 'right',
    rtlOnly: false
  },
  'left': { 
    name: 'يسار', 
    cssValue: 'left',
    rtlOnly: false
  },
  'start': { 
    name: 'بداية السطر', 
    cssValue: 'start',
    rtlOnly: true
  },
  'end': { 
    name: 'نهاية السطر', 
    cssValue: 'end',
    rtlOnly: true
  }
};

/**
 * خيارات اتجاه النص
 * @type {Object<string, {name: string, cssDirection: string, isRTL: boolean}>}
 */
export const SUPPORTED_TEXT_DIRECTIONS = {
  rtl: { 
    name: 'من اليمين لليسار', 
    cssDirection: 'rtl',
    isRTL: true
  },
  ltr: { 
    name: 'من اليسار لليمين', 
    cssDirection: 'ltr',
    isRTL: false
  }
};

/**
 * خيارات وزن الخط
 * @type {Object<string, {name: string, cssValue: string | number, weightNumber: number}>}
 */
export const SUPPORTED_FONT_WEIGHTS = {
  normal: { 
    name: 'عادي', 
    cssValue: 'normal',
    weightNumber: 400
  },
  bold: { 
    name: 'عريض', 
    cssValue: 'bold',
    weightNumber: 700
  },
  extraBold: { 
    name: 'عريض جداً', 
    cssValue: '800',
    weightNumber: 800
  }
};

/**
 * خيارات تنسيق النص
 * @type {Object<string, {name: string, cssValue: string}>}
 */
export const SUPPORTED_TEXT_DECORATIONS = {
  none: { 
    name: 'بدون تنسيق', 
    cssValue: 'none'
  },
  underline: { 
    name: 'تسطير', 
    cssValue: 'underline'
  },
  lineThrough: { 
    name: 'خط في المنتصف', 
    cssValue: 'line-through'
  }
};

/**
 * خيارات تمييز النص
 * @type {Object<string, {name: string, cssValue: string}>}
 */
export const SUPPORTED_TEXT_HIGHLIGHTS = {
  none: { 
    name: 'بدون تمييز', 
    cssValue: 'none'
  },
  highlight: { 
    name: 'تمييز', 
    cssValue: 'yellow'
  },
  highlightLightBlue: { 
    name: 'تمييز أزرق فاتح', 
    cssValue: 'lightblue'
  }
};

/**
 * خيارات زوايا تقويس الحواف
 * @type {Object<string, {name: string, cssValue: string}>}
 */
export const SUPPORTED_BORDER_RADII = {
  none: { 
    name: 'بدون تقويس', 
    cssValue: '0%'
  },
  slight: { 
    name: 'تقويس قليل', 
    cssValue: '5%'
  },
  moderate: { 
    name: 'تقويس معتدل', 
    cssValue: '15%'
  },
  full: { 
    name: 'تقويس كامل', 
    cssValue: '50%'
  }
};

/**
 * خيارات تأثيرات الظل
 * @type {Object<string, {name: string, value: Object}>}
 */
export const SUPPORTED_SHADOW_EFFECTS = {
  none: { 
    name: 'بدون ظل', 
    value: {
      color: 'transparent',
      blur: 0,
      offsetX: 0,
      offsetY: 0
    }
  },
  subtle: { 
    name: 'ظل خفيف', 
    value: {
      color: 'rgba(0, 0, 0, 0.2)',
      blur: 2,
      offsetX: 1,
      offsetY: 1
    }
  },
  medium: { 
    name: 'ظل معتدل', 
    value: {
      color: 'rgba(0, 0, 0, 0.4)',
      blur: 4,
      offsetX: 2,
      offsetY: 2
    }
  },
  strong: { 
    name: 'ظل قوي', 
    value: {
      color: 'rgba(0, 0, 0, 0.6)',
      blur: 8,
      offsetX: 4,
      offsetY: 4
    }
  }
};

/**
 * خيارات ترتيب الطبقة
 * @type {Object<string, {name: string, cssValue: string | number, zIndex: number}>}
 */
export const SUPPORTED_Z_INDEXES = {
  background: { 
    name: 'خلف الخلفية', 
    cssValue: -1,
    zIndex: -1
  },
  default: { 
    name: 'الوضع الافتراضي', 
    cssValue: 0,
    zIndex: 0
  },
  foreground: { 
    name: 'أمام الخلفية', 
    cssValue: 1,
    zIndex: 1
  },
  overlay: { 
    name: 'طبقة فوق الكل', 
    cssValue: 2,
    zIndex: 2
  }
};

/**
 * خيارات التباعد بين الحروف
 * @type {Object<string, {name: string, value: number, unit: string}>}
 */
export const SUPPORTED_LETTER_SPACINGS = {
  tight: { 
    name: 'ضيق', 
    value: -1,
    unit: 'px'
  },
  normal: { 
    name: 'عادي', 
    value: 0,
    unit: 'px'
  },
  wide: { 
    name: 'واسع', 
    value: 2,
    unit: 'px'
  },
  extraWide: { 
    name: 'واسع جداً', 
    value: 5,
    unit: 'px'
  }
};

/**
 * خيارات التباعد بين السطور
 * @type {Object<string, {name: string, value: number, unit: string}>}
 */
export const SUPPORTED_LINE_HEIGHTS = {
  compact: { 
    name: 'مضغوط', 
    value: 0.8,
    unit: 'em'
  },
  normal: { 
    name: 'عادي', 
    value: 1.2,
    unit: 'em'
  },
  spacious: { 
    name: 'واسع', 
    value: 1.5,
    unit: 'em'
  },
  extraSpacious: { 
    name: 'واسع جداً', 
    value: 1.8,
    unit: 'em'
  }
};

/**
 * خيارات اتجاه النص
 * @type {Object<string, {name: string, value: string}>}
 */
export const TEXT_DIRECTION_OPTIONS = {
  rtl: { 
    name: 'من اليمين لليسار', 
    value: 'rtl'
  },
  ltr: { 
    name: 'من اليسار لليمين', 
    value: 'ltr'
  }
};

/**
 * خيارات تأثيرات الانتقال
 * @type {Object<string, {name: string, value: string, duration: number, timingFunction: string}>}
 */
export const SUPPORTED_TRANSITIONS = {
  none: { 
    name: 'بدون انتقال', 
    value: 'none',
    duration: 0,
    timingFunction: 'linear'
  },
  fast: { 
    name: 'سريع', 
    value: 'all 0.2s',
    duration: 200,
    timingFunction: 'ease-in-out'
  },
  smooth: { 
    name: 'سلس', 
    value: 'all 0.5s',
    duration: 500,
    timingFunction: 'ease'
  },
  slow: { 
    name: 'بطيء', 
    value: 'all 1s',
    duration: 1000,
    timingFunction: 'linear'
  }
};

/**
 * خيارات الترتيب
 * @type {Object<string, {name: string, value: string, order: number}>}
 */
export const SUPPORTED_DISPLAY_ORDERS = {
  default: { 
    name: 'الترتيب الافتراضي', 
    value: 'default',
    order: 0
  },
  reversed: { 
    name: 'عكس الترتيب', 
    value: 'reversed',
    order: 1
  }
};

/**
 * خيارات التوجيه
 * @type {Object<string, {name: string, value: string}>}
 */
export const SUPPORTED_FLEX_JUSTIFY_CONTENT = {
  start: { 
    name: 'ابدأ', 
    value: 'flex-start'
  },
  end: { 
    name: 'نهاية', 
    value: 'flex-end'
  },
  center: { 
    name: 'مركز', 
    value: 'center'
  },
  spaceBetween: { 
    name: 'مسافة بين', 
    value: 'space-between'
  },
  spaceAround: { 
    name: 'مسافة حول', 
    value: 'space-around'
  }
};

/**
 * خيارات التوزيع
 * @type {Object<string, {name: string, value: string}>}
 */
export const SUPPORTED_FLEX_ALIGN_ITEMS = {
  start: { 
    name: 'ابدأ', 
    value: 'flex-start'
  },
  end: { 
    name: 'نهاية', 
    value: 'flex-end'
  },
  center: { 
    name: 'مركز', 
    value: 'center'
  },
  stretch: { 
    name: 'تمديد', 
    value: 'stretch'
  },
  baseline: { 
    name: 'خط الأساس', 
    value: 'baseline'
  }
};

/**
 * وظيفة التهيئة
 * @param {Object} [dependencies] - الاعتمادات الاختيارية
 * @returns {Object} - جميع الخيارات المتوفرة
 */
export function initializeTextStylingOptions(dependencies = {}) {
  // يمكن استخدام الاعتمادات لتسجيل الأحداث أو التحقق من البيئة
  return {
    SUPPORTED_QURAN_FONTS,
    SUPPORTED_TRANSLATION_FONTS,
    FONT_SIZE_SETTINGS,
    SUPPORTED_TEXT_ANIMATIONS,
    PREDEFINED_FONT_COLORS,
    PREDEFINED_TEXT_BACKGROUND_COLORS,
    SUPPORTED_TEXT_ALIGNMENTS,
    SUPPORTED_TEXT_DIRECTIONS,
    SUPPORTED_FONT_WEIGHTS,
    SUPPORTED_TEXT_DECORATIONS,
    SUPPORTED_TEXT_HIGHLIGHTS,
    SUPPORTED_BORDER_RADII,
    SUPPORTED_SHADOW_EFFECTS,
    SUPPORTED_Z_INDEXES,
    SUPPORTED_LETTER_SPACINGS,
    SUPPORTED_LINE_HEIGHTS,
    TEXT_DIRECTION_OPTIONS,
    SUPPORTED_TRANSITIONS,
    SUPPORTED_DISPLAY_ORDERS,
    SUPPORTED_FLEX_JUSTIFY_CONTENT,
    SUPPORTED_FLEX_ALIGN_ITEMS
  };
}

// التصدير الافتراضي
export default {
  SUPPORTED_QURAN_FONTS,
  SUPPORTED_TRANSLATION_FONTS,
  FONT_SIZE_SETTINGS,
  SUPPORTED_TEXT_ANIMATIONS,
  PREDEFINED_FONT_COLORS,
  PREDEFINED_TEXT_BACKGROUND_COLORS,
  SUPPORTED_TEXT_ALIGNMENTS,
  SUPPORTED_TEXT_DIRECTIONS,
  SUPPORTED_FONT_WEIGHTS,
  SUPPORTED_TEXT_DECORATIONS,
  SUPPORTED_TEXT_HIGHLIGHTS,
  SUPPORTED_BORDER_RADII,
  SUPPORTED_SHADOW_EFFECTS,
  SUPPORTED_Z_INDEXES,
  SUPPORTED_LETTER_SPACINGS,
  SUPPORTED_LINE_HEIGHTS,
  TEXT_DIRECTION_OPTIONS,
  SUPPORTED_TRANSITIONS,
  SUPPORTED_DISPLAY_ORDERS,
  SUPPORTED_FLEX_JUSTIFY_CONTENT,
  SUPPORTED_FLEX_ALIGN_ITEMS
};
