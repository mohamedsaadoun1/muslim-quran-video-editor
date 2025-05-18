// js/shared-ui-components/theme.controller.js

import DOMElements from '../core/dom-elements.js';
import { ACTIONS, LS_KEY_CURRENT_THEME, EVENTS } from '../config/app.constants.js';

/**
 * @typedef {Object} ThemeControllerDependencies
 * @property {import('../core/state-store.js').default} stateStore
 * @property {import('../core/event-aggregator.js').default} eventAggregator
 * @property {import('../core/error-logger.js').default} errorLogger
 */

let currentLocalTheme = 'light'; // Internal cache to avoid unnecessary DOM updates

/**
 * Applies the theme class to the body element and updates button icons.
 * @param {string} theme - 'light' or 'dark'.
 */
function applyThemeToDOM(theme) {
  if (!document.body) return;

  if (theme === 'dark') {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme'); // Assuming you have .dark-theme CSS rules
    if (DOMElements.themeToggleInitial) DOMElements.themeToggleInitial.innerHTML = '<i class="fas fa-sun"></i>';
    if (DOMElements.themeToggleEditor) DOMElements.themeToggleEditor.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    if (DOMElements.themeToggleInitial) DOMElements.themeToggleInitial.innerHTML = '<i class="fas fa-moon"></i>';
    if (DOMElements.themeToggleEditor) DOMElements.themeToggleEditor.innerHTML = '<i class="fas fa-moon"></i>';
  }
  currentLocalTheme = theme;

  // Optional: Update meta theme-color for PWA consistency
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    // These colors should ideally come from CSS variables or constants
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#0D0D0D' : '#00796b'); // Example dark/light theme colors
  }
}

/**
 * Handles the theme toggle button click.
 * Dispatches an action to update the theme in the state store.
 * @param {ThemeControllerDependencies} dependencies
 */
function handleThemeToggle(dependencies) {
  const { stateStore } = dependencies;
  const currentThemeFromState = stateStore.getState().currentTheme;
  const newTheme = currentThemeFromState === 'light' ? 'dark' : 'light';
  stateStore.dispatch(ACTIONS.SET_THEME, newTheme);
}

/**
 * Initializes the Theme Controller.
 * - Subscribes to theme changes in the state store.
 * - Attaches event listeners to theme toggle buttons.
 * - Applies the initial theme from the state store.
 * @param {ThemeControllerDependencies} dependencies
 */
export function initializeThemeController(dependencies) {
  const { stateStore, eventAggregator, errorLogger } = dependencies;

  if (!stateStore || !eventAggregator || !errorLogger) {
    console.error('[ThemeController] Missing core dependencies for initialization.');
    // No need to use errorLogger here as it might be one of the missing dependencies
    return;
  }

  // 1. Apply initial theme from state store (which might have loaded from localStorage)
  const initialTheme = stateStore.getState().currentTheme || 'light';
  applyThemeToDOM(initialTheme);
  // console.log(`[ThemeController] Initial theme applied: ${initialTheme}`);

  // 2. Subscribe to state changes for 'currentTheme'
  // This will also persist the theme to localStorage when it changes via state.
  const unsubscribeState = stateStore.subscribe((newState) => {
    const newTheme = newState.currentTheme;
    if (newTheme !== currentLocalTheme) { // Only update DOM if theme actually changed
      // console.log(`[ThemeController] Theme changed in state to: ${newTheme}`);
      applyThemeToDOM(newTheme);
      try {
        localStorage.setItem(LS_KEY_CURRENT_THEME, newTheme);
      } catch (e) {
        errorLogger.handleError({
          error: e,
          message: 'Failed to save theme to localStorage.',
          origin: 'ThemeController.stateSubscription',
          context: { theme: newTheme }
        });
      }
      eventAggregator.publish(EVENTS.THEME_CHANGED, newTheme);
    }
  });

  // 3. Attach event listeners to theme toggle buttons
  const setupButtonListener = (buttonElement) => {
    if (buttonElement) {
      buttonElement.addEventListener('click', () => handleThemeToggle(dependencies));
    } else {
        errorLogger.logWarning({
            message: `Theme toggle button element not found during setup. ID expected: ${buttonElement === DOMElements.themeToggleInitial ? 'theme-toggle-initial' : 'theme-toggle-editor'}`,
            origin: 'initializeThemeController'
        });
    }
  };

  setupButtonListener(DOMElements.themeToggleInitial);
  setupButtonListener(DOMElements.themeToggleEditor);

  // console.info('[ThemeController] Initialized.');

  // Return an object with a cleanup function if necessary (e.g., for testing or dynamic module loading/unloading)
  return {
    cleanup: () => {
      unsubscribeState();
      // Remove event listeners if buttons might be removed/recreated, though less likely for these.
      // console.info('[ThemeController] Cleaned up.');
    }
  };
}
