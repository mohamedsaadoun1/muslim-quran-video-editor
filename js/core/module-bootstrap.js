// js/core/module-bootstrap.js

import errorLogger from './error-logger.js';
// Shared UI Components initializers
import { initializeThemeController } from '../shared-ui-components/theme.controller.js'; // ستقوم بإنشائها
import { initializePanelManager } from '../shared-ui-components/panel.manager.js'; // ستقوم بإنشائها
import { initializeNotificationPresenter } from '../shared-ui-components/notification.presenter.js'; // ستقوم بإنشائها
import { initializeSpinnerView } from '../shared-ui-components/spinner.view.js'; // ستقوم بإنشائها
// ... import other shared UI component initializers

// Feature Modules initializers
import { initializeProjectManager } from '../features/project-manager/project.actions.js'; // أو ملف index.js في المجلد
import { initializeQuranProvider } from '../features/quran-provider/quran.data.cache.js'; // نقطة بداية لمزود القرآن
import { initializeQuranSelectorUI } from '../features/quran-provider/quran-selector.ui.js'; // UI الخاص باختيار القرآن
// ... import initializers for BackgroundController, TextEngine, AudioEngine, CanvasComposer, VideoExporter, EditorShell etc.
import { initializeScreenNavigator } from '../features/editor-shell/screen.navigator.js'; // ستقوم بإنشائها
import { initializeMainToolbarHandler } from '../features/editor-shell/main-toolbar.handler.js';
import { initializePlaybackControlStrip } from '../features/editor-shell/playback-control-strip.ui.js';
import { initializeProjectTitleEditor } from '../features/editor-shell/project-title.editor.js';


// قائمة بالوحدات التي يجب تهيئتها والاعتماديات التي قد تحتاجها
// الترتيب مهم هنا أحيانًا، خاصة إذا كانت وحدة تعتمد على تهيئة وحدة أخرى.
// يمكن تحسين هذا باستخدام نظام أكثر تطورًا لإدارة الاعتماديات إذا لزم الأمر.

const modulesToInitialize = [
  // Shared UI Components (عادةً ما تكون قليلة الاعتماديات المباشرة على الميزات الأخرى)
  { name: 'ThemeController', initFn: initializeThemeController, dependencies: ['stateStore', 'eventAggregator', 'errorLogger'] },
  { name: 'NotificationPresenter', initFn: initializeNotificationPresenter, dependencies: ['eventAggregator', 'errorLogger'] },
  { name: 'SpinnerView', initFn: initializeSpinnerView, dependencies: ['stateStore', 'errorLogger'] },
  { name: 'PanelManager', initFn: initializePanelManager, dependencies: ['eventAggregator', 'errorLogger'] }, // Panels are part of editor-shell
  
  // Core Feature Logic & Data Providers (قد تُهيأ قبل الـ UI الذي يعتمد عليها)
  { name: 'ProjectManager', initFn: initializeProjectManager, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'localStorageAdapter'] }, // ستحتاج لإنشاء local-storage.adapter.js
  { name: 'QuranDataProvider', initFn: initializeQuranProvider, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'quranApiClient'] }, // ستحتاج quran.api.client.js

  // Feature UI modules (التي تتفاعل مباشرة مع المستخدم)
  // -- Editor Shell (Framework of the editor)
  { name: 'ScreenNavigator', initFn: initializeScreenNavigator, dependencies: ['stateStore', 'eventAggregator', 'errorLogger'] },
  { name: 'MainToolbarHandler', initFn: initializeMainToolbarHandler, dependencies: ['stateStore', 'eventAggregator', 'errorLogger'] },
  { name: 'PlaybackControlStrip', initFn: initializePlaybackControlStrip, dependencies: ['eventAggregator', 'errorLogger', 'stateStore'] },
  { name: 'ProjectTitleEditor', initFn: initializeProjectTitleEditor, dependencies: ['stateStore', 'eventAggregator', 'errorLogger']},


  // -- Specific Feature UI (these often depend on data providers or shell components)
  { name: 'QuranSelectorUI', initFn: initializeQuranSelectorUI, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'quranDataProvider'] }, // quranDataProvider هو اسم مرجعي
  // { name: 'BackgroundImporterUI', initFn: initializeBackgroundImporterUI, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'fileIOUtils'] },
  // { name: 'AIBackgroundConnector', initFn: initializeAIBackgroundConnector, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'pexelsApiClient'] },
  // { name: 'TextStyleUI', initFn: initializeTextStyleUI, dependencies: ['stateStore', 'eventAggregator', 'errorLogger'] },
  // { name: 'AudioSettingsManagerUI', initFn: initializeAudioSettingsManagerUI, dependencies: ['stateStore', 'eventAggregator', 'errorLogger'] },
  // { name: 'CanvasMainRenderer', initFn: initializeCanvasMainRenderer, dependencies: ['stateStore', 'eventAggregator', 'errorLogger'] },
  // { name: 'VideoExporterUI', initFn: initializeVideoExporterUI, dependencies: ['stateStore', 'eventAggregator', 'errorLogger', 'ccaptureRecorder'] },

  // Add more modules here as they are developed
  // Example:
  // { name: 'MyFeatureModule', initFn: initializeMyFeature, dependencies: ['stateStore', 'someApiService'] },
];


const moduleBootstrap = {
  /**
   * Initializes all registered modules.
   * @param {Object} coreServices - An object containing core services like stateStore, eventAggregator, etc.
   */
  async initializeAllModules(coreServices) {
    // console.info('[ModuleBootstrap] Starting module initialization...');

    // Pass all core services plus references to other already initialized services if needed dynamically
    // For now, we assume direct dependency names are listed.
    // A more advanced system could resolve dependencies more dynamically.
    const availableServices = { ...coreServices };


    for (const moduleConfig of modulesToInitialize) {
      if (typeof moduleConfig.initFn !== 'function') {
        errorLogger.logWarning({
          message: `Initialization function for module "${moduleConfig.name}" is not a function. Skipping.`,
          origin: 'moduleBootstrap.initializeAllModules',
        });
        continue;
      }

      try {
        // Prepare dependencies for the current module
        const moduleDependencies = {};
        if (moduleConfig.dependencies && Array.isArray(moduleConfig.dependencies)) {
          moduleConfig.dependencies.forEach(depName => {
            if (availableServices[depName]) {
              moduleDependencies[depName] = availableServices[depName];
            } else if (depName === 'quranDataProvider' && availableServices['QuranDataProvider_instance']) { // Special case if we store instance
                moduleDependencies[depName] = availableServices['QuranDataProvider_instance'];
            }
            // else {
            //   // This could be a warning if a listed dependency isn't a core one, assuming it's provided by another module
            //   // errorLogger.logWarning({
            //   //   message: `Dependency "${depName}" not found in availableServices for module "${moduleConfig.name}".`,
            //   //   origin: 'moduleBootstrap.initializeAllModules',
            //   // });
            // }
          });
        }
        
        // console.debug(`[ModuleBootstrap] Initializing module: ${moduleConfig.name}`);
        const moduleInstance = await moduleConfig.initFn(moduleDependencies);
        // console.info(`[ModuleBootstrap] Module "${moduleConfig.name}" initialized.`);

        // If the initFn returns something (e.g., an instance or API of the module),
        // we can store it to be a dependency for subsequent modules.
        // This requires careful ordering or a more sophisticated DI system.
        if (moduleInstance) {
             // Use a convention, e.g. if initFn is for 'QuranDataProvider', store instance as 'QuranDataProvider_instance'
             // Or simply store it by its name if it's meant to be an injectable service itself.
             if(moduleConfig.name === 'QuranDataProvider'){ // Example
                availableServices[`${moduleConfig.name}_instance`] = moduleInstance;
             }
        }

      } catch (error) {
        errorLogger.handleError({
          error,
          message: `Failed to initialize module: "${moduleConfig.name}".`,
          origin: 'moduleBootstrap.initializeAllModules',
          severity: 'error', // Make this an error because module init failure can be critical
        });
        // Depending on the module, you might want to re-throw to stop app init,
        // or just log and continue if it's a non-critical module.
        // For now, we'll log and continue.
      }
    }
    // console.info('[ModuleBootstrap] All registered modules processed.');
  }
};

export default moduleBootstrap;
