// js/features/video-exporter/export.progress.tracker.js
import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, EVENTS, DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';

/**
 * @typedef {Object} ProgressData
 * @property {number|null} [percentage] - Percentage completed (0-100)
 * @property {string|null} [statusMessage] - Status message to display
 */

const exportProgressTracker = (() => {
  // DOM element references
  let progressBarContainer, progressBar, progressText;
  
  // Dependency injection container
  const dependencies = {
    stateStore: {
      getState: () => ({ exportProgress: null }),
      subscribe: () => (() => {})
    },
    errorLogger: console,
    notificationServiceAPI: { 
      showInfo: () => {}, 
      showError: () => {} 
    },
    eventAggregator: {
      subscribe: () => (() => {})
    }
  };
  
  // Private state
  let unsubscribeState = () => {};
  let eventSubscribers = [];

  /**
   * Updates the progress bar UI elements based on the progress data.
   * @private
   * @param {ProgressData|null} progressData - The progress data object from state or event.
   */
  function _updateProgressBarUI(progressData) {
    try {
      const percentage = progressData?.percentage;
      const statusMessage = progressData?.statusMessage;
      
      // Update progress bar visibility
      if (progressBarContainer) {
        progressBarContainer.style.display = 
          (percentage !== null && percentage !== undefined && percentage >= 0) ? 'block' : 'none';
      }
      
      // Update progress bar value
      if (progressBar && percentage !== null && percentage !== undefined) {
        progressBar.value = Math.max(0, Math.min(100, percentage));
      }
      
      // Update status text
      if (progressText && statusMessage !== undefined) {
        progressText.textContent = statusMessage !== null ? statusMessage : '';
      } else if (progressText && (percentage === null || percentage === undefined)) {
        // Clear text if progress is cleared
        progressText.textContent = '';
      }
    } catch (error) {
      _handleError('Failed to update progress bar UI', error);
    }
  }
  
  /**
   * Handles errors gracefully.
   * @private
   * @param {string} message - Error message
   * @param {Error} [error] - Error object
   */
  function _handleError(message, error = null) {
    const errorObj = {
      message,
      origin: 'ExportProgressTracker',
      severity: 'error',
      ...(error && { error })
    };
    
    (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, errorObj);
    dependencies.notificationServiceAPI.showError(`حدث خطأ في تتبع التقدم: ${message}`);
    
    if (error) {
      console.error('Export Progress Tracker Error Details:', error);
    }
  }

  /**
   * Sets up subscriptions to state changes and events.
   * @private
   */
  function _setupSubscriptions() {
    try {
      // Clean up existing subscriptions
      _removeSubscriptions();
      
      // Subscribe to state changes
      unsubscribeState = dependencies.stateStore.subscribe((newState) => {
        try {
          _updateProgressBarUI(newState.exportProgress);
        } catch (error) {
          _handleError('State subscription handler failed', error);
        }
      });
      
      // Subscribe to export events
      const handleExportProgress = (progressData) => {
        try {
          _updateProgressBarUI(progressData);
        } catch (error) {
          _handleError('Export progress event handler failed', error);
        }
      };
      
      const handleExportStarted = () => {
        _updateProgressBarUI({ 
          percentage: 0, 
          statusMessage: 'بدء التسجيل...' 
        });
      };
      
      const handleExportCompleted = () => {
        _updateProgressBarUI(null);
      };
      
      // Subscribe to events
      const exportProgressUnsubscribe = dependencies.eventAggregator.subscribe(
        EVENTS.EXPORT_PROGRESS, 
        handleExportProgress
      );
      
      const exportStartedUnsubscribe = dependencies.eventAggregator.subscribe(
        EVENTS.EXPORT_STARTED, 
        handleExportStarted
      );
      
      const exportCompletedUnsubscribe = dependencies.eventAggregator.subscribe(
        EVENTS.EXPORT_COMPLETED, 
        handleExportCompleted
      );
      
      // Store event subscribers for cleanup
      eventSubscribers = [
        exportProgressUnsubscribe,
        exportStartedUnsubscribe,
        exportCompletedUnsubscribe
      ];
      
    } catch (error) {
      _handleError('Failed to set up subscriptions', error);
    }
  }

  /**
   * Removes all subscriptions.
   * @private
   */
  function _removeSubscriptions() {
    try {
      // Remove state subscription
      if (typeof unsubscribeState === 'function') {
        unsubscribeState();
        unsubscribeState = () => {};
      }
      
      // Remove event subscribers
      eventSubscribers.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      eventSubscribers = [];
    } catch (error) {
      _handleError('Failed to remove subscriptions', error);
    }
  }

  /**
   * Validates that all required DOM elements are present.
   * @private
   * @returns {boolean} True if all elements are valid
   */
  function _validateDOMElements() {
    try {
      const elementsValid = !!(progressBarContainer && progressBar && progressText);
      
      if (!elementsValid && dependencies.notificationServiceAPI) {
        dependencies.notificationServiceAPI.showError(
          'فشل في العثور على عناصر واجهة المستخدم لتتبع تقدم التصدير.'
        );
      }
      
      return elementsValid;
    } catch (error) {
      _handleError('Failed to validate DOM elements', error);
      return false;
    }
  }

  /**
   * Initializes DOM element references.
   * @private
   */
  function _initializeDOMReferences() {
    try {
      progressBarContainer = DOMElements.exportProgressBarContainer;
      progressBar = DOMElements.exportProgressBar;
      progressText = DOMElements.exportProgressText;
      
      return _validateDOMElements();
    } catch (error) {
      _handleError('Failed to initialize DOM references', error);
      return false;
    }
  }

  /**
   * Injects dependencies into the module.
   * @private
   * @param {Object} injectedDeps - Dependencies to inject
   */
  function _setDependencies(injectedDeps) {
    try {
      Object.keys(dependencies).forEach(key => {
        if (injectedDeps[key]) dependencies[key] = injectedDeps[key];
      });
    } catch (error) {
      _handleError('Failed to set dependencies', error);
    }
  }

  return {
    _setDependencies,
    
    /**
     * Initializes the module with the provided dependencies.
     * @param {Object} injectedDeps - Dependencies to inject
     */
    setupProgressTracker(injectedDeps) {
      try {
        // Set dependencies
        _setDependencies(injectedDeps);
        
        // Initialize DOM references
        const elementsInitialized = _initializeDOMReferences();
        
        if (!elementsInitialized) {
          this.cleanup();
          return;
        }
        
        // Setup subscriptions
        _setupSubscriptions();
        
        // Update UI with initial state
        const initialState = dependencies.stateStore.getState();
        _updateProgressBarUI(initialState.exportProgress);
        
      } catch (error) {
        _handleError('Progress tracker setup failed', error);
        this.cleanup();
      }
    }
  };
})();

/**
 * Initializes the ExportProgressTracker module.
 * @param {Object} deps - Dependencies
 * @param {Object} deps.stateStore - State store
 * @param {Object} deps.errorLogger - Error logger
 * @param {Object} deps.notificationServiceAPI - Notification service API
 * @param {Object} deps.eventAggregator - Event aggregator
 * @returns {Object} - Initialized module with cleanup function
 */
export function initializeExportProgressTracker(deps) {
  try {
    // Initialize the module
    exportProgressTracker._setDependencies(deps);
    exportProgressTracker.setupProgressTracker(deps);
    
    return {
      cleanup: () => {
        try {
          // Remove all subscriptions
          if (typeof exportProgressTracker._removeSubscriptions === 'function') {
            exportProgressTracker._removeSubscriptions();
          }
          
          // Clear DOM references
          progressBarContainer = null;
          progressBar = null;
          progressText = null;
        } catch (error) {
          console.error('ExportProgressTracker cleanup failed:', error);
        }
      }
    };
  } catch (error) {
    console.error('ExportProgressTracker initialization failed:', error);
    return {
      cleanup: () => {}
    };
  }
}

export default exportProgressTracker;
