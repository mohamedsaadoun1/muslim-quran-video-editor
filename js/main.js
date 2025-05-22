/**
 * @fileoverview نقطة الدخول الرئيسية للتطبيق مع تهيئة شاملة ونهائية
 * @module main
 */

// --- وحدات النواة ---
import errorLogger from './core/error-logger.js';
import eventAggregator from './core/eventAggregator.js';
import stateStore from './core/state-store.js';
import DOMElements, { initializeCoreDomElements } from './core/dom-elements.js'; // DOMElements هنا هو الكائن الافتراضي المصدر
import moduleBootstrap from './core/module-bootstrap.js';
import resourceManager from './core/resource-manager.js';
import { initializeLocalizationService } from './core/localization.service.js';

// --- إعدادات التطبيق ---
import { 
  ACTIONS, 
  EVENTS, 
  LS_KEYS, 
  DEFAULT_PROJECT_SCHEMA, // سيتم حقنه
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
// import { initializePanelManager } from './shared-ui-components/panel.manager.js'; // افترض أنها ستُهيأ عبر moduleBootstrap إذا لزم الأمر
import { initializeNotificationPresenter } from './shared-ui-components/notification.presenter.js';
import { initializeSpinnerView } from './shared-ui-components/spinner.view.js';
import { initializeModalFactory } from './shared-ui-components/modal.factory.js';
// افترض وجود canvas.snapshot.service.js إذا كانت initializeCanvasSnapshotService تُستورد من مكان ما
// import { initializeCanvasSnapshotService } from './services/canvas.snapshot.service.js'; // مثال للمسار

// --- مُهيئات الميزات ---
// (الاستيرادات تبقى كما هي)
import { initializeProjectActions } from './features/project-manager/project.actions.js';
import { initializeProjectListRenderer } from './features/project-manager/project-list.renderer.js';
import { initializeQuranDataCache } from './features/quran-provider/quran.data.cache.js';
import { initializeQuranSelectorUI } from './features/quran-provider/quran-selector.ui.js';
import { initializeQuranVerseAnalyzer } from './features/quran-provider/quran-verse.analyzer.js';
import { initializeQuranVoiceInputHandler } from './features/quran-provider/quran-voice-input.handler.js';
import { initializeBackgroundActions } from './features/background-controller/background.actions.js';
import { initializeBackgroundColorChooser } from './features/background-controller/background-color.chooser.js';
import { initializeBackgroundImporterUI } from './features/background-controller/background-importer.ui.js';
import { initializeBackgroundAIConnector } from './features/background-controller/background-ai.connector.js';
import { initializeTextStylerUI } from './features/text-engine/text-styler.ui.js';
import { initializeTextRenderingLogic } from './features/text-engine/text.rendering.logic.js';
import { initializeAyahAudioRetriever } from './features/audio-engine/ayah-audio.retriever.js';
import { initializeMainPlaybackController } from './features/audio-engine/main-playback.controller.js';
import { initializeTimelineUpdaterUI } from './features/audio-engine/timeline.updater.ui.js';
import { initializeAudioSettingsManager } from './features/audio-engine/audio.settings.manager.js';
import { initializeBackgroundAudioMixer } from './features/audio-engine/background-audio.mixer.js';
import { initializeCanvasDimensionHandler } from './features/canvas-composer/canvas.dimension.handler.js';
import { initializeMainRenderer } from './features/canvas-composer/main-renderer.js';
import { initializeVideoFilterApplier } from './features/canvas-composer/video-filter.applier.js';
import { initializeCanvasSnapshotService } from './features/canvas-composer/canvas.snapshot.service.js'; // <-- تأكد من مسار هذا إذا كان initializeCanvasSnapshotService يُستخدم في moduleConfigs
import { initializeExportSettingsUI } from './features/video-exporter/export-settings.ui.js';
import { initializeCcaptureRecorder } from './features/video-exporter/ccapture.recorder.js';
import { initializeFFmpegIntegration } from './features/video-exporter/ffmpeg.integration.js';
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

// >>>>> بداية التعديلات المقترحة >>>>>
let localizationServiceInstance = null; // للاحتفاظ بنسخة الخدمة المهيئة

/**
 * تحميل البيانات المحفوظة وإعداد الحالة
 * @param {Object} services - الخدمات المطلوبة مثل localStorageAdapter, stateStore, errorLogger
 */
function loadPersistedDataAndInitializeState(services) {
  const { localStorageAdapter: lsa, stateStore: ss, errorLogger: el } = services;
  try {
    const persistedAppSettings = lsa.getItem(LS_KEYS.APP_SETTINGS);
    const persistedSavedProjects = lsa.getItem(LS_KEYS.SAVED_PROJECTS);
    
    ss.initializeWithState(persistedAppSettings, persistedSavedProjects);
  } catch (error) {
    el.handleError({
      error: error instanceof Error ? error : new Error(String(error)),
      message: 'فشل في تحميل البيانات المحفوظة',
      origin: 'main.loadPersistedDataAndInitializeState',
      severity: 'error'
    });
  }
}

/**
 * تهيئة خدمات النواة وإعدادها قبل بدء التطبيق
 * @param {Object} services - الخدمات المتاحة مثل stateStore, errorLogger, DOMElements, localizationServiceAPI
 */
function initializeCoreServicesAndUI(services) {
  const { stateStore: ss, errorLogger: el, DOMElements: dom, localizationServiceAPI: locApi, notificationServiceAPI: notifyApi } = services;
  try {
    ss.setErrorLogger(el);
    
    // تم حذف تعيين مسجل الأخطاء إلى المكونات المشتركة هنا لأنه سيتم حقنها في الوحدات نفسها

    const currentState = ss.getState();
    if (currentState?.appSettings?.preferredLanguage && locApi) {
      document.documentElement.setAttribute('lang', currentState.appSettings.preferredLanguage);
      // افترض أن locApi لديها دالة لضبط اللغة إذا لزم الأمر بشكل نشط
      if (typeof locApi.setLanguage === 'function') {
        locApi.setLanguage(currentState.appSettings.preferredLanguage);
      }
    }
    
    if (currentState?.currentTheme) {
      document.body.classList.remove('light-theme', 'dark-theme');
      document.body.classList.add(currentState.currentTheme === 'dark' ? 'dark-theme' : 'light-theme');
    }

    // --- الجزء الذي كان في setupBaseUIComponents تم دمجه هنا أو سيتم عبر moduleBootstrap ---
    if (dom?.appContainer) {
      dom.appContainer.classList.add('initialized');
      dom.appContainer.setAttribute('data-app-version', APP_VERSION);
      
      if (APP_NAME && locApi && typeof locApi.translate === 'function') {
        const appTitle = locApi.translate('app-title-tag') || APP_NAME; // افترض أن لديك مفتاح ترجمة
        const titleElements = document.querySelectorAll('[data-localize="app-title"], #app-header-title'); // استهداف العنوان في الهيدر أيضًا
        titleElements.forEach(element => {
          element.textContent = appTitle;
        });
        document.title = `${appTitle} - ${locApi.translate('app-main-title') || 'محرر فيديو القرآن الكريم'}`;
      } else if (APP_NAME) { // Fallback if localization not ready
         const titleElements = document.querySelectorAll('[data-localize="app-title"], #app-header-title');
         titleElements.forEach(element => {
          element.textContent = APP_NAME;
        });
      }
    }
    
    // تحديث تاريخ الحقوق - تأكد أن DOMElements.currentYearSpan موجود وصحيح
    if (dom?.panels?.initial?.currentYearSpan) {
       dom.panels.initial.currentYearSpan.textContent = new Date().getFullYear();
    } else if (document.getElementById('current-year')) { // fallback
        document.getElementById('current-year').textContent = new Date().getFullYear();
    }


    // إعداد خدمات التعرف على الصوت
    if ((window.SpeechRecognition || window.webkitSpeechRecognition) && speechRecognitionWrapper?.initialize) {
      speechRecognitionWrapper.initialize({
        language: currentState?.appSettings?.preferredLanguage || 'ar'
      });
    }

    // إشعارات بدء التشغيل
    if (currentState?.appSettings?.showStartupNotifications !== false && notifyApi?.showNotification) {
      const startupMessageKey = 'startupWelcomeMessage'; // مفتاح ترجمة
      const appTitleForMessage = (locApi && typeof locApi.translate === 'function' ? locApi.translate('app-title-tag') : APP_NAME) || "التطبيق";
      const startupMessage = (locApi && typeof locApi.translate === 'function' ? locApi.translate(startupMessageKey, { appName: appTitleForMessage, appVersion: APP_VERSION }) : `مرحباً بك في ${appTitleForMessage} v${APP_VERSION}`);
      
      notifyApi.showNotification(startupMessage, {
        type: 'info',
        duration: 5000,
        actions: [{
          text: (locApi && typeof locApi.translate === 'function' ? locApi.translate('startButton') : 'البدء'),
          handler: () => {}
        }]
      });
    }

  } catch (error) {
    el.handleError({
      error: error instanceof Error ? error : new Error(String(error)),
      message: 'فشل في تهيئة الخدمات الأساسية وواجهة المستخدم',
      origin: 'main.initializeCoreServicesAndUI',
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
    {
      name: 'FeatureFlags',
      initFn: initializeFeatureFlags, // افترض أنها تُرجع كائن featureFlags مباشرة أو API
      dependencies: ['errorLogger'],
      provides: 'featureFlags'
    },
    {
      name: 'LocalizationService',
      initFn: async (deps) => {
        localizationServiceInstance = await initializeLocalizationService(deps); // هيّء واحفظ النسخة
        return localizationServiceInstance;
      },
      dependencies: ['errorLogger', 'eventAggregator', 'stateStore'], // تحتاج stateStore للغة المفضلة
      provides: 'localizationServiceAPI'
    },
    {
      name: 'ThemeControllerModule', // اسم الوحدة يجب أن يكون فريدًا
      initFn: initializeThemeController,
      dependencies: [
          'DOMElements', 
          'stateStore', 
          'eventAggregator', 
          'errorLogger', 
          'localizationServiceAPI' // ستتوفر من الوحدة السابقة
      ],
      provides: 'themeControllerAPI'
    },
    {
      name: 'NotificationPresenterModule',
      initFn: initializeNotificationPresenter,
      dependencies: ['DOMElements', 'eventAggregator', 'errorLogger', 'localizationServiceAPI'],
      provides: 'notificationServiceAPI'
    },
    {
      name: 'SpinnerViewModule',
      initFn: initializeSpinnerView,
      dependencies: ['DOMElements', 'stateStore', 'errorLogger'],
      provides: 'spinnerServiceAPI'
    },
    {
      name: 'ModalFactoryModule',
      initFn: initializeModalFactory,
      dependencies: ['DOMElements','errorLogger', 'localizationServiceAPI'],
      provides: 'modalFactoryAPI'
    },
    {
      name: 'CanvasSnapshotServiceModule', // تأكد من اسم الدالة إذا كانت مختلفة
      initFn: initializeCanvasSnapshotService, // تأكد أن هذه الدالة موجودة ومستوردة
      dependencies: ['DOMElements','errorLogger'], // تحتاج DOMElements.previews.canvas
      provides: 'snapshotAPI'
    },
    {
      name: 'QuranDataCache',
      initFn: initializeQuranDataCache,
      dependencies: ['quranApiClient', 'errorLogger', 'eventAggregator', 'stateStore', 'localStorageAdapter'], // تحتاج localStorage
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
      dependencies: ['DOMElements','errorLogger', 'resourceManager', 'stateStore'], // resourceManager للخطوط
      provides: 'textRenderingLogicAPI'
    },
    {
      name: 'ProjectActions',
      initFn: initializeProjectActions,
      dependencies: ['stateStore', 'localStorageAdapter', 'errorLogger', 'notificationServiceAPI', 'eventAggregator', 'modalFactoryAPI', 'DEFAULT_PROJECT_SCHEMA'],
      provides: 'projectActionsAPI'
    },
    {
      name: 'BackgroundActions',
      initFn: initializeBackgroundActions,
      dependencies: ['stateStore', 'eventAggregator', 'errorLogger'], // أضفت errorLogger و eventAggregator
      provides: 'backgroundActionsAPI'
    },
    {
      name: 'MainPlaybackController',
      initFn: initializeMainPlaybackController,
      dependencies: ['DOMElements', 'stateStore', 'eventAggregator', 'errorLogger', 'ayahAudioServiceAPI', 'localizationServiceAPI'],
      provides: 'mainPlaybackAPI'
    },
    {
      name: 'ProjectListRenderer',
      initFn: initializeProjectListRenderer,
      dependencies: ['DOMElements', 'stateStore', 'eventAggregator', 'errorLogger', 'localizationServiceAPI', 'modalFactoryAPI', 'notificationServiceAPI', 'projectActionsAPI'],
      provides: 'projectListRendererAPI'
    },
    {
      name: 'QuranSelectorUI',
      initFn: initializeQuranSelectorUI,
      dependencies: ['DOMElements', 'stateStore', 'eventAggregator', 'errorLogger', 'quranDataCacheAPI', 'localizationServiceAPI', 'quranVerseAnalyzerAPI', 'quranVoiceInputAPI'],
      provides: 'quranSelectorUIAPI'
    },
    {
      name: 'QuranVoiceInputHandler',
      initFn: initializeQuranVoiceInputHandler,
      dependencies: ['DOMElements', 'stateStore', 'eventAggregator', 'errorLogger', 'notificationServiceAPI', 'speechRecognitionWrapper', 'quranDataCacheAPI', 'quranVerseAnalyzerAPI', 'localizationServiceAPI'],
      provides: 'quranVoiceInputAPI'
    },
    {
      name: 'BackgroundColorChooser',
      initFn: initializeBackgroundColorChooser,
      dependencies: ['DOMElements', 'stateStore', 'errorLogger', 'backgroundActionsAPI'],
      provides: 'backgroundColorChooserAPI'
    },
    {
      name: 'BackgroundImporterUI',
      initFn: initializeBackgroundImporterUI,
      dependencies: ['DOMElements', 'stateStore', 'errorLogger', 'notificationServiceAPI', 'backgroundActionsAPI', 'fileIOUtils'],
      provides: 'backgroundImporterUIAPI'
    },
    {
      name: 'BackgroundAIConnector',
      initFn: initializeBackgroundAIConnector,
      dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'pexelsAPI', 'backgroundActionsAPI', 'notificationServiceAPI'],
      provides: 'backgroundAIServiceAPI'
    },
    {
      name: 'TextStylerUI',
      initFn: initializeTextStylerUI,
      dependencies: ['DOMElements', 'stateStore', 'errorLogger', 'eventAggregator'], // أضفت eventAggregator
      provides: 'textStylerUIAPI'
    },
    {
      name: 'AudioSettingsManager',
      initFn: initializeAudioSettingsManager,
      dependencies: ['DOMElements', 'stateStore', 'errorLogger', 'eventAggregator'], // أضفت eventAggregator
      provides: 'audioSettingsManagerAPI'
    },
    {
      name: 'TimelineUpdaterUI',
      initFn: initializeTimelineUpdaterUI,
      dependencies: ['DOMElements', 'eventAggregator', 'errorLogger', 'mainPlaybackAPI', 'stateStore'],
      provides: 'timelineUpdaterUIAPI'
    },
    {
      name: 'BackgroundAudioMixer',
      initFn: initializeBackgroundAudioMixer,
      dependencies: ['DOMElements','stateStore', 'eventAggregator', 'errorLogger', 'fileIOUtils'],
      provides: 'backgroundAudioAPI'
    },
    {
      name: 'CanvasDimensionHandler',
      initFn: initializeCanvasDimensionHandler,
      dependencies: ['DOMElements', 'stateStore', 'errorLogger', 'eventAggregator'],
      provides: 'canvasDimensionsAPI'
    },
    {
      name: 'VideoFilterApplier',
      initFn: initializeVideoFilterApplier,
      dependencies: ['DOMElements', 'stateStore', 'errorLogger'],
      provides: 'videoFilterApplierAPI'
    },
    {
      name: 'MainRenderer',
      initFn: initializeMainRenderer,
      dependencies: [
          'DOMElements', 
          'stateStore', 
          'eventAggregator', 
          'errorLogger', 
          'localizationServiceAPI', 
          'resourceManager', 
          'canvasDimensionsAPI', 
          'textRenderingLogicAPI',
          'snapshotAPI' // snapshotAPI من CanvasSnapshotServiceModule
        ],
      provides: 'mainRendererAPI'
    },
    {
      name: 'ExportSettingsUI',
      initFn: initializeExportSettingsUI,
      dependencies: ['DOMElements', 'stateStore', 'errorLogger', 'notificationServiceAPI', 'mainPlaybackAPI', 'localizationServiceAPI', 'eventAggregator', 'exportRecorderAPI'],
      provides: 'exportSettingsUIAPI'
    },
    {
      name: 'CcaptureRecorderModule', // اسم الوحدة يجب أن يكون فريدًا
      initFn: initializeCcaptureRecorder,
      dependencies: [
          'DOMElements', 
          'DEFAULT_PROJECT_SCHEMA',
          'stateStore', 
          'errorLogger', 
          'notificationServiceAPI',
          'mainRendererAPI', 
          'eventAggregator', 
          'fileIOUtils'
      ],
      provides: 'exportRecorderAPI'
    },
    {
      name: 'FFmpegIntegration',
      initFn: initializeFFmpegIntegration,
      dependencies: ['stateStore', 'errorLogger', 'notificationServiceAPI', 'spinnerServiceAPI'], // تحتاج spinner
      provides: 'ffmpegAPI'
    },
    {
      name: 'ScreenNavigator',
      initFn: initializeScreenNavigator,
      dependencies: ['DOMElements','stateStore', 'eventAggregator', 'errorLogger'],
      provides: 'screenNavigatorAPI'
    },
    {
      name: 'MainToolbarHandler',
      initFn: initializeMainToolbarHandler,
      dependencies: ['DOMElements','stateStore', 'eventAggregator', 'errorLogger', 'projectActionsAPI', 'themeControllerAPI'], // تحتاج themeControllerAPI
      provides: 'mainToolbarHandlerAPI'
    },
    {
      name: 'PlaybackControlStripUI',
      initFn: initializePlaybackControlStrip,
      dependencies: ['DOMElements', 'stateStore', 'eventAggregator', 'errorLogger', 'mainPlaybackAPI', 'localizationServiceAPI'],
      provides: 'playbackControlStripAPI'
    },
    {
      name: 'ProjectTitleEditor',
      initFn: initializeProjectTitleEditor,
      dependencies: ['DOMElements', 'stateStore', 'eventAggregator', 'errorLogger', 'localizationServiceAPI', 'notificationServiceAPI'],
      provides: 'projectTitleEditorAPI'
    },
    {
      name: 'GlobalShortcutsBinder',
      initFn: initializeGlobalShortcutsBinder,
      dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'mainPlaybackAPI', 'projectActionsAPI', 'DOMElements'],
      provides: 'globalShortcutsBinderAPI'
    }
  ];
}
// <<<<< نهاية التعديلات المقترحة (الجزء الأول) <<<<<

/**
 * التحقق مما إذا كان التطبيق يعمل في وضع التطوير
 * @returns {boolean} هل التطبيق في وضع التطوير؟
 */
function isDevelopmentMode() {
  // طريقة أكثر موثوقية لتحديد وضع التطوير، خاصة للمشاريع التي لا تستخدم Node.js process.env
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

/**
 * التحقق من توفر الموارد الأساسية
 * @returns {boolean} هل الموارد الأساسية متوفرة؟
 */
function checkCoreResources() {
  try {
    const missingModules = [];
    if (!errorLogger) missingModules.push('errorLogger');
    if (!eventAggregator) missingModules.push('eventAggregator');
    if (!stateStore) missingModules.push('stateStore');
    // DOMElements يتم تهيئته لاحقًا، لا نتحقق منه هنا بعد الآن
    if (!moduleBootstrap) missingModules.push('moduleBootstrap');
    if (!resourceManager) missingModules.push('resourceManager');
    if (!localStorageAdapter) missingModules.push('localStorageAdapter');
    if (!quranApiClient) missingModules.push('quranApiClient');
    if (!pexelsAPI) missingModules.push('pexelsAPI');
    if (!speechRecognitionWrapper) missingModules.push('speechRecognitionWrapper');
    if (!fileIOUtils) missingModules.push('fileIOUtils');
    
    if (missingModules.length > 0) {
      // استخدم console.error مبدئيًا لأن errorLogger قد لا يكون مهيأ بالكامل هنا
      console.error(`Critical Error: Core modules missing: ${missingModules.join(', ')}`);
      throw new Error(`الوحدات الأساسية التالية غير متوفرة: ${missingModules.join(', ')}`);
    }
    return true;
  } catch (error) {
    console.error('فشل في التحقق من توفر الموارد الأساسية:', error);
    // لا يمكن الاعتماد على errorLogger هنا إذا كان هو نفسه مفقودًا أو غير مهيأ
    // errorLogger?.handleError?.({ /*...*/ }); // تحقق من وجوده أولاً
    return false;
  }
}

/**
 * إعداد مسجل الأخطاء العالمي
 */
function setupGlobalErrorHandlers() {
  const logGlobalError = (error, message, origin, severity = 'critical', context = {}) => {
    const err = error instanceof Error ? error : new Error(String(error || message));
    // حاول استخدام errorLogger إذا كان متاحًا، وإلا استخدم console.error
    if (typeof errorLogger !== 'undefined' && typeof errorLogger.handleError === 'function') {
        errorLogger.handleError({ error: err, message: message || err.message, origin, severity, context });
    } else {
        console.error(`[${origin}] ${severity.toUpperCase()}: ${message || err.message}`, err, context);
    }
  };

  window.addEventListener('unhandledrejection', (event) => {
    logGlobalError(event.reason, 'تم رفض الوعود غير المُعالجة.', 'GlobalUnhandledRejection', 'critical', { promiseDetail: event.reason });
  });
  
  window.addEventListener('error', (event) => {
    if (event.error) {
      logGlobalError(event.error, event.message, `GlobalError (${event.filename || 'unknown'})`, 'critical', { lineno: event.lineno, colno: event.colno });
    } else if (event.message) {
      logGlobalError(null, `حدث خطأ عام: ${event.message}`, 'GlobalErrorEvent', 'warning');
    }
  });
}


/**
 * وظيفة الدخول الرئيسية للتطبيق
 */
async function main() {
  try {
    // هذا يجب أن يكون أول شيء يتم إعداده
    setupGlobalErrorHandlers();
    
    if (!checkCoreResources()) {
      // لا يمكن المتابعة إذا كانت الموارد الأساسية مفقودة
      document.body.innerHTML = `<p style="color:red; padding:20px; text-align:center;">فشل تحميل الموارد الأساسية للتطبيق.</p>`;
      return;
    }
    
    if (isDevelopmentMode()) {
      window.errorLoggerGlobal = errorLogger;
      window.eventAggregatorGlobal = eventAggregator;
      window.stateStoreGlobal = stateStore;
      window.ACTIONS = ACTIONS;
      window.EVENTS = EVENTS;
      window.featureFlagsGlobal = featureFlags;
      // DOMElements سيتاح بعد تهيئته
    }
    
    // >>>>> بداية التعديلات المقترحة (الجزء الثاني) >>>>>
    // تهيئة DOMElements يجب أن تكون بعد errorLogger وقبل استخدامه في أي مكان آخر
    try {
      initializeCoreDomElements({ logger: errorLogger });
      errorLogger.logInfo({ message: '[Main] تم تهيئة عناصر DOM الأساسية بنجاح.' });
      if (isDevelopmentMode()) window.DOMElementsGlobal = DOMElements; // إتاحته عالميًا بعد التهيئة
    } catch (error) {
      errorLogger.handleError({
        error, message: 'فشل فادح في تهيئة عناصر DOM', origin: 'main.initializeCoreDomElements', severity: 'critical'
      });
      if (DOMElements?.app?.container) { // تحقق من وجود الحاوية
        DOMElements.app.container.innerHTML = `<p style="color:red; padding:20px; text-align:center;">فشل تهيئة مكونات التطبيق الأساسية. ${error.message}</p>`;
      } else {
        document.body.innerHTML = `<p style="color:red; padding:20px; text-align:center;">فشل تهيئة مكونات التطبيق الأساسية جدًا. ${error.message}</p>`;
      }
      return; // إيقاف التنفيذ
    }
    
    const coreServicesForBootstrap = {
      DOMElements, // DOMElements المُهيأ مباشرة
      DEFAULT_PROJECT_SCHEMA,
      stateStore,
      eventAggregator,
      errorLogger,
      resourceManager,
      localStorageAdapter,
      quranApiClient,
      pexelsAPI,
      speechRecognitionWrapper,
      fileIOUtils,
      featureFlags, 
      // localizationServiceAPI, notificationServiceAPI, etc. سيتم توفيرها من خلال moduleBootstrap
    };

    // تم استدعاء هذا قبل moduleBootstrap لتكون حالة التطبيق الأساسية جاهزة
    loadPersistedDataAndInitializeState({ localStorageAdapter, stateStore, errorLogger });
    
    const moduleConfigs = getApplicationModuleConfigs();
    
    errorLogger.logInfo({ message: '[Main] بدء تهيئة الوحدات عبر moduleBootstrap...' });
    await moduleBootstrap.initializeAllModules(coreServicesForBootstrap, moduleConfigs);
    // الآن coreServicesForBootstrap يجب أن يحتوي على الخدمات التي تم توفيرها (مثل localizationServiceAPI, themeControllerAPI, etc.)
    errorLogger.logInfo({ message: '[Main] تم الانتهاء من تهيئة جميع الوحدات عبر moduleBootstrap.' });

    // بعد أن هيأت كل الوحدات (بما في ذلك localizationService), قم بتهيئة UI & Services
    // initializeCoreServicesAndUI الآن يجب أن تستخدم الخدمات من coreServicesForBootstrap
    // خاصة localizationServiceAPI و notificationServiceAPI
    initializeCoreServicesAndUI(coreServicesForBootstrap); 
    errorLogger.logInfo({ message: '[Main] تم الانتهاء من تهيئة خدمات النواة وواجهة المستخدم.' });

    // <<<<< نهاية التعديلات المقترحة (الجزء الثاني) <<<<<
    
    errorLogger.logInfo({ message: `[Main] ${APP_NAME} v${APP_VERSION} تم تهيئته ومستعد للاستخدام.`});
    
    eventAggregator.publish(EVENTS.APP_INITIALIZED, { 
      timestamp: Date.now(), 
      version: APP_VERSION,
      theme: stateStore.getState().currentTheme // افترض أن currentTheme موجود في الحالة
    });
    
    if (DOMElements?.app?.container) {
      DOMElements.app.container.classList.add('app-ready');
      DOMElements.app.container.setAttribute('data-app-status', 'ready');
    } else {
      errorLogger.logWarning({message: "App container (DOMElements.app.container) not found after init.", origin: "main"});
    }

  } catch (error) {
    const finalErrorMessage = error instanceof Error ? error.message : String(error);
    if (typeof errorLogger !== 'undefined' && typeof errorLogger.handleError === 'function') {
        errorLogger.handleError({
        error: error instanceof Error ? error : new Error(finalErrorMessage),
        message: 'فشل فادح في تشغيل التطبيق',
        origin: 'main.catchAll',
        severity: 'critical'
        });
    } else {
        console.error("CRITICAL ERROR IN MAIN (errorLogger unavailable):", finalErrorMessage, error);
    }
    if (document.body) {
      document.body.innerHTML = `<p style="color:red; padding:20px; text-align:center;">فشل في تهيئة التطبيق. تفاصيل الخطأ: ${finalErrorMessage}</p>`;
    }
  }
}

// (دوال التحقق من المتصفح والتوافق تبقى كما هي أو يتم تحسينها حسب الحاجة)
// ...
function checkBrowserSupport() {
  try {
    const unsupportedFeatures = [];
    if (typeof Promise !== 'function') unsupportedFeatures.push('Promise');
    if (typeof fetch !== 'function') unsupportedFeatures.push('Fetch API');
    if (!('serviceWorker' in navigator)) unsupportedFeatures.push('ServiceWorker');
    if (!document.createElement('canvas').getContext) unsupportedFeatures.push('Canvas');
    if (!window.Worker) unsupportedFeatures.push('Web Workers');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) unsupportedFeatures.push('MediaDevices API');
    // if (!window.indexedDB) unsupportedFeatures.push('IndexedDB'); // يمكن أن يكون اختياريًا
    if (typeof WebAssembly !== 'object' && typeof WebAssembly.instantiate !== 'function') { // تحقق أدق
      unsupportedFeatures.push('WebAssembly');
    }
    
    if (unsupportedFeatures.length > 0) {
      const errorMsg = `المتصفح لا يدعم بعض الميزات المطلوبة: ${unsupportedFeatures.join(', ')}`;
      console.warn(`[BrowserSupport] ${errorMsg}`);
      errorLogger?.logWarning?.({ // استخدم optional chaining
        message: errorMsg,
        origin: 'main.checkBrowserSupport',
        context: { browser: navigator.userAgent, features: unsupportedFeatures }
      });
      eventAggregator?.publish?.(EVENTS.BROWSER_UNSUPPORTED_FEATURES, {
        features: unsupportedFeatures,
        userAgent: navigator.userAgent
      });
      return false; // إرجاع false للإشارة إلى عدم الدعم
    }
    return true;
  } catch (error) {
    errorLogger?.handleError?.({
      error: error instanceof Error ? error : new Error(String(error)),
      message: 'فشل في التحقق من دعم المتصفح',
      origin: 'main.checkBrowserSupport',
      severity: 'warning'
    });
    return true; // الاستمرار بحذر
  }
}

function initializeCompatibilityFeatures() {
  // (الكود الخاص بالتوافق كما هو - تأكد أنه يعمل بشكل صحيح أو أزل الأجزاء غير الضرورية)
  // Polyfills are generally good to have.
}
initializeCompatibilityFeatures();


// --- تشغيل التطبيق ---
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!checkBrowserSupport()) { // التحقق من المتصفح قبل محاولة التشغيل
        const unsupportedMessageContainer = document.getElementById('app-container') || document.body;
        unsupportedMessageContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; font-family: 'Tajawal', sans-serif;">
                <h2 style="color: #D32F2F;">متصفحك غير مدعوم بشكل كامل</h2>
                <p style="font-size: 1.1em;">يبدو أن متصفحك لا يدعم بعض التقنيات الحديثة اللازمة لعمل هذا التطبيق بشكل مثالي.</p>
                <p>نوصي باستخدام نسخة أحدث من متصفح مثل Google Chrome, Firefox, Safari, أو Edge.</p>
                <p style="font-size: 0.9em; color: #757575;">إذا كنت تعتقد أن هذه الرسالة ظهرت عن طريق الخطأ، يمكنك محاولة تحديث الصفحة.</p>
            </div>`;
        return; // لا تتابع إذا كان المتصفح غير مدعوم بشكل حاسم
    }
    requestIdleCallback(main, { timeout: 2000 });
  });
} else {
  if (!checkBrowserSupport()) {
    const unsupportedMessageContainer = document.getElementById('app-container') || document.body;
    unsupportedMessageContainer.innerHTML = `...`; // نفس رسالة عدم الدعم
  } else {
    requestIdleCallback(main, { timeout: 2000 });
  }
}

// --- مراقبة أداء التطبيق ---
// (الكود الخاص بمراقبة الأداء كما هو)
// ...

// --- التحقق من التحديثات و Service Worker ---
// (الكود الخاص بالتحديثات و Service Worker كما هو - لكن تأكد أن notificationPresenter يتم تهيئته بشكل صحيح قبل استخدامه)
// من الأفضل أن يتم استدعاء setupUpdateChecker بعد تهيئة moduleBootstrap بالكامل
// لأنها تعتمد على notificationPresenter
eventAggregator.subscribe(EVENTS.APP_INITIALIZED, () => {
    // setupUpdateChecker() and other post-init logic can go here
    // This ensures all services notificationPresenter are ready.
    // For now, keeping your original structure for checkForUpdates but it might need adjustment.
    let updateCheckIntervalId = null;
    function checkForUpdatesPeriodic() {
        // (محتوى checkForUpdates هنا - تأكد أن notificationServiceAPI متاحة من coreServicesForBootstrap)
        const notifyApi = coreServicesForBootstrap.notificationServiceAPI; // يجب أن تكون هذه متاحة
        // ... استخدام notifyApi.showNotification ...
    }

    // if (isDevelopmentMode()) {
    //     updateCheckIntervalId = setInterval(checkForUpdatesPeriodic, 300000);
    // } else {
    //     checkForUpdatesPeriodic();
    //     updateCheckIntervalId = setInterval(checkForUpdatesPeriodic, UPDATE_CHECK_INTERVAL);
    // }
});


// --- التفاعل مع المستخدم ---
// (الكود الخاص بـ beforeunload كما هو)
