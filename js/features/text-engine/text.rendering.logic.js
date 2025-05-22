// js/features/text-engine/text.rendering.logic.js

/**
 * نمط تأثيرات النصوص المدعومة
 * @readonly
 * @enum {string}
 */
const TEXT_EFFECT_TYPES = {
  NONE: 'none',
  FADE_IN: 'fade',
  TYPEWRITER: 'typewriter',
  SLIDE_UP: 'slideUp',
  REVEAL: 'reveal', // إضافة جديدة
  ZOOM: 'zoom',
  SWIPE: 'swipe'
};

/**
 * محرك تقديم النصوص مع تأثيرات
 */
const textRenderingLogic = (() => {
  // تخزين حالات التأثيرات النشطة
  const activeEffects = new Map();

  // الاعتمادات
  let dependencies = {
    errorLogger: console,
    performanceMonitor: null
  };

  /**
   * تحديث حالة التأثير
   * @param {string} textId - معرف النص
   * @param {Object} updates - التحديثات
   */
  const _updateEffectState = (textId, updates) => {
    const effect = activeEffects.get(textId);
    if (effect) {
      activeEffects.set(textId, { ...effect, ...updates });
    }
  };

  /**
   * بدء أو تحديث تأثير النص
   * @param {string} textId - معرف النص
   * @param {string} fullText - النص الكامل
   * @param {string} effectType - نوع التأثير
   * @param {number} effectDurationMs - مدة التأثير بالمللي ثانية
   * @param {boolean} [forceRestart=false] - إعادة التشغيل القسري
   */
  function startOrUpdateTextEffect(textId, fullText, effectType, effectDurationMs, forceRestart = false) {
    if (!textId || !fullText) {
      activeEffects.delete(textId);
      return;
    }

    const existingEffect = activeEffects.get(textId);
    
    if (!forceRestart && 
        existingEffect && 
        existingEffect.type === effectType && 
        existingEffect.fullText === fullText) {
      return;
    }

    const duration = Math.max(effectDurationMs || 1000, 200); // حد أدنى 200 مللي
    const startTime = performance.now();
    
    activeEffects.set(textId, {
      id: textId,
      type: effectType || TEXT_EFFECT_TYPES.NONE,
      startTime,
      duration,
      fullText,
      currentRenderedText: effectType === TEXT_EFFECT_TYPES.TYPEWRITER ? '' : fullText,
      currentAlpha: effectType === TEXT_EFFECT_TYPES.FADE_IN ? 0 : 1,
      isComplete: effectType === TEXT_EFFECT_TYPES.NONE,
      progress: 0
    });

    dependencies.performanceMonitor?.trackEvent('text_effect_start', {
      effectType,
      duration
    });
  }

  /**
   * الحصول على حالة النص الحالية
   * @param {string} textId - معرف النص
   * @returns {Object} حالة النص
   */
  function getCurrentTextState(textId) {
    const effect = activeEffects.get(textId);

    if (!effect || effect.isComplete || effect.type === TEXT_EFFECT_TYPES.NONE) {
      return {
        textToRender: effect?.fullText || '',
        alpha: 1,
        isEffectComplete: true,
        progress: 1
      };
    }

    const currentTime = performance.now();
    const elapsedTime = currentTime - effect.startTime;
    let progress = Math.min(elapsedTime / effect.duration, 1);
    
    // تأثير سلس باستخدام easing function
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
    const smoothedProgress = easeOutCubic(progress);

    let textToRender = effect.fullText;
    let alpha = 1;
    let offsetY = 0;
    let scale = 1;

    switch (effect.type) {
      case TEXT_EFFECT_TYPES.FADE_IN:
        alpha = smoothedProgress;
        break;

      case TEXT_EFFECT_TYPES.TYPEWRITER:
        const charsToShow = Math.floor(effect.fullText.length * smoothedProgress);
        textToRender = effect.fullText.substring(0, charsToShow);
        break;
      
      case TEXT_EFFECT_TYPES.SLIDE_UP:
        offsetY = -20 * (1 - smoothedProgress); // انزلاق من الأسفل
        alpha = smoothedProgress;
        break;

      case TEXT_EFFECT_TYPES.REVEAL:
        // كشف النص من اليسار إلى اليمين
        const width = 100 * smoothedProgress;
        break;

      case TEXT_EFFECT_TYPES.ZOOM:
        scale = 0.8 + (0.2 * smoothedProgress); // من 0.8 إلى 1
        alpha = smoothedProgress;
        break;

      case TEXT_EFFECT_TYPES.SWIPE:
        // تأثير مزيج من الانزلاق والكشف
        offsetY = -15 * (1 - smoothedProgress);
        alpha = smoothedProgress;
        const charsToShowSwipe = Math.floor(effect.fullText.length * smoothedProgress);
        textToRender = effect.fullText.substring(0, charsToShowSwipe);
        break;
    }

    if (progress >= 1) {
      effect.isComplete = true;
      dependencies.performanceMonitor?.trackEvent('text_effect_complete', {
        effectType: effect.type,
        duration: effect.duration
      });
    }

    _updateEffectState(textId, {
      progress,
      currentRenderedText: textToRender,
      currentAlpha: alpha,
      isComplete: effect.isComplete
    });

    return {
      textToRender,
      alpha,
      offsetY,
      scale,
      isEffectComplete: effect.isComplete,
      progress
    };
  }

  /**
   * إعادة تشغيل تأثير
   * @param {string} textId - معرف النص
   */
  function restartTextEffect(textId) {
    const effect = activeEffects.get(textId);
    if (effect) {
      startOrUpdateTextEffect(
        textId,
        effect.fullText,
        effect.type,
        effect.duration,
        true
      );
    }
  }

  /**
   * إيقاف تأثير
   * @param {string} textId - معرف النص
   */
  function stopTextEffect(textId) {
    const effect = activeEffects.get(textId);
    if (effect) {
      _updateEffectState(textId, {
        isComplete: true
      });
    }
  }

  /**
   * إزالة تأثير نصي
   * @param {string} textId - معرف النص
   */
  function clearTextEffect(textId) {
    activeEffects.delete(textId);
  }

  /**
   * إزالة كل التأثيرات
   */
  function clearAllTextEffects() {
    activeEffects.clear();
  }
  
  /**
   * تحديد الاعتمادات
   * @param {Object} injectedDeps - الاعتمادات
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.performanceMonitor) dependencies.performanceMonitor = injectedDeps.performanceMonitor;
  }

  return {
    _setDependencies,
    startOrUpdateTextEffect,
    getCurrentTextState,
    restartTextEffect,
    stopTextEffect,
    clearTextEffect,
    clearAllTextEffects,
    EFFECT_TYPES: { ...TEXT_EFFECT_TYPES },
    getHighlightedTextSegments // Expose the new function
  };
})();

// --- JSDoc type definitions for word highlighting ---

/**
 * @typedef {import('../project-manager/project.model.js').WordTiming} WordTiming
 * // Or define locally if preferred:
 * // typedef {Object} WordTiming
 * // @property {string} text - The word text.
 * // @property {number} startTime - Start time in milliseconds.
 * // @property {number} endTime - End time in milliseconds.
 */

/**
 * @typedef {import('../project-manager/project.model.js').AyahTimingData} AyahTimingData
 * // Or define locally:
 * // typedef {Object} AyahTimingData
 * // @property {number} durationSec - Total duration of the ayah audio in seconds.
 * // @property {Array<WordTiming>} [words] - Array of word timings.
 * // @property {string} [audioUrl] - The URL of the audio file for this ayah.
 */

/**
 * Represents a segment of text with highlighting status.
 * @typedef {Object} HighlightedSegment
 * @property {string} text - The text content of the segment.
 * @property {boolean} isActive - True if the segment is currently being played.
 * @property {boolean} isPlayed - True if the segment has already been played.
 */

/**
 * Output structure for text segmented by words with highlighting information.
 * @typedef {Object} WordSegmentedTextOutput
 * @property {Array<HighlightedSegment>} segments - Array of text segments with their highlighting status.
 * @property {string} originalText - The full original verse text.
 */


/**
 * Generates text segments with highlighting information based on current audio time.
 * Assumes `ayahTimingData.words` provides the definitive segmentation.
 * @param {string} fullText - The complete text of the ayah.
 * @param {AyahTimingData | null | undefined} ayahTimingData - Timing data for the ayah, including word timings.
 * @param {number} currentAudioTimeMs - Current audio playback time in milliseconds.
 * @returns {WordSegmentedTextOutput}
 */
function getHighlightedTextSegments(fullText, ayahTimingData, currentAudioTimeMs) {
  const output = {
    segments: [],
    originalText: fullText,
  };

  if (!ayahTimingData || !ayahTimingData.words || ayahTimingData.words.length === 0) {
    // No word timing data, return full text as a single non-active segment
    output.segments.push({
      text: fullText,
      isActive: false,
      isPlayed: false, // Or true if currentAudioTimeMs > 0 and duration is known/passed
    });
    return output;
  }

  // Ensure currentAudioTimeMs is a number, default to 0 if not
  const currentTime = (typeof currentAudioTimeMs === 'number' && !isNaN(currentAudioTimeMs)) ? currentAudioTimeMs : 0;

  for (const word of ayahTimingData.words) {
    const { text, startTime, endTime } = word;
    let isActive = false;
    let isPlayed = false;

    if (currentTime < startTime) {
      // Word is upcoming
      isActive = false;
      isPlayed = false;
    } else if (currentTime >= startTime && currentTime <= endTime) {
      // Word is currently active
      isActive = true;
      isPlayed = false;
    } else { // currentTime > endTime
      // Word has been played
      isActive = false;
      isPlayed = true;
    }
    
    output.segments.push({
      text: text, // Use the text directly from the timing data
      isActive,
      isPlayed,
    });
  }
  
  // If there are no words from timing data but fullText exists, handle it (already covered by the initial check)
  // This logic assumes that the sum of word segments from ayahTimingData.words reconstructs the fullText,
  // or that the UI will render these segments sequentially.

  return output;
}


/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 */
export function initializeTextRenderingLogic(deps = {}) {
  textRenderingLogic._setDependencies(deps);
  
  return {
    startOrUpdateTextEffect: textRenderingLogic.startOrUpdateTextEffect,
    getCurrentTextState: textRenderingLogic.getCurrentTextState,
    restartTextEffect: textRenderingLogic.restartTextEffect,
    stopTextEffect: textRenderingLogic.stopTextEffect,
    clearTextEffect: textRenderingLogic.clearTextEffect,
    clearAllTextEffects: textRenderingLogic.clearAllTextEffects,
    EFFECT_TYPES: textRenderingLogic.EFFECT_TYPES,
    getHighlightedTextSegments: getHighlightedTextSegments // Expose new function
  };
}

export default textRenderingLogic;
