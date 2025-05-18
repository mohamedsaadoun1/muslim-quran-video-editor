// js/utils/dom.manipulator.js

/**
 * Adds one or more CSS classes to an HTML element.
 * @param {HTMLElement} element - The HTML element.
 * @param {...string} classNames - The CSS class name(s) to add.
 */
export function addClass(element, ...classNames) {
  if (element && element.classList) {
    element.classList.add(...classNames.filter(Boolean)); // filter(Boolean) removes empty strings
  }
}

/**
 * Removes one or more CSS classes from an HTML element.
 * @param {HTMLElement} element - The HTML element.
 * @param {...string} classNames - The CSS class name(s) to remove.
 */
export function removeClass(element, ...classNames) {
  if (element && element.classList) {
    element.classList.remove(...classNames.filter(Boolean));
  }
}

/**
 * Toggles a CSS class on an HTML element.
 * @param {HTMLElement} element - The HTML element.
 * @param {string} className - The CSS class name to toggle.
 * @param {boolean} [force] - Optional. If true, adds the class; if false, removes it.
 * @returns {boolean | undefined} The new state of the class (true if added, false if removed),
 *                                or undefined if the element is invalid.
 */
export function toggleClass(element, className, force) {
  if (element && element.classList && className) {
    if (typeof force === 'boolean') {
      return element.classList.toggle(className, force);
    }
    return element.classList.toggle(className);
  }
  return undefined;
}

/**
 * Checks if an HTML element has a specific CSS class.
 * @param {HTMLElement} element - The HTML element.
 * @param {string} className - The CSS class name to check for.
 * @returns {boolean} True if the element has the class, false otherwise or if invalid element.
 */
export function hasClass(element, className) {
  if (element && element.classList && className) {
    return element.classList.contains(className);
  }
  return false;
}

/**
 * Hides an HTML element by setting its display style to 'none'.
 * @param {HTMLElement} element - The HTML element to hide.
 */
export function hideElement(element) {
  if (element && element.style) {
    element.style.display = 'none';
    element.setAttribute('aria-hidden', 'true'); // Accessibility
  }
}

/**
 * Shows an HTML element by resetting its display style.
 * It attempts to restore to its original display type or defaults to 'block' or 'flex' based on tagName.
 * @param {HTMLElement} element - The HTML element to show.
 * @param {string} [defaultDisplay='block'] - The default display type if original cannot be determined.
 *                                           Common values: 'block', 'inline', 'inline-block', 'flex', 'grid'.
 */
export function showElement(element, defaultDisplay) {
  if (element && element.style) {
    // Attempt to restore original display style if previously hidden by this system
    const originalDisplay = element.dataset.originalDisplay;
    if (originalDisplay) {
      element.style.display = originalDisplay;
    } else {
      // Intelligent default based on common element types
      if (defaultDisplay) {
          element.style.display = defaultDisplay;
      } else if (['DIV', 'P', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'NAV', 'ASIDE', 'MAIN', 'FORM', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TR', 'CAPTION'].includes(element.tagName)) {
        element.style.display = 'block'; // Or 'flex' / 'grid' if more appropriate for the context
      } else if (['SPAN', 'A', 'IMG', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'STRONG', 'EM', 'I'].includes(element.tagName)) {
        element.style.display = 'inline-block'; // Or 'inline'
      } else {
        element.style.display = 'block'; // Generic fallback
      }
    }
    element.removeAttribute('aria-hidden'); // Accessibility
  }
}

/**
 * Toggles the visibility of an element (display: none vs. original/default display).
 * @param {HTMLElement} element - The HTML element.
 * @param {string} [defaultDisplay='block'] - Default display when showing.
 */
export function toggleElementVisibility(element, defaultDisplay) {
    if (element && element.style) {
        if (element.style.display === 'none' || getComputedStyle(element).display === 'none') {
            showElement(element, defaultDisplay);
        } else {
            // Store original display before hiding, if not already done.
            if (!element.dataset.originalDisplay && getComputedStyle(element).display !== 'none') {
                element.dataset.originalDisplay = getComputedStyle(element).display;
            }
            hideElement(element);
        }
    }
}


/**
 * Creates a new HTML element with specified tag name, classes, and attributes.
 * @param {string} tagName - The HTML tag name (e.g., 'div', 'span', 'button').
 * @param {object} [options={}] - Options for the element.
 * @param {string | string[]} [options.classNames] - CSS class(es) to add.
 * @param {Record<string, string>} [options.attributes] - Object of attributes to set (e.g., { 'data-id': '123', 'type': 'button' }).
 * @param {string} [options.textContent] - Text content for the element.
 * @param {string} [options.innerHTML] - Inner HTML for the element (use with caution).
 * @returns {HTMLElement | null} The created HTML element, or null if tagName is invalid.
 */
export function createElement(tagName, options = {}) {
  if (!tagName || typeof tagName !== 'string') {
    console.error('[DOMManipulator] Invalid tagName for createElement:', tagName);
    return null;
  }
  try {
    const element = document.createElement(tagName);

    if (options.classNames) {
      const classes = Array.isArray(options.classNames) ? options.classNames : [options.classNames];
      addClass(element, ...classes);
    }

    if (options.attributes) {
      for (const attr in options.attributes) {
        if (Object.hasOwnProperty.call(options.attributes, attr)) {
          element.setAttribute(attr, options.attributes[attr]);
        }
      }
    }

    if (options.textContent) {
      element.textContent = options.textContent;
    } else if (options.innerHTML) {
      // Use with caution: can introduce XSS vulnerabilities if innerHTML contains untrusted user input.
      element.innerHTML = options.innerHTML;
    }

    return element;
  } catch (error) {
    console.error(`[DOMManipulator] Error creating element <${tagName}>:`, error);
    return null;
  }
}

/**
 * Sets a data attribute on an element.
 * @param {HTMLElement} element - The HTML element.
 * @param {string} key - The data attribute key (without 'data-').
 * @param {string | number | boolean} value - The value to set.
 */
export function setDataAttribute(element, key, value) {
  if (element && typeof element.dataset !== 'undefined' && key) {
    // dataset keys are automatically camelCased from kebab-case attributes.
    // e.g., data-my-value becomes element.dataset.myValue
    // For direct setAttribute:
    element.setAttribute(`data-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, String(value));
  }
}

/**
 * Gets a data attribute from an element.
 * @param {HTMLElement} element - The HTML element.
 * @param {string} key - The data attribute key (without 'data-').
 * @returns {string | undefined} The value of the data attribute, or undefined if not set.
 */
export function getDataAttribute(element, key) {
  if (element && typeof element.dataset !== 'undefined' && key) {
    // For direct getAttribute:
    return element.getAttribute(`data-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
    // Or using dataset (key needs to be camelCase if attribute was kebab-case):
    // const camelCaseKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    // return element.dataset[camelCaseKey];
  }
  return undefined;
}

/**
 * Attaches an event listener to an element, with optional delegation.
 * @param {HTMLElement | Window | Document} element - The element to attach the listener to.
 * @param {string} eventType - The type of event (e.g., 'click', 'input').
 * @param {Function} handler - The event handler function.
 * @param {string} [delegationSelector] - Optional CSS selector for event delegation.
 *                                        The handler will only be called if the event target (or its parent) matches this selector.
 * @param {boolean | AddEventListenerOptions} [options=false] - Options for addEventListener (e.g., { once: true, capture: false }).
 */
export function on(element, eventType, handler, delegationSelector, options = false) {
  if (!element || !eventType || !handler) return;

  if (delegationSelector) {
    element.addEventListener(eventType, (event) => {
      const delegateTarget = event.target.closest(delegationSelector);
      if (delegateTarget && element.contains(delegateTarget)) { // Ensure target is within the listened element
        handler.call(delegateTarget, event); // Set `this` to the matched delegateTarget
      }
    }, options);
  } else {
    element.addEventListener(eventType, handler, options);
  }
}

/**
 * Removes an event listener from an element.
 * Note: For listeners attached with delegation or anonymous functions, removal can be tricky.
 * This basic version works best for directly attached, named functions.
 * @param {HTMLElement | Window | Document} element - The element.
 * @param {string} eventType - The event type.
 * @param {Function} handler - The handler function that was originally attached.
 * @param {boolean | EventListenerOptions} [options=false] - Options used when attaching (especially capture phase).
 */
export function off(element, eventType, handler, options = false) {
  if (element && eventType && handler) {
    element.removeEventListener(eventType, handler, options);
  }
}

// This module exports utility functions directly. No complex initialization.
// export function initializeDomManipulator(dependencies) { /* ... if it needed core deps */ }
