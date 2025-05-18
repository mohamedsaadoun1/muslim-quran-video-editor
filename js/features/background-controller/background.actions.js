// js/features/background-controller/background.actions.js

import { ACTIONS } from '../../config/app.constants.js';
// import fileIOUtils from '../../services/file.io.utils.js'; // Only if actions perform file operations directly (less common for pure action creators)

// Note: This module will mostly contain action creators.
// The actual logic that uses these actions and interacts with services (like fileIOUtils)
// would typically be in the UI modules (e.g., background-importer.ui.js, background-color.chooser.js)
// or in a more dedicated "background.logic.js" or "background.service.js" if operations become complex.
// For this structure, UI modules will likely dispatch directly using ACTIONS constants or call simpler action creators here.

// Store a reference to the dispatch function after initialization.
let _dispatch = () => { console.warn('[BackgroundActions] Dispatch function not set. Call initializeBackgroundActions.')};


/**
 * Action creator to set the background type and source.
 * This is a higher-level action that might be dispatched from UI handlers.
 * @param {'color' | 'image' | 'video'} type - The type of the background.
 * @param {string} source - The source URL (for image/video) or color hex string.
 * @param {string} [fileName] - Optional: The name of the file if type is image or video.
 */
function setBackground(type, source, fileName) {
  if (!type || !source) {
    // _dispatch an error action or log, depending on error handling strategy
    // For now, let _dispatch in stateStore handle bad payloads if not caught by UI
    console.warn('[BackgroundActions] setBackground called with invalid type or source.', { type, source });
    return; // Or return an error action object if using a different pattern
  }

  const payload = {
    background: {
      type: type,
      source: source,
      ...(fileName && { fileName: fileName }), // Add fileName if provided
      // Reset AI suggestions when manually setting background
      aiSuggestions: { photos: [], videos: [], query: null, isLoading: false, error: null }
    }
  };
  _dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, payload);
}

/**
 * Action creator to specifically set a color background.
 * @param {string} colorHex - The hex string for the color (e.g., "#RRGGBB").
 */
function setBackgroundColor(colorHex) {
  if (!colorHex || typeof colorHex !== 'string' || !colorHex.startsWith('#')) {
    console.warn('[BackgroundActions] setBackgroundColor called with invalid color hex.', colorHex);
    return;
  }
  setBackground('color', colorHex, null); // fileName is null for color
}

/**
 * Action creator for when a background image file is successfully processed.
 * @param {string} imageDataUrl - The Data URL of the image.
 * @param {string} imageName - The name of the image file.
 */
function setBackgroundImageFile(imageDataUrl, imageName) {
  if (!imageDataUrl || !imageName) {
     console.warn('[BackgroundActions] setBackgroundImageFile called with invalid imageDataUrl or imageName.');
     return;
  }
  setBackground('image', imageDataUrl, imageName);
}

/**
 * Action creator for when a background video file is successfully processed.
 * @param {string} videoObjectUrl - The Object URL of the video.
 * @param {string} videoName - The name of the video file.
 */
function setBackgroundVideoFile(videoObjectUrl, videoName) {
   if (!videoObjectUrl || !videoName) {
     console.warn('[BackgroundActions] setBackgroundVideoFile called with invalid videoObjectUrl or videoName.');
     return;
  }
  setBackground('video', videoObjectUrl, videoName);
}

/**
 * Action creator to update the AI-suggested backgrounds in the state.
 * @param {object} suggestionsPayload - The payload from background-ai.connector.js.
 * @param {Array<object>} suggestionsPayload.photos
 * @param {Array<object>} suggestionsPayload.videos
 * @param {string | null} suggestionsPayload.query
 * @param {boolean} suggestionsPayload.isLoading
 * @param {string | null} suggestionsPayload.error
 */
function updateAISuggestions(suggestionsPayload) {
  _dispatch(ACTIONS.SET_AI_SUGGESTIONS, suggestionsPayload);
}

/**
 * Action creator to clear AI suggestions from the state.
 */
function clearAISuggestions() {
    const clearPayload = { photos: [], videos: [], query: null, isLoading: false, error: null };
    _dispatch(ACTIONS.SET_AI_SUGGESTIONS, clearPayload);
}

/**
 * Action creator to update a specific property of the current background state.
 * Useful for more granular updates if needed.
 * @param {Partial<import('../core/state-store.js').BackgroundState>} backgroundChanges
 */
function updateBackgroundProperty(backgroundChanges) {
    if (typeof backgroundChanges !== 'object' || backgroundChanges === null) {
        console.warn('[BackgroundActions] updateBackgroundProperty called with invalid changes.', backgroundChanges);
        return;
    }
    _dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { background: backgroundChanges });
}


// The module object itself doesn't need an IIFE if we are exporting action creators as functions.
const backgroundActions = {
  // No _setDependencies needed in this model if stateStore's dispatch is injected directly
  // into initializeBackgroundActions or used via closure.
  
  setBackground,
  setBackgroundColor,
  setBackgroundImageFile,
  setBackgroundVideoFile,
  updateAISuggestions,
  clearAISuggestions,
  updateBackgroundProperty,
  // No real "instance" API needed from this if it only provides action creator functions.
  // The `_dispatch` will be set by `initializeBackgroundActions`.
};


/**
 * Initialization function for BackgroundActions.
 * Primarily to inject the stateStore's dispatch function.
 * @param {object} dependencies
 * @param {import('../../core/state-store.js').default} dependencies.stateStore - For its dispatch method.
 * @param {import('../../core/error-logger.js').default} [dependencies.errorLogger] - Optional, for logging within actions if complex logic arises.
 */
export function initializeBackgroundActions(dependencies) {
  if (dependencies && dependencies.stateStore && typeof dependencies.stateStore.dispatch === 'function') {
    _dispatch = dependencies.stateStore.dispatch;
    // console.info('[BackgroundActions] Initialized with stateStore dispatch.');
  } else {
    const logger = (dependencies && dependencies.errorLogger) || console;
    (logger.logWarning || logger.warn).call(logger, {
        message: 'StateStore or its dispatch function not provided to initializeBackgroundActions. Actions will not be dispatched.',
        origin: 'initializeBackgroundActions'
    });
  }
  
  // Return the action creator functions so they can be provided as an API if needed.
  return {
    setBackground: backgroundActions.setBackground,
    setBackgroundColor: backgroundActions.setBackgroundColor,
    setBackgroundImageFile: backgroundActions.setBackgroundImageFile,
    setBackgroundVideoFile: backgroundActions.setBackgroundVideoFile,
    updateAISuggestions: backgroundActions.updateAISuggestions,
    clearAISuggestions: backgroundActions.clearAISuggestions,
    updateBackgroundProperty: backgroundActions.updateBackgroundProperty,
  };
}

// It's common to export the individual action creators if UI modules will call them directly.
// export { setBackground, setBackgroundColor, ... };
// Or export the whole object as default if moduleBootstrap provides it as 'backgroundActionsAPI'.
export default backgroundActions;
