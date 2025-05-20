// js/features/editor-shell/screen.navigator.js
import DOMElements from '../../core/dom-elements.js';
import { 
  ACTIONS, 
  EVENTS,
  APP_CONSTANTS
} from '../../config/app.constants.js';
import notificationPresenter from '../../shared-ui-components/notification.presenter.js';
import modalFactory from '../../shared-ui-components/modal.factory.js';

/**
 * ناقل الشاشات
 */
const screenNavigator = (() => {
  // مراجع العناصر
  let initialScreenElement = null;
  let editorScreenElement = null;
  let currentActiveScreenId = null;
  
  // الاعتمادات
  let dependencies = {
    stateStore: {
      getState: () => ({ 
        activeScreen: 'initial', 
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
    notificationServiceAPI: { 
      showSuccess: (msg) => {}, 
      showError: (msg) => {}, 
      showWarning: (msg) => {}
    },
    localizationService: { 
      translate: key => key
    }
  };
  
  /**
   * التنقل إلى شاشة معينة
   * @private
   * @param {string} screenId - معرف الشاشة
   */
  function _navigateToScreen(screenId) {
    if (!initialScreenElement || !editorScreenElement) {
      dependencies.errorLogger.error({
        message: dependencies.localizationService.translate('error.screens.not.found') || 'عناصر الشاشات غير موجودة',
        origin: 'ScreenNavigator._navigateToScreen'
      });
      return;
    }
    
    if (currentActiveScreenId === screenId) return;
    
    try {
      // إخفاء جميع الشاشات
      initialScreenElement.classList.remove('active-screen');
      initialScreenElement.style.display = 'none';
      editorScreenElement.classList.remove('active-screen');
      editorScreenElement.style.display = 'none';
      
      // تحديد الشاشة المستهدفة
      let targetEl = null;
      if (screenId === 'initial') {
        targetEl = initialScreenElement;
      } else if (screenId === 'editor') {
        targetEl = editorScreenElement;
      }
      
      // عرض الشاشة
      if (targetEl) {
        targetEl.style.display = APP_CONSTANTS.SCREEN_DISPLAY_MODE || 'flex';
        targetEl.classList.add('active-screen');
        currentActiveScreenId = screenId;
        
        // تحديث الحالة
        if (dependencies.stateStore.getState().activeScreen !== screenId) {
          dependencies.stateStore.dispatch(ACTIONS.SET_ACTIVE_SCREEN, screenId, {
            skipHistory: true
          });
        }
        
        // إرسال إشعار بالتنقل
        dependencies.eventAggregator.publish(EVENTS.SCREEN_NAVIGATED, {
          screenId,
          timestamp: Date.now()
        });
        
        // تحديث عنوان الصفحة
        if (APP_CONSTANTS.UPDATE_PAGE_TITLE) {
          document.title = dependencies.localizationService.translate(`screen.${screenId}.title`) || screenId;
        }
      } else {
        dependencies.errorLogger.warn({
          message: dependencies.localizationService.translate('warning.screen.not.recognized', { id: screenId }) || 
                   `الشاشة ${screenId} غير معروفة`,
          origin: 'ScreenNavigator._navigateToScreen'
        });
      }
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.screen.navigation') || 'فشل في التنقل بين الشاشات',
        origin: 'ScreenNavigator._navigateToScreen'
      });
      
      dependencies.notificationServiceAPI?.showError(
        dependencies.localizationService.translate('screen.navigation.failed') || 'فشل في التنقل بين الشاشات'
      );
    }
  }
  
  /**
   * معالجة أحداث التنقل
   * @private
   * @param {Object} navigationData - بيانات التنقل
   */
  function _handleNavigationEvent(navigationData) {
    if (!navigationData || !navigationData.screenId) return;
    
    try {
      const { screenId, projectToLoad } = navigationData;
      
      if (screenId === 'editor' && projectToLoad) {
        dependencies.stateStore.dispatch(ACTIONS.LOAD_PROJECT, { ...projectToLoad });
        dependencies.eventAggregator.publish(EVENTS.PROJECT_LOADED, projectToLoad);
      } else if (screenId === 'editor' && navigationData.newProject) {
        dependencies.stateStore.dispatch(ACTIONS.CREATE_NEW_PROJECT_AND_NAVIGATE);
      } else {
        _navigateToScreen(screenId);
      }
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.navigation.process') || 'فشل في تنفيذ التنقل',
        origin: 'ScreenNavigator._handleNavigationEvent'
      });
    }
  }
  
  /**
   * التحقق من صحة التنقل بين الشاشات
   * @private
   * @param {string} screenId - معرف الشاشة
   * @returns {boolean} هل التنقل مسموح؟
   */
  function _validateScreenNavigation(screenId) {
    if (!screenId || !['initial', 'editor'].includes(screenId)) {
      dependencies.errorLogger.warn({
        message: dependencies.localizationService.translate('warning.screen.id.invalid', { id: screenId }) || 
                 `معرف الشاشة غير صحيح: ${screenId}`,
        origin: 'ScreenNavigator._validateScreenNavigation'
      });
      return false;
    }
    
    return true;
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
    // إزالة المستمعين
    if (initialScreenElement) {
      initialScreenElement.removeEventListener('transitionend', _handleScreenTransition);
      initialScreenElement.removeEventListener('animationend', _handleScreenAnimation);
    }
    
    if (editorScreenElement) {
      editorScreenElement.removeEventListener('transitionend', _handleScreenTransition);
      editorScreenElement.removeEventListener('animationend', _handleScreenAnimation);
    }
    
    dependencies = {};
    initialScreenElement = null;
    editorScreenElement = null;
    currentActiveScreenId = null;
    
    dependencies.eventAggregator.publish(EVENTS.SCREEN_NAVIGATOR_CLEANED, {
      timestamp: Date.now()
    });
  }
  
  /**
   * معالجة انتهاء التحول بين الشاشات
   * @private
   */
  function _handleScreenTransition(event) {
    dependencies.eventAggregator.publish(EVENTS.SCREEN_TRANSITION_ENDED, {
      screenId: currentActiveScreenId,
      element: event.target.id,
      timestamp: Date.now()
    });
  }
  
  /**
   * معالجة انتهاء التأثير بين الشاشات
   * @private
   */
  function _handleScreenAnimation(event) {
    dependencies.eventAggregator.publish(EVENTS.SCREEN_ANIMATION_ENDED, {
      screenId: currentActiveScreenId,
      element: event.target.id,
      timestamp: Date.now()
    });
  }
  
  return {
    _setDependencies,
    _navigateToScreen,
    _handleNavigationEvent,
    cleanup,
    _handleScreenTransition,
    _handleScreenAnimation
  };
})();

/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 * @returns {Object} - واجهة عامة للوحدة
 */
export function initializeScreenNavigator(deps) {
  screenNavigator._setDependencies(deps);
  const {
    stateStore,
    eventAggregator,
    errorLogger,
    localizationService
  } = deps;
  
  // تعيين مراجع العناصر
  screenNavigator.initialScreenElRef = DOMElements.initialScreen;
  screenNavigator.editorScreenElRef = DOMElements.editorScreen;
  
  if (!screenNavigator.initialScreenElRef || !screenNavigator.editorScreenElRef) {
    errorLogger.warn({
      message: localizationService.translate('warning.screens.elements.not.found') || 'عناصر الشاشات غير موجودة',
      origin: 'initializeScreenNavigator'
    });
    
    return { cleanup: () => {} };
  }
  
  // تعيين المتغيرات المحلية
  let initialScreenElementLocal = screenNavigator.initialScreenElRef;
  let editorScreenElementLocal = screenNavigator.editorScreenElRef;
  let currentActiveScreenIdLocal = stateStore.getState().activeScreen || 'initial';
  
  // --- وظائف التنقل ---
  const _navigateToScreenLocal = (screenId) => {
    if (!_validateScreenNavigation(screenId)) return;
    
    try {
      // إخفاء جميع الشاشات
      initialScreenElementLocal.classList.remove('active-screen');
      initialScreenElementLocal.style.display = 'none';
      editorScreenElementLocal.classList.remove('active-screen');
      editorScreenElementLocal.style.display = 'none';
      
      // تحديد الشاشة المستهدفة
      let targetEl = null;
      if (screenId === 'initial') {
        targetEl = initialScreenElementLocal;
      } else if (screenId === 'editor') {
        targetEl = editorScreenElementLocal;
      }
      
      if (targetEl) {
        // عرض الشاشة
        targetEl.style.display = APP_CONSTANTS.SCREEN_DISPLAY_MODE || 'flex';
        targetEl.classList.add('active-screen');
        currentActiveScreenIdLocal = screenId;
        
        // تحديث الحالة
        if (stateStore.getState().activeScreen !== screenId) {
          stateStore.dispatch(ACTIONS.SET_ACTIVE_SCREEN, screenId, {
            skipHistory: true
          });
        }
        
        // نشر الحدث
        eventAggregator.publish(EVENTS.SCREEN_NAVIGATED, {
          screenId,
          timestamp: Date.now()
        });
        
        // تحديث عنوان الصفحة
        if (APP_CONSTANTS.UPDATE_PAGE_TITLE) {
          document.title = localizationService.translate(`screen.${screenId}.title`) || screenId;
        }
      }
    } catch (error) {
      errorLogger.error({
        error,
        message: localizationService.translate('error.screen.navigation') || 'فشل في التنقل بين الشاشات',
        origin: 'initializeScreenNavigator._navigateToScreenLocal'
      });
      
      notificationPresenter.showNotification({
        message: localizationService.translate('screen.navigation.failed') || 'فشل في التنقل بين الشاشات',
        type: 'error'
      });
    }
  };
  
  /**
   * التحقق من صحة التنقل بين الشاشات
   * @param {string} screenId - معرف الشاشة
   * @returns {boolean} هل التنقل مسموح؟
   */
  function _validateScreenNavigation(screenId) {
    if (!screenId || !['initial', 'editor'].includes(screenId)) {
      errorLogger.warn({
        message: localizationService.translate('warning.screen.id.invalid', { id: screenId }) || 
                 `معرف الشاشة غير صحيح: ${screenId}`,
        origin: 'initializeScreenNavigator._navigateToScreenLocal'
      });
      return false;
    }
    
    return true;
  }
  
  // --- الاشتراك في أحداث النظام ---
  const unsubscribeState = stateStore.subscribe((newState) => {
    if (!newState || !newState.activeScreen) return;
    
    if (newState.activeScreen !== currentActiveScreenIdLocal) {
      _navigateToScreenLocal(newState.activeScreen);
    }
  });
  
  const unsubscribeNavEvent = eventAggregator.subscribe(EVENTS.NAVIGATE_TO_SCREEN, (data) => {
    if (data && data.screenId) {
      _navigateToScreenLocal(data.screenId);
    }
  });
  
  const unsubscribeNewProjectNavEvent = eventAggregator.subscribe(EVENTS.NAVIGATE_TO_EDITOR_NEW_PROJECT, () => {
    stateStore.dispatch(ACTIONS.CREATE_NEW_PROJECT_AND_NAVIGATE);
  });
  
  const unsubscribeProjectLoaded = eventAggregator.subscribe(EVENTS.PROJECT_LOADED, (project) => {
    if (project) {
      _navigateToScreenLocal('editor');
    }
  });
  
  // --- إعدادات الشاشة الابتدائية ---
  const initialScreen = stateStore.getState().activeScreen || 'initial';
  _navigateToScreenLocal(initialScreen);
  
  // --- إضافة مستمعي الأحداث ---
  if (initialScreenElementLocal) {
    initialScreenElementLocal.addEventListener('transitionend', screenNavigator._handleScreenTransition);
    initialScreenElementLocal.addEventListener('animationend', screenNavigator._handleScreenAnimation);
  }
  
  if (editorScreenElementLocal) {
    editorScreenElementLocal.addEventListener('transitionend', screenNavigator._handleScreenTransition);
    editorScreenElementLocal.addEventListener('animationend', screenNavigator._handleScreenAnimation);
  }
  
  return {
    navigateTo: (screenId) => {
      if (!_validateScreenNavigation(screenId)) return;
      
      _navigateToScreenLocal(screenId);
    },
    cleanup: () => {
      unsubscribeState();
      unsubscribeNavEvent.unsubscribe();
      unsubscribeNewProjectNavEvent.unsubscribe();
      unsubscribeProjectLoaded.unsubscribe();
      
      if (initialScreenElementLocal) {
        initialScreenElementLocal.removeEventListener('transitionend', screenNavigator._handleScreenTransition);
        initialScreenElementLocal.removeEventListener('animationend', screenNavigator._handleScreenAnimation);
      }
      
      if (editorScreenElementLocal) {
        editorScreenElementLocal.removeEventListener('transitionend', screenNavigator._handleScreenTransition);
        editorScreenElementLocal.removeEventListener('animationend', screenNavigator._handleScreenAnimation);
      }
      
      screenNavigator.cleanup();
    }
  };
}

/**
 * وظائف التنقل بين الشاشات
 */
export const screenNavigationUtils = {
  /**
   * التنقل إلى شاشة معينة مع مؤثر
   * @param {string} screenId - معرف الشاشة
   * @param {Object} [options] - خيارات التنقل
   * @param {boolean} [options.withTransition=true] - هل مع مؤثر؟
   * @returns {boolean} هل تمت العملية؟
   */
  navigateWithTransition: (screenId, options = {}) => {
    const { withTransition = true } = options;
    
    if (!withTransition) {
      return screenNavigator._navigateToScreen(screenId);
    }
    
    try {
      const currentState = dependencies.stateStore.getState();
      const currentScreen = currentState.activeScreen;
      
      // إخفاء الشاشة الحالية مع مؤثر
      const currentScreenEl = currentScreen === 'initial' ? 
                            dependencies.initialScreenElRef : 
                            dependencies.editorScreenElRef;
      
      if (currentScreenEl) {
        currentScreenEl.classList.add('screen-exit');
        
        setTimeout(() => {
          screenNavigator._navigateToScreen(screenId);
          currentScreenEl.classList.remove('screen-exit');
        }, APP_CONSTANTS.SCREEN_TRANSITION_DURATION || 300);
      } else {
        screenNavigator._navigateToScreen(screenId);
      }
      
      return true;
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.screen.transition') || 'فشل في مؤثر التنقل',
        origin: 'screenNavigationUtils.navigateWithTransition'
      });
      
      return false;
    }
  },
  
  /**
   * التنقل إلى شاشة جديدة مع تأكيد
   * @param {string} screenId - معرف الشاشة
   * @param {Function} onConfirm - الوظيفة عند التأكيد
   * @param {Function} onCancel - الوظيفة عند الإلغاء
   * @returns {Promise<boolean>} هل تم التنقل؟
   */
  navigateWithConfirm: async (screenId, onConfirm, onCancel) => {
    const confirmed = await dependencies.modalFactoryAPI.showConfirm({
      title: dependencies.localizationService.translate('screen.confirm.title') || 'تأكيد التنقل',
      message: dependencies.localizationService.translate('screen.confirm.message', { screen: screenId }) || 
               `هل أنت متأكد من التنقل إلى شاشة ${screenId}؟`,
      confirmText: dependencies.localizationService.translate('button.confirm') || 'تأكيد',
      cancelText: dependencies.localizationService.translate('button.cancel') || 'إلغاء',
      type: 'warning'
    });
    
    if (confirmed && onConfirm) {
      return onConfirm();
    } else if (!confirmed && onCancel) {
      return onCancel();
    }
    
    return false;
  },
  
  /**
   * التنقل إلى شاشة مع تحميل مشروع
   * @param {string} screenId - معرف الشاشة
   * @param {string} projectId - معرف المشروع
   * @returns {boolean} هل تمت العملية؟
   */
  navigateToScreenWithProject: (screenId, projectId) => {
    if (!projectId) {
      dependencies.errorLogger.warn({
        message: dependencies.localizationService.translate('warning.project.id.required') || 'معرف المشروع مطلوب',
        origin: 'screenNavigationUtils.navigateToScreenWithProject'
      });
      return false;
    }
    
    try {
      const project = dependencies.projectActionsAPI.loadExistingProjectById(projectId);
      
      if (project) {
        dependencies.stateStore.dispatch(ACTIONS.LOAD_PROJECT, { ...project });
        dependencies.eventAggregator.publish(EVENTS.PROJECT_LOADED, project);
        screenNavigator.navigateTo(screenId);
        return true;
      } else {
        dependencies.notificationServiceAPI?.showError(
          dependencies.localizationService.translate('project.not.found') || `المشروع غير موجود: ${projectId}`
        );
        return false;
      }
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.screen.navigation') || 'فشل في التنقل',
        origin: 'screenNavigationUtils.navigateToScreenWithProject'
      });
      
      return false;
    }
  },
  
  /**
   * التنقل إلى الشاشة الرئيسية
   * @param {Object} [options] - خيارات التنقل
   * @returns {boolean} هل تمت العملية؟
   */
  navigateToInitial: (options = {}) => {
    return screenNavigationUtils.navigateWithTransition('initial', options);
  },
  
  /**
   * التنقل إلى شاشة المحرر
   * @param {Object} [options] - خيارات التنقل
   * @returns {boolean} هل تمت العملية؟
   */
  navigateToEditor: (options = {}) => {
    return screenNavigationUtils.navigateWithTransition('editor', options);
  },
  
  /**
   * التنقل إلى شاشة المحرر مع مشروع جديد
   * @returns {boolean} هل تمت العملية؟
   */
  navigateToEditorWithNewProject: () => {
    try {
      const newProject = dependencies.projectActionsAPI.createNewProject();
      dependencies.stateStore.dispatch(ACTIONS.LOAD_PROJECT, newProject);
      dependencies.eventAggregator.publish(EVENTS.PROJECT_LOADED, newProject);
      screenNavigator.navigateTo('editor');
      
      return true;
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.screen.editor.new.project') || 'فشل في التنقل مع مشروع جديد',
        origin: 'screenNavigationUtils.navigateToEditorWithNewProject'
      });
      
      return false;
    }
  },
  
  /**
   * التنقل إلى شاشة معينة بناءً على الحدث
   * @param {Object} event - الحدث
   * @param {string} screenId - معرف الشاشة
   * @returns {boolean} هل تمت العملية؟
   */
  handleNavigationEvent: (event, screenId) => {
    if (!event || !screenId) return false;
    
    try {
      event.preventDefault();
      event.stopPropagation();
      
      // التحقق من وجود تعديلات غير محفوظة
      const currentState = dependencies.stateStore.getState();
      const projectIsDirty = dependencies.projectActionsAPI.isCurrentProjectDirty(currentState);
      
      if (projectIsDirty && APP_CONSTANTS.SHOW_UNSAVED_CHANGES_MODAL) {
        const confirmed = dependencies.modalFactoryAPI.showConfirm({
          title: dependencies.localizationService.translate('screen.confirm.title') || 'تأكيد التنقل',
          message: dependencies.localizationService.translate('screen.confirm.unsaved.changes') || 'هل أنت متأكد؟ سيتم فقدان التعديلات غير المحفوظة.',
          confirmText: dependencies.localizationService.translate('button.confirm') || 'تأكيد',
          cancelText: dependencies.localizationService.translate('button.cancel') || 'إلغاء',
          type: 'warning'
        });
        
        if (!confirmed) return false;
      }
      
      return _navigateToScreenLocal(screenId);
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.screen.navigation') || 'فشل في التنقل',
        origin: 'screenNavigationUtils.handleNavigationEvent'
      });
      
      return false;
    }
  }
};

/**
 * وظيفة التحقق من صحة التنقل
 * @param {string} screenId - معرف الشاشة
 * @returns {boolean} هل التنقل مسموح؟
 */
function _validateScreenNavigation(screenId) {
  if (!screenId || !['initial', 'editor'].includes(screenId)) {
    dependencies.errorLogger.warn({
      message: dependencies.localizationService.translate('warning.screen.id.invalid', { id: screenId }) || 
               `معرف الشاشة غير صحيح: ${screenId}`,
      origin: 'ScreenNavigator._validateScreenNavigation'
    });
    return false;
  }
  
  return true;
}
