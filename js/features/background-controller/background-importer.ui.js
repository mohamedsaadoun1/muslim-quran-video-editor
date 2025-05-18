// js/features/background-controller/background-importer.ui.js

import DOMElements from '../../core/dom-elements.js';
import fileIOUtils from '../../services/file.io.utils.js'; // Assuming this service is available
import { ACTIONS, EVENTS } from '../../config/app.constants.js';

const backgroundImporterUI = (() => {
  let fileInputElement = null;
  let currentObjectUrlToRevoke = null; // To keep track of video object URLs for cleanup

  let dependencies = {
    stateStore: {
        getState: () => ({ currentProject: null }), // For getting current project to maybe clear old source
        dispatch: () => {}
    },
    errorLogger: console,
    notificationServiceAPI: { showSuccess: ()=>{}, showError: ()=>{} }, // Fallback
    eventAggregator: { publish: () => {} } // If needed to signal background update more broadly
  };

  /**
   * Handles the 'change' event when a user selects a file.
   * Reads the file and dispatches an action to update the background state.
   * @private
   */
  async function _handleFileSelection(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) {
      return; // No file selected or selection cancelled
    }

    // console.debug(`[BackgroundImporterUI] File selected: ${file.name}, type: ${file.type}`);
    // Indicate loading state
    dependencies.stateStore.dispatch(ACTIONS.SET_LOADING, true);

    // Revoke any previously created object URL for a video background
    if (currentObjectUrlToRevoke) {
      fileIOUtils.revokeObjectURL(currentObjectUrlToRevoke);
      currentObjectUrlToRevoke = null;
    }

    let backgroundType = null;
    let backgroundSource = null;
    let success = false;

    try {
      if (file.type.startsWith('image/')) {
        backgroundType = 'image';
        backgroundSource = await fileIOUtils.readFileAsDataURL(file);
        success = true;
      } else if (file.type.startsWith('video/')) {
        backgroundType = 'video';
        backgroundSource = fileIOUtils.createObjectURL(file); // Returns a string
        if (backgroundSource) {
            currentObjectUrlToRevoke = backgroundSource; // Store for later cleanup
            success = true;
        } else {
            throw new Error('Failed to create object URL for the selected video.');
        }
      } else {
        (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
          message: `Unsupported file type selected for background: ${file.type} (${file.name})`,
          origin: 'BackgroundImporterUI._handleFileSelection'
        });
        dependencies.notificationServiceAPI.showError(`نوع الملف غير مدعوم: ${file.type}`); // Needs localization
        success = false;
      }

      if (success && backgroundType && backgroundSource) {
        dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
          background: {
            type: backgroundType,
            source: backgroundSource,
            fileName: file.name // Store file name for informational purposes
          }
        });
        // Optionally, publish an event
        // dependencies.eventAggregator.publish(EVENTS.BACKGROUND_UPDATED, { type: backgroundType, source: backgroundSource, fileName: file.name });
        dependencies.notificationServiceAPI.showSuccess(`تم تعيين الخلفية: ${file.name}`);
      }
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error,
        message: `Error processing background file "${file.name}".`,
        origin: 'BackgroundImporterUI._handleFileSelection'
      });
      dependencies.notificationServiceAPI.showError(`فشل في معالجة ملف الخلفية.`);
      if (backgroundType === 'video' && backgroundSource) {
          // If object URL was created but something else failed, revoke it
          fileIOUtils.revokeObjectURL(backgroundSource);
          currentObjectUrlToRevoke = null;
      }
    } finally {
      dependencies.stateStore.dispatch(ACTIONS.SET_LOADING, false);
      // Reset the file input to allow selecting the same file again if needed
      if (event.target) {
        event.target.value = null;
      }
    }
  }
  
  /**
   * Sets up event listeners for the file input element.
   * @private
   */
  function _setupEventListeners() {
    fileInputElement = DOMElements.importBackgroundInput; // ID: import-background-input in your HTML

    if (fileInputElement) {
      fileInputElement.addEventListener('change', _handleFileSelection);
    } else {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'Background import file input element not found in DOMElements. UI will not function.',
        origin: 'BackgroundImporterUI._setupEventListeners'
      });
    }
  }
  
  /**
   * Cleans up any resources, like revoking object URLs.
   * This should be called if the component is "destroyed" or the app closes,
   * though for SPAs, onbeforeunload might be a place.
   * Or when loading a new project that doesn't use the current video blob.
   */
  function cleanup() {
      if (currentObjectUrlToRevoke) {
          fileIOUtils.revokeObjectURL(currentObjectUrlToRevoke);
          currentObjectUrlToRevoke = null;
          // console.debug('[BackgroundImporterUI] Revoked object URL on cleanup.');
      }
  }


  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.notificationServiceAPI) dependencies.notificationServiceAPI = injectedDeps.notificationServiceAPI;
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
  }


  // Public API
  return {
    _setDependencies, // For initialization
    cleanup, // To revoke object URLs if necessary
  };

})(); // IIFE removed


/**
 * Initialization function for the BackgroundImporterUI.
 * @param {object} dependencies
 * @param {import('../../core/state-store.js').default} dependencies.stateStore
 * @param {import('../../core/error-logger.js').default} dependencies.errorLogger
 * @param {import('../../shared-ui-components/notification.presenter.js').ReturnType<initializeNotificationPresenter>} [dependencies.notificationServiceAPI]
 * @param {import('../../core/event-aggregator.js').default} [dependencies.eventAggregator]
 */
export function initializeBackgroundImporterUI(dependencies) {
  backgroundImporterUI._setDependencies(dependencies);
  const { errorLogger, stateStore } = dependencies;


  const fileInputEl = DOMElements.importBackgroundInput;
  backgroundImporterUI.fileInputRef = fileInputEl; // Store for access if needed by methods on object

  if (!fileInputEl) {
    (errorLogger.logWarning || console.warn).call(errorLogger, {
      message: 'Background import file input (ID: import-background-input) not found. Background import UI disabled.',
      origin: 'initializeBackgroundImporterUI'
    });
    return { cleanup: backgroundImporterUI.cleanup }; // Still return cleanup
  }
  
  const currentBackgroundObject = { // To store internal state for this instance of the init
      currentObjectUrlToRevoke: null
  };

  const handleFileSelectionEvent = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    stateStore.dispatch(ACTIONS.SET_LOADING, true);

    if (currentBackgroundObject.currentObjectUrlToRevoke) {
        fileIOUtils.revokeObjectURL(currentBackgroundObject.currentObjectUrlToRevoke);
        currentBackgroundObject.currentObjectUrlToRevoke = null;
    }

    let backgroundType = null;
    let backgroundSource = null;

    try {
        if (file.type.startsWith('image/')) {
            backgroundType = 'image';
            backgroundSource = await fileIOUtils.readFileAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
            backgroundType = 'video';
            backgroundSource = fileIOUtils.createObjectURL(file);
            if (!backgroundSource) throw new Error('Failed to create object URL for video.');
            currentBackgroundObject.currentObjectUrlToRevoke = backgroundSource;
        } else {
            dependencies.notificationServiceAPI?.showError(`نوع الملف غير مدعوم: ${file.type}`);
            throw new Error(`Unsupported file type: ${file.type}`);
        }

        stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
            background: { type: backgroundType, source: backgroundSource, fileName: file.name }
        });
        dependencies.notificationServiceAPI?.showSuccess(`تم تعيين الخلفية: ${file.name}`);

    } catch (error) {
        (errorLogger.handleError || console.error).call(errorLogger, {
            error, message: `Error processing background file: ${file.name}`, origin: 'BackgroundImporterUI.handleFileSelection'
        });
        dependencies.notificationServiceAPI?.showError('فشل معالجة ملف الخلفية.');
        if (currentBackgroundObject.currentObjectUrlToRevoke) { // If URL was created before subsequent error
            fileIOUtils.revokeObjectURL(currentBackgroundObject.currentObjectUrlToRevoke);
            currentBackgroundObject.currentObjectUrlToRevoke = null;
        }
    } finally {
        stateStore.dispatch(ACTIONS.SET_LOADING, false);
        if (event.target) event.target.value = null;
    }
  };

  fileInputEl.addEventListener('change', handleFileSelectionEvent);
  
  // console.info('[BackgroundImporterUI] Initialized.');

  const cleanupFunction = () => {
    if (fileInputEl) {
      fileInputEl.removeEventListener('change', handleFileSelectionEvent);
    }
    if (currentBackgroundObject.currentObjectUrlToRevoke) {
      fileIOUtils.revokeObjectURL(currentBackgroundObject.currentObjectUrlToRevoke);
      currentBackgroundObject.currentObjectUrlToRevoke = null;
    }
    // console.info('[BackgroundImporterUI] Cleaned up.');
  };
  
  // Update cleanup on the main object for consistency too, or rely on this one
  backgroundImporterUI.cleanup = cleanupFunction; 

  return {
    cleanup: cleanupFunction,
    // No other public API needed from this specific UI controller typically.
  };
}

export default backgroundImporterUI;
