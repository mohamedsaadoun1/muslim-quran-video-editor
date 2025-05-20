// js/features/editor-shell/main-toolbar.handler.js
import DOMElements from '../../core/dom-elements.js';
import { 
  ACTIONS, 
  EVENTS,
  APP_CONSTANTS
} from '../../config/app.constants.js';
import notificationPresenter from '../../shared-ui-components/notification.presenter.js';
import modalFactory from '../../shared-ui-components/modal.factory.js';

/**
 * معالج أزرار شريط الأدوات الرئيسي
 */
const mainToolbarHandler = (() => {
  // الاعتمادات
  let dependencies = {
    stateStore: {
      getState: () => ({ 
        activeScreen: 'editor', 
        currentProject: null,
        mainPlaybackState: { isPlaying: false }
      }),
      dispatch: () => {}
    },
    eventAggregator: { 
      publish: () => {}, 
      subscribe: () => ({ unsubscribe: () => {} }) 
    },
    errorLogger: console,
    notificationServiceAPI: { 
      showSuccess: (msg) => {}, 
      showError: (msg) => {}, 
      showWarning: (msg) => {}
    },
    projectActionsAPI: { 
      saveCurrentProject: () => {}, 
      loadNewProject: () => {}
    },
    screenNavigator: { 
      navigateTo: (screen) => {} 
    },
    localizationService: { 
      translate: key => key
    }
  };
  
  // مراجع العناصر
  let backButton, saveButton, themeButton, exportButton, undoButton, redoButton;
  
  /**
   * معالجة زر العودة إلى الشاشة الرئيسية
   * @private
   */
  async function _handleBackToInitialScreen() {
    const currentState = dependencies.stateStore.getState();
    
    if (!currentState || currentState.activeScreen !== 'editor') {
      return;
    }
    
    try {
      // التحقق من وجود تعديلات غير محفوظة
      const projectIsDirty = dependencies.projectActionsAPI.isCurrentProjectDirty(currentState);
      
      if (projectIsDirty) {
        const confirmed = await dependencies.modalFactoryAPI.showConfirm({
          title: dependencies.localizationService.translate('toolbar.confirm.title') || 'تأكيد العودة',
          message: dependencies.localizationService.translate('toolbar.confirm.message') || 'هل أنت متأكد من العودة؟ سيتم فقدان التعديلات غير المحفوظة.',
          confirmText: dependencies.localizationService.translate('button.confirm') || 'تأكيد',
          cancelText: dependencies.localizationService.translate('button.cancel') || 'إلغاء',
          type: 'warning'
        });
        
        if (!confirmed) return;
      }
      
      // التنقل إلى الشاشة الرئيسية
      dependencies.screenNavigator.navigateTo('initial');
      dependencies.eventAggregator.publish(EVENTS.NAVIGATE_TO_SCREEN, {
        screenId: 'initial',
        timestamp: Date.now()
      });
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.toolbar.back') || 'فشل في العودة إلى الشاشة الرئيسية',
        origin: 'MainToolbarHandler._handleBackToInitialScreen'
      });
      
      dependencies.notificationServiceAPI?.showError(
        dependencies.localizationService.translate('toolbar.back.failed') || 'فشل في العودة إلى الشاشة الرئيسية'
      );
    }
  }
  
  /**
   * معالجة زر الحفظ
   * @private
   */
  async function _handleSaveProject() {
    const currentState = dependencies.stateStore.getState();
    const currentProject = currentState.currentProject;
    
    if (!currentProject || !currentProject.id) {
      dependencies.errorLogger.warn({
        message: dependencies.localizationService.translate('warning.project.no.current') || 'لا يوجد مشروع حالي لحفظه',
        origin: 'MainToolbarHandler._handleSaveProject'
      });
      
      dependencies.notificationServiceAPI?.showWarning(
        dependencies.localizationService.translate('project.save.no.current') || 'لا يوجد مشروع حالي لحفظه'
      );
      
      return;
    }
    
    try {
      // التحقق من صحة المشروع
      const projectValidation = dependencies.projectModel.validateProjectData(currentProject);
      
      if (!projectValidation.isValid) {
        dependencies.notificationServiceAPI?.showWarning(
          dependencies.localizationService.translate('project.save.validation.failed', {
            errors: projectValidation.errors.join(', ')
          }) || `بيانات المشروع غير صحيحة: ${projectValidation.errors.join(', ')}`
        );
        
        // إرسال إشعار بالخطأ
        dependencies.eventAggregator.publish(EVENTS.PROJECT_SAVED_FAILED, {
          projectId: currentProject.id,
          timestamp: Date.now(),
          errors: projectValidation.errors
        });
        
        return;
      }
      
      // حفظ المشروع
      const success = dependencies.projectActionsAPI.saveCurrentProject();
      
      if (success) {
        dependencies.eventAggregator.publish(EVENTS.PROJECT_SAVED_SUCCESS, {
          projectId: currentProject.id,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.project.save') || 'فشل في حفظ المشروع',
        origin: 'MainToolbarHandler._handleSaveProject'
      });
      
      dependencies.notificationServiceAPI?.showError(
        dependencies.localizationService.translate('project.save.failed') || 'فشل في حفظ المشروع'
      );
    }
  }
  
  /**
   * معالجة زر التبديل بين السمات
   * @private
   */
  function _handleToggleTheme() {
    try {
      const currentTheme = dependencies.stateStore.getState().currentTheme;
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      
      dependencies.stateStore.dispatch(ACTIONS.SET_THEME, newTheme);
      
      // تحديث واجهة المستخدم
      if (themeButton) {
        themeButton.setAttribute('aria-label', dependencies.localizationService.translate(`theme.${newTheme}`) || newTheme);
        themeButton.classList.toggle('light-mode', newTheme === 'light');
        themeButton.classList.toggle('dark-mode', newTheme === 'dark');
      }
      
      // نشر الحدث
      dependencies.eventAggregator.publish(EVENTS.THEME_CHANGED, {
        oldTheme: currentTheme,
        newTheme: newTheme,
        timestamp: Date.now()
      });
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.theme.toggle') || 'فشل في تبديل السمة',
        origin: 'MainToolbarHandler._handleToggleTheme'
      });
      
      dependencies.notificationServiceAPI?.showError(
        dependencies.localizationService.translate('theme.toggle.failed') || 'فشل في تبديل السمة'
      );
    }
  }
  
  /**
   * معالجة زر التصدير
   * @private
   */
  function _handleExportProject() {
    try {
      const currentState = dependencies.stateStore.getState();
      const currentProject = currentState.currentProject;
      
      if (!currentProject || !currentProject.id) {
        dependencies.errorLogger.warn({
          message: dependencies.localizationService.translate('warning.project.no.current') || 'لا يوجد مشروع حالي للتصدير',
          origin: 'MainToolbarHandler._handleExportProject'
        });
        
        dependencies.notificationServiceAPI?.showWarning(
          dependencies.localizationService.translate('project.export.no.current') || 'لا يوجد مشروع حالي للتصدير'
        );
        
        return;
      }
      
      // التحقق من صحة المشروع
      const projectValidation = dependencies.projectModel.validateProjectData(currentProject);
      
      if (!projectValidation.isValid) {
        dependencies.notificationServiceAPI?.showWarning(
          dependencies.localizationService.translate('project.export.validation.failed', {
            errors: projectValidation.errors.join(', ')
          }) || `بيانات المشروع غير صحيحة: ${projectValidation.errors.join(', ')}`
        );
        return;
      }
      
      // بدء التصدير
      dependencies.eventAggregator.publish(EVENTS.EXPORT_STARTED, {
        projectId: currentProject.id,
        timestamp: Date.now()
      });
      
      if (dependencies.exportRecorderAPI && dependencies.exportRecorderAPI.startRecording) {
        dependencies.exportRecorderAPI.startRecording();
      }
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.project.export') || 'فشل في تصدير المشروع',
        origin: 'MainToolbarHandler._handleExportProject'
      });
      
      dependencies.notificationServiceAPI?.showError(
        dependencies.localizationService.translate('project.export.failed') || 'فشل في تصدير المشروع'
      );
    }
  }
  
  /**
   * معالجة زر التراجع
   * @private
   */
  function _handleUndo() {
    try {
      const currentState = dependencies.stateStore.getState();
      const currentProject = currentState.currentProject;
      
      if (!currentProject || !currentProject.id) return;
      
      if (dependencies.undoRedoAPI && dependencies.undoRedoAPI.undo) {
        dependencies.undoRedoAPI.undo();
      } else {
        dependencies.stateStore.dispatch(ACTIONS.UNDO_STATE);
      }
      
      dependencies.eventAggregator.publish(EVENTS.PROJECT_UNDO, {
        projectId: currentProject.id,
        timestamp: Date.now()
      });
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.undo.operation') || 'فشل في تنفيذ التراجع',
        origin: 'MainToolbarHandler._handleUndo'
      });
      
      dependencies.notificationServiceAPI?.showError(
        dependencies.localizationService.translate('undo.failed') || 'فشل في تنفيذ التراجع'
      );
    }
  }
  
  /**
   * معالجة زر الإعادة
   * @private
   */
  function _handleRedo() {
    try {
      const currentState = dependencies.stateStore.getState();
      const currentProject = currentState.currentProject;
      
      if (!currentProject || !currentProject.id) return;
      
      if (dependencies.undoRedoAPI && dependencies.undoRedoAPI.redo) {
        dependencies.undoRedoAPI.redo();
      } else {
        dependencies.stateStore.dispatch(ACTIONS.REDO_STATE);
      }
      
      dependencies.eventAggregator.publish(EVENTS.PROJECT_REDO, {
        projectId: currentProject.id,
        timestamp: Date.now()
      });
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.redo.operation') || 'فشل في تنفيذ الإعادة',
        origin: 'MainToolbarHandler._handleRedo'
      });
      
      dependencies.notificationServiceAPI?.showError(
        dependencies.localizationService.translate('redo.failed') || 'فشل في تنفيذ الإعادة'
      );
    }
  }
  
  /**
   * معالجة زر البحث الصوتي
   * @private
   */
  function _handleVoiceSearchToggle() {
    try {
      if (!dependencies.quranVoiceInputHandler || !dependencies.quranVoiceInputHandler.toggleListening) {
        dependencies.errorLogger.warn({
          message: dependencies.localizationService.translate('warning.voice.search.not.available') || 'البحث الصوتي غير متاح',
          origin: 'MainToolbarHandler._handleVoiceSearchToggle'
        });
        return;
      }
      
      dependencies.quranVoiceInputHandler.toggleListening();
      dependencies.eventAggregator.publish(EVENTS.VOICE_SEARCH_TOGGLED, {
        timestamp: Date.now()
      });
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.voice.search.toggle') || 'فشل في تبديل البحث الصوتي',
        origin: 'MainToolbarHandler._handleVoiceSearchToggle'
      });
      
      dependencies.notificationServiceAPI?.showError(
        dependencies.localizationService.translate('voice.search.failed') || 'فشل في البحث الصوتي'
      );
    }
  }
  
  /**
   * معالجة زر التشغيل
   * @private
   */
  function _handlePlayToggle() {
    try {
      const currentState = dependencies.stateStore.getState();
      const currentProject = currentState.currentProject;
      
      if (!currentProject || !currentProject.id) {
        dependencies.errorLogger.warn({
          message: dependencies.localizationService.translate('warning.project.no.current') || 'لا يوجد مشروع حالي للتشغيل',
          origin: 'MainToolbarHandler._handlePlayToggle'
        });
        
        dependencies.notificationServiceAPI?.showWarning(
          dependencies.localizationService.translate('playback.no.project') || 'لا يوجد مشروع حالي للتشغيل'
        );
        
        return;
      }
      
      if (dependencies.mainPlaybackAPI) {
        if (dependencies.mainPlaybackAPI.isPlaying()) {
          dependencies.mainPlaybackAPI.pause();
        } else {
          dependencies.mainPlaybackAPI.play();
        }
        
        dependencies.eventAggregator.publish(EVENTS.PLAYBACK_TOGGLED, {
          isPlaying: dependencies.mainPlaybackAPI.isPlaying(),
          timestamp: Date.now()
        });
      }
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.playback.toggle') || 'فشل في تبديل التشغيل',
        origin: 'MainToolbarHandler._handlePlayToggle'
      });
      
      dependencies.notificationServiceAPI?.showError(
        dependencies.localizationService.translate('playback.toggle.failed') || 'فشل في تبديل التشغيل'
      );
    }
  }
  
  /**
   * تحديد الاعتمادات
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
    if (backButton) {
      backButton.removeEventListener('click', _handleBackToInitialScreen);
    }
    
    if (saveButton) {
      saveButton.removeEventListener('click', _handleSaveProject);
    }
    
    if (themeButton) {
      themeButton.removeEventListener('click', _handleToggleTheme);
    }
    
    if (exportButton) {
      exportButton.removeEventListener('click', _handleExportProject);
    }
    
    if (undoButton) {
      undoButton.removeEventListener('click', _handleUndo);
    }
    
    if (redoButton) {
      redoButton.removeEventListener('click', _handleRedo);
    }
    
    dependencies = {};
    backButton = null;
    saveButton = null;
    themeButton = null;
    exportButton = null;
    undoButton = null;
    redoButton = null;
  }
  
  return {
    _setDependencies,
    _handleBackToInitialScreen,
    _handleSaveProject,
    _handleToggleTheme,
    _handleExportProject,
    _handleUndo,
    _handleRedo,
    cleanup
  };
})();

/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 * @returns {Object} - واجهة عامة للوحدة
 */
export function initializeMainToolbarHandler(deps) {
  mainToolbarHandler._setDependencies(deps);
  const {
    stateStore,
    errorLogger,
    eventAggregator,
    localizationService,
    projectActionsAPI
  } = deps;
  
  // تعيين مراجع العناصر
  mainToolbarHandler.backButtonRef = DOMElements.backToInitialScreenBtn;
  mainToolbarHandler.saveButtonRef = DOMElements.saveProjectBtnEditor;
  mainToolbarHandler.themeButtonRef = DOMElements.themeToggleEditor;
  mainToolbarHandler.exportButtonRef = DOMElements.exportProjectBtnEditor;
  mainToolbarHandler.undoButtonRef = DOMElements.undoProjectBtnEditor;
  mainToolbarHandler.redoButtonRef = DOMElements.redoProjectBtnEditor;
  
  // إضافة مستمعي الأحداث
  if (mainToolbarHandler.backButtonRef) {
    mainToolbarHandler.backButtonRef.addEventListener('click', mainToolbarHandler._handleBackToInitialScreen);
  } else {
    errorLogger.warn({
      message: localizationService.translate('warning.toolbar.back.button.not.found') || 'زر العودة غير موجود',
      origin: 'MainToolbarHandler.initializeMainToolbarHandler'
    });
  }
  
  if (mainToolbarHandler.saveButtonRef) {
    mainToolbarHandler.saveButtonRef.addEventListener('click', mainToolbarHandler._handleSaveProject);
  } else {
    errorLogger.warn({
      message: localizationService.translate('warning.toolbar.save.button.not.found') || 'زر الحفظ غير موجود',
      origin: 'MainToolbarHandler.initializeMainToolbarHandler'
    });
  }
  
  if (mainToolbarHandler.themeButtonRef) {
    mainToolbarHandler.themeButtonRef.addEventListener('click', mainToolbarHandler._handleToggleTheme);
  } else {
    errorLogger.warn({
      message: localizationService.translate('warning.toolbar.theme.button.not.found') || 'زر التبديل غير موجود',
      origin: 'MainToolbarHandler.initializeMainToolbarHandler'
    });
  }
  
  if (mainToolbarHandler.exportButtonRef) {
    mainToolbarHandler.exportButtonRef.addEventListener('click', mainToolbarHandler._handleExportProject);
  } else {
    errorLogger.warn({
      message: localizationService.translate('warning.toolbar.export.button.not.found') || 'زر التصدير غير موجود',
      origin: 'MainToolbarHandler.initializeMainToolbarHandler'
    });
  }
  
  if (mainToolbarHandler.undoButtonRef) {
    mainToolbarHandler.undoButtonRef.addEventListener('click', mainToolbarHandler._handleUndo);
  } else {
    errorLogger.warn({
      message: localizationService.translate('warning.toolbar.undo.button.not.found') || 'زر التراجع غير موجود',
      origin: 'MainToolbarHandler.initializeMainToolbarHandler'
    });
  }
  
  if (mainToolbarHandler.redoButtonRef) {
    mainToolbarHandler.redoButtonRef.addEventListener('click', mainToolbarHandler._handleRedo);
  } else {
    errorLogger.warn({
      message: localizationService.translate('warning.toolbar.redo.button.not.found') || 'زر الإعادة غير موجود',
      origin: 'MainToolbarHandler.initializeMainToolbarHandler'
    });
  }
  
  // الاشتراك في أحداث النظام
  const subscription = eventAggregator.subscribe(EVENTS.REQUEST_PROJECT_SAVE, () => {
    mainToolbarHandler._handleSaveProject();
  });
  
  const navigationSubscription = eventAggregator.subscribe(EVENTS.NAVIGATE_TO_EDITOR_NEW_PROJECT, () => {
    mainToolbarHandler._handleBackToInitialScreen();
  });
  
  // تهيئة حالة السمة
  const currentState = stateStore.getState();
  if (currentState && currentState.currentTheme) {
    if (currentState.currentTheme === 'dark') {
      mainToolbarHandler.themeButtonRef?.classList.add('dark-mode');
    } else {
      mainToolbarHandler.themeButtonRef?.classList.add('light-mode');
    }
  }
  
  return {
    cleanup: () => {
      subscription.unsubscribe();
      navigationSubscription.unsubscribe();
      mainToolbarHandler.cleanup();
    }
  };
}
