// js/features/canvas-composer/video-filter.applier.js

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js'; // For state updates & defaults
// import dynamicSelectBuilder from '../../shared-ui-components/dynamic-select.builder.js'; // If using it to populate select

// Define supported video filters and their CSS filter values
// This could also be part of app.constants.js or a dedicated config file
export const SUPPORTED_VIDEO_FILTERS = {
  none: { name: 'بدون فلتر', value: 'none' },
  grayscale: { name: 'رمادي', value: 'grayscale(100%)' },
  sepia: { name: 'بني داكن (سيبيا)', value: 'sepia(100%)' },
  brightness_high: { name: 'سطوع عالي', value: 'brightness(1.5)' },
  brightness_low: { name: 'سطوع منخفض', value: 'brightness(0.7)' },
  contrast_high: { name: 'تباين عالي', value: 'contrast(1.8)' },
  contrast_low: { name: 'تباين منخفض', value: 'contrast(0.6)' },
  blur: { name: 'ضبابي (خفيف)', value: 'blur(2px)' }, // Use sparingly, can be slow
  invert: { name: 'عكس الألوان', value: 'invert(100%)' },
  saturate_high: { name: 'تشبع لوني عالي', value: 'saturate(2)' },
  saturate_low: { name: 'تشبع لوني منخفض', value: 'saturate(0.3)' },
  hue_rotate_90: { name: 'تدوير الصبغة (90°)', value: 'hue-rotate(90deg)' },
  // Add more complex or combined filters as needed
  // 'old_film': { name: 'فيلم قديم', value: 'sepia(0.7) contrast(1.2) brightness(0.9) saturate(0.8)'},
};


const videoFilterApplier = (() => {
  let canvasElement = null; // DOMElements.videoPreviewCanvas
  let filterSelectElement = null; // DOMElements.videoFilterSelect

  let dependencies = {
    stateStore: {
      getState: () => ({ currentProject: null }),
      dispatch: () => {},
      subscribe: () => (() => {})
    },
    errorLogger: console,
    // localizationService: { translate: key => key } // For filter names
  };

  /**
   * Applies the specified CSS filter string to the canvas element.
   * @private
   * @param {string} filterValue - The CSS filter string (e.g., "grayscale(100%)", "none").
   */
  function _applyFilterToCanvas(filterValue) {
    if (canvasElement) {
      canvasElement.style.filter = filterValue || 'none';
      // console.debug(`[VideoFilterApplier] Applied filter: ${filterValue}`);
    }
  }

  /**
   * Handles changes from the video filter select dropdown.
   * Dispatches an action to update the state store.
   * @private
   */
  function _handleFilterSelectionChange() {
    if (filterSelectElement) {
      const selectedFilterKey = filterSelectElement.value;
      const filterConfig = SUPPORTED_VIDEO_FILTERS[selectedFilterKey];

      if (filterConfig) {
        // console.debug(`[VideoFilterApplier] Filter selected: ${selectedFilterKey}`);
        dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
          videoComposition: {
            videoFilter: selectedFilterKey // Store the key in state, not the full CSS value
          }
        });
        // The stateStore subscription will trigger the actual application of the filter.
      } else {
        (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
            message: `Invalid video filter key selected: ${selectedFilterKey}`,
            origin: 'VideoFilterApplier._handleFilterSelectionChange'
        });
      }
    }
  }

  /**
   * Populates the video filter select dropdown with available options.
   * @private
   */
  function _populateFilterSelect() {
    if (filterSelectElement) {
        // Clear existing options before populating
        while (filterSelectElement.options.length > 0) {
            filterSelectElement.remove(0);
        }

        Object.keys(SUPPORTED_VIDEO_FILTERS).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            // Assuming localizationService is injected for filter names
            // option.textContent = dependencies.localizationService?.translate(`filter.${key}.name`) || SUPPORTED_VIDEO_FILTERS[key].name;
            option.textContent = SUPPORTED_VIDEO_FILTERS[key].name; // Use direct name for now
            filterSelectElement.appendChild(option);
        });
    }
  }
  
  /**
   * Updates the video filter select UI based on state.
   * @private
   * @param {string} filterKey - The key of the filter (e.g., 'grayscale').
   */
  function _updateFilterSelectUI(filterKey) {
      if (filterSelectElement && filterSelectElement.value !== filterKey) {
          if (SUPPORTED_VIDEO_FILTERS[filterKey]) {
              filterSelectElement.value = filterKey;
          } else { // Fallback if state has an invalid filter key
              filterSelectElement.value = 'none';
          }
      }
  }

  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    // if (injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService;
  }

  // Public API (not much needed publicly usually for a UI controller like this)
  return {
    _setDependencies,
    // applyFilter: (filterKey) => { /* Manual application if needed */ }
  };

})(); // IIFE Removed


/**
 * Initialization function for the VideoFilterApplier.
 * @param {object} deps
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * // @param {import('../../core/localization.service.js').default} [deps.localizationService]
 */
export function initializeVideoFilterApplier(deps) {
  videoFilterApplier._setDependencies(deps);
  const { stateStore, errorLogger } = deps;

  videoFilterApplier.canvasRef = DOMElements.videoPreviewCanvas; // Cache DOM ref
  videoFilterApplier.filterSelectRef = DOMElements.videoFilterSelect;

  if (!videoFilterApplier.canvasRef || !videoFilterApplier.filterSelectRef) {
    (errorLogger.logWarning || console.warn).call(errorLogger, {
        message: 'Canvas element or filter select element not found. Video filter functionality will be impaired.',
        origin: 'initializeVideoFilterApplier'
    });
    return { cleanup: () => {} };
  }

  // --- Internal functions moved/re-scoped for this init pattern ---
  const _applyFilterToCanvasDirect = (filterValue) => {
    if (videoFilterApplier.canvasRef) {
      videoFilterApplier.canvasRef.style.filter = filterValue || 'none';
    }
  };
  
  const _populateFilterSelectDirect = () => {
    const selectEl = videoFilterApplier.filterSelectRef;
    if (selectEl) {
      while (selectEl.options.length > 0) { selectEl.remove(0); }
      Object.keys(SUPPORTED_VIDEO_FILTERS).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = SUPPORTED_VIDEO_FILTERS[key].name;
        selectEl.appendChild(option);
      });
    }
  };
  _populateFilterSelectDirect(); // Populate on init

  const _updateFilterSelectUIDirect = (filterKey) => {
    const selectEl = videoFilterApplier.filterSelectRef;
    if (selectEl && selectEl.value !== filterKey) {
      if (SUPPORTED_VIDEO_FILTERS[filterKey]) {
        selectEl.value = filterKey;
      } else {
        selectEl.value = 'none';
      }
    }
  };

  const _handleFilterSelectionChangeDirect = () => {
    const selectEl = videoFilterApplier.filterSelectRef;
    if (selectEl) {
      const selectedFilterKey = selectEl.value;
      if (SUPPORTED_VIDEO_FILTERS[selectedFilterKey]) {
        stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
          videoComposition: { videoFilter: selectedFilterKey }
        });
      }
    }
  };
  videoFilterApplier.filterSelectRef.addEventListener('change', _handleFilterSelectionChangeDirect);


  // Subscribe to state changes
  const unsubscribeState = stateStore.subscribe((newState) => {
    const project = newState.currentProject;
    let activeFilterKey = DEFAULT_PROJECT_SCHEMA.videoComposition.videoFilter; // Default
    let filterValueToApply = 'none';

    if (project && project.videoComposition && project.videoComposition.videoFilter) {
      activeFilterKey = project.videoComposition.videoFilter;
    }
    
    if (SUPPORTED_VIDEO_FILTERS[activeFilterKey]) {
      filterValueToApply = SUPPORTED_VIDEO_FILTERS[activeFilterKey].value;
    } else {
      // Fallback if stored filter key is somehow invalid
      activeFilterKey = 'none'; // Correct the key to 'none'
      filterValueToApply = SUPPORTED_VIDEO_FILTERS.none.value;
      (errorLogger.logWarning || console.warn).call(errorLogger, {
          message: `Invalid videoFilter key "${project?.videoComposition?.videoFilter}" found in state. Defaulting to 'none'.`,
          origin: 'VideoFilterApplier.stateSubscription'
      });
    }
    
    _applyFilterToCanvasDirect(filterValueToApply);
    _updateFilterSelectUIDirect(activeFilterKey); // Sync select dropdown
  });

  // Apply initial filter based on current state
  const initialProject = stateStore.getState().currentProject;
  const initialFilterKey = initialProject?.videoComposition?.videoFilter || DEFAULT_PROJECT_SCHEMA.videoComposition.videoFilter;
  _applyFilterToCanvasDirect(SUPPORTED_VIDEO_FILTERS[initialFilterKey]?.value || 'none');
  _updateFilterSelectUIDirect(initialFilterKey);


  // console.info('[VideoFilterApplier] Initialized.');
  return {
    cleanup: () => {
      unsubscribeState();
      if (videoFilterApplier.filterSelectRef) {
        videoFilterApplier.filterSelectRef.removeEventListener('change', _handleFilterSelectionChangeDirect);
      }
      // Reset filter on canvas if cleaning up module
      if (videoFilterApplier.canvasRef) {
        videoFilterApplier.canvasRef.style.filter = 'none';
      }
      // console.info('[VideoFilterApplier] Cleaned up.');
    }
    // Expose methods if other modules need to programmatically apply filters:
    // applyFilterByKey: (filterKey) => {
    //   if (SUPPORTED_VIDEO_FILTERS[filterKey]) {
    //      stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { videoComposition: { videoFilter: filterKey }});
    //   }
    // }
  };
}

export default videoFilterApplier; // Export base object
