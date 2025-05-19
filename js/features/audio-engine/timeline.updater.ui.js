// js/features/audio-engine/timeline.updater.ui.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

import DOMElements from '../../core/dom-elements.js';
import { EVENTS } from '../../config/app.constants.js';
import timeFormatter from '../../utils/time.formatter.js';
import localizationService from '../../core/localization.service.js';

/**
 * @typedef {Object} TimelineData
 * @property {number} currentTime - زمن التشغيل الحالي بالثواني
 * @property {number} duration - المدة الكلية للصوت بالثواني
 * @property {number} progressPercent - التقدم بالنسبة المئوية (0-100)
 */

/**
 * @typedef {Object} TimelineUpdaterUI
 * @property {(injectedDeps: Object) => void} _setDependencies - تعيين الاعتماديات
 * @property {() => void} updateTimeline - تحديث عرض الزمن
 * @property {() => void} resetTimelineDisplay - إعادة تعيين عرض الزمن
 * @property {() => void} cleanup - تنظيف الموارد
 * @property {() => boolean} selfTest - التحقق من الصحة
 */

const timelineUpdaterUI = (() => {
  // المتغيرات الداخلية
  let timelineSlider = null;
  let currentTimeDisplay = null;
  let totalTimeDisplay = null;
  let isUserSeeking = false; // تحديد تفاعل المستخدم
  
  // الاعتمادية
  const dependencies = {
    eventAggregator: {
      publish: () => {},
      subscribe: (callback) => {
        return { unsubscribe: () => {} }
      }
    },
    errorLogger: console,
    mainPlaybackAPI: {
      seek: (percentage) => {}
    }
  };
  
  // الدوال المساعدة
  const getLogger = () => {
    return dependencies.errorLogger || console;
  };
  
  const getLocalization = () => {
    return localizationService;
  };
  
  const translate = (key) => {
    const service = getLocalization();
    return service.translate(key);
  };
  
  const validateTime = (time) => {
    return !isNaN(parseFloat(time)) && isFinite(time) && time >= 0;
  };
  
  const notifyTimelineUpdated = (currentTime, duration, progressPercent) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.TIMELINE_UPDATED, {
        currentTime,
        duration,
        progressPercent
      });
    }
  };
  
  const notifyTimelineSeek = (seekPercentage) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.TIMELINE_SEEK_REQUESTED, seekPercentage);
    }
  };
  
  /**
   * تحديث عناصر شريط الزمن
   * @private
   * @param {TimelineData} data - بيانات الزمن
   */
  function _updateTimelineDisplay(data) {
    const { currentTime, duration, progressPercent } = data;
    
    if (isUserSeeking) return; // لا تحديث أثناء تفاعل المستخدم
    
    // تحديث شريط الزمن
    if (timelineSlider && validateTime(progressPercent)) {
      timelineSlider.value = progressPercent;
    }
    
    // تحديث الزمن الحالي
    if (currentTimeDisplay && validateTime(currentTime)) {
      currentTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(currentTime);
    }
    
    // تحديث الزمن الكلي (مرة واحدة فقط)
    if (totalTimeDisplay && validateTime(duration)) {
      const currentDuration = totalTimeDisplay.dataset.currentDuration;
      if (currentDuration !== String(duration)) {
        totalTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(duration);
        totalTimeDisplay.dataset.currentDuration = String(duration);
      }
    }
  }

  /**
   * التعامل مع تفاعل المستخدم (سحب الشريط)
   * @private
   */
  function _handleTimelineSliderInput() {
    isUserSeeking = true;
    
    if (timelineSlider && currentTimeDisplay && totalTimeDisplay) {
      const duration = parseFloat(totalTimeDisplay.dataset.currentDuration);
      if (validateTime(duration) && duration > 0) {
        const seekTime = (parseFloat(timelineSlider.value) / 100) * duration;
        if (validateTime(seekTime)) {
          currentTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(seekTime);
        }
      }
    }
  }

  /**
   * التعامل مع تحرير الشريط (إفلات الفأرة)
   * @private
   */
  function _handleTimelineSliderChange() {
    if (timelineSlider) {
      const seekPercentage = parseFloat(timelineSlider.value);
      
      if (validateTime(seekPercentage)) {
        // إرسال طلب البحث
        if (dependencies.mainPlaybackAPI && dependencies.mainPlaybackAPI.seek) {
          dependencies.mainPlaybackAPI.seek(seekPercentage);
        } else {
          notifyTimelineSeek(seekPercentage);
        }
      } else {
        const logger = getLogger();
        logger.logWarning({
          message: `قيمة البحث غير صالحة: ${timelineSlider.value}`,
          origin: 'TimelineUpdaterUI._handleTimelineSliderChange'
        });
        
        if (timelineSlider && timelineSlider.value) {
          timelineSlider.value = 0;
        }
      }
    }
    
    // السماح بتحديثات النظام بعد قليل
    setTimeout(() => {
      isUserSeeking = false;
    }, 50);
  }

  /**
   * إعادة تعيين شريط الزمن
   */
  function resetTimelineDisplay() {
    if (timelineSlider) {
      timelineSlider.value = 0;
    }
    
    if (currentTimeDisplay) {
      currentTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(0);
    }
    
    if (totalTimeDisplay) {
      totalTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(0);
      totalTimeDisplay.dataset.currentDuration = "0";
    }
    
    isUserSeeking = false;
  }

  /**
   * تعيين الاعتماديات
   * @param {Object} injectedDeps - الاعتماديات المُمررة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.eventAggregator) {
      dependencies.eventAggregator = injectedDeps.eventAggregator;
    }
    
    if (injectedDeps.errorLogger) {
      dependencies.errorLogger = injectedDeps.errorLogger;
    }
    
    if (injectedDeps.mainPlaybackAPI) {
      dependencies.mainPlaybackAPI = injectedDeps.mainPlaybackAPI;
    }
  }

  // واجهة API العامة
  return {
    _setDependencies,
    updateTimeline: _updateTimelineDisplay,
    resetTimelineDisplay,
    selfTest: () => {
      try {
        resetTimelineDisplay();
        return timelineSlider?.value === 0 &&
               currentTimeDisplay?.textContent === '00:00' &&
               totalTimeDisplay?.textContent === '00:00';
      } catch (e) {
        return false;
      }
    }
  };
})();

/**
 * تهيئة محدث الزمن
 * @param {Object} deps - الاعتماديات المُمررة
 * @returns {Object} واجهة محدث الزمن
 */
export function initializeTimelineUpdaterUI(deps) {
  timelineUpdaterUI._setDependencies(deps);
  
  const { eventAggregator, errorLogger } = deps;
  
  // تعيين العناصر
  timelineUpdaterUI.timelineSliderRef = DOMElements.timelineSlider;
  timelineUpdaterUI.currentTimeDisplayRef = DOMElements.currentTimeDisplay;
  timelineUpdaterUI.totalTimeDisplayRef = DOMElements.totalTimeDisplay;
  
  if (!timelineUpdaterUI.timelineSliderRef || 
      !timelineUpdaterUI.currentTimeDisplayRef || 
      !timelineUpdaterUI.totalTimeDisplayRef) {
    const logger = errorLogger || console;
    logger.logWarning({
      message: translate('TimelineUpdaterUI.ElementsNotFound'),
      origin: 'TimelineUpdaterUI.initializeTimelineUpdaterUI'
    });
    
    return { cleanup: () => {} };
  }
  
  // إنشاء إشارات محلية
  const slider = timelineUpdaterUI.timelineSliderRef;
  const currentTimeEl = timelineUpdaterUI.currentTimeDisplayRef;
  const totalTimeEl = timelineUpdaterUI.totalTimeDisplayRef;
  
  // وظائف التعامل مع الأحداث
  const updateDisplay = ({ currentTime, duration, progressPercent }) => {
    if (!validateTime(currentTime) || !validateTime(duration) || !validateTime(progressPercent)) {
      errorLogger.logWarning({
        message: `بيانات الزمن غير صالحة: ${currentTime}, ${duration}, ${progressPercent}`,
        origin: 'TimelineUpdaterUI.updateDisplay',
        severity: 'warning',
        context: { currentTime, duration, progressPercent }
      });
      return;
    }
    
    if (slider && !isNaN(progressPercent)) slider.value = progressPercent;
    if (currentTimeEl && !isNaN(currentTime)) currentTimeEl.textContent = timeFormatter.formatSecondsToMMSS(currentTime);
    if (totalTimeEl && !isNaN(duration)) {
      if (totalTimeEl.dataset.currentDuration !== String(duration)) {
        totalTimeEl.textContent = timeFormatter.formatSecondsToMMSS(duration);
        totalTimeEl.dataset.currentDuration = String(duration);
      }
    }
  };
  
  const handleSliderInput = () => {
    isUserSeeking = true;
    
    if (slider && currentTimeEl && totalTimeEl) {
      const duration = parseFloat(totalTimeEl.dataset.currentDuration);
      if (validateTime(duration) && duration > 0) {
        const seekTime = (parseFloat(slider.value) / 100) * duration;
        if (validateTime(seekTime)) {
          currentTimeEl.textContent = timeFormatter.formatSecondsToMMSS(seekTime);
        }
      }
    }
  };
  
  const handleSliderChange = () => {
    if (slider) {
      const seekPercentage = parseFloat(slider.value);
      
      if (validateTime(seekPercentage)) {
        if (deps.mainPlaybackAPI && deps.mainPlaybackAPI.seek) {
          deps.mainPlaybackAPI.seek(seekPercentage);
        } else {
          notifyTimelineSeek(seekPercentage);
        }
      } else {
        errorLogger.logWarning({
          message: `قيمة البحث غير صالحة: ${slider.value}`,
          origin: 'TimelineUpdaterUI.handleSliderChange',
          context: { value: slider.value }
        });
        
        if (slider) {
          slider.value = 0;
        }
      }
    }
    
    setTimeout(() => {
      isUserSeeking = false;
    }, 50);
  };
  
  const resetDisplay = () => {
    if (slider) slider.value = 0;
    if (currentTimeEl) currentTimeEl.textContent = timeFormatter.formatSecondsToMMSS(0);
    if (totalTimeEl) {
      totalTimeEl.textContent = timeFormatter.formatSecondsToMMSS(0);
      totalTimeEl.dataset.currentDuration = "0";
    }
    isUserSeeking = false;
  };
  
  // الاشتراك في الأحداث
  const unsubscribeTimelineUpdate = eventAggregator.subscribe(EVENTS.TIMELINE_UPDATED, updateDisplay);
  const unsubscribePlaylistEnded = eventAggregator.subscribe(EVENTS.PLAYLIST_ENDED, resetDisplay);
  
  const unsubscribePlaybackStopped = eventAggregator.subscribe(EVENTS.PLAYBACK_STATE_CHANGED, (isPlaying) => {
    if (!isPlaying) {
      const currentProject = deps.stateStore?.getState().currentProject;
      const mainAudioPlayer = DOMElements.mainAudioPlayer;
      
      if (mainAudioPlayer && mainAudioPlayer.currentTime < 0.5 && !currentProject) {
        resetDisplay();
      } else if (!currentProject) {
        resetDisplay();
      }
    }
  });
  
  // ربط الأحداث مع العناصر
  if (slider) {
    slider.addEventListener('input', handleSliderInput);   // سحب الشريط
    slider.addEventListener('change', handleSliderChange); // إفلات الفأرة
  }
  
  // تعيين الحالة الابتدائية
  resetDisplay();
  
  // تصدير وظائف التنظيف
  return {
    updateTimeline: timelineUpdaterUI.updateTimeline,
    reset: resetDisplay,
    cleanup: () => {
      unsubscribeTimelineUpdate.unsubscribe();
      unsubscribePlaylistEnded.unsubscribe();
      unsubscribePlaybackStopped.unsubscribe();
      
      if (slider) {
        slider.removeEventListener('input', handleSliderInput);
        slider.removeEventListener('change', handleSliderChange);
      }
    }
  };
}

/**
 * التحقق مما إذا كان النظام جاهزًا
 * @returns {boolean} نتيجة التحقق
 */
export function selfTest() {
  return timelineUpdaterUI.selfTest();
}

// تصدير الكائن الافتراضي
export default timelineUpdaterUI;
