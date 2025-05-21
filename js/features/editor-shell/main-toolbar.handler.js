// js/features/editor-shell/main-toolbar.handler.js
import DOMElements from '../../core/dom-elements.js';
import { ACTIONS } from '../../config/app.constants.js';
import stateStore from '../../core/state-store.js';
import eventAggregator from '../../core/event-aggregator.js';
import errorLogger from '../../core/error-logger.js';
import notificationPresenter from '../../shared-ui-components/notification.presenter.js';
import projectActions from '../project-manager/project.actions.js';
import screenNavigator from './screen.navigator.js';

/**
 * معالج أزرار شريط الأدوات الرئيسي
 */
const mainToolbarHandler = (() => {
  // الاعتمادات الحقيقية
  let dependencies = {
    stateStore,
    eventAggregator,
    errorLogger,
    notificationServiceAPI: notificationPresenter,
    projectActionsAPI: projectActions,
    screenNavigator,
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
    alert('زر العودة مضغوط!');
    console.log('Back button clicked');
    dependencies.screenNavigator.navigateTo('initial');
  }

  /**
   * معالجة زر الحفظ
   * @private
   */
  async function _handleSaveProject() {
    alert('زر الحفظ مضغوط!');
    console.log('Save button clicked');
    projectActions.saveCurrentProject();
  }

  /**
   * معالجة زر التبديل بين السمات
   * @private
   */
  function _handleToggleTheme() {
    alert('زر التبديل مضغوط!');
    console.log('Theme toggle clicked');
    const currentState = dependencies.stateStore.getState();
    const newTheme = currentState.currentTheme === 'light' ? 'dark' : 'light';
    dependencies.stateStore.dispatch(ACTIONS.SET_THEME, newTheme);
  }

  /**
   * معالجة زر التصدير
   * @private
   */
  function _handleExportProject() {
    alert('زر التصدير مضغوط!');
    console.log('Export button clicked');
    alert('التصدير قيد العمل...');
  }

  /**
   * معالجة زر التراجع
   * @private
   */
  function _handleUndo() {
    alert('زر التراجع مضغوط!');
    console.log('Undo button clicked');
    dependencies.stateStore.dispatch(ACTIONS.UNDO_STATE);
  }

  /**
   * معالجة زر الإعادة
   * @private
   */
  function _handleRedo() {
    alert('زر الإعادة مضغوط!');
    console.log('Redo button clicked');
    dependencies.stateStore.dispatch(ACTIONS.REDO_STATE);
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
    if (backButton) backButton.removeEventListener('click', _handleBackToInitialScreen);
    if (saveButton) saveButton.removeEventListener('click', _handleSaveProject);
    if (themeButton) themeButton.removeEventListener('click', _handleToggleTheme);
    if (exportButton) exportButton.removeEventListener('click', _handleExportProject);
    if (undoButton) undoButton.removeEventListener('click', _handleUndo);
    if (redoButton) redoButton.removeEventListener('click', _handleRedo);

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
  const { stateStore, localizationService, errorLogger } = deps;

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
  const subscription = eventAggregator.subscribe('NAVIGATE_TO_EDITOR_NEW_PROJECT', () => {
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
      mainToolbarHandler.cleanup();
    }
  };
}
