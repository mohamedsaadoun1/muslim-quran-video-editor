// js/features/text-engine/text.rendering.logic.js

// import errorLogger from '../../core/error-logger.js'; // If complex errors need logging
// Constants for text effects might come from app.constants.js
const TEXT_EFFECT_TYPES = {
    NONE: 'none',
    FADE_IN: 'fade', // Assumed to be fade-in
    TYPEWRITER: 'typewriter',
    SLIDE_UP: 'slideUp', // Example for future
};

const textRenderingLogic = (() => {
    // Store state for active effects if effects are complex and span multiple frames/calls
    // Key might be an identifier for the text element (e.g., 'ayahText', 'translationText')
    // Value: { type, startTime, duration, fullText, currentRenderedText, currentAlpha, ... }
    const activeEffects = new Map();

    let dependencies = {
        errorLogger: console, // Fallback
    };

    /**
     * Initializes or updates the state for a text effect.
     * Called when a new text with an effect needs to be displayed or effect type changes.
     * @param {string} textId - A unique identifier for the text being animated (e.g., "ayah", "translation").
     * @param {string} fullText - The complete text string to animate.
     * @param {string} effectType - From TEXT_EFFECT_TYPES (e.g., 'typewriter', 'fade').
     * @param {number} effectDurationMs - The total duration for the effect in milliseconds.
     * @param {boolean} [forceRestart=false] - If true, restarts the effect even if textId and type are same.
     */
    function startOrUpdateTextEffect(textId, fullText, effectType, effectDurationMs, forceRestart = false) {
        if (!textId || !fullText) {
            // If no text, clear any existing effect for this ID
            activeEffects.delete(textId);
            return;
        }

        const existingEffect = activeEffects.get(textId);
        if (!forceRestart && existingEffect && existingEffect.type === effectType && existingEffect.fullText === fullText) {
            // Effect already active and for the same text/type, no need to restart unless forced
            // (Could allow updating duration if that's a feature)
            return;
        }
        
        activeEffects.set(textId, {
            id: textId,
            type: effectType || TEXT_EFFECT_TYPES.NONE,
            startTime: performance.now(),
            duration: effectDurationMs || 1000, // Default 1 second for fade
            fullText: fullText,
            // Effect-specific state initialized here
            currentRenderedText: (effectType === TEXT_EFFECT_TYPES.TYPEWRITER) ? '' : fullText,
            currentAlpha: (effectType === TEXT_EFFECT_TYPES.FADE_IN) ? 0 : 1,
            isComplete: (effectType === TEXT_EFFECT_TYPES.NONE),
        });
        // console.debug(`[TextRenderingLogic] Started/updated effect for '${textId}':`, activeEffects.get(textId));
    }

    /**
     * Gets the current state of the text to be rendered for a given effect.
     * This function should be called in each render loop (e.g., by main-renderer.js).
     * @param {string} textId - The unique identifier for the text.
     * @returns {{ textToRender: string, alpha: number, isEffectComplete: boolean }}
     *          textToRender: The portion of text to draw for the current frame.
     *          alpha: The opacity to apply (0.0 to 1.0).
     *          isEffectComplete: True if the animation for this text has finished.
     */
    function getCurrentTextState(textId) {
        const effect = activeEffects.get(textId);

        if (!effect || effect.type === TEXT_EFFECT_TYPES.NONE || effect.isComplete) {
            return {
                textToRender: effect ? effect.fullText : '', // Return full text if effect is done or none
                alpha: 1,
                isEffectComplete: true,
            };
        }

        const currentTime = performance.now();
        const elapsedTime = currentTime - effect.startTime;
        let progress = Math.min(elapsedTime / effect.duration, 1); // Ensure progress doesn't exceed 1

        let textToRender = effect.fullText;
        let alpha = 1;

        switch (effect.type) {
            case TEXT_EFFECT_TYPES.FADE_IN:
                alpha = progress; // Simple linear fade-in
                effect.currentAlpha = alpha;
                break;

            case TEXT_EFFECT_TYPES.TYPEWRITER:
                const charsToShow = Math.floor(effect.fullText.length * progress);
                textToRender = effect.fullText.substring(0, charsToShow);
                effect.currentRenderedText = textToRender;
                break;
            
            case TEXT_EFFECT_TYPES.SLIDE_UP:
                // For slide up, `main-renderer` would need to adjust Y position based on progress.
                // This function might return a ` offsetYMultiplier: progress ` or similar.
                // For now, assume it also affects alpha for a combined effect, or just render full text.
                alpha = progress; // Example: Fade in while sliding
                // Y position would be calculated in renderer: initialY - (elementHeight * (1 - progress))
                break;

            // Add more cases for other effects
        }

        if (progress >= 1) {
            effect.isComplete = true;
            // console.debug(`[TextRenderingLogic] Effect completed for '${textId}'`);
        }

        return { textToRender, alpha, isEffectComplete: effect.isComplete };
    }

    /**
     * Clears/resets the effect state for a specific textId.
     * @param {string} textId - The identifier of the text effect to clear.
     */
    function clearTextEffect(textId) {
        activeEffects.delete(textId);
        // console.debug(`[TextRenderingLogic] Cleared effect for '${textId}'`);
    }

    /**
     * Clears all active text effects.
     */
    function clearAllTextEffects() {
        activeEffects.clear();
        // console.debug('[TextRenderingLogic] All text effects cleared.');
    }
    
    function _setDependencies(injectedDeps) {
        if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    }

    // Public API of the module
    return {
        _setDependencies,
        startOrUpdateTextEffect,
        getCurrentTextState,
        clearTextEffect,
        clearAllTextEffects,
        EFFECT_TYPES: { ...TEXT_EFFECT_TYPES } // Expose effect types
    };
})(); // IIFE removed

/**
 * Initialization function for the TextRenderingLogic.
 * @param {object} deps - Dependencies.
 * @param {import('../../core/error-logger.js').default} [deps.errorLogger] - Optional.
 */
export function initializeTextRenderingLogic(deps = {}) {
  textRenderingLogic._setDependencies(deps);
  // console.info('[TextRenderingLogic] Initialized.');

  // This module is mostly a collection of utility functions with internal state management.
  // It doesn't typically subscribe to global events for its core logic, but rather is called by others.
  return {
    startOrUpdateTextEffect: textRenderingLogic.startOrUpdateTextEffect,
    getCurrentTextState: textRenderingLogic.getCurrentTextState,
    clearTextEffect: textRenderingLogic.clearTextEffect,
    clearAllTextEffects: textRenderingLogic.clearAllTextEffects,
    EFFECT_TYPES: textRenderingLogic.EFFECT_TYPES,
  };
}

// Export the core object if direct import is desired.
export default textRenderingLogic;
