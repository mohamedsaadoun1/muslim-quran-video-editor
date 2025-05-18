// js/features/editor-shell/project-title.editor.js

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, EVENTS, DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';
// import { escapeHtml } from '../../utils/string.enhancer.js'; // If displaying in non-contentEditable span

const projectTitleEditor = (() => {
  let titleElement = null; // DOMElements.currentProjectTitleEditor
  let currentTitleFromState = '';
  let isEditing = false; // Track if contentEditable is active to prevent blur loops

  let dependencies = {
    stateStore: {
        getState: () => ({ currentProject: { title: DEFAULT_PROJECT_SCHEMA.title } }),
        dispatch: () => {},
        subscribe: () => (() => {})
    },
    eventAggregator: { publish: () => {} },
    errorLogger: console,
    localizationService: { translate: key => key }
  };
  
  /** Updates the title display element from state. @private */
  function _updateTitleDisplay(newTitle) {
    if (titleElement && !isEditing) { // Don't update if user is currently editing
        const displayTitle = newTitle || dependencies.localizationService.translate('editorScreen.projectTitle.default', DEFAULT_PROJECT_SCHEMA.title);
        if (titleElement.textContent !== displayTitle) {
            titleElement.textContent = displayTitle;
        }
        currentTitleFromState = newTitle; // Keep track of the state-driven title
    }
  }

  /** Handles when the title element gains focus (becomes editable). @private */
  function _handleTitleFocus() {
    isEditing = true;
    // Optional: Select all text when focused for easy replacement
    // const range = document.createRange();
    // range.selectNodeContents(titleElement);
    // const selection = window.getSelection();
    // selection.removeAllRanges();
    // selection.addRange(range);
    // console.debug('[ProjectTitleEditor] Title editing started.');
  }

  /**
   * Handles when the title element loses focus (blur) or Enter key is pressed.
   * This is where the new title is read and dispatched to the state store.
   * @private
   */
  function _handleTitleChangeOrBlur() {
    if (!titleElement || !isEditing) return; // Only act if it was being edited

    isEditing = false; // Mark editing as complete
    let newTitle = titleElement.textContent.trim();

    // Sanitize or validate the new title (e.g., prevent empty title)
    if (!newTitle) {
      newTitle = currentTitleFromState || dependencies.localizationService.translate('editorScreen.projectTitle.default', DEFAULT_PROJECT_SCHEMA.title);
      titleElement.textContent = newTitle; // Revert to old or default if empty
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'Project title cannot be empty. Reverted to previous/default.',
        origin: 'ProjectTitleEditor._handleTitleChangeOrBlur'
      });
       dependencies.notificationServiceAPI?.showWarning('اسم المشروع لا يمكن أن يكون فارغًا.'); // Needs notificationServiceAPI
      return;
    }
    
    // Max length check (example)
    const MAX_TITLE_LENGTH = 100;
    if (newTitle.length > MAX_TITLE_LENGTH) {
        newTitle = newTitle.substring(0, MAX_TITLE_LENGTH);
        titleElement.textContent = newTitle; // Update UI with truncated title
        (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
            message: `Project title truncated to ${MAX_TITLE_LENGTH} characters.`,
            origin: 'ProjectTitleEditor._handleTitleChangeOrBlur'
        });
        dependencies.notificationServiceAPI?.showWarning(`تم قص اسم المشروع لـ ${MAX_TITLE_LENGTH} حرفًا.`);
    }


    if (newTitle !== currentTitleFromState) {
      // console.debug(`[ProjectTitleEditor] Title changed to: "${newTitle}"`);
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
        title: newTitle // Dispatching action to update project title in state
      });
      // stateStore subscription should update `currentTitleFromState` and re-render UI if necessary,
      // but we've already updated titleElement.textContent here.
      // `_updateTitleDisplay` has a check for `!isEditing`.
      currentTitleFromState = newTitle; // Update local cache too
      
      // Optionally publish an event that the title has been user-modified
      dependencies.eventAggregator.publish(EVENTS.PROJECT_TITLE_CHANGED_BY_USER, { newTitle }); // Define this EVENT
    }
  }
  
  /** Handles keydown events on the title element (e.g., Enter to save, Escape to cancel). @private */
  function _handleTitleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault(); // Prevent newline in contentEditable
      titleElement.blur();    // Trigger blur to save changes
    } else if (event.key === 'Escape') {
      titleElement.textContent = currentTitleFromState; // Revert to original state title
      titleElement.blur();    // Trigger blur (which will now do nothing as text matches state)
    }
  }

  function _setDependencies(injectedDeps) {
    Object.assign(dependencies, injectedDeps);
    // Also get notificationServiceAPI if provided
    if (injectedDeps.notificationServiceAPI) dependencies.notificationServiceAPI = injectedDeps.notificationServiceAPI;

  }

  // Public API
  return {
    _setDependencies,
    // No public methods needed typically if initialization handles everything.
  };
})(); // IIFE Removed

/**
 * Initialization function for the ProjectTitleEditor.
 * @param {object} deps
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../core/event-aggregator.js').default} deps.eventAggregator
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * @param {import('../../core/localization.service.js').default} deps.localizationService
 * @param {object} [deps.notificationServiceAPI] - Optional, for user feedback.
 */
export function initializeProjectTitleEditor(deps) {
  projectTitleEditor._setDependencies(deps);
  const { stateStore, errorLogger, localizationService } = deps;

  const titleEl = DOMElements.currentProjectTitleEditor;
  projectTitleEditor.titleElementRef = titleEl; // Store ref if needed by other methods on object

  if (!titleEl) {
    (errorLogger.logWarning || console.warn).call(errorLogger, {
      message: 'Project title DOM element (ID: current-project-title-editor) not found. Title editing disabled.',
      origin: 'initializeProjectTitleEditor'
    });
    return { cleanup: () => {} };
  }
  
  // Local scoped versions of handlers to capture `deps`
  let localIsEditing = false;
  let localCurrentTitleFromState = DEFAULT_PROJECT_SCHEMA.title;

  const _updateTitleDisplayLocal = (newTitle) => {
    if (titleEl && !localIsEditing) {
      const displayTitle = newTitle || localizationService.translate('editorScreen.projectTitle.default', DEFAULT_PROJECT_SCHEMA.title);
      if (titleEl.textContent !== displayTitle) titleEl.textContent = displayTitle;
      localCurrentTitleFromState = newTitle || displayTitle;
    }
  };

  const _handleTitleFocusLocal = () => { localIsEditing = true; };
  const _handleTitleBlurLocal = () => {
    if (!titleEl || !localIsEditing) return;
    localIsEditing = false;
    let newTitle = titleEl.textContent.trim();
    if (!newTitle) {
      newTitle = localCurrentTitleFromState; // Revert
      titleEl.textContent = newTitle;
      deps.notificationServiceAPI?.showWarning('اسم المشروع لا يمكن أن يكون فارغًا.');
      return;
    }
    if (newTitle !== localCurrentTitleFromState) {
      stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { title: newTitle });
      // localCurrentTitleFromState will be updated by the state subscription
    }
  };
  const _handleTitleKeyDownLocal = (event) => {
    if (event.key === 'Enter') { event.preventDefault(); titleEl.blur(); }
    else if (event.key === 'Escape') { titleEl.textContent = localCurrentTitleFromState; titleEl.blur(); }
  };

  // Set initial state and listeners
  titleEl.setAttribute('contenteditable', 'true');
  titleEl.setAttribute('spellcheck', 'false'); // Often desirable for titles
  
  titleEl.addEventListener('focus', _handleTitleFocusLocal);
  titleEl.addEventListener('blur', _handleTitleBlurLocal);
  titleEl.addEventListener('keydown', _handleTitleKeyDownLocal);

  // Subscribe to state changes to update the title display if changed programmatically
  // or when a new project is loaded.
  const unsubscribeState = stateStore.subscribe((newState) => {
    const projectTitle = newState.currentProject?.title;
    const defaultTitle = localizationService.translate('editorScreen.projectTitle.default', DEFAULT_PROJECT_SCHEMA.title);
    // Only update if not currently editing to avoid disrupting user input
    if (!localIsEditing) {
        _updateTitleDisplayLocal(projectTitle === null || projectTitle === undefined ? defaultTitle : projectTitle);
    }
    // Ensure contentEditable is enabled only if there is a project
    titleEl.contentEditable = !!newState.currentProject;
    titleEl.style.cursor = newState.currentProject ? 'text' : 'default';
  });
  
  // Initial title update
  const initialProject = stateStore.getState().currentProject;
  _updateTitleDisplayLocal(initialProject?.title || localizationService.translate('editorScreen.projectTitle.default', DEFAULT_PROJECT_SCHEMA.title));
  titleEl.contentEditable = !!initialProject;
  titleEl.style.cursor = initialProject ? 'text' : 'default';


  // console.info('[ProjectTitleEditor] Initialized.');
  return {
    cleanup: () => {
      unsubscribeState();
      if (titleEl) {
        titleEl.removeEventListener('focus', _handleTitleFocusLocal);
        titleEl.removeEventListener('blur', _handleTitleBlurLocal);
        titleEl.removeEventListener('keydown', _handleTitleKeyDownLocal);
        titleEl.removeAttribute('contenteditable');
      }
      // console.info('[ProjectTitleEditor] Cleaned up.');
    }
  };
}

export default projectTitleEditor;
