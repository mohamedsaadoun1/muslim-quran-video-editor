// js/core/state-store.js

// errorLogger will be injected via setErrorLogger by main.js after errorLogger itself is initialized.
let localErrorLoggerRef = console; // Default fallback until properly set.

// Import ACTIONS and DEFAULT_PROJECT_SCHEMA carefully.
// If this file is loaded before app.constants.js in a non-bundled environment,
// direct import might fail. For development, ACTIONS can be on window, or passed.
// Assuming for now that when dispatch is called, ACTIONS are available.
// Let's assume app.constants.js has exported:
// export const ACTIONS = { /* ... */ };
// export const DEFAULT_PROJECT_SCHEMA = { /* ... */ };
// We would import them in a real module setup:
// import { ACTIONS, DEFAULT_PROJECT_SCHEMA } from '../config/app.constants.js';


const stateStore = (() => {
  // --- JSDoc Typedefs for State Structure (for clarity and IntelliSense) ---
  /**
   * @typedef {Object} QuranSelectionState
   * @property {number | null} surahId
   * @property {number | null} startAyah
   * @property {number | null} endAyah
   * @property {string | null} reciterId
   * @property {string | null} translationId
   * @property {number} delayBetweenAyahs
   * @property {Object.<number, {start: number, end: number, text?: string, translationText?: string}>} [ayahTimings] // Key: globalAyahNumber
   * @property {Array<PlaylistItemFromState>} [currentPlaylistForDisplay] // If managed directly in state
   */

  /**
   * @typedef {Object} BackgroundState
   * @property {'color' | 'image' | 'video'} type
   * @property {string} source - URL or color hex.
   * @property {string | null} [fileName]
   * @property {import('../features/background-controller/background.state.js').AISuggestionsState} [aiSuggestions]
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
   * @property {number} [quality]
   */
  
  /**
   * @typedef {Object} BackgroundAudioPlayerState // if state for the player itself is here
   * @property {string | null} fileObjectURL
   * @property {string | null} fileName
   * @property {number} volume
   * @property {boolean} loop
   * @property {boolean} isPlaying
   * @property {number | null} duration
   */

  /**
   * @typedef {Object} ProjectState // This is the structure of `currentProject`
   * @property {string | null} id
   * @property {string} title
   * @property {number | null} createdAt
   * @property {number | null} updatedAt
   * @property {QuranSelectionState} quranSelection
   * @property {BackgroundState} background
   * @property {TextStyleState} textStyle
   * @property {VideoCompositionState} videoComposition
   * @property {ExportSettingsState} exportSettings
   * @property {BackgroundAudioPlayerState} [backgroundAudio] // State for background audio within project
   * @property {boolean} [isDirty] - Optional flag for unsaved changes
   */

  /**
   * @typedef {Object} MainPlaybackState
   * @property {boolean} isPlaying
   * @property {number | null} currentAyahGlobalNumber - Global Ayah number currently playing or cued.
   * @property {number} currentTime - Current time of the playing Ayah.
   * @property {number | null} currentAyahDuration - Duration of the current Ayah's audio.
   * @property {Array<import('../features/audio-engine/main-playback.controller.js').PlaylistItem>} [activePlaylist] // Reflects what playback controller is using
   * @property {number} currentPlaylistIndex
   */

  /**
   * @typedef {Object} UndoRedoState
   * @property {boolean} canUndo
   * @property {boolean} canRedo
   */

  /**
   * @typedef {Object} AppSettings
   * @property {string} preferredLanguage
   * @property {'light' | 'dark'} preferredTheme
   * @property {ExportSettingsState} defaultExportSettings // For new projects
   * @property {string} defaultReciterId
   * // ... other app-wide user preferences from app.settings.schema.js
   */

  /**
   * @typedef {Object} AppState // The entire application state
   * @property {string} currentTheme - The active theme (not necessarily preferred, but what's active)
   * @property {ProjectState | null} currentProject
   * @property {Array<ProjectState>} savedProjects
   * @property {string} activeScreen - 'initial' | 'editor'
   * @property {string | null} activePanelId - ID of the currently open control panel in editor
   * @property {boolean} isLoading - Global loading indicator for app-wide operations
   * @property {string | null} loadingMessage - Message to show with global spinner
   * @property {{percentage: number, statusMessage: string} | null} exportProgress
   * @property {MainPlaybackState} mainPlaybackState
   * @property {UndoRedoState} undoRedoState
   * @property {AppSettings} appSettings // User-configurable application settings
   * @property {{ message: string, type: 'error' | 'warning' | 'info', details?: any } | null} globalError - For displaying global errors
   */

  // Ensure DEFAULT_PROJECT_SCHEMA is loaded/available for initial state
  const _DEFAULT_PROJECT_SCHEMA = (typeof window !== 'undefined' && window.DEFAULT_PROJECT_SCHEMA) || 
                                  (typeof DEFAULT_PROJECT_SCHEMA !== 'undefined' ? DEFAULT_PROJECT_SCHEMA : {});
  const _DEFAULT_APP_SETTINGS = (typeof window !== 'undefined' && window.defaultAppSettings) || 
                                 (typeof defaultAppSettings !== 'undefined' ? defaultAppSettings : { preferredLanguage: 'ar', preferredTheme: 'light', defaultExportSettings: _DEFAULT_PROJECT_SCHEMA.exportSettings, defaultReciterId: _DEFAULT_PROJECT_SCHEMA.quranSelection.reciterId });


  /** @type {AppState} */
  let state = {
    currentTheme: _DEFAULT_APP_SETTINGS.preferredTheme,
    currentProject: null,
    savedProjects: [],
    activeScreen: 'initial',
    activePanelId: null, // No panel open by default
    isLoading: false,
    loadingMessage: null,
    exportProgress: null,
    mainPlaybackState: {
      isPlaying: false,
      currentAyahGlobalNumber: null,
      currentTime: 0,
      currentAyahDuration: null,
      activePlaylist: [],
      currentPlaylistIndex: -1,
    },
    undoRedoState: {
      canUndo: false,
      canRedo: false,
    },
    appSettings: { ..._DEFAULT_APP_SETTINGS },
    globalError: null,
  };

  const listeners = new Set();
  let history = []; // For undo/redo project state (currentProject only for simplicity)
  let historyIndex = -1;
  const MAX_HISTORY_LENGTH = 30; // Increased limit

  // --- Private helper functions ---
  const _notifyListeners = () => {
    const currentStateForListeners = getState(); // Get a fresh copy
    [...listeners].forEach(listener => {
      try {
        listener(currentStateForListeners);
      } catch (error) {
        (localErrorLoggerRef.handleError || console.error)({
          error, message: 'Error in stateStore listener callback.', origin: 'stateStore._notifyListeners',
        });
      }
    });
  };

  // Only adds `currentProject` state to history for undo/redo for now.
  // For full app state undo/redo, `newState` should be `state`.
  const _addToHistory = (projectStateToSave) => {
    if (!projectStateToSave) return; // Don't save null project to history usually

    // If historyIndex is not at the end, it means we undid, and now making a new change,
    // so we truncate the "future" (redo) history.
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }
    // Store a deep clone of the project state
    history.push(JSON.parse(JSON.stringify(projectStateToSave)));

    if (history.length > MAX_HISTORY_LENGTH) {
      history.shift(); // Remove the oldest state to keep history bounded
    }
    historyIndex = history.length - 1;
    _updateUndoRedoAvailability();
  };
  
  const _updateUndoRedoAvailability = () => {
      const canUndo = historyIndex > 0; // Can undo if not at the very first state (initial state added to history)
      const canRedo = historyIndex < history.length - 1;
      if (state.undoRedoState.canUndo !== canUndo || state.undoRedoState.canRedo !== canRedo) {
          state = { ...state, undoRedoState: { canUndo, canRedo } };
          // No need to _notifyListeners here directly, as dispatch will do it if state truly changed overall.
          // However, if this is the *only* change, dispatch a specific action or notify.
          // For now, rely on main dispatch to notify if this resulted in overall state object change.
          // This could be dispatched as a separate internal action if more fine-grained update needed.
      }
  };

  // --- Public API ---
  const getState = () => ({ ...state }); // Return a shallow copy

  const subscribe = (listener) => { /* ... same as before ... */
    if (typeof listener !== 'function') {
      (localErrorLoggerRef.logWarning || console.warn)({
        message: 'Attempted to subscribe with a non-function listener.', origin: 'stateStore.subscribe'
      });
      return () => {};
    }
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const dispatch = (actionType, payload, options = {}) => {
    // console.debug(`[StateStore] Dispatch: ${actionType}`, payload, options);
    const oldFullState = JSON.parse(JSON.stringify(state)); // Deep clone of the entire state for revert and history of project
    let stateChangedOverall = false; // Flag to check if actual state object identity changed

    try {
      const _ACTIONS = (typeof window !== 'undefined' && window.ACTIONS) || (typeof ACTIONS !== 'undefined' ? ACTIONS : {}); // Get from global if not imported
      let projectStateForHistory = oldFullState.currentProject; // Capture project state before modification

      // --- Main switch for actions ---
      switch (actionType) {
        // APP
        case _ACTIONS.SET_APP_LOADING:
          if (typeof payload === 'boolean' && state.isLoading !== payload) {
            state = { ...state, isLoading: payload, loadingMessage: payload ? (options.message || null) : null };
            stateChangedOverall = true;
          }
          break;
        case _ACTIONS.SET_APP_ERROR: // payload: { message, details? } | null
          state = { ...state, globalError: payload };
          stateChangedOverall = true;
          break;
        case _ACTIONS.SET_APP_SETTINGS: // payload: AppSettingsSchema
            if(payload && typeof payload === 'object') {
                state = { ...state, appSettings: { ...state.appSettings, ...payload }};
                // Specific side-effects if theme or language changes from app settings
                if (payload.preferredTheme && state.currentTheme !== payload.preferredTheme) {
                    state.currentTheme = payload.preferredTheme;
                }
                if (payload.preferredLanguage && state.appSettings.preferredLanguage !== payload.preferredLanguage) {
                    // This should trigger localizationService to update language if it subscribes
                    // Or dispatch an event for localizationService
                }
                stateChangedOverall = true;
            }
            break;

        // THEME
        case _ACTIONS.SET_THEME:
          if (typeof payload === 'string' && state.currentTheme !== payload) {
            state = { ...state, currentTheme: payload, appSettings: {...state.appSettings, preferredTheme: payload} }; // also update preferred
            stateChangedOverall = true;
          }
          break;

        // SCREEN & PANEL
        case _ACTIONS.SET_ACTIVE_SCREEN:
          if (typeof payload === 'string' && state.activeScreen !== payload) {
            state = { ...state, activeScreen: payload, activePanelId: null }; // Close panels on screen change
            stateChangedOverall = true;
          }
          break;
        case 'SET_ACTIVE_PANEL_ID': // This was example, ensure it's in ACTIONS if used
            if ((payload === null || typeof payload === 'string') && state.activePanelId !== payload) {
                state = { ...state, activePanelId: payload };
                stateChangedOverall = true;
            }
            break;

        // PROJECT
        case _ACTIONS.LOAD_PROJECT: // payload: ProjectState | null
          state = { ...state, currentProject: payload, activeScreen: payload ? 'editor' : 'initial', activePanelId: payload ? 'quran-selection-panel' : null };
          history = payload ? [JSON.parse(JSON.stringify(payload))] : []; // Start new history for the loaded project
          historyIndex = payload ? 0 : -1;
          _updateUndoRedoAvailability();
          stateChangedOverall = true;
          // Option: If loading project, also load its title into DOMElements.currentProjectTitleEditor here?
          // Better handled by project-title.editor.js subscribing to state.
          break;

        case _ACTIONS.CREATE_NEW_PROJECT_AND_NAVIGATE:
            const _defaultProjectCreator = (typeof window !== 'undefined' && window.createNewProjectObject) ||
                                     (typeof createNewProjectObject !== 'undefined' ? createNewProjectObject : (overrides) => ({..._DEFAULT_PROJECT_SCHEMA, id:_generateId(), title: 'مشروع جديد', createdAt: Date.now(), updatedAt: Date.now(), ...overrides}));
            const newProjectInstance = _defaultProjectCreator({title: state.appSettings?.newProjectDefaultTitle || 'مشروع جديد'}); // Use app setting for default title if available
            // Effectively dispatches LOAD_PROJECT with the new instance
            state = { ...state, currentProject: newProjectInstance, activeScreen: 'editor', activePanelId: 'quran-selection-panel' };
            history = [JSON.parse(JSON.stringify(newProjectInstance))];
            historyIndex = 0;
            _updateUndoRedoAvailability();
            stateChangedOverall = true;
            break;
            
        case _ACTIONS.UPDATE_PROJECT_SETTINGS: // payload: Partial<ProjectState>
          if (state.currentProject && typeof payload === 'object' && payload !== null) {
            projectStateForHistory = JSON.parse(JSON.stringify(state.currentProject)); // Before change
            let updatedProject = { ...state.currentProject };
            // Deep merge for known nested structures, shallow for others
            for (const key in payload) {
                if (Object.hasOwnProperty.call(payload, key)) {
                    if (payload[key] !== null && typeof payload[key] === 'object' && !Array.isArray(payload[key]) && state.currentProject[key] !== null && typeof state.currentProject[key] === 'object') {
                        updatedProject[key] = { ...state.currentProject[key], ...payload[key] };
                    } else {
                        updatedProject[key] = payload[key];
                    }
                }
            }
            updatedProject.updatedAt = Date.now();
            state = { ...state, currentProject: updatedProject };
            stateChangedOverall = true;
          }
          break;

        case _ACTIONS.SET_PROJECT_TITLE: // Handled by UPDATE_PROJECT_SETTINGS, but can be specific
            if(state.currentProject && typeof payload === 'string' && state.currentProject.title !== payload) {
                projectStateForHistory = JSON.parse(JSON.stringify(state.currentProject));
                state = {...state, currentProject: {...state.currentProject, title: payload, updatedAt: Date.now()}};
                stateChangedOverall = true;
            }
            break;
        
        case _ACTIONS.UPDATE_SAVED_PROJECTS_LIST: // payload: Array<ProjectState>
            if (Array.isArray(payload)) {
                state = { ...state, savedProjects: payload.sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0)) };
                stateChangedOverall = true; // Assuming array content or identity could change
            }
            break;
        // ADD_PROJECT_TO_SAVED_LIST and DELETE_PROJECT_FROM_SAVED_LIST are typically handled by project.actions.js
        // which then dispatches UPDATE_SAVED_PROJECTS_LIST. So, direct reducers might not be here.

        // QURAN_SELECTION, BACKGROUND_CONFIG, TEXT_STYLE, VIDEO_COMPOSITION, EXPORT_SETTINGS
        // These are now mostly handled via UPDATE_PROJECT_SETTINGS with nested payloads.
        // Example for a dedicated SET_QURAN_SELECTION if preferred:
        // case _ACTIONS.SET_QURAN_SELECTION: // payload: Partial<QuranSelectionState>
        //   if (state.currentProject && payload) {
        //     projectStateForHistory = JSON.parse(JSON.stringify(state.currentProject));
        //     state = { ...state, currentProject: {
        //         ...state.currentProject,
        //         quranSelection: { ...state.currentProject.quranSelection, ...payload },
        //         updatedAt: Date.now()
        //     }};
        //     stateChangedOverall = true;
        //   }
        //   break;

        // --- Playback State ---
        case _ACTIONS.SET_MAIN_PLAYBACK_STATE: // payload: Partial<MainPlaybackState>
            if (payload && typeof payload === 'object') {
                state = { ...state, mainPlaybackState: { ...state.mainPlaybackState, ...payload }};
                stateChangedOverall = true;
            }
            break;

        // --- Export Progress ---
        case _ACTIONS.SET_EXPORT_PROGRESS: // payload: { percentage, statusMessage } | null
          state = { ...state, exportProgress: payload };
          stateChangedOverall = true;
          break;

        // --- Undo/Redo ---
        case _ACTIONS.UNDO_STATE:
          if (historyIndex > 0) {
            historyIndex--;
            state = { ...state, currentProject: JSON.parse(JSON.stringify(history[historyIndex])) };
            _updateUndoRedoAvailability();
            stateChangedOverall = true;
            options.skipHistory = true; // Don't add UNDO itself to history
          }
          break;
        case _ACTIONS.REDO_STATE:
          if (historyIndex < history.length - 1) {
            historyIndex++;
            state = { ...state, currentProject: JSON.parse(JSON.stringify(history[historyIndex])) };
            _updateUndoRedoAvailability();
            stateChangedOverall = true;
            options.skipHistory = true; // Don't add REDO to history
          }
          break;
        case _ACTIONS.CLEAR_HISTORY:
            history = state.currentProject ? [JSON.parse(JSON.stringify(state.currentProject))] : [];
            historyIndex = state.currentProject ? 0 : -1;
            _updateUndoRedoAvailability();
            stateChangedOverall = true; // Assuming undo/redo state availability changed
            options.skipHistory = true;
            break;

        default:
          (localErrorLoggerRef.logWarning || console.warn)({
            message: `Unknown action type in stateStore: ${actionType}`, origin: 'stateStore.dispatch', context: { actionType, payload }
          });
          return; // No change
      }

      if (stateChangedOverall) {
        // Add to history only if currentProject was affected and skipHistory is false
        if (state.currentProject && !options.skipHistory && projectStateForHistory !== state.currentProject) {
           // Check if project state *actually* changed before adding to history, deep compare is expensive
           // For simplicity, if currentProject existed and was part of the update logic above.
           // (The initial projectStateForHistory captures this for actions that modify currentProject)
           // A more robust check would be: if actionType starts with 'PROJECT_' and modified currentProject.
            if(actionType.startsWith('PROJECT_UPDATE_') || actionType === _ACTIONS.SET_PROJECT_TITLE || actionType === _ACTIONS.SET_QURAN_SELECTION /* etc for project-modifying actions */) {
                _addToHistory(projectStateForHistory); // Add *previous* state of currentProject
            }
        }
        _updateUndoRedoAvailability(); // Recalculate after potential history change
        _notifyListeners();
      }

    } catch (error) {
      (localErrorLoggerRef.handleError || console.error)({
        error, message: `Critical error in stateStore.dispatch for action: ${actionType}. State may be inconsistent. Reverted to old state.`,
        origin: 'stateStore.dispatch', context: { actionType, payload, oldState: oldFullState }
      });
      state = oldFullState; // Revert to prevent inconsistent state (might not always be desirable)
      _notifyListeners(); // Notify about reverted state or trigger error display
    }
  };

  const initializeWithState = (persistedAppSettings, persistedSavedProjects) => {
    const _defaultAppSettingsFromSchema = (typeof defaultAppSettings !== 'undefined' ? defaultAppSettings : { preferredLanguage: 'ar', preferredTheme: 'light' });
    const _hydrateAppSettings = (typeof hydrateAppSettings !== 'undefined' ? hydrateAppSettings : (s) => ({..._defaultAppSettingsFromSchema, ...s}) );

    const initialSettings = _hydrateAppSettings(persistedAppSettings);
    state = {
        ...state, // Keep other defaults like isLoading, etc.
        appSettings: initialSettings,
        currentTheme: initialSettings.preferredTheme, // Initialize theme from persisted app settings
        savedProjects: Array.isArray(persistedSavedProjects) ? persistedSavedProjects.sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0)) : [],
    };
    
    _addToHistory(null); // Add a baseline "empty" project state to history, or initial project if one is loaded
    _notifyListeners();
    // console.info('[StateStore] Initialized with persisted/default app settings and projects.');
  };
  
  const setErrorLogger = (loggerInstance) => {
    if (loggerInstance && typeof loggerInstance.handleError === 'function') {
        localErrorLoggerRef = loggerInstance;
    } else {
        console.warn("[StateStore] Invalid error logger instance provided to setErrorLogger.");
    }
  };


  return {
    getState,
    subscribe,
    dispatch,
    initializeWithState, // To be called by main.js after loading from localStorage
    setErrorLogger,
    // For debugging:
    // _getHistory: () => history,
    // _getHistoryIndex: () => historyIndex
  };
})();

export default stateStore;
