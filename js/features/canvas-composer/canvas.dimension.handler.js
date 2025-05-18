// js/features/canvas-composer/canvas.dimension.handler.js

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, DEFAULT_PROJECT_SCHEMA, EVENTS } from '../../config/app.constants.js';

// Define supported aspect ratios and their corresponding friendly names for the UI
// These could also come from app.constants.js if used elsewhere
export const SUPPORTED_ASPECT_RATIOS = {
  '16:9': { name: '16:9 (أفقي قياسي)', value: 16 / 9 },
  '9:16': { name: '9:16 (عمودي للجوال)', value: 9 / 16 },
  '1:1': { name: '1:1 (مربع)', value: 1 / 1 },
  '4:3': { name: '4:3 (كلاسيكي)', value: 4 / 3 },
  // You can add more ratios, e.g., '21:9' (Ultrawide)
};

const canvasDimensionHandler = (() => {
  let canvasElement = null;
  let previewContainerElement = null; // DOMElements.videoPreviewContainer
  let aspectRatioSelectElement = null; // DOMElements.aspectRatioSelect
  
  // Store internal reference to current calculated dimensions for quick access
  let currentCanvasDimensions = { width: 0, height: 0, aspectRatioString: DEFAULT_PROJECT_SCHEMA.videoComposition.aspectRatio };


  let dependencies = {
    stateStore: {
      getState: () => ({ currentProject: null }),
      dispatch: () => {},
      subscribe: () => (() => {})
    },
    errorLogger: console,
    eventAggregator: { publish: () => {} },
    // localizationService: { translate: key => key } // For aspect ratio names if needed
  };

  /**
   * Calculates the maximum dimensions for the canvas to fit within its parent container
   * while maintaining the specified aspect ratio.
   * @param {string} aspectRatioString - e.g., "16:9".
   * @param {HTMLElement} container - The parent container to fit within.
   * @param {number} [maxWidthConstraint] - Optional max width for the canvas itself (e.g., export resolution).
   * @param {number} [maxHeightConstraint] - Optional max height.
   * @returns {{width: number, height: number}} Calculated dimensions.
   */
  function _calculateFitDimensions(aspectRatioString, container, maxWidthConstraint, maxHeightConstraint) {
    if (!container || !SUPPORTED_ASPECT_RATIOS[aspectRatioString]) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
          message: 'Invalid container or aspect ratio for dimension calculation.',
          origin: 'CanvasDimensionHandler._calculateFitDimensions',
          context: { aspectRatioString, containerExists: !!container }
      });
      return { width: 320, height: 180 }; // Fallback small dimensions
    }

    const ratioValue = SUPPORTED_ASPECT_RATIOS[aspectRatioString].value;
    let containerWidth = container.clientWidth;
    let containerHeight = container.clientHeight;

    // Apply explicit constraints if provided
    if (maxWidthConstraint) containerWidth = Math.min(containerWidth, maxWidthConstraint);
    if (maxHeightConstraint) containerHeight = Math.min(containerHeight, maxHeightConstraint);

    let canvasWidth, canvasHeight;

    // Calculate width and height based on container dimensions and aspect ratio
    if (containerWidth / containerHeight > ratioValue) {
      // Container is wider than the aspect ratio (limited by height)
      canvasHeight = containerHeight;
      canvasWidth = canvasHeight * ratioValue;
    } else {
      // Container is taller than or equal to the aspect ratio (limited by width)
      canvasWidth = containerWidth;
      canvasHeight = canvasWidth / ratioValue;
    }
    
    // Ensure dimensions are integers for canvas rendering (optional, but good practice)
    canvasWidth = Math.floor(canvasWidth);
    canvasHeight = Math.floor(canvasHeight);

    return { width: canvasWidth, height: canvasHeight };
  }

  /**
   * Applies the calculated dimensions to the canvas element and its container.
   * Updates the internal `currentCanvasDimensions`.
   * @param {string} aspectRatioString - e.g., "16:9".
   */
  function resizeCanvas(aspectRatioString) {
    if (!canvasElement || !previewContainerElement || !SUPPORTED_ASPECT_RATIOS[aspectRatioString]) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
          message: 'Cannot resize canvas: missing elements or invalid aspect ratio.',
          origin: 'CanvasDimensionHandler.resizeCanvas',
          context: { aspectRatioString, canvasExists: !!canvasElement, containerExists: !!previewContainerElement }
      });
      return;
    }
    
    // Calculate dimensions to fit within the #video-preview-container
    // The #video-preview-container itself should have its aspect ratio set by CSS if you want a fixed preview box shape.
    // Here, we set the canvas to fit its direct parent which is DOMElements.videoPreviewContainer,
    // and DOMElements.videoPreviewContainer's aspect ratio should be set to aspectRatioString.
    
    // 1. Update the aspect-ratio of the preview container
    previewContainerElement.style.aspectRatio = aspectRatioString.replace(':', ' / ');


    // 2. Calculate canvas dimensions to fit the *preview card* or a max export resolution
    // For preview, it's best if the canvas scales to its container, and the container enforces the aspect ratio.
    // The canvas drawing resolution (canvas.width, canvas.height) should match export or a scaled version.
    // Let's assume a default export resolution to determine canvas internal size,
    // then CSS handles scaling of the previewContainerElement and canvas.

    const project = dependencies.stateStore.getState().currentProject;
    const exportResolution = project?.exportSettings?.resolution || DEFAULT_PROJECT_SCHEMA.exportSettings.resolution; // e.g., "1920x1080"
    const [exportWidth, exportHeight] = exportResolution.split('x').map(Number);

    // The canvas internal resolution should match the export resolution for clarity,
    // OR a fixed preview resolution that scales well.
    // Let's use export resolution for canvas.width/height.
    // CSS on `canvas` (`width: 100%; height: 100%; object-fit: contain;`) will scale it within its parent.
    // The key is that the parent (`previewContainerElement`) HAS the correct aspect ratio.

    // For the actual canvas.width and .height, we should use dimensions that match the target export aspect ratio.
    // Let the CSS handle the display scaling of the canvas within its preview container.
    // So, if aspectRatioString changes, we update canvas.width/height based on a target resolution,
    // maintaining that ratio.

    // Example: target a base width like 1280, or use exportWidth.
    const baseWidthForCanvasResolution = exportWidth || 1280;
    const ratioValue = SUPPORTED_ASPECT_RATIOS[aspectRatioString].value;
    
    let newCanvasWidth, newCanvasHeight;
    // Determine canvas resolution based on selected aspect ratio and a base dimension
    // (e.g., trying to maintain export width if possible, or height if aspect ratio demands it)
    if (ratioValue >= 1) { // Landscape or square
        newCanvasWidth = baseWidthForCanvasResolution;
        newCanvasHeight = Math.round(baseWidthForCanvasResolution / ratioValue);
    } else { // Portrait
        // For portrait, let's aim for a common height if baseWidth results in too much height.
        // Or simply scale from baseWidth.
        // Let's scale from a target height like exportHeight if portrait, for simplicity for now.
        // A more robust way: determine which dimension of export (width/height) is "dominant" for the aspect ratio.
        const baseHeightForCanvasResolution = exportHeight || (baseWidthForCanvasResolution / (16/9)) * (16/9); // Make this sensible.
        newCanvasHeight = baseHeightForCanvasResolution;
        newCanvasWidth = Math.round(newCanvasHeight * ratioValue);
        // Ensure it does not exceed max-width constraints of typical screens for performance
        if (newCanvasWidth > baseWidthForCanvasResolution * 1.5 && baseWidthForCanvasResolution < 1920) { // arbitrary constraint
            newCanvasWidth = baseWidthForCanvasResolution *1.5;
            newCanvasHeight = Math.round(newCanvasWidth / ratioValue);
        }
    }


    if (canvasElement.width !== newCanvasWidth || canvasElement.height !== newCanvasHeight) {
        canvasElement.width = newCanvasWidth;
        canvasElement.height = newCanvasHeight;
        // console.debug(`[CanvasDimensionHandler] Canvas internal resolution set to: ${newCanvasWidth}x${newCanvasHeight} for ratio ${aspectRatioString}`);
    }

    currentCanvasDimensions = {
      width: newCanvasWidth,
      height: newCanvasHeight,
      aspectRatioString: aspectRatioString,
    };

    dependencies.eventAggregator.publish(EVENTS.CANVAS_RESIZED, { ...currentCanvasDimensions }); // Define this EVENT
    // Trigger a re-render (e.g., by publishing an event that main-renderer listens to)
    dependencies.eventAggregator.publish(EVENTS.REQUEST_CANVAS_RENDER, { reason: 'dimensionChange' }); // Define this EVENT
  }


  /**
   * Handles changes from the aspect ratio select dropdown.
   * Dispatches an action to update the state store.
   * @private
   */
  function _handleAspectRatioChange() {
    if (aspectRatioSelectElement) {
      const newAspectRatio = aspectRatioSelectElement.value;
      if (SUPPORTED_ASPECT_RATIOS[newAspectRatio]) {
        // console.debug(`[CanvasDimensionHandler] Aspect ratio selected: ${newAspectRatio}`);
        dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
          videoComposition: {
            aspectRatio: newAspectRatio
          }
        });
        // The stateStore subscription will trigger resizeCanvas
      } else {
        (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
            message: `Invalid aspect ratio selected: ${newAspectRatio}`,
            origin: 'CanvasDimensionHandler._handleAspectRatioChange'
        });
      }
    }
  }

  /**
   * Populates the aspect ratio select dropdown with available options.
   * @private
   */
  function _populateAspectRatioSelect() {
    if (aspectRatioSelectElement) {
        // DynamicSelectBuilder would be ideal here.
        // For simplicity now:
        Object.keys(SUPPORTED_ASPECT_RATIOS).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = SUPPORTED_ASPECT_RATIOS[key].name; // Needs localization if using this text
            aspectRatioSelectElement.appendChild(option);
        });
    }
  }
  
  /**
   * Sets the value of the aspect ratio select dropdown.
   * @private
   */
  function _updateAspectRatioSelectUI(aspectRatioString) {
      if (aspectRatioSelectElement && aspectRatioSelectElement.value !== aspectRatioString) {
          if (SUPPORTED_ASPECT_RATIOS[aspectRatioString]) {
              aspectRatioSelectElement.value = aspectRatioString;
          }
      }
  }

  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    // if (injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService;
  }


  return {
    _setDependencies,
    resizeCanvas, // May need to be exposed for initial setup or manual calls
    // getCurrentDimensions: () => ({ ...currentCanvasDimensions }), // Expose if needed
  };
})();


/**
 * Initialization function for the CanvasDimensionHandler.
 * @param {object} deps
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../core/event-aggregator.js').default} deps.eventAggregator
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * // @param {import('../../core/localization.service.js').default} [deps.localizationService]
 */
export function initializeCanvasDimensionHandler(deps) {
  canvasDimensionHandler._setDependencies(deps);
  const { stateStore, errorLogger, eventAggregator } = deps;

  canvasDimensionHandler.canvasRef = DOMElements.videoPreviewCanvas;
  canvasDimensionHandler.previewContainerRef = DOMElements.videoPreviewContainer;
  canvasDimensionHandler.aspectRatioSelectRef = DOMElements.aspectRatioSelect;

  if (!canvasDimensionHandler.canvasRef || !canvasDimensionHandler.previewContainerRef || !canvasDimensionHandler.aspectRatioSelectRef) {
    (errorLogger.logWarning || console.warn).call(errorLogger, {
        message: 'One or more crucial DOM elements for canvas dimensions (canvas, preview container, aspect ratio select) not found. Functionality will be impaired.',
        origin: 'initializeCanvasDimensionHandler'
    });
    return { cleanup: () => {} };
  }

  // Use local references for handlers for clarity on `this` context
  const populateSelect = () => { // Renamed from _populateAspectRatioSelect
    const selectEl = canvasDimensionHandler.aspectRatioSelectRef;
    if (selectEl) {
        // Clear existing options first (important if re-initializing)
        while (selectEl.options.length > 0) { selectEl.remove(0); }

        Object.keys(SUPPORTED_ASPECT_RATIOS).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = SUPPORTED_ASPECT_RATIOS[key].name;
            selectEl.appendChild(option);
        });
    }
  };
  populateSelect();

  const handleAspectRatioInputChange = () => {
    const selectEl = canvasDimensionHandler.aspectRatioSelectRef;
    if (selectEl) {
        const newAspectRatio = selectEl.value;
        if (SUPPORTED_ASPECT_RATIOS[newAspectRatio]) {
            stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
                videoComposition: { aspectRatio: newAspectRatio }
            });
        }
    }
  };
  canvasDimensionHandler.aspectRatioSelectRef.addEventListener('change', handleAspectRatioInputChange);

  const updateUIFromState = (projectState) => {
      const currentAspectRatio = projectState?.videoComposition?.aspectRatio || DEFAULT_PROJECT_SCHEMA.videoComposition.aspectRatio;
      
      // Update select element
      const selectEl = canvasDimensionHandler.aspectRatioSelectRef;
      if (selectEl && selectEl.value !== currentAspectRatio && SUPPORTED_ASPECT_RATIOS[currentAspectRatio]) {
          selectEl.value = currentAspectRatio;
      }
      
      // Resize canvas (this method needs access to dependencies.stateStore to get export res)
      // Pass dependencies to resizeCanvas or ensure it has access.
      // For now, resizeCanvas is on canvasDimensionHandler object, so needs to access `dependencies`
      // set via _setDependencies.
      canvasDimensionHandler.resizeCanvas(currentAspectRatio);
  };


  const unsubscribeState = stateStore.subscribe((newState) => {
    // Check if the aspect ratio specifically changed to avoid unnecessary resize calls
    // This needs the old state or a more specific subscription if stateStore supports it.
    // For now, re-evaluate on any project change.
    updateUIFromState(newState.currentProject);
  });
  
  // Initial setup based on current (or default) state
  updateUIFromState(stateStore.getState().currentProject);


  // console.info('[CanvasDimensionHandler] Initialized.');
  return {
    cleanup: () => {
      unsubscribeState();
      if (canvasDimensionHandler.aspectRatioSelectRef) {
        canvasDimensionHandler.aspectRatioSelectRef.removeEventListener('change', handleAspectRatioInputChange);
      }
      // console.info('[CanvasDimensionHandler] Cleaned up.');
    },
    // Expose resize if external manual trigger is ever needed
    // resizeCanvas: (ratioStr) => canvasDimensionHandler.resizeCanvas(ratioStr),
    getCurrentDimensions: () => ({ ...(canvasDimensionHandler._internalDimensions || { width: 0, height: 0 }) }) // Expose cached internal dimensions
  };
}
// Store dimensions internally on the object for getCurrentDimensions if needed
canvasDimensionHandler._internalDimensions = { width:0, height:0 };
// Modify resizeCanvas to update this:
canvasDimensionHandler.resizeCanvas = function(aspectRatioString) { // `this` refers to canvasDimensionHandler
    // ... (logic of _calculateFitDimensions and setting canvas.width/height as before)
    // Assume DOMElements is accessible, and dependencies are set
    const canvasEl = DOMElements.videoPreviewCanvas;
    const previewContEl = DOMElements.videoPreviewContainer;
    
    if (!canvasEl || !previewContEl || !SUPPORTED_ASPECT_RATIOS[aspectRatioString]) return;
    
    previewContEl.style.aspectRatio = aspectRatioString.replace(':', ' / ');

    const project = this._dependencies.stateStore.getState().currentProject; // Access via _dependencies
    const exportResolution = project?.exportSettings?.resolution || DEFAULT_PROJECT_SCHEMA.exportSettings.resolution;
    const [exportWidth] = exportResolution.split('x').map(Number);
    const baseWidth = exportWidth || 1280;
    const ratioValue = SUPPORTED_ASPECT_RATIOS[aspectRatioString].value;
    
    let newCanvasWidth, newCanvasHeight;
    if (ratioValue >= 1) {
        newCanvasWidth = baseWidth;
        newCanvasHeight = Math.round(baseWidth / ratioValue);
    } else {
        // For portrait, maintain aspect ratio based on height matching landscape's width (simplified logic)
        // or match export height. Let's simplify: use a base height similar to typical landscape width.
        // newCanvasHeight = baseWidth; // This makes portrait very tall
        // This should align with typical export settings logic better.
        const exportParts = exportResolution.split('x').map(Number);
        const targetHeight = (ratioValue < 1 && exportParts.length === 2) ? exportParts[1] : Math.round(baseWidth / (16/9)); // simplified default logic for base height.
        newCanvasHeight = targetHeight;
        newCanvasWidth = Math.round(newCanvasHeight * ratioValue);
    }
    
    if (canvasEl.width !== newCanvasWidth || canvasEl.height !== newCanvasHeight) {
        canvasEl.width = newCanvasWidth;
        canvasEl.height = newCanvasHeight;
    }

    this._internalDimensions = { width: newCanvasWidth, height: newCanvasHeight, aspectRatioString };
    this._dependencies.eventAggregator.publish(EVENTS.CANVAS_RESIZED, { ...this._internalDimensions });
    this._dependencies.eventAggregator.publish(EVENTS.REQUEST_CANVAS_RENDER, { reason: 'dimensionChange' });
};



export default canvasDimensionHandler; // Export main object
