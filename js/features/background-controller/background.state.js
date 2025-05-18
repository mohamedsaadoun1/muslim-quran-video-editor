// js/features/background-controller/background.state.js

// Constants for background types might be useful if not already in app.constants.js
export const BACKGROUND_TYPES = {
  COLOR: 'color',
  IMAGE: 'image',
  VIDEO: 'video',
  // NONE: 'none' // If you want an explicit "no background" state apart from default color
};

/**
 * @typedef {Object} AISuggestionItem
 * @property {string | number} id
 * @property {'image' | 'video'} type
 * @property {string} url - Main URL for display/use.
 * @property {string} [thumbnailUrl] - Smaller version for previews.
 * @property {string} [photographer]
 * @property {string} [photographerUrl]
 * @property {string} [alt]
 * @property {number} [duration] - For videos.
 */

/**
 * @typedef {Object} AISuggestionsState
 * @property {Array<AISuggestionItem>} photos
 * @property {Array<AISuggestionItem>} videos
 * @property {string | null} query - The query used to fetch these suggestions.
 * @property {boolean} isLoading - True if currently fetching suggestions.
 * @property {string | null} error - Error message if fetching failed.
 * @property {number | null} timestamp - When the suggestions were last updated.
 */

/**
 * @typedef {Object} BackgroundStateSchema
 * @property {BACKGROUND_TYPES.COLOR | BACKGROUND_TYPES.IMAGE | BACKGROUND_TYPES.VIDEO} type - Current background type.
 * @property {string} source - The URL (for image/video) or hex color string.
 * @property {string | null} [fileName] - Name of the imported file, if applicable.
 * @property {AISuggestionsState} aiSuggestions - State for AI-suggested backgrounds.
 * // Add other background-specific state properties here, e.g.,
 * // @property {number} [videoStartTime] - For trimming video backgrounds
 * // @property {number} [videoVolume] - For video background volume
 * // @property {boolean} [isVideoMuted]
 */

/**
 * Defines the default state for the background feature.
 * This is similar to what might be in DEFAULT_PROJECT_SCHEMA.background.
 * Using a separate definition here can be useful if background state becomes very complex.
 * @type {BackgroundStateSchema}
 */
export const defaultBackgroundState = {
  type: BACKGROUND_TYPES.COLOR,
  source: '#0D0D0D', // Default dark color (should match DEFAULT_PROJECT_SCHEMA)
  fileName: null,
  aiSuggestions: {
    photos: [],
    videos: [],
    query: null,
    isLoading: false,
    error: null,
    timestamp: null,
  },
  // videoStartTime: 0,
  // videoVolume: 0.5,
  // isVideoMuted: true,
};


// --- SELECTORS ---
// Selectors are functions that take the global state (or project state)
// and return a specific piece of the background state.
// This helps to encapsulate the structure of the state.

/**
 * Gets the current background settings from the project state.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {BackgroundStateSchema} The background state, or default if no project/background state.
 */
export function getBackgroundSettings(projectState) {
  return projectState?.background || { ...defaultBackgroundState };
}

/**
 * Gets the current background type.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {BACKGROUND_TYPES.COLOR | BACKGROUND_TYPES.IMAGE | BACKGROUND_TYPES.VIDEO}
 */
export function getBackgroundType(projectState) {
  return projectState?.background?.type || defaultBackgroundState.type;
}

/**
 * Gets the current background source (URL or color hex).
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {string}
 */
export function getBackgroundSource(projectState) {
  return projectState?.background?.source || defaultBackgroundState.source;
}

/**
 * Gets the file name of the current background, if applicable.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {string | null}
 */
export function getBackgroundFileName(projectState) {
  return projectState?.background?.fileName || null;
}

/**
 * Gets the current AI background suggestions state.
 * @param {import('../../core/state-store.js').ProjectState | null} projectState
 * @returns {AISuggestionsState}
 */
export function getAISuggestions(projectState) {
    return projectState?.background?.aiSuggestions || { ...defaultBackgroundState.aiSuggestions };
}


// This module, in its current simple form, primarily exports selectors and a default state definition.
// It doesn't have complex internal logic or directly manage UI, so an `initialize...` function
// from moduleBootstrap isn't strictly necessary unless it needed to subscribe to state
// for some internal processing (which is not its role here).

// The 'action creators' related to background are in background.actions.js.
// The UI handlers (color chooser, importer, AI suggest UI) interact with those actions
// or directly with stateStore.

/**
 * Initialization function for BackgroundState utilities.
 * This is mostly a placeholder in this simple version, as the module primarily exports
 * selectors and a default state structure. If it had internal state or needed to
 * subscribe to events for its own logic, this would be more involved.
 * @param {object} dependencies - Not used in this simple version.
 * // @param {import('../../core/state-store.js').default} dependencies.stateStore
 * // @param {import('../../core/error-logger.js').default} dependencies.errorLogger
 */
export function initializeBackgroundStateModule(dependencies) {
  // const { stateStore, errorLogger } = dependencies;
  // console.info('[BackgroundStateModule] Initialized (primarily provides selectors).');

  // Return the selectors or any other utility functions if they need to be "provided"
  // as an API by moduleBootstrap.
  return {
    getBackgroundSettings,
    getBackgroundType,
    getBackgroundSource,
    getBackgroundFileName,
    getAISuggestions,
    BACKGROUND_TYPES,
    defaultBackgroundState
  };
}

// For direct import of selectors, etc.
// Not exporting `backgroundStateModule` as default as its value is in its exported functions/constants.
// The init function is the standard entry for moduleBootstrap.
