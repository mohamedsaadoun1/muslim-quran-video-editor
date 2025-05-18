// js/features/config/default-project.schema.js
// أو js/config/default-project.schema.js

// NOTE: This definition should be the single source of truth for default project settings.
// If DEFAULT_PROJECT_SCHEMA is also defined in app.constants.js, one should import from the other
// to avoid duplication and inconsistency.
// Assuming this file is now the primary source for this specific schema.

/**
 * @typedef {import('../project-manager/project.model.js').ProjectModelSchema} ProjectModelSchema
 * // Or define all nested typedefs here as shown in project.model.js previously.
 */

/**
 * Defines the default structure and values for a new project.
 * This is the "blueprint" for what a project object should contain.
 * @type {ProjectModelSchema} // Ensure this matches the structure expected by the application
 */
export const DEFAULT_PROJECT_SCHEMA = {
  id: null, // Will be generated at creation time
  title: 'مشروع جديد', // Default title (can be localized via appSettings or project creation logic)
  createdAt: 0, // Will be set to Date.now() at creation
  updatedAt: 0, // Will be set to Date.now() at creation

  quranSelection: {
    surahId: 1,             // Default: Al-Fatiha
    startAyah: 1,
    endAyah: 7,
    reciterId: 'ar.alafasy', // A common default, ensure this ID exists in your reciters list
    translationId: null,     // No translation by default
    delayBetweenAyahs: 1.0,  // Seconds
    ayahTimings: {},         // To store { globalAyahNum: { start, end } } if fetched/calculated
  },

  background: {
    type: 'color',                  // 'color', 'image', 'video'
    source: '#0D0D0D',              // Default dark background color
    fileName: null,                 // Name of imported file
    aiSuggestions: {                // State for AI suggestions
      photos: [],
      videos: [],
      query: null,
      isLoading: false,
      error: null,
      timestamp: null,
    },
  },

  textStyle: {
    fontFamily: "'Amiri Quran', serif", // Default Quran font
    fontSize: 48,                       // Pixels
    fontColor: '#FFFFFF',               // White text
    textBgColor: 'rgba(0,0,0,0.3)',   // Semi-transparent black background for text
    textAnimation: 'fade',              // 'none', 'fade', 'typewriter', etc.
    // translationFontFamily: "'Tajawal', sans-serif", // Example if separate
    // translationFontSizeRatio: 0.6,
  },

  videoComposition: {
    aspectRatio: '9:16',        // Default to portrait for social media (e.g., Shorts, Reels)
    videoFilter: 'none',          // No filter by default
  },

  exportSettings: {
    resolution: '1920x1080',    // Full HD
    format: 'webm',             // WebM is good quality/size, supported by CCapture for video
    fps: 25,                    // Common frame rate
    // quality: 75, // Optional, specific to format (e.g., 0-100 for webm, 1-30 for gif)
  },

  // isDirty: false, // Optional flag for unsaved changes, managed by project logic

  // Add other project-specific default settings as your application grows
  // For example:
  // audioSettings: {
  //   mainVolume: 1.0,
  //   backgroundMusicVolume: 0.5, // If background music feature is added
  //   backgroundMusicLoop: true,
  //   backgroundMusicFile: null
  // },
  // transitions: {
  //   betweenAyahs: 'none', // 'none', 'fade', 'slide'
  //   durationMs: 500
  // }
};

/**
 * Initialization function (placeholder for consistency with moduleBootstrap if used).
 * This module typically only exports the schema object.
 * @param {object} [dependencies] - Optional dependencies.
 */
export function initializeDefaultProjectSchema(dependencies = {}) {
  // console.info('[DefaultProjectSchema] Initialized (provides default project structure).');
  return {
    DEFAULT_PROJECT_SCHEMA: JSON.parse(JSON.stringify(DEFAULT_PROJECT_SCHEMA)) // Return a clone
  };
}

// Primarily, other modules will import DEFAULT_PROJECT_SCHEMA directly.
// No default export for the module object itself needed usually.
