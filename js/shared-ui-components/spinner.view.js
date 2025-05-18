
// js/shared-ui-components/spinner.view.js

import DOMElements from '../core/dom-elements.js';
import { ACTIONS, EVENTS } from '../config/app.constants.js'; // For stateStore actions or eventAggregator events

const spinnerView = (() => {
  let isSpinnerVisible = false; // Internal state to track visibility
  let dependencies = {
    stateStore: null, // Will be injected
    errorLogger: console, // Fallback
    // eventAggregator: null // If using event-driven show/hide
  };

  /**
   * Shows the global loading spinner.
   * Ensures DOMElements.globalLoadingSpinner is available.
   */
  function showSpinner() {
    if (DOMElements.globalLoadingSpinner) {
      DOMElements.globalLoadingSpinner.classList.add('visible');
      // Optional: Add class to body to prevent scrolling while spinner is active
      // document.body.classList.add('spinner-active-no-scroll');
      isSpinnerVisible = true;
      // console.debug('[SpinnerView] Spinner shown.');
    } else {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'Global loading spinner DOM element not found. Cannot show spinner.',
        origin: 'SpinnerView.showSpinner'
      });
    }
  }

  /**
   * Hides the global loading spinner.
   */
  function hideSpinner() {
    if (DOMElements.globalLoadingSpinner) {
      DOMElements.globalLoadingSpinner.classList.remove('visible');
      // document.body.classList.remove('spinner-active-no-scroll');
      isSpinnerVisible = false;
      // console.debug('[SpinnerView] Spinner hidden.');
    } else {
        // Warning already logged by showSpinner if element was missing
    }
  }

  /**
   * Toggles the spinner's visibility based on a boolean state.
   * @param {boolean} shouldBeVisible - True to show, false to hide.
   */
  function setSpinnerVisibility(shouldBeVisible) {
    if (shouldBeVisible) {
      showSpinner();
    } else {
      hideSpinner();
    }
  }
  
  /**
   * Sets the dependencies for the spinner view.
   * @param {object} injectedDeps - { stateStore, errorLogger, eventAggregator? }
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    // if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
  }

  // Public API for the module (IIFE removed, using direct object export for module pattern)
  // This direct object `spinnerView` can be enhanced by initializeSpinnerView
  const publicApi = {
    _setDependencies, // Internal, for initialization by moduleBootstrap
    show: showSpinner,
    hide: hideSpinner,
    toggle: setSpinnerVisibility,
    isVisible: () => isSpinnerVisible,
  };
  return publicApi;

})(); // IIFE removed for the module export pattern. SpinnerView is the object returned.


/**
 * Initialization function for the SpinnerView, to be called by moduleBootstrap.
 * This function sets up subscriptions to the state store to automatically
 * show/hide the spinner based on the `isLoading` state.
 * @param {object} dependencies
 * @param {import('../core/state-store.js').default} dependencies.stateStore
 * @param {import('../core/error-logger.js').default} dependencies.errorLogger
 * @param {import('../core/event-aggregator.js').default} [dependencies.eventAggregator] - Optional for event-driven control.
 */
export function initializeSpinnerView(dependencies) {
  spinnerView._setDependencies(dependencies); // Pass dependencies to the module

  const { stateStore, errorLogger /*, eventAggregator */ } = dependencies;

  if (!DOMElements.globalLoadingSpinner) {
    (errorLogger.logWarning || console.warn).call(errorLogger, {
      message: 'Global loading spinner DOM element (ID: global-loading-spinner) is missing. Spinner functionality will be impaired.',
      origin: 'initializeSpinnerView'
    });
    // Return a no-op API if critical element is missing
    return { show: ()=>{}, hide: ()=>{}, toggle: ()=>{}, isVisible: ()=>false };
  }

  if (stateStore) {
    // Subscribe to state changes to show/hide spinner based on state.isLoading
    const unsubscribeState = stateStore.subscribe((newState) => {
      if (typeof newState.isLoading === 'boolean') {
        spinnerView.toggle(newState.isLoading);
      }
    });
    // console.info('[SpinnerView] Subscribed to stateStore for isLoading changes.');

    // Apply initial state
    const initialState = stateStore.getState();
    if (typeof initialState.isLoading === 'boolean') {
        spinnerView.toggle(initialState.isLoading);
    }

    // Return the API and a cleanup function
    return {
      show: spinnerView.show,
      hide: spinnerView.hide,
      toggle: spinnerView.toggle,
      isVisible: spinnerView.isVisible,
      cleanup: () => {
        unsubscribeState();
        // console.info('[SpinnerView] Cleaned up stateStore subscription.');
      }
    };
  } else {
    (errorLogger.logWarning || console.warn).call(errorLogger, {
        message: 'StateStore not provided to SpinnerView. Automatic spinner control via state.isLoading will not work.',
        origin: 'initializeSpinnerView'
    });
    // Return the basic API even if stateStore is not available, for manual control.
    return {
        show: spinnerView.show,
        hide: spinnerView.hide,
        toggle: spinnerView.toggle,
        isVisible: spinnerView.isVisible,
    };
  }

  // Alternative: Event-driven show/hide
  // if (eventAggregator) {
  //   eventAggregator.subscribe(EVENTS.SHOW_LOADING_SPINNER, spinnerView.show);
  //   eventAggregator.subscribe(EVENTS.HIDE_LOADING_SPINNER, spinnerView.hide);
  //   console.info('[SpinnerView] Subscribed to eventAggregator for show/hide events.');
  // }
}

// Export the core object for potential direct use if needed,
// but `initializeSpinnerView` is the recommended way to get a fully configured API.
export default spinnerView;
