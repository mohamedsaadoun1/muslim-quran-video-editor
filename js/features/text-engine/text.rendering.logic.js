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
    EFFECT_TYPES: { ...TEXT_EFFECT_TYPES }
  };
})();

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
    EFFECT_TYPES: textRenderingLogic.EFFECT_TYPES
  };
}

export default textRenderingLogic;
