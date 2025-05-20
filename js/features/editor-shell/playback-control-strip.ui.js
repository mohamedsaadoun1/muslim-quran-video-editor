// js/features/editor-shell/playback-control-strip.ui.js
import DOMElements from '../../core/dom-elements.js';
import { 
  ACTIONS, 
  EVENTS,
  APP_CONSTANTS
} from '../../config/app.constants.js';
import notificationPresenter from '../../shared-ui-components/notification.presenter.js';

/**
 * واجهة شريط التحكم في التشغيل
 */
const playbackControlStripUI = (() => {
  // مراجع العناصر
  let playPauseBtn, nextBtn, prevBtn, undoBtn, redoBtn;
  
  // الاعتمادات
  let dependencies = {
    stateStore: {
      getState: () => ({ 
        mainPlaybackState: { isPlaying: false }, 
        undoRedoState: { canUndo: false, canRedo: false },
        currentProject: null
      }),
      dispatch: () => {},
      subscribe: () => (() => {})
    },
    eventAggregator: { 
      publish: () => {}, 
      subscribe: () => ({ unsubscribe: () => {} }) 
    },
    errorLogger: console,
    mainPlaybackAPI: { 
      play: () => {}, 
      pause: () => {},
      next: () => {},
      previous: () => {},
      getIsPlaying: () => false,
      getIsMuted: () => false,
      getVolume: () => 1.0
    },
    localizationService: { 
      translate: (key, fallback) => fallback || key 
    },
    undoRedoAPI: { 
      undo: () => {}, 
      redo: () => {}, 
      canUndo: () => false, 
      canRedo: () => false 
    }
  };
  
  // الحالة الحالية
  let currentState = {
    isPlaying: false,
    canUndo: false,
    canRedo: false,
    playlistIndex: 0,
    playlistLength: 0
  };
  
  /**
   * تحديث زر التشغيل والإيقاف المؤقت
   * @private
   * @param {boolean} isPlaying - هل يجري التشغيل؟
   */
  function _updatePlayPauseButton(isPlaying) {
    try {
      if (!playPauseBtn) return;
      
      const l10n = dependencies.localizationService;
      const icon = isPlaying ? 'pause' : 'play';
      const title = isPlaying ? 
        l10n.translate('playback.pause.title', 'إيقاف مؤقت') :
        l10n.translate('playback.play.title', 'تشغيل');
        
      playPauseBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
      playPauseBtn.title = title;
      playPauseBtn.setAttribute('aria-label', title);
      playPauseBtn.setAttribute('aria-pressed', String(isPlaying));
      
      // تحديث الكلاس لدعم السمات
      playPauseBtn.classList.remove('playing', 'paused');
      playPauseBtn.classList.add(isPlaying ? 'playing' : 'paused');
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.playback.button.update') || 
                 'فشل في تحديث زر التشغيل',
        origin: 'PlaybackControlStripUI._updatePlayPauseButton'
      });
    }
  }
  
  /**
   * تحديث حالة أزرار التراجع والإعادة
   * @private
   * @param {boolean} canUndo - هل يمكن التراجع؟
   * @param {boolean} canRedo - هل يمكن الإعادة؟
   */
  function _updateUndoRedoButtons(canUndo, canRedo) {
    try {
      if (undoBtn) {
        undoBtn.disabled = !canUndo;
        undoBtn.setAttribute('aria-disabled', String(!canUndo));
        undoBtn.classList.toggle('disabled', !canUndo);
      }
      
      if (redoBtn) {
        redoBtn.disabled = !canRedo;
        redoBtn.setAttribute('aria-disabled', String(!canRedo));
        redoBtn.classList.toggle('disabled', !canRedo);
      }
      
      // تحديث الكلاسات لدعم السمات
      if (canUndo) undoBtn.classList.add('undo-enabled');
      else undoBtn.classList.remove('undo-enabled');
      
      if (canRedo) redoBtn.classList.add('redo-enabled');
      else redoBtn.classList.remove('redo-enabled');
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.undo.redo.update') || 
                 'فشل في تحديث أزرار التراجع والإعادة',
        origin: 'PlaybackControlStripUI._updateUndoRedoButtons'
      });
    }
  }
  
  /**
   * تحديث حالة أزرار التنقل
   * @private
   * @param {number} playlistIndex - مؤشر القائمة
   * @param {number} playlistLength - طول القائمة
   */
  function _updateNavigationButtons(playlistIndex, playlistLength) {
    try {
      if (!nextBtn || !prevBtn) return;
      
      const hasNext = playlistIndex < playlistLength - 1;
      const hasPrevious = playlistIndex > 0;
      
      // تعطيل الأزرار بناءً على الحالة
      nextBtn.disabled = !hasNext;
      prevBtn.disabled = !hasPrevious;
      
      // تحديث السمات
      nextBtn.setAttribute('aria-disabled', String(!hasNext));
      prevBtn.setAttribute('aria-disabled', String(!hasPrevious));
      
      // تحديث الكلاسات
      nextBtn.classList.toggle('disabled', !hasNext);
      prevBtn.classList.toggle('disabled', !hasPrevious);
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.navigation.buttons.update') || 
                 'فشل في تحديث أزرار التنقل',
        origin: 'PlaybackControlStripUI._updateNavigationButtons'
      });
    }
  }
  
  /**
   * معالجة زر التشغيل والإيقاف
   * @private
   */
  function _handlePlayPauseClick() {
    try {
      const currentState = dependencies.stateStore.getState();
      const isPlaying = currentState.mainPlaybackState?.isPlaying || false;
      
      if (isPlaying) {
        dependencies.mainPlaybackAPI.pause();
        dependencies.eventAggregator.publish(EVENTS.PLAYBACK_PAUSED, { timestamp: Date.now() });
      } else {
        dependencies.mainPlaybackAPI.play();
        dependencies.eventAggregator.publish(EVENTS.PLAYBACK_PLAYING, { timestamp: Date.now() });
      }
      
      // إرسال إشعار بالنجاح
      notificationPresenter.showNotification({
        message: isPlaying ? 
          dependencies.localizationService.translate('playback.paused') || 'تم الإيقاف المؤقت' :
          dependencies.localizationService.translate('playback.playing') || 'جارٍ التشغيل',
        type: 'info'
      });
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.playback.toggle') || 
                 'فشل في تبديل حالة التشغيل',
        origin: 'PlaybackControlStripUI._handlePlayPauseClick'
      });
      
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('playback.toggle.failed') || 'فشل في تبديل التشغيل',
        type: 'error'
      });
    }
  }
  
  /**
   * معالجة زر التالي
   * @private
   */
  function _handleNextClick() {
    try {
      dependencies.mainPlaybackAPI.next();
      dependencies.eventAggregator.publish(EVENTS.PLAYBACK_NEXT_AYAH, { timestamp: Date.now() });
      
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('playback.next.ayah') || 'الآية التالية',
        type: 'info'
      });
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.playback.next') || 'فشل في الانتقال إلى الآية التالية',
        origin: 'PlaybackControlStripUI._handleNextClick'
      });
      
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('playback.next.failed') || 'فشل في الانتقال إلى الآية التالية',
        type: 'error'
      });
    }
  }
  
  /**
   * معالجة زر السابق
   * @private
   */
  function _handlePreviousClick() {
    try {
      dependencies.mainPlaybackAPI.previous();
      dependencies.eventAggregator.publish(EVENTS.PLAYBACK_PREVIOUS_AYAH, { timestamp: Date.now() });
      
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('playback.previous.ayah') || 'الآية السابقة',
        type: 'info'
      });
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.playback.previous') || 'فشل في الانتقال إلى الآية السابقة',
        origin: 'PlaybackControlStripUI._handlePreviousClick'
      });
      
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('playback.previous.failed') || 'فشل في الانتقال إلى الآية السابقة',
        type: 'error'
      });
    }
  }
  
  /**
   * معالجة زر التراجع
   * @private
   */
  function _handleUndoClick() {
    try {
      if (dependencies.undoRedoAPI && dependencies.undoRedoAPI.undo) {
        dependencies.undoRedoAPI.undo();
      } else {
        dependencies.stateStore.dispatch(ACTIONS.UNDO_STATE);
      }
      
      dependencies.eventAggregator.publish(EVENTS.PROJECT_UNDO, { timestamp: Date.now() });
      
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('project.undo') || 'تم التراجع عن آخر تغيير',
        type: 'info'
      });
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.undo.operation') || 'فشل في تنفيذ التراجع',
        origin: 'PlaybackControlStripUI._handleUndoClick'
      });
      
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('undo.failed') || 'فشل في تنفيذ التراجع',
        type: 'error'
      });
    }
  }
  
  /**
   * معالجة زر الإعادة
   * @private
   */
  function _handleRedoClick() {
    try {
      if (dependencies.undoRedoAPI && dependencies.undoRedoAPI.redo) {
        dependencies.undoRedoAPI.redo();
      } else {
        dependencies.stateStore.dispatch(ACTIONS.REDO_STATE);
      }
      
      dependencies.eventAggregator.publish(EVENTS.PROJECT_REDO, { timestamp: Date.now() });
      
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('project.redo') || 'تم إعادة آخر تغيير',
        type: 'info'
      });
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.redo.operation') || 'فشل في تنفيذ إعادة',
        origin: 'PlaybackControlStripUI._handleRedoClick'
      });
      
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('redo.failed') || 'فشل في تنفيذ إعادة',
        type: 'error'
      });
    }
  }
  
  /**
   * تحديث الحالة بناءً على بيانات جديدة
   * @param {Object} newState - الحالة الجديدة
   */
  function _updateUIFromState(newState) {
    try {
      const mainPlaybackState = newState.mainPlaybackState || { isPlaying: false };
      const undoRedoState = newState.undoRedoState || { canUndo: false, canRedo: false };
      const currentProject = newState.currentProject;
      
      // تحديث التشغيل
      if (mainPlaybackState.isPlaying !== undefined && 
          mainPlaybackState.isPlaying !== currentState.isPlaying) {
        _updatePlayPauseButton(mainPlaybackState.isPlaying);
        currentState.isPlaying = mainPlaybackState.isPlaying;
      }
      
      // تحديث التراجع والإعادة
      if (undoRedoState.canUndo !== currentState.canUndo || 
          undoRedoState.canRedo !== currentState.canRedo) {
        _updateUndoRedoButtons(undoRedoState.canUndo, undoRedoState.canRedo);
        currentState.canUndo = undoRedoState.canUndo;
        currentState.canRedo = undoRedoState.canRedo;
      }
      
      // تحديث التنقل
      if (currentProject && currentProject.playlist) {
        const playlist = currentProject.playlist;
        const playlistIndex = currentProject.playlistIndex || 0;
        const playlistLength = playlist.length || 0;
        
        if (playlistIndex !== currentState.playlistIndex || 
            playlistLength !== currentState.playlistLength) {
          _updateNavigationButtons(playlistIndex, playlistLength);
          currentState.playlistIndex = playlistIndex;
          currentState.playlistLength = playlistLength;
        }
      }
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.ui.update') || 'فشل في تحديث واجهة المستخدم',
        origin: 'PlaybackControlStripUI._updateUIFromState'
      });
    }
  }
  
  /**
   * تحديد الاعتمادات
   * @private
   * @param {Object} injectedDeps - الاعتمادات
   */
  function _setDependencies(injectedDeps) {
    Object.keys(injectedDeps).forEach(key => {
      if (injectedDeps[key]) {
        dependencies[key] = injectedDeps[key];
      }
    });
  }
  
  /**
   * تنظيف الموارد
   */
  function cleanup() {
    // إزالة مستمعي الأحداث
    if (playPauseBtn) {
      playPauseBtn.removeEventListener('click', _handlePlayPauseClick);
    }
    
    if (nextBtn) {
      nextBtn.removeEventListener('click', _handleNextClick);
    }
    
    if (prevBtn) {
      prevBtn.removeEventListener('click', _handlePreviousClick);
    }
    
    if (undoBtn) {
      undoBtn.removeEventListener('click', _handleUndoClick);
    }
    
    if (redoBtn) {
      redoBtn.removeEventListener('click', _handleRedoClick);
    }
    
    // إلغاء الاشتراك
    if (unsubscribeState) {
      unsubscribeState();
    }
    
    // تفريغ المتغيرات
    dependencies = {};
    currentState = {};
    playPauseBtn = null;
    nextBtn = null;
    prevBtn = null;
    undoBtn = null;
    redoBtn = null;
  }
  
  return {
    _setDependencies,
    _updateUIFromState,
    cleanup
  };
})();

/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 * @returns {Object} - واجهة عامة للوحدة
 */
export function initializePlaybackControlStrip(deps) {
  playbackControlStripUI._setDependencies(deps);
  const {
    stateStore,
    errorLogger,
    eventAggregator,
    localizationService
  } = deps;
  
  // تعيين مراجع العناصر
  playbackControlStripUI.playPauseBtnRef = DOMElements.playPauseMainBtn;
  playbackControlStripUI.nextBtnRef = DOMElements.nextAyahBtn;
  playbackControlStripUI.prevBtnRef = DOMElements.prevAyahBtn;
  playbackControlStripUI.undoBtnRef = DOMElements.undoBtn;
  playbackControlStripUI.redoBtnRef = DOMElements.redoBtn;
  
  // التحقق من وجود العناصر
  const missingElements = [];
  
  if (!playbackControlStripUI.playPauseBtnRef) missingElements.push('playPauseBtn');
  if (!playbackControlStripUI.nextBtnRef) missingElements.push('nextBtn');
  if (!playbackControlStripUI.prevBtnRef) missingElements.push('prevBtn');
  if (!playbackControlStripUI.undoBtnRef) missingElements.push('undoBtn');
  if (!playbackControlStripUI.redoBtnRef) missingElements.push('redoBtn');
  
  if (missingElements.length > 0) {
    (errorLogger.logWarning || console.warn).call(errorLogger, {
      message: localizationService.translate('warning.playback.elements.missing', {
        elements: missingElements.join(', ')
      }) || 
      `العناصر التالية غير موجودة: ${missingElements.join(', ')}`,
      origin: 'PlaybackControlStripUI.initializePlaybackControlStrip'
    });
    
    notificationPresenter.showNotification({
      message: localizationService.translate('playback.elements.missing', {
        elements: missingElements.join(', ')
      }) || 
      `بعض عناصر التحكم غير موجودة: ${missingElements.join(', ')}`,
      type: 'warning'
    });
  }
  
  // تعيين مراجع العناصر
  const playPauseBtn = playbackControlStripUI.playPauseBtnRef;
  const nextBtn = playbackControlStripUI.nextBtnRef;
  const prevBtn = playbackControlStripUI.prevBtnRef;
  const undoBtn = playbackControlStripUI.undoBtnRef;
  const redoBtn = playbackControlStripUI.redoBtnRef;
  
  // --- وظائف محلية ---
  /**
   * معالجة محلية لزر التشغيل والإيقاف
   * @private
   */
  const _handlePlayPauseLocal = () => {
    const currentState = stateStore.getState();
    const isPlaying = currentState.mainPlaybackState?.isPlaying || false;
    
    if (isPlaying) {
      dependencies.mainPlaybackAPI.pause();
      eventAggregator.publish(EVENTS.PLAYBACK_PAUSED, { timestamp: Date.now() });
    } else {
      dependencies.mainPlaybackAPI.play();
      eventAggregator.publish(EVENTS.PLAYBACK_PLAYING, { timestamp: Date.now() });
    }
    
    notificationPresenter.showNotification({
      message: isPlaying ? 
        localizationService.translate('playback.paused') || 'تم الإيقاف المؤقت' :
        localizationService.translate('playback.playing') || 'جارٍ التشغيل',
      type: 'info'
    });
  };
  
  /**
   * معالجة محلية لزر التالي
   * @private
   */
  const _handleNextLocal = () => {
    dependencies.mainPlaybackAPI.next();
    eventAggregator.publish(EVENTS.PLAYBACK_NEXT_AYAH, { timestamp: Date.now() });
  };
  
  /**
   * معالجة محلية لزر السابق
   * @private
   */
  const _handlePreviousLocal = () => {
    dependencies.mainPlaybackAPI.previous();
    eventAggregator.publish(EVENTS.PLAYBACK_PREVIOUS_AYAH, { timestamp: Date.now() });
  };
  
  /**
   * معالجة محلية لزر التراجع
   * @private
   */
  const _handleUndoLocal = () => {
    if (dependencies.undoRedoAPI && dependencies.undoRedoAPI.undo) {
      dependencies.undoRedoAPI.undo();
    } else {
      dependencies.stateStore.dispatch(ACTIONS.UNDO_STATE);
    }
    
    eventAggregator.publish(EVENTS.PROJECT_UNDO, { timestamp: Date.now() });
  };
  
  /**
   * معالجة محلية لزر الإعادة
   * @private
   */
  const _handleRedoLocal = () => {
    if (dependencies.undoRedoAPI && dependencies.undoRedoAPI.redo) {
      dependencies.undoRedoAPI.redo();
    } else {
      dependencies.stateStore.dispatch(ACTIONS.REDO_STATE);
    }
    
    eventAggregator.publish(EVENTS.PROJECT_REDO, { timestamp: Date.now() });
  };
  
  // --- تعيين مستمعي الأحداث ---
  // تعيين مستمعي الأحداث
  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', _handlePlayPauseLocal);
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', _handleNextLocal);
  }
  
  if (prevBtn) {
    prevBtn.addEventListener('click', _handlePreviousLocal);
  }
  
  if (undoBtn) {
    undoBtn.addEventListener('click', _handleUndoLocal);
  }
  
  if (redoBtn) {
    redoBtn.addEventListener('click', _handleRedoLocal);
  }
  
  // --- الاشتراك في تغيير الحالة ---
  const unsubscribeState = stateStore.subscribe((newState) => {
    const mainPlaybackState = newState.mainPlaybackState || { isPlaying: false };
    const undoRedoState = newState.undoRedoState || { canUndo: false, canRedo: false };
    const currentProject = newState.currentProject;
    
    // تحديث التشغيل
    if (mainPlaybackState.isPlaying !== undefined && 
        mainPlaybackState.isPlaying !== currentState.isPlaying) {
      _updatePlayPauseButton(mainPlaybackState.isPlaying);
      currentState.isPlaying = mainPlaybackState.isPlaying;
    }
    
    // تحديث التراجع والإعادة
    if (undoRedoState.canUndo !== currentState.canUndo || 
        undoRedoState.canRedo !== currentState.canRedo) {
      _updateUndoRedoButtonsLocal(undoRedoState.canUndo, undoRedoState.canRedo);
      currentState.canUndo = undoRedoState.canUndo;
      currentState.canRedo = undoRedoState.canRedo;
    }
    
    // تحديث التنقل
    if (currentProject && currentProject.playlist) {
      const playlist = currentProject.playlist;
      const playlistIndex = currentProject.playlistIndex || 0;
      const playlistLength = playlist.length || 0;
      
      if (playlistIndex !== currentState.playlistIndex || 
          playlistLength !== currentState.playlistLength) {
        _updateNavigationButtonsLocal(playlistIndex, playlistLength);
        currentState.playlistIndex = playlistIndex;
        currentState.playlistLength = playlistLength;
      }
    }
  });
  
  // --- التحقق من صحة الحالة ---
  const initialMainState = stateStore.getState().mainPlaybackState || { isPlaying: false };
  const initialUndoRedoState = stateStore.getState().undoRedoState || { canUndo: false, canRedo: false };
  const initialProjectState = stateStore.getState().currentProject;
  
  // تحديث الحالة الافتراضية
  if (initialProjectState && initialProjectState.playlist) {
    currentState.playlistIndex = initialProjectState.playlistIndex || 0;
    currentState.playlistLength = initialProjectState.playlist.length || 0;
  }
  
  // تحديث الزر بناءً على الحالة الافتراضية
  _updatePlayPauseButtonLocal(initialMainState.isPlaying);
  _updateUndoRedoButtonsLocal(initialUndoRedoState.canUndo, initialUndoRedoState.canRedo);
  
  // --- وظائف دعم ---
  /**
   * التحقق من صحة المؤشر
   * @private
   * @param {number} index - المؤشر
   * @param {number} length - الطول
   * @returns {boolean} هل المؤشر صالح؟
   */
  function _isValidIndex(index, length) {
    return typeof index === 'number' && index >= 0 && index < length;
  }
  
  /**
   * تحديث زر التشغيل والإيقاف بناءً على الحالة
   * @private
   * @param {boolean} isPlaying - هل يجري التشغيل؟
   */
  function _updatePlayPauseButtonLocal(isPlaying) {
    if (!playPauseBtn) return;
    
    const l10n = localizationService.translate;
    const icon = isPlaying ? 'pause' : 'play';
    const title = isPlaying ? 
      l10n('playback.pause.title', 'إيقاف مؤقت') :
      l10n('playback.play.title', 'تشغيل');
      
    playPauseBtn.innerHTML = `<i class="fas fa-${icon}"></i>`;
    playPauseBtn.title = title;
    playPauseBtn.setAttribute('aria-label', title);
    playPauseBtn.setAttribute('aria-pressed', String(isPlaying));
    playPauseBtn.classList.toggle('playing', isPlaying);
    playPauseBtn.classList.toggle('paused', !isPlaying);
  }
  
  /**
   * تحديث أزرار التراجع والإعادة
   * @private
   * @param {boolean} canUndo - هل يمكن التراجع؟
   * @param {boolean} canRedo - هل يمكن الإعادة؟
   */
  function _updateUndoRedoButtonsLocal(canUndo, canRedo) {
    if (!undoBtn || !redoBtn) return;
    
    undoBtn.disabled = !canUndo;
    redoBtn.disabled = !canRedo;
    
    undoBtn.setAttribute('aria-disabled', String(!canUndo));
    redoBtn.setAttribute('aria-disabled', String(!canRedo));
    
    undoBtn.classList.toggle('enabled', canUndo);
    redoBtn.classList.toggle('enabled', canRedo);
  }
  
  /**
   * تحديث أزرار التنقل
   * @private
   * @param {number} playlistIndex - مؤشر القائمة
   * @param {number} playlistLength - طول القائمة
   */
  function _updateNavigationButtonsLocal(playlistIndex, playlistLength) {
    if (!nextBtn || !prevBtn) return;
    
    const hasNext = _isValidIndex(playlistIndex, playlistLength);
    const hasPrevious = _isValidIndex(playlistIndex, playlistLength);
    
    nextBtn.disabled = !hasNext;
    prevBtn.disabled = !hasPrevious;
    
    nextBtn.setAttribute('aria-disabled', String(!hasNext));
    prevBtn.setAttribute('aria-disabled', String(!hasPrevious));
    
    nextBtn.classList.toggle('enabled', hasNext);
    prevBtn.classList.toggle('enabled', hasPrevious);
  }
  
  return {
    cleanup: () => {
      unsubscribeState();
      
      if (playPauseBtn) {
        playPauseBtn.removeEventListener('click', _handlePlayPauseLocal);
      }
      
      if (nextBtn) {
        nextBtn.removeEventListener('click', _handleNextLocal);
      }
      
      if (prevBtn) {
        prevBtn.removeEventListener('click', _handlePreviousLocal);
      }
      
      if (undoBtn) {
        undoBtn.removeEventListener('click', _handleUndoLocal);
      }
      
      if (redoBtn) {
        redoBtn.removeEventListener('click', _handleRedoLocal);
      }
      
      dependencies.eventAggregator.publish(EVENTS.PLAYBACK_CONTROLS_CLEANED, {
        timestamp: Date.now()
      });
    }
  };
}

/**
 * وظيفة التهيئة العامة
 * @param {Object} deps - الاعتمادات
 * @returns {Object} - واجهة عامة للوحدة
 */
export function initializePlaybackControlStripUI(deps) {
  const {
    stateStore,
    errorLogger,
    eventAggregator,
    localizationService
  } = deps;
  
  // تعيين الاعتمادات
  playbackControlStripUI._setDependencies(deps);
  
  // تعيين مراجع العناصر
  playbackControlStripUI.playPauseBtnRef = DOMElements.playPauseMainBtn;
  playbackControlStripUI.nextBtnRef = DOMElements.nextAyahBtn;
  playbackControlStripUI.prevBtnRef = DOMElements.prevAyahBtn;
  playbackControlStripUI.undoBtnRef = DOMElements.undoBtn;
  playbackControlStripUI.redoBtnRef = DOMElements.redoBtn;
  
  // التحقق من وجود العناصر
  const missingElements = [];
  
  if (!playbackControlStripUI.playPauseBtnRef) missingElements.push('playPauseBtn');
  if (!playbackControlStripUI.nextBtnRef) missingElements.push('nextBtn');
  if (!playbackControlStripUI.prevBtnRef) missingElements.push('prevBtn');
  if (!playbackControlStripUI.undoBtnRef) missingElements.push('undoBtn');
  if (!playbackControlStripUI.redoBtnRef) missingElements.push('redoBtn');
  
  if (missingElements.length > 0) {
    errorLogger.warn({
      message: localizationService.translate('warning.playback.controls.missing', {
        elements: missingElements.join(', ')
      }) || `عناصر التحكم غير موجودة: ${missingElements.join(', ')}`,
      origin: 'PlaybackControlStripUI.initializePlaybackControlStripUI'
    });
    
    notificationPresenter.showNotification({
      message: localizationService.translate('playback.controls.missing', {
        elements: missingElements.join(', ')
      }) || `بعض عناصر التحكم غير موجودة: ${missingElements.join(', ')}`,
      type: 'warning'
    });
  }
  
  // تعيين مستمعي الأحداث
  if (playbackControlStripUI.playPauseBtnRef) {
    playbackControlStripUI.playPauseBtnRef.addEventListener('click', () => {
      const currentState = stateStore.getState();
      const isPlaying = currentState.mainPlaybackState?.isPlaying || false;
      
      if (isPlaying) {
        dependencies.mainPlaybackAPI.pause();
        eventAggregator.publish(EVENTS.PLAYBACK_PAUSED, { timestamp: Date.now() });
      } else {
        dependencies.mainPlaybackAPI.play();
        eventAggregator.publish(EVENTS.PLAYBACK_PLAYING, { timestamp: Date.now() });
      }
    });
  }
  
  if (playbackControlStripUI.nextBtnRef) {
    playbackControlStripUI.nextBtnRef.addEventListener('click', () => {
      dependencies.mainPlaybackAPI.next();
      eventAggregator.publish(EVENTS.PLAYBACK_NEXT_AYAH, { timestamp: Date.now() });
    });
  }
  
  if (playbackControlStripUI.prevBtnRef) {
    playbackControlStripUI.prevBtnRef.addEventListener('click', () => {
      dependencies.mainPlaybackAPI.previous();
      eventAggregator.publish(EVENTS.PLAYBACK_PREVIOUS_AYAH, { timestamp: Date.now() });
    });
  }
  
  if (playbackControlStripUI.undoBtnRef) {
    playbackControlStripUI.undoBtnRef.addEventListener('click', () => {
      if (deps.undoRedoAPI?.undo) {
        deps.undoRedoAPI.undo();
      } else {
        deps.stateStore.dispatch(ACTIONS.UNDO_STATE);
      }
      
      eventAggregator.publish(EVENTS.PROJECT_UNDO, { timestamp: Date.now() });
    });
  }
  
  if (playbackControlStripUI.redoBtnRef) {
    playbackControlStripUI.redoBtnRef.addEventListener('click', () => {
      if (deps.undoRedoAPI?.redo) {
        deps.undoRedoAPI.redo();
      } else {
        deps.stateStore.dispatch(ACTIONS.REDO_STATE);
      }
      
      eventAggregator.publish(EVENTS.PROJECT_REDO, { timestamp: Date.now() });
    });
  }
  
  // الاشتراك في تغيير الحالة
  const unsubscribeState = stateStore.subscribe((newState) => {
    const mainPlaybackState = newState.mainPlaybackState || { isPlaying: false };
    const undoRedoState = newState.undoRedoState || { canUndo: false, canRedo: false };
    const currentProject = newState.currentProject;
    
    // تحديث التشغيل
    if (mainPlaybackState.isPlaying !== undefined && 
        mainPlaybackState.isPlaying !== currentState.isPlaying) {
      _updatePlayPauseButtonLocal(mainPlaybackState.isPlaying);
      currentState.isPlaying = mainPlaybackState.isPlaying;
    }
    
    // تحديث التراجع والإعادة
    if (undoRedoState.canUndo !== currentState.canUndo || 
        undoRedoState.canRedo !== currentState.canRedo) {
      _updateUndoRedoButtonsLocal(undoRedoState.canUndo, undoRedoState.canRedo);
      currentState.canUndo = undoRedoState.canUndo;
      currentState.canRedo = undoRedoState.canRedo;
    }
    
    // تحديث التنقل
    if (currentProject && currentProject.playlist) {
      const playlist = currentProject.playlist;
      const playlistIndex = currentProject.playlistIndex || 0;
      const playlistLength = playlist.length || 0;
      
      if (playlistIndex !== currentState.playlistIndex || 
          playlistLength !== currentState.playlistLength) {
        _updateNavigationButtonsLocal(playlistIndex, playlistLength);
        currentState.playlistIndex = playlistIndex;
        currentState.playlistLength = playlistLength;
      }
    }
  });
  
  // --- الحالة الافتراضية ---
  const initialMainState = stateStore.getState().mainPlaybackState || { isPlaying: false };
  const initialUndoRedoState = stateStore.getState().undoRedoState || { canUndo: false, canRedo: false };
  const initialProjectState = stateStore.getState().currentProject;
  
  // تعيين المؤشرات الافتراضية
  currentState.playlistIndex = initialProjectState?.playlistIndex || 0;
  currentState.playlistLength = initialProjectState?.playlist?.length || 0;
  
  // تحديث الحالة الافتراضية
  _updatePlayPauseButtonLocal(initialMainState.isPlaying);
  _updateUndoRedoButtonsLocal(initialUndoRedoState.canUndo, initialUndoRedoState.canRedo);
  
  if (initialProjectState && initialProjectState.playlist) {
    _updateNavigationButtonsLocal(
      currentState.playlistIndex,
      currentState.playlistLength
    );
  }
  
  // --- تنظيف الموارد ---
  function cleanup() {
    unsubscribeState();
    
    if (playbackControlStripUI.playPauseBtnRef) {
      playbackControlStripUI.playPauseBtnRef.removeEventListener('click', _handlePlayPauseLocal);
    }
    
    if (playbackControlStripUI.nextBtnRef) {
      playbackControlStripUI.nextBtnRef.removeEventListener('click', _handleNextLocal);
    }
    
    if (playbackControlStripUI.prevBtnRef) {
      playbackControlStripUI.prevBtnRef.removeEventListener('click', _handlePreviousLocal);
    }
    
    if (playbackControlStripUI.undoBtnRef) {
      playbackControlStripUI.undoBtnRef.removeEventListener('click', _handleUndoLocal);
    }
    
    if (playbackControlStripUI.redoBtnRef) {
      playbackControlStripUI.redoBtnRef.removeEventListener('click', _handleRedoLocal);
    }
    
    dependencies.eventAggregator.publish(EVENTS.PLAYBACK_CONTROLS_CLEANED, {
      timestamp: Date.now()
    });
    
    console.info('[PlaybackControlStripUI] تم تنظيف الموارد.');
  }
  
  return {
    cleanup
  };
}
