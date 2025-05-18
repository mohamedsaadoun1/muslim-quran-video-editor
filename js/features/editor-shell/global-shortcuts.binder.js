// js/features/editor-shell/global-shortcuts.binder.js

import { ACTIONS, EVENTS } from '../../config/app.constants.js';

const globalShortcutsBinder = (() => {
  let dependencies = {
    stateStore: {
        getState: () => ({ activeScreen: 'initial', currentProject: null, mainPlaybackState: { isPlaying: false } }),
        dispatch: () => {}
    },
    eventAggregator: { publish: () => {} },
    errorLogger: console,
    // These APIs would be from other initialized modules
    mainPlaybackAPI: { play: ()=>{}, pause: ()=>{}, next: ()=>{}, previous: ()=>{} }, // From main-playback.controller
    exportRecorderAPI: { startRecording: ()=>{} }, // From ccapture.recorder or ffmpeg.integration
    projectActionsAPI: { saveCurrentProject: () => {} }, // From project.actions.js
    // undoRedoAPI: { undo: () => {}, redo: () => {} } // If undo/redo logic is in a separate API
  };

  let isInitialized = false;

  /**
   * Handles keydown events for global shortcuts.
   * @private
   * @param {KeyboardEvent} event
   */
  function _handleKeyDown(event) {
    const { activeScreen, currentProject } = dependencies.stateStore.getState();

    // Shortcuts that work primarily in the editor screen
    if (activeScreen !== 'editor') {
        // Maybe some shortcuts for initial screen? For now, mostly editor focused.
        // Example: Ctrl+N for new project might work here
        if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
            event.preventDefault();
            dependencies.eventAggregator.publish(EVENTS.NAVIGATE_TO_EDITOR_NEW_PROJECT); // Define this event
        }
        return;
    }

    // Editor-specific shortcuts
    let commandExecuted = false;

    // Ctrl/Cmd + S: Save Project
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (dependencies.projectActionsAPI && typeof dependencies.projectActionsAPI.triggerSaveCurrentProject === 'function') {
          dependencies.projectActionsAPI.triggerSaveCurrentProject(); // Assuming this API exists and handles logic + notification
      } else {
           // Fallback: directly dispatch an event or action if projectActionsAPI isn't fully integrated for this.
           // This should ideally be handled by a dedicated "save" action in project.actions.js.
           // For now, maybe publish an event for the save button handler in main-toolbar.handler.js
           dependencies.eventAggregator.publish(EVENTS.REQUEST_PROJECT_SAVE); // Define this event
      }
      commandExecuted = true;
      // dependencies.notificationServiceAPI?.showInfo('حفظ المشروع...'); (This should be in save handler)
    }
    // Spacebar: Play/Pause (only if not typing in an input/textarea)
    else if (event.key === ' ' && !_isInputFocused(event.target)) {
      event.preventDefault();
      const { isPlaying } = dependencies.stateStore.getState().mainPlaybackState || { isPlaying: false }; // Get current playback state
      if (isPlaying) {
        dependencies.mainPlaybackAPI.pause();
      } else {
        dependencies.mainPlaybackAPI.play();
      }
      commandExecuted = true;
    }
    // ArrowRight: Next Ayah
    else if (event.key === 'ArrowRight' && !_isInputFocused(event.target)) {
      event.preventDefault();
      dependencies.mainPlaybackAPI.next();
      commandExecuted = true;
    }
    // ArrowLeft: Previous Ayah
    else if (event.key === 'ArrowLeft' && !_isInputFocused(event.target)) {
      event.preventDefault();
      dependencies.mainPlaybackAPI.previous();
      commandExecuted = true;
    }
    // Ctrl/Cmd + Z: Undo
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      dependencies.stateStore.dispatch(ACTIONS.UNDO_STATE); // Assuming stateStore handles undo
      // Or if using a dedicated undo/redo API: dependencies.undoRedoAPI.undo();
      commandExecuted = true;
    }
    // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z: Redo
    else if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) {
      event.preventDefault();
      dependencies.stateStore.dispatch(ACTIONS.REDO_STATE); // Assuming stateStore handles redo
      // Or: dependencies.undoRedoAPI.redo();
      commandExecuted = true;
    }
    // Ctrl/Cmd + E: Export (maybe open export panel or trigger export if settings are "final")
    // else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
    //   event.preventDefault();
    //   // Logic to open export panel or trigger export
    //   dependencies.eventAggregator.publish(EVENTS.REQUEST_EXPORT_PANEL_OPEN); // Define this
    //   commandExecuted = true;
    // }

    // Add more shortcuts here

    if (commandExecuted) {
      // console.debug(`[GlobalShortcuts] Executed: ${event.key} (Ctrl/Cmd: ${event.ctrlKey || event.metaKey})`);
    }
  }

  /**
   * Checks if the event target is an input, textarea, or contentEditable element.
   * Used to prevent shortcuts from firing when the user is typing.
   * @private
   * @param {EventTarget | null} target - The event target.
   * @returns {boolean} True if the target is an input-like element.
   */
  function _isInputFocused(target) {
    if (!target) return false;
    const tagName = target.tagName?.toUpperCase();
    return (
      tagName === 'INPUT' ||
      tagName === 'TEXTAREA' ||
      target.isContentEditable // For contentEditable divs
    );
  }

  function _setDependencies(injectedDeps) {
      Object.assign(dependencies, injectedDeps);
  }

  return {
    _setDependencies, // For initialization by wrapper
    // Methods like `enable()`, `disable()` could be added if needed
    // Or `bind(element)` if not binding to document globally
  };
})();


/**
 * Initialization function for GlobalShortcutsBinder.
 * Attaches the global keydown listener.
 * @param {object} deps
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../core/event-aggregator.js').default} deps.eventAggregator
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * @param {object} [deps.mainPlaybackAPI] - From initializeMainPlaybackController
 * @param {object} [deps.exportRecorderAPI] - From initializeCcaptureRecorder etc.
 * @param {object} [deps.projectActionsAPI] - From initializeProjectActions
 */
export function initializeGlobalShortcutsBinder(deps) {
  globalShortcutsBinder._setDependencies(deps); // Pass dependencies to internal scope
  const { errorLogger } = deps; // Get errorLogger for use in this function

  // Rename internal _handleKeyDown to avoid conflict if file is re-run in some envs
  const handleKeyDownScoped = (event) => { // Scoped version of _handleKeyDown
    const { activeScreen } = deps.stateStore.getState();

    if (activeScreen !== 'editor' && !( (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') ) {
        return; // Most shortcuts are editor-only
    }

    let commandExecuted = false;
    const isInputFocused = (target) => { /* ... same as _isInputFocused ... */
        if (!target) return false;
        const tagName = target.tagName?.toUpperCase();
        return (tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable);
    };


    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        deps.eventAggregator.publish(EVENTS.REQUEST_PROJECT_SAVE); // Centralize save request
        commandExecuted = true;
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n' && activeScreen === 'initial') {
         event.preventDefault();
         deps.eventAggregator.publish(EVENTS.NAVIGATE_TO_EDITOR_NEW_PROJECT); // Define in constants
         commandExecuted = true;
    } else if (activeScreen === 'editor') { // Remaining shortcuts are editor-only
        if (event.key === ' ' && !isInputFocused(event.target)) {
            event.preventDefault();
            const { isPlaying } = deps.stateStore.getState().mainPlaybackState || { isPlaying: false };
            if (isPlaying) deps.mainPlaybackAPI?.pause(); else deps.mainPlaybackAPI?.play();
            commandExecuted = true;
        } else if (event.key === 'ArrowRight' && !isInputFocused(event.target)) {
            event.preventDefault(); deps.mainPlaybackAPI?.next(); commandExecuted = true;
        } else if (event.key === 'ArrowLeft' && !isInputFocused(event.target)) {
            event.preventDefault(); deps.mainPlaybackAPI?.previous(); commandExecuted = true;
        } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
            event.preventDefault(); deps.stateStore.dispatch(ACTIONS.UNDO_STATE); commandExecuted = true;
        } else if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) {
            event.preventDefault(); deps.stateStore.dispatch(ACTIONS.REDO_STATE); commandExecuted = true;
        }
    }

    // if (commandExecuted) { /* console.debug log */ }
  };


  // Remove any existing listener before adding a new one (if init could be called multiple times)
  document.removeEventListener('keydown', globalShortcutsBinder._internalKeyDownHandler || (() => {}));
  globalShortcutsBinder._internalKeyDownHandler = handleKeyDownScoped; // Store ref for removal
  
  document.addEventListener('keydown', globalShortcutsBinder._internalKeyDownHandler);

  // console.info('[GlobalShortcutsBinder] Initialized and keydown listener attached to document.');

  return {
    cleanup: () => {
      if (globalShortcutsBinder._internalKeyDownHandler) {
        document.removeEventListener('keydown', globalShortcutsBinder._internalKeyDownHandler);
        delete globalShortcutsBinder._internalKeyDownHandler; // Clean up stored ref
      }
      // console.info('[GlobalShortcutsBinder] Cleaned up keydown listener.');
    }
    // No other public API is typically needed from a simple binder.
  };
}

export default globalShortcutsBinder;
