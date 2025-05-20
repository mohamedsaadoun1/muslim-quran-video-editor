// js/features/keyboard-shortcuts/global.shortcuts.binder.js
import { 
  ACTIONS, 
  EVENTS, 
  APP_CONSTANTS
} from '../../config/app.constants.js';
import notificationPresenter from '../../shared-ui-components/notification.presenter.js';
import modalFactory from '../../shared-ui-components/modal.factory.js';

/**
 * واجهة مُربِط الاختصارات
 */
const globalShortcutsBinder = (() => {
  // الاعتمادات
  let dependencies = {
    stateStore: { 
      getState: () => ({ 
        activeScreen: 'initial',
        currentProject: null,
        mainPlaybackState: { isPlaying: false }
      }),
      dispatch: () => {},
      subscribe: () => (() => {})
    },
    eventAggregator: { 
      publish: () => {}, 
      subscribe: () => ({ unsubscribe: () => {} }) 
    },
    errorLogger: console,
    localizationService: { 
      translate: key => key,
      getCurrentLanguage: () => 'ar'
    },
    mainPlaybackAPI: { 
      play: () => {}, 
      pause: () => {}, 
      next: () => {}, 
      previous: () => {}
    },
    exportRecorderAPI: { 
      startRecording: () => {}, 
      stopRecording: () => {}
    },
    projectActionsAPI: { 
      saveCurrentProject: () => {},
      loadNewProject: () => {},
      loadExistingProjectById: () => {}
    },
    undoRedoAPI: { 
      undo: () => {}, 
      redo: () => {}
    }
  };
  
  // حالة التهيئة
  let isInitialized = false;
  
  /**
   * معالجة حدث ضغط المفاتيح
   * @private
   * @param {KeyboardEvent} event - حدث لوحة المفاتيح
   */
  function _handleKeyDown(event) {
    const { activeScreen, currentProject } = dependencies.stateStore.getState();
    const target = event.target;
    
    // التحقق من أن الحدث قادم من عنصر غير مدخل
    const isInputFocused = _isInputFocused(target);
    
    // في المستقبل يمكن استخدام localizationService لتحديد اللغة
    const isArabic = dependencies.localizationService.getCurrentLanguage() === 'ar';
    
    // التحقق من صحة الحالة
    if (!activeScreen || !currentProject) return;
    
    let commandExecuted = false;
    
    try {
      // اختصارات الحفظ
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        event.stopPropagation();
        
        if (activeScreen === 'editor') {
          dependencies.projectActionsAPI.saveCurrentProject();
          commandExecuted = true;
        }
      } 
      // اختصارات مشروع جديد
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        event.stopPropagation();
        
        if (activeScreen === 'initial') {
          dependencies.projectActionsAPI.loadNewProject();
          commandExecuted = true;
        }
      } 
      // اختصارات فتح المشروع
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
        event.preventDefault();
        event.stopPropagation();
        
        if (activeScreen === 'initial') {
          // في المستقبل سيتم تنفيذ هذا الجزء
          dependencies.notificationServiceAPI?.showInfo(
            dependencies.localizationService.translate('shortcuts.open.project') || 'فتح مشروع'
          );
          commandExecuted = true;
        }
      } 
      // اختصارات التشغيل
      else if (event.key === ' ' && !isInputFocused) {
        event.preventDefault();
        event.stopPropagation();
        
        if (activeScreen === 'editor') {
          const { isPlaying } = dependencies.stateStore.getState().mainPlaybackState || { isPlaying: false };
          
          if (isPlaying) {
            dependencies.mainPlaybackAPI.pause();
            dependencies.eventAggregator.publish(EVENTS.PLAYBACK_PAUSED, { timestamp: Date.now() });
          } else {
            dependencies.mainPlaybackAPI.play();
            dependencies.eventAggregator.publish(EVENTS.PLAYBACK_PLAYING, { timestamp: Date.now() });
          }
          
          commandExecuted = true;
        }
      } 
      // اختصارات التنقل في الآيات
      else if (activeScreen === 'editor' && dependencies.mainPlaybackAPI) {
        // التنقل إلى الآية التالية
        if (event.key === 'ArrowRight' && !isInputFocused) {
          event.preventDefault();
          event.stopPropagation();
          
          dependencies.mainPlaybackAPI.next();
          dependencies.eventAggregator.publish(EVENTS.PLAYBACK_NEXT_AYAH, { timestamp: Date.now() });
          commandExecuted = true;
        } 
        // التنقل إلى الآية السابقة
        else if (event.key === 'ArrowLeft' && !isInputFocused) {
          event.preventDefault();
          event.stopPropagation();
          
          dependencies.mainPlaybackAPI.previous();
          dependencies.eventAggregator.publish(EVENTS.PLAYBACK_PREVIOUS_AYAH, { timestamp: Date.now() });
          commandExecuted = true;
        }
      } 
      // اختصارات التراجع
      else if (activeScreen === 'editor') {
        // التراجع
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
          event.preventDefault();
          event.stopPropagation();
          
          if (dependencies.undoRedoAPI && dependencies.undoRedoAPI.undo) {
            dependencies.undoRedoAPI.undo();
          } else {
            dependencies.stateStore.dispatch(ACTIONS.UNDO_STATE);
          }
          
          dependencies.eventAggregator.publish(EVENTS.PROJECT_UNDO, { timestamp: Date.now() });
          commandExecuted = true;
        } 
        // إعادة
        else if ((event.ctrlKey || event.metaKey) && 
                (event.key.toLowerCase() === 'y' || 
                 (event.shiftKey && event.key.toLowerCase() === 'z'))) {
          event.preventDefault();
          event.stopPropagation();
          
          if (dependencies.undoRedoAPI && dependencies.undoRedoAPI.redo) {
            dependencies.undoRedoAPI.redo();
          } else {
            dependencies.stateStore.dispatch(ACTIONS.REDO_STATE);
          }
          
          dependencies.eventAggregator.publish(EVENTS.PROJECT_REDO, { timestamp: Date.now() });
          commandExecuted = true;
        }
      } 
      // اختصارات التصدير
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        event.stopPropagation();
        
        if (activeScreen === 'editor' && dependencies.exportRecorderAPI?.startRecording) {
          dependencies.exportRecorderAPI.startRecording();
          dependencies.eventAggregator.publish(EVENTS.EXPORT_STARTED, { timestamp: Date.now() });
          commandExecuted = true;
        }
      } 
      // اختصارات البحث الصوتي
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        event.stopPropagation();
        
        if (activeScreen === 'editor' && dependencies.quranVoiceInputHandler?.toggleListening) {
          dependencies.quranVoiceInputHandler.toggleListening();
          dependencies.eventAggregator.publish(EVENTS.VOICE_SEARCH_TOGGLED, { timestamp: Date.now() });
          commandExecuted = true;
        }
      } 
      // اختصارات التنقل بين الشاشات
      else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        event.stopPropagation();
        
        if (activeScreen === 'initial' && dependencies.screenNavigator?.navigateTo) {
          dependencies.screenNavigator.navigateTo('editor');
          dependencies.eventAggregator.publish(EVENTS.NAVIGATE_TO_EDITOR, { timestamp: Date.now() });
          commandExecuted = true;
        }
      }
      
      // إرسال إشعار عند تنفيذ أمر
      if (commandExecuted && dependencies.shortcutCommandLogger) {
        dependencies.shortcutCommandLogger.logCommand(event, activeScreen, currentProject);
      }
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.shortcuts.handler', { key: event.key }) || 
                 `فشل في معالجة اختصار لوحة المفاتيح ${event.key}`,
        origin: 'GlobalShortcutsBinder._handleKeyDown'
      });
      
      dependencies.notificationServiceAPI?.showError(
        dependencies.localizationService.translate('shortcuts.failed') || 'فشل في تنفيذ الأمر'
      );
    }
  }
  
  /**
   * التحقق من أن التركيز على عنصر مدخل
   * @private
   * @param {EventTarget} target - العنصر الذي تم التركيز عليه
   * @returns {boolean} هل العنصر مدخل؟
   */
  function _isInputFocused(target) {
    if (!target) return false;
    
    const tagName = target.tagName?.toUpperCase();
    return (tagName === 'INPUT' || tagName === 'TEXTAREA' || target.isContentEditable);
  }
  
  /**
   * تحديد الاعتمادات
   * @param {Object} injectedDeps - الاعتمادات
   */
  function _setDependencies(injectedDeps) {
    if (!injectedDeps || typeof injectedDeps !== 'object') {
      dependencies.errorLogger.warn({
        message: dependencies.localizationService.translate('warning.dependencies.invalid') || 
                 'الاعتمادات غير صحيحة',
        origin: 'GlobalShortcutsBinder._setDependencies'
      });
      return;
    }
    
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
    document.removeEventListener('keydown', _handleKeyDown);
    dependencies = {};
    isInitialized = false;
    
    dependencies.eventAggregator.publish(EVENTS.SHORTCUTS_CLEANED, { timestamp: Date.now() });
  }
  
  return {
    _setDependencies,
    _handleKeyDown,
    cleanup
  };
})();

/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 * @returns {Object} - واجهة عامة للوحدة
 */
export function initializeGlobalShortcutsBinder(deps) {
  if (globalShortcutsBinder.isInitialized) {
    return globalShortcutsBinder;
  }
  
  globalShortcutsBinder._setDependencies(deps);
  
  // تعيين المستمع العام
  document.addEventListener('keydown', globalShortcutsBinder._handleKeyDown);
  
  // إرسال إشعار بالتهيئة
  deps.eventAggregator.publish(EVENTS.SHORTCUTS_INITIALIZED, {
    timestamp: Date.now(),
    status: 'active'
  });
  
  globalShortcutsBinder.isInitialized = true;
  
  return {
    cleanup: globalShortcutsBinder.cleanup
  };
}

/**
 * تسجيل الأوامر
 */
export const shortcutCommandLogger = (() => {
  // سجل الأوامر
  const commandHistory = [];
  
  /**
   * تسجيل الأمر
   * @param {KeyboardEvent} event - حدث لوحة المفاتيح
   * @param {string} screen - الشاشة الحالية
   * @param {Object} project - المشروع الحالي
   */
  function logCommand(event, screen, project) {
    const command = {
      key: event.key,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      screen,
      projectId: project?.id || null,
      timestamp: Date.now()
    };
    
    // إضافة الأمر إلى السجل
    commandHistory.push(command);
    
    // حذف الأوامر الأقدم من 10 دقائق
    const now = Date.now();
    commandHistory.filter(c => now - c.timestamp > 600000);
    
    return command;
  }
  
  /**
   * الحصول على سجل الأوامر
   * @returns {Array} - سجل الأوامر
   */
  function getCommandHistory() {
    return [...commandHistory];
  }
  
  /**
   * تنظيف السجل
   */
  function clearCommandHistory() {
    commandHistory.length = 0;
  }
  
  return {
    logCommand,
    getCommandHistory,
    clearCommandHistory
  };
})();
