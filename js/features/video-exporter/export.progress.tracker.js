// js/features/video-exporter/export.progress.tracker.js

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, EVENTS, DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';
// import localizationService from '../../core/localization.service.js'; // If status messages need translation here

const exportProgressTracker = (() => {
  // DOM element references
  let progressBarContainer, progressBar, progressText;

  let dependencies = {
    stateStore: {
      getState: () => ({ exportProgress: null }),
      subscribe: () => (() => {})
    },
    errorLogger: console,
    // eventAggregator: { subscribe: () => ({ unsubscribe: () => {} }) },
    // localizationService,
  };

  /**
   * Updates the progress bar UI elements based on the progress data.
   * @private
   * @param {object | null} progressData - The progress data object from state or event.
   * @param {number} [progressData.percentage] - Percentage (0-100).
   * @param {string} [progressData.statusMessage] - Message to display.
   */
  function _updateProgressBarUI(progressData) {
    const percentage = progressData?.percentage;
    const statusMessage = progressData?.statusMessage;

    if (progressBarContainer) {
      progressBarContainer.style.display = (percentage !== null && percentage !== undefined && percentage >= 0) ? 'block' : 'none';
    }
    if (progressBar && percentage !== null && percentage !== undefined) {
      progressBar.value = Math.max(0, Math.min(100, percentage));
    }
    if (progressText && statusMessage !== undefined) {
      // const localizedMessage = dependencies.localizationService?.translate(statusMessage) || statusMessage;
      // For simplicity, assuming statusMessage is already localized or doesn't need it here.
      progressText.textContent = statusMessage !== null ? statusMessage : '';
    } else if (progressText && (percentage === null || percentage === undefined)) {
      // Clear text if progress is cleared
      progressText.textContent = '';
    }
  }
  
  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    // if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    // if (injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService;
  }

  // Public API (if any needed beyond initialization)
  return {
    _setDependencies,
    // updateDisplayManually: _updateProgressBarUI // If manual update is needed
  };

})(); // IIFE removed


/**
 * Initialization function for the ExportProgressTracker.
 * Subscribes to stateStore (or eventAggregator) for progress updates.
 * @param {object} deps
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * // @param {import('../../core/event-aggregator.js').default} [deps.eventAggregator]
 * // @param {import('../../core/localization.service.js').default} [deps.localizationService]
 */
export function initializeExportProgressTracker(deps) {
  exportProgressTracker._setDependencies(deps);
  const { stateStore, errorLogger /*, eventAggregator, localizationService */ } = deps;

  // Cache DOM elements
  exportProgressTracker.progressBarContRef = DOMElements.exportProgressBarContainer;
  exportProgressTracker.progressBarRef = DOMElements.exportProgressBar;
  exportProgressTracker.progressTextRef = DOMElements.exportProgressText;
  
  // Fallback references for the _updateProgressBarUI function within this init scope
  const pBarCont = exportProgressTracker.progressBarContRef;
  const pBar = exportProgressTracker.progressBarRef;
  const pText = exportProgressTracker.progressTextRef;

  if (!pBarCont || !pBar || !pText) {
    (errorLogger.logWarning || console.warn).call(errorLogger, {
      message: 'One or more export progress UI elements not found in DOMElements. Progress tracking will not be visible.',
      origin: 'initializeExportProgressTracker'
    });
    return { cleanup: () => {} }; // Return no-op API
  }

  const _updateDisplayDirect = (progressData) => {
    const percentage = progressData?.percentage;
    const statusMessage = progressData?.statusMessage;

    if (pBarCont) pBarCont.style.display = (percentage !== null && percentage !== undefined && percentage >= 0) ? 'block' : 'none';
    if (pBar && percentage !== null && percentage !== undefined) pBar.value = Math.max(0, Math.min(100, percentage));
    if (pText && statusMessage !== undefined) pText.textContent = statusMessage !== null ? statusMessage : '';
    else if (pText && (percentage === null || percentage === undefined)) pText.textContent = '';
  };


  // Option 1: Subscribe to stateStore
  let unsubscribeState = () => {};
  if (stateStore) {
    unsubscribeState = stateStore.subscribe((newState) => {
      // newState.exportProgress should be { percentage: number, statusMessage: string } | null
      _updateDisplayDirect(newState.exportProgress);
    });
    // Initial display based on current state
    _updateDisplayDirect(stateStore.getState().exportProgress);
    // console.info('[ExportProgressTracker] Subscribed to stateStore for exportProgress changes.');
  } else {
    (errorLogger.logWarning || console.warn).call(errorLogger, {
        message: "StateStore not provided to ExportProgressTracker. Progress updates via state won't work.",
        origin: "initializeExportProgressTracker"
    });
  }

  // Option 2: Subscribe to eventAggregator (if ccapture.recorder.js publishes this way)
  // let unsubscribeEvent = () => {};
  // if (eventAggregator) {
  //   unsubscribeEvent = eventAggregator.subscribe(EVENTS.EXPORT_PROGRESS, (progressPercentOrData) => {
  //     if (typeof progressPercentOrData === 'number') {
  //       _updateDisplayDirect({ percentage: progressPercentOrData, statusMessage: `${progressPercentOrData}%` });
  //     } else if (typeof progressPercentOrData === 'object' && progressPercentOrData !== null) {
  //       _updateDisplayDirect(progressPercentOrData);
  //     }
  //   });
  //   // Need to also listen to EXPORT_STARTED (to show) and EXPORT_COMPLETED (to hide)
  //   eventAggregator.subscribe(EVENTS.EXPORT_STARTED, () => _updateDisplayDirect({percentage:0, statusMessage: '0%'}));
  //   eventAggregator.subscribe(EVENTS.EXPORT_COMPLETED, () => _updateDisplayDirect(null)); // Hide
  //   console.info('[ExportProgressTracker] Subscribed to eventAggregator for export progress events.');
  // }
  
  // If both state and event are used, be careful about duplicate updates.
  // Typically, one primary mechanism is chosen. State-driven is often cleaner.


  // console.info('[ExportProgressTracker] Initialized.');
  return {
    cleanup: () => {
      unsubscribeState();
      // unsubscribeEvent(); // If using eventAggregator
      // console.info('[ExportProgressTracker] Cleaned up.');
    }
  };
}

export default exportProgressTracker;
