// js/features/text-engine/text.state.adapter.js

// Import default text style from app constants to ensure consistency
import { DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';

/**
 * @typedef {Object} TextStyleStateSchema
 * @property {string} fontFamily - e.g., "'Amiri Quran', serif"
 * @property {number} fontSize - Font size in pixels.
 * @property {string} fontColor - Hex or rgba color string.
 * @property {string} textBgColor - Hex or rgba color string for the text's immediate background.
 * @property {string} textAnimation - Key for the text animation type (e.g., 'none', 'fade', 'typewriter').
 * // Add other text style properties if needed:
 * // @property {string} translationFontFamily
 * // @property {number} translationFontSizeRatio - e.g., 0.6 (60% of main font size)
 * // @property {string} fontWeight - e.g., 'normal', 'bold'
 * // @property {'center' | 'left' | 'right' | 'start' | 'end'} textAlign
 * // @property {number} lineHeightMultiplier - e.g., 1.2
 */

/**
 * Default text style state.
 * This should align with `DEFAULT_PROJECT_SCHEMA.textStyle`.
 * Having it here provides a single source of truth for the *shape* of TextStyleState
 * if this module were to become more complex (e.g., having its own reducer logic).
 * @type {TextStyleStateSchema}
 */
export const defaultTextStyleState = {
  ...DEFAULT_PROJECT_SCHEMA.textStyle // Ensure this matches or use this as the source
};


// --- SELECTORS ---
// Selectors retrieve specific pieces of text style state from the global project state.

/**
 * Gets the complete text style object from the project state.
 * Returns default text styles if not found.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {TextStyleStateSchema}
 */
export function getTextStyleSettings(projectState) {
  return projectState?.textStyle || { ...defaultTextStyleState };
}

/**
 * Gets the current font family for Quran text.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {string}
 */
export function getFontFamily(projectState) {
  return projectState?.textStyle?.fontFamily || defaultTextStyleState.fontFamily;
}

/**
 * Gets the current font size for Quran text.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {number}
 */
export function getFontSize(projectState) {
  return projectState?.textStyle?.fontSize || defaultTextStyleState.fontSize;
}

/**
 * Gets the current font color.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {string}
 */
export function getFontColor(projectState) {
  return projectState?.textStyle?.fontColor || defaultTextStyleState.fontColor;
}

/**
 * Gets the background color for the Ayah text block.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {string}
 */
export function getTextBackgroundColor(projectState) {
  return projectState?.textStyle?.textBgColor || defaultTextStyleState.textBgColor;
}

/**
 * Gets the current text animation type.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {string}
 */
export function getTextAnimation(projectState) {
  return projectState?.textStyle?.textAnimation || defaultTextStyleState.textAnimation;
}

/**
 * (Example of a derived selector)
 * Gets the font size for translation text, perhaps as a ratio of the main font size.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @param {number} [defaultRatio=0.6] - Default ratio if not specified in state.
 * @returns {number} Calculated font size for translation.
 */
export function getTranslationFontSize(projectState, defaultRatio = 0.6) {
  const mainFontSize = getFontSize(projectState);
  // const ratio = projectState?.textStyle?.translationFontSizeRatio || defaultRatio; // If you add this to state
  const ratio = defaultRatio; // Using fixed ratio for now
  return Math.max(12, Math.round(mainFontSize * ratio)); // Ensure a minimum readable size
}


// This module primarily exports selectors and default state.
// An `initialize...` function is not strictly needed unless it has internal state
// or subscriptions, which is not the case for a simple state adapter/selector module.
// However, to fit the pattern for moduleBootstrap, we can provide a no-op or simple init.

/**
 * Initialization function for TextStateAdapter utilities.
 * (Mostly a placeholder for this type of module in the current architecture).
 * @param {object} [dependencies] - Optional dependencies (e.g., errorLogger).
 * // @param {import('../../core/error-logger.js').default} [dependencies.errorLogger]
 */
export function initializeTextStateAdapter(dependencies = {}) {
  // const { errorLogger } = dependencies;
  // console.info('[TextStateAdapter] Initialized (provides text style selectors and defaults).');

  // Return the selectors and any other constants or utilities from this module.
  // This makes them available as a single "API" object if provided by moduleBootstrap.
  return {
    getTextStyleSettings,
    getFontFamily,
    getFontSize,
    getFontColor,
    getTextBackgroundColor,
    getTextAnimation,
    getTranslationFontSize,
    defaultTextStyleState // Expose default state if needed by other modules for comparison or reset
  };
}

// Default export can be the collection of utilities if that's preferred over named exports
// export default {
//   getTextStyleSettings,
//   // ... other selectors
//   defaultTextStyleState
// };
// For consistency with the `initialize...` pattern, the init function is the main export.
