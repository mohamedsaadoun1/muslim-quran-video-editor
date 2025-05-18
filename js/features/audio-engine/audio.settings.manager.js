// js/features/audio-engine/audio.settings.manager.js

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js'; // For dispatching actions & default values

const audioSettingsManager = (() => {
  let dependencies = {
    stateStore: {
      getState: () => ({ currentProject: null }),
      dispatch: () => {},
      subscribe: () => (() => {})
    }, // Fallback
    errorLogger: console, // Fallback
    // localizationService: { translate: key => key } // If needed for labels or tooltips
  };

  // Store a local copy of the UI element if accessed frequently
  let delayInput = null;

  /**
   * Updates the delay between Ayahs input field based on the current project state.
   * @private
   * @param {number} delayInSeconds
   */
  function _updateDelayInput(delayInSeconds) {
    if (delayInput) {
      // Ensure value is within min/max bounds of the input if they exist
      const min = parseFloat(delayInput.min) || 0;
      const max = parseFloat(delayInput.max) || Infinity;
      const validatedDelay = Math.max(min, Math.min(max, delayInSeconds));
      
      if (delayInput.value !== String(validatedDelay)) {
        delayInput.value = validatedDelay;
      }
    }
  }

  /**
   * Handles changes from the 'delay between ayahs' input field.
   * Dispatches an action to update the state store.
   * @private
   */
  function _handleDelayInputChange() {
    if (delayInput) {
      const newDelay = parseFloat(delayInput.value);
      if (!isNaN(newDelay) && newDelay >= 0) {
        // Dispatch an action to update this specific part of the project state.
        // It's better to have a more granular action than UPDATE_PROJECT_SETTINGS for specific, common changes.
        // For now, we can use UPDATE_PROJECT_SETTINGS with a nested quranSelection payload.
        // Or a dedicated action like ACTIONS.SET_AYAH_DELAY could be handled by stateStore directly.
        dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
          quranSelection: {
            delayBetweenAyahs: newDelay
          }
        });
      } else {
        (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
          message: `Invalid delay value entered: ${delayInput.value}`,
          origin: 'AudioSettingsManager._handleDelayInputChange'
        });
        // Optionally revert to previous state value
        const currentProject = dependencies.stateStore.getState().currentProject;
        if (currentProject && currentProject.quranSelection) {
            _updateDelayInput(currentProject.quranSelection.delayBetweenAyahs);
        }
      }
    }
  }

  /**
   * Sets up event listeners for the audio settings UI elements.
   * @private
   */
  function _setupEventListeners() {
    delayInput = DOMElements.delayBetweenAyahsInput; // Cache the element

    if (delayInput) {
      delayInput.addEventListener('change', _handleDelayInputChange);
      // Using 'input' event for more responsive updates if desired, but 'change' is fine for number inputs
      // delayInput.addEventListener('input', _handleDelayInputChange);
    } else {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'Delay between ayahs input element not found in DOMElements. UI will not function.',
        origin: 'AudioSettingsManager._setupEventListeners'
      });
    }
    // Add listeners for other audio settings controls here (e.g., volume sliders)
  }

  /**
   * Subscribes to state changes to keep the UI in sync with the project's audio settings.
   * @private
   */
  function _subscribeToStateChanges() {
    return dependencies.stateStore.subscribe((newState) => {
      const project = newState.currentProject;
      if (project && project.quranSelection) {
        _updateDelayInput(project.quranSelection.delayBetweenAyahs);
      } else if (!project && delayInput) {
        // No project loaded, reset UI to defaults or disable
         _updateDelayInput(DEFAULT_PROJECT_SCHEMA.quranSelection.delayBetweenAyahs);
         delayInput.disabled = true;
      } else if (project && delayInput) {
         delayInput.disabled = false;
      }
    });
  }
  
  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    // if (injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService;
  }


  // Public API (not much needed publicly if UI interaction is primary role)
  return {
    _setDependencies,
    // Methods to directly get/set specific settings if needed by other modules (less common for UI managers)
    // getCurrentAyahDelay: () => dependencies.stateStore?.getState().currentProject?.quranSelection?.delayBetweenAyahs,
  };

})(); // IIFE removed

/**
 * Initialization function for the AudioSettingsManager.
 * @param {object} dependencies
 * @param {import('../../core/state-store.js').default} dependencies.stateStore
 * @param {import('../../core/error-logger.js').default} dependencies.errorLogger
 * // @param {import('../../core/localization.service.js').default} [dependencies.localizationService]
 */
export function initializeAudioSettingsManager(dependencies) {
  audioSettingsManager._setDependencies(dependencies); // Pass dependencies

  if (!DOMElements.audioSettingsPanel || !DOMElements.delayBetweenAyahsInput) {
     (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'Audio settings panel or delay input not found in DOMElements. Audio settings UI might not be fully initialized.',
        origin: 'initializeAudioSettingsManager'
    });
    // Depending on criticality, you might return a no-op object or throw
  }
  
  // Internal method calls to set up the module, now part of the main object:
  // Since the IIFE is removed, these methods are not truly private anymore if accessed via `audioSettingsManager.`
  // This setup assumes the calling pattern uses initializeAudioSettingsManager and doesn't directly call underscore methods.
  
  // To truly encapsulate, these would be defined *inside* initializeAudioSettingsManager
  // or `audioSettingsManager` would be a class.
  
  // For current pattern:
  const _setupEventListenersDirect = () => {
    audioSettingsManager.delayInputRef = DOMElements.delayBetweenAyahsInput;
    if (audioSettingsManager.delayInputRef) {
      audioSettingsManager.delayInputRef.addEventListener('change', () => {
        if (audioSettingsManager.delayInputRef) {
          const newDelay = parseFloat(audioSettingsManager.delayInputRef.value);
          if (!isNaN(newDelay) && newDelay >= 0) {
            dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
              quranSelection: { delayBetweenAyahs: newDelay }
            });
          } else {
            const currentProject = dependencies.stateStore.getState().currentProject;
            if (currentProject && currentProject.quranSelection) {
                audioSettingsManager.delayInputRef.value = currentProject.quranSelection.delayBetweenAyahs;
            }
          }
        }
      });
    }
  };
  _setupEventListenersDirect();


  const _updateDelayInputDirect = (delayInSeconds) => {
    if (audioSettingsManager.delayInputRef) {
      const min = parseFloat(audioSettingsManager.delayInputRef.min) || 0;
      const max = parseFloat(audioSettingsManager.delayInputRef.max) || Infinity;
      const validatedDelay = Math.max(min, Math.min(max, delayInSeconds));
      if (audioSettingsManager.delayInputRef.value !== String(validatedDelay)) {
        audioSettingsManager.delayInputRef.value = validatedDelay;
      }
    }
  };

  const unsubscribeState = dependencies.stateStore.subscribe((newState) => {
    const project = newState.currentProject;
    if (project && project.quranSelection) {
      _updateDelayInputDirect(project.quranSelection.delayBetweenAyahs);
      if (audioSettingsManager.delayInputRef) audioSettingsManager.delayInputRef.disabled = false;
    } else if (audioSettingsManager.delayInputRef) {
      _updateDelayInputDirect(DEFAULT_PROJECT_SCHEMA.quranSelection.delayBetweenAyahs);
      audioSettingsManager.delayInputRef.disabled = true;
    }
  });
  
  // Set initial UI state from current project or defaults
  const initialProject = dependencies.stateStore.getState().currentProject;
  if (initialProject && initialProject.quranSelection) {
      _updateDelayInputDirect(initialProject.quranSelection.delayBetweenAyahs);
      if (audioSettingsManager.delayInputRef) audioSettingsManager.delayInputRef.disabled = false;
  } else if (audioSettingsManager.delayInputRef) {
      _updateDelayInputDirect(DEFAULT_PROJECT_SCHEMA.quranSelection.delayBetweenAyahs);
      audioSettingsManager.delayInputRef.disabled = true;
  }

  // console.info('[AudioSettingsManager] Initialized.');

  // Return a cleanup function or specific API if needed
  return {
    cleanup: () => {
      unsubscribeState();
      if (audioSettingsManager.delayInputRef) {
        // It's good practice to remove event listeners if the element or module is destroyed,
        // but for long-lived elements, it's often omitted.
        // audioSettingsManager.delayInputRef.removeEventListener('change', ...);
      }
      // console.info('[AudioSettingsManager] Cleaned up.');
    }
    // Expose methods if other modules need to interact directly with settings:
    // getCurrentAyahDelay: () => dependencies.stateStore?.getState().currentProject?.quranSelection?.delayBetweenAyahs,
  };
}

// Exporting the raw object for potential direct use (though init is preferred for setup)
export default audioSettingsManager;
