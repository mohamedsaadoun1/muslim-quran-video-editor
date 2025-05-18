// js/features/quran-provider/quran.state.config.js

import { DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';

/**
 * @typedef {Object} QuranSelectionStateSchema
 * @property {number | null} surahId - The number of the selected Surah (1-114).
 * @property {number | null} startAyah - The starting Ayah number within the selected Surah.
 * @property {number | null} endAyah - The ending Ayah number within the selected Surah.
 * @property {string | null} reciterId - The identifier of the selected reciter/audio edition.
 * @property {string | null} translationId - The identifier of the selected translation edition (null for none).
 * @property {number} delayBetweenAyahs - Delay in seconds between playing consecutive Ayahs.
 * @property {Object.<number, {start: number, end: number, text?: string}>} [ayahTimings] - Optional: Store timings for each global Ayah number for advanced sync.
 *                                                                                            Key: globalAyahNumber.
 * @property {Array<PlaylistItemFromState>} [currentPlaylistItems] - Optional: A representation of the current playlist
 *                                                                     derived from surah/ayah selection. Not for direct user edit usually.
 *                                                                     This is more for state representation if main-playback.controller updates it.
 * // @property {number | null} currentDisplayingAyahGlobalNumber - If renderer needs to know which specific ayah is 'active'.
 */

/**
 * @typedef {Object} PlaylistItemFromState
 * @property {number} ayahGlobalNumber
 * @property {string | null} text - Arabic text.
 * @property {string | null} translationText - Translated text if translationId is set.
 * @property {string | null} audioUrl - Will be populated by retriever.
 * @property {number | null} duration - Will be populated by retriever.
 */


/**
 * Default state for the Quran selection part of a project.
 * This should be consistent with DEFAULT_PROJECT_SCHEMA.quranSelection.
 * @type {QuranSelectionStateSchema}
 */
export const defaultQuranSelectionState = {
  ...DEFAULT_PROJECT_SCHEMA.quranSelection, // Use defaults from app constants
  // Explicitly list them here too for clarity or if this schema needs to evolve independently for some reason
  // surahId: 1,
  // startAyah: 1,
  // endAyah: 7,
  // reciterId: 'ar.alafasy', // Ensure this matches a valid reciter identifier from your data source
  // translationId: null,
  // delayBetweenAyahs: 1.0,
  // ayahTimings: {},
  // currentPlaylistItems: [],
};


// --- SELECTORS ---
// Selectors extract specific pieces of the quranSelection state from a project state object.

/**
 * Gets the complete quranSelection object from the project state.
 * Returns default quran selection state if not found.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {QuranSelectionStateSchema}
 */
export function getQuranSelectionSettings(projectState) {
  return projectState?.quranSelection || { ...defaultQuranSelectionState };
}

/**
 * Gets the selected Surah ID.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {number | null}
 */
export function getSelectedSurahId(projectState) {
  return projectState?.quranSelection?.surahId || defaultQuranSelectionState.surahId;
}

/**
 * Gets the selected starting Ayah number.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {number | null}
 */
export function getSelectedStartAyah(projectState) {
  return projectState?.quranSelection?.startAyah || defaultQuranSelectionState.startAyah;
}

/**
 * Gets the selected ending Ayah number.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {number | null}
 */
export function getSelectedEndAyah(projectState) {
  return projectState?.quranSelection?.endAyah || defaultQuranSelectionState.endAyah;
}

/**
 * Gets the selected Reciter ID.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {string | null}
 */
export function getSelectedReciterId(projectState) {
  return projectState?.quranSelection?.reciterId || defaultQuranSelectionState.reciterId;
}

/**
 * Gets the selected Translation ID.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {string | null}
 */
export function getSelectedTranslationId(projectState) {
  return projectState?.quranSelection?.translationId || defaultQuranSelectionState.translationId;
}

/**
 * Gets the delay in seconds between Ayahs.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {number}
 */
export function getDelayBetweenAyahs(projectState) {
  return projectState?.quranSelection?.delayBetweenAyahs ?? defaultQuranSelectionState.delayBetweenAyahs;
}

/**
 * Gets the ayah timings object (if used).
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {Object.<number, {start: number, end: number}>}
 */
export function getAyahTimings(projectState) {
    return projectState?.quranSelection?.ayahTimings || { ...defaultQuranSelectionState.ayahTimings };
}


// This module, in its current simple form, primarily exports selectors and a default state definition.
// If quranSelection state logic becomes very complex, this file could evolve into a reducer
// that handles actions specific to quranSelection. For now, stateStore handles these directly.

/**
 * Initialization function for QuranStateConfig utilities.
 * (Mostly a placeholder for this type of module in the current architecture).
 * @param {object} [dependencies] - Optional dependencies (e.g., errorLogger).
 * // @param {import('../../core/error-logger.js').default} [dependencies.errorLogger]
 */
export function initializeQuranStateConfig(dependencies = {}) {
  // const { errorLogger } = dependencies;
  // console.info('[QuranStateConfig] Initialized (provides quranSelection selectors and defaults).');

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
  };
}

// Export the selectors and default state directly if preferred for consumption
// For consistency with the init pattern, the init function can return them.
