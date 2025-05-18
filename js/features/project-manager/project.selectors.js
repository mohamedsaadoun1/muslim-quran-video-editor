// js/features/project-manager/project.selectors.js

// Import default project schema for fallback values
import { DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';

/**
 * @typedef {import('../../core/state-store.js').AppState} AppState
 * @typedef {import('../../core/state-store.js').ProjectState} ProjectState // Or ProjectModelSchema
 */

// --- Selectors for Current Project ---

/**
 * Gets the entire current project object from the app state.
 * @param {AppState} state - The current application state.
 * @returns {ProjectState | null} The current project object, or null if no project is active.
 */
export function getCurrentProject(state) {
  return state.currentProject || null;
}

/**
 * Gets the ID of the current project.
 * @param {AppState} state - The current application state.
 * @returns {string | null} The ID of the current project, or null.
 */
export function getCurrentProjectId(state) {
  return state.currentProject?.id || null;
}

/**
 * Gets the title of the current project.
 * Returns a default title if no project is active or title is missing.
 * @param {AppState} state - The current application state.
 * @param {import('../../core/localization.service.js').default} [localizationService] - Optional, for default title translation.
 * @returns {string} The title of the current project or a default.
 */
export function getCurrentProjectTitle(state, localizationService) {
  const defaultTitle = localizationService?.translate('editorScreen.projectTitle.default', DEFAULT_PROJECT_SCHEMA.title) || DEFAULT_PROJECT_SCHEMA.title;
  return state.currentProject?.title || defaultTitle;
}

/**
 * Checks if there is an active project currently loaded.
 * @param {AppState} state - The current application state.
 * @returns {boolean} True if a project is active, false otherwise.
 */
export function hasActiveProject(state) {
  return !!state.currentProject && !!state.currentProject.id;
}

/**
 * Checks if the current project has unsaved changes.
 * This is a placeholder. Real implementation would compare currentProject in state
 * with its last saved version (e.g., by storing a 'lastSavedSnapshot' or using timestamps
 * and comparing against the version in `savedProjects` list).
 * For now, it might just check a hypothetical `isDirty` flag.
 * @param {AppState} state - The current application state.
 * @returns {boolean}
 */
export function isCurrentProjectDirty(state) {
  // Placeholder logic - needs proper implementation
  return state.currentProject?.isDirty || false; // Assuming an 'isDirty' flag is managed elsewhere
}


// --- Selectors for Saved Projects List ---

/**
 * Gets the array of all saved projects.
 * @param {AppState} state - The current application state.
 * @returns {Array<ProjectState>} An array of saved project objects. Defaults to an empty array.
 */
export function getSavedProjects(state) {
  return state.savedProjects || [];
}

/**
 * Gets a specific saved project by its ID from the list of saved projects.
 * @param {AppState} state - The current application state.
 * @param {string} projectId - The ID of the project to find.
 * @returns {ProjectState | undefined} The project object if found, otherwise undefined.
 */
export function getSavedProjectById(state, projectId) {
  if (!projectId) return undefined;
  return (state.savedProjects || []).find(project => project.id === projectId);
}

/**
 * Gets the count of saved projects.
 * @param {AppState} state - The current application state.
 * @returns {number} The number of saved projects.
 */
export function getSavedProjectsCount(state) {
  return (state.savedProjects || []).length;
}

/**
 * Checks if there are any saved projects.
 * @param {AppState} state - The current application state.
 * @returns {boolean} True if there are saved projects, false otherwise.
 */
export function hasSavedProjects(state) {
  return (state.savedProjects || []).length > 0;
}


// This module primarily exports selector functions.
// An `initialize...` function is not typically needed for a selectors module,
// unless it needed to, for example, initialize memoized selectors with a caching strategy.

/**
 * Initialization function for ProjectSelectors (placeholder, usually not needed).
 * @param {object} [dependencies] - Optional dependencies (e.g., errorLogger for logging in complex selectors).
 * // @param {import('../../core/error-logger.js').default} [dependencies.errorLogger]
 */
export function initializeProjectSelectors(dependencies = {}) {
  // const { errorLogger } = dependencies;
  // console.info('[ProjectSelectors] Initialized (provides selectors for project state).');

  // Return the selector functions so they can be provided as a single API object
  // by moduleBootstrap if configured with 'provides'.
  return {
    getCurrentProject,
    getCurrentProjectId,
    getCurrentProjectTitle,
    hasActiveProject,
    isCurrentProjectDirty,
    getSavedProjects,
    getSavedProjectById,
    getSavedProjectsCount,
    hasSavedProjects,
  };
}

// Exporting the functions directly is common for selector modules.
// No default export for the module object itself unless it becomes a class or complex object.
