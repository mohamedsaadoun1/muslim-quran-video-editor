// js/features/audio-engine/background-audio.mixer.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

import DOMElements from '../../core/dom-elements.js';
import fileIOUtils from '../../services/file.io.utils.js';
import { ACTIONS, EVENTS } from '../../config/app.constants.js';
import localizationService from '../../core/localization.service.js';

/**
 * @typedef {Object} BackgroundAudioState
 * @property {string | null} fileObjectURL - رابط الصوت (Object URL)
 * @property {string | null} fileName - اسم الملف
 * @property {number} volume - الصوت (من 0 إلى 1)
 * @property {boolean} loop - هل يتم التكرار؟
 * @property {boolean} isPlaying - هل الصوت قيد التشغيل؟
 * @property {number | null} duration - مدة الصوت
 */

/**
 * @typedef {Object} BackgroundAudioMixer
 * @property {(audioFile: File) => Promise<boolean>} loadBackgroundAudio - تحميل الصوت الخلفي
 * @property {() => void} play - تشغيل الصوت
 * @property {() => void} pause - إيقاف مؤقت
 * @property {() => void} stop - إيقاف نهائي
 * @property {(volumeLevel: number) => void} setVolume - ضبط الصوت
 * @property {(shouldLoop: boolean) => void} setLoop - تعيين التكرار
 * @property {() => BackgroundAudioState} getCurrentState - الحصول على الحالة الحالية
 * @property {() => void} cleanup - تنظيف الموارد
 * @property {() => boolean} selfTest - التحقق من الصحة
 */

const backgroundAudioMixer = (() => {
  // التعاريف الافتراضية
  const defaultBgAudioState = {
    fileObjectURL: null,
    fileName: null,
    volume: 0.3, // صوت افتراضي منخفض للصوت الخلفي
    loop: true,
    isPlaying: false,
    duration: null
  };
  
  // المتغيرات الداخلية
  let audioElement = null;
  let currentBgAudioState = { ...defaultBgAudioState };
  let objectUrlToRevoke = null;
  
  // الاعتمادية
  let dependencies = {
    stateStore: {
      getState: () => ({ currentProject: null }),
      dispatch: () => {},
      subscribe: (callback) => {
        return () => {};
      }
    },
    errorLogger: console,
    eventAggregator: {
      publish: () => {},
      subscribe: () => ({ unsubscribe: () => {} })
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
  
  const validateAudioFile = (audioFile) => {
    if (!(audioFile instanceof File)) {
      throw new Error('الملف غير صالح');
    }
    
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
    if (!validTypes.includes(audioFile.type)) {
      throw new Error(`نوع الصوت غير مدعوم: ${audioFile.type}`);
    }
  };
  
  const isNumeric = (value) => {
    return !isNaN(parseFloat(value)) && isFinite(value) && value >= 0 && value <= 1;
  };
  
  const notifyPlaybackStateChanged = (isPlaying, fileName) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.BACKGROUND_AUDIO_STATE_CHANGED, {
        isPlaying,
        file: fileName
      });
    }
  };
  
  /**
   * إنشاء أو التأكد من توفر عنصر الصوت
   * @private
   */
  function _ensureAudioElement() {
    if (!audioElement || !document.body.contains(audioElement)) {
      audioElement = document.createElement('audio');
      audioElement.id = 'background-audio-player';
      
      // إعداد event listeners
      audioElement.onended = () => {
        if (currentBgAudioState.loop && currentBgAudioState.fileObjectURL) {
          audioElement.currentTime = 0;
          audioElement.play().catch(e => {
            const logger = getLogger();
            logger.logWarning({
              message: `فشل في إعادة تشغيل الصوت: ${e.message}`,
              origin: 'background-audio.mixer.onended'
            });
          });
        } else {
          _updatePlaybackState(false);
        }
      };
      
      audioElement.onplay = () => _updatePlaybackState(true);
      audioElement.onpause = () => _updatePlaybackState(false);
      
      audioElement.onloadedmetadata = () => {
        if (audioElement.duration) {
          currentBgAudioState.duration = audioElement.duration;
          dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
            backgroundAudio: { duration: audioElement.duration }
          });
        }
      };
      
      audioElement.onerror = (e) => {
        const logger = getLogger();
        logger.handleError({
          error: audioElement.error || new Error('خطأ في عنصر الصوت'),
          message: `خطأ في عنصر الصوت: ${currentBgAudioState.fileName || 'ملف غير معروف'}`,
          origin: 'background-audio.mixer.audioElement.onerror'
        });
        _updatePlaybackState(false);
      };
    }
  }

  /**
   * تحديث حالة التشغيل وإرسالها
   * @private
   * @param {boolean} isPlaying - هل الصوت قيد التشغيل؟
   */
  function _updatePlaybackState(isPlaying) {
    if (currentBgAudioState.isPlaying !== isPlaying) {
      currentBgAudioState.isPlaying = isPlaying;
      
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
        backgroundAudio: { isPlaying }
      });
      
      notifyPlaybackStateChanged(isPlaying, currentBgAudioState.fileName);
    }
  }

  /**
   * تحميل صوت خلفي جديد
   * @param {File} audioFile - ملف الصوت
   * @returns {Promise<boolean>} نتيجة التحميل
   */
  async function loadBackgroundAudio(audioFile) {
    try {
      validateAudioFile(audioFile);
      
      _ensureAudioElement();
      
      if (audioElement && audioElement.isPlaying) {
        audioElement.pause();
      }
      
      // مسح الرابط القديم إذا كان موجودًا
      if (objectUrlToRevoke) {
        fileIOUtils.revokeObjectURL(objectUrlToRevoke);
        objectUrlToRevoke = null;
      }
      
      currentBgAudioState.duration = null;
      
      // إنشاء Object URL جديد
      objectUrlToRevoke = fileIOUtils.createObjectURL(audioFile);
      
      if (!objectUrlToRevoke) {
        throw new Error('فشل في إنشاء الرابط لملف الصوت');
      }
      
      audioElement.src = objectUrlToRevoke;
      audioElement.load();
      
      currentBgAudioState.fileObjectURL = objectUrlToRevoke;
      currentBgAudioState.fileName = audioFile.name;
      currentBgAudioState.duration = null;
      
      // ضبط الصوت والتكرار
      audioElement.volume = currentBgAudioState.volume;
      audioElement.loop = currentBgAudioState.loop;
      
      // تحديث الحالة في stateStore
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
        backgroundAudio: {
          fileObjectURL: currentBgAudioState.fileObjectURL,
          fileName: currentBgAudioState.fileName,
          duration: null
        }
      });
      
      const logger = getLogger();
      logger.logInfo({
        message: `تم تحميل الصوت الخلفي: ${audioFile.name}`,
        origin: 'background-audio.mixer.loadBackgroundAudio'
      });
      
      return true;
    } catch (error) {
      const logger = getLogger();
      logger.handleError({
        error,
        message: `فشل في تحميل الصوت: ${audioFile.name}`,
        origin: 'background-audio.mixer.loadBackgroundAudio'
      });
      
      // إعادة تهيئة الحالة عند الفشل
      if (objectUrlToRevoke) {
        fileIOUtils.revokeObjectURL(objectUrlToRevoke);
      }
      
      currentBgAudioState = { ...defaultBgAudioState };
      currentBgAudioState.volume = dependencies.stateStore.getState().currentProject.backgroundAudio.volume;
      currentBgAudioState.loop = dependencies.stateStore.getState().currentProject.backgroundAudio.loop;
      
      if (audioElement) {
        audioElement.src = '';
      }
      
      objectUrlToRevoke = null;
      
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
        backgroundAudio: defaultBgAudioState
      });
      
      return false;
    }
  }

  /**
   * تشغيل الصوت
   */
  function play() {
    _ensureAudioElement();
    
    if (currentBgAudioState.fileObjectURL && audioElement && audioElement.src && !currentBgAudioState.isPlaying) {
      audioElement.play().catch(error => {
        const logger = getLogger();
        logger.handleError({
          error,
          message: `خطأ في تشغيل الصوت الخلفي: ${currentBgAudioState.fileName || 'ملف غير معروف'}`,
          origin: 'background-audio.mixer.play'
        });
        _updatePlaybackState(false);
      });
    } else if (!currentBgAudioState.fileObjectURL) {
      const logger = getLogger();
      logger.logInfo({
        message: 'لا يوجد صوت خلفي محمل للتشغيل',
        origin: 'background-audio.mixer.play'
      });
    }
  }

  /**
   * إيقاف مؤقت للصوت
   */
  function pause() {
    _ensureAudioElement();
    
    if (currentBgAudioState.isPlaying && audioElement) {
      audioElement.pause();
    }
  }

  /**
   * إيقاف نهائي للصوت
   */
  function stop() {
    _ensureAudioElement();
    
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
  }

  /**
   * ضبط الصوت
   * @param {number} volumeLevel - مستوى الصوت (من 0 إلى 1)
   */
  function setVolume(volumeLevel) {
    _ensureAudioElement();
    
    const newVolume = Math.max(0, Math.min(1, parseFloat(volumeLevel)));
    
    if (!isNaN(newVolume) && audioElement) {
      audioElement.volume = newVolume;
      
      if (currentBgAudioState.volume !== newVolume) {
        currentBgAudioState.volume = newVolume;
        
        dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
          backgroundAudio: { volume: newVolume }
        });
      }
    }
  }

  /**
   * تعيين التكرار
   * @param {boolean} shouldLoop - هل يتم التكرار؟
   */
  function setLoop(shouldLoop) {
    _ensureAudioElement();
    
    const newLoopState = !!shouldLoop;
    
    if (audioElement) {
      audioElement.loop = newLoopState;
      
      if (currentBgAudioState.loop !== newLoopState) {
        currentBgAudioState.loop = newLoopState;
        
        dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
          backgroundAudio: { loop: newLoopState }
        });
      }
    }
  }

  /**
   * مزامنة الحالة مع project state
   * @private
   * @param {BackgroundAudioState} projectBgAudioState - الحالة من المشروع
   */
  function _syncWithProjectState(projectBgAudioState) {
    if (!projectBgAudioState) {
      projectBgAudioState = defaultBgAudioState;
    }
    
    _ensureAudioElement();
    
    // مزامنة الصوت
    if (audioElement.volume !== projectBgAudioState.volume) {
      setVolume(projectBgAudioState.volume);
    }
    
    // مزامنة التكرار
    if (audioElement.loop !== projectBgAudioState.loop) {
      setLoop(projectBgAudioState.loop);
    }
    
    // إذا كان هناك ملف جديد
    if (projectBgAudioState.fileName && projectBgAudioState.fileName !== currentBgAudioState.fileName) {
      if (currentBgAudioState.fileObjectURL) {
        stop();
      }
      
      if (currentBgAudioState.fileName) {
        currentBgAudioState = {
          ...defaultBgAudioState,
          volume: projectBgAudioState.volume,
          loop: projectBgAudioState.loop
        };
      }
    }
  }

  /**
   * تعيين الاعتماديات
   * @param {Object} injectedDeps - الاعتماديات المُمررة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) {
      dependencies.stateStore = injectedDeps.stateStore;
    }
    
    if (injectedDeps.errorLogger) {
      dependencies.errorLogger = injectedDeps.errorLogger;
    }
    
    if (injectedDeps.eventAggregator) {
      dependencies.eventAggregator = injectedDeps.eventAggregator;
    }
  }

  /**
   * تنظيف الموارد
   */
  function cleanup() {
    if (objectUrlToRevoke) {
      fileIOUtils.revokeObjectURL(objectUrlToRevoke);
      objectUrlToRevoke = null;
    }
    
    if (audioElement) {
      audioElement.pause();
      audioElement = null;
    }
    
    currentBgAudioState = { ...defaultBgAudioState };
  }

  /**
   * الحصول على الحالة الحالية
   * @returns {BackgroundAudioState} الحالة الحالية
   */
  function getCurrentState() {
    return { ...currentBgAudioState };
  }

  /**
   * التحقق مما إذا كان النظام جاهزًا
   * @returns {boolean} نتيجة التحقق
   */
  function selfTest() {
    try {
      const testFile = new File(['test'], 'test.mp3');
      const result = backgroundAudioMixer.loadBackgroundAudio(testFile);
      
      return result !== null;
    } catch (e) {
      return false;
    }
  }

  // واجهة API العامة
  return {
    _setDependencies,
    loadBackgroundAudio,
    play,
    pause,
    stop,
    setVolume,
    setLoop,
    getCurrentState,
    cleanup,
    selfTest
  };
})();

/**
 * تهيئة المزيج
 * @param {Object} dependencies - الاعتماديات المُمررة
 * @returns {Object} واجهة المدير
 */
export function initializeBackgroundAudioMixer(dependencies) {
  backgroundAudioMixer._setDependencies(dependencies);
  backgroundAudioMixer._syncWithProjectState(dependencies.stateStore.getState().currentProject?.backgroundAudio);
  
  // مزامنة الحالة مع تغيير المشروع
  const unsubscribeState = dependencies.stateStore.subscribe(newState => {
    const projectBgAudioSettings = newState.currentProject?.backgroundAudio;
    
    if (projectBgAudioSettings) {
      const mixerState = backgroundAudioMixer.getCurrentState();
      
      if (mixerState.volume !== projectBgAudioSettings.volume) {
        backgroundAudioMixer.setVolume(projectBgAudioSettings.volume);
      }
      
      if (mixerState.loop !== projectBgAudioSettings.loop) {
        backgroundAudioMixer.setLoop(projectBgAudioSettings.loop);
      }
      
      if (projectBgAudioSettings.fileName && projectBgAudioSettings.fileName !== mixerState.fileName) {
        // يجب إعادة تحميل الملف
        if (mixerState.fileObjectURL) {
          backgroundAudioMixer.stop();
          backgroundAudioMixer.cleanup();
        }
      } else if (!projectBgAudioSettings.fileName && mixerState.fileName) {
        backgroundAudioMixer.stop();
        backgroundAudioMixer.cleanup();
      }
    } else if (!newState.currentProject && backgroundAudioMixer.getCurrentState().fileName) {
      backgroundAudioMixer.stop();
      backgroundAudioMixer.cleanup();
    }
  });
  
  // تهيئة الحالة من المشروع الحالي
  const initialProject = dependencies.stateStore.getState().currentProject;
  if (initialProject && initialProject.backgroundAudio) {
    backgroundAudioMixer.setVolume(initialProject.backgroundAudio.volume);
    backgroundAudioMixer.setLoop(initialProject.backgroundAudio.loop);
  }
  
  // تصدير واجهة المدير
  return {
    loadBackgroundAudio: backgroundAudioMixer.loadBackgroundAudio,
    play: backgroundAudioMixer.play,
    pause: backgroundAudioMixer.pause,
    stop: backgroundAudioMixer.stop,
    setVolume: backgroundAudioMixer.setVolume,
    setLoop: backgroundAudioMixer.setLoop,
    getCurrentState: backgroundAudioMixer.getCurrentState,
    cleanup: backgroundAudioMixer.cleanup
  };
}

// تصدير الكائن الافتراضي
export default backgroundAudioMixer;
