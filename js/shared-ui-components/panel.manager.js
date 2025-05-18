// js/shared-ui-components/panel.manager.js

import DOMElements from '../core/dom-elements.js';
import { EVENTS, ACTIONS } from '../config/app.constants.js'; // Assuming panel state might go to stateStore

const panelManager = (() => {
  let currentVisiblePanelId = null;
  let dependencies = {
    eventAggregator: { publish: () => {} }, // Fallback
    errorLogger: console,                   // Fallback
    stateStore: { dispatch: () => {}, getState: () => ({ activePanelId: null }) } // Fallback
  };

  /**
   * Hides all control panels.
   * @private
   */
  function _hideAllPanels() {
    // Query for all elements with the 'control-panel' class within the container
    // This is more robust if panels are added/removed dynamically,
    // rather than relying on a fixed list in DOMElements for *all* panels.
    // However, we can iterate through known panels from DOMElements if preferred.
    const panels = DOMElements.activeControlPanelsContainer?.querySelectorAll('.control-panel');
    if (panels) {
      panels.forEach(panel => {
        panel.classList.remove('visible');
      });
    }
    currentVisiblePanelId = null;
    // Optionally dispatch state change if active panel is tracked in global state
    // dependencies.stateStore.dispatch(ACTIONS.SET_ACTIVE_PANEL_ID, null);
  }

  /**
   * Shows a specific panel by its ID and hides others.
   * @param {string} panelId - The ID of the panel to show.
   */
  function showPanel(panelId) {
    if (!panelId || typeof panelId !== 'string') {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: `Invalid panelId provided to showPanel: ${panelId}`,
        origin: 'PanelManager.showPanel'
      });
      return;
    }

    if (currentVisiblePanelId === panelId) {
      // If the same panel is requested again, toggle it off (hide it)
      // console.debug(`[PanelManager] Toggling off panel: ${panelId}`);
      _hideAllPanels();
      _updateTabButtonsState(null); // Deselect all tabs
      dependencies.eventAggregator.publish(EVENTS.PANEL_VISIBILITY_CHANGED, { panelId, visible: false });
      // Optionally update global state
      dependencies.stateStore.dispatch('SET_ACTIVE_PANEL_ID', null); // Use ACTIONS constant if available
      return;
    }

    _hideAllPanels(); // Hide any currently visible panel first

    const panelToShow = document.getElementById(panelId);
    if (panelToShow && panelToShow.classList.contains('control-panel')) {
      panelToShow.classList.add('visible');
      currentVisiblePanelId = panelId;
      _updateTabButtonsState(panelId);
      dependencies.eventAggregator.publish(EVENTS.PANEL_VISIBILITY_CHANGED, { panelId, visible: true });
      // Optionally update global state
      dependencies.stateStore.dispatch('SET_ACTIVE_PANEL_ID', panelId); // Use ACTIONS constant if available
      // console.debug(`[PanelManager] Panel shown: ${panelId}`);
    } else {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: `Panel with ID "${panelId}" not found or is not a control panel.`,
        origin: 'PanelManager.showPanel'
      });
    }
  }

  /**
   * Hides the currently visible panel, if any.
   * Effectively an alias for `showPanel(null)` if currentVisiblePanelId was a real panel.
   */
  function hideCurrentPanel() {
    if (currentVisiblePanelId) {
        // console.debug(`[PanelManager] Hiding current panel: ${currentVisiblePanelId}`);
        _hideAllPanels(); // This also sets currentVisiblePanelId to null
        _updateTabButtonsState(null);
        dependencies.eventAggregator.publish(EVENTS.PANEL_VISIBILITY_CHANGED, { panelId: currentVisiblePanelId, visible: false });
        dependencies.stateStore.dispatch('SET_ACTIVE_PANEL_ID', null);
    }
  }


  /**
   * Updates the active state of tab buttons in the main bottom tab bar.
   * @private
   * @param {string | null} activePanelId - The ID of the panel that is now active, or null if none.
   */
  function _updateTabButtonsState(activePanelId) {
    if (!DOMElements.mainBottomTabBar) return;

    const tabButtons = DOMElements.mainBottomTabBar.querySelectorAll('.main-tab-button');
    tabButtons.forEach(button => {
      if (button.dataset.panelId === activePanelId) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  /**
   * Handles clicks on the tab buttons.
   * @private
   * @param {Event} event - The click event.
   */
  function _handleTabButtonClick(event) {
    const button = event.target.closest('.main-tab-button');
    if (button && button.dataset.panelId) {
      showPanel(button.dataset.panelId);
    }
  }

  /**
   * Handles clicks on panel close buttons.
   * @private
   * @param {Event} event - The click event.
   */
  function _handlePanelCloseButtonClick(event) {
    const button = event.target.closest('.close-panel-btn'); // Assuming '.close-panel-btn' is on the button itself
    if (button && button.dataset.panelId) {
      if (currentVisiblePanelId === button.dataset.panelId) {
        hideCurrentPanel();
      } else {
        // This case should ideally not happen if only one panel is visible
        (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
            message: `Close button clicked for a non-active panel: ${button.dataset.panelId}`,
            origin: 'PanelManager._handlePanelCloseButtonClick',
            context: { currentVisiblePanelId }
        });
      }
    }
  }

  /**
   * Sets dependencies for the panel manager.
   * @param {object} injectedDeps
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
  }


  return {
    _setDependencies, // For initialization
    initializeEventListeners, // Expose to be called after DOM is ready
    showPanel,
    hideCurrentPanel,
    getCurrentVisiblePanelId: () => currentVisiblePanelId,
  };

})(); // IIFE removed for module pattern where init is separate


/**
 * Attaches event listeners for tab buttons and panel close buttons.
 * This should be called once the DOM elements are available.
 * Called by initializePanelManager.
 * @private // Conceptually private to the module's setup phase
 */
function initializeEventListeners() {
  const { errorLogger } = panelManager._getDependenciesInternal(); // Helper to get internal deps

  if (DOMElements.mainBottomTabBar) {
    DOMElements.mainBottomTabBar.addEventListener('click', (event) => {
      // panelManager._handleTabButtonClick(event); // Call using panelManager context if needed
      // Correctly call internal handler:
      const button = event.target.closest('.main-tab-button');
      if (button && button.dataset.panelId) {
        panelManager.showPanel(button.dataset.panelId);
      }
    });
  } else {
    (errorLogger.logWarning || console.warn).call(errorLogger, {
      message: 'Main bottom tab bar not found. Panel tab functionality will not work.',
      origin: 'PanelManager.initializeEventListeners'
    });
  }

  // Event listener for panel close buttons (using event delegation on a common parent if possible)
  // If activeControlPanelsContainer exists and is a good parent for delegation:
  if (DOMElements.activeControlPanelsContainer) {
    DOMElements.activeControlPanelsContainer.addEventListener('click', (event) => {
      // panelManager._handlePanelCloseButtonClick(event); // Call using panelManager context
      // Correctly call internal handler:
      const button = event.target.closest('.close-panel-btn');
      if (button && button.dataset.panelId) {
        if (panelManager.getCurrentVisiblePanelId() === button.dataset.panelId) {
           panelManager.hideCurrentPanel();
        }
      }
    });
  } else {
    (errorLogger.logWarning || console.warn).call(errorLogger, {
      message: 'Active control panels container not found. Panel close buttons might not work via delegation.',
      origin: 'PanelManager.initializeEventListeners'
    });
    // As a fallback, could attach listeners to each panel's close button individually if known
    // This requires panels to be defined in DOMElements with their close buttons.
  }
}
// Add a way for panelManager to access its own dependencies without making them global or re-passing constantly.
// This is a bit of a workaround for not having a class instance `this`.
panelManager._getDependenciesInternal = function() {
    return (function() { return this.dependenciesRef; }).call({dependenciesRef: (function() { return this.dependencies; }).call(panelManager) });
}.bind({ dependencies: (function() { return this.dependenciesRef; }).call({ dependenciesRef: panelManager._privateDependencies || { errorLogger: console, eventAggregator: { publish: () => {} }, stateStore: { dispatch: () => {}, getState: () => ({ activePanelId: null }) }} }) });
// Store the reference directly on the object for use by initializeEventListeners if needed outside the main init.
// This setup with _privateDependencies is to make dependencies available internally for initializeEventListeners
// while still allowing _setDependencies to update them.
panelManager._privateDependencies = { errorLogger: console, eventAggregator: { publish: () => {} }, stateStore: { dispatch: () => {}, getState: () => ({ activePanelId: null }) } };
panelManager._setDependencies = function(injectedDeps) {
    if (injectedDeps.eventAggregator) panelManager._privateDependencies.eventAggregator = injectedDeps.eventAggregator;
    if (injectedDeps.errorLogger) panelManager._privateDependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.stateStore) panelManager._privateDependencies.stateStore = injectedDeps.stateStore;
};
panelManager._getDependenciesInternal = function() { // Simpler getter
    return panelManager._privateDependencies;
};




/**
 * Initialization function for the PanelManager, to be called by moduleBootstrap.
 * @param {object} dependencies
 * @param {import('../core/event-aggregator.js').default} dependencies.eventAggregator
 * @param {import('../core/error-logger.js').default} dependencies.errorLogger
 * @param {import('../core/state-store.js').default} [dependencies.stateStore] - Optional if not tracking panel state globally.
 */
export function initializePanelManager(dependencies) {
  panelManager._setDependencies(dependencies); // Set the dependencies first
  initializeEventListeners(); // Then initialize event listeners that might use them

  // Optionally, set initial panel based on global state (e.g., if app was reloaded)
  // const initialPanelId = dependencies.stateStore?.getState().activePanelId;
  // if (initialPanelId) {
  //   panelManager.showPanel(initialPanelId);
  // } else {
  //    // If a default panel should be shown on editor load (e.g., Quran panel)
  //    // panelManager.showPanel('quran-selection-panel');
  // }
  
  // console.info('[PanelManager] Initialized.');
  // Return the public API of the panelManager
  return {
    showPanel: panelManager.showPanel,
    hideCurrentPanel: panelManager.hideCurrentPanel,
    getCurrentVisiblePanelId: panelManager.getCurrentVisiblePanelId,
  };
}

export default panelManager; // Export the main object if direct import is also desired
