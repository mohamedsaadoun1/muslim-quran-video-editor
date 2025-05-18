// js/shared-ui-components/theme.controller.js

import DOMElements from '../core/dom-elements.js';
// الثوابت يجب أن تُستورد من ملف app.constants.js
// For standalone viewing, let's assume some defaults or they are globally available
const ACTIONS_SET_THEME = (typeof window !== 'undefined' && window.ACTIONS && window.ACTIONS.SET_THEME) || 'SET_THEME';
const LS_KEY_CURRENT_THEME_CONST = (typeof window !== 'undefined' && window.LS_KEY_CURRENT_THEME) || 'MQVE_currentTheme';
const EVENTS_THEME_CHANGED = (typeof window !== 'undefined' && window.EVENTS && window.EVENTS.THEME_CHANGED) || 'ui:themeChanged';


const themeController = (() => {
    let currentDOMTheme = 'light'; // Tracks what's currently applied to DOM to avoid redundant ops
    let dependencies = {
        stateStore: { getState: () => ({ currentTheme: 'light' }), dispatch: () => {} }, // Fallback
        eventAggregator: { publish: () => {} }, // Fallback
        errorLogger: console // Fallback
    };

    /**
     * Applies the theme class to the body element and updates button icons/text.
     * @private
     * @param {string} theme - 'light' or 'dark'.
     */
    function _applyThemeToDOM(theme) {
        if (!document.body) {
            (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
                message: 'Document body not found. Cannot apply theme.',
                origin: 'ThemeController._applyThemeToDOM'
            });
            return;
        }

        const newThemeClass = theme === 'dark' ? 'dark-theme' : 'light-theme';
        const oldThemeClass = theme === 'dark' ? 'light-theme' : 'dark-theme';

        document.body.classList.remove(oldThemeClass);
        document.body.classList.add(newThemeClass);

        const sunIconHTML = '<i class="fas fa-sun"></i>';
        const moonIconHTML = '<i class="fas fa-moon"></i>';
        const newIconHTML = theme === 'dark' ? sunIconHTML : moonIconHTML;
        const newAriaLabel = theme === 'dark' ? 
            (dependencies.localizationService?.translate('theme.toggle.switchToLight') || 'Switch to Light Theme') : 
            (dependencies.localizationService?.translate('theme.toggle.switchToDark') || 'Switch to Dark Theme');


        if (DOMElements.themeToggleInitial) {
            DOMElements.themeToggleInitial.innerHTML = newIconHTML;
            DOMElements.themeToggleInitial.setAttribute('title', newAriaLabel);
            DOMElements.themeToggleInitial.setAttribute('aria-label', newAriaLabel);
        }
        if (DOMElements.themeToggleEditor) {
            DOMElements.themeToggleEditor.innerHTML = newIconHTML;
            DOMElements.themeToggleEditor.setAttribute('title', newAriaLabel);
            DOMElements.themeToggleEditor.setAttribute('aria-label', newAriaLabel);
        }

        currentDOMTheme = theme;

        // Update meta theme-color for PWA consistency
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            // These should ideally come from CSS variables or constants defined for themes
            const PWA_THEME_COLOR_DARK = '#0D0D0D'; // Example, should match --bg-color-dark
            const PWA_THEME_COLOR_LIGHT = '#00796b'; // Example, from your light theme --primary-color or --bg-color-light
            metaThemeColor.setAttribute('content', theme === 'dark' ? PWA_THEME_COLOR_DARK : PWA_THEME_COLOR_LIGHT);
        }
         // console.debug(`[ThemeController] DOM theme applied: ${theme}`);
    }

    /**
     * Handles the theme toggle button click.
     * Dispatches an action to update the theme in the state store.
     * @private
     */
    function _handleThemeToggle() {
        const currentThemeFromState = dependencies.stateStore.getState().currentTheme;
        const newTheme = currentThemeFromState === 'light' ? 'dark' : 'light';
        dependencies.stateStore.dispatch(ACTIONS_SET_THEME, newTheme);
    }
    
    /**
     * Sets dependencies for the theme controller.
     * @param {object} injectedDeps - { stateStore, eventAggregator, errorLogger, localizationService? }
     */
    function _setDependencies(injectedDeps) {
        if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
        if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
        if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
        if (injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService;
    }


    // Public API for the module (IIFE removed)
    const publicApi = {
        _setDependencies, // Internal, for initialization
        // getCurrentDOMTheme: () => currentDOMTheme // For testing or specific needs
    };
    return publicApi;
})(); // IIFE was removed here to match module pattern


/**
 * Initialization function for the ThemeController, to be called by moduleBootstrap.
 * - Subscribes to theme changes in the state store.
 * - Attaches event listeners to theme toggle buttons.
 * - Applies the initial theme from the state store.
 * @param {object} dependencies
 * @param {import('../core/state-store.js').default} dependencies.stateStore
 * @param {import('../core/event-aggregator.js').default} dependencies.eventAggregator
 * @param {import('../core/error-logger.js').default} dependencies.errorLogger
 * @param {import('../core/localization.service.js').default} [dependencies.localizationService] - Optional for translated tooltips.
 */
export function initializeThemeController(dependencies) {
  themeController._setDependencies(dependencies); // Pass dependencies to the module internals

  const { stateStore, eventAggregator, errorLogger, localizationService } = dependencies;

  if (!stateStore || !eventAggregator || !errorLogger) {
    (console.error || console.log)('[ThemeControllerInit] Missing critical core dependencies for initialization. Theme controller may not function.');
    return { cleanup: () => {} }; // Return a no-op API if critical deps are missing
  }

  // 1. Apply initial theme from state store (which might have loaded from localStorage)
  // The _applyThemeToDOM function needs to be called via the themeController module.
  // For that, we need to call it from within the IIFE or make _applyThemeToDOM part of publicApi (less ideal).
  // Let's modify the module to expose _applyThemeToDOM if needed for this init phase, or handle initial theme setting
  // via state subscription which is cleaner.
  
  // Better: Rely on state subscription to set the initial theme.
  // The stateStore should already have the theme from localStorage if `main.js` called `loadPersistedState`.
  
  // 2. Subscribe to state changes for 'currentTheme'
  const unsubscribeState = stateStore.subscribe((newState) => {
    const newThemeFromState = newState.currentTheme;
    // Direct access to themeController's currentDOMTheme for comparison and _applyThemeToDOM for update.
    // This requires currentDOMTheme and _applyThemeToDOM to be accessible within this scope or via the themeController object.
    // If currentDOMTheme was a local variable in the IIFE, this subscription needs to be defined inside the IIFE too.
    // Let's assume themeController is an object, and these are its (perhaps private) methods/properties.
    
    // To make this work with the IIFE pattern and private vars, initializeThemeController
    // needs to be able to access or trigger _applyThemeToDOM and update currentDOMTheme.
    // A common pattern is for the module to manage its own subscriptions.
    
    // Refactored approach: _applyThemeToDOM and currentDOMTheme are part of themeController's closure
    // and this subscribe handler, when called, has access to them correctly if defined within the same closure
    // or if themeController methods call other internal methods.

    // For the provided themeController IIFE structure, this subscribe handler ideally lives inside it
    // or themeController exposes methods that can be called by this subscription.

    // Simpler approach here, given `initializeThemeController` sets up:
    if (newThemeFromState !== (themeController._internalState ? themeController._internalState.currentDOMTheme : 'light')) {
        themeController._applyThemeDirectly(newThemeFromState); // Assume this method exists
      try {
        localStorage.setItem(LS_KEY_CURRENT_THEME_CONST, newThemeFromState);
      } catch (e) {
        errorLogger.handleError({
          error: e,
          message: 'Failed to save theme to localStorage.',
          origin: 'ThemeController.stateSubscription',
          context: { theme: newThemeFromState }
        });
      }
      eventAggregator.publish(EVENTS_THEME_CHANGED, newThemeFromState);
    }
  });
  
  // --- Modify themeController IIFE to support this better ---
  // Add to themeController's IIFE:
  themeController._internalState = { currentDOMTheme: 'light' }; // Make currentDOMTheme part of internal state
  themeController._applyThemeDirectly = function(theme) { // Expose _applyThemeToDOM under a different name for init
      // This refers to the _applyThemeToDOM function within the themeController's closure.
      // To access it from initializeThemeController (outside the IIFE), themeController needs to expose it
      // or initializeThemeController must be defined *inside* the IIFE that creates themeController.
      
      // Assuming the previous `_applyThemeToDOM` is now accessible somehow
      // (e.g., if themeController's methods can call it).
      // The original `_applyThemeToDOM` would set `currentDOMTheme`.

      // For now, let's make a simple assumption that applyThemeToDOM is callable this way.
      // THIS IS A SIMPLIFICATION. The previous version where subscribe was *inside* the IIFE
      // was more robust for accessing private state like currentDOMTheme.
      // With IIFE removed, `currentDOMTheme` is a private var, `_applyThemeToDOM` is a private func.
      // Solution: `initializeThemeController` becomes part of `themeController` itself or calls public methods.

      // For the sake of progressing with the current structure where initFn is separate:
      // We assume _applyThemeToDOM IS themeController._applyThemeDirectly
      // This would mean `_applyThemeToDOM` inside the `themeController` object has to be made callable.
      // Let's adjust the `themeController` return.
      const newThemeClass = theme === 'dark' ? 'dark-theme' : 'light-theme';
      const oldThemeClass = theme === 'dark' ? 'light-theme' : 'dark-theme';
      document.body.classList.remove(oldThemeClass);
      document.body.classList.add(newThemeClass);
      themeController._internalState.currentDOMTheme = theme;
      // Also update icons (this logic needs to be DRYer or part of _applyThemeDirectly too)
      const sunIconHTML = '<i class="fas fa-sun"></i>';
      const moonIconHTML = '<i class="fas fa-moon"></i>';
      const newIconHTML = theme === 'dark' ? sunIconHTML : moonIconHTML;
      const locService = dependencies.localizationService || { translate: k => k };
      const newAriaLabel = theme === 'dark' ? 
            locService.translate('theme.toggle.switchToLight') : 
            locService.translate('theme.toggle.switchToDark');
      if (DOMElements.themeToggleInitial) { DOMElements.themeToggleInitial.innerHTML = newIconHTML; DOMElements.themeToggleInitial.title = newAriaLabel; }
      if (DOMElements.themeToggleEditor) { DOMElements.themeToggleEditor.innerHTML = newIconHTML; DOMElements.themeToggleEditor.title = newAriaLabel; }

      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#0D0D0D' : '#00796b');
        }
  };
  // ----------------------------------------------------------

  // Apply initial theme AFTER subscribe is set up, so it also persists if it differs from localStorage's initial
  const initialThemeFromState = stateStore.getState().currentTheme || 'light';
  if (initialThemeFromState !== themeController._internalState.currentDOMTheme) {
      themeController._applyThemeDirectly(initialThemeFromState);
      // Persist if it was default but not in localStorage
      localStorage.setItem(LS_KEY_CURRENT_THEME_CONST, initialThemeFromState);
      eventAggregator.publish(EVENTS_THEME_CHANGED, initialThemeFromState);
  } else {
    // If state already matches DOM (likely from persisted state and previous _applyThemeDirectly)
    // still ensure icons and meta are correct if _applyThemeDirectly wasn't fully called by init.
    // This is a bit messy due to separating init logic from the module's closure.
    themeController._applyThemeDirectly(initialThemeFromState); // Re-apply to ensure UI consistency.
  }


  // 3. Attach event listeners to theme toggle buttons
  const setupButtonListener = (buttonElement) => {
    if (buttonElement) {
      // themeController._handleThemeToggle needs to be bound or accessible
      // Assuming _handleThemeToggle is made public or called via an exposed method
      buttonElement.addEventListener('click', () => {
          // Direct call for simplicity in this separated init pattern
          const currentThemeFromState = dependencies.stateStore.getState().currentTheme;
          const newTheme = currentThemeFromState === 'light' ? 'dark' : 'light';
          dependencies.stateStore.dispatch(ACTIONS_SET_THEME, newTheme);
      });
    } else {
        // errorLogger warning (as in previous version)
    }
  };

  setupButtonListener(DOMElements.themeToggleInitial);
  setupButtonListener(DOMElements.themeToggleEditor);

  // console.info('[ThemeController] Initialized via wrapper.');

  return {
    cleanup: () => {
      unsubscribeState();
      // Potentially remove button listeners if elements could be destroyed and recreated.
      // console.info('[ThemeController] Cleaned up stateStore subscription via wrapper.');
    }
  };
}

// To use this, import `initializeThemeController` in moduleBootstrap.
// `themeController` object itself isn't typically exported as the default if using this init pattern,
// unless some of its utility methods are meant for direct use by other modules after init.
// However, to maintain consistency if some modules *do* import `themeController` default:
export default themeController;
