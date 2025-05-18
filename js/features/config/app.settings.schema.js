// js/features/config/app.settings.schema.js

// Import default values if they exist elsewhere and should be the source of truth
import { DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js'; // For default export settings

/**
 * @typedef {Object} ExportDefaultSettingsSchema
 * @property {string} resolution - e.g., '1920x1080'
 * @property {string} format - e.g., 'webm', 'mp4', 'gif'
 * @property {number} fps - e.g., 25, 30
 * @property {number} [quality] - Optional quality setting (e.g., 1-100 for webm, 1-30 for gif)
 */

/**
 * @typedef {Object} AppSettingsSchema
 * @property {string} appVersion - Version of the app settings schema (for future migrations).
 * @property {string} preferredLanguage - Language code (e.g., 'ar', 'en').
 * @property {'light' | 'dark'} preferredTheme - User's preferred theme.
 * @property {ExportDefaultSettingsSchema} defaultExportSettings - Default settings for new project exports.
 * @property {string} defaultReciterId - User's preferred default reciter for new projects.
 * @property {boolean} autoSaveEnabled - Whether auto-save feature is enabled (if implemented).
 * @property {number} autoSaveIntervalMinutes - Interval for auto-save in minutes.
 * @property {boolean} showTooltips - Whether to show helpful tooltips in the UI.
 * @property {boolean} loadLastOpenedProject - Whether to automatically load the last opened project on startup.
 * // Add other application-wide settings as needed
 */


/**
 * Defines the default application settings.
 * These values will be used if no settings are found in localStorage
 * or when resetting settings.
 * @type {AppSettingsSchema}
 */
export const defaultAppSettings = {
  appVersion: '1.0.0',
  preferredLanguage: 'ar', // Default to Arabic
  preferredTheme: 'light',  // Default to light theme
  defaultExportSettings: { // Get defaults from project schema to keep them consistent
    resolution: DEFAULT_PROJECT_SCHEMA.exportSettings.resolution,
    format: DEFAULT_PROJECT_SCHEMA.exportSettings.format,
    fps: DEFAULT_PROJECT_SCHEMA.exportSettings.fps,
    // quality: 75, // Example quality for webm
  },
  defaultReciterId: DEFAULT_PROJECT_SCHEMA.quranSelection.reciterId, // From default project
  autoSaveEnabled: false,
  autoSaveIntervalMinutes: 5,
  showTooltips: true,
  loadLastOpenedProject: false,
};


/**
 * Merges potentially outdated saved settings with the current default schema.
 * This helps in migrating settings if new defaults or properties are added.
 * @param {Partial<AppSettingsSchema>} savedSettings - Settings loaded from localStorage.
 * @returns {AppSettingsSchema} The merged and validated settings object.
 */
export function hydrateAppSettings(savedSettings) {
  if (!savedSettings || typeof savedSettings !== 'object') {
    return { ...defaultAppSettings };
  }

  // Start with defaults, then override with saved settings.
  // This ensures new settings in `defaultAppSettings` are present if `savedSettings` is from an older version.
  const hydrated = {
    ...defaultAppSettings,
    ...savedSettings,
    // Deep merge for nested objects like defaultExportSettings
    defaultExportSettings: {
      ...(defaultAppSettings.defaultExportSettings || {}),
      ...(savedSettings.defaultExportSettings || {}),
    },
  };
  
  // Perform any specific migrations based on appVersion if needed
  // For example, if savedSettings.appVersion is older than current defaultAppSettings.appVersion
  // if (savedSettings.appVersion && savedSettings.appVersion < defaultAppSettings.appVersion) {
  //   console.log(`[AppSettings] Migrating settings from v${savedSettings.appVersion} to v${defaultAppSettings.appVersion}`);
  //   // Add migration logic here, e.g., renaming keys, setting new defaults for new keys.
  //   hydrated.appVersion = defaultAppSettings.appVersion;
  // }


  // Basic validation/sanitization for some fields (optional)
  if (hydrated.preferredLanguage !== 'ar' && hydrated.preferredLanguage !== 'en') {
      hydrated.preferredLanguage = defaultAppSettings.preferredLanguage;
  }
  if (hydrated.preferredTheme !== 'light' && hydrated.preferredTheme !== 'dark') {
      hydrated.preferredTheme = defaultAppSettings.preferredTheme;
  }
  if (typeof hydrated.defaultExportSettings.fps !== 'number') {
      hydrated.defaultExportSettings.fps = defaultAppSettings.defaultExportSettings.fps;
  }

  return hydrated;
}

// This module primarily exports schemas and utility functions for app settings.
// No complex runtime logic or UI interaction happens here.
// An `initialize...` function from moduleBootstrap is generally not needed
// unless this module itself were to load/save settings (which is usually handled by
// a dedicated settings manager service or within project.actions.js for settings part of state).

/**
 * Initialization function for AppSettingsSchema (placeholder, usually not needed).
 * @param {object} [dependencies] - Optional dependencies.
 */
export function initializeAppSettingsSchema(dependencies = {}) {
  // const { errorLogger } = dependencies;
  // console.info('[AppSettingsSchema] Initialized (defines app settings structure and defaults).');

  return {
    defaultAppSettings,
    hydrateAppSettings,
  };
}

// Exporting directly is common for schema/model definition files.
// No default export of the module object itself unless it becomes a class.
