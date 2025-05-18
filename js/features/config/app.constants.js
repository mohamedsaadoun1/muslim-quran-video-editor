// js/config/app.constants.js

/**
 * ========================================================================
 * APPLICATION WIDE CONSTANTS
 * ========================================================================
 */

export const APP_NAME = 'MuslimQuranVideoEditor';
export const APP_VERSION = '1.0.0'; // For settings schema or general info

/**
 * ========================================================================
 * LOCAL STORAGE KEYS
 * Prefix with APP_NAME to avoid collisions if other apps run on the same domain.
 * ========================================================================
 */
const LS_PREFIX = `${APP_NAME}_`;
export const LS_KEYS = {
  SAVED_PROJECTS: `${LS_PREFIX}savedProjects_v1`, // Added version for future schema changes
  CURRENT_THEME: `${LS_PREFIX}currentTheme_v1`,
  APP_SETTINGS: `${LS_PREFIX}appSettings_v1`,
  LAST_OPENED_PROJECT_ID: `${LS_PREFIX}lastOpenedProjectId_v1`,
  USER_PREFERENCES: `${LS_PREFIX}userPreferences_v1`, // Generic key for other small prefs
};


/**
 * ========================================================================
 * ACTION TYPES for stateStore.dispatch(ACTION_TYPE, payload)
 * Convention: FEATURE_ACTION_DESCRIPTION
 * ========================================================================
 */
export const ACTIONS = {
  // --- Global App State ---
  SET_APP_LOADING: 'APP_SET_LOADING',           // payload: boolean
  SET_APP_ERROR: 'APP_SET_ERROR',             // payload: { message: string, details?: any } | null
  SET_APP_SETTINGS: 'APP_SET_SETTINGS',         // payload: AppSettingsSchema

  // --- Theme ---
  SET_THEME: 'THEME_SET',                     // payload: 'light' | 'dark'

  // --- Screen Navigation ---
  SET_ACTIVE_SCREEN: 'SCREEN_SET_ACTIVE',       // payload: 'initial' | 'editor'

  // --- Project Management ---
  LOAD_PROJECT: 'PROJECT_LOAD',               // payload: ProjectState | null (null unloads current)
  CREATE_NEW_PROJECT_AND_NAVIGATE: 'PROJECT_CREATE_AND_NAVIGATE', // No payload needed, uses defaults
  UPDATE_PROJECT_SETTINGS: 'PROJECT_UPDATE_SETTINGS',// payload: Partial<ProjectState> (to merge)
  SET_PROJECT_TITLE: 'PROJECT_SET_TITLE',       // payload: string (alternative to UPDATE_PROJECT_SETTINGS for just title)
  UPDATE_SAVED_PROJECTS_LIST: 'PROJECT_UPDATE_SAVED_LIST', // payload: Array<ProjectState>
  ADD_PROJECT_TO_SAVED_LIST: 'PROJECT_ADD_TO_SAVED_LIST', // payload: ProjectState (used by project.actions.js)
  DELETE_PROJECT_FROM_SAVED_LIST: 'PROJECT_DELETE_FROM_SAVED_LIST', // payload: projectId (string)

  // --- Quran Selection (usually part of UPDATE_PROJECT_SETTINGS) ---
  SET_QURAN_SELECTION: 'QURAN_SET_SELECTION',   // payload: Partial<QuranSelectionState>
  // SET_CURRENT_AYAH_FOR_DISPLAY: 'QURAN_SET_DISPLAY_AYAH', // payload: {ayahGlobalNum, text, translation} - if renderer depends on this explicit action

  // --- Background Controller ---
  SET_BACKGROUND_CONFIG: 'BACKGROUND_SET_CONFIG',// payload: Partial<BackgroundState> (e.g. {type, source, fileName})
  SET_AI_SUGGESTIONS: 'BACKGROUND_SET_AI_SUGGESTIONS', // payload: AISuggestionsState

  // --- Text Engine ---
  SET_TEXT_STYLE: 'TEXT_SET_STYLE',             // payload: Partial<TextStyleState>

  // --- Audio Engine ---
  SET_AYAH_DELAY: 'AUDIO_SET_AYAH_DELAY',       // payload: number (seconds) (usually part of quranSelection)
  SET_BACKGROUND_AUDIO_CONFIG: 'AUDIO_SET_BACKGROUND_CONFIG', // payload: Partial<BackgroundAudioState>
  SET_MAIN_PLAYBACK_STATE: 'AUDIO_SET_MAIN_PLAYBACK_STATE', // payload: { isPlaying: boolean, currentAyahGlobal?: number, currentTime?: number, duration?: number }
  
  // --- Canvas Composer ---
  SET_VIDEO_COMPOSITION: 'CANVAS_SET_VIDEO_COMPOSITION',// payload: Partial<VideoCompositionState> (e.g. { aspectRatio, videoFilter })

  // --- Video Exporter ---
  SET_EXPORT_SETTINGS: 'EXPORT_SET_SETTINGS',     // payload: Partial<ExportSettingsState>
  SET_EXPORT_PROGRESS: 'EXPORT_SET_PROGRESS',     // payload: { percentage: number, statusMessage: string } | null

  // --- Undo/Redo ---
  UNDO_STATE: 'HISTORY_UNDO',
  REDO_STATE: 'HISTORY_REDO',
  CLEAR_HISTORY: 'HISTORY_CLEAR',
};


/**
 * ========================================================================
 * EVENT NAMES for eventAggregator.publish/subscribe
 * Convention: featureOrContext:eventName (lowercase, colon separated)
 * ========================================================================
 */
export const EVENTS = {
  // --- Application Lifecycle & Core ---
  APP_INITIALIZED: 'app:initialized',           // payload: { timestamp }
  APP_SETTINGS_LOADED: 'app:settingsLoaded',      // payload: AppSettingsSchema
  APP_SETTINGS_CHANGED: 'app:settingsChanged',    // payload: AppSettingsSchema
  ERROR_LOGGED: 'app:errorLogged',              // payload: ErrorLogDetails

  // --- UI Events ---
  THEME_CHANGED: 'ui:themeChanged',             // payload: 'light' | 'dark'
  NOTIFICATION_REQUESTED: 'ui:notificationRequested', // payload: { message, type, duration }
  MODAL_REQUESTED_CONFIRM: 'ui:modalConfirmRequested', // payload: { title, message, confirmText?, cancelText? } -> Promise<boolean>
  MODAL_REQUESTED_ALERT: 'ui:modalAlertRequested', // payload: { title, message, okText? } -> Promise<void>
  PANEL_VISIBILITY_CHANGED: 'ui:panelVisibilityChanged', // payload: { panelId, visible }
  // For shortcuts triggering panel actions:
  // REQUEST_PANEL_TOGGLE: 'ui:requestPanelToggle', // payload: { panelId }


  // --- Navigation ---
  NAVIGATE_TO_SCREEN: 'navigation:navigateToScreen',      // payload: { screenId: string }
  NAVIGATE_TO_EDITOR_NEW_PROJECT: 'navigation:navigateToEditorNewProject', // No payload needed here
  SCREEN_NAVIGATED: 'navigation:screenNavigated',     // payload: { screenId: string }

  // --- Project Management ---
  REQUEST_PROJECT_SAVE: 'project:requestSave',         // Triggered by UI (button, shortcut)
  REQUEST_PROJECT_LOAD: 'project:requestLoad',         // payload: { projectId } (from project card click)
  REQUEST_NEW_PROJECT: 'project:requestNew',          // Triggered by UI
  PROJECT_LOADED: 'project:loaded',                  // payload: ProjectState (published by project.actions after state update)
  PROJECT_SAVED: 'project:saved',                    // payload: ProjectState
  PROJECT_DELETED: 'project:deleted',                // payload: { projectId }
  PROJECT_TITLE_CHANGED_BY_USER: 'project:titleChangedByUser',// payload: { newTitle } (from project-title.editor)
  SAVED_PROJECTS_UPDATED: 'project:savedProjectsUpdated', // payload: Array<ProjectState> (if not relying purely on stateStore subscription)


  // --- Quran Data Provider ---
  SURAH_LIST_LOADED: 'quran:surahListLoaded',       // payload: Array<SurahMetadata>
  RECITERS_LOADED: 'quran:recitersLoaded',          // payload: Array<ReciterEdition>
  TRANSLATIONS_LOADED: 'quran:translationsLoaded',  // payload: Array<TranslationEdition>
  QURAN_SELECTION_UPDATED_IN_UI: 'quran:selectionUpdatedByUI', // payload: newQuranSelectionState (from quran-selector.ui)
  // AYAH_TEXT_READY: 'quran:ayahTextReady',           // payload: { ayahGlobalNum, text, translationText } // More granular


  // --- Background Controller ---
  BACKGROUND_UPDATED_IN_UI: 'background:updatedByUI',  // payload: { type, source, fileName? }
  AI_SUGGESTIONS_LOADING: 'background:aiSuggestionsLoading', // payload: { query }
  AI_SUGGESTIONS_UPDATED: 'background:aiSuggestionsUpdated', // payload: AISuggestionsState (from background.state.js)
  AI_SUGGESTIONS_FAILED: 'background:aiSuggestionsFailed', // payload: { query, error }


  // --- Text Engine ---
  // TEXT_STYLE_UPDATED_IN_UI: 'text:styleUpdatedByUI',   // payload: newTextStyleState


  // --- Audio Engine ---
  AYAH_AUDIO_READY: 'audio:ayahAudioReady',             // payload: { url, duration, ayahGlobalNumber } (from ayah-audio.retriever)
  PLAYBACK_REQUESTED: 'audio:playbackRequested',        // payload: 'play' | 'pause' | 'next' | 'previous' | 'stop' (from playback controls UI)
  PLAYBACK_STATE_CHANGED: 'audio:mainPlaybackStateChanged',// payload: 'playing' | 'paused' | 'ended' | 'stopped' (from main-playback.controller)
  TIMELINE_UPDATED: 'audio:timelineUpdated',            // payload: { currentTime, duration, progressPercent }
  PLAYLIST_UPDATED: 'audio:playlistUpdated',            // payload: Array<PlaylistItem> (from main-playback.controller)
  PLAYLIST_ENDED: 'audio:playlistEnded',
  CURRENT_AYAH_CHANGED_IN_PLAYBACK: 'audio:currentAyahChanged', // payload: PlaylistItem (from main-playback.controller)
  INTER_AYAH_DELAY_STARTED: 'audio:interAyahDelayStarted', // payload: { duration }
  BACKGROUND_AUDIO_STATE_CHANGED: 'audio:backgroundAudioStateChanged', // payload: { isPlaying, fileName? }

  // --- Canvas Composer ---
  CANVAS_RESIZED: 'canvas:resized',                   // payload: { width, height, aspectRatioString } (from canvas.dimension.handler)
  REQUEST_CANVAS_RENDER: 'canvas:requestRender',        // payload: { reason: string } (generic request to re-render)
  CANVAS_FRAME_RENDERED: 'canvas:frameRendered',        // payload: { timestamp } (from main-renderer, useful for exporter)
  // VIDEO_FILTER_APPLIED_IN_UI: 'canvas:filterAppliedByUI',// payload: filterKey

  // --- Video Exporter ---
  EXPORT_STARTED: 'export:started',
  EXPORT_PROGRESS: 'export:progress',                 // payload: number (0-100) or { percentage, statusMessage }
  EXPORT_COMPLETED: 'export:completed',               // payload: { success: boolean, file?: Blob, error?: string, cancelled?: boolean }
  EXPORT_FAILED: 'export:failed',                   // payload: { error: string } (if EXPORT_COMPLETED can't cover it)
  REQUEST_EXPORT_PANEL_OPEN: 'export:requestPanelOpen',// from shortcut to open export panel

};


/**
 * ========================================================================
 * DEFAULT PROJECT SCHEMA
 * Defines the structure and default values for a new project.
 * Referenced by project.model.js and stateStore for initial project state.
 * ========================================================================
 */
export const DEFAULT_PROJECT_SCHEMA = {
  id: null,
  title: 'مشروع جديد',
  createdAt: 0,
  updatedAt: 0,
  quranSelection: {
    surahId: 1,
    startAyah: 1,
    endAyah: 7,
    reciterId: 'ar.alafasy', // Ensure this is a valid default identifier from your API/Data
    translationId: null,
    delayBetweenAyahs: 1.0, // in seconds
    ayahTimings: {}, // Stores { globalAyahNumber: { start: time, end: time, text: "ayah text" } }
    // currentDisplayingAyahGlobalNumber: null, // For renderer to know which Ayah details to show
  },
  background: {
    type: 'color',
    source: '#0D0D0D', // Default very dark, almost black
    fileName: null,
    aiSuggestions: { photos: [], videos: [], query: null, isLoading: false, error: null, timestamp: null },
  },
  textStyle: {
    fontFamily: "'Amiri Quran', serif", // A good default for Quran
    fontSize: 48, // px
    fontColor: '#FFFFFF',
    textBgColor: 'rgba(0, 0, 0, 0.25)', // Slightly transparent black
    textAnimation: 'fade', // 'none', 'fade', 'typewriter'
  },
  videoComposition: {
    aspectRatio: '9:16', // Default to portrait
    videoFilter: 'none',
  },
  exportSettings: {
    resolution: '1920x1080', // Full HD
    format: 'webm', // Good for quality & size if no audio initially for CCapture
    fps: 25,
    // quality: 75, // Optional quality for webm/gif
  },
  // Optional state flags directly on project
  // isDirty: false, // To track unsaved changes
  // lastSavedSnapshot: null, // A stringified version of the project at last save for dirty checking
};

// You can also define other app-wide constants here, e.g.,
// export const MAX_PROJECT_TITLE_LENGTH = 100;
// export const DEFAULT_AYAH_DELAY_SECONDS = 1.0;
