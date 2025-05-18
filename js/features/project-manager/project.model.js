// js/features/project-manager/project.model.js

import { DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';

/**
 * @typedef {import('../../core/state-store.js').ProjectState} ProjectStateSchema
 *  - This re-uses the ProjectState typedef from state-store.js if it's comprehensive.
 *  - Alternatively, define the full Project structure here again for explicitness if preferred.
 *    For example:
 *
 * @typedef {Object} QuranSelectionModel
 * @property {number} surahId
 * @property {number} startAyah
 * @property {number} endAyah
 * @property {string} reciterId
 * @property {string | null} translationId
 * @property {number} delayBetweenAyahs
 * @property {Object.<number, {start: number, end: number}>} [ayahTimings]
 *
 * @typedef {Object} BackgroundModel
 * @property {'color' | 'image' | 'video'} type
 * @property {string} source
 * @property {string | null} [fileName]
 * @property {import('./background.state.js').AISuggestionsState} [aiSuggestions] // Assuming AISuggestionsState is defined
 *
 * @typedef {Object} TextStyleModel
 * @property {string} fontFamily
 * @property {number} fontSize
 * @property {string} fontColor
 * @property {string} textBgColor
 * @property {string} textAnimation
 *
 * @typedef {Object} VideoCompositionModel
 * @property {string} aspectRatio
 * @property {string} videoFilter
 *
 * @typedef {Object} ExportSettingsModel
 * @property {string} resolution
 * @property {string} format
 * @property {number} fps
 *
 * @typedef {Object} ProjectModelSchema
 * @property {string} id - Unique identifier for the project.
 * @property {string} title - User-defined title of the project.
 * @property {number} createdAt - Timestamp of creation (milliseconds since epoch).
 * @property {number} updatedAt - Timestamp of last update.
 * @property {QuranSelectionModel} quranSelection
 * @property {BackgroundModel} background
 * @property {TextStyleModel} textStyle
 * @property {VideoCompositionModel} videoComposition
 * @property {ExportSettingsModel} exportSettings
 * // Add any other top-level project properties here
 */


/**
 * Generates a simple unique ID (for demo purposes - consider UUID for production).
 * Duplicated here from project.actions.js if this model is used independently for creation.
 * Ideally, ID generation is a utility or part of the action that creates.
 * @private
 */
function _generateId() {
  return `project_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Creates a new project object with default settings and a unique ID.
 * It deeply clones the default schema and merges any overrides.
 *
 * @param {Partial<ProjectModelSchema>} [initialOverrides={}] - Optional object with properties to override the defaults.
 *                                                              Can include nested partial objects for quranSelection, etc.
 * @returns {ProjectModelSchema} The fully formed new project object.
 */
export function createNewProject(initialOverrides = {}) {
  const now = Date.now();
  
  // Deep clone the default project schema to prevent modification of the original
  // and to ensure all nested objects are also new instances.
  const defaultProject = JSON.parse(JSON.stringify(DEFAULT_PROJECT_SCHEMA));

  // Start with a base structure including ID and timestamps
  let newProjectData = {
    id: initialOverrides.id || _generateId(), // Use provided ID or generate new
    title: initialOverrides.title || defaultProject.title,
    createdAt: initialOverrides.createdAt || now,
    updatedAt: initialOverrides.updatedAt || now,
  };

  // Deep merge for nested properties to ensure defaults are respected if overrides are partial
  const nestedKeys = ['quranSelection', 'background', 'textStyle', 'videoComposition', 'exportSettings'];
  
  nestedKeys.forEach(key => {
    newProjectData[key] = {
      ...(defaultProject[key] || {}), // Start with defaults for this nested object
      ...(initialOverrides[key] || {}), // Override with provided values for this nested object
    };
  });
  
  // If aiSuggestions needs specific handling or deep merging and is part of overrides.background
  if (initialOverrides.background && initialOverrides.background.aiSuggestions) {
      newProjectData.background.aiSuggestions = {
          ...(defaultProject.background.aiSuggestions || { photos: [], videos: [], query: null, isLoading: false, error: null, timestamp: null }),
          ...(initialOverrides.background.aiSuggestions)
      };
  } else if (!newProjectData.background.aiSuggestions) { // Ensure aiSuggestions object exists
      newProjectData.background.aiSuggestions = { photos: [], videos: [], query: null, isLoading: false, error: null, timestamp: null };
  }


  // Any other top-level overrides not covered by nestedKeys
  for (const key in initialOverrides) {
    if (Object.prototype.hasOwnProperty.call(initialOverrides, key) && !nestedKeys.includes(key) && !['id','title','createdAt','updatedAt'].includes(key)) {
      newProjectData[key] = initialOverrides[key];
    }
  }
  
  // @ts-ignore // Assuming newProjectData now matches ProjectModelSchema
  return newProjectData;
}


/**
 * Validates a project object against the expected schema (basic check).
 * For more complex validation, a library like Joi or Zod would be better.
 * @param {any} projectData - The project data to validate.
 * @returns {{isValid: boolean, errors: string[]}} Validation result.
 */
export function validateProjectData(projectData) {
  const errors = [];
  if (!projectData || typeof projectData !== 'object') {
    errors.push('Project data must be an object.');
    return { isValid: false, errors };
  }

  if (typeof projectData.id !== 'string' || !projectData.id) errors.push('Project ID is required and must be a string.');
  if (typeof projectData.title !== 'string') errors.push('Project title must be a string.'); // Allow empty string for title if intended
  if (typeof projectData.createdAt !== 'number') errors.push('Project createdAt timestamp is required.');
  if (typeof projectData.updatedAt !== 'number') errors.push('Project updatedAt timestamp is required.');

  // Basic checks for nested objects (presence and type)
  const nestedObjects = ['quranSelection', 'background', 'textStyle', 'videoComposition', 'exportSettings'];
  nestedObjects.forEach(key => {
    if (typeof projectData[key] !== 'object' || projectData[key] === null) {
      errors.push(`${key} data is required and must be an object.`);
    }
  });

  // Example deeper validation for a field
  if (projectData.quranSelection && typeof projectData.quranSelection.surahId !== 'number') {
      errors.push('quranSelection.surahId must be a number.');
  }
  // Add more specific field validations as needed...

  return {
    isValid: errors.length === 0,
    errors
  };
}


// This module primarily exports functions related to the project data model.
// An `initialize...` function is generally not needed for a model definition module,
// unless it were to, for example, register model schemas with a validation library globally.

/**
 * Initialization function for ProjectModel (placeholder, usually not needed for a model).
 * @param {object} [dependencies] - Optional dependencies.
 */
export function initializeProjectModel(dependencies = {}) {
  // const { errorLogger } = dependencies;
  // console.info('[ProjectModel] Initialized (defines project data structure and creation).');
  
  return {
    createNewProject,
    validateProjectData,
    // defaultProjectSchema: JSON.parse(JSON.stringify(DEFAULT_PROJECT_SCHEMA)) // Expose a clone if needed
  };
}

// Exporting the functions directly is common for model/utility modules.
// No default export needed unless it's a class or a main object.
