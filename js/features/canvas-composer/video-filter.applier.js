import DOMElements from '../../core/dom-elements.js';
import {
  ACTIONS,
  EVENTS
} from '../../config/app.constants.js';
import globalLocalizationService from '../../core/localization.service.js'; // Fallback global instance
// errorLogger and eventAggregator are expected to be injected via dependencies.

/**
 * @typedef {Object} FilterConfig
 * @property {string} name - الاسم القابل للعرض للفلتر.
 * @property {string} value - قيمة CSS filter (e.g., 'grayscale(100%)').
 * @property {string} [type='color'] - نوع الفلتر (e.g., 'color', 'effect', 'custom').
 * @property {number} [intensity=1] - الشدة الافتراضية (مفهوم قد يتطلب منطق تطبيق خاص).
 * @property {string} [baseValue] -  (Optional) For intensity calculation, the numeric part if value is like 'grayscale(X%)'.
 * @property {string} [baseUnit] - (Optional) For intensity calculation, the unit part if value is like 'grayscale(X%)'.
 */

/**
 * @typedef {Object} FilterState Detailed state of the current filter.
 * @property {string} filterKey - The key of the currently applied filter.
 * @property {string} filterValue - The actual CSS filter value applied to the canvas.
 * @property {string} filterName - The display name of the filter.
 * @property {string} filterType - The type category of the filter.
 * @property {number} filterIntensity - The configured intensity of the filter.
 * @property {boolean} isActive - Is a filter (other than 'none') visually active?
 * @property {boolean} isAnimated - Is a CSS animation currently running on the canvas?
 * @property {number} animationProgress - Current progress of an animation (0-1), if controlled by CSS variable.
 * @property {string} animationDuration - Duration of the CSS animation.
 * @property {string} animationDelay - Delay of the CSS animation.
 * @property {string} animationEasing - Timing function of the CSS animation.
 * @property {boolean} animationReverse - Is the animation direction reversed?
 * @property {number} animationIterationCount - Number of times the animation will repeat.
 * @property {string} animationDirection - Direction of the animation.
 * @property {boolean} animationRunning - Is the animation currently in a 'running' play state?
 * @property {string} animationName - Name of the CSS animation.
 * @property {boolean} isTainted - Is any filter (other than 'none' or empty) applied?
 * @property {number} timestamp - Timestamp of when this state was generated.
 * @property {string|null} error - Error message if component is not fully initialized.
 */

const DEFAULT_FILTER_KEY = 'none';

// Initial list of supported filters. Can be extended dynamically.
const SUPPORTED_VIDEO_FILTERS = {
  [DEFAULT_FILTER_KEY]: {
    name: globalLocalizationService.translate('VideoFilters.None'),
    value: 'none',
    type: 'color',
    intensity: 0
  },
  grayscale: {
    name: globalLocalizationService.translate('VideoFilters.Grayscale'),
    value: 'grayscale(100%)',
    type: 'color',
    intensity: 1,
    baseValue: 100, // For intensity calculation: grayscale(X%)
    baseUnit: '%'
  },
  sepia: {
    name: globalLocalizationService.translate('VideoFilters.Sepia'),
    value: 'sepia(100%)',
    type: 'color',
    intensity: 1,
    baseValue: 100,
    baseUnit: '%'
  },
  invert: {
    name: globalLocalizationService.translate('VideoFilters.Invert'),
    value: 'invert(100%)',
    type: 'color',
    intensity: 1,
    baseValue: 100,
    baseUnit: '%'
  },
  // ... (add other predefined filters here following the same structure)
  blur: {
    name: globalLocalizationService.translate('VideoFilters.Blur'),
    value: 'blur(5px)',
    type: 'effect',
    intensity: 1,
    baseValue: 5, // For intensity calculation: blur(Xpx)
    baseUnit: 'px'
  },
};

/**
 * Manages the application of CSS filters to a video canvas element,
 * integrates with a state management system and an event aggregator.
 * @class VideoFilterApplier
 * @version 3.5.0
 */
export default class VideoFilterApplier {
  /** @type {HTMLCanvasElement|null} */
  canvasElement = null;
  /** @type {HTMLSelectElement|null} */
  filterSelectElement = null;
  /** @type {import('../../core/state-store.js').StateStore} */
  stateStore;
  /** @type {import('../../core/event-aggregator.js').EventAggregator} */
  eventAggregator;
  /** @type {import('../../core/error-logger.js').ErrorLogger} */
  errorLogger;
  /** @type {import('../../core/localization.service.js').LocalizationService} */
  localizationService;

  /** @type {Function|null} */
  _unsubscribeState = null;
  /** @type {Array<{id: string, startTimeTimeout: number, durationEndTimeout: number|null}>} */
  _durationTimers = [];

  // Bound event handlers for reliable add/remove
  _boundHandleFilterSelectionChange;
  _boundHandleStateChange;
  _boundHandleFilterSeek;
  _boundHandleFilterApplyRequested;
  _boundHandleCustomFilterEvent; // Generic for add/update/remove if needed or specific ones
  _boundHandleResetAllFilters;


  /**
   * @param {Object} dependencies
   * @param {import('../../core/state-store.js').StateStore} dependencies.stateStore
   * @param {import('../../core/event-aggregator.js').EventAggregator} dependencies.eventAggregator
   * @param {import('../../core/error-logger.js').ErrorLogger} [dependencies.errorLogger]
   * @param {import('../../core/localization.service.js').LocalizationService} [dependencies.localizationService]
   */
  constructor(dependencies) {
    if (!dependencies || !dependencies.stateStore || !dependencies.eventAggregator) {
      const errorMsg = 'VideoFilterApplier: Critical dependencies (stateStore, eventAggregator) are missing.';
      console.error(errorMsg); // Log to console as errorLogger might not be available
      throw new Error(errorMsg);
    }

    this.stateStore = dependencies.stateStore;
    this.eventAggregator = dependencies.eventAggregator;
    this.errorLogger = dependencies.errorLogger || console; // Fallback to console
    this.localizationService = dependencies.localizationService || globalLocalizationService; // Fallback to global

    this._bindEventHandlers();
    this._initialize();
  }

  _bindEventHandlers() {
    this._boundHandleFilterSelectionChange = this.handleFilterSelectionChange.bind(this);
    this._boundHandleStateChange = this._onStateChange.bind(this);
    this._boundHandleFilterSeek = this.handleFilterSeek.bind(this);
    this._boundHandleFilterApplyRequested = (data) => {
      if (data?.filterKey && this.isFilterSupported(data.filterKey)) {
        this.applyFilter(data.filterKey);
        // UI update should follow from state change or applyFilter side effects
      } else if (data?.filterKey) {
        this.errorLogger.logWarning({
            message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKeyOnRequest', { key: data.filterKey }),
            origin: 'VideoFilterApplier._event.FILTER_APPLY_REQUESTED'
        });
      }
    };
    this._boundHandleCustomFilterEvent = (eventData) => {
        // Example handler for CUSTOM_FILTER_ADDED, could be expanded or made more specific
        if (eventData?.type === EVENTS.CUSTOM_FILTER_ADDED && eventData.payload) {
            const { filterKey, filterConfig } = eventData.payload;
             if (filterKey && filterConfig) {
                this.addCustomFilter(filterKey, filterConfig, false); // false: already an event
            }
        }
        // Add similar handling for REMOVED, UPDATED if they are separate events or check type.
    };
    this._boundHandleResetAllFilters = this.resetAllFilters.bind(this);
  }

  _initialize() {
    try {
      this.canvasElement = DOMElements.getCanvasElement();
      this.filterSelectElement = DOMElements.getFilterSelectElement();

      if (!this.canvasElement || !this.filterSelectElement) {
        this.errorLogger.logError({ // Elevate to error if essential UI is missing
          message: this.localizationService.translate('VideoFilterApplier.MissingDOMElementsOnInit'),
          origin: 'VideoFilterApplier._initialize',
          isCritical: true
        });
        // Module might be non-functional without these.
        // Consider setting a flag to prevent operations if they are critical.
        return;
      }

      this.populateFilterSelect();
      this._setupEventListeners();

      const currentState = this.stateStore.getState();
      const initialFilterKey = currentState?.currentProject?.videoComposition?.videoFilter;

      if (initialFilterKey && this.isFilterSupported(initialFilterKey)) {
        this.applyFilter(initialFilterKey);
        // this.updateFilterSelectUI(initialFilterKey); // applyFilter should ensure state -> UI consistency
      } else {
        if (initialFilterKey) {
            this.errorLogger.logWarning({
                message: this.localizationService.translate('VideoFilterApplier.InitialFilterInvalid', { key: initialFilterKey }),
                origin: 'VideoFilterApplier._initialize'
            });
        }
        this.applyFilter(DEFAULT_FILTER_KEY);
        // this.updateFilterSelectUI(DEFAULT_FILTER_KEY);
      }

      this.eventAggregator.publish(EVENTS.VIDEO_FILTER_MODULE_READY, { timestamp: Date.now() });
      this.errorLogger.logInfo({ message: 'VideoFilterApplier initialized successfully.', origin: 'VideoFilterApplier._initialize'});

    } catch (error) {
      this.errorLogger.handleError(error, {
        message: this.localizationService.translate('VideoFilterApplier.InitializationFailed'),
        origin: 'VideoFilterApplier._initialize',
        isCritical: true
      });
    }
  }

  /**
   * Applies a filter to the main canvas element and updates the application state.
   * @param {string} filterKey - The key of the filter to apply.
   */
  applyFilter(filterKey) {
    if (!this.canvasElement) {
      this.errorLogger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.CanvasNotReady'),
        origin: 'VideoFilterApplier.applyFilter'
      });
      return;
    }

    const effectiveFilterKey = this.isFilterSupported(filterKey) ? filterKey : DEFAULT_FILTER_KEY;
    if (filterKey !== effectiveFilterKey) {
         this.errorLogger.logWarning({
            message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKeyFallback', { key: filterKey, fallback: effectiveFilterKey }),
            origin: 'VideoFilterApplier.applyFilter'
        });
    }

    const filterConfig = SUPPORTED_VIDEO_FILTERS[effectiveFilterKey];
    this.canvasElement.style.filter = filterConfig.value || 'none';

    // Dispatch action to update state only if it's different
    const currentAppState = this.stateStore.getState();
    if (currentAppState?.currentProject?.videoComposition?.videoFilter !== effectiveFilterKey) {
        this.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
            videoComposition: { videoFilter: effectiveFilterKey }
        });
    } else {
        // If filter is the same, still ensure UI is sync (e.g., if populated after state was set)
        this.updateFilterSelectUI(effectiveFilterKey);
    }


    this.eventAggregator.publish(EVENTS.VIDEO_FILTER_APPLIED, {
      filterKey: effectiveFilterKey,
      filterValue: filterConfig.value,
      timestamp: Date.now()
    });
  }

  /**
   * Applies the filter currently defined in the application state.
   * Typically used on initialization or after external state changes.
   */
  applyCurrentFilterFromState() {
    const currentState = this.stateStore.getState();
    const currentFilterKey = currentState?.currentProject?.videoComposition?.videoFilter || DEFAULT_FILTER_KEY;
    this.applyFilter(currentFilterKey); // applyFilter handles validation and UI update via state subscription
  }

  /**
   * Updates the filter selection dropdown to match the given filter key.
   * @param {string} filterKey - The filter key to select in the dropdown.
   */
  updateFilterSelectUI(filterKey) {
    if (!this.filterSelectElement) {
      // Warning already logged during _initialize if missing
      return;
    }
    const effectiveKey = this.isFilterSupported(filterKey) ? filterKey : DEFAULT_FILTER_KEY;

    if (this.filterSelectElement.value !== effectiveKey) {
      this.filterSelectElement.value = effectiveKey;
      // Event for UI updates could be useful for testing or other modules.
      this.eventAggregator.publish(EVENTS.UI_ELEMENT_UPDATED, {
        elementId: this.filterSelectElement.id || 'videoFilterSelect', // Use ID if available
        value: effectiveKey,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Handles changes from the filter selection dropdown.
   * @param {Event} event - The change event from the select element.
   */
  handleFilterSelectionChange(event) {
    if (!event?.target) {
      this.errorLogger.logWarning({ message: 'Filter selection change event missing target.', origin: 'VideoFilterApplier.handleFilterSelectionChange'});
      return;
    }
    const selectedFilterKey = /** @type {HTMLSelectElement} */ (event.target).value;
    this.applyFilter(selectedFilterKey); // This will handle validation and state update
    // Log after applyFilter handles potential fallbacks
    const appliedFilterKey = this.stateStore.getState()?.currentProject?.videoComposition?.videoFilter || DEFAULT_FILTER_KEY;

    this.errorLogger.logInfo({
      message: this.localizationService.translate('VideoFilterApplier.FilterAppliedViaUI', { filter: appliedFilterKey }),
      origin: 'VideoFilterApplier.handleFilterSelectionChange'
    });
  }

  /**
   * Populates the filter selection dropdown with available filters.
   */
  populateFilterSelect() {
    if (!this.filterSelectElement) {
      this.errorLogger.logWarning({ message: this.localizationService.translate('VideoFilterApplier.FilterSelectElementMissingOnPopulate'), origin: 'VideoFilterApplier.populateFilterSelect' });
      return;
    }

    this.filterSelectElement.innerHTML = ''; // Clear existing options

    Object.entries(SUPPORTED_VIDEO_FILTERS).forEach(([key, config]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = config.name || key; // Fallback to key if name is missing
      this.filterSelectElement.appendChild(option);
    });

    const currentFilterKey = this.stateStore.getState()?.currentProject?.videoComposition?.videoFilter || DEFAULT_FILTER_KEY;
    this.updateFilterSelectUI(currentFilterKey);

    this.eventAggregator.publish(EVENTS.FILTER_POPULATED, { count: Object.keys(SUPPORTED_VIDEO_FILTERS).length, timestamp: Date.now() });
  }

  /**
   * Handles state changes from the state store.
   * @param {Object} newState - The new application state.
   * @param {Object} oldState - The previous application state.
   */
  _onStateChange(newState, oldState) {
    const newFilterKey = newState?.currentProject?.videoComposition?.videoFilter;
    const oldFilterKey = oldState?.currentProject?.videoComposition?.videoFilter;

    if (newFilterKey !== oldFilterKey) {
      // If the state attempts to set an unsupported filter directly, log it and apply default.
      const effectiveKey = this.isFilterSupported(newFilterKey) ? newFilterKey : DEFAULT_FILTER_KEY;
      if (newFilterKey && newFilterKey !== effectiveKey) {
        this.errorLogger.logWarning({
          message: this.localizationService.translate('VideoFilterApplier.InvalidFilterInState', { key: newFilterKey, fallback: effectiveKey }),
          origin: 'VideoFilterApplier._onStateChange'
        });
        // If state was forced to an invalid filter, dispatch correction? Or let applyFilter handle it?
        // Current applyFilter updates state if different, so this creates a loop if state has truly invalid value.
        // Solution: only call applyFilter if *our derived effectiveKey* is different from actual visual.
      }
      
      // Apply if visually different from new state, or if state changes to valid, supported key.
      const visuallyAppliedFilterValue = this.canvasElement ? this.canvasElement.style.filter : 'none';
      const targetFilterValue = SUPPORTED_VIDEO_FILTERS[effectiveKey]?.value || 'none';
      
      if(visuallyAppliedFilterValue !== targetFilterValue) {
          this.applyFilter(effectiveKey); // applyFilter will reconcile stateStore if needed
      }
      this.updateFilterSelectUI(effectiveKey); // Always ensure UI is in sync with effective state
    }
  }

  _setupEventListeners() {
    if (this.filterSelectElement) {
      this.filterSelectElement.addEventListener('change', this._boundHandleFilterSelectionChange);
    } else {
        this.errorLogger.logError({ message: 'Filter select element not available for event listener setup.', origin: 'VideoFilterApplier._setupEventListeners'});
    }

    if (this.stateStore && typeof this.stateStore.subscribe === 'function') {
      this._unsubscribeState = this.stateStore.subscribe(this._boundHandleStateChange);
    } else {
        this.errorLogger.logError({ message: 'StateStore not available for subscription.', origin: 'VideoFilterApplier._setupEventListeners'});
    }

    // Event Aggregator subscriptions
    this.eventAggregator.subscribe(EVENTS.TIMELINE_TIME_CHANGED, this._boundHandleFilterSeek);
    this.eventAggregator.subscribe(EVENTS.FILTER_APPLY_REQUESTED, this._boundHandleFilterApplyRequested);
    this.eventAggregator.subscribe(EVENTS.CUSTOM_FILTER_ADDED, this._boundHandleCustomFilterEvent); // More generic or split if needed
    // Add listeners for CUSTOM_FILTER_REMOVED, CUSTOM_FILTER_UPDATED if they directly affect this module's list.
    // this.eventAggregator.subscribe(EVENTS.PLAY_BUTTON_CLICKED, boundHandlerForPlay);
    // this.eventAggregator.subscribe(EVENTS.PAUSE_BUTTON_CLICKED, boundHandlerForPause);
    this.eventAggregator.subscribe(EVENTS.RESET_BUTTON_CLICKED, this._boundHandleResetAllFilters);
  }

  _teardownEventListeners() {
    if (this.filterSelectElement) {
      this.filterSelectElement.removeEventListener('change', this._boundHandleFilterSelectionChange);
    }

    if (this._unsubscribeState) {
      this._unsubscribeState();
      this._unsubscribeState = null;
    }

    this.eventAggregator.unsubscribe(EVENTS.TIMELINE_TIME_CHANGED, this._boundHandleFilterSeek);
    this.eventAggregator.unsubscribe(EVENTS.FILTER_APPLY_REQUESTED, this._boundHandleFilterApplyRequested);
    this.eventAggregator.unsubscribe(EVENTS.CUSTOM_FILTER_ADDED, this._boundHandleCustomFilterEvent);
    this.eventAggregator.unsubscribe(EVENTS.RESET_BUTTON_CLICKED, this._boundHandleResetAllFilters);
  }

  /** Resets the main canvas filter to 'none' and updates state. */
  resetFilter() {
    if (this.canvasElement) {
      this.canvasElement.style.filter = 'none';
      this.canvasElement.style.animation = ''; // Clear any active animations
      this.canvasElement.style.transition = ''; // Clear any active transitions
    }
    this.applyFilter(DEFAULT_FILTER_KEY); // Ensures state consistency and UI updates
    this.eventAggregator.publish(EVENTS.FILTER_RESET, { timestamp: Date.now() });
  }

  /** Resets all filters (currently implies resetting the main filter). */
  resetAllFilters() {
    this.resetFilter(); // Currently, only one primary filter is managed.
    this.eventAggregator.publish(EVENTS.ALL_FILTERS_RESET, { timestamp: Date.now() });
  }

  /** Cleans up resources used by the module. */
  cleanup() {
    this._teardownEventListeners();
    
    this._durationTimers.forEach(timerObj => {
      clearTimeout(timerObj.startTimeTimeout);
      if (timerObj.durationEndTimeout) clearTimeout(timerObj.durationEndTimeout);
    });
    this._durationTimers = [];

    if (this.canvasElement) {
        // Reset styles if desired upon cleanup
        this.canvasElement.style.filter = 'none';
        this.canvasElement.style.animation = '';
        this.canvasElement.style.opacity = '1';
        this.canvasElement.style.transform = '';
        this.canvasElement.style.mixBlendMode = 'normal';
    }
    
    this.canvasElement = null;
    this.filterSelectElement = null;

    this.errorLogger.logInfo({ message: 'VideoFilterApplier cleaned up.', origin: 'VideoFilterApplier.cleanup'});
    this.eventAggregator.publish(EVENTS.FILTER_CLEANED_UP, { timestamp: Date.now() });
  }

  /**
   * Checks if a filter key is present in the list of supported filters.
   * @param {string} filterKey - The key of the filter.
   * @returns {boolean} True if the filter is supported.
   */
  isFilterSupported(filterKey) {
    return filterKey && SUPPORTED_VIDEO_FILTERS.hasOwnProperty(filterKey);
  }

  /** Checks if the project state is considered ready. */
  isProjectReady() {
    return !!this.stateStore.getState()?.currentProject;
  }

  /** Checks if essential DOM elements are available. */
  areElementsReady() {
    return !!this.canvasElement && !!this.filterSelectElement;
  }

  /** Checks if any filter (other than 'none') is visually applied. */
  isFilterActive() {
    if (!this.canvasElement) return false;
    const currentFilter = window.getComputedStyle(this.canvasElement).filter;
    return currentFilter !== 'none' && currentFilter !== '';
  }

  /** Checks if a CSS animation is currently in the 'running' state on the canvas. */
  isFilterAnimationPlaying() {
    if (!this.canvasElement) return false;
    return window.getComputedStyle(this.canvasElement).animationPlayState === 'running';
  }

  /**
   * Retrieves the current visual state of the filter applied to the canvas.
   * @returns {FilterState} The current filter state.
   */
  getCurrentState() {
    if (!this.canvasElement || !this.stateStore || !this.localizationService) {
        return {
            error: "VideoFilterApplier not fully initialized.",
            filterKey: DEFAULT_FILTER_KEY, filterValue: 'none', filterName: 'None', filterType: 'color',
            filterIntensity: 0, isActive: false, isAnimated: false, animationProgress: 0,
            animationDuration: '0s', animationDelay: '0s', animationEasing: 'linear',
            animationReverse: false, animationIterationCount: 1, animationDirection: 'normal',
            animationRunning: false, animationName: 'none', isTainted: false, timestamp: Date.now()
        };
    }
    const computedStyle = window.getComputedStyle(this.canvasElement);
    const appState = this.stateStore.getState();
    const currentFilterKeyInState = appState?.currentProject?.videoComposition?.videoFilter || DEFAULT_FILTER_KEY;
    const filterKey = this.isFilterSupported(currentFilterKeyInState) ? currentFilterKeyInState : DEFAULT_FILTER_KEY;
    
    const filterConfig = SUPPORTED_VIDEO_FILTERS[filterKey];

    return {
      error: null,
      filterKey,
      filterValue: computedStyle.filter || 'none',
      filterName: filterConfig.name || filterKey,
      filterType: filterConfig.type || 'unknown',
      filterIntensity: filterConfig.intensity || 0, // Configured intensity
      isActive: filterKey !== DEFAULT_FILTER_KEY && (computedStyle.filter !== 'none' && computedStyle.filter !== ''),
      isAnimated: computedStyle.animationName !== 'none' && computedStyle.animationName !== '',
      animationProgress: parseFloat(computedStyle.getPropertyValue('--filter-progress')) || 0, // Example CSS var
      animationDuration: computedStyle.animationDuration || '0s',
      animationDelay: computedStyle.animationDelay || '0s',
      animationEasing: computedStyle.animationTimingFunction || 'linear',
      animationReverse: computedStyle.animationDirection === 'reverse',
      animationIterationCount: parseInt(computedStyle.animationIterationCount, 10) || (computedStyle.animationName !== 'none' ? 1 : 0),
      animationDirection: computedStyle.animationDirection || 'normal',
      animationRunning: computedStyle.animationPlayState === 'running',
      animationName: computedStyle.animationName || 'none',
      isTainted: computedStyle.filter !== 'none' && computedStyle.filter !== '',
      timestamp: Date.now()
    };
  }

  /** Toggles between 'none' filter and a default filter (e.g., 'grayscale'). */
  toggleFilter() {
    const currentState = this.stateStore.getState();
    const currentFilterKey = currentState?.currentProject?.videoComposition?.videoFilter || DEFAULT_FILTER_KEY;
    const targetFilterKey = (currentFilterKey === DEFAULT_FILTER_KEY || currentFilterKey === 'none') ? 'grayscale' : DEFAULT_FILTER_KEY;

    if (!this.isFilterSupported(targetFilterKey) && targetFilterKey !== DEFAULT_FILTER_KEY) {
        this.errorLogger.logWarning({
            message: this.localizationService.translate('VideoFilterApplier.ToggleTargetInvalid', { key: targetFilterKey }),
            origin: 'VideoFilterApplier.toggleFilter'
        });
        this.applyFilter(DEFAULT_FILTER_KEY); // Fallback if 'grayscale' somehow isn't supported
    } else {
        this.applyFilter(targetFilterKey);
    }

    this.eventAggregator.publish(EVENTS.FILTER_TOGGLED, {
      previousFilter: currentFilterKey,
      newFilter: this.stateStore.getState().currentProject.videoComposition.videoFilter, // Get the actually applied one
      timestamp: Date.now()
    });
  }

  _applyFilterToMatchingElements(selector, filterKey, eventNameToPublish, origin) {
    const effectiveFilterKey = this.isFilterSupported(filterKey) ? filterKey : DEFAULT_FILTER_KEY;
    if (!this.isFilterSupported(effectiveFilterKey)) { // Double check, though should be caught by effectiveFilterKey logic
      this.errorLogger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKeyForElements', { key: filterKey }), origin });
      return;
    }

    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) {
      this.errorLogger.logInfo({
        message: this.localizationService.translate('VideoFilterApplier.NoElementsForSelector', { selector }), origin });
      return;
    }

    const filterValue = SUPPORTED_VIDEO_FILTERS[effectiveFilterKey].value || 'none';
    elements.forEach(el => {
      if (el instanceof HTMLElement) el.style.filter = filterValue;
    });

    if (eventNameToPublish) {
      this.eventAggregator.publish(eventNameToPublish, {
        filterKey: effectiveFilterKey,
        selector,
        elementsCount: elements.length,
        timestamp: Date.now()
      });
    }
  }

  /** Applies the current main filter to background elements. */
  applyFilterToBackground() {
    const currentFilter = this.stateStore.getState()?.currentProject?.videoComposition?.videoFilter || DEFAULT_FILTER_KEY;
    this._applyFilterToMatchingElements('.background-element', currentFilter, EVENTS.FILTER_APPLIED_TO_BACKGROUND, 'VideoFilterApplier.applyFilterToBackground');
  }

  /** Applies the current main filter to text elements. */
  applyFilterToText() {
    const currentFilter = this.stateStore.getState()?.currentProject?.videoComposition?.videoFilter || DEFAULT_FILTER_KEY;
    this._applyFilterToMatchingElements('[data-verse-text]', currentFilter, EVENTS.FILTER_APPLIED_TO_TEXT, 'VideoFilterApplier.applyFilterToText');
  }
  
  /** Updates export settings with the current filter (does not apply visually here). */
  applyFilterToExport() {
    const currentState = this.stateStore.getState();
    if (!currentState?.currentProject?.exportSettings) {
      this.errorLogger.logWarning({ message: this.localizationService.translate('VideoFilterApplier.ExportSettingsMissing'), origin: 'VideoFilterApplier.applyFilterToExport' });
      return;
    }
    const currentFilter = currentState.currentProject.videoComposition?.videoFilter || DEFAULT_FILTER_KEY;
    
    this.stateStore.dispatch(ACTIONS.UPDATE_EXPORT_SETTINGS, { videoFilter: currentFilter });
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_EXPORT, { filterKey: currentFilter, timestamp: Date.now() });
  }

  /**
   * Applies a filter to the canvas using a CSS class for transition effects.
   * Assumes the CSS class defines the transition properties and target filter state.
   * @param {string} filterKey - The target filter key.
   * @param {string} [transitionName='fade'] - Name of the transition (maps to CSS class `filter-transition-${transitionName}`).
   * @param {number} [duration=500] - Expected duration of the transition for fallback cleanup.
   */
  applyFilterWithTransition(filterKey, transitionName = 'fade', duration = 500) {
    if (!this.canvasElement || !this.isProjectReady()) {
        this.errorLogger.logWarning({ message: this.localizationService.translate('VideoFilterApplier.CannotApplyTransition'), origin: 'VideoFilterApplier.applyFilterWithTransition'});
        return;
    }
    const targetFilterKey = this.isFilterSupported(filterKey) ? filterKey : DEFAULT_FILTER_KEY;
    const transitionClass = `filter-transition-${transitionName}`;

    // Set the target filter style directly. The transition class should primarily define 'transition' property.
    this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[targetFilterKey].value || 'none';
    this.canvasElement.classList.add(transitionClass);

    const onTransitionEnd = (event) => {
      // Ensure the event is for the filter property if possible, or on the canvas itself
      if (event.target === this.canvasElement) {
        this.canvasElement.classList.remove(transitionClass);
        this.eventAggregator.publish(EVENTS.FILTER_TRANSITION_COMPLETED, {
          filterKey: targetFilterKey,
          transition: transitionName,
          timestamp: Date.now()
        });
      }
    };
    this.canvasElement.addEventListener('transitionend', onTransitionEnd, { once: true });
    
    // Fallback if transitionend doesn't fire (e.g., no actual change or interrupted)
    setTimeout(() => {
        if (this.canvasElement?.classList.contains(transitionClass)) {
            this.canvasElement.classList.remove(transitionClass);
            this.errorLogger.logInfo({message: `Transition fallback for ${transitionClass}`, origin: 'VideoFilterApplier.applyFilterWithTransition'});
            // Consider publishing completion event here too if not already done
        }
    }, duration + 100); // Slightly longer than expected
  }

  /**
   * Applies a filter to the canvas using a CSS class for animation effects.
   * Assumes the CSS class defines the animation properties. The filter itself might also
   * be part of the animation or applied separately.
   * @param {string} filterKeyToAnimateTo - The filter key that the animation might lead to or work with.
   * @param {string} [animationName='fadeIn'] - Name of the animation (maps to CSS class `filter-animation-${animationName}`).
   */
  applyFilterWithAnimation(filterKeyToAnimateTo, animationName = 'fadeIn') {
     if (!this.canvasElement || !this.isProjectReady()) {
        this.errorLogger.logWarning({ message: this.localizationService.translate('VideoFilterApplier.CannotApplyAnimation'), origin: 'VideoFilterApplier.applyFilterWithAnimation'});
        return;
    }
    const animationClass = `filter-animation-${animationName}`;
    const targetFilterKey = this.isFilterSupported(filterKeyToAnimateTo) ? filterKeyToAnimateTo : DEFAULT_FILTER_KEY;

    // Option 1: Animation class sets the filter.
    // Option 2: Set filter here, animation class animates other props or the filter itself.
    // For Option 2 (example):
    // this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[targetFilterKey].value || 'none';

    this.canvasElement.classList.add(animationClass);

    const onAnimationEnd = (event) => {
      if (event.target === this.canvasElement) { // Make sure it's for the canvas
        this.canvasElement.classList.remove(animationClass);
        // The filter might need to persist post-animation, depends on CSS setup.
        // If animation applied the filter, this.applyFilter(targetFilterKey) might be needed here
        // to ensure state and style are finally in sync.
        this.eventAggregator.publish(EVENTS.FILTER_ANIMATION_COMPLETED, {
          filterKey: targetFilterKey,
          animation: animationName,
          timestamp: Date.now()
        });
      }
    };
    this.canvasElement.addEventListener('animationend', onAnimationEnd, { once: true });
    
    // Fallback (animations can have complex durations, get duration from CSS if possible)
    // const animDurationStr = window.getComputedStyle(this.canvasElement).animationDuration;
    // const animDurationMs = parseFloat(animDurationStr) * (animDurationStr.endsWith('s') ? 1000 : 1);
    // setTimeout(... animDurationMs + 100);
  }

  /** Applies filter if condition is true. */
  applyFilterIf(filterKey, conditionCallback) {
    if (typeof conditionCallback === 'function') {
      try {
        if (conditionCallback()) this.applyFilter(filterKey);
      } catch (e) {
        this.errorLogger.handleError(e, { message: 'Error in conditionCallback for applyFilterIf', origin: 'VideoFilterApplier.applyFilterIf'});
      }
    } else {
      this.errorLogger.logWarning({message: 'Provided condition for applyFilterIf is not a function.', origin: 'VideoFilterApplier.applyFilterIf'});
    }
  }

  /**
   * Performs a self-test of the module's basic functionality.
   * @returns {boolean} True if basic tests pass.
   */
  selfTest() {
    if (!this.canvasElement || !this.errorLogger || !this.localizationService || !this.stateStore) {
      console.error("VideoFilterApplier.selfTest: Core components missing for self-test.");
      return false;
    }
    try {
      const originalFilterState = this.stateStore.getState()?.currentProject?.videoComposition?.videoFilter;
      const originalCanvasFilter = this.canvasElement.style.filter;
      const testFilterKey = 'grayscale';

      if (!this.isFilterSupported(testFilterKey)) {
        this.errorLogger.logInfo({ message: `SelfTest: Default test filter '${testFilterKey}' not supported. Skipping apply test.`, origin: "VideoFilterApplier.selfTest" });
        return Object.keys(SUPPORTED_VIDEO_FILTERS).length > 1;
      }

      this.applyFilter(testFilterKey);
      let isApplied = (window.getComputedStyle(this.canvasElement).filter || '').includes('grayscale');
      let stateUpdated = this.stateStore.getState().currentProject.videoComposition.videoFilter === testFilterKey;

      // Restore
      this.canvasElement.style.filter = originalCanvasFilter;
      if(originalFilterState !== undefined) {
        this.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { videoComposition: { videoFilter: originalFilterState }});
      } else {
         this.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { videoComposition: { videoFilter: DEFAULT_FILTER_KEY }});
      }
      this.updateFilterSelectUI(originalFilterState || DEFAULT_FILTER_KEY);


      if (!isApplied) this.errorLogger.logWarning({ message: this.localizationService.translate('VideoFilterApplier.SelfTestFailedApply'), origin: 'VideoFilterApplier.selfTest'});
      if (!stateUpdated) this.errorLogger.logWarning({ message: this.localizationService.translate('VideoFilterApplier.SelfTestFailedState'), origin: 'VideoFilterApplier.selfTest'});
      
      return isApplied && stateUpdated;
    } catch (e) {
      this.errorLogger.handleError(e, { message: this.localizationService.translate('VideoFilterApplier.SelfTestFailedGeneric'), origin: 'VideoFilterApplier.selfTest'});
      return false;
    }
  }

  /**
   * Updates a specified CSS property on the canvas element and publishes an event.
   * @param {string} cssProperty - The CSS property to update (e.g., 'animationPlayState', '--filter-progress').
   * @param {string|number} value - The value to set for the CSS property.
   * @param {string} eventName - The name of the event to publish.
   * @param {string} [payloadKey] - Optional key for the value in the event payload.
   * @param {any} [payloadValue] - Optional value for the payloadKey.
   */
  _updateCanvasStyleAndPublish(cssProperty, value, eventName, payloadKey, payloadValue) {
      if (!this.canvasElement) {
        this.errorLogger.logWarning({ message: `Canvas element not available for style update: ${cssProperty}`, origin: 'VideoFilterApplier._updateCanvasStyleAndPublish'});
        return;
      }
      
      if (cssProperty.startsWith('--')) { // CSS Custom Property
        this.canvasElement.style.setProperty(cssProperty, String(value));
      } else { // Standard CSS property
        // @ts-ignore // Allow dynamic style property assignment
        if (typeof this.canvasElement.style[cssProperty] !== 'undefined') {
            // @ts-ignore
            this.canvasElement.style[cssProperty] = String(value);
        } else {
            this.errorLogger.logWarning({ message: `Unsupported direct style property: ${cssProperty}`, origin: 'VideoFilterApplier._updateCanvasStyleAndPublish'});
            return; // Don't publish if style couldn't be set
        }
      }
      
      const eventPayload = { timestamp: Date.now() };
      if (payloadKey) {
        // @ts-ignore
        eventPayload[payloadKey] = payloadValue !== undefined ? payloadValue : value;
      }
      this.eventAggregator.publish(eventName, eventPayload);
  }

  /** Handles changes to the filter's animation play state (running/paused). */
  handleFilterPlayStateChange(isPlaying) {
    this._updateCanvasStyleAndPublish('animationPlayState', isPlaying ? 'running' : 'paused', 
      isPlaying ? EVENTS.FILTER_PLAYING : EVENTS.FILTER_STOPPED, 
      'isPlaying', isPlaying);
  }

  /** Applies a filter for a specified duration then removes it. */
  applyFilterWithDurationRange(filterKey, startTimeMs, durationMs, timerId = `timed-${Date.now()}`) {
    // startTimeMs: delay before applying. durationMs: how long it stays applied.
    if (!this.canvasElement || !this.isFilterSupported(filterKey)) {
      this.errorLogger.logWarning({ message: this.localizationService.translate('VideoFilterApplier.CannotApplyDurationFilter'), origin: 'VideoFilterApplier.applyFilterWithDurationRange'});
      return;
    }
    if (durationMs <= 0) {
      this.errorLogger.logWarning({ message: 'Duration for timed filter must be positive.', origin: 'VideoFilterApplier.applyFilterWithDurationRange'});
      return;
    }

    this.clearFilterWithDuration(timerId); // Clear any existing timer with this ID

    const filterConfig = SUPPORTED_VIDEO_FILTERS[filterKey];

    const startTimeout = setTimeout(() => {
      if (!this.canvasElement) { // Element might have been cleaned up
          this._removeDurationTimer(timerId); return;
      }
      // Check if the intended filter for this timer is still desired.
      // This simple version just applies it. More complex logic could check global state.
      this.canvasElement.style.filter = filterConfig.value || 'none';
      
      const endTimeout = setTimeout(() => {
        if (this.canvasElement && this.canvasElement.style.filter === filterConfig.value) {
          // Only remove if this specific filter is still active.
          // This avoids clearing a filter manually set by the user in the meantime.
          this.canvasElement.style.filter = DEFAULT_FILTER_KEY === 'none' ? 'none' : SUPPORTED_VIDEO_FILTERS[DEFAULT_FILTER_KEY].value;
        }
        this._removeDurationTimer(timerId);
      }, durationMs);

      // Update timer object with endTimeout ID
      const timerObj = this._durationTimers.find(t => t.id === timerId);
      if (timerObj) timerObj.durationEndTimeout = endTimeout;

    }, startTimeMs);

    this._durationTimers.push({ id: timerId, startTimeTimeout: startTimeout, durationEndTimeout: null });
  }
  
  _removeDurationTimer(timerId){
     this._durationTimers = this._durationTimers.filter(t => t.id !== timerId);
  }

  /** Clears a specific timed filter. */
  clearFilterWithDuration(timerId) {
    const timerIndex = this._durationTimers.findIndex(t => t.id === timerId);
    if (timerIndex > -1) {
      const timerObj = this._durationTimers[timerIndex];
      clearTimeout(timerObj.startTimeTimeout);
      if (timerObj.durationEndTimeout) clearTimeout(timerObj.durationEndTimeout);
      this._durationTimers.splice(timerIndex, 1);
    }
  }

  /** Example: Update filter animation progress (controlled via CSS custom property). */
  handleFilterProgressChange(progressPercent) { // 0-100
    const p = Math.max(0, Math.min(100, progressPercent));
    this._updateCanvasStyleAndPublish('--filter-progress', `${p}%`, EVENTS.FILTER_PROGRESS_CHANGED, 'progress', p);
  }

  /** Updates canvas transform scale. */
  handleFilterScaleChange(scale) {
    this._updateCanvasStyleAndPublish('transform', `scale(${scale})`, EVENTS.FILTER_SCALE_CHANGED, 'scale', scale);
  }

  /** Updates canvas transform rotation. */
  handleFilterRotationChange(degrees) {
    this._updateCanvasStyleAndPublish('transform', `rotate(${degrees}deg)`, EVENTS.FILTER_ROTATION_CHANGED, 'rotation', degrees);
  }
  
  /** Updates canvas mix-blend-mode. */
  handleFilterBlendModeChange(blendMode = 'normal') {
    this._updateCanvasStyleAndPublish('mixBlendMode', blendMode, EVENTS.FILTER_BLEND_MODE_CHANGED, 'blendMode', blendMode);
  }

  /** Updates a CSS animation property on the canvas. */
  _setAnimationProperty(property, value, eventName, eventPayloadKey) {
     this._updateCanvasStyleAndPublish(property, value, eventName, eventPayloadKey, value);
  }

  handleFilterAnimationIterationCountChange(count) {
    this._setAnimationProperty('animationIterationCount', count, EVENTS.FILTER_ITERATION_COUNT_CHANGED, 'iterationCount');
  }
  handleFilterAnimationDirectionChange(direction) {
    this._setAnimationProperty('animationDirection', direction, EVENTS.FILTER_DIRECTION_CHANGED, 'direction');
  }
  handleFilterAnimationDurationChange(durationMs) {
    this._setAnimationProperty('animationDuration', `${durationMs}ms`, EVENTS.FILTER_DURATION_CHANGED, 'duration');
  }
  handleFilterAnimationDelayChange(delayMs) {
    this._setAnimationProperty('animationDelay', `${delayMs}ms`, EVENTS.FILTER_DELAY_CHANGED, 'delay');
  }
  handleFilterAnimationTimingFunctionChange(timingFunction = 'linear') { // Also known as Easing
    this._setAnimationProperty('animationTimingFunction', timingFunction, EVENTS.FILTER_EASING_CHANGED, 'easing');
  }

  /**
   * Handles a "seek" request on the timeline.
   * This is complex. Interpretation: If an animation is playing, adjust its perceived start.
   * A common way is `animation-delay: -seekTimeInSeconds` + re-trigger.
   * For this version, it might re-evaluate active timed filters or re-apply current filter to reset any animation.
   */
  handleFilterSeek(payload) { // payload might contain { time: number }
    const time = payload && typeof payload.time === 'number' ? payload.time : 0;
    this.errorLogger.logInfo({ 
      message: this.localizationService.translate('VideoFilterApplier.FilterSeekRequested', { time: time }), 
      origin: 'VideoFilterApplier.handleFilterSeek'
    });
    
    // 1. Re-evaluate timed filters: Iterate `_durationTimers` config and re-apply or clear based on `time`. (Complex)
    // 2. Reset current filter's animation:
    const currentFilterKey = this.stateStore.getState()?.currentProject?.videoComposition?.videoFilter;
    if (currentFilterKey && currentFilterKey !== DEFAULT_FILTER_KEY) {
        const animState = this.getCurrentState();
        if(animState.isAnimated) {
            // Crude way to restart:
            if(this.canvasElement){
                const currentAnimationName = this.canvasElement.style.animationName;
                this.canvasElement.style.animationName = 'none';
                // Force reflow
                void this.canvasElement.offsetWidth;
                this.canvasElement.style.animationName = currentAnimationName || ''; // Reset to what it was, or let CSS rule re-apply
                this.canvasElement.style.animationDelay = `-${time / 1000}s`; // If animation timeline aligns with main timeline
                this.handleFilterPlayStateChange(true); // Ensure it's running
            }
        }
    }
  }

  /**
   * Adds a custom filter definition.
   * @param {string} filterKey - Unique key for the custom filter.
   * @param {FilterConfig} filterConfig - Configuration object for the filter.
   * @param {boolean} [publishEvent=true] - Whether to publish CUSTOM_FILTER_ADDED event.
   */
  addCustomFilter(filterKey, filterConfig, publishEvent = true) {
    if (!filterKey || !filterConfig || !filterConfig.name || !filterConfig.value) {
      this.errorLogger.logWarning({ message: this.localizationService.translate('VideoFilterApplier.InvalidCustomFilterConfig'), origin: 'VideoFilterApplier.addCustomFilter'});
      return;
    }
    if (SUPPORTED_VIDEO_FILTERS.hasOwnProperty(filterKey)) {
      this.errorLogger.logWarning({ message: this.localizationService.translate('VideoFilterApplier.CustomFilterKeyExists', {key: filterKey}), origin: 'VideoFilterApplier.addCustomFilter'});
      // Optionally update it: return this.updateCustomFilter(filterKey, filterConfig, publishEvent);
      return;
    }
    
    SUPPORTED_VIDEO_FILTERS[filterKey] = {
        type: 'custom', intensity: 1, ...filterConfig
    };
    
    this.populateFilterSelect(); // Update UI
    if (publishEvent) {
        this.eventAggregator.publish(EVENTS.CUSTOM_FILTER_ADDED, { filterKey, filterConfig, timestamp: Date.now() });
    }
    this.errorLogger.logInfo({ message: `Custom filter "${filterKey}" added.`, origin: 'VideoFilterApplier.addCustomFilter'});
  }

  /** Removes a custom filter definition. */
  removeCustomFilter(filterKey, publishEvent = true) {
    if (!this.isFilterSupported(filterKey) || filterKey === DEFAULT_FILTER_KEY) {
      this.errorLogger.logWarning({ message: this.localizationService.translate('VideoFilterApplier.FilterNotFoundForRemoval', { key: filterKey }), origin: 'VideoFilterApplier.removeCustomFilter' });
      return;
    }
    
    const currentActiveFilter = this.stateStore.getState()?.currentProject?.videoComposition?.videoFilter;
    if (currentActiveFilter === filterKey) {
      this.applyFilter(DEFAULT_FILTER_KEY); // Fallback to default if active one is removed
    }
    
    delete SUPPORTED_VIDEO_FILTERS[filterKey];
    this.populateFilterSelect(); // Update UI
    
    if (publishEvent) {
        this.eventAggregator.publish(EVENTS.CUSTOM_FILTER_REMOVED, { filterKey, timestamp: Date.now() });
    }
    this.errorLogger.logInfo({ message: `Custom filter "${filterKey}" removed.`, origin: 'VideoFilterApplier.removeCustomFilter'});
  }

  /** Updates an existing custom filter definition. */
  updateCustomFilter(filterKey, newConfig, publishEvent = true) {
    if (!this.isFilterSupported(filterKey)) {
      this.errorLogger.logWarning({ message: this.localizationService.translate('VideoFilterApplier.FilterNotFoundForUpdate', { key: filterKey }), origin: 'VideoFilterApplier.updateCustomFilter'});
      // Optionally add it: return this.addCustomFilter(filterKey, newConfig, publishEvent);
      return;
    }
     if (!newConfig || !newConfig.name || !newConfig.value) { // Basic validation for new config
      this.errorLogger.logWarning({ message: this.localizationService.translate('VideoFilterApplier.InvalidUpdateCustomFilterConfig', {key: filterKey}), origin: 'VideoFilterApplier.updateCustomFilter'});
      return;
    }

    SUPPORTED_VIDEO_FILTERS[filterKey] = {
      ...SUPPORTED_VIDEO_FILTERS[filterKey], // Preserve old properties not in newConfig
      ...newConfig
    };
    
    this.populateFilterSelect(); // Update UI names

    const currentActiveFilter = this.stateStore.getState()?.currentProject?.videoComposition?.videoFilter;
    if (currentActiveFilter === filterKey) {
      this.applyFilter(filterKey); // Re-apply if the active filter is updated
    }
    
    if (publishEvent) {
        this.eventAggregator.publish(EVENTS.CUSTOM_FILTER_UPDATED, { filterKey, newConfig, timestamp: Date.now() });
    }
    this.errorLogger.logInfo({ message: `Custom filter "${filterKey}" updated.`, origin: 'VideoFilterApplier.updateCustomFilter'});
  }

  /**
   * Updates the intensity of a filter.
   * NOTE: This is a complex operation depending on filter value format.
   * This simplified version assumes `filterConfig.baseValue` and `filterConfig.baseUnit` are defined.
   * @param {string} filterKey - Key of the filter.
   * @param {number} intensityValue - New intensity (0-1).
   */
  updateFilterIntensity(filterKey, intensityValue) { // intensity 0-1
    const normalizedIntensity = Math.max(0, Math.min(1, intensityValue));
    if (!this.isFilterSupported(filterKey)) {
      this.errorLogger.logWarning({ message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey', {key: filterKey}), origin: 'VideoFilterApplier.updateFilterIntensity'});
      return;
    }
    
    const filterConfig = SUPPORTED_VIDEO_FILTERS[filterKey];
    if (!filterConfig.baseValue || !filterConfig.baseUnit) {
      this.errorLogger.logInfo({ message: `Filter ${filterKey} not configured for intensity adjustment (missing baseValue/baseUnit). Original value used.`, origin: 'VideoFilterApplier.updateFilterIntensity'});
      return; // Or apply filter if intensity > 0, none if intensity == 0
    }

    const newCssNumericValue = filterConfig.baseValue * normalizedIntensity;
    // Regex to replace the first numeric part inside parentheses. E.g., grayscale(100%) to grayscale(50%)
    // This regex is basic and might need to be more robust for complex filter values.
    const newCssFilterValue = filterConfig.value.replace(/(\([^\d]*)[\d\.]+/i, `$1${newCssNumericValue}`);

    // Create a temporary config with the new value for application if active
    const tempConfigForApplication = { ...filterConfig, value: newCssFilterValue, currentIntensity: normalizedIntensity };
     
    // If this filter is currently active, apply the change visually
    const appState = this.stateStore.getState();
    if (appState?.currentProject?.videoComposition?.videoFilter === filterKey) {
        if (this.canvasElement) {
            this.canvasElement.style.filter = tempConfigForApplication.value;
        }
    }
    // IMPORTANT: This does NOT permanently update SUPPORTED_VIDEO_FILTERS[filterKey].value
    // To make intensity persistent, it should be stored in stateStore and SUPPORTED_VIDEO_FILTERS
    // should either store templates or applyFilter should combine base value + state.intensity.
    // For this final version, it's a visual-only temporary application if active.
    // To make it persistent, one might:
    // this.updateCustomFilter(filterKey, { ...filterConfig, value: newCssFilterValue, intensity: normalizedIntensity });
    // This will re-populate, re-apply, and publish an update event.

    this.eventAggregator.publish(EVENTS.FILTER_INTENSITY_CHANGED, { 
        filterKey, 
        intensity: normalizedIntensity,
        appliedValue: newCssFilterValue, // The CSS value corresponding to this intensity
        timestamp: Date.now() 
    });
  }
  
  /**
   * Updates the overall opacity of the canvas element.
   * This is NOT filter-specific opacity but the entire element's opacity.
   * @param {number} opacityValue - New opacity (0-1).
   */
  updateCanvasOpacity(opacityValue) { // opacity 0-1
    const normalizedOpacity = Math.max(0, Math.min(1, opacityValue));
    if (!this.canvasElement) return;

    this.canvasElement.style.opacity = String(normalizedOpacity);
    // The original method included filterKey, which is not relevant for canvas opacity.
    this.eventAggregator.publish(EVENTS.CANVAS_OPACITY_CHANGED, { /* Consider renaming event from FILTER_OPACITY_CHANGED */
        opacity: normalizedOpacity,
        timestamp: Date.now()
    });
  }
}
