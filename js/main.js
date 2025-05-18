// js/main.js

import errorLogger from './core/error-logger.js';
import eventAggregator from './core/event-aggregator.js';
import stateStore from './core/state-store.js';
import { initializeCoreDomElements } from './core/dom-elements.js'; // We'll create this next
import moduleBootstrap from './core/module-bootstrap.js';
import { ACTIONS, EVENTS, LS_KEY_CURRENT_THEME, LS_KEY_SAVED_PROJECTS } from './config/app.constants.js';

// Global error handler for unhandled promise rejections and uncaught exceptions
// This is a safety net. Prefer try/catch and specific error handling within modules.
window.addEventListener('unhandledrejection', (event) => {
  errorLogger.handleError({
    error: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
    message: 'Unhandled promise rejection caught globally.',
    origin: 'GlobalUnhandledRejection',
    context: { promiseEvent: event },
  });
  // Optionally, inform the user that an unexpected error occurred
  // eventAggregator.publish(EVENTS.NOTIFICATION_REQUESTED, {
  //   message: 'حدث خطأ غير متوقع. يرجى محاولة تحديث الصفحة.',
  //   type: 'error',
  //   duration: 7000
  // });
});

window.addEventListener('error', (event) => {
  // Check if it's a genuine error and not a minor issue (e.g. ResizeObserver loop limit exceeded)
  if (event.error) {
    errorLogger.handleError({
      error: event.error,
      message: event.message || 'Uncaught exception caught globally.',
      origin: `GlobalError (${event.filename || 'unknown file'})`,
      context: { errorEvent: { lineno: event.lineno, colno: event.colno } },
    });
  } else if (event.message) {
     // Handle cases where event.error is null but there's a message
     errorLogger.logWarning({
        message: `Global event with message only: ${event.message}`,
        origin: 'GlobalErrorEventWithMessageOnly',
        context: { filename: event.filename, lineno: event.lineno, colno: event.colno }
     });
  }
});


function loadPersistedState() {
    try {
        const persistedTheme = localStorage.getItem(LS_KEY_CURRENT_THEME);
        const persistedProjects = localStorage.getItem(LS_KEY_SAVED_PROJECTS);

        let initialAppState = {};

        if (persistedTheme) {
            if (persistedTheme === 'light' || persistedTheme === 'dark') {
                initialAppState.currentTheme = persistedTheme;
            } else {
                 errorLogger.logWarning({
                    message: `Invalid theme value found in localStorage: ${persistedTheme}. Using default.`,
                    origin: 'main.loadPersistedState'
                });
            }
        }

        if (persistedProjects) {
            try {
                const projectsArray = JSON.parse(persistedProjects);
                if (Array.isArray(projectsArray)) {
                    initialAppState.savedProjects = projectsArray;
                } else {
                    errorLogger.logWarning({
                        message: 'Saved projects in localStorage is not an array. Clearing.',
                        origin: 'main.loadPersistedState'
                    });
                    localStorage.removeItem(LS_KEY_SAVED_PROJECTS);
                }
            } catch (e) {
                errorLogger.handleError({
                    error: e,
                    message: 'Failed to parse saved projects from localStorage. Clearing.',
                    origin: 'main.loadPersistedState'
                });
                localStorage.removeItem(LS_KEY_SAVED_PROJECTS);
            }
        }
        stateStore.initializeWithState(initialAppState);

    } catch (error) {
        errorLogger.handleError({
            error,
            message: 'Failed to load persisted state from localStorage.',
            origin: 'main.loadPersistedState',
        });
    }
}


/**
 * Main application entry point.
 */
async function main() {
  // 0. Expose core utilities to window for easier debugging during development
  // In production, you might want to remove these or put them behind a DEBUG flag.
  if (process.env.NODE_ENV === 'development') { // This needs a build tool to set process.env
      window.errorLogger = errorLogger;
      window.eventAggregator = eventAggregator;
      window.stateStore = stateStore;
      window.ACTIONS = ACTIONS;
      window.EVENTS = EVENTS;
  }


  // 1. Initialize core DOM elements cache
  try {
    initializeCoreDomElements();
    // console.info('[Main] Core DOM elements initialized.');
  } catch (error) {
    errorLogger.handleError({
      error,
      message: 'Fatal: Could not initialize core DOM elements. App may not function.',
      origin: 'main.initializeCoreDomElements',
      severity: 'error',
    });
    // Potentially show a critical error message to the user and stop further execution.
    document.body.innerHTML = '<p style="color:red; padding:20px; text-align:center;">فشل تهيئة التطبيق. يرجى المحاولة لاحقاً.</p>';
    return;
  }

  // 2. Load any persisted state from localStorage
  loadPersistedState();
  // console.info('[Main] Persisted state loaded (if any).');

  // 3. Bootstrap all feature modules and shared UI components
  // moduleBootstrap will take care of initializing them in the correct order
  // and injecting necessary dependencies (like stateStore, eventAggregator).
  try {
    await moduleBootstrap.initializeAllModules({
      stateStore,
      eventAggregator,
      errorLogger,
      // Pass other core services if needed by modules during their init
    });
    // console.info('[Main] All modules bootstrapped.');
  } catch (error) {
     errorLogger.handleError({
      error,
      message: 'Fatal: Error during module bootstrapping. App functionality may be limited.',
      origin: 'main.moduleBootstrap.initializeAllModules',
      severity: 'error',
    });
     // Similar to DOM init failure, a critical error message might be needed.
    return;
  }


  // 4. Application is ready
  // console.info(`[Main] ${APP_NAME} application initialized successfully.`);
  eventAggregator.publish(EVENTS.APP_INITIALIZED, { timestamp: Date.now() });

  // 5. Initial screen setup (example, this logic would be in editor-shell/screen.navigator.js typically)
  // For now, dispatch an action to set the initial screen based on state
  // (assuming stateStore's initial state for activeScreen is 'initial')
  // This ensures UI reflects the state correctly from the start.
  // const currentScreen = stateStore.getState().activeScreen;
  // console.log(`[Main] Initial active screen from state: ${currentScreen}`);
  // Actual screen display logic will be handled by a dedicated module (e.g., screen.navigator.js)
  // subscribing to state changes or specific events.
}

// Run the main application logic when the DOM is ready
if (document.readyState === 'loading') { // Loading hasn't finished yet
  document.addEventListener('DOMContentLoaded', main);
} else { // `DOMContentLoaded` has already fired
  main();
}
