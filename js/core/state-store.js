// js/core/state-store.js
// errorLogger import will be resolved when modules are fully linked.
// For standalone running, errorLogger might not be defined here immediately.
let localErrorLogger = console; // Fallback logger
if (typeof window !== 'undefined' && window.errorLogger) {
    localErrorLogger = window.errorLogger;
} else {
    try {
        // Attempt to import if modules are being processed, might cause issues if not careful with circular deps
        // import errorLoggerModule from './error-logger.js';
        // localErrorLogger = errorLoggerModule;
    } catch(e) { /* ignore if direct import fails due to loading order */ }
}


const stateStore = (() => {
  /**
   * @typedef {Object} AppState
   * @property {string} currentTheme
   * @property {Object | null} currentProject
   * @property {Array<Object>} savedProjects
   * @property {string} activeScreen
   * @property {boolean} isLoading
   * @property {Object} quranSelection
   * // ... Add other global state properties as needed
   */

  /** @type {AppState} */
  let state = {
    currentTheme: 'light',
    currentProject: null,
    savedProjects: [],
    activeScreen: 'initial',
    isLoading: false,
    quranSelection: {
        surahId: null, startAyah: null, endAyah: null, reciterId: null, translationId: null,
    },
    // ... other slices of state
  };

  const listeners = new Set();

  const getState = () => ({ ...state });

  const subscribe = (listener) => {
    if (typeof listener !== 'function') {
        (localErrorLogger.logWarning || console.warn)({
            message: 'Attempted to subscribe with a non-function listener.',
            origin: 'stateStore.subscribe'
        });
        return () => {};
    }
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const dispatch = (actionType, payload) => {
    const oldState = { ...state };
    try {
        // Simplified "reducer" logic from previous example. ACTIONS constant should be imported from config.
        // Ensure app.constants.js is loaded and ACTIONS is available, or pass it if needed.
        // Example for one action for brevity here:
        if (actionType === 'SET_THEME') { // Ideally: actionType === ACTIONS.SET_THEME
            if (typeof payload === 'string' && (payload === 'light' || payload === 'dark')) {
                state = { ...state, currentTheme: payload };
            } else {
                (localErrorLogger.logWarning || console.warn)({
                    message: `Invalid payload for SET_THEME: ${payload}.`,
                    origin: 'stateStore.dispatch.SET_THEME', context: { payload }
                });
            }
        } else if (actionType === 'SET_ACTIVE_SCREEN') {
            state = { ...state, activeScreen: payload };
        } else if (actionType === 'LOAD_PROJECT') {
            state = { ...state, currentProject: payload, activeScreen: payload ? 'editor' : 'initial' };
        } else if (actionType === 'SET_LOADING') {
            state = { ...state, isLoading: !!payload };
        }
        // ... other actions from the previous state-store.js example
        // Example:
        // else if (actionType === 'SET_QURAN_SELECTION') {
        //    state = { ...state, quranSelection: { ...state.quranSelection, ...payload } };
        // }

        [...listeners].forEach(listener => {
            try {
                listener(getState());
            } catch (error) {
                (localErrorLogger.handleError || console.error)({
                    error, message: 'Error in stateStore listener.',
                    origin: 'stateStore.notifyListeners', context: { actionType }
                });
            }
        });

    } catch (error) {
        (localErrorLogger.handleError || console.error)({
            error, message: `Error during state update for action: ${actionType}`,
            origin: 'stateStore.dispatch', context: { actionType, payload, oldState }
        });
        state = oldState;
    }
  };

  const initializeWithState = (persistedState) => {
    if (persistedState && typeof persistedState === 'object') {
      state = { ...state, ...persistedState };
      [...listeners].forEach(listener => listener(getState()));
    }
  };

  return {
    getState,
    subscribe,
    dispatch,
    initializeWithState,
  };
})();
// Ensure errorLogger is properly imported/available for this module when integrated.
// The above `localErrorLogger` is a temporary measure for isolated context.
// import errorLogger from './error-logger.js'; // This should be the line when bundling or if order is guaranteed
// localErrorLogger = errorLogger; // Then re-assign


export default stateStore;
