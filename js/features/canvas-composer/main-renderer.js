// js/features/canvas-composer/main-renderer.js

import DOMElements from '../../core/dom-elements.js';
import { EVENTS, DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';
import resourceManager from '../../core/resource-manager.js'; // For loading background images
// import { applyTextEffect, clearTextEffect } from '../text-engine/text.rendering.logic.js'; // To be created
// import { getEffectiveTextStyle } from '../text-engine/text.state.adapter.js'; // To be created for text styles

const mainRenderer = (() => {
  let canvas = null;
  let ctx = null; // 2D rendering context
  let currentAnimationFrameId = null; // For animation loop if needed for text effects etc.

  let dependencies = {
    stateStore: { getState: () => ({ currentProject: null }), subscribe: () => (() => {}) },
    eventAggregator: { subscribe: () => ({ unsubscribe: () => {} }), publish: () => {} },
    errorLogger: console,
    // canvasDimensionsAPI: { getCurrentDimensions: () => ({ width: 360, height: 640, aspectRatioString: '9:16'}) }, // Fallback
    // textRenderingLogic: { apply: () => {}, clear: () => {} }, // Fallback
  };

  // To cache loaded background image/video elements
  let currentBackgroundImage = null;
  let currentBackgroundVideo = null;
  let lastBackgroundSource = null;

  /**
   * Initializes the canvas and its rendering context.
   * @private
   */
  function _initializeCanvas() {
    canvas = DOMElements.videoPreviewCanvas;
    if (!canvas) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        message: 'Main canvas element not found. Renderer cannot operate.',
        origin: 'MainRenderer._initializeCanvas',
        severity: 'error'
      });
      return false;
    }
    // Get 2D context, consider alpha for transparency with overlays
    ctx = canvas.getContext('2d', { alpha: true }); // alpha:true by default, can be false if bg is always opaque
    if (!ctx) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        message: 'Failed to get 2D rendering context for the main canvas.',
        origin: 'MainRenderer._initializeCanvas',
        severity: 'error'
      });
      return false;
    }
    return true;
  }


  /** Clears the entire canvas. @private */
  function _clearCanvas() {
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  /**
   * Draws the background (color, image, or video frame).
   * @private
   * @param {import('../../core/state-store.js').BackgroundState} backgroundState
   * @param {HTMLVideoElement} [videoElementForBg] - Optional video element if bg is video for live preview
   */
  async function _drawBackground(backgroundState, videoElementForBg) {
    if (!ctx || !canvas) return;

    const { type, source, fileName } = backgroundState;

    // If source changed, clear cached media elements
    if (lastBackgroundSource !== source) {
        currentBackgroundImage = null;
        if (currentBackgroundVideo) {
            // If it's an object URL, it should be revoked when a *new* video is *loaded*,
            // not necessarily just when the source string changes (e.g., if state is reloaded).
            // Revocation is handled by background-importer.ui.js for new uploads.
            currentBackgroundVideo = null; // Reset video element if source string changes
        }
        lastBackgroundSource = source;
    }

    _clearCanvas(); // Clear before drawing background

    switch (type) {
      case 'color':
        ctx.fillStyle = source || DEFAULT_PROJECT_SCHEMA.background.source;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        break;
      
      case 'image':
        if (!source) break;
        try {
          if (!currentBackgroundImage || currentBackgroundImage.src !== source) {
            // dependencies.stateStore?.dispatch(ACTIONS.SET_LOADING, true); // Consider scoped loading
            currentBackgroundImage = await resourceManager.loadImage(source, dependencies.errorLogger);
          }
          if (currentBackgroundImage && currentBackgroundImage.complete && currentBackgroundImage.naturalWidth > 0) {
            // Draw image, maintaining aspect ratio (fit/fill logic needed here)
            // Simple 'cover' behavior:
            const imgAspectRatio = currentBackgroundImage.naturalWidth / currentBackgroundImage.naturalHeight;
            const canvasAspectRatio = canvas.width / canvas.height;
            let sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight;

            if (imgAspectRatio > canvasAspectRatio) { // Image is wider than canvas: fit height, crop width
              sHeight = currentBackgroundImage.naturalHeight;
              sWidth = sHeight * canvasAspectRatio;
              sx = (currentBackgroundImage.naturalWidth - sWidth) / 2;
              sy = 0;
            } else { // Image is taller than or equal to canvas: fit width, crop height
              sWidth = currentBackgroundImage.naturalWidth;
              sHeight = sWidth / canvasAspectRatio;
              sx = 0;
              sy = (currentBackgroundImage.naturalHeight - sHeight) / 2;
            }
            dx = dy = 0;
            dWidth = canvas.width;
            dHeight = canvas.height;
            ctx.drawImage(currentBackgroundImage, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
          }
        } catch (error) {
          (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
            error, message: `Failed to load or draw background image: ${source}`,
            origin: 'MainRenderer._drawBackground.image'
          });
          // Fallback to default color
          ctx.fillStyle = DEFAULT_PROJECT_SCHEMA.background.source;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        } finally {
            // dependencies.stateStore?.dispatch(ACTIONS.SET_LOADING, false);
        }
        break;
      
      case 'video':
        // For live preview, videoElementForBg should be the <video> element playing the background.
        // For export, a mechanism to seek the video to the current frame time and draw it is needed.
        if (videoElementForBg && videoElementForBg.readyState >= videoElementForBg.HAVE_CURRENT_DATA) {
           // Similar 'cover' logic as for images
            const vidAspectRatio = videoElementForBg.videoWidth / videoElementForBg.videoHeight;
            const canvasAspectRatio = canvas.width / canvas.height;
            let sx, sy, sWidth, sHeight;

            if (vidAspectRatio > canvasAspectRatio) {
              sHeight = videoElementForBg.videoHeight;
              sWidth = sHeight * canvasAspectRatio;
              sx = (videoElementForBg.videoWidth - sWidth) / 2;
              sy = 0;
            } else {
              sWidth = videoElementForBg.videoWidth;
              sHeight = sWidth / canvasAspectRatio;
              sx = 0;
              sy = (videoElementForBg.videoHeight - sHeight) / 2;
            }
            ctx.drawImage(videoElementForBg, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
        } else if (source) { // If videoElement not provided or ready, attempt to show a placeholder or frame
            // This part is complex for seeking. For now, show solid color as fallback.
            (dependencies.errorLogger.logInfo || console.info).call(dependencies.errorLogger, {
                message: 'Background video element not ready or not provided for drawing. Showing fallback.',
                origin: 'MainRenderer._drawBackground.video',
                context: { source, readyState: videoElementForBg?.readyState }
            });
            ctx.fillStyle = DEFAULT_PROJECT_SCHEMA.background.source; // Fallback
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        break;
      
      default:
        ctx.fillStyle = DEFAULT_PROJECT_SCHEMA.background.source; // Fallback for unknown type
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  /**
   * Draws text (Ayah or Translation) on the canvas.
   * @private
   * @param {string} text - The text to draw.
   * @param {number} yPosition - The baseline Y position for the text.
   * @param {import('../../core/state-store.js').TextStyleState} textStyle - Font, size, color.
   * @param {boolean} isQuranText - True if drawing Quranic text (for font selection, RTL).
   * @param {string} [textEffectState] - Current state of text effect (e.g. partial text for typewriter)
   */
  function _drawText(text, yPosition, textStyle, isQuranText, textEffectState) {
    if (!ctx || !canvas || !text) return;

    const { fontFamily, fontSize, fontColor, textBgColor } = textStyle;
    
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = fontColor;
    ctx.textAlign = 'center'; // For simplicity, can be made configurable
    ctx.textBaseline = 'middle'; // Adjust as needed

    const textToDraw = textEffectState !== undefined ? textEffectState : text; // Use effect state if available

    // Basic text wrapping (needs improvement for better line breaking respecting words)
    const maxWidth = canvas.width * 0.9; // 90% of canvas width
    const lines = [];
    let currentLine = '';
    const words = textToDraw.split(/(?=\s+|[\u0600-\u06FF])/); // Split by space or start of Arabic char for better Arabic wrapping

    for (const word of words) {
        const testLine = currentLine + word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine !== '') {
            lines.push(currentLine.trim());
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine.trim());

    const lineHeight = fontSize * 1.2; // Approximate line height
    let currentY = yPosition - ((lines.length - 1) * lineHeight) / 2; // Center block vertically

    lines.forEach(line => {
      if (textBgColor && textBgColor !== 'transparent' && textBgColor !== 'rgba(0,0,0,0)') {
        const textMetrics = ctx.measureText(line);
        const textWidth = textMetrics.width;
        // Note: actualBoundingBoxAscent/Descent are more accurate but experimental
        const textHeight = fontSize; // Approximate height for background

        const bgX = (canvas.width - textWidth) / 2 - 10; // Center background, add padding
        const bgY = currentY - textHeight / 2 - 5;      // Adjust Y for textBaseline middle
        const bgWidth = textWidth + 20;
        const bgHeight = textHeight + 10;
        
        ctx.fillStyle = textBgColor;
        // Rounded rectangle for background (optional)
        const radius = 5;
        ctx.beginPath();
        ctx.moveTo(bgX + radius, bgY);
        ctx.lineTo(bgX + bgWidth - radius, bgY);
        ctx.quadraticCurveTo(bgX + bgWidth, bgY, bgX + bgWidth, bgY + radius);
        ctx.lineTo(bgX + bgWidth, bgY + bgHeight - radius);
        ctx.quadraticCurveTo(bgX + bgWidth, bgY + bgHeight, bgX + bgWidth - radius, bgY + bgHeight);
        ctx.lineTo(bgX + radius, bgY + bgHeight);
        ctx.quadraticCurveTo(bgX, bgY + bgHeight, bgX, bgY + bgHeight - radius);
        ctx.lineTo(bgX, bgY + radius);
        ctx.quadraticCurveTo(bgX, bgY, bgX + radius, bgY);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = fontColor; // Reset fillStyle for text
      }
      ctx.fillText(line, canvas.width / 2, currentY);
      currentY += lineHeight;
    });
  }
  
  // Placeholder for text effect logic application
  let currentTextEffect = { type: 'none', state: null, startTime: 0, duration: 1000, text: '' };
  
  function _updateTextEffectState(ayahText, textStyle) {
      // This would interact with text.rendering.logic.js
      // For now, simple direct application for typewriter example
      if (textStyle.textAnimation === 'typewriter' && currentTextEffect.type !== 'typewriter') {
          currentTextEffect = { type: 'typewriter', state: '', startTime: performance.now(), duration: (ayahText.length * 100), text: ayahText }; // 100ms per char
      } else if (textStyle.textAnimation !== 'typewriter') {
          currentTextEffect = { type: 'none', state: null, startTime: 0, duration: 0, text: ayahText};
      }

      if (currentTextEffect.type === 'typewriter') {
          const elapsed = performance.now() - currentTextEffect.startTime;
          const progress = Math.min(elapsed / currentTextEffect.duration, 1);
          const charsToShow = Math.floor(currentTextEffect.text.length * progress);
          currentTextEffect.state = currentTextEffect.text.substring(0, charsToShow);
      } else {
          currentTextEffect.state = currentTextEffect.text; // Or null if no effect, _drawText handles
      }
  }


  /**
   * The main rendering function. Called on state changes or animation frame.
   * This function reads the current state and draws everything.
   * @param {number} [timestamp] - Provided by requestAnimationFrame, for animations.
   */
  async function render(timestamp) {
    if (!ctx || !canvas) {
      // console.warn('[MainRenderer] Canvas or context not initialized, skipping render.');
      return;
    }
    if (canvas.width === 0 || canvas.height === 0) {
      // (dependencies.errorLogger.logWarning || console.warn)('Canvas dimensions are zero, skipping render.');
      return; // Avoid drawing on zero-sized canvas
    }

    const state = dependencies.stateStore.getState();
    const project = state.currentProject;

    if (!project) {
      // No project loaded, draw a default state (e.g., app logo or blank with instructions)
      _clearCanvas();
      ctx.fillStyle = DEFAULT_PROJECT_SCHEMA.background.source;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'white';
      ctx.font = '24px ' + DEFAULT_PROJECT_SCHEMA.textStyle.fontFamily; // Use UI font for messages
      ctx.textAlign = 'center';
      ctx.fillText(dependencies.localizationService?.translate('editor.noProjectLoadedMessage') || 'قم بإنشاء مشروع جديد أو تحميل مشروع موجود', canvas.width / 2, canvas.height / 2);
      return;
    }

    // 1. Get current Ayah and Translation text
    // This needs integration with how Ayah text is fetched/managed.
    // For now, using placeholders from overlays or state if it's there.
    // Ideal: Current Ayah object from `state.currentProject.quranSelection.currentDisplayingAyah`
    // which includes { text: '...', translationText: '...' }
    let ayahTextToDisplay = "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ"; // Placeholder
    let translationTextToDisplay = "All praise is for Allah, Lord of all worlds."; // Placeholder
    
    // If currentPlaylistItem available from a playback controller via state:
    // const currentPlaylistItem = state.mainPlaybackState?.currentPlaylistItem;
    // if (currentPlaylistItem) {
    //   ayahTextToDisplay = currentPlaylistItem.text || ayahTextToDisplay;
    //   translationTextToDisplay = currentPlaylistItem.translationText || translationTextToDisplay; // Assume translation is there
    // } else if (DOMElements.previewAyahTextOverlay) { // Fallback to overlay for preview when not playing
    //     ayahTextToDisplay = DOMElements.previewAyahTextOverlay.textContent || ayahTextToDisplay;
    //     if(DOMElements.previewTranslationTextOverlay) {
    //        translationTextToDisplay = DOMElements.previewTranslationTextOverlay.textContent || translationTextToDisplay;
    //     }
    // }
    
    // For a truly decoupled renderer, Ayah text should come from the state.
    // The state could be updated by quran.data.cache or quran.selection.ui when an Ayah is selected/active.


    // 2. Draw Background
    // For video background, we'd need a reference to the <video> element being used for the background.
    // This is complex as it might be different from the mainAudioPlayer or an image.
    // Let's assume background source implies how to handle it.
    // DOMElements.backgroundVideoPlayer could be a dedicated <video> for video backgrounds.
    await _drawBackground(project.background, DOMElements.backgroundVideoPlayer); // Pass the video element if bg is video

    // 3. Update and apply text effects
    // _updateTextEffectState(ayahTextToDisplay, project.textStyle);
    // The effect state (`currentTextEffect.state`) will be used by _drawText

    // 4. Draw Ayah Text
    // Position needs to be calculated based on aspect ratio, font size, and whether translation is shown.
    let ayahYPosition = canvas.height / 2; // Default center
    if (translationTextToDisplay && project.quranSelection.translationId) {
      ayahYPosition = canvas.height * 0.40; // Ayah text higher if translation shown
    }
    // Call the (to-be-created) text engine's draw method which handles effects
    // _drawText(ayahTextToDisplay, ayahYPosition, project.textStyle, true, currentTextEffect.state);
     _drawText(ayahTextToDisplay, ayahYPosition, project.textStyle, true);


    // 5. Draw Translation Text (if enabled and available)
    if (project.quranSelection.translationId && translationTextToDisplay) {
      let translationYPosition = canvas.height * 0.65; // Translation text lower
      // Create a separate text style for translation if needed, or use a modified one
      const translationStyle = {
        ...project.textStyle,
        fontFamily: DEFAULT_PROJECT_SCHEMA.textStyle.fontFamily, // Or specific translation font from project settings
        fontSize: Math.max(16, project.textStyle.fontSize * 0.5), // Smaller than Ayah text
        // fontColor: (use a slightly dimmer color than Ayah, or from settings)
        textAnimation: 'none', // Usually no complex animation for translation
      };
      // _updateTextEffectState(translationTextToDisplay, translationStyle); // For translation text
      // _drawText(translationTextToDisplay, translationYPosition, translationStyle, false, currentTextEffect.state_translation);
      _drawText(translationTextToDisplay, translationYPosition, translationStyle, false);
    }

    // 6. Apply Video Filter (handled by CSS on canvas element, set by video-filter.applier.js)
    // No direct drawing action here for CSS filters.
    // If implementing filters via canvas operations, draw here.

    // If text effects need continuous rendering:
    // if (currentTextEffect.type === 'typewriter' && currentTextEffect.state !== currentTextEffect.text) {
    //   currentAnimationFrameId = requestAnimationFrame(render);
    // } else if (currentTextEffect.type !== 'none' && needsContinuousUpdateForOtherEffects){
    //   currentAnimationFrameId = requestAnimationFrame(render);
    // }
    // else {
    //    cancelAnimationFrame(currentAnimationFrameId);
    //    currentAnimationFrameId = null;
    // }
    
    // Publish event that frame has been rendered (useful for export)
    dependencies.eventAggregator.publish(EVENTS.CANVAS_FRAME_RENDERED, { timestamp });
  }
  
  /** Handle state changes affecting the render. */
  function _onStateChange(newState, oldState) {
    // More granular checks needed:
    // - currentProject changed
    // - currentProject.background changed
    // - currentProject.quranSelection (current Ayah or its text) changed
    // - currentProject.textStyle changed
    // - currentProject.videoComposition.aspectRatio changed (this triggers CANVAS_RESIZED then REQUEST_CANVAS_RENDER)
    
    // Simple check for now: if project object identity changes, or specific parts we know.
    // A better way is to use selectors and compare specific parts of the state.
    if (newState.currentProject !== oldState?.currentProject ||
        (newState.currentProject && oldState?.currentProject && (
            newState.currentProject.background !== oldState.currentProject.background ||
            newState.currentProject.quranSelection !== oldState.currentProject.quranSelection || // This includes current Ayah pointer
            newState.currentProject.textStyle !== oldState.currentProject.textStyle
        )) ||
        newState.isLoading !== oldState?.isLoading // Re-render if loading state changes (e.g., to show message)
       ) {
      requestRender({ reason: 'stateChange' });
    }
  }

  /**
   * Request a re-render of the canvas.
   * Can be called from other modules via event or direct call if API is exposed.
   * @param {object} [data={reason: 'unknown'}] - Optional data about why render is requested.
   */
  function requestRender(data = { reason: 'unknown' }) {
    // console.debug(`[MainRenderer] Render requested. Reason: ${data.reason}`);
    if (currentAnimationFrameId) {
      cancelAnimationFrame(currentAnimationFrameId); // Cancel previous frame if any
    }
    // Using requestAnimationFrame ensures rendering happens smoothly with browser's refresh rate.
    // It passes a timestamp to the render function, useful for time-based animations.
    currentAnimationFrameId = requestAnimationFrame(render);
  }
  
  function _setDependencies(injectedDeps) {
    if(injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if(injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    if(injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if(injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService; // Add localization
    // if(injectedDeps.canvasDimensionsAPI) dependencies.canvasDimensionsAPI = injectedDeps.canvasDimensionsAPI;
    // if(injectedDeps.textRenderingLogic) dependencies.textRenderingLogic = injectedDeps.textRenderingLogic;
  }

  // Public API for the module
  return {
    _setDependencies,
    // `render` might not need to be public if it's only triggered by state/event.
    // But useful for export process to call it explicitly before capturing a frame.
    renderFrame: () => requestRender({reason: 'manualFrameRequest'}), // A public method to request a single render
    // cleanup: () => { if(currentAnimationFrameId) cancelAnimationFrame(currentAnimationFrameId); } // Add to init return
  };
})(); // IIFE removed


/**
 * Initialization function for the MainCanvasRenderer.
 * @param {object} deps
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../core/event-aggregator.js').default} deps.eventAggregator
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * @param {import('../../core/localization.service.js').default} deps.localizationService
 * // @param {ReturnType<import('./canvas.dimension.handler.js').initializeCanvasDimensionHandler>} deps.canvasDimensionsAPI
 * // @param {object} deps.textRenderingLogic - API from text.rendering.logic.js
 */
export function initializeMainRenderer(deps) {
  mainRenderer._setDependencies(deps);
  const { stateStore, eventAggregator, errorLogger } = deps;

  // Need access to canvas context, setup internally now via _initializeCanvas called from render
  // If _initializeCanvas needed to be public for setup:
  // if (!mainRenderer._initializeCanvas()) { // Assume _initializeCanvas is method on mainRenderer object
  //    errorLogger.handleError({message: "Renderer cannot initialize canvas.", origin:"initializeMainRenderer", severity:"error"});
  //    return { renderFrame: ()=>{}, cleanup: ()=>{} }; // No-op API
  // }
  
  // Define a state change handler that correctly accesses the renderer's `requestRender`.
  // As `mainRenderer` is an object, `mainRenderer.requestRender` or its internal methods need
  // to be designed to be called without `this` issues, or `_onStateChange` needs access to it.
  // This becomes simpler if initializeMainRenderer *is* the module and defines these handlers within its scope.
  
  const _onStateChangeInternal = (newState, oldState) => {
      // Simple comparison for now. In a real app, use selectors to check specific state parts.
      let needsRender = false;
      if (newState.currentProject !== oldState?.currentProject) needsRender = true;
      // Add more specific checks:
      if (newState.currentProject && oldState?.currentProject) {
          if (newState.currentProject.background !== oldState.currentProject.background) needsRender = true;
          // Example: Listen to a hypothetical currentAyahDisplay object in state for text changes
          if (newState.currentAyahDisplay !== oldState?.currentAyahDisplay) needsRender = true;
          if (newState.currentProject.textStyle !== oldState.currentProject.textStyle) needsRender = true;
      }
      if (newState.isLoading !== oldState?.isLoading && !newState.isLoading) needsRender = true; // Render after loading finishes

      if(needsRender) mainRenderer.renderFrame(); // Call the exposed renderFrame method
  };

  // Need reference to stateStore from deps to access oldState, if stateStore.subscribe provides it.
  // Assuming stateStore.subscribe((newState) => {...}) which is common.
  const unsubscribeState = stateStore.subscribe((newState /*, oldStateIfProvidedByStore */) => {
    // For simplicity, assume `stateStore.subscribe` only gives `newState`.
    // We would need to store `oldState` manually if fine-grained comparison is crucial.
    // For now, let's just trigger render on any relevant state slice change identified internally.
    // The _onStateChange logic in mainRenderer's closure is the ideal place for granular checks if it has access.
    // Here, we might just request a render if certain top-level parts change or a specific action was dispatched.

    // Re-evaluate which parts of state trigger a render directly here
    // or rely on EVENTS.REQUEST_CANVAS_RENDER
    mainRenderer.renderFrame({reason: 'stateOrEventTrigger'}); // More generic trigger
  });


  const unsubscribeRequestRender = eventAggregator.subscribe(EVENTS.REQUEST_CANVAS_RENDER, (payload) => {
      mainRenderer.renderFrame({ reason: payload?.reason || 'eventRequest' });
  });

  const unsubscribeCanvasResized = eventAggregator.subscribe(EVENTS.CANVAS_RESIZED, (dimensions) => {
      // The canvas element dimensions (canvas.width, canvas.height) are already set by canvas.dimension.handler
      // This event just confirms it, so trigger a render.
      mainRenderer.renderFrame({ reason: 'canvasResized', dimensions });
  });


  // Initial render
  // Wait a tick for DOM and other initializations to settle potentially.
  setTimeout(() => {
      if (!mainRenderer._initializeCanvasInternal || !mainRenderer._initializeCanvasInternal()) {
          (errorLogger.handleError || console.error)("Failed to initialize canvas in MainRenderer.");
          return;
      }
      mainRenderer.renderFrame({ reason: 'initialLoad' });
  }, 0);

  mainRenderer._initializeCanvasInternal = function() { /* contents of _initializeCanvas */
    mainRenderer.canvasRef = DOMElements.videoPreviewCanvas;
    if (!mainRenderer.canvasRef) { /* error logging */ return false; }
    mainRenderer.ctxRef = mainRenderer.canvasRef.getContext('2d', { alpha: true });
    if (!mainRenderer.ctxRef) { /* error logging */ return false; }
    return true;
  };

  // console.info('[MainRenderer] Initialized.');
  return {
    renderFrame: mainRenderer.renderFrame, // Expose a method to explicitly request a render
    cleanup: () => {
      unsubscribeState();
      unsubscribeRequestRender.unsubscribe();
      unsubscribeCanvasResized.unsubscribe();
      if (mainRenderer._currentAnimationFrameId) { // Make _currentAnimationFrameId accessible
          cancelAnimationFrame(mainRenderer._currentAnimationFrameId);
      }
      // console.info('[MainRenderer] Cleaned up.');
    }
  };
}


export default mainRenderer;
