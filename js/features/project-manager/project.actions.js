// js/features/project-manager/project.actions.js

import { ACTIONS, EVENTS, DEFAULT_PROJECT_SCHEMA, LS_KEY_SAVED_PROJECTS } from '../../config/app.constants.js';
import DOMElements from '../../core/dom-elements.js'; // Needed if title is read from DOM on save

// Dependencies will be injected via initializeProjectActions
let dependencies = {
  stateStore: {
      getState: () => ({ currentProject: null, savedProjects: [], activeScreen: 'initial' }),
      dispatch: () => {}
  },
  localStorageAdapter: { getItem: () => null, setItem: () => false, removeItem: () => {} },
  errorLogger: console,
  notificationServiceAPI: { showSuccess: () => {}, showError: () => {} },
  eventAggregator: { publish: () => {} },
  // modalFactoryAPI might be needed if prompting for new project name
};

/**
 * Generates a simple unique ID (for demo purposes - consider UUID for production).
 * @private
 */
function _generateProjectId() {
  return `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}


/**
 * Creates a new project object with default settings and a unique ID.
 * @param {Partial<import('../../core/state-store.js').ProjectState>} [initialOverrides] - Optional overrides for default project settings.
 * @returns {import('../../core/state-store.js').ProjectState} The new project object.
 */
function createNewProjectObject(initialOverrides = {}) {
  const now = Date.now();
  // Deep clone DEFAULT_PROJECT_SCHEMA to avoid modifying it
  const defaultProject = JSON.parse(JSON.stringify(DEFAULT_PROJECT_SCHEMA));
  
  const newProject = {
    ...defaultProject,
    id: _generateProjectId(),
    title: initialOverrides.title || defaultProject.title || 'مشروع جديد', // Ensure title default
    createdAt: now,
    updatedAt: now,
    // Merge any specific overrides deeply for nested structures like quranSelection
    ...initialOverrides,
    // Deep merge specific nested objects if provided in overrides
    quranSelection: { ...defaultProject.quranSelection, ...(initialOverrides.quranSelection || {}) },
    background: { ...defaultProject.background, ...(initialOverrides.background || {}) },
    textStyle: { ...defaultProject.textStyle, ...(initialOverrides.textStyle || {}) },
    videoComposition: { ...defaultProject.videoComposition, ...(initialOverrides.videoComposition || {}) },
    exportSettings: { ...defaultProject.exportSettings, ...(initialOverrides.exportSettings || {}) },
  };
  return newProject;
}

/**
 * Action to load a new, empty project into the editor.
 * This involves creating a new project object and then dispatching LOAD_PROJECT.
 */
function loadNewProject() {
  const newProject = createNewProjectObject();
  // console.debug('[ProjectActions] Created new project object:', newProject);
  dependencies.stateStore.dispatch(ACTIONS.LOAD_PROJECT, newProject);
  // stateStore's reducer for LOAD_PROJECT should also set activeScreen to 'editor'
  dependencies.eventAggregator.publish(EVENTS.PROJECT_LOADED, newProject); // Inform other modules
}

/**
 * Loads an existing project by its ID.
 * Reads from localStorage and dispatches LOAD_PROJECT.
 * @param {string} projectId
 */
function loadExistingProjectById(projectId) {
  if (!projectId) {
    (dependencies.errorLogger.logWarning || console.warn)('No projectId provided to loadExistingProjectById.');
    return;
  }
  const savedProjects = dependencies.localStorageAdapter.getItem(LS_KEY_SAVED_PROJECTS, []);
  const projectToLoad = savedProjects.find(p => p.id === projectId);

  if (projectToLoad) {
    // console.debug('[ProjectActions] Loading existing project:', projectToLoad);
    // Ensure project object has all default fields if some were missing from older saved versions
    const defaultStructure = JSON.parse(JSON.stringify(DEFAULT_PROJECT_SCHEMA));
    const hydratedProject = {
        ...defaultStructure, // Start with defaults
        ...projectToLoad,   // Override with saved data
        // Deep merge nested objects to ensure new default fields are included
        quranSelection: { ...defaultStructure.quranSelection, ...(projectToLoad.quranSelection || {}) },
        background: { ...defaultStructure.background, ...(projectToLoad.background || {}) },
        textStyle: { ...defaultStructure.textStyle, ...(projectToLoad.textStyle || {}) },
        videoComposition: { ...defaultStructure.videoComposition, ...(projectToLoad.videoComposition || {}) },
        exportSettings: { ...defaultStructure.exportSettings, ...(projectToLoad.exportSettings || {}) },
    };
    dependencies.stateStore.dispatch(ACTIONS.LOAD_PROJECT, hydratedProject);
    dependencies.eventAggregator.publish(EVENTS.PROJECT_LOADED, hydratedProject);
  } else {
    (dependencies.errorLogger.logWarning || console.warn)(`Project with ID "${projectId}" not found in localStorage.`);
    dependencies.notificationServiceAPI.showError(`المشروع المحدد غير موجود.`);
  }
}

/**
 * Saves the current project (from stateStore) to localStorage.
 * Updates the `savedProjects` list in both stateStore and localStorage.
 */
function saveCurrentProject() {
  const currentProject = dependencies.stateStore.getState().currentProject;
  if (!currentProject || !currentProject.id) {
    (dependencies.errorLogger.logWarning || console.warn)('No current project in state to save.');
    dependencies.notificationServiceAPI.showError('لا يوجد مشروع حالي ليتم حفظه.');
    return false;
  }

  // Get the potentially edited title from the DOM element
  let projectTitleFromDOM = DOMElements.currentProjectTitleEditor?.textContent?.trim();
  if (!projectTitleFromDOM) {
      projectTitleFromDOM = currentProject.title || DEFAULT_PROJECT_SCHEMA.title; // Fallback if DOM empty
  }
  
  const projectToSave = {
    ...currentProject,
    title: projectTitleFromDOM, // Update title from DOM
    updatedAt: Date.now(),
  };

  try {
    let savedProjects = dependencies.localStorageAdapter.getItem(LS_KEY_SAVED_PROJECTS, []);
    const existingProjectIndex = savedProjects.findIndex(p => p.id === projectToSave.id);

    if (existingProjectIndex > -1) {
      savedProjects[existingProjectIndex] = projectToSave; // Update existing
    } else {
      savedProjects.push(projectToSave); // Add new
    }
    
    // Sort by updatedAt DESC before saving to localStorage and state
    savedProjects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    const success = dependencies.localStorageAdapter.setItem(LS_KEY_SAVED_PROJECTS, savedProjects);
    if (success) {
      // Update stateStore's list of saved projects
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_SAVED_PROJECTS_LIST, savedProjects);
      // Also update the currentProject in state store to reflect the new title and updatedAt timestamp
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { title: projectToSave.title, updatedAt: projectToSave.updatedAt });

      dependencies.notificationServiceAPI.showSuccess(`تم حفظ مشروع "${projectToSave.title}" بنجاح!`);
      dependencies.eventAggregator.publish(EVENTS.PROJECT_SAVED, projectToSave);
      // console.debug('[ProjectActions] Project saved:', projectToSave);
      return true;
    } else {
      throw new Error('Failed to write to localStorage.');
    }
  } catch (error) {
    (dependencies.errorLogger.handleError || console.error)({
      error, message: 'فشل حفظ المشروع.', origin: 'ProjectActions.saveCurrentProject'
    });
    dependencies.notificationServiceAPI.showError('فشل حفظ المشروع. قد تكون مساحة التخزين ممتلئة.');
    return false;
  }
}

/**
 * Deletes a project by its ID from localStorage and state.
 * @param {string} projectId
 */
function deleteProjectById(projectId) {
  if (!projectId) {
    (dependencies.errorLogger.logWarning || console.warn)('No projectId provided for deletion.');
    return false;
  }
  try {
    let savedProjects = dependencies.localStorageAdapter.getItem(LS_KEY_SAVED_PROJECTS, []);
    const newSavedProjects = savedProjects.filter(p => p.id !== projectId);

    if (newSavedProjects.length === savedProjects.length) {
      // Project not found, already deleted or invalid ID
      (dependencies.errorLogger.logWarning || console.warn)(`Project with ID "${projectId}" not found for deletion.`);
      return false; // Indicate project wasn't found to be deleted
    }

    const success = dependencies.localStorageAdapter.setItem(LS_KEY_SAVED_PROJECTS, newSavedProjects);
    if (success) {
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_SAVED_PROJECTS_LIST, newSavedProjects);
      dependencies.eventAggregator.publish(EVENTS.PROJECT_DELETED, { projectId }); // Inform others
      // If the deleted project was the currentProject, unload it.
      const currentProjectInState = dependencies.stateStore.getState().currentProject;
      if (currentProjectInState && currentProjectInState.id === projectId) {
        dependencies.stateStore.dispatch(ACTIONS.LOAD_PROJECT, null); // Unload project, which should set activeScreen to 'initial'
      }
      // console.debug(`[ProjectActions] Project deleted: ${projectId}`);
      return true;
    } else {
      throw new Error('Failed to update localStorage after deletion.');
    }
  } catch (error) {
    (dependencies.errorLogger.handleError || console.error)({
      error, message: 'فشل حذف المشروع.', origin: 'ProjectActions.deleteProjectById'
    });
    dependencies.notificationServiceAPI.showError('فشل حذف المشروع.');
    return false;
  }
}


/**
 * Loads all projects from localStorage into the state store.
 * Typically called once on application startup.
 */
function loadAllSavedProjectsFromStorage() {
    const projects = dependencies.localStorageAdapter.getItem(LS_KEY_SAVED_PROJECTS, []);
    // Ensure projects have all default fields from current schema before putting into state
    const defaultStructure = JSON.parse(JSON.stringify(DEFAULT_PROJECT_SCHEMA));
    const hydratedProjects = projects.map(p => ({
        ...defaultStructure,
        ...p,
        quranSelection: { ...defaultStructure.quranSelection, ...(p.quranSelection || {}) },
        background: { ...defaultStructure.background, ...(p.background || {}) },
        textStyle: { ...defaultStructure.textStyle, ...(p.textStyle || {}) },
        videoComposition: { ...defaultStructure.videoComposition, ...(p.videoComposition || {}) },
        exportSettings: { ...defaultStructure.exportSettings, ...(p.exportSettings || {}) },
    })).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); // Sort by newest

    dependencies.stateStore.dispatch(ACTIONS.UPDATE_SAVED_PROJECTS_LIST, hydratedProjects);
    // console.debug('[ProjectActions] Loaded saved projects into state:', hydratedProjects.length);
}


function _setDependencies(injectedDeps) {
  Object.assign(dependencies, injectedDeps);
}

// Public API for project actions
const projectActionsAPI = {
  _setDependencies,
  createNewProjectObject, // Exposed if other modules need to create objects without loading
  loadNewProject,         // Action: Creates a new project and loads it into the editor
  loadExistingProjectById,// Action: Loads an existing project by ID
  saveCurrentProject,     // Action: Saves the project currently in editor
  deleteProjectById,      // Action: Deletes a project by ID
  loadAllSavedProjectsFromStorage, // Called at startup
};


/**
 * Initialization function for ProjectActions.
 * @param {object} deps
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../services/local-storage.adapter.js').default} deps.localStorageAdapter
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * @param {import('../../shared-ui-components/notification.presenter.js').ReturnType<initializeNotificationPresenter>} deps.notificationServiceAPI
 * @param {import('../../core/event-aggregator.js').default} deps.eventAggregator
 * // @param {ReturnType<import('../../shared-ui-components/modal.factory.js').initializeModalFactory>} [deps.modalFactoryAPI]
 */
export function initializeProjectActions(deps) {
  projectActionsAPI._setDependencies(deps); // Pass dependencies

  // Listen for generic save requests from other parts of the app (e.g., Ctrl+S shortcut)
  deps.eventAggregator.subscribe(EVENTS.REQUEST_PROJECT_SAVE, () => {
    projectActionsAPI.saveCurrentProject();
  });

  // Listen for navigation event requesting new project (e.g., from main screen button or shortcut)
  deps.eventAggregator.subscribe(EVENTS.NAVIGATE_TO_EDITOR_NEW_PROJECT, () => {
      projectActionsAPI.loadNewProject();
  });
  
  // On app init, load projects from storage.
  // This should happen after this module is initialized.
  // A dedicated APP_INITIALIZED event might be better for triggering this.
  // Or moduleBootstrap can call it directly after all core inits.
  projectActionsAPI.loadAllSavedProjectsFromStorage();

  // console.info('[ProjectActions] Initialized.');
  return { // Return the public API for other modules
    loadNewProject: projectActionsAPI.loadNewProject,
    loadExistingProjectById: projectActionsAPI.loadExistingProjectById,
    saveCurrentProject: projectActionsAPI.saveCurrentProject,
    deleteProjectById: projectActionsAPI.deleteProjectById,
    // Expose createNewProjectObject if modules might need to get a default project structure
    // createNewProjectObject: projectActionsAPI.createNewProjectObject 
  };
}

export default projectActionsAPI; // Also export the object directly for potential import by name
