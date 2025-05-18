// js/features/editor-shell/screen.navigator.js

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, EVENTS } from '../../config/app.constants.js';

const screenNavigator = (() => {
  let initialScreenElement = null;
  let editorScreenElement = null;
  let currentActiveScreenId = null; // Track locally which screen is currently shown via this module

  let dependencies = {
    stateStore: {
        getState: () => ({ activeScreen: 'initial' }),
        dispatch: () => {},
        subscribe: () => (() => {})
    },
    eventAggregator: { subscribe: () => ({ unsubscribe: () => {} }), publish: () => {} },
    errorLogger: console,
  };

  /**
   * Shows the specified screen and hides all others.
   * @private
   * @param {string} screenId - The ID of the screen to show ('initial' or 'editor').
   */
  function _navigateToScreen(screenId) {
    if (!initialScreenElement || !editorScreenElement) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        message: 'Screen elements (initial or editor) not found in DOMElements. Navigation failed.',
        origin: 'ScreenNavigator._navigateToScreen',
        severity: 'error',
        context: { screenId, initialExists: !!initialScreenElement, editorExists: !!editorScreenElement }
      });
      return;
    }
    
    if (currentActiveScreenId === screenId) return; // Already on the target screen

    // Hide all screens first
    initialScreenElement.classList.remove('active-screen');
    initialScreenElement.style.display = 'none'; // Ensure it's hidden
    editorScreenElement.classList.remove('active-screen');
    editorScreenElement.style.display = 'none';

    let targetScreenElement = null;
    if (screenId === 'initial') {
      targetScreenElement = initialScreenElement;
    } else if (screenId === 'editor') {
      targetScreenElement = editorScreenElement;
    }

    if (targetScreenElement) {
      targetScreenElement.style.display = 'flex'; // Or 'block' depending on your screen's CSS
      targetScreenElement.classList.add('active-screen');
      currentActiveScreenId = screenId;
      // console.debug(`[ScreenNavigator] Navigated to screen: ${screenId}`);

      // Ensure the stateStore reflects this change if it wasn't the source of the navigation
      // (e.g., if navigation was triggered by an event not a state change)
      if (dependencies.stateStore.getState().activeScreen !== screenId) {
        dependencies.stateStore.dispatch(ACTIONS.SET_ACTIVE_SCREEN, screenId, { skipHistory: true }); // skipHistory for UI state
      }
      
      // Optional: dispatch an event that a screen has been shown
      dependencies.eventAggregator.publish(EVENTS.SCREEN_NAVIGATED, { screenId }); // Define EVENTS.SCREEN_NAVIGATED
    } else {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: `Target screen ID "${screenId}" is not recognized for navigation.`,
        origin: 'ScreenNavigator._navigateToScreen'
      });
    }
  }
  
  /**
   * Handles navigation requests coming from events.
   * @private
   * @param {object} navigationData - Data from the event.
   * @param {string} navigationData.screenId - The ID of the screen to navigate to.
   * @param {object} [navigationData.projectToLoad] - Optional project data if navigating to editor for a specific project.
   */
  function _handleNavigationEvent(navigationData) {
    if (navigationData && navigationData.screenId) {
        if (navigationData.screenId === 'editor' && navigationData.projectToLoad) {
            // Dispatch action to load project FIRST, then navigation will occur via state change
            dependencies.stateStore.dispatch(ACTIONS.LOAD_PROJECT, navigationData.projectToLoad);
            // The SET_ACTIVE_SCREEN action in stateStore for LOAD_PROJECT should handle the screen switch
        } else if (navigationData.screenId === 'editor' && navigationData.newProject) {
            // If a flag indicates a new project specifically
            dependencies.stateStore.dispatch(ACTIONS.CREATE_NEW_PROJECT_AND_NAVIGATE); // This action needs to handle project creation and screen switch
                                                                                    // or dispatch LOAD_PROJECT with a new default project
                                                                                    // which then sets activeScreen='editor'
        }
        else {
            _navigateToScreen(navigationData.screenId);
        }
    }
  }

  function _setDependencies(injectedDeps) {
    Object.assign(dependencies, injectedDeps);
  }

  // Public API
  return {
    _setDependencies,
    // navigateTo: _navigateToScreen, // Expose if direct navigation calls are needed
  };

})(); // IIFE Removed

/**
 * Initialization function for the ScreenNavigator.
 * @param {object} deps
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../core/event-aggregator.js').default} deps.eventAggregator
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 */
export function initializeScreenNavigator(deps) {
  screenNavigator._setDependencies(deps);
  const { stateStore, eventAggregator, errorLogger } = deps;

  screenNavigator.initialScreenElRef = DOMElements.initialScreen;
  screenNavigator.editorScreenElRef = DOMElements.editorScreen;
  
  // Define the _navigateToScreenLocal function using `deps` from the closure
  const _navigateToScreenLocal = (screenId) => {
    if (!screenNavigator.initialScreenElRef || !screenNavigator.editorScreenElRef) {
        (errorLogger.handleError || console.error)({ message: 'Screen elements not found.', origin: 'ScreenNavigator.navigateToLocal'});
        return;
    }
    if (screenNavigator.currentActiveScreenId === screenId && document.getElementById(screenId)?.classList.contains('active-screen')) return;

    screenNavigator.initialScreenElRef.classList.remove('active-screen');
    screenNavigator.initialScreenElRef.style.display = 'none';
    screenNavigator.editorScreenElRef.classList.remove('active-screen');
    screenNavigator.editorScreenElRef.style.display = 'none';
    
    let targetEl = null;
    if(screenId === 'initial') targetEl = screenNavigator.initialScreenElRef;
    else if(screenId === 'editor') targetEl = screenNavigator.editorScreenElRef;

    if (targetEl) {
        targetEl.style.display = 'flex';
        targetEl.classList.add('active-screen');
        screenNavigator.currentActiveScreenId = screenId;
        if (stateStore.getState().activeScreen !== screenId) {
            stateStore.dispatch(ACTIONS.SET_ACTIVE_SCREEN, screenId, { skipHistory: true });
        }
        eventAggregator.publish(EVENTS.SCREEN_NAVIGATED, { screenId });
    }
  };
  // Store for potential external use if necessary (e.g., by the returned API)
  screenNavigator._internalNavigate = _navigateToScreenLocal;


  // Subscribe to state changes for `activeScreen`
  const unsubscribeState = stateStore.subscribe((newState) => {
    if (newState.activeScreen && newState.activeScreen !== screenNavigator.currentActiveScreenId) {
      _navigateToScreenLocal(newState.activeScreen);
    }
  });

  // Subscribe to navigation events
  const unsubscribeNavEvent = eventAggregator.subscribe(EVENTS.NAVIGATE_TO_SCREEN, (data) => {
      if (data && data.screenId) _navigateToScreenLocal(data.screenId);
  });
  
  const unsubscribeNewProjectNavEvent = eventAggregator.subscribe(EVENTS.NAVIGATE_TO_EDITOR_NEW_PROJECT, () => {
      // This event implies creating a new project and then navigating.
      // The project creation and state update should be handled by project.actions.js,
      // which then dispatches LOAD_PROJECT, and that in turn should set activeScreen to 'editor'.
      // So, this handler might just need to trigger the project creation action.
      // Or, if LOAD_PROJECT itself triggers screen change, no direct navigation needed here.
      // For now, let's assume a specific action for this flow:
      stateStore.dispatch(ACTIONS.CREATE_NEW_PROJECT_AND_NAVIGATE); // Define this in stateStore to create project and set screen
                                                              // Or let globalShortcuts publish an event that projectActions handles,
                                                              // and projectActions eventually dispatches LOAD_PROJECT with a new project,
                                                              // which in turn (via its state update logic in stateStore) sets activeScreen='editor'.
                                                              // This keeps screenNavigator simpler.
  });


  // Apply initial screen based on current state
  const initialScreen = stateStore.getState().activeScreen || 'initial';
  _navigateToScreenLocal(initialScreen);

  // console.info('[ScreenNavigator] Initialized.');

  return {
    cleanup: () => {
      unsubscribeState();
      unsubscribeNavEvent.unsubscribe();
      unsubscribeNewProjectNavEvent.unsubscribe();
      // console.info('[ScreenNavigator] Cleaned up.');
    },
    // Expose a direct navigation method if other modules need to call it programmatically
    // (though event-driven or state-driven is preferred for decoupling).
    // navigateTo: (screenId) => _navigateToScreenLocal(screenId)
  };
}

export default screenNavigator;
