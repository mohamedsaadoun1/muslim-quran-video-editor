// js/features/background-controller/background-color.chooser.js

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, DEFAULT_PROJECT_SCHEMA, EVENTS } from '../../config/app.constants.js'; // Assuming EVENTS might be used

const backgroundColorChooser = (() => {
  let colorPickerElement = null;
  let dependencies = {
    stateStore: {
      getState: () => ({ currentProject: null }),
      dispatch: () => {},
      subscribe: () => (() => {})
    },
    errorLogger: console,
    // eventAggregator: { publish: () => {} } // If direct state update isn't enough
  };

  /**
   * Updates the color picker's value based on the current project state.
   * @private
   * @param {string} colorValue - The color hex string (e.g., "#RRGGBB").
   */
  function _updateColorPickerUI(colorValue) {
    if (colorPickerElement && colorPickerElement.value !== colorValue) {
      colorPickerElement.value = colorValue;
    }
  }

  /**
   * Handles the 'input' or 'change' event from the color picker input.
   * Dispatches an action to update the background state.
   * @private
   */
  function _handleColorChange() {
    if (colorPickerElement) {
      const newColor = colorPickerElement.value;
      // console.debug(`[BackgroundColorChooser] Color picked: ${newColor}`);

      dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
        background: {
          type: 'color', // Explicitly set type to 'color' when user picks a color
          source: newColor
        }
      });
      // Optionally, publish an event if other components need to react immediately
      // without direct stateStore subscription.
      // dependencies.eventAggregator.publish(EVENTS.BACKGROUND_UPDATED, { type: 'color', source: newColor });
    }
  }

  /**
   * Sets up event listeners for the color picker.
   * @private
   */
  function _setupEventListeners() {
    colorPickerElement = DOMElements.backgroundColorPicker;

    if (colorPickerElement) {
      // 'input' event fires immediately as the color is changed (while dragging in picker).
      // 'change' event fires when the picker is closed or focus is lost.
      // 'input' provides more responsive feedback if UI updates instantly.
      colorPickerElement.addEventListener('input', _handleColorChange);
      // Fallback or alternative:
      // colorPickerElement.addEventListener('change', _handleColorChange);
    } else {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'Background color picker element not found in DOMElements. Color chooser UI will not function.',
        origin: 'BackgroundColorChooser._setupEventListeners'
      });
    }
  }

  /**
   * Subscribes to state changes to keep the color picker UI in sync
   * with the project's background color state.
   * @private
   */
  function _subscribeToStateChanges() {
    return dependencies.stateStore.subscribe((newState) => {
      const project = newState.currentProject;
      let currentColor = DEFAULT_PROJECT_SCHEMA.background.source; // Default color
      let isColorType = false;

      if (project && project.background) {
        if (project.background.type === 'color' && project.background.source) {
          currentColor = project.background.source;
          isColorType = true;
        }
      }
      
      _updateColorPickerUI(currentColor);

      // Enable/disable color picker based on whether background type is 'color'
      // or if no project is loaded (then it should reflect default)
      if (colorPickerElement) {
         colorPickerElement.disabled = !(isColorType || !project);
         // Style it to look more obviously disabled/enabled
         colorPickerElement.style.opacity = (isColorType || !project) ? '1' : '0.5';
         colorPickerElement.style.cursor = (isColorType || !project) ? 'pointer' : 'not-allowed';
      }
    });
  }

  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    // if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
  }


  // Public API (primarily for initialization and internal state if needed by tests)
  return {
    _setDependencies,
    // No public methods are typically needed for this UI controller as it's self-contained.
  };

})(); // IIFE removed for consistency with the module + initFn pattern.

/**
 * Initialization function for the BackgroundColorChooser.
 * @param {object} dependencies
 * @param {import('../../core/state-store.js').default} dependencies.stateStore
 * @param {import('../../core/error-logger.js').default} dependencies.errorLogger
 * // @param {import('../../core/event-aggregator.js').default} [dependencies.eventAggregator]
 */
export function initializeBackgroundColorChooser(dependencies) {
  backgroundColorChooser._setDependencies(dependencies); // Set internal dependencies
  const { stateStore, errorLogger } = dependencies;


  // Logic from _setupEventListeners and _subscribeToStateChanges moved here
  // as `backgroundColorChooser` is now a simple object without its own methods
  // to directly call for setup inside the initFn for this pattern.
  
  const colorPickerEl = DOMElements.backgroundColorPicker;
  backgroundColorChooser.colorPickerRef = colorPickerEl; // Store for direct access

  if (!colorPickerEl) {
    (errorLogger.logWarning || console.warn).call(errorLogger, {
        message: 'Background color picker DOM element (ID: background-color-picker) not found. Color chooser UI disabled.',
        origin: 'initializeBackgroundColorChooser'
    });
    return { cleanup: () => {} }; // Return a no-op API
  }

  const handleColorInputChange = () => {
    if (colorPickerEl) {
        const newColor = colorPickerEl.value;
        stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
            background: { type: 'color', source: newColor }
        });
    }
  };
  
  colorPickerEl.addEventListener('input', handleColorInputChange);
  // Consider also 'change' if 'input' is too frequent for some pickers or performance needs.

  const updateColorPickerFromState = (bgColor, bgType, isProjectLoaded) => {
      if (colorPickerEl) {
          const effectiveColor = (bgType === 'color' && bgColor) ? bgColor : DEFAULT_PROJECT_SCHEMA.background.source;
          if (colorPickerEl.value !== effectiveColor) {
              colorPickerEl.value = effectiveColor;
          }
          const isActiveChooser = (bgType === 'color' || !isProjectLoaded);
          colorPickerEl.disabled = !isActiveChooser;
          colorPickerEl.style.opacity = isActiveChooser ? '1' : '0.5';
          colorPickerEl.style.cursor = isActiveChooser ? 'pointer' : 'not-allowed';
      }
  };

  const unsubscribeState = stateStore.subscribe((newState) => {
    const project = newState.currentProject;
    const bgColor = project?.background?.source;
    const bgType = project?.background?.type;
    updateColorPickerFromState(bgColor, bgType, !!project);
  });

  // Set initial UI state from current project or defaults
  const initialProject = stateStore.getState().currentProject;
  updateColorPickerFromState(
    initialProject?.background?.source,
    initialProject?.background?.type,
    !!initialProject
  );

  // console.info('[BackgroundColorChooser] Initialized.');

  return {
    cleanup: () => {
      unsubscribeState();
      if (colorPickerEl) {
        colorPickerEl.removeEventListener('input', handleColorInputChange);
      }
      // console.info('[BackgroundColorChooser] Cleaned up stateStore subscription and event listener.');
    }
    // No public API needed typically for a simple UI controller like this after setup.
  };
}

export default backgroundColorChooser; // Export the base object for consistency if ever needed
