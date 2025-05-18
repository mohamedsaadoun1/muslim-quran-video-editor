// js/config/app.constants.js

export const APP_NAME = 'MuslimQuranVideoEditor';

// LocalStorage Keys
export const LOCAL_STORAGE_PREFIX = `${APP_NAME}_`;
export const LS_KEY_SAVED_PROJECTS = `${LOCAL_STORAGE_PREFIX}savedProjects`;
export const LS_KEY_CURRENT_THEME = `${LOCAL_STORAGE_PREFIX}currentTheme`;
// Add more LS keys as needed

// StateStore Action Types
export const ACTIONS = {
  // THEME
  SET_THEME: 'SET_THEME',
  // SCREEN NAVIGATION
  SET_ACTIVE_SCREEN: 'SET_ACTIVE_SCREEN',
  // LOADING STATE
  SET_LOADING: 'SET_LOADING',
  // PROJECT MANAGEMENT
  LOAD_PROJECT: 'LOAD_PROJECT', // Payload: project object or null
  CREATE_NEW_PROJECT: 'CREATE_NEW_PROJECT', // Payload: (optional) initial project data
  SAVE_CURRENT_PROJECT: 'SAVE_CURRENT_PROJECT', // No payload needed from caller, reads from state
  UPDATE_PROJECT_SETTINGS: 'UPDATE_PROJECT_SETTINGS', // Payload: partial project settings
  ADD_SAVED_PROJECT_TO_LIST: 'ADD_SAVED_PROJECT_TO_LIST', // Payload: project object
  UPDATE_SAVED_PROJECTS_LIST: 'UPDATE_SAVED_PROJECTS_LIST', // Payload: array of project objects
  DELETE_PROJECT_FROM_LIST: 'DELETE_PROJECT_FROM_LIST', // Payload: projectId
  SET_PROJECT_TITLE: 'SET_PROJECT_TITLE', // Payload: string
  // QURAN SELECTION
  SET_QURAN_SELECTION: 'SET_QURAN_SELECTION', // Payload: { surahId, startAyah, endAyah, reciterId, translationId }
  UPDATE_AYAH_TIMINGS: 'UPDATE_AYAH_TIMINGS', // Payload: { ayahIndex: timingsObject }
  // BACKGROUND
  SET_BACKGROUND_TYPE: 'SET_BACKGROUND_TYPE', // Payload: 'color' | 'image' | 'video'
  SET_BACKGROUND_SOURCE: 'SET_BACKGROUND_SOURCE', // Payload: string (URL or color hex)
  SET_AI_SUGGESTIONS: 'SET_AI_SUGGESTIONS', // Payload: array of suggestion objects
  // TEXT STYLING
  SET_TEXT_STYLE: 'SET_TEXT_STYLE', // Payload: { fontFamily, fontSize, fontColor, textBgColor }
  SET_TEXT_ANIMATION: 'SET_TEXT_ANIMATION', // Payload: string (e.g., 'fade', 'typewriter')
  // AUDIO SETTINGS
  SET_AYAH_DELAY: 'SET_AYAH_DELAY', // Payload: number (seconds)
  // VIDEO COMPOSITION
  SET_ASPECT_RATIO: 'SET_ASPECT_RATIO', // Payload: string (e.g., '16:9')
  SET_VIDEO_FILTER: 'SET_VIDEO_FILTER', // Payload: string (CSS filter value)
  // EXPORT
  SET_EXPORT_OPTIONS: 'SET_EXPORT_OPTIONS', // Payload: { resolution, format, fps }
  SET_EXPORT_PROGRESS: 'SET_EXPORT_PROGRESS', // Payload: { percentage, statusMessage }
  // UNDO/REDO (if state store handles it internally, might not need separate actions)
  UNDO_STATE: 'UNDO_STATE',
  REDO_STATE: 'REDO_STATE',
};

// Event Aggregator Event Names
export const EVENTS = {
  // APP LIFECYCLE
  APP_INITIALIZED: 'app:initialized',
  // UI INTERACTIONS
  THEME_CHANGED: 'ui:themeChanged', // Payload: 'light' | 'dark'
  PANEL_VISIBILITY_CHANGED: 'ui:panelVisibilityChanged', // Payload: { panelId: string, visible: boolean }
  NOTIFICATION_REQUESTED: 'ui:notificationRequested', // Payload: { message: string, type: 'success'|'error'|'info', duration?: number }
  // PROJECT
  PROJECT_LOADED: 'project:loaded', // Payload: projectObject
  PROJECT_SAVED: 'project:saved', // Payload: projectObject
  PROJECT_TITLE_CHANGED: 'project:titleChanged', // Payload: newTitle
  // QURAN DATA
  SURAH_LIST_LOADED: 'quran:surahListLoaded', // Payload: array of surahs
  RECITERS_LOADED: 'quran:recitersLoaded', // Payload: array of reciters
  TRANSLATIONS_LOADED: 'quran:translationsLoaded', // Payload: array of translations
  QURAN_SELECTION_UPDATED: 'quran:selectionUpdated', // Payload: currentSelectionObject (from state)
  AYAH_AUDIO_READY: 'quran:ayahAudioReady', // Payload: { ayahGlobalIndex, audioUrl, duration }
  // BACKGROUND
  BACKGROUND_UPDATED: 'background:updated', // Payload: { type, source }
  // PLAYBACK
  PLAYBACK_REQUESTED: 'playback:requested', // Payload: 'play' | 'pause' | 'next' | 'prev'
  PLAYBACK_STATE_CHANGED: 'playback:stateChanged', // Payload: 'playing' | 'paused' | 'ended'
  TIMELINE_UPDATED: 'playback:timelineUpdated', // Payload: { currentTime, duration, progressPercent }
  // EXPORT
  EXPORT_STARTED: 'export:started',
  EXPORT_PROGRESS: 'export:progress', // Payload: percentage (0-100)
  EXPORT_COMPLETED: 'export:completed', // Payload: { success: boolean, file?: Blob, error?: string }
  EXPORT_FAILED: 'export:failed', // Payload: error reason
};

// Default Project Structure (used by project.model.js and stateStore initial state)
export const DEFAULT_PROJECT_SCHEMA = {
  id: null, // Will be generated
  title: 'مشروع جديد',
  createdAt: null,
  updatedAt: null,
  quranSelection: {
    surahId: 1, // Al-Fatiha
    startAyah: 1,
    endAyah: 7,
    reciterId: 'ar.alafasy', // Default reciter
    translationId: null, // No translation by default
    ayahTimings: {}, // { globalAyahNumberInQuran: { start, end } }
    delayBetweenAyahs: 1, // seconds
  },
  background: {
    type: 'color', // 'color', 'image', 'video'
    source: '#0D0D0D', // Default dark color
    aiSuggestions: [],
  },
  textStyle: {
    fontFamily: "'Amiri Quran', serif",
    fontSize: 48, // pixels
    fontColor: '#FFFFFF',
    textBgColor: 'rgba(0,0,0,0.3)',
    textAnimation: 'fade', // 'none', 'fade', 'typewriter'
  },
  videoComposition: {
    aspectRatio: '9:16', // For social media shorts
    videoFilter: 'none',
  },
  exportSettings: {
    resolution: '1920x1080',
    format: 'webm',
    fps: 25,
  },
  // Add other project-specific settings here
};

// DOM Element IDs (example, can be moved to dom-elements.js or kept here for reference)
export const DOM_IDS = {
    APP_CONTAINER: 'app-container',
    INITIAL_SCREEN: 'initial-screen',
    EDITOR_SCREEN: 'editor-screen',
    // ... and so on for frequently accessed static elements
    THEME_TOGGLE_INITIAL: 'theme-toggle-initial',
    THEME_TOGGLE_EDITOR: 'theme-toggle-editor',
    PROJECT_LIST_CONTAINER: 'projects-list-container',
    NO_PROJECT_MESSAGE: 'no-projects-message',
    // ... more IDs
};
