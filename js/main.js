/**
 * @fileoverview نقطة الدخول الرئيسية للتطبيق مع تهيئة شاملة ونهائية
 * @module main
 */

// --- وحدات النواة ---
import errorLogger from './core/error-logger.js';
import eventAggregator from './core/eventAggregator.js';
import stateStore from './core/state-store.js';
import DOMElements, { initializeCoreDomElements } from './core/dom-elements.js';
import moduleBootstrap from './core/module-bootstrap.js';
import resourceManager from './core/resource-manager.js';
import { initializeLocalizationService } from './core/localization.service.js';

// --- إعدادات التطبيق ---
import { 
  ACTIONS, 
  EVENTS, 
  LS_KEYS, 
  DEFAULT_PROJECT_SCHEMA, 
  APP_NAME,
  APP_VERSION
} from './config/app.constants.js';

import featureFlags, { initializeFeatureFlags } from './config/feature.flags.config.js';

// --- خدمات التطبيق ---
import localStorageAdapter from './services/local-storage.adapter.js';
import quranApiClient from './services/quran.api.client.js';
import pexelsAPI from './services/pexels.api.client.js';
import speechRecognitionWrapper from './services/speech.recognition.wrapper.js';
import fileIOUtils from './services/file.io.utils.js';

// --- مُهيئات مكونات واجهة المستخدم المشتركة ---
import { initializeThemeController } from './shared-ui-components/theme.controller.js';
import { initializePanelManager } from './shared-ui-components/panel.manager.js';
import { initializeNotificationPresenter } from './shared-ui-components/notification.presenter.js';
import { initializeSpinnerView } from './shared-ui-components/spinner.view.js';
import { initializeModalFactory } from './shared-ui-components/modal.factory.js';

// --- مُهيئات الميزات ---
// Project Manager
import { initializeProjectActions } from './features/project-manager/project.actions.js';
import { initializeProjectListRenderer } from './features/project-manager/project-list.renderer.js';

// Quran Provider
import { initializeQuranDataCache } from './features/quran-provider/quran.data.cache.js';
import { initializeQuranSelectorUI } from './features/quran-provider/quran-selector.ui.js';
import { initializeQuranVerseAnalyzer } from './features/quran-provider/quran-verse.analyzer.js';
import { initializeQuranVoiceInputHandler } from './features/quran-provider/quran-voice-input.handler.js';

// Background Controller
import { initializeBackgroundActions } from './features/background-controller/background.actions.js';
import { initializeBackgroundColorChooser } from './features/background-controller/background-color.chooser.js';
import { initializeBackgroundImporterUI } from './features/background-controller/background-importer.ui.js';
import { initializeBackgroundAIConnector } from './features/background-controller/background-ai.connector.js';

// Text Engine
import { initializeTextStylerUI } from './features/text-engine/text-styler.ui.js';
import { initializeTextRenderingLogic } from './features/text-engine/text.rendering.logic.js';

// Audio Engine
import { initializeAyahAudioRetriever } from './features/audio-engine/ayah-audio.retriever.js';
import { initializeMainPlaybackController } from './features/audio-engine/main-playback.controller.js';
import { initializeTimelineUpdaterUI } from './features/audio-engine/timeline.updater.ui.js';
import { initializeAudioSettingsManager } from './features/audio-engine/audio.settings.manager.js';
import { initializeBackgroundAudioMixer } from './features/audio-engine/background-audio.mixer.js';

// Canvas Composer
import { initializeCanvasDimensionHandler } from './features/canvas-composer/canvas.dimension.handler.js';
import { initializeMainRenderer } from './features/canvas-composer/main-renderer.js';
import { initializeVideoFilterApplier } from './features/canvas-composer/video-filter.applier.js';

// Video Exporter
import { initializeExportSettingsUI } from './features/video-exporter/export-settings.ui.js';
import { initializeCcaptureRecorder } from './features/video-exporter/ccapture.recorder.js';
import { initializeFFmpegIntegration } from './features/video-exporter/ffmpeg.integration.js';

// Editor Shell
import { initializeScreenNavigator } from './features/editor-shell/screen.navigator.js';
import { initializeMainToolbarHandler } from './features/editor-shell/main-toolbar.handler.js';
import { initializePlaybackControlStrip } from './features/editor-shell/playback-control-strip.ui.js';
import { initializeProjectTitleEditor } from './features/editor-shell/project-title.editor.js';
import { initializeGlobalShortcutsBinder } from './features/editor-shell/global-shortcuts.binder.js';

/**
 * @typedef {Object} ModuleConfig
 * @property {string} name - اسم الوحدة للتسجيل
 * @property {Function} initFn - وظيفة التهيئة (ممكن أن تكون غير متزامنة)
 * @property {string[]} [dependencies] - قائمة بأسماء التبعيات (مفاتيح في coreServices أو من وحدات أخرى)
 * @property {string} [provides] - إذا كانت initFn تُرجع خدمة/واجهة برمجية، فهذا هو المفتاح الذي سيتم تسجيلها تحته لوحدات أخرى
 */

/**
 * تحميل البيانات المحفوظة وإعداد الحالة
 * @returns {void}
 */
function loadPersistedDataAndInitializeState() {
  try {
    const persistedAppSettings = localStorageAdapter.getItem(LS_KEYS.APP_SETTINGS);
    const persistedSavedProjects = localStorageAdapter.getItem(LS_KEYS.SAVED_PROJECTS);
    
    // سيتم تحميل السمة من خلال appSettings.preferredTheme في stateStore.initializeWithState
    stateStore.initializeWithState(persistedAppSettings, persistedSavedProjects);
  } catch (error) {
    errorLogger.handleError({
      error: error instanceof Error ? error : new Error(String(error)),
      message: 'فشل في تحميل البيانات المحفوظة',
      origin: 'main.loadPersistedDataAndInitializeState',
      severity: 'error'
    });
  }
}

/**
 * تهيئة خدمات النواة وإعدادها قبل بدء التطبيق
 * @returns {void}
 */
function initializeCoreServices() {
  try {
    // تعيين مسجل الأخطاء إلى مخزن الحالة
    stateStore.setErrorLogger(errorLogger);
    
    // تعيين مسجل الأخطاء إلى المكونات المشتركة
    if (typeof notificationPresenter !== 'undefined' && notificationPresenter.setErrorLogger) {
      notificationPresenter.setErrorLogger(errorLogger);
    }
    
    if (typeof spinnerView !== 'undefined' && spinnerView.setErrorLogger) {
      spinnerView.setErrorLogger(errorLogger);
    }
    
    if (typeof modalFactory !== 'undefined' && modalFactory.setErrorLogger) {
      modalFactory.setErrorLogger(errorLogger);
    }
    
    // إعداد اللغة الافتراضية
    const currentState = stateStore.getState();
    if (currentState && currentState.appSettings && currentState.appSettings.preferredLanguage) {
      document.documentElement.setAttribute('lang', currentState.appSettings.preferredLanguage);
    }
    
    // إعداد السمة
    if (currentState && currentState.currentTheme) {
      document.body.classList.remove('light-theme', 'dark-theme');
      document.body.classList.add(currentState.currentTheme === 'dark' ? 'dark-theme' : 'light-theme');
    }
  } catch (error) {
    errorLogger.handleError({
      error: error instanceof Error ? error : new Error(String(error)),
      message: 'فشل في تهيئة الخدمات الأساسية',
      origin: 'main.initializeCoreServices',
      severity: 'error'
    });
  }
}

/**
 * إعداد مكونات واجهة المستخدم الأساسية
 * @returns {void}
 */
function setupBaseUIComponents() {
  try {
    // إعداد مكونات واجهة المستخدم المشتركة
    const baseUIComponents = [
      { name: 'ThemeController', initFn: initializeThemeController, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'localizationServiceAPI'] },
      { name: 'NotificationPresenter', initFn: initializeNotificationPresenter, dependencies: ['eventAggregator', 'errorLogger', 'localizationServiceAPI'], provides: 'notificationServiceAPI' },
      { name: 'SpinnerView', initFn: initializeSpinnerView, dependencies: ['stateStore', 'errorLogger'], provides: 'spinnerServiceAPI' },
      { name: 'ModalFactory', initFn: initializeModalFactory, dependencies: ['errorLogger', 'localizationServiceAPI'], provides: 'modalFactoryAPI' }
    ];
    
    moduleBootstrap.initializeAllModules(
      {
        stateStore,
        eventAggregator,
        errorLogger,
        localizationServiceAPI: localizationService
      },
      baseUIComponents
    );
    
    // إعداد مكونات واجهة المستخدم الأساسية
    if (typeof DOMElements !== 'undefined') {
      DOMElements.appContainer.classList.add('initialized');
      DOMElements.appContainer.setAttribute('data-app-version', APP_VERSION);
      
      if (APP_NAME) {
        const titleElements = document.querySelectorAll('[data-localize="app-title"]');
        titleElements.forEach(el => {
          el.textContent = APP_NAME;
        });
      }
    }
  } catch (error) {
    errorLogger.handleError({
      error: error instanceof Error ? error : new Error(String(error)),
      message: 'فشل في إعداد مكونات واجهة المستخدم الأساسية',
      origin: 'main.setupBaseUIComponents',
      severity: 'error'
    });
  }
}

/**
 * إعداد مكونات التطبيق
 * @returns {Array<ModuleConfig>} قائمة مكونات التطبيق
 */
function getApplicationModuleConfigs() {
  return [
    // المرحلة 0: الأدوات الأساسية التي قد تعتمد عليها الوحدات الأخرى
    {
      name: 'FeatureFlags',
      initFn: initializeFeatureFlags,
      dependencies: ['errorLogger'],
      provides: 'featureFlags'
    },
    {
      name: 'LocalizationService',
      initFn: initializeLocalizationService,
      dependencies: ['errorLogger', 'eventAggregator'],
      provides: 'localizationServiceAPI'
    },
    {
      name: 'CanvasSnapshotService',
      initFn: initializeCanvasSnapshotService,
      dependencies: ['errorLogger'],
      provides: 'snapshotAPI'
    },
    
    // المرحلة 1: متحكمات وخدمات واجهة المستخدم الأساسية
    {
      name: 'ThemeController',
      initFn: initializeThemeController,
      dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'localizationServiceAPI'],
      provides: 'themeControllerAPI'
    },
    {
      name: 'NotificationPresenter',
      initFn: initializeNotificationPresenter,
      dependencies: ['eventAggregator', 'errorLogger', 'localizationServiceAPI'],
      provides: 'notificationServiceAPI'
    },
    {
      name: 'SpinnerView',
      initFn: initializeSpinnerView,
      dependencies: ['stateStore', 'errorLogger'],
      provides: 'spinnerServiceAPI'
    },
    {
      name: 'ModalFactory',
      initFn: initializeModalFactory,
      dependencies: ['errorLogger', 'localizationServiceAPI'],
      provides: 'modalFactoryAPI'
    },
    
    // المرحلة 2: مزودي البيانات وخدمات المنطق الأساسية
    {
      name: 'QuranDataCache',
      initFn: initializeQuranDataCache,
      dependencies: ['quranApiClient', 'errorLogger', 'eventAggregator', 'stateStore'],
      provides: 'quranDataCacheAPI'
    },
    {
      name: 'QuranVerseAnalyzer',
      initFn: initializeQuranVerseAnalyzer,
      dependencies: ['errorLogger', 'quranDataCacheAPI'],
      provides: 'quranVerseAnalyzerAPI'
    },
    {
      name: 'AyahAudioRetriever',
      initFn: initializeAyahAudioRetriever,
      dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'quranApiClient'],
      provides: 'ayahAudioServiceAPI'
    },
    {
      name: 'TextRenderingLogic',
      initFn: initializeTextRenderingLogic,
      dependencies: ['errorLogger'],
      provides: 'textRenderingLogicAPI'
    },
    
    // المرحلة 3: وحدات الميزات الأساسية التي تعتمد على مزودي البيانات
    {
      name: 'ProjectActions',
      initFn: initializeProjectActions,
      dependencies: ['stateStore', 'localStorageAdapter', 'errorLogger', 'notificationServiceAPI', 'eventAggregator', 'modalFactoryAPI'],
      provides: 'projectActionsAPI'
    },
    {
      name: 'BackgroundActions',
      initFn: initializeBackgroundActions,
      dependencies: ['stateStore'],
      provides: 'backgroundActionsAPI'
    },
    {
      name: 'MainPlaybackController',
      initFn: initializeMainPlaybackController,
      dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'ayahAudioServiceAPI', 'localizationServiceAPI'],
      provides: 'mainPlaybackAPI'
    },
    
    // المرحلة 4: وحدات واجهة المستخدم التي ترتبط بالحالة والإجراءات والخدمات
    // Project Manager UI
    {
      name: 'ProjectListRenderer',
      initFn: initializeProjectListRenderer,
      dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'localizationServiceAPI', 'modalFactoryAPI', 'notificationServiceAPI', 'projectActionsAPI'],
      provides: 'projectListRendererAPI'
    },
    
    // Quran Provider UI
    {
      name: 'QuranSelectorUI',
      initFn: initializeQuranSelectorUI,
      dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'quranDataCacheAPI', 'localizationServiceAPI', 'quranVerseAnalyzerAPI', 'quranVoiceInputAPI'],
      provides: 'quranSelectorUIAPI'
    },
    {
      name: 'QuranVoiceInputHandler',
      initFn: initializeQuranVoiceInputHandler,
      dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'notificationServiceAPI', 'speechRecognitionWrapper', 'quranDataCacheAPI', 'quranVerseAnalyzerAPI', 'localizationServiceAPI'],
      provides: 'quranVoiceInputAPI'
    },
    
    // Background Controller UI
    {
      name: 'BackgroundColorChooser',
      initFn: initializeBackgroundColorChooser,
      dependencies: ['stateStore', 'errorLogger', 'backgroundActionsAPI'],
      provides: 'backgroundColorChooserAPI'
    },
    {
      name: 'BackgroundImporterUI',
      initFn: initializeBackgroundImporterUI,
      dependencies: ['stateStore', 'errorLogger', 'notificationServiceAPI', 'backgroundActionsAPI', 'fileIOUtils'],
      provides: 'backgroundImporterUIAPI'
    },
    {
      name: 'BackgroundAIConnector',
      initFn: initializeBackgroundAIConnector,
      dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'pexelsAPI', 'backgroundActionsAPI'],
      provides: 'backgroundAIServiceAPI'
    },
    
    // Text Engine UI
    {
      name: 'TextStylerUI',
      initFn: initializeTextStylerUI,
      dependencies: ['stateStore', 'errorLogger'],
      provides: 'textStylerUIAPI'
    },
    
    // Audio Engine UI
    {
      name: 'AudioSettingsManager',
      initFn: initializeAudioSettingsManager,
      dependencies: ['stateStore', 'errorLogger'],
      provides: 'audioSettingsManagerAPI'
    },
    {
      name: 'TimelineUpdaterUI',
      initFn: initializeTimelineUpdaterUI,
      dependencies: ['eventAggregator', 'errorLogger', 'mainPlaybackAPI', 'stateStore'],
      provides: 'timelineUpdaterUIAPI'
    },
    {
      name: 'BackgroundAudioMixer',
      initFn: initializeBackgroundAudioMixer,
      dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'fileIOUtils'],
      provides: 'backgroundAudioAPI'
    },
    
    // Canvas Composer UI/Logic
    {
      name: 'CanvasDimensionHandler',
      initFn: initializeCanvasDimensionHandler,
      dependencies: ['stateStore', 'errorLogger', 'eventAggregator'],
      provides: 'canvasDimensionsAPI'
    },
    {
      name: 'VideoFilterApplier',
      initFn: initializeVideoFilterApplier,
      dependencies: ['stateStore', 'errorLogger'],
      provides: 'videoFilterApplierAPI'
    },
    {
      name: 'MainRenderer',
      initFn: initializeMainRenderer,
      dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'localizationServiceAPI', 'resourceManager', 'canvasDimensionsAPI', 'textRenderingLogicAPI'],
      provides: 'mainRendererAPI'
    },
    
    // Video Exporter UI & Logic
    {
      name: 'ExportSettingsUI',
      initFn: initializeExportSettingsUI,
      dependencies: ['stateStore', 'errorLogger', 'notificationServiceAPI', 'mainPlaybackAPI', 'localizationServiceAPI', 'eventAggregator', 'exportRecorderAPI'],
      provides: 'exportSettingsUIAPI'
    },
    {
      name: 'CcaptureRecorder',
      initFn: initializeCcaptureRecorder,
      dependencies: ['stateStore', 'errorLogger', 'notificationServiceAPI', 'mainRendererAPI', 'eventAggregator', 'fileIOUtils'],
      provides: 'exportRecorderAPI'
    },
    {
      name: 'FFmpegIntegration',
      initFn: initializeFFmpegIntegration,
      dependencies: ['stateStore', 'errorLogger', 'notificationServiceAPI'],
      provides: 'ffmpegAPI'
    },
    
    // Editor Shell
    {
      name: 'ScreenNavigator',
      initFn: initializeScreenNavigator,
      dependencies: ['stateStore', 'eventAggregator', 'errorLogger'],
      provides: 'screenNavigatorAPI'
    },
    {
      name: 'MainToolbarHandler',
      initFn: initializeMainToolbarHandler,
      dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'projectActionsAPI'],
      provides: 'mainToolbarHandlerAPI'
    },
    {
      name: 'PlaybackControlStripUI',
      initFn: initializePlaybackControlStrip,
      dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'mainPlaybackAPI', 'localizationServiceAPI'],
      provides: 'playbackControlStripAPI'
    },
    {
      name: 'ProjectTitleEditor',
      initFn: initializeProjectTitleEditor,
      dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'localizationServiceAPI', 'notificationServiceAPI'],
      provides: 'projectTitleEditorAPI'
    },
    {
      name: 'GlobalShortcutsBinder',
      initFn: initializeGlobalShortcutsBinder,
      dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'mainPlaybackAPI', 'projectActionsAPI'],
      provides: 'globalShortcutsBinderAPI'
    }
  ];
}

/**
 * التحقق مما إذا كان التطبيق يعمل في وضع التطوير
 * @returns {boolean} هل التطبيق في وضع التطوير؟
 */
function isDevelopmentMode() {
  return typeof process !== 'undefined' && 
         process.env && 
         process.env.NODE_ENV === 'development';
}

/**
 * التحقق من توفر الموارد الأساسية
 * @returns {boolean} هل الموارد الأساسية متوفرة؟
 */
function checkCoreResources() {
  try {
    const missingModules = [];
    
    // التحقق من توفر جميع الوحدات الأساسية
    if (!errorLogger) missingModules.push('errorLogger');
    if (!eventAggregator) missingModules.push('eventAggregator');
    if (!stateStore) missingModules.push('stateStore');
    if (!DOMElements) missingModules.push('DOMElements');
    if (!moduleBootstrap) missingModules.push('moduleBootstrap');
    if (!resourceManager) missingModules.push('resourceManager');
    if (!localStorageAdapter) missingModules.push('localStorageAdapter');
    if (!quranApiClient) missingModules.push('quranApiClient');
    if (!pexelsAPI) missingModules.push('pexelsAPI');
    if (!speechRecognitionWrapper) missingModules.push('speechRecognitionWrapper');
    if (!fileIOUtils) missingModules.push('fileIOUtils');
    
    // إذا كان هناك وحدات مفقودة، سجل خطأ
    if (missingModules.length > 0) {
      throw new Error(`الوحدات الأساسية التالية غير متوفرة: ${missingModules.join(', ')}`);
    }
    
    return true;
  } catch (error) {
    errorLogger.handleError({
      error: error instanceof Error ? error : new Error(String(error)),
      message: 'فشل في التحقق من توفر الموارد الأساسية',
      origin: 'main.checkCoreResources',
      severity: 'critical'
    });
    return false;
  }
}

/**
 * إعداد مسجل الأخطاء العالمي
 */
function setupGlobalErrorHandlers() {
  // التعامل مع رفض الوعود غير المُعالجة
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    errorLogger.handleError({
      error: reason instanceof Error ? reason : new Error(String(reason)),
      message: 'تم رفض الوعود غير المُعالجة.',
      origin: 'GlobalUnhandledRejection',
      severity: 'critical',
      context: { promiseDetail: reason }
    });
  });
  
  // التعامل مع الأخطاء غير المُعالجة
  window.addEventListener('error', (event) => {
    if (event.error) {
      errorLogger.handleError({
        error: event.error, 
        message: event.message || 'حدث خطأ غير معالج.',
        origin: `GlobalError (${event.filename || 'unknown'})`,
        severity: 'critical',
        context: { lineno: event.lineno, colno: event.colno }
      });
    } else if (event.message) {
      errorLogger.logWarning({ 
        message: `حدث خطأ عام: ${event.message}`, 
        origin: 'GlobalErrorEvent',
        severity: 'warning'
      });
    }
  });
  
  // التعامل مع استثناءات غير مُعالجَة
  window.onerror = (message, source, lineno, colno, error) => {
    errorLogger.handleError({
      error: error || new Error(message),
      message: `حدث خطأ في الملف: ${source} (${lineno}:${colno})`,
      origin: 'GlobalWindowOnError',
      severity: 'critical',
      context: { 
        message, 
        source, 
        lineno, 
        colno, 
        error: error?.message || 'لا توجد معلومات تفصيلية'
      }
    });
    return true; // يشير إلى أن الخطأ تم التعامل معه
  };
  
  // التعامل مع استثناءات غير مُعالجَة
  window.onunhandledrejection = (event) => {
    errorLogger.handleError({
      error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      message: 'رفض الوعود غير المُعالج',
      origin: 'GlobalWindowOnUnhandledRejection',
      severity: 'critical',
      context: { 
        promise: event.promise,
        reason: event.reason
      }
    });
    event.preventDefault();
    return true;
  };
  
  // التعامل مع الأخطاء في المتصفحات القديمة
  window.onmessageerror = (event) => {
    errorLogger.handleError({
      error: new Error(event.data),
      message: 'حدث خطأ في الرسائل',
      origin: 'GlobalWindowOnMessageError',
      severity: 'warning',
      context: { event }
    });
  };
}

/**
 * وظيفة الدخول الرئيسية للتطبيق
 */
async function main() {
  try {
    // إعداد مسجل الأخطاء العالمي
    setupGlobalErrorHandlers();
    
    // التحقق من توفر الموارد الأساسية
    if (!checkCoreResources()) {
      throw new Error('فشل في التحقق من توفر الموارد الأساسية');
    }
    
    // التحقق من وضع التطوير
    if (isDevelopmentMode()) {
      // إتاحة بعض الوحدات عالميًا للتصحيح
      window.errorLoggerGlobal = errorLogger;
      window.eventAggregatorGlobal = eventAggregator;
      window.stateStoreGlobal = stateStore;
      window.ACTIONS = ACTIONS;
      window.EVENTS = EVENTS;
      window.DOMElementsGlobal = DOMElements;
      window.featureFlagsGlobal = featureFlags;
    }
    
    // تهيئة خدمات النواة
    initializeCoreServices();
    
    // تهيئة عنصر DOM الأساسي
    try {
      initializeCoreDomElements(errorLogger);
      errorLogger.logInfo('[Main] تم تهيئة عناصر DOM الأساسية.');
    } catch (error) {
      errorLogger.handleError({
        error: error instanceof Error ? error : new Error(String(error)),
        message: 'فشل في تهيئة عناصر DOM',
        origin: 'main.initializeCoreDomElements',
        severity: 'critical'
      });
      
      // عرض رسالة خطأ بسيطة للمستخدم
      if (DOMElements.appContainer) {
        DOMElements.appContainer.innerHTML = `
          <p style="color:red; padding:20px; text-align:center; font-family: 'Tajawal', sans-serif;">
            فشل تهيئة مكونات التطبيق الأساسية. يرجى تحديث الصفحة، أو الاتصال بالدعم إذا استمرت المشكلة.
            <br><br>
            الرسالة: ${error.message}
          </p>`;
        return;
      }
    }
    
    // تحميل البيانات المحفوظة وتثبيت الحالة
    loadPersistedDataAndInitializeState();
    
    // إعداد مكونات واجهة المستخدم الأساسية
    setupBaseUIComponents();
    
    // الحصول على تكوينات وحدات التطبيق
    const moduleConfigs = getApplicationModuleConfigs();
    
    // تهيئة كل الوحدات
    const coreServicesForBootstrap = {
      stateStore,
      eventAggregator,
      errorLogger,
      resourceManager,
      localStorageAdapter,
      quranApiClient,
      pexelsAPI,
      speechRecognitionWrapper,
      fileIOUtils,
      localizationServiceAPI: localizationService
    };
    
    try {
      await moduleBootstrap.initializeAllModules(coreServicesForBootstrap, moduleConfigs);
      errorLogger.logInfo('[Main] تم تهيئة كل الوحدات بنجاح.');
    } catch (error) {
      errorLogger.handleError({
        error: error instanceof Error ? error : new Error(String(error)),
        message: 'حدث خطأ فادح أثناء تهيئة وحدات التطبيق.',
        origin: 'main.moduleBootstrap.initializeAllModules',
        severity: 'critical'
      });
      
      // عرض رسالة خطأ للمستخدم
      if (DOMElements.appContainer) {
        DOMElements.appContainer.innerHTML = `
          <p style="color:red; padding:20px; text-align:center; font-family: 'Tajawal', sans-serif;">
            حدث خطأ فادح أثناء تهيئة وحدات التطبيق. قد لا تعمل بعض الميزات بشكل صحيح.
            <br><br>
            تفاصيل الخطأ تم تسجيلها في الكونسول.
          </p>`;
        return;
      }
    }
    
    // التطبيق جاهز الآن
    errorLogger.logInfo(`[Main] ${APP_NAME} v${APP_VERSION} تم تهئته ومستعد للاستخدام.`);
    
    // إرسال حدث تهيئة التطبيق
    eventAggregator.publish(EVENTS.APP_INITIALIZED, { 
      timestamp: Date.now(), 
      version: APP_VERSION,
      theme: stateStore.getState().currentTheme
    });
    
    // إعداد التقويم الإسلامي (إذا كان مطلوبًا)
    if (window.Moment) {
      moment.locale(stateStore.getState().appSettings.preferredLanguage);
    }
    
    // تعيين عنوان التطبيق
    if (DOMElements.appHeaderTitle && APP_NAME) {
      DOMElements.appHeaderTitle.textContent = APP_NAME;
    }
    
    // إضافة اسم التطبيق إلى وصف الصفحة
    if (document.title && APP_NAME) {
      document.title = `${APP_NAME} - ${document.title}`;
    }
    
    // تحديث تاريخ الحقوق
    if (DOMElements.copyright && DOMElements.copyright.textContent) {
      DOMElements.copyright.textContent = DOMElements.copyright.textContent.replace('٢٠٢٥', new Date().getFullYear());
    }
    
    // إضافة نص افتراضي لشريط التقدم
    if (DOMElements.exportProcessNote) {
      DOMElements.exportProcessNote.textContent = 'الرجاء الانتظار...';
    }
    
    // تحديث واجهة المستخدم بناءً على السمة الحالية
    const currentState = stateStore.getState();
    if (currentState && currentState.currentTheme) {
      document.body.classList.remove('light-theme', 'dark-theme');
      document.body.classList.add(currentState.currentTheme === 'dark' ? 'dark-theme' : 'light-theme');
    }
    
    // إعداد خدمات التعرف على الصوت
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      speechRecognitionWrapper.initialize({
        language: currentState.appSettings.preferredLanguage || 'ar'
      });
    }
    
    // إعداد مكونات الترجمة
    if (typeof localizationService === 'function') {
      localizationService({
        language: currentState.appSettings.preferredLanguage || 'ar'
      });
    } else if (localizationService && typeof localizationService.initialize === 'function') {
      localizationService.initialize({
        language: currentState.appSettings.preferredLanguage || 'ar'
      });
    }
    
    // إعداد واجهة المستخدم
    if (DOMElements.appContainer) {
      DOMElements.appContainer.classList.add('app-ready');
      DOMElements.appContainer.setAttribute('data-app-status', 'ready');
      
      // إضافة إشعارات تلقائية عند بدء التشغيل
      if (currentState && currentState.appSettings && currentState.appSettings.showStartupNotifications !== false) {
        const startupMessage = `مرحباً بك في ${APP_NAME} v${APP_VERSION}`;
        
        if (typeof notificationPresenter !== 'undefined' && typeof notificationPresenter.showNotification === 'function') {
          notificationPresenter.showNotification(startupMessage, {
            type: 'info',
            duration: 5000,
            actions: [{
              text: 'البدء',
              handler: () => {}
            }]
          });
        } else if (typeof alert === 'function') {
          alert(startupMessage);
        }
      }
    }
  } catch (error) {
    errorLogger.handleError({
      error: error instanceof Error ? error : new Error(String(error)),
      message: 'فشل في تشغيل التطبيق',
      origin: 'main',
      severity: 'critical'
    });
    
    // عرض رسالة خطأ للمستخدم
    if (document.body) {
      document.body.innerHTML = `
        <p style="color:red; padding:20px; text-align:center; font-family: 'Tajawal', sans-serif;">
          فشل في تهيئة التطبيق. يرجى محاولة تحديث الصفحة، أو التواصل مع الدعم الفني.
          <br><br>
          تفاصيل الخطأ: ${error.message}
        </p>`;
    }
  }
}

/**
 * التحقق من حالة المتصفح
 * @returns {boolean} هل المتصفح مدعوم؟
 */
function checkBrowserSupport() {
  try {
    // التحقق من دعم الميزات الأساسية
    const unsupportedFeatures = [];
    
    // التحقق من دعم ES6
    if (typeof Promise !== 'function' || 
        typeof fetch !== 'function' || 
        typeof window.addEventListener !== 'function') {
      unsupportedFeatures.push('ES6');
    }
    
    // التحقق من دعم PWA
    if (!('serviceWorker' in navigator)) {
      unsupportedFeatures.push('PWA');
    }
    
    // التحقق من دعم Canvas
    if (!document.createElement('canvas').getContext) {
      unsupportedFeatures.push('Canvas');
    }
    
    // التحقق من دعم Web Workers
    if (!window.Worker) {
      unsupportedFeatures.push('Web Workers');
    }
    
    // التحقق من دعم MediaDevices (للبحث الصوتي)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      unsupportedFeatures.push('Media Devices');
    }
    
    // التحقق من دعم IndexedDB (للتخزين المحلي المتقدم)
    if (!window.indexedDB) {
      unsupportedFeatures.push('IndexedDB');
    }
    
    // التحقق من دعم WebAssembly (لـ FFmpeg.wasm)
    if (!window.WebAssembly) {
      unsupportedFeatures.push('WebAssembly');
    }
    
    // التحقق من دعم الموارد المطلوبة
    if (!window.fetch || !window.Promise) {
      unsupportedFeatures.push('Fetch API / Promise');
    }
    
    // إذا كانت هناك ميزات غير مدعومة، سجل تحذيرًا
    if (unsupportedFeatures.length > 0) {
      errorLogger.logWarning({
        message: `المتصفح لا يدعم بعض الميزات المطلوبة: ${unsupportedFeatures.join(', ')}`,
        origin: 'main.checkBrowserSupport',
        context: { browser: navigator.userAgent }
      });
      
      // عرض تنبيه للمستخدم في وضع التطوير
      if (isDevelopmentMode()) {
        console.warn(`[Main] المتصفح لا يدعم بعض الميزات المطلوبة: ${unsupportedFeatures.join(', ')}`);
      }
      
      // إرسال حدث لتسجيل معلومات المتصفح
      eventAggregator.publish(EVENTS.BROWSER_UNSUPPORTED_FEATURES, {
        features: unsupportedFeatures,
        userAgent: navigator.userAgent
      });
    }
    
    return unsupportedFeatures.length === 0;
  } catch (error) {
    errorLogger.handleError({
      error: error instanceof Error ? error : new Error(String(error)),
      message: 'فشل في التحقق من دعم المتصفح',
      origin: 'main.checkBrowserSupport',
      severity: 'warning'
    });
    return true; // الاستمرار رغم الخطأ
  }
}

/**
 * تهيئة مكونات التوافق والدعم
 */
function initializeCompatibilityFeatures() {
  // إضافة دعم لـ requestIdleCallback في المتصفحات القديمة
  if (typeof window.requestIdleCallback === 'undefined') {
    window.requestIdleCallback = (callback, options) => {
      const start = Date.now();
      return setTimeout(() => {
        callback({
          didTimeout: false,
          timeRemaining: () => Math.max(0, Date.now() - start)
        });
      }, 1);
    };
    
    window.cancelIdleCallback = id => clearTimeout(id);
  }
  
  // إضافة دعم لـ CustomEvent في المتصفحات القديمة
  if (typeof window.CustomEvent !== 'function') {
    window.CustomEvent = function(event, params) {
      params = params || { bubbles: false, cancelable: false, detail: undefined };
      const evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      return evt;
    };
    window.CustomEvent.prototype = window.Event.prototype;
  }
  
  // إضافة دعم لـ classList في Internet Explorer
  if (!("classList" in document.createElement("div"))) {
    (function () {
      const classList = {
        add: function(className) {
          if (!hasClass(this.element, className)) {
            this.element.className = this.element.className + ' ' + className;
          }
        },
        remove: function(className) {
          this.element.className = this.element.className
            .replace(new RegExp('(^|\\b)' + className + '(\\b|$)', 'g'), ' ');
        },
        toggle: function(className) {
          const has = hasClass(this.element, className);
          this[has ? 'remove' : 'add'](className);
          return !has;
        },
        contains: function(className) {
          return hasClass(this.element, className);
        }
      };
      
      function hasClass(element, className) {
        return (' ' + element.className + ' ').indexOf(' ' + className + ' ') > -1;
      }
      
      Object.defineProperty(Element.prototype, 'classList', {
        get: function() {
          return {
            element: this,
            add: classList.add.bind({ element: this }),
            remove: classList.remove.bind({ element: this }),
            toggle: classList.toggle.bind({ element: this }),
            contains: classList.contains.bind({ element: this }),
            item: (i) => {
              return this.element.className.split(/\s+/)[i] || null;
            }
          };
        }
      });
    })();
  }
  
  // إضافة دعم لـ closest في المتصفحات القديمة
  if (!Element.prototype.closest) {
    Element.prototype.closest = function(css) {
      let node = this;
      while (node) {
        if (node.matches(css)) return node;
        if (node === document.documentElement) break;
        node = node.parentElement;
      }
      return null;
    };
  }
  
  // إضافة دعم لـ matches في المتصفحات القديمة
  if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector || 
                               Element.prototype.webkitMatchesSelector ||
                               function(selector) {
                                 const matches = document.querySelectorAll(selector);
                                 let i = matches.length;
                                 while (--i >= 0 && matches.item(i) !== this) {}
                                 return i > -1;
                               };
  }
  
  // إضافة دعم لـ Element.remove()
  (function (arr) {
    arr.forEach(function (item) {
      if (item && item.remove) return;
      if (item && !item.remove) {
        item.remove = function () {
          if (this.parentNode) {
            this.parentNode.removeChild(this);
          }
        };
      }
    });
  })([Element.prototype, CharacterData.prototype, DocumentType.prototype]);
}

/**
 * إعداد مكونات التوافق والدعم
 */
initializeCompatibilityFeatures();

// --- التحقق من دعم المتصفح ---
if (!checkBrowserSupport()) {
  // عرض رسالة تحذيرية إذا لم يدعم المتصفح بعض الميزات الأساسية
  const unsupportedMessage = document.createElement('div');
  unsupportedMessage.className = 'browser-unsupported-message';
  unsupportedMessage.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    padding: 15px;
    background: #ff4d4d;
    color: white;
    font-family: 'Tajawal', 'Noto Naskh Arabic', sans-serif;
    text-align: center;
    z-index: 10000;
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0 4px 4px rgba(0, 0, 0, 0.25);
  `;
  unsupportedMessage.textContent = 'بعض ميزات المتصفح غير مدعومة. قد لا يعمل التطبيق بشكل صحيح.';
  
  const fixButton = document.createElement('button');
  fixButton.style.cssText = `
    margin-top: 10px;
    padding: 10px 20px;
    background: #ff9999;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    font-family: inherit;
  `;
  fixButton.textContent = 'إغلاق الرسالة';
  fixButton.onclick = () => {
    unsupportedMessage.remove();
  };
  
  unsupportedMessage.appendChild(fixButton);
  
  // إضافة رسالة التحذير إلى الجسم إذا لم يتم إضافتها بعد
  if (document.body && !document.querySelector('.browser-unsupported-message')) {
    document.body.appendChild(unsupportedMessage);
  }
}

// --- تشغيل التطبيق ---
// تشغيل التطبيق عندما يكون DOM جاهزًا
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    requestIdleCallback(main, { timeout: 2000 });
  });
} else {
  requestIdleCallback(main, { timeout: 2000 });
}

// --- مراقبة أداء التطبيق ---
// إضافة مراقبة الأداء
if (performance && performance.mark) {
  performance.mark('app-start');
}

// --- مراقبة تحميل الموارد ---
// إضافة مستمع لفحص تحميل الموارد
window.addEventListener('load', () => {
  if (performance && performance.mark) {
    performance.mark('app-loaded');
    performance.measure('محرر الفيديو', 'app-start', 'app-loaded');
    
    // تسجيل زمن التحميل
    const measure = performance.getEntriesByName('محرر الفيديو')[0];
    if (measure && measure.duration) {
      errorLogger.logInfo({
        message: `تم تحميل التطبيق في ${Math.round(measure.duration)} مللي ثانية`,
        origin: 'main.performanceMonitoring',
        context: { duration: measure.duration }
      });
      
      // إرسال معلومات الأداء إلى الخادم إذا لزم الأمر
      if (typeof sendPerformanceData === 'function') {
        sendPerformanceData({ 
          loadTime: measure.duration,
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        });
      }
    }
});

// --- التحقق من التحديثات ---
// التحقق من التحديثات بشكل دوري
const UPDATE_CHECK_INTERVAL = 86400000; // 24 ساعة
let updateCheckInterval = null;

function checkForUpdates() {
  try {
    // التحقق من وجود تحديثات جديدة
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CHECK_FOR_UPDATES' });
      
      // تلقي رسالة من Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          // إظهار إشعار التحديث
          if (typeof notificationPresenter !== 'undefined' && notificationPresenter.showNotification) {
            notificationPresenter.showNotification('تحديث متوفر', {
              message: 'تم العثور على تحديث جديد. هل تريد تحديث التطبيق الآن؟',
              type: 'info',
              duration: null, // لا تختفي تلقائيًا
              actions: [
                {
                  text: 'نعم',
                  handler: () => {
                    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
                    }
                  }
                },
                {
                  text: 'لاحقًا',
                  handler: () => {}
                }
              ]
            });
          } else {
            if (confirm('تم العثور على تحديث جديد. هل تريد تحديث التطبيق الآن؟')) {
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
              }
            }
          }
        } else if (event.data && event.data.type === 'UPDATE_APPLIED') {
          // إظهار إشعار التحديث
          if (typeof notificationPresenter !== 'undefined' && notificationPresenter.showNotification) {
            notificationPresenter.showNotification('تم تطبيق التحديث', {
              type: 'success',
              duration: 3000
            });
          } else {
            alert('تم تحديث التطبيق بنجاح. سيتم إعادة تحميل التطبيق الآن.');
            location.reload();
          }
        }
      });
    }
  } catch (error) {
    errorLogger.logWarning({
      message: 'فشل في التحقق من التحديثات',
      origin: 'main.updateCheck',
      context: { error: error.message }
    });
  }
}

// بدء التحقق من التحديثات
if (isDevelopmentMode()) {
  // في وضع التطوير، التحقق كل 5 دقائق فقط
  updateCheckInterval = setInterval(checkForUpdates, 300000);
} else {
  // في وضع الإنتاج، التحقق كل 24 ساعة
  checkForUpdates();
  updateCheckInterval = setInterval(checkForUpdates, UPDATE_CHECK_INTERVAL);
}

// --- دعم Service Worker ---
// التحقق من دعم Service Worker وتسجيله
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (isDevelopmentMode()) {
      // في وضع التطوير، استخدم sw.js مباشرة
      navigator.serviceWorker.register('./sw.js')
        .then(registration => {
          console.log('تم تسجيل Service Worker:', registration.scope);
          // إرسال حدث Service Worker المُسجّل
          eventAggregator.publish(EVENTS.SERVICE_WORKER_REGISTERED, { 
            scope: registration.scope,
            timestamp: Date.now()
          });
        })
        .catch(registrationError => {
          console.error('فشل تسجيل Service Worker:', registrationError);
          errorLogger.handleError({
            error: registrationError,
            message: 'فشل في تسجيل Service Worker',
            origin: 'main.serviceWorkerRegistration',
            severity: 'warning'
          });
        });
    } else {
      // في وضع الإنتاج، استخدم sw.js مع خيار scope
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then(registration => {
          console.log('Service Worker Registered:', registration.scope);
          eventAggregator.publish(EVENTS.SERVICE_WORKER_REGISTERED, { 
            scope: registration.scope,
            timestamp: Date.now()
          });
          
          // إرسال رسائل من Service Worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'CACHE_LOADED') {
              errorLogger.logInfo({
                message: 'تم تحميل الكاش من Service Worker',
                origin: 'main.serviceWorkerMessages'
              });
            }
          });
        })
        .catch(registrationError => {
          console.error('Service Worker Registration Failed:', registrationError);
          errorLogger.handleError({
            error: registrationError,
            message: 'فشل في تسجيل Service Worker',
            origin: 'main.serviceWorkerRegistration',
            severity: 'warning'
          });
        });
    }
  });
}

// --- التحقق من التحديثات ---
// التحقق من وجود تحديثات جديدة
function setupUpdateChecker() {
  if ('serviceWorker' in navigator) {
    // إنشاء وظيفة للتحقق من التحديثات
    const checkUpdate = () => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_FOR_UPDATES' });
      }
    };
    
    // إضافة زر التحديث إلى واجهة المستخدم
    const updateButton = document.getElementById('check-update-btn');
    if (updateButton) {
      updateButton.addEventListener('click', checkUpdate);
    }
    
    // التحقق من التحديثات تلقائيًا
    if (isDevelopmentMode()) {
      setInterval(checkUpdate, 300000); // كل 5 دقائق في وضع التطوير
    } else {
      setInterval(checkUpdate, 86400000); // كل 24 ساعة في وضع الإنتاج
    }
  }
}

// --- إعداد التحديثات ---
setupUpdateChecker();

// --- التفاعل مع المستخدم ---
// التفاعل مع المستخدم عند تحديث الصفحة
window.addEventListener('beforeunload', (e) => {
  const currentState = stateStore.getState();
  // التحقق مما إذا كانت هناك تغييرات غير محفوظة
  if (currentState && currentState.currentProject && currentState.currentProject.isDirty) {
    const confirmationMessage = 'توجد تغييرات غير محفوظة. هل أنت متأكد من رغبتك في الخروج؟';
    
    (e || window.event).returnValue = confirmationMessage; // Gecko + Chromium
    return confirmationMessage; // Gecko + Webkit
  }
});
