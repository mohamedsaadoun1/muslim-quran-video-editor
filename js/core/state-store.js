// js/core/state-store.js

// Attempt to get a logger instance.
// In a bundled environment, direct import is fine.
// For non-bundled, reliance on window or careful script order is needed.
let localErrorLoggerRef = console; // Default fallback
// Conditional import or assignment:
// try {
//   // This assumes error-logger.js would have been loaded and its default export is the logger.
//   // If error-logger.js also tries to import state-store.js, it can create a circular dependency.
//   // Best approach is to inject errorLogger into modules that need it via moduleBootstrap.
//   // For standalone execution or early init, window object or direct passing is safer.
//   // import errorLoggerInstance from './error-logger.js';
//   // if (errorLoggerInstance) localErrorLoggerRef = errorLoggerInstance;
// } catch (e) {
//   // console.warn('[StateStore] Could not dynamically import error-logger. Using console.');
// }
// If errorLogger is explicitly set on window by main.js for debugging or early access:
if (typeof window !== 'undefined' && window.errorLogger && typeof window.errorLogger.handleError === 'function') {
    localErrorLoggerRef = window.errorLogger;
}


const stateStore = (() => {
  /**
   * @typedef {Object} QuranSelectionState
   * @property {number | null} surahId
   * @property {number | null} startAyah
   * @property {number | null} endAyah
   * @property {string | null} reciterId
   * @property {string | null} translationId
   * @property {Object} ayahTimings - e.g., { 1: {start:0, end:5}, 2: {start: 5.5, end: 10}}
   * @property {number} delayBetweenAyahs
   */

  /**
   * @typedef {Object} BackgroundState
   * @property {'color' | 'image' | 'video'} type
   * @property {string} source - URL or color hex.
   * @property {Array<Object>} [aiSuggestions]
   */

  /**
   * @typedef {Object} TextStyleState
   * @property {string} fontFamily
   * @property {number} fontSize
   * @property {string} fontColor
   * @property {string} textBgColor
   * @property {string} textAnimation
   */

  /**
   * @typedef {Object} VideoCompositionState
   * @property {string} aspectRatio
   * @property {string} videoFilter
   */

  /**
   * @typedef {Object} ExportSettingsState
   * @property {string} resolution
   * @property {string} format
   * @property {number} fps
   */

  /**
   * @typedef {Object} ProjectState
   * @property {string | null} id
   * @property {string} title
   * @property {number | null} createdAt
   * @property {number | null} updatedAt
   * @property {QuranSelectionState} quranSelection
   * @property {BackgroundState} background
   * @property {TextStyleState} textStyle
   * @property {VideoCompositionState} videoComposition
   * @property {ExportSettingsState} exportSettings
   * // Add other project-specific settings here
   */
  
  /**
   * @typedef {Object} AppState
   * @property {string} currentTheme - e.g., 'light' or 'dark'.
   * @property {ProjectState | null} currentProject - The active project being edited.
   * @property {Array<ProjectState>} savedProjects - List of all saved projects.
   * @property {string} activeScreen - e.g., 'initial', 'editor'.
   * @property {boolean} isLoading - Global loading state.
   * @property {{percentage: number, statusMessage: string} | null} exportProgress - Export progress.
   * @property {string | null} currentAppLanguage - e.g., 'ar', 'en' (if managed here)
   * // Can also include UI state not part of a project like activePanelId
   * @property {string | null} activePanelId
   */

  /** @type {AppState} */
  let state = { // Default initial state
    currentTheme: 'light',
    currentProject: null, // No project loaded initially
    savedProjects: [],
    activeScreen: 'initial',
    isLoading: false,
    exportProgress: null,
    currentAppLanguage: 'ar', // Default language
    activePanelId: null,
  };

  const listeners = new Set();
  let history = []; // For basic undo/redo
  let historyIndex = -1;
  const MAX_HISTORY_LENGTH = 20;


  // --- Private helper functions ---
  const _notifyListeners = () => {
    // Iterate over a copy in case a listener tries to unsubscribe/subscribe during notification
    [...listeners].forEach(listener => {
        try {
            listener(getState()); // Pass the new state
        } catch (error) {
            (localErrorLoggerRef.handleError || console.error).call(localErrorLoggerRef, {
                error,
                message: 'Error in stateStore listener callback.',
                origin: 'stateStore._notifyListeners',
            });
        }
    });
  };
  
  const _addToHistory = (newState) => {
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1); // Clear "redo" states
    }
    history.push(JSON.parse(JSON.stringify(newState))); // Store a deep clone

    if (history.length > MAX_HISTORY_LENGTH) {
        history.shift(); // Remove the oldest state
    }
    historyIndex = history.length - 1;
  };


  // --- Public API ---
  /**
   * Returns a shallow copy of the current state.
   * For nested objects, direct modification is still possible if not careful.
   * @returns {Readonly<AppState>}
   */
  const getState = () => {
    // To prevent external modification of the returned state object or its direct properties.
    // However, nested objects within the state can still be mutated if not handled carefully by consumers.
    return { ...state };
  };

  /**
   * Subscribes a listener function to state changes.
   * @param {Function} listener - The function to call when the state changes.
   * @returns {() => void} A function to unsubscribe the listener.
   */
  const subscribe = (listener) => {
    if (typeof listener !== 'function') {
        (localErrorLoggerRef.logWarning || console.warn).call(localErrorLoggerRef, {
            message: 'Attempted to subscribe with a non-function listener.',
            origin: 'stateStore.subscribe'
        });
        return () => {}; // Return a no-op unsubscribe function
    }
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  /**
   * Dispatches an action to update the state.
   * @param {string} actionType - A string identifying the action (e.g., 'SET_THEME' from app.constants.js).
   * @param {any} payload - The data associated with the action.
   * @param {Object} [options] - Additional options.
   * @param {boolean} [options.skipHistory=false] - If true, this state change will not be added to undo/redo history.
   */
  const dispatch = (actionType, payload, options = {}) => {
    // console.debug(`[StateStore] Dispatching: ${actionType}`, payload, options);
    const oldState = JSON.parse(JSON.stringify(state)); // Deep clone for potential revert and history
    let stateChanged = false;

    try {
        // In a real Redux-like app, actionType would be an imported constant (e.g., ACTIONS.SET_THEME)
        // and this switch statement would typically be a root reducer combining smaller reducers.
        // For simplicity and directness with the requested structure, it's a large switch.
        // IMPORTANT: Ensure ACTIONS object from app.constants.js is available or pass action types directly.
        
        // Assume 'ACTIONS' is available globally for this example if not imported directly
        const ACT = (typeof window !== 'undefined' && window.ACTIONS) || (typeof ACTIONS !== 'undefined' ? ACTIONS : {});


        switch (actionType) {
            // THEME
            case ACT.SET_THEME:
                if (typeof payload === 'string' && (payload === 'light' || payload === 'dark') && state.currentTheme !== payload) {
                    state = { ...state, currentTheme: payload };
                    stateChanged = true;
                }
                break;

            // SCREEN NAVIGATION
            case ACT.SET_ACTIVE_SCREEN:
                if (typeof payload === 'string' && state.activeScreen !== payload) {
                    state = { ...state, activeScreen: payload };
                    stateChanged = true;
                }
                break;
             case 'SET_ACTIVE_PANEL_ID': // Example not in constants yet
                if ((payload === null || typeof payload === 'string') && state.activePanelId !== payload) {
                    state = { ...state, activePanelId: payload };
                    stateChanged = true;
                }
                break;

            // LOADING STATE
            case ACT.SET_LOADING:
                if (typeof payload === 'boolean' && state.isLoading !== payload) {
                    state = { ...state, isLoading: payload };
                    stateChanged = true;
                }
                break;

            // PROJECT MANAGEMENT
            case ACT.LOAD_PROJECT: // Payload is the project object (or null to unload)
                // Note: DEFAULT_PROJECT_SCHEMA should be imported or defined if creating new.
                // For loading, assume payload is a valid ProjectState or null.
                state = { ...state, currentProject: payload, activeScreen: payload ? 'editor' : 'initial' };
                history = []; // Clear history when loading a new project
                historyIndex = -1;
                stateChanged = true;
                break;
            case ACT.CREATE_NEW_PROJECT: // Payload: optional initial project data to merge with default
                // const DEFAULT_PROJECT_SCHEMA = (typeof window !== 'undefined' && window.DEFAULT_PROJECT_SCHEMA) || {}; // From app.constants
                // state = { ...state, currentProject: { ...DEFAULT_PROJECT_SCHEMA, id: Date.now().toString(), createdAt: Date.now(), ...payload }, activeScreen: 'editor' };
                // For now, assuming project creation is handled by project.actions.js which dispatches LOAD_PROJECT
                break;

            case ACT.UPDATE_PROJECT_SETTINGS: // Payload is partial project settings
                if (state.currentProject && typeof payload === 'object' && payload !== null) {
                    // Deep merge payload into currentProject, ensuring not to overwrite entire nested objects unintentionally
                    // This needs a robust deep merge or specific handlers for nested properties.
                    // Simple spread for top-level, specific for known nested:
                    let updatedProject = { ...state.currentProject, ...payload };
                    if (payload.quranSelection) updatedProject.quranSelection = { ...state.currentProject.quranSelection, ...payload.quranSelection };
                    if (payload.background) updatedProject.background = { ...state.currentProject.background, ...payload.background };
                    if (payload.textStyle) updatedProject.textStyle = { ...state.currentProject.textStyle, ...payload.textStyle };
                    if (payload.videoComposition) updatedProject.videoComposition = { ...state.currentProject.videoComposition, ...payload.videoComposition };
                    if (payload.exportSettings) updatedProject.exportSettings = { ...state.currentProject.exportSettings, ...payload.exportSettings };
                    
                    updatedProject.updatedAt = Date.now();
                    state = { ...state, currentProject: updatedProject };
                    stateChanged = true;
                }
                break;

            case ACT.SET_PROJECT_TITLE:
                if (state.currentProject && typeof payload === 'string' && state.currentProject.title !== payload) {
                    state = { ...state, currentProject: { ...state.currentProject, title: payload, updatedAt: Date.now() } };
                    stateChanged = true;
                }
                break;
            
            case ACT.ADD_SAVED_PROJECT_TO_LIST: // Payload is project object
                if (payload && typeof payload === 'object') {
                    // Avoid duplicates
                    if (!state.savedProjects.find(p => p.id === payload.id)) {
                        state = { ...state, savedProjects: [...state.savedProjects, payload] };
                        stateChanged = true; // Technically, list changed, not state 'identity'
                    } else { // Update existing if found
                        state = { ...state, savedProjects: state.savedProjects.map(p => p.id === payload.id ? payload : p) };
                        stateChanged = true;
                    }
                }
                break;
            case ACT.UPDATE_SAVED_PROJECTS_LIST: // Payload is the new array of projects
                 if (Array.isArray(payload)) {
                    state = { ...state, savedProjects: payload };
                    stateChanged = true;
                }
                break;
            case ACT.DELETE_PROJECT_FROM_LIST: // Payload is projectId
                if (payload) {
                    state = { ...state, savedProjects: state.savedProjects.filter(p => p.id !== payload) };
                    stateChanged = true;
                }
                break;

            // QURAN SELECTION (assumes currentProject exists)
            case ACT.SET_QURAN_SELECTION:
                if (state.currentProject && payload && typeof payload === 'object') {
                    state = { ...state, currentProject: {
                        ...state.currentProject,
                        quranSelection: { ...state.currentProject.quranSelection, ...payload },
                        updatedAt: Date.now()
                    }};
                    stateChanged = true;
                }
                break;

            // BACKGROUND (assumes currentProject exists)
            case ACT.SET_BACKGROUND_TYPE: // Payload: string type
            case ACT.SET_BACKGROUND_SOURCE: // Payload: string source
                 if (state.currentProject && payload !== undefined) {
                    const keyToUpdate = actionType === ACT.SET_BACKGROUND_TYPE ? 'type' : 'source';
                    state = { ...state, currentProject: {
                        ...state.currentProject,
                        background: { ...state.currentProject.background, [keyToUpdate]: payload },
                        updatedAt: Date.now()
                    }};
                    stateChanged = true;
                }
                break;
            // ... and so on for textStyle, videoComposition, exportSettings, etc.
            // Each would update its respective part of state.currentProject

            // EXPORT PROGRESS
            case ACT.SET_EXPORT_PROGRESS: // Payload: { percentage, statusMessage } or null
                if (state.exportProgress !== payload) { // Basic check, could be deeper for object
                    state = { ...state, exportProgress: payload };
                    stateChanged = true;
                }
                break;
            
            // UNDO/REDO
            case ACT.UNDO_STATE:
                if (historyIndex > 0) {
                    historyIndex--;
                    state = JSON.parse(JSON.stringify(history[historyIndex])); // Deep clone from history
                    stateChanged = true; // Notify listeners about the reverted state
                }
                break;
            case ACT.REDO_STATE:
                if (historyIndex < history.length - 1) {
                    historyIndex++;
                    state = JSON.parse(JSON.stringify(history[historyIndex])); // Deep clone from history
                    stateChanged = true; // Notify listeners
                }
                break;

            default:
                (localErrorLoggerRef.logWarning || console.warn).call(localErrorLoggerRef, {
                    message: `Unknown action type dispatched: ${actionType}`,
                    origin: 'stateStore.dispatch',
                    context: { actionType, payload }
                });
                return; // No state change, no need to notify or add to history
        }

        if (stateChanged) {
            if (!options.skipHistory && actionType !== ACT.UNDO_STATE && actionType !== ACT.REDO_STATE) {
                _addToHistory(oldState); // Add PREVIOUS state to history for undo
            }
            _notifyListeners();
        }

    } catch (error) {
        (localErrorLoggerRef.handleError || console.error).call(localErrorLoggerRef, {
            error,
            message: `Critical error during state update for action: ${actionType}. Attempting to revert state.`,
            origin: 'stateStore.dispatch',
            context: { actionType, payload, previousState: oldState }
        });
        state = oldState; // Attempt to revert state on critical error
        _notifyListeners(); // Notify about reverted state (or error state)
    }
  };

  /**
   * Initializes the store with a persisted state (e.g., from localStorage).
   * This should be called very early in the app lifecycle.
   * @param {Partial<AppState>} persistedState - The state to merge into the initial default state.
   */
  const initializeWithState = (persistedState) => {
    if (persistedState && typeof persistedState === 'object') {
      // More robust merging, especially for nested objects and arrays.
      // This simple spread will overwrite arrays like savedProjects entirely if present in persistedState.
      // It's often better to selectively hydrate parts of the state.
      const newState = { ...state }; // Start with default state

      if (persistedState.currentTheme) newState.currentTheme = persistedState.currentTheme;
      if (persistedState.savedProjects) newState.savedProjects = persistedState.savedProjects;
      if (persistedState.currentAppLanguage) newState.currentAppLanguage = persistedState.currentAppLanguage;
      // currentProject and activeScreen are usually not persisted or reset on load.
      
      state = newState;
      _addToHistory(state); // Add initial (possibly persisted) state as first history item
      // console.info('[StateStore] Initialized with (partially) persisted state.');
      _notifyListeners(); // Notify listeners after initialization
    } else {
        _addToHistory(state); // Add default initial state to history
    }
  };
  
  /**
   * Directly sets the error logger instance for the state store.
   * Useful if errorLogger itself is initialized later by moduleBootstrap.
   * @param {import('./error-logger.js').default} loggerInstance
   */
  const setErrorLogger = (loggerInstance) => {
    if (loggerInstance && typeof loggerInstance.handleError === 'function') {
        localErrorLoggerRef = loggerInstance;
    }
  };


  return {
    getState,
    subscribe,
    dispatch,
    initializeWithState,
    setErrorLogger, // Expose to allow main.js to set it after errorLogger is definitely initialized
    // For debugging (remove in production):
    _getHistory: () => history,
    _getHistoryIndex: () => historyIndex
  };
})();

export default stateStore;
