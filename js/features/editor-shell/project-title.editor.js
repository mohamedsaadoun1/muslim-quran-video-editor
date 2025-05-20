// js/features/editor-shell/project-title.editor.js
import DOMElements from '../../core/dom-elements.js';
import { 
  ACTIONS, 
  EVENTS,
  APP_CONSTANTS
} from '../../config/app.constants.js';
import notificationPresenter from '../../shared-ui-components/notification.presenter.js';
import modalFactory from '../../shared-ui-components/modal.factory.js';

/**
 * واجهة تحرير عنوان المشروع
 */
const projectTitleEditor = (() => {
  // مراجع العناصر
  let titleElement = null;
  let currentTitleFromState = '';
  let isEditing = false;
  
  // الاعتمادات
  let dependencies = {
    stateStore: {
      getState: () => ({ 
        currentProject: { title: DEFAULT_PROJECT_SCHEMA.title } 
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
    },
    quranDataCacheAPI: { 
      getSurahDetail: async () => ({ numberOfAyahs: 0 }) 
    }
  };
  
  /**
   * تحديث عرض العنوان
   * @private
   * @param {string} newTitle - العنوان الجديد
   */
  function _updateTitleDisplay(newTitle) {
    if (!titleElement || isEditing) return;
    
    try {
      const displayTitle = newTitle || 
        dependencies.localizationService.translate('editorScreen.projectTitle.default', DEFAULT_PROJECT_SCHEMA.title);
      
      if (titleElement.textContent !== displayTitle) {
        titleElement.textContent = displayTitle;
        currentTitleFromState = newTitle;
        
        // تحديث عنوان الصفحة
        if (APP_CONSTANTS.UPDATE_PAGE_TITLE) {
          document.title = displayTitle;
        }
      }
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.title.update') || 'فشل في تحديث العنوان',
        origin: 'ProjectTitleEditor._updateTitleDisplay'
      });
    }
  }
  
  /**
   * معالجة التركيز على العنصر
   * @private
   */
  function _handleTitleFocus() {
    isEditing = true;
    
    // إرسال إشعار ببدء التحرير
    dependencies.eventAggregator.publish(EVENTS.PROJECT_TITLE_EDITING_STARTED, {
      originalTitle: currentTitleFromState,
      timestamp: Date.now()
    });
    
    // تحديد النص عند التركيز
    if (APP_CONSTANTS.SELECT_TEXT_ON_FOCUS) {
      setTimeout(() => {
        const selection = window.getSelection();
        const range = document.createRange();
        
        range.selectNodeContents(titleElement);
        selection.removeAllRanges();
        selection.addRange(range);
      }, 100);
    }
  }
  
  /**
   * معالجة فقدان التركيز أو الضغط على Enter
   * @private
   */
  function _handleTitleChangeOrBlur() {
    if (!titleElement || !isEditing) return;
    
    isEditing = false;
    let newTitle = titleElement.textContent?.trim();
    
    // التحقق من صحة العنوان
    try {
      if (!newTitle) {
        newTitle = currentTitleFromState || 
                  dependencies.localizationService.translate('editorScreen.projectTitle.default', 
                  DEFAULT_PROJECT_SCHEMA.title);
        
        titleElement.textContent = newTitle;
        dependencies.errorLogger.warn({
          message: 'العنوان لا يمكن أن يكون فارغًا. تم الرجوع إلى الافتراضي.',
          origin: 'ProjectTitleEditor._handleTitleChangeOrBlur'
        });
        
        dependencies.notificationServiceAPI?.showWarning(
          dependencies.localizationService.translate('project.title.empty') || 'العنوان لا يمكن أن يكون فارغًا.'
        );
        
        return;
      }
      
      // التحقق من الطول
      const MAX_TITLE_LENGTH = APP_CONSTANTS.MAX_PROJECT_TITLE_LENGTH || 100;
      
      if (newTitle.length > MAX_TITLE_LENGTH) {
        newTitle = newTitle.substring(0, MAX_TITLE_LENGTH);
        titleElement.textContent = newTitle;
        
        dependencies.notificationServiceAPI?.showWarning(
          dependencies.localizationService.translate('project.title.too.long', {
            length: MAX_TITLE_LENGTH
          }) || `تم قص العنوان إلى ${MAX_TITLE_LENGTH} حرفًا`
        );
      }
      
      // التحقق من التغيير
      if (newTitle !== currentTitleFromState) {
        dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
          title: newTitle
        });
        
        dependencies.eventAggregator.publish(EVENTS.PROJECT_TITLE_CHANGED_BY_USER, {
          oldTitle: currentTitleFromState,
          newTitle: newTitle,
          projectId: dependencies.stateStore.getState().currentProject?.id || null,
          timestamp: Date.now()
        });
        
        currentTitleFromState = newTitle;
      }
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.title.process') || 'فشل في معالجة العنوان',
        origin: 'ProjectTitleEditor._handleTitleChangeOrBlur'
      });
      
      dependencies.notificationServiceAPI?.showError(
        dependencies.localizationService.translate('project.title.process.failed') || 'فشل في معالجة العنوان'
      );
    }
  }
  
  /**
   * معالجة أحداث لوحة المفاتيح
   * @private
   * @param {KeyboardEvent} event - الحدث
   */
  function _handleTitleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      titleElement.blur();
      
      dependencies.eventAggregator.publish(EVENTS.PROJECT_TITLE_SAVED, {
        title: titleElement.textContent,
        timestamp: Date.now()
      });
    } else if (event.key === 'Escape') {
      event.preventDefault();
      titleElement.textContent = currentTitleFromState;
      titleElement.blur();
      
      dependencies.eventAggregator.publish(EVENTS.PROJECT_TITLE_EDIT_CANCELLED, {
        title: currentTitleFromState,
        timestamp: Date.now()
      });
    } else if (event.key === 'Backspace' && titleElement.textContent === '') {
      event.preventDefault();
      titleElement.textContent = currentTitleFromState;
    }
  }
  
  /**
   * تعيين الاعتمادات
   * @param {Object} injectedDeps - الاعتمادات
   */
  function _setDependencies(injectedDeps) {
    if (!injectedDeps || typeof injectedDeps !== 'object') {
      dependencies.errorLogger.warn({
        message: dependencies.localizationService.translate('warning.dependencies.invalid') || 'الاعتمادات غير صحيحة',
        origin: 'ProjectTitleEditor._setDependencies'
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
    if (titleElement) {
      titleElement.removeEventListener('focus', _handleTitleFocusLocal);
      titleElement.removeEventListener('blur', _handleTitleBlurLocal);
      titleElement.removeEventListener('keydown', _handleTitleKeyDownLocal);
    }
    
    dependencies = {};
    titleElement = null;
    currentTitleFromState = '';
    isEditing = false;
    
    dependencies.eventAggregator.publish(EVENTS.PROJECT_TITLE_EDITOR_CLEANED, {
      timestamp: Date.now()
    });
  }
  
  return {
    _setDependencies,
    _updateTitleDisplay,
    cleanup
  };
})();

/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 * @returns {Object} - واجهة عامة للوحدة
 */
export function initializeProjectTitleEditor(deps) {
  projectTitleEditor._setDependencies(deps);
  const {
    stateStore,
    errorLogger,
    localizationService
  } = deps;
  
  // تعيين مرجع العنصر
  const titleEl = DOMElements.currentProjectTitleEditor;
  projectTitleEditor.titleElementRef = titleEl;
  
  if (!titleEl) {
    errorLogger.warn({
      message: localizationService.translate('warning.title.element.not.found') || 'العنصور غير موجود',
      origin: 'initializeProjectTitleEditor'
    });
    
    return { cleanup: () => {} };
  }
  
  // المتغيرات المحلية
  let localIsEditing = false;
  let localCurrentTitleFromState = DEFAULT_PROJECT_SCHEMA.title;
  
  // وظائف محلية
  const _updateTitleDisplayLocal = (newTitle) => {
    if (!titleEl || localIsEditing) return;
    
    try {
      const displayTitle = newTitle || 
        localizationService.translate('editorScreen.projectTitle.default', DEFAULT_PROJECT_SCHEMA.title);
      
      if (titleEl.textContent !== displayTitle) {
        titleEl.textContent = displayTitle;
        
        // تحديث عنوان الصفحة
        if (APP_CONSTANTS.UPDATE_PAGE_TITLE) {
          document.title = displayTitle;
        }
      }
      
      localCurrentTitleFromState = newTitle;
    } catch (error) {
      errorLogger.error({
        error,
        message: localizationService.translate('error.title.display') || 'فشل في عرض العنوان',
        origin: 'ProjectTitleEditor._updateTitleDisplayLocal'
      });
    }
  };
  
  const _handleTitleFocusLocal = () => {
    localIsEditing = true;
    titleEl.setAttribute('aria-live', 'polite');
    
    // إرسال إشعار ببدء التحرير
    deps.eventAggregator.publish(EVENTS.PROJECT_TITLE_EDITING_STARTED, {
      originalTitle: localCurrentTitleFromState,
      timestamp: Date.now()
    });
  };
  
  const _handleTitleBlurLocal = () => {
    if (!titleEl || !localIsEditing) return;
    
    localIsEditing = false;
    let newTitle = titleEl.textContent?.trim();
    
    // التحقق من صحة العنوان
    try {
      // التحقق من أن العنوان غير فارغ
      if (!newTitle) {
        newTitle = localCurrentTitleFromState;
        titleEl.textContent = newTitle;
        
        errorLogger.warn({
          message: 'العنوان لا يمكن أن يكون فارغًا',
          origin: 'ProjectTitleEditor._handleTitleBlurLocal'
        });
        
        notificationPresenter.showNotification({
          message: localizationService.translate('project.title.empty') || 'العنوان لا يمكن أن يكون فارغًا.',
          type: 'warning'
        });
        
        return;
      }
      
      // التحقق من طول العنوان
      const MAX_TITLE_LENGTH = APP_CONSTANTS.MAX_PROJECT_TITLE_LENGTH || 100;
      
      if (newTitle.length > MAX_TITLE_LENGTH) {
        newTitle = newTitle.substring(0, MAX_TITLE_LENGTH);
        titleEl.textContent = newTitle;
        
        errorLogger.warn({
          message: `تم قص العنوان إلى ${MAX_TITLE_LENGTH} حرفًا`,
          origin: 'ProjectTitleEditor._handleTitleBlurLocal'
        });
        
        notificationPresenter.showNotification({
          message: localizationService.translate('project.title.too.long', {
            length: MAX_TITLE_LENGTH
          }) || `تم قص العنوان إلى ${MAX_TITLE_LENGTH} حرفًا.`,
          type: 'warning'
        });
      }
      
      // التحقق من التغيير
      if (newTitle !== localCurrentTitleFromState) {
        stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { title: newTitle });
        
        // إرسال إشعار بالتحديث
        deps.eventAggregator.publish(EVENTS.PROJECT_TITLE_CHANGED, {
          oldTitle: localCurrentTitleFromState,
          newTitle: newTitle,
          projectId: stateStore.getState().currentProject?.id || null,
          timestamp: Date.now()
        });
        
        localCurrentTitleFromState = newTitle;
      }
    } catch (error) {
      errorLogger.error({
        error,
        message: localizationService.translate('error.title.process') || 'فشل في معالجة العنوان',
        origin: 'ProjectTitleEditor._handleTitleBlurLocal'
      });
      
      notificationPresenter.showNotification({
        message: localizationService.translate('project.title.process.failed') || 'فشل في معالجة العنوان',
        type: 'error'
      });
    }
  };
  
  const _handleTitleKeyDownLocal = (event) => {
    // معالجة لوحة المفاتيح
    if (event.key === 'Enter') {
      event.preventDefault();
      titleEl.blur();
      
      // إرسال إشعار بالحفظ
      deps.eventAggregator.publish(EVENTS.PROJECT_TITLE_SAVED, {
        title: titleEl.textContent,
        timestamp: Date.now()
      });
    } else if (event.key === 'Escape') {
      event.preventDefault();
      titleEl.textContent = localCurrentTitleFromState;
      titleEl.blur();
      
      // إرسال إشعار بإلغاء التحرير
      deps.eventAggregator.publish(EVENTS.PROJECT_TITLE_EDIT_CANCELLED, {
        title: localCurrentTitleFromState,
        timestamp: Date.now()
      });
    } else if (event.key === 'Backspace' && titleEl.textContent === '') {
      event.preventDefault();
      titleEl.textContent = localCurrentTitleFromState;
    }
    
    // التحقق من الاختصارات
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      
      if (deps.undoRedoAPI && deps.undoRedoAPI.undo) {
        deps.undoRedoAPI.undo();
        deps.eventAggregator.publish(EVENTS.PROJECT_UNDO, {
          timestamp: Date.now()
        });
      } else {
        stateStore.dispatch(ACTIONS.UNDO_STATE);
      }
    }
  };
  
  // --- إعداد المستمعين ---
  titleEl.setAttribute('contenteditable', 'true');
  titleEl.setAttribute('spellcheck', 'false');
  titleEl.setAttribute('aria-label', localizationService.translate('project.title.editor') || 'محرر العنوان');
  
  titleEl.addEventListener('focus', _handleTitleFocusLocal);
  titleEl.addEventListener('blur', _handleTitleBlurLocal);
  titleEl.addEventListener('keydown', _handleTitleKeyDownLocal);
  
  // --- الاشتراك في تغيير الحالة ---
  const unsubscribeState = stateStore.subscribe((newState) => {
    const projectTitle = newState.currentProject?.title;
    const defaultTitle = localizationService.translate('editorScreen.projectTitle.default', DEFAULT_PROJECT_SCHEMA.title);
    
    if (!localIsEditing) {
      _updateTitleDisplayLocal(projectTitle === null || projectTitle === undefined ? defaultTitle : projectTitle);
    }
    
    // تمكين أو تعطيل التحرير
    titleEl.contentEditable = !!newState.currentProject;
    titleEl.style.cursor = newState.currentProject ? 'text' : 'default';
    titleEl.setAttribute('aria-readonly', !newState.currentProject);
    
    // تحديث عنوان الصفحة
    if (APP_CONSTANTS.UPDATE_PAGE_TITLE && newState.currentProject) {
      document.title = projectTitle || defaultTitle;
    }
  });
  
  // --- التحقق من صحة الحالة ---
  const initialProject = stateStore.getState().currentProject;
  _updateTitleDisplayLocal(initialProject?.title || localizationService.translate('editorScreen.projectTitle.default', DEFAULT_PROJECT_SCHEMA.title));
  titleEl.contentEditable = !!initialProject;
  titleEl.style.cursor = initialProject ? 'text' : 'default';
  titleEl.setAttribute('aria-readonly', !initialProject);
  
  return {
    cleanup: () => {
      unsubscribeState();
      
      titleEl.removeEventListener('focus', _handleTitleFocusLocal);
      titleEl.removeEventListener('blur', _handleTitleBlurLocal);
      titleEl.removeEventListener('keydown', _handleTitleKeyDownLocal);
      
      titleEl.contentEditable = 'false';
      titleEl.removeAttribute('contenteditable');
      titleEl.removeAttribute('spellcheck');
      titleEl.removeAttribute('aria-label');
      titleEl.removeAttribute('aria-readonly');
      
      projectTitleEditor.cleanup();
    }
  };
}
