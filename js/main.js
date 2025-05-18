// js/main.js

// --- Core Module Imports ---
import errorLogger from './core/error-logger.js';
import eventAggregator from './core/event-aggregator.js';
import stateStore from './core/state-store.js';
import DOMElements, { initializeCoreDomElements } from './core/dom-elements.js';
import moduleBootstrap from './core/module-bootstrap.js';
import resourceManager from './core/resource-manager.js';
import { initializeLocalizationService } from './core/localization.service.js';

// --- Config Imports ---
import { ACTIONS, EVENTS, LS_KEYS, DEFAULT_PROJECT_SCHEMA, APP_NAME } from './config/app.constants.js';
import featureFlags, { initializeFeatureFlags } from './config/feature.flags.config.js'; // Assuming you want to use it
// api-keys.config.js is usually imported by the service that needs it (e.g., pexels.api.client.js)

// --- Service Imports (mostly direct objects, or init if they need it) ---
import localStorageAdapter from './services/local-storage.adapter.js';
import quranApiClient from './services/quran.api.client.js';
import pexelsAPI from './services/pexels.api.client.js';
import speechRecognitionWrapper from './services/speech.recognition.wrapper.js';
import fileIOUtils from './services/file.io.utils.js';

// --- Shared UI Component Initializers ---
import { initializeThemeController } from './shared-ui-components/theme.controller.js';
import { initializePanelManager } from './shared-ui-components/panel.manager.js';
import { initializeNotificationPresenter } from './shared-ui-components/notification.presenter.js';
import { initializeSpinnerView } from './shared-ui-components/spinner.view.js';
import { initializeModalFactory } from './shared-ui-components/modal.factory.js';
// dynamicSelectBuilder is imported directly by modules that use it

// --- Feature Module Initializers ---
// Project Manager
import { initializeProjectActions } from './features/project-manager/project.actions.js';
import { initializeProjectListRenderer } from './features/project-manager/project-list.renderer.js';
import { initializeProjectModel } from './features/project-manager/project.model.js';       // Usually just exports functions
import { initializeProjectSelectors } from './features/project-manager/project.selectors.js'; // Usually just exports functions

// Quran Provider
import { initializeQuranDataCache } from './features/quran-provider/quran.data.cache.js';
import { initializeQuranSelectorUI } from './features/quran-provider/quran-selector.ui.js';
import { initializeQuranVerseAnalyzer } from './features/quran-provider/quran-verse.analyzer.js';
import { initializeQuranVoiceInputHandler } from './features/quran-provider/quran-voice-input.handler.js';
// quran.state.config.js usually just exports if used for selectors/defaults

// Background Controller
import { initializeBackgroundActions } from './features/background-controller/background.actions.js';
import { initializeBackgroundColorChooser } from './features/background-controller/background-color.chooser.js';
import { initializeBackgroundImporterUI } from './features/background-controller/background-importer.ui.js';
import { initializeBackgroundAIConnector } from './features/background-controller/background-ai.connector.js';
// background.state.js usually just exports selectors/defaults

// Text Engine
import { initializeTextStylerUI } from './features/text-engine/text-styler.ui.js';
import { initializeTextRenderingLogic } from './features/text-engine/text.rendering.logic.js';
// text.styling.options.js and text.state.adapter.js usually export directly

// Audio Engine
import { initializeAyahAudioRetriever } from './features/audio-engine/ayah-audio.retriever.js';
import { initializeMainPlaybackController } from './features/audio-engine/main-playback.controller.js';
import { initializeTimelineUpdaterUI } from './features/audio-engine/timeline.updater.ui.js';
import { initializeAudioSettingsManager } from './features/audio-engine/audio.settings.manager.js';
import { initializeBackgroundAudioMixer } from './features/audio-engine/background-audio.mixer.js';
// audio-track-extractor.js was discussed

// Canvas Composer
import { initializeCanvasDimensionHandler } from './features/canvas-composer/canvas.dimension.handler.js';
import { initializeMainRenderer } from './features/canvas-composer/main-renderer.js';
import { initializeVideoFilterApplier } from './features/canvas-composer/video-filter.applier.js';
import { initializeCanvasSnapshotService } from './features/canvas-composer/canvas.snapshot.service.js';

// Video Exporter
import { initializeExportSettingsUI } from './features/video-exporter/export-settings.ui.js';
import { initializeCcaptureRecorder } from './features/video-exporter/ccapture.recorder.js';
import { initializeFFmpegIntegration } from './features/video-exporter/ffmpeg.integration.js';
// export.progress.tracker.js was discussed (may be part of export-settings.ui)

// Editor Shell
import { initializeScreenNavigator } from './features/editor-shell/screen.navigator.js';
import { initializeMainToolbarHandler } from './features/editor-shell/main-toolbar.handler.js';
import { initializePlaybackControlStrip } from './features/editor-shell/playback-control-strip.ui.js';
import { initializeProjectTitleEditor } from './features/editor-shell/project-title.editor.js';
import { initializeGlobalShortcutsBinder } from './features/editor-shell/global-shortcuts.binder.js';


// --- Global Error Handlers (Safety Net) ---
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  errorLogger.handleError({
    error: reason instanceof Error ? reason : new Error(String(reason)),
    message: 'Unhandled promise rejection caught globally.',
    origin: 'GlobalUnhandledRejection',
    context: { promiseDetail: reason }, // Avoid circular refs with 'event'
  });
});
window.addEventListener('error', (event) => {
  if (event.error) {
    errorLogger.handleError({
      error: event.error, message: event.message || 'Uncaught exception.',
      origin: `GlobalError (${event.filename || 'unknown'})`,
      context: { lineno: event.lineno, colno: event.colno }
    });
  } else if (event.message) { // Handle string errors
     errorLogger.logWarning({ message: `Global Error Event: ${event.message}`, origin: 'GlobalErrorEvent' });
  }
});

/**
 * Loads persisted application settings and saved projects.
 * Initializes stateStore with these values.
 */
function loadPersistedDataAndInitializeState() {
  const persistedAppSettings = localStorageAdapter.getItem(LS_KEYS.APP_SETTINGS);
  const persistedSavedProjects = localStorageAdapter.getItem(LS_KEYS.SAVED_PROJECTS);
  // Note: theme is loaded via appSettings.preferredTheme inside stateStore.initializeWithState now
  stateStore.initializeWithState(persistedAppSettings, persistedSavedProjects); // Updated signature
}


// --- Module Configuration for Bootstrap ---
// Order is important! Core services & data providers usually first.
// Then UI controllers, then more specific feature UI.
const moduleConfigs = [
  // Phase 0: Base utilities/configs that other initializers might use directly
  { name: 'FeatureFlags', initFn: initializeFeatureFlags, dependencies: ['errorLogger'] /*, provides: 'featureFlagsAPI' // Or import directly */ },
  { name: 'LocalizationService', initFn: initializeLocalizationService, dependencies: ['errorLogger', 'eventAggregator'], provides: 'localizationServiceAPI' },
  { name: 'CanvasSnapshotService', initFn: initializeCanvasSnapshotService, dependencies: ['errorLogger'], provides: 'snapshotAPI' },

  // Phase 1: Core UI Controllers & Services
  { name: 'ThemeController', initFn: initializeThemeController, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'localizationServiceAPI'] },
  { name: 'NotificationPresenter', initFn: initializeNotificationPresenter, dependencies: ['eventAggregator', 'errorLogger', 'localizationServiceAPI'], provides: 'notificationServiceAPI' },
  { name: 'SpinnerView', initFn: initializeSpinnerView, dependencies: ['stateStore', 'errorLogger'], provides: 'spinnerServiceAPI' },
  { name: 'ModalFactory', initFn: initializeModalFactory, dependencies: ['errorLogger', 'localizationServiceAPI'], provides: 'modalFactoryAPI' },

  // Phase 2: Data Providers & Core Logic Services
  // { name: 'ProjectModel', initFn: initializeProjectModel, dependencies: [], provides: 'projectModelAPI' }, // Usually not needed if just functions
  // { name: 'ProjectSelectors', initFn: initializeProjectSelectors, dependencies: ['localizationServiceAPI'], provides: 'projectSelectorsAPI' }, // Usually not needed
  { name: 'QuranDataCache', initFn: initializeQuranDataCache, dependencies: ['quranApiClient', 'errorLogger', 'eventAggregator', 'stateStore'], provides: 'quranDataCacheAPI' },
  { name: 'QuranVerseAnalyzer', initFn: initializeQuranVerseAnalyzer, dependencies: ['errorLogger', 'quranDataCacheAPI'], provides: 'quranVerseAnalyzerAPI' },
  { name: 'AyahAudioRetriever', initFn: initializeAyahAudioRetriever, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'quranApiClient' /* or from quranDataCacheAPI? */], provides: 'ayahAudioServiceAPI' },
  { name: 'TextRenderingLogic', initFn: initializeTextRenderingLogic, dependencies: ['errorLogger'], provides: 'textRenderingLogicAPI' },

  // Phase 3: Core Feature Actions & Controllers (often depend on data providers)
  { name: 'ProjectActions', initFn: initializeProjectActions, dependencies: ['stateStore', 'localStorageAdapter', 'errorLogger', 'notificationServiceAPI', 'eventAggregator', 'modalFactoryAPI'], provides: 'projectActionsAPI' },
  { name: 'BackgroundActions', initFn: initializeBackgroundActions, dependencies: ['stateStore'], provides: 'backgroundActionsAPI' }, // May need more
  { name: 'MainPlaybackController', initFn: initializeMainPlaybackController, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'ayahAudioServiceAPI', 'localizationServiceAPI'], provides: 'mainPlaybackAPI' },

  // Phase 4: UI Modules that bind to state, actions, and services
  // Project Manager UI
  { name: 'ProjectListRenderer', initFn: initializeProjectListRenderer, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'localizationServiceAPI', 'modalFactoryAPI', 'notificationServiceAPI', 'projectActionsAPI'] },
  // Quran Provider UI
  { name: 'QuranSelectorUI', initFn: initializeQuranSelectorUI, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'quranDataCacheAPI', 'localizationServiceAPI', 'quranVerseAnalyzerAPI', 'quranVoiceInputAPI'] }, // quranVoiceInputAPI added
  { name: 'QuranVoiceInputHandler', initFn: initializeQuranVoiceInputHandler, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'notificationServiceAPI', 'speechRecognitionWrapper', 'quranDataCacheAPI', 'quranVerseAnalyzerAPI', 'localizationServiceAPI'], provides: 'quranVoiceInputAPI' },
  // Background Controller UI
  { name: 'BackgroundColorChooser', initFn: initializeBackgroundColorChooser, dependencies: ['stateStore', 'errorLogger', 'backgroundActionsAPI'] },
  { name: 'BackgroundImporterUI', initFn: initializeBackgroundImporterUI, dependencies: ['stateStore', 'errorLogger', 'notificationServiceAPI', 'backgroundActionsAPI', 'fileIOUtils'] },
  { name: 'BackgroundAIConnector', initFn: initializeBackgroundAIConnector, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'pexelsAPI', 'backgroundActionsAPI'], provides: 'backgroundAIServiceAPI' },
  // Text Engine UI
  { name: 'TextStylerUI', initFn: initializeTextStylerUI, dependencies: ['stateStore', 'errorLogger' /* , 'dynamicSelectBuilder' directly imported */] },
  // Audio Engine UI
  { name: 'AudioSettingsManager', initFn: initializeAudioSettingsManager, dependencies: ['stateStore', 'errorLogger'] },
  { name: 'TimelineUpdaterUI', initFn: initializeTimelineUpdaterUI, dependencies: ['eventAggregator', 'errorLogger', 'mainPlaybackAPI', 'stateStore'] },
  { name: 'BackgroundAudioMixer', initFn: initializeBackgroundAudioMixer, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'fileIOUtils'], provides: 'backgroundAudioAPI' },
  // Canvas Composer UI/Logic
  { name: 'CanvasDimensionHandler', initFn: initializeCanvasDimensionHandler, dependencies: ['stateStore', 'errorLogger', 'eventAggregator'], provides: 'canvasDimensionsAPI' },
  { name: 'VideoFilterApplier', initFn: initializeVideoFilterApplier, dependencies: ['stateStore', 'errorLogger'] },
  { name: 'MainRenderer', initFn: initializeMainRenderer, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'localizationServiceAPI', 'resourceManager', 'canvasDimensionsAPI', 'textRenderingLogicAPI'], provides: 'mainRendererAPI' },
  // Video Exporter UI & Logic
  { name: 'ExportSettingsUI', initFn: initializeExportSettingsUI, dependencies: ['stateStore', 'errorLogger', 'notificationServiceAPI', 'mainPlaybackAPI', 'localizationServiceAPI', 'eventAggregator', 'exportRecorderAPI'] },
  { name: 'CcaptureRecorder', initFn: initializeCcaptureRecorder, dependencies: ['stateStore', 'errorLogger', 'notificationServiceAPI', 'mainRendererAPI', 'eventAggregator', 'fileIOUtils'], provides: 'exportRecorderAPI' },
  { name: 'FFmpegIntegration', initFn: initializeFFmpegIntegration, dependencies: ['stateStore', 'errorLogger', 'notificationServiceAPI'], provides: 'ffmpegAPI' },
  // Editor Shell UI
  { name: 'ScreenNavigator', initFn: initializeScreenNavigator, dependencies: ['stateStore', 'eventAggregator', 'errorLogger'] },
  { name: 'MainToolbarHandler', initFn: initializeMainToolbarHandler, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'projectActionsAPI'] },
  { name: 'PlaybackControlStripUI', initFn: initializePlaybackControlStrip, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'mainPlaybackAPI', 'localizationServiceAPI'] },
  { name: 'ProjectTitleEditor', initFn: initializeProjectTitleEditor, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'localizationServiceAPI', 'notificationServiceAPI'] },
  { name: 'GlobalShortcutsBinder', initFn: initializeGlobalShortcutsBinder, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'mainPlaybackAPI', 'projectActionsAPI'] },
];


/**
 * Main application entry point.
 */
async function main() {
  // 0. Expose core utilities to window for easier debugging during development
  if (typeof process === 'undefined' || (process && process.env && process.env.NODE_ENV === 'development') || !('process' in window)) {
    window.errorLoggerGlobal = errorLogger; // Use different name to avoid conflict with local errorLogger in modules
    window.eventAggregatorGlobal = eventAggregator;
    window.stateStoreGlobal = stateStore;
    window.ACTIONS = ACTIONS;
    window.EVENTS = EVENTS;
    window.DOMElementsGlobal = DOMElements;
    window.featureFlagsGlobal = featureFlags; // From direct import
  }

  // 1. Initialize critical core services that others depend on for setup.
  stateStore.setErrorLogger(errorLogger); // Inject logger into stateStore

  // 2. Initialize core DOM elements cache
  try {
    initializeCoreDomElements(errorLogger); // Pass the errorLogger instance
    // console.info('[Main] Core DOM elements initialized.');
  } catch (error) {
    // Error is already logged by initializeCoreDomElements if critical
    // Display a very basic error message to the user as the app cannot proceed.
    document.body.innerHTML = `<p style="color:red; padding:20px; text-align:center; font-family: 'Tajawal', sans-serif;">
        فشل تهيئة المكونات الأساسية للتطبيق. يرجى محاولة تحديث الصفحة، أو الاتصال بالدعم إذا استمرت المشكلة.
        <br><br>Error: ${error.message}</p>`;
    return; // Stop further execution
  }

  // 3. Load any persisted state from localStorage into the stateStore
  loadPersistedDataAndInitializeState(); // This now uses localStorageAdapter
  // console.info('[Main] Persisted state and settings loaded (if any).');

  // 4. Bootstrap all feature modules and shared UI components
  // These services are either direct imports or initialized and provided by other modules via 'provides'.
  const coreServicesForBootstrap = {
    stateStore,
    eventAggregator,
    errorLogger,
    resourceManager,        // Direct import
    localStorageAdapter,    // Direct import
    quranApiClient,         // Direct import
    pexelsAPI,              // Direct import
    speechRecognitionWrapper,// Direct import
    fileIOUtils,            // Direct import
    // `localizationServiceAPI` will be added by its own initFn in moduleConfigs
    // Other APIs (`notificationServiceAPI`, `modalFactoryAPI`, `projectActionsAPI`, etc.) will also be added as they are initialized.
  };

  try {
    await moduleBootstrap.initializeAllModules(coreServicesForBootstrap, moduleConfigs);
    // console.info('[Main] All modules bootstrapped successfully.');
  } catch (error) {
    // moduleBootstrap should log individual module failures.
    // This catch is for catastrophic failures during the bootstrapping process itself.
    (errorLogger.handleError || console.error)({
      error,
      message: 'CRITICAL: A fatal error occurred during application module bootstrapping. The application may be unstable.',
      origin: 'main.moduleBootstrap.initializeAllModules',
      severity: 'error',
    });
    // Consider showing a user-friendly error message here as well.
    DOMElements.appContainer.innerHTML = `<p style="color:red; padding:20px; text-align:center; font-family: 'Tajawal', sans-serif;">
        حدث خطأ فادح أثناء تحميل التطبيق. قد لا تعمل بعض الميزات بشكل صحيح.
        <br><br>Error details logged to console.</p>`;
    return; // Stop if bootstrap fails significantly
  }

  // 5. Application is now fully initialized and ready
  // console.info(`[Main] ${APP_NAME} v${APP_VERSION} initialized and ready.`);
  eventAggregator.publish(EVENTS.APP_INITIALIZED, { timestamp: Date.now(), version: APP_VERSION });

  // Initial screen display is handled by ScreenNavigator listening to stateStore.activeScreen
}

// Run the main application logic when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main(); // DOMContentLoaded has already fired
}
