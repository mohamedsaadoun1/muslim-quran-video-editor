// js/config/feature.flags.config.js

/**
 * @typedef {Object.<string, boolean | { enabled: boolean, [key: string]: any }>} FeatureFlagsObject
 * Each key is a feature flag name.
 * The value can be a simple boolean (true for enabled, false for disabled).
 * Or, it can be an object for more complex flags, typically with an `enabled` property
 * and other configuration specific to that flag if needed (e.g., variants for A/B testing).
 */

/**
 * Default feature flag configurations.
 * These are the baseline settings. They can be overridden by localStorage for development.
 *
 * To enable a feature, set its value to `true` or an object with `enabled: true`.
 * To disable a feature, set its value to `false` or an object with `enabled: false`.
 *
 * Naming convention: use camelCase or kebab-case (then access with strings) for flag names.
 * e.g., 'enableAdvancedExportOptions', 'showBetaFeatureX'
 *
 * @type {FeatureFlagsObject}
 */
const DEFAULT_FEATURE_FLAGS = {
  // --- Core Features (Usually always true unless under heavy refactor) ---
  enableProjectSaving: true,        // Controls saving/loading projects to localStorage
  enableThemeToggle: true,          // Allows user to switch themes
  enablePexelsAISuggestions: true,  // Enables AI background suggestions from Pexels (requires API key)

  // --- Audio Engine Features ---
  enableBackgroundAudio: false,      // Feature: Adding custom background audio track
                                    // (Set to true to start developing/testing)
  enableAudioExtraction: false,     // Feature: Extracting audio from video background (FFmpeg)
                                    // (Set to true to start developing/testing)

  // --- Export Features ---
  enableFFmpegIntegration: false,   // Controls FFmpeg loading and MP4 export (requires FFmpeg setup)
  allowWebMWithAudioExport: false,  // If FFmpeg is used to merge audio into WebM (separate from MP4)
  enableGifQualitySettings: true, // If showing GIF specific quality options in export UI
  
  // --- UI/UX Enhancements ---
  showAdvancedTextControls: false,  // e.g., Text alignment, shadows, precise positioning
  enableExperimentalTextEffects: false, // For text effects beyond simple fade/typewriter
  enableProjectTemplates: false,    // Feature: Using predefined project templates
  
  // --- Developer/Debugging Flags ---
  logVerboseStateChanges: false,   // Enable more detailed logging for state changes
  logVerboseEventPublish: false,  // Enable logging for all event aggregator publishes
  showDebugInfoOverlay: false,    // Display an overlay with debugging info (FPS, state, etc.)

  // Example of a more complex flag for A/B testing (not typically client-only)
  // newVideoPlayerUI: {
  //   enabled: true,
  //   variant: 'B' // 'A' or 'B'
  // }
};

const FEATURE_FLAG_LOCAL_STORAGE_KEY = 'MQVE_FeatureFlagOverrides';

/**
 * Retrieves the current feature flag settings.
 * It merges default flags with any overrides found in localStorage.
 * This allows developers to toggle features locally without changing code.
 * @returns {FeatureFlagsObject} The active feature flag settings.
 */
function getActiveFeatureFlags() {
  let activeFlags = { ...DEFAULT_FEATURE_FLAGS }; // Start with defaults

  try {
    if (typeof localStorage !== 'undefined') {
      const overridesString = localStorage.getItem(FEATURE_FLAG_LOCAL_STORAGE_KEY);
      if (overridesString) {
        const overrides = JSON.parse(overridesString);
        // Merge overrides: localStorage values take precedence.
        // This is a shallow merge for the top-level flags.
        // For complex flag objects, a deep merge might be needed if you want to override only sub-properties.
        activeFlags = { ...activeFlags, ...overrides };
      }
    }
  } catch (error) {
    console.warn('[Feature Flags] Error reading or parsing feature flag overrides from localStorage:', error);
    // Continue with default flags if localStorage parsing fails.
  }
  return activeFlags;
}

/**
 * The currently active feature flags for the application session.
 * This object is initialized once when the module is first imported.
 * @type {FeatureFlagsObject}
 */
const currentActiveFlags = getActiveFeatureFlags();


// --- Public API for Feature Flags ---

const featureFlags = {
  /**
   * Checks if a specific feature is enabled.
   * @param {string} flagName - The name of the feature flag.
   * @returns {boolean} True if the feature is enabled, false otherwise.
   *                    Returns false if the flag name doesn't exist (considered disabled).
   */
  isEnabled(flagName) {
    const flag = currentActiveFlags[flagName];
    if (typeof flag === 'boolean') {
      return flag;
    }
    if (typeof flag === 'object' && flag !== null && typeof flag.enabled === 'boolean') {
      return flag.enabled;
    }
    // If flag is not defined or has an unexpected structure, consider it disabled.
    // console.warn(`[Feature Flags] Flag "${flagName}" is not defined or has an invalid structure. Defaulting to disabled.`);
    return false;
  },

  /**
   * Gets the full configuration object for a feature flag if it's more complex than a boolean.
   * @param {string} flagName - The name of the feature flag.
   * @returns {object | boolean | undefined} The flag's value/configuration, or undefined if not found.
   */
  getFlagConfig(flagName) {
    return currentActiveFlags[flagName];
  },

  /**
   * (For Development/Debugging ONLY)
   * Sets a feature flag override in localStorage and re-evaluates active flags.
   * This will require a page reload or a mechanism to re-initialize modules that depend on flags
   * for the changes to take full effect across the application.
   * @param {string} flagName - The name of the feature flag to override.
   * @param {boolean | object} value - The new value or configuration for the flag.
   */
  setOverride(flagName, value) {
    if (typeof localStorage === 'undefined') {
      console.warn('[Feature Flags] localStorage not available. Cannot set override.');
      return;
    }
    try {
      const overridesString = localStorage.getItem(FEATURE_FLAG_LOCAL_STORAGE_KEY);
      const currentOverrides = overridesString ? JSON.parse(overridesString) : {};
      currentOverrides[flagName] = value;
      localStorage.setItem(FEATURE_FLAG_LOCAL_STORAGE_KEY, JSON.stringify(currentOverrides));
      // Important: To see the effect immediately, currentActiveFlags needs to be updated.
      // This naive update might not propagate if modules have already cached flag values at init.
      // Best used with a page reload or a more sophisticated hot-reloading/re-initialization mechanism.
      currentActiveFlags[flagName] = value; // Update in-memory cache
      console.log(`[Feature Flags] Override set for "${flagName}". Value:`, value, "Page reload might be needed for full effect.");
    } catch (error) {
      console.error('[Feature Flags] Error setting override in localStorage:', error);
    }
  },

  /**
   * (For Development/Debugging ONLY)
   * Clears a specific feature flag override from localStorage.
   * @param {string} flagName - The name of the flag to clear override for.
   */
  clearOverride(flagName) {
    if (typeof localStorage === 'undefined') return;
    try {
      const overridesString = localStorage.getItem(FEATURE_FLAG_LOCAL_STORAGE_KEY);
      if (overridesString) {
        const currentOverrides = JSON.parse(overridesString);
        delete currentOverrides[flagName];
        localStorage.setItem(FEATURE_FLAG_LOCAL_STORAGE_KEY, JSON.stringify(currentOverrides));
        // Update in-memory active flags to reflect the default
        delete currentActiveFlags[flagName]; // Remove override
        if (DEFAULT_FEATURE_FLAGS[flagName] !== undefined) { // Re-apply default if exists
             currentActiveFlags[flagName] = DEFAULT_FEATURE_FLAGS[flagName];
        }
        console.log(`[Feature Flags] Override cleared for "${flagName}". Effective value now default.`);
      }
    } catch (error) { console.error('[Feature Flags] Error clearing override:', error); }
  },

  /** (For Development/Debugging ONLY) Clears all overrides from localStorage. */
  clearAllOverrides() {
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(FEATURE_FLAG_LOCAL_STORAGE_KEY);
        Object.assign(currentActiveFlags, DEFAULT_FEATURE_FLAGS); // Reset in-memory to defaults
        console.log('[Feature Flags] All overrides cleared from localStorage. Effective values now defaults.');
    }
  },

  /** (For Development/Debugging ONLY) Gets all active flags (defaults merged with overrides) */
  getAllActiveFlags: () => ({...currentActiveFlags}),

  /** (For Development/Debugging ONLY) Gets all default flags */
  getAllDefaultFlags: () => ({...DEFAULT_FEATURE_FLAGS}),
};


/**
 * Initialization function for FeatureFlags (placeholder, as it's mostly self-initializing).
 * Could be used to inject a logger or perform sanity checks.
 * @param {object} [dependencies] - Optional dependencies.
 * // @param {import('../../core/error-logger.js').default} [dependencies.errorLogger]
 */
export function initializeFeatureFlags(dependencies = {}) {
  // const { errorLogger } = dependencies;
  // The flags are already read when the module is imported.
  // This init function could potentially trigger a re-read or log initialization.
  // console.info('[FeatureFlags] Initialized. Active flags:', featureFlags.getAllActiveFlags());
  
  // Make helper functions available globally for easier debugging in developer console
  if (typeof window !== 'undefined' && (typeof process === 'undefined' || process.env.NODE_ENV === 'development')) {
    window.featureFlags = {
        isEnabled: featureFlags.isEnabled,
        getFlagConfig: featureFlags.getFlagConfig,
        setOverride: featureFlags.setOverride,
        clearOverride: featureFlags.clearOverride,
        clearAllOverrides: featureFlags.clearAllOverrides,
        list: featureFlags.getAllActiveFlags,
        defaults: featureFlags.getAllDefaultFlags
    };
  }

  // Return the public API for checking flags.
  return {
    isEnabled: featureFlags.isEnabled,
    getFlagConfig: featureFlags.getFlagConfig,
    // The override methods are primarily for dev tools, not for general app logic to consume as service API
  };
}

// Export the main featureFlags object which contains the methods to check flags.
export default featureFlags;
