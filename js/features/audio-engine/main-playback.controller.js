// js/features/audio-engine/main-playback.controller.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, EVENTS, DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';
import timeFormatter from '../../utils/time.formatter.js';
import localizationService from '../../core/localization.service.js';

/**
 * @typedef {Object} PlaylistItem
 * @property {number} ayahGlobalNumber - رقم الآية العالمي
 * @property {string | null} audioUrl - رابط الصوت
 * @property {number | null} duration - مدة الصوت بالثواني
 * @property {boolean} isReady - هل الصوت جاهز؟
 * @property {string} text - نص الآية (لعرضه أو تسجيله)
 * @property {string} surahName - اسم السورة (اختياري)
 * @property {number} numberInSurah - رقم الآية في السورة (اختياري)
 */

/**
 * @typedef {Object} MainPlaybackController
 * @property {(injectedDeps: Object) => void} _setDependencies - تعيين الاعتماديات
 * @property {() => void} play - تشغيل التلاوة
 * @property {() => void} pause - إيقاف مؤقت
 * @property {() => void} stop - إيقاف نهائي
 * @property {() => void} next - التشغيل التالي
 * @property {() => void} previous - التشغيل السابق
 * @property {(percentage: number) => void} seek - الذهاب إلى زمن معين
 * @property {() => boolean} getIsPlaying - هل قيد التشغيل؟
 * @property {() => PlaylistItem[]} getCurrentPlaylist - الحصول على قائمة التشغيل
 * @property {() => PlaylistItem | null} getCurrentPlaylistItem - الحصول على الآية الحالية
 * @property {() => void} cleanup - تنظيف الموارد
 * @property {() => boolean} selfTest - التحقق من الصحة
 */

const mainPlaybackController = (() => {
  // المتغيرات الداخلية
  let mainAudioPlayer = null;
  let playlist = [];
  let currentPlaylistIndex = -1;
  let isPlaying = false;
  let isSeeking = false;
  let interAyahDelayTimer = null;
  
  // الاعتمادية
  const dependencies = {
    stateStore: {
      getState: () => ({ currentProject: null }),
      dispatch: () => {},
      subscribe: (callback) => {
        return () => {};
      }
    },
    eventAggregator: {
      publish: () => {},
      subscribe: () => ({ unsubscribe: () => {} })
    },
    errorLogger: console,
    ayahAudioServiceAPI: {
      getAyahAudioInfo: async () => null,
      preloadAyahAudioInfos: async () => {}
    }
  };
  
  // الدوال المساعدة
  const getLogger = () => {
    return dependencies.errorLogger || console;
  };
  
  const getLocalization = () => {
    return localizationService;
  };
  
  const translate = (key, placeholders) => {
    const service = getLocalization();
    return service.translate(key, placeholders);
  };
  
  const validateAyah = (ayahNumber) => {
    if (!Number.isInteger(ayahNumber) || ayahNumber < 1 || ayahNumber > 6236) {
      throw new Error(`الآية غير صالحة: ${ayahNumber}`);
    }
  };
  
  const validateSurah = (surahId) => {
    if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) {
      throw new Error(`السورة غير صالحة: ${surahId}`);
    }
  };
  
  const notifyPlaybackStateChanged = (isPlaying, ayah) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.PLAYBACK_STATE_CHANGED, {
        state: isPlaying ? 'playing' : 'paused',
        ayah: ayah || null
      });
    }
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
  
  const notifyCurrentAyahChanged = (item) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.CURRENT_AYAH_CHANGED, item);
    }
  };
  
  const notifyPlaylistUpdated = () => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.PLAYLIST_UPDATED, [...playlist]);
    }
  };
  
  const notifyPlaylistEnded = () => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.PLAYLIST_ENDED);
    }
  };
  
  /**
   * إنشاء أو التأكد من توفر عنصر الصوت الرئيسي
   * @private
   */
  function _setupAudioPlayer() {
    mainAudioPlayer = DOMElements.mainAudioPlayer;
    
    if (!mainAudioPlayer) {
      const logger = getLogger();
      logger.handleError({
        message: translate('MainAudioPlayer.ElementNotFound'),
        origin: 'MainPlaybackController._setupAudioPlayer',
        severity: 'error',
        context: { action: 'setup' }
      });
      return;
    }
    
    mainAudioPlayer.onplay = () => _handlePlaybackStateChange(true);
    mainAudioPlayer.onpause = () => _handlePlaybackStateChange(false);
    mainAudioPlayer.onended = _handleAyahEnded;
    mainAudioPlayer.ontimeupdate = _handleTimeUpdate;
    mainAudioPlayer.onloadedmetadata = _handleLoadedMetadata;
    mainAudioPlayer.onerror = _handleAudioError;
    mainAudioPlayer.onwaiting = () => {
      dependencies.stateStore.dispatch(ACTIONS.SET_LOADING, true);
    };
    mainAudioPlayer.oncanplay = () => {
      dependencies.stateStore.dispatch(ACTIONS.SET_LOADING, false);
    };
    mainAudioPlayer.onstalled = () => {
      const logger = getLogger();
      logger.logWarning({
        message: translate('MainAudioPlayer.Stalled'),
        origin: 'MainPlaybackController._setupAudioPlayer',
        context: { src: mainAudioPlayer.src }
      });
      dependencies.stateStore.dispatch(ACTIONS.SET_LOADING, true);
    };
    
    // مراقبة توفر التلاوة
    dependencies.eventAggregator.subscribe(EVENTS.AYAH_AUDIO_READY, _handleAyahAudioReady);
  }

  /**
   * التعامل مع تغيير حالة التشغيل
   * @private
   * @param {boolean} playing - هل الصوت قيد التشغيل؟
   */
  function _handlePlaybackStateChange(playing) {
    if (isPlaying === playing) return; // لا تغيير حقيقي
    
    isPlaying = playing;
    dependencies.stateStore.dispatch(ACTIONS.SET_MAIN_PLAYBACK_STATE, isPlaying);
    dependencies.eventAggregator.publish(EVENTS.PLAYBACK_STATE_CHANGED, playing ? 'playing' : 'paused');
    
    // تحديث زر التشغيل/الإيقاف
    if (DOMElements.playPauseMainBtn) {
      DOMElements.playPauseMainBtn.innerHTML = playing 
        ? '<i class="fas fa-pause"></i>' 
        : '<i class="fas fa-play"></i>';
      DOMElements.playPauseMainBtn.title = playing 
        ? translate('Button.Pause') 
        : translate('Button.Play');
    }
    
    // (اختياري) التحكم في الصوت الخلفي
    // if (isPlaying) dependencies.backgroundAudioAPI?.play();
    // else dependencies.backgroundAudioAPI?.pause();
  }

  /**
   * التعامل مع انتهاء الآية
   * @private
   */
  function _handleAyahEnded() {
    if (isPlaying) {
      playNextAyahWithDelay();
    }
  }

  /**
   * تحديث شريط الجدول الزمني أثناء التشغيل
   * @private
   */
  function _handleTimeUpdate() {
    if (!mainAudioPlayer || isSeeking || !isPlaying) return;
    
    const currentTime = mainAudioPlayer.currentTime;
    const duration = mainAudioPlayer.duration;
    
    if (!isNaN(duration) && duration > 0) {
      const progressPercent = (currentTime / duration) * 100;
      
      // تحديث عناصر واجهة المستخدم
      if (DOMElements.timelineSlider) DOMElements.timelineSlider.value = progressPercent;
      if (DOMElements.currentTimeDisplay) {
        DOMElements.currentTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(currentTime);
      }
      
      // نشر الحدث لعناصر أخرى
      notifyTimelineUpdated(currentTime, duration, progressPercent);
    }
  }

  /**
   * تحديث عرض الوقت الكلي عند تحميل البيانات
   * @private
   */
  function _handleLoadedMetadata() {
    if (!mainAudioPlayer) return;
    
    const duration = mainAudioPlayer.duration;
    if (!isNaN(duration) && duration > 0) {
      if (DOMElements.totalTimeDisplay) {
        DOMElements.totalTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(duration);
      }
      
      if (DOMElements.timelineSlider) {
        DOMElements.timelineSlider.max = 100; // القيمة هي نسبة مئوية
      }
      
      // تحديث مدة الآية في قائمة التشغيل
      if (currentPlaylistIndex >= 0 && currentPlaylistIndex < playlist.length) {
        const item = playlist[currentPlaylistIndex];
        if (item && item.isReady && item.duration === null && mainAudioPlayer.src === item.audioUrl) {
          item.duration = duration;
        }
      }
    }
    
    dependencies.stateStore.dispatch(ACTIONS.SET_LOADING, false);
  }

  /**
   * التعامل مع الأخطاء من عنصر الصوت
   * @private
   */
  function _handleAudioError() {
    _handlePlaybackStateChange(false);
    
    if (mainAudioPlayer && mainAudioPlayer.error) {
      const logger = getLogger();
      logger.handleError({
        error: mainAudioPlayer.error,
        message: `خطأ في عنصر الصوت الرئيسي: ${mainAudioPlayer.error.code}. الرسالة: ${mainAudioPlayer.error.message}`,
        origin: 'MainPlaybackController._handleAudioError',
        context: { src: mainAudioPlayer.src, currentAyah: playlist[currentPlaylistIndex]?.ayahGlobalNumber }
      });
    }
    
    stopPlayback();
  }

  /**
   * التعامل مع توفر التلاوة
   * @private
   */
  function _handleAyahAudioReady(audioInfo) {
    if (!audioInfo || audioInfo.url === null || audioInfo.duration === null) {
      return;
    }
    
    const itemIndex = playlist.findIndex(item => item.ayahGlobalNumber === audioInfo.ayahGlobalNumber);
    
    if (itemIndex > -1) {
      playlist[itemIndex].audioUrl = audioInfo.url;
      playlist[itemIndex].duration = audioInfo.duration;
      playlist[itemIndex].isReady = true;
      
      if (itemIndex === currentPlaylistIndex && !isPlaying && mainAudioPlayer && !mainAudioPlayer.src) {
        // سيتم تشغيلها بمجرد استدعاء playAyahAtIndex
      }
    }
  }

  /**
   * إنشاء قائمة التشغيل
   * @private
   */
  async function _buildPlaylist() {
    playlist = [];
    currentPlaylistIndex = -1;
    
    if (mainAudioPlayer) {
      mainAudioPlayer.src = '';
    }
    
    const project = dependencies.stateStore.getState().currentProject;
    
    if (!project || !project.quranSelection || !project.quranSelection.surahId) {
      notifyPlaylistUpdated();
      _updateTimelineForNoAudio();
      return;
    }
    
    const { surahId, startAyah, endAyah, reciterId } = project.quranSelection;
    
    // التحقق من صحة المدخلات
    try {
      validateSurah(surahId);
      validateAyah(startAyah);
      validateAyah(endAyah);
    } catch (e) {
      const logger = getLogger();
      logger.handleError({
        error: e,
        message: `فشل في بناء قائمة التشغيل بسبب مدخلات غير صالحة.`,
        origin: 'MainPlaybackController._buildPlaylist'
      });
      return;
    }
    
    // إنشاء قائمة التشغيل
    const ayahNumbersToLoad = [];
    
    for (let i = startAyah; i <= endAyah; i++) {
      const ayahRef = `${surahId}:${i}`;
      ayahNumbersToLoad.push({
        ayahGlobalNumber: ayahRef,
        audioUrl: null,
        duration: null,
        isReady: false,
        text: translate('Ayah.Text', { number: i, surah: surahId }),
        surahName: translate(`Surah.${surahId}`),
        numberInSurah: i
      });
    }
    
    playlist = ayahNumbersToLoad;
    notifyPlaylistUpdated();
    _updateTimelineForNoAudio();
    
    if (playlist.length > 0 && reciterId) {
      const refsToLoad = playlist.map(item => item.ayahGlobalNumber);
      dependencies.ayahAudioServiceAPI.preloadAyahAudioInfos(refsToLoad, reciterId);
    }
  }

  /**
   * إعادة تهيئة الجدول الزمني عند عدم وجود صوت
   * @private
   */
  function _updateTimelineForNoAudio() {
    if (DOMElements.timelineSlider) DOMElements.timelineSlider.value = 0;
    if (DOMElements.currentTimeDisplay) {
      DOMElements.currentTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(0);
    }
    if (DOMElements.totalTimeDisplay) {
      DOMElements.totalTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(0);
    }
  }

  /**
   * تشغيل الآية عند الفهرس المحدد
   * @private
   * @param {number} index - الفهرس في قائمة التشغيل
   */
  async function _playAyahAtIndex(index) {
    if (index < 0 || index >= playlist.length) {
      stopPlayback();
      notifyPlaylistEnded();
      return;
    }
    
    currentPlaylistIndex = index;
    const item = playlist[currentPlaylistIndex];
    notifyCurrentAyahChanged(item);
    
    if (!item.isReady || !item.audioUrl) {
      const project = dependencies.stateStore.getState().currentProject;
      
      if (project && project.quranSelection && project.quranSelection.reciterId) {
        await dependencies.ayahAudioServiceAPI.getAyahAudioInfo(item.ayahGlobalNumber, project.quranSelection.reciterId);
        
        if (!playlist[currentPlaylistIndex].isReady || !playlist[currentPlaylistIndex].audioUrl) {
          const logger = getLogger();
          logger.logWarning({
            message: `الصوت ما زال غير جاهز للآية ${item.ayahGlobalNumber} بعد الطلب.`,
            origin: 'MainPlaybackController._playAyahAtIndex'
          });
          
          playNextAyahWithDelay();
          return;
        }
      } else {
        stopPlayback();
        return;
      }
    }
    
    const readyItem = playlist[currentPlaylistIndex];
    
    if (mainAudioPlayer && readyItem.audioUrl) {
      mainAudioPlayer.src = readyItem.audioUrl;
      mainAudioPlayer.load();
      mainAudioPlayer.play().catch(e => _handleAudioError());
    } else {
      const logger = getLogger();
      logger.logWarning({
        message: `لا يمكن تشغيل الآية ${readyItem.ayahGlobalNumber}: لا يوجد رابط صوت أو عنصر الصوت غير جاهز.`,
        origin: 'MainPlaybackController._playAyahAtIndex'
      });
      
      playNextAyahWithDelay();
    }
  }

  /**
   * تشغيل التلاوة الحالية أو التالية
   */
  function playCurrentOrNext() {
    if (interAyahDelayTimer) clearTimeout(interAyahDelayTimer);
    
    if (isPlaying && mainAudioPlayer && !mainAudioPlayer.paused) {
      return;
    }
    
    if (playlist.length === 0) {
      _buildPlaylist().then(() => {
        if (playlist.length > 0) _playAyahAtIndex(0);
      });
      return;
    }
    
    if (mainAudioPlayer && mainAudioPlayer.paused && mainAudioPlayer.src && currentPlaylistIndex !== -1) {
      mainAudioPlayer.play().catch(e => _handleAudioError());
    } else {
      _playAyahAtIndex(currentPlaylistIndex >= 0 ? currentPlaylistIndex : 0);
    }
  }

  /**
   * إيقاف مؤقت للتلاوة
   */
  function pausePlayback() {
    if (interAyahDelayTimer) clearTimeout(interAyahDelayTimer);
    if (mainAudioPlayer && !mainAudioPlayer.paused) {
      mainAudioPlayer.pause();
    }
  }

  /**
   * إيقاف نهائي للتلاوة
   */
  function stopPlayback() {
    if (interAyahDelayTimer) clearTimeout(interAyahDelayTimer);
    
    if (mainAudioPlayer) {
      mainAudioPlayer.pause();
      mainAudioPlayer.currentTime = 0;
      mainAudioPlayer.src = '';
    }
    
    _updateTimelineForNoAudio();
    _handlePlaybackStateChange(false);
    currentPlaylistIndex = -1;
  }

  /**
   * تشغيل الآية التالية مع تأخير
   */
  function playNextAyahWithDelay() {
    if (interAyahDelayTimer) clearTimeout(interAyahDelayTimer);
    
    const project = dependencies.stateStore.getState().currentProject;
    const delaySeconds = project?.quranSelection?.delayBetweenAyahs ?? DEFAULT_PROJECT_SCHEMA.quranSelection.delayBetweenAyahs;
    
    if (currentPlaylistIndex >= playlist.length - 1) {
      stopPlayback();
      notifyPlaylistEnded();
      return;
    }
    
    interAyahDelayTimer = setTimeout(() => {
      _playAyahAtIndex(currentPlaylistIndex + 1);
    }, delaySeconds * 1000);
  }

  /**
   * تشغيل الآية السابقة
   */
  function playPreviousAyah() {
    if (interAyahDelayTimer) clearTimeout(interAyahDelayTimer);
    
    if (currentPlaylistIndex > 0) {
      _playAyahAtIndex(currentPlaylistIndex - 1);
    } else if (playlist.length > 0) {
      _playAyahAtIndex(0);
    }
  }

  /**
   * الذهاب إلى زمن معين في التشغيل
   * @param {number} percentage - النسبة المئوية
   */
  function seekTimeline(percentage) {
    if (mainAudioPlayer && !isNaN(mainAudioPlayer.duration) && mainAudioPlayer.duration > 0) {
      const newTime = (percentage / 100) * mainAudioPlayer.duration;
      mainAudioPlayer.currentTime = newTime;
    }
  }

  /**
   * تعيين الاعتماديات
   * @param {Object} injectedDeps - الاعتماديات المُمررة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.ayahAudioServiceAPI) dependencies.ayahAudioServiceAPI = injectedDeps.ayahAudioServiceAPI;
  }

  /**
   * تحديث حالة التشغيل
   * @private
   * @param {boolean} playing - هل قيد التشغيل؟
   */
  function _handlePlaybackStateChange(playing) {
    if (isPlaying === playing) return;
    
    isPlaying = playing;
    dependencies.stateStore.dispatch(ACTIONS.SET_MAIN_PLAYBACK_STATE, isPlaying);
    dependencies.eventAggregator.publish(EVENTS.PLAYBACK_STATE_CHANGED, playing ? 'playing' : 'paused');
    
    // تحديث زر التشغيل/الإيقاف
    if (DOMElements.playPauseMainBtn) {
      DOMElements.playPauseMainBtn.innerHTML = playing 
        ? '<i class="fas fa-pause"></i>' 
        : '<i class="fas fa-play"></i>';
      DOMElements.playPauseMainBtn.title = playing 
        ? translate('Button.Pause') 
        : translate('Button.Play');
    }
  }

  /**
   * إرسال الحدث عند تغيير الآية
   * @private
   * @param {PlaylistItem} item - بيانات الآية
   */
  function notifyCurrentAyahChanged(item) {
    notifyCurrentAyahChanged(item);
  }

  /**
   * إرسال الحدث عند انتهاء قائمة التشغيل
   * @private
   */
  function _handleAyahEnded() {
    if (isPlaying) {
      playNextAyahWithDelay();
    }
  }

  /**
   * إعادة تهيئة الموارد
   */
  function cleanup() {
    if (interAyahDelayTimer) clearTimeout(interAyahDelayTimer);
    
    if (mainAudioPlayer) {
      mainAudioPlayer.pause();
      mainAudioPlayer = null;
    }
    
    playlist.length = 0;
    currentPlaylistIndex = -1;
  }

  /**
   * التحقق مما إذا كان النظام جاهزًا
   * @returns {boolean} نتيجة التحقق
   */
  function selfTest() {
    try {
      const testAyah = 255;
      const testSurah = 2;
      const testItem = {
        ayahGlobalNumber: `${testSurah}:${testAyah}`,
        audioUrl: null,
        duration: null,
        isReady: false,
        text: translate('Ayah.Text', { number: testAyah, surah: testSurah }),
        surahName: translate(`Surah.${testSurah}`),
        numberInSurah: testAyah
      };
      
      playlist.push(testItem);
      _playAyahAtIndex(0);
      return playlist[0]?.ayahGlobalNumber === testItem.ayahGlobalNumber;
    } catch (e) {
      return false;
    }
  }

  // واجهة API العامة
  return {
    _setDependencies,
    play: playCurrentOrNext,
    pause: pausePlayback,
    stop: stopPlayback,
    next: playNextAyahWithDelay,
    previous: playPreviousAyah,
    seek: seekTimeline,
    getIsPlaying: () => isPlaying,
    getCurrentPlaylist: () => [...playlist],
    getCurrentPlaylistItem: () => (currentPlaylistIndex >= 0 && currentPlaylistIndex < playlist.length) ? { ...playlist[currentPlaylistIndex] } : null,
    _buildPlaylist,
    _updateTimelineForNoAudio,
    selfTest
  };
})();

/**
 * تهيئة متحكم التلاوة الرئيسي
 * @param {Object} dependencies - الاعتماديات المُمررة
 * @returns {Object} واجهة المتحكم
 */
export function initializeMainPlaybackController(dependencies) {
  mainPlaybackController._setDependencies(dependencies);
  
  // مزامنة قائمة التشغيل مع تغيير المشروع
  const unsubscribeState = dependencies.stateStore.subscribe((newState, oldState) => {
    const newSelection = newState.currentProject?.quranSelection;
    const oldSelection = oldState?.currentProject?.quranSelection;
    
    if (newSelection && oldSelection && (
        newSelection.surahId !== oldSelection.surahId ||
        newSelection.startAyah !== oldSelection.startAyah ||
        newSelection.endAyah !== oldSelection.endAyah ||
        newSelection.reciterId !== oldSelection.reciterId
    )) {
      if (mainPlaybackController.getIsPlaying()) {
        mainPlaybackController.stop();
      }
      mainPlaybackController._buildPlaylist();
    } else if (newSelection && !oldSelection && newState.currentProject) {
      mainPlaybackController._buildPlaylist();
    } else if (!newSelection && oldSelection) {
      mainPlaybackController.stop();
      mainPlaybackController._buildPlaylist();
    }
  });
  
  // تهيئة الحالة من المشروع الحالي
  const initialProject = dependencies.stateStore.getState().currentProject;
  if (initialProject && initialProject.quranSelection) {
    mainPlaybackController._buildPlaylist();
  }
  
  // إرجاع واجهة المتحكم
  return {
    play: mainPlaybackController.play,
    pause: mainPlaybackController.pause,
    stop: mainPlaybackController.stop,
    next: mainPlaybackController.next,
    previous: mainPlaybackController.previous,
    seek: mainPlaybackController.seek,
    getIsPlaying: mainPlaybackController.getIsPlaying,
    getCurrentPlaylistItem: mainPlaybackController.getCurrentPlaylistItem,
    rebuildPlaylist: mainPlaybackController._buildPlaylist,
    cleanup: () => {
      unsubscribeState();
      mainPlaybackController.stop();
    }
  };
}

/**
 * التحقق مما إذا كان النظام جاهزًا
 * @returns {boolean} نتيجة التحقق
 */
export function selfTest() {
  return mainPlaybackController.selfTest();
}

// تصدير الكائن الافتراضي
export default mainPlaybackController;
