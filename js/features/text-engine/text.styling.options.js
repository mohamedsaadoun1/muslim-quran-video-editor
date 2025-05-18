// js/features/text-engine/text.styling.options.js

// --- FONT FAMILIES ---
/**
 * Supported Quranic script font families.
 * Key: CSS font-family string.
 * Value: Object with a 'name' for display in UI.
 * Ensure these fonts are loaded via CSS @import or <link> in HTML.
 */
export const SUPPORTED_QURAN_FONTS = {
  "'Amiri Quran', serif": { name: 'Amiri Quran (نسخ تقليدي)' },
  "'Noto Naskh Arabic', serif": { name: 'Noto Naskh Arabic (نسخ واضح)' },
  "'Uthmanic Hafs', 'KFGQPC Uthmanic Script Hafs', serif": { name: 'Uthmanic Hafs (مصحف المدينة)' },
  "'Katibeh', cursive": { name: 'Katibeh (رقعة/ديواني بسيط)' },
  "'Tajawal', sans-serif": { name: 'Tajawal (حديث وبسيط)' },
  // Example of a common system font as fallback or option
  "'Arial', sans-serif": { name: 'Arial (نظام)' },
};

/**
 * Supported font families for translation text (if different or allowing separate choice).
 */
export const SUPPORTED_TRANSLATION_FONTS = {
  "'Tajawal', sans-serif": { name: 'Tajawal (UI Font - Default)' },
  "'Roboto', sans-serif": { name: 'Roboto (نظام)' },
  "'Open Sans', sans-serif": { name: 'Open Sans (نظام)' },
  // ... more UI-friendly fonts
};


// --- FONT SIZES ---
export const MIN_FONT_SIZE_PX = 12;
export const MAX_FONT_SIZE_PX = 150;
export const DEFAULT_FONT_SIZE_PX = 48; // Should align with DEFAULT_PROJECT_SCHEMA


// --- TEXT ANIMATIONS / EFFECTS ---
/**
 * Supported text appearance animations.
 * Key: Identifier string for the animation.
 * Value: Object with a 'name' for display in UI.
 * The actual animation logic is handled by text.rendering.logic.js
 */
export const SUPPORTED_TEXT_ANIMATIONS = {
  'none': { name: 'بدون تأثير', defaultDurationMs: 0 },
  'fade': { name: 'تلاشي (Fade In)', defaultDurationMs: 700 },
  'typewriter': { name: 'كتابة تدريجية (Typewriter)', defaultDurationMs: 100 }, // This might be per character
  'slideUp': { name: 'انزلاق للأعلى (Slide Up)', defaultDurationMs: 500 },
  // 'reveal': { name: 'ظهور تدريجي (Reveal)', defaultDurationMs: 1000},
};


// --- PREDEFINED COLORS (Optional) ---
// If you want to offer a palette instead of/in addition to a full color picker.
export const PREDEFINED_FONT_COLORS = {
  white: { name: 'أبيض', value: '#FFFFFF' },
  black: { name: 'أسود', value: '#000000' },
  lightGolden: { name: 'ذهبي فاتح', value: '#FFD700' }, // Example
  lightBlue: { name: 'أزرق سماوي', value: '#ADD8E6' },   // Example
};

export const PREDEFINED_TEXT_BACKGROUND_COLORS = {
  transparent: { name: 'شفاف', value: 'transparent' }, // or 'rgba(0,0,0,0)'
  semiBlack: { name: 'أسود شبه شفاف', value: 'rgba(0, 0, 0, 0.5)' },
  semiWhite: { name: 'أبيض شبه شفاف', value: 'rgba(255, 255, 255, 0.3)' },
  darkGray: { name: 'رمادي داكن', value: 'rgba(50, 50, 50, 0.7)' },
};


// --- TEXT ALIGNMENT (If you add this feature) ---
// export const SUPPORTED_TEXT_ALIGNMENTS = {
//   'center': { name: 'توسيط', cssValue: 'center' },
//   'right': { name: 'يمين', cssValue: 'right' }, // For LTR text context, visual right
//   'left': { name: 'يسار', cssValue: 'left' },   // For LTR text context, visual left
//   'start': { name: 'بداية السطر', cssValue: 'start' }, // Respects LTR/RTL direction
//   'end': { name: 'نهاية السطر', cssValue: 'end' },     // Respects LTR/RTL direction
// };


// This module primarily exports constants/configurations.
// No initialization function is typically needed from moduleBootstrap.
// Other modules will import these constants directly.

// To make it fit the `initialize...` pattern if absolutely required by moduleBootstrap for consistency,
// though it's not typical for a constants-only file:
// export function initializeTextStylingOptions(dependencies) {
//   // No operations needed, just make constants available if moduleBootstrap
//   // uses a 'provides' mechanism for all initialized modules.
//   return {
//     SUPPORTED_QURAN_FONTS,
//     SUPPORTED_TRANSLATION_FONTS,
//     MIN_FONT_SIZE_PX,
//     MAX_FONT_SIZE_PX,
//     DEFAULT_FONT_SIZE_PX,
//     SUPPORTED_TEXT_ANIMATIONS,
//     PREDEFINED_FONT_COLORS,
//     PREDEFINED_TEXT_BACKGROUND_COLORS,
//   };
// }
