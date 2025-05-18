// js/features/editor-shell/main-toolbar.handler.js

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, EVENTS } from '../../config/app.constants.js';

const mainToolbarHandler = (() => {
  // DOM element references from DOMElements will be accessed directly
  // No need to cache them here again if DOMElements is properly initialized and used.

  let dependencies = {
    stateStore: {
        getState: () => ({ activeScreen: 'editor', currentProject: null }),
        dispatch: () => {}
    },
    eventAggregator: { publish: () => {} },
    errorLogger: console,
    // themeControllerAPI: { toggleTheme: () => {} } // If theme toggle has its own API
    // projectActionsAPI: { triggerSaveCurrentProject: () => {} } // From project.actions.js
    // navigationServiceAPI: { navigateTo: (screen) => {} } // If navigation is a service
  };

  /**
   * Handles the "Back to Initial Screen" button click.
   * Publishes an event to request navigation.
   * @private
   */
  function _handleBackToInitialScreen() {
    // Before navigating, you might want to check for unsaved changes.
    // This logic would involve stateStore or project manager to check dirty state.
    // For simplicity now, directly request navigation.
    // if (dependencies.projectActionsAPI?.hasUnsavedChanges()) {
    //    const confirmed = await dependencies.modalFactoryAPI.showConfirm({ title: 'تغييرات غير محفوظة', ... });
    //    if (!confirmed) return;
    // }

    // Option 1: Dispatch action to change screen
    dependencies.stateStore.dispatch(ACTIONS.SET_ACTIVE_SCREEN, 'initial');

    // Option 2: Publish a navigation event (cleaner for decoupling)
    // dependencies.eventAggregator.publish(EVENTS.NAVIGATE_TO_SCREEN, { screenId: 'initial' });
    
    // console.debug('[MainToolbarHandler] "Back to Initial Screen" requested.');
  }

  /**
   * Handles the "Save Project" button click.
   * Publishes an event to request saving the current project.
   * The actual saving logic should be in `project.actions.js` or similar.
   * @private
   */
  function _handleSaveProject() {
    const currentProject = dependencies.stateStore.getState().currentProject;
    if (!currentProject) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
          message: 'No current project to save.', origin: 'MainToolbarHandler._handleSaveProject'
      });
      // dependencies.notificationServiceAPI?.showWarning('لا يوجد مشروع حالي لحفظه.');
      return;
    }
    
    // Option 1: Dispatch an action that a saga/thunk in stateStore or project.actions.js handles
    // dependencies.stateStore.dispatch(ACTIONS.SAVE_CURRENT_PROJECT_REQUEST);

    // Option 2: Publish a general "save request" event.
    // This allows project.actions.js or another dedicated module to handle the saving logic
    // including updating the project title from the DOM if it's editable and changed.
    dependencies.eventAggregator.publish(EVENTS.REQUEST_PROJECT_SAVE);
    // console.debug('[MainToolbarHandler] "Save Project" requested.');
  }

  /**
   * Handles the "Toggle Theme" button click.
   * This might directly call a method on a themeControllerAPI or dispatch an action.
   * If theme.controller.js already handles its own button clicks, this might not be needed here.
   * @private
   */
  function _handleToggleTheme() {
    // If theme.controller.js handles its button directly, this function is redundant.
    // If this toolbar handler is the *only* place wiring up this button's click:
    const currentTheme = dependencies.stateStore.getState().currentTheme;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    dependencies.stateStore.dispatch(ACTIONS.SET_THEME, newTheme);
    // console.debug('[MainToolbarHandler] "Toggle Theme" requested.');
  }
  
  function _setDependencies(injectedDeps) {
      Object.assign(dependencies, injectedDeps);
  }

  // Public API is primarily the initializer that sets up listeners.
  return {
    _setDependencies,
  };
})();


/**
 * Initialization function for the MainToolbarHandler.
 * Attaches event listeners to toolbar buttons.
 * @param {object} deps
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../core/event-aggregator.js').default} deps.eventAggregator
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * // @param {object} [deps.projectActionsAPI] - From project.actions.js if save is a direct call
 * // @param {object} [deps.themeControllerAPI] - If theme toggle has a specific API
 */
export function initializeMainToolbarHandler(deps) {
  mainToolbarHandler._setDependencies(deps);
  const { errorLogger, stateStore, eventAggregator } = deps; // Destructure for use in handlers

  let backButton, saveButton, themeButton; // Local refs to DOM elements

  // --- Define handlers within this closure to access `deps` correctly ---
  const handleBackToInitialClick = () => {
    // Check for unsaved changes here before navigating (using stateStore or a project dirty flag)
    // const projectIsDirty = stateStore.getState().currentProject?.isDirty; // hypothetical
    // if (projectIsDirty) { ... show confirm modal ... }
    eventAggregator.publish(EVENTS.NAVIGATE_TO_SCREEN, { screenId: 'initial' }); // Preferred way
    // or stateStore.dispatch(ACTIONS.SET_ACTIVE_SCREEN, 'initial');
  };

  const handleSaveProjectClick = () => {
    const currentProject = stateStore.getState().currentProject;
    if (!currentProject) { /* log warning */ return; }
    eventAggregator.publish(EVENTS.REQUEST_PROJECT_SAVE, { projectId: currentProject.id /*, any other context */ });
  };
  
  const handleToggleThemeClick = () => {
      // Assuming theme.controller.js correctly wires its own buttons, this might be redundant.
      // If this button is solely controlled here:
      const currentTheme = stateStore.getState().currentTheme;
      stateStore.dispatch(ACTIONS.SET_THEME, currentTheme === 'light' ? 'dark' : 'light');
  };


  // Attach listeners
  backButton = DOMElements.backToInitialScreenBtn;
  if (backButton) {
    backButton.addEventListener('click', handleBackToInitialClick);
  } else {
    (errorLogger.logWarning || console.warn)('Back button in editor toolbar not found.');
  }

  saveButton = DOMElements.saveProjectBtnEditor;
  if (saveButton) {
    saveButton.addEventListener('click', handleSaveProjectClick);
  } else {
    (errorLogger.logWarning || console.warn)('Save button in editor toolbar not found.');
  }
  
  themeButton = DOMElements.themeToggleEditor;
  if (themeButton) {
      // Check if theme.controller.js already handles this. If not:
      themeButton.addEventListener('click', handleToggleThemeClick);
      // If theme.controller.js *does* handle it, this listener here is not needed
      // and this button might just get its icon updated by theme.controller.
  } else {
    (errorLogger.logWarning || console.warn)('Theme toggle button in editor toolbar not found.');
  }
  
  // console.info('[MainToolbarHandler] Initialized and event listeners attached.');

  return {
    cleanup: () => {
      if (backButton) backButton.removeEventListener('click', handleBackToInitialClick);
      if (saveButton) saveButton.removeEventListener('click', handleSaveProjectClick);
      if (themeButton) themeButton.removeEventListener('click', handleToggleThemeClick);
      // console.info('[MainToolbarHandler] Cleaned up event listeners.');
    }
    // No other public API usually needed from a simple handler module.
  };
}

export default mainToolbarHandler;
