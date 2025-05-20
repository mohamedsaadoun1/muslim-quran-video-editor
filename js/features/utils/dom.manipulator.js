// js/utils/dom.manipulator.js

/**
 * @typedef {Object} ElementOptions
 * @property {string|string[]} [classNames] - CSS class(es) to add.
 * @property {Record<string, string>} [attributes] - Attributes to set.
 * @property {string} [textContent] - Text content for the element.
 * @property {string} [innerHTML] - Inner HTML for the element.
 */

/**
 * Adds one or more CSS classes to an HTML element.
 * @param {HTMLElement} element - The HTML element.
 * @param {...string} classNames - The CSS class name(s) to add.
 * @throws {Error} If element is not a valid HTMLElement
 */
export function addClass(element, ...classNames) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('addClass requires a valid HTMLElement as the first argument');
  }
  
  // Filter out empty strings and undefined values
  const validClasses = classNames.filter(className => 
    typeof className === 'string' && className.trim() !== ''
  );
  
  if (validClasses.length > 0) {
    element.classList.add(...validClasses);
  }
}

/**
 * Removes one or more CSS classes from an HTML element.
 * @param {HTMLElement} element - The HTML element.
 * @param {...string} classNames - The CSS class name(s) to remove.
 * @throws {Error} If element is not a valid HTMLElement
 */
export function removeClass(element, ...classNames) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('removeClass requires a valid HTMLElement as the first argument');
  }
  
  // Filter out empty strings and undefined values
  const validClasses = classNames.filter(className => 
    typeof className === 'string' && className.trim() !== ''
  );
  
  if (validClasses.length > 0) {
    element.classList.remove(...validClasses);
  }
}

/**
 * Toggles a CSS class on an HTML element.
 * @param {HTMLElement} element - The HTML element.
 * @param {string} className - The CSS class name to toggle.
 * @param {boolean} [force] - Optional. If true, adds the class; if false, removes it.
 * @returns {boolean | undefined} The new state of the class (true if added, false if removed),
 *                                or undefined if the element is invalid.
 * @throws {Error} If element is not a valid HTMLElement or className is invalid
 */
export function toggleClass(element, className, force) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('toggleClass requires a valid HTMLElement as the first argument');
  }
  
  if (typeof className !== 'string' || className.trim() === '') {
    throw new Error('toggleClass requires a valid className as the second argument');
  }
  
  if (typeof force === 'boolean') {
    return element.classList.toggle(className, force);
  }
  
  return element.classList.toggle(className);
}

/**
 * Checks if an HTML element has a specific CSS class.
 * @param {HTMLElement} element - The HTML element.
 * @param {string} className - The CSS class name to check for.
 * @returns {boolean} True if the element has the class, false otherwise or if invalid element.
 * @throws {Error} If element is not a valid HTMLElement or className is invalid
 */
export function hasClass(element, className) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('hasClass requires a valid HTMLElement as the first argument');
  }
  
  if (typeof className !== 'string' || className.trim() === '') {
    throw new Error('hasClass requires a valid className as the second argument');
  }
  
  return element.classList.contains(className);
}

/**
 * Hides an HTML element by setting its display style to 'none'.
 * @param {HTMLElement} element - The HTML element to hide.
 * @throws {Error} If element is not a valid HTMLElement
 */
export function hideElement(element) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('hideElement requires a valid HTMLElement as the first argument');
  }
  
  element.style.display = 'none';
  element.setAttribute('aria-hidden', 'true'); // Accessibility
}

/**
 * Shows an HTML element by resetting its display style.
 * It attempts to restore to its original display type or defaults to 'block' or 'flex' based on tagName.
 * @param {HTMLElement} element - The HTML element to show.
 * @param {string} [defaultDisplay='block'] - The default display type if original cannot be determined.
 *                                           Common values: 'block', 'inline', 'inline-block', 'flex', 'grid'.
 * @throws {Error} If element is not a valid HTMLElement
 */
export function showElement(element, defaultDisplay) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('showElement requires a valid HTMLElement as the first argument');
  }
  
  // Attempt to restore original display style if previously hidden by this system
  const originalDisplay = element.dataset.originalDisplay;
  
  if (originalDisplay) {
    element.style.display = originalDisplay;
  } else {
    // Intelligent default based on common element types
    if (defaultDisplay) {
      element.style.display = defaultDisplay;
    } else {
      // Common element type mappings
      const displayMap = {
        block: ['DIV', 'P', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'NAV', 'ASIDE', 'MAIN', 'FORM', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TR', 'CAPTION'],
        'inline-block': ['SPAN', 'A', 'IMG', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'STRONG', 'EM', 'I'],
        'inline': ['B', 'SMALL', 'SUB', 'SUP', 'U', 'S', 'DEL', 'INS', 'Q', 'ABBR', 'CITE', 'DFN', 'VAR', 'SAMP', 'KBD', 'S', 'TIME', 'CODE', 'PRE']
      };
      
      // Determine appropriate display value
      let displayValue = 'block'; // Default fallback
      
      for (const [displayType, tags] of Object.entries(displayMap)) {
        if (tags.includes(element.tagName)) {
          displayValue = displayType;
          break;
        }
      }
      
      element.style.display = displayValue;
    }
  }
  
  element.removeAttribute('aria-hidden'); // Accessibility
}

/**
 * Toggles the visibility of an element (display: none vs. original/default display).
 * @param {HTMLElement} element - The HTML element.
 * @param {string} [defaultDisplay='block'] - Default display when showing.
 * @throws {Error} If element is not a valid HTMLElement
 */
export function toggleElementVisibility(element, defaultDisplay) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('toggleElementVisibility requires a valid HTMLElement as the first argument');
  }
  
  const computedStyle = getComputedStyle(element);
  const isCurrentlyHidden = element.style.display === 'none' || computedStyle.display === 'none';
  
  if (isCurrentlyHidden) {
    showElement(element, defaultDisplay);
  } else {
    // Store original display before hiding, if not already done
    if (!element.dataset.originalDisplay && computedStyle.display !== 'none') {
      element.dataset.originalDisplay = computedStyle.display;
    }
    hideElement(element);
  }
}

/**
 * Creates a new HTML element with specified tag name, classes, and attributes.
 * @param {string} tagName - The HTML tag name (e.g., 'div', 'span', 'button').
 * @param {ElementOptions} [options={}] - Options for the element.
 * @returns {HTMLElement | null} The created HTML element, or null if tagName is invalid.
 */
export function createElement(tagName, options = {}) {
  if (!tagName || typeof tagName !== 'string') {
    console.error('[DOMManipulator] Invalid tagName for createElement:', tagName);
    return null;
  }
  
  try {
    const element = document.createElement(tagName);
    
    // Add classes
    if (options.classNames) {
      const classes = Array.isArray(options.classNames) ? options.classNames : [options.classNames];
      addClass(element, ...classes);
    }
    
    // Set attributes
    if (options.attributes) {
      for (const [attr, value] of Object.entries(options.attributes)) {
        if (attr && value !== undefined) {
          element.setAttribute(attr, String(value));
        }
      }
    }
    
    // Set text content
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
 * @throws {Error} If element is not a valid HTMLElement or key is invalid
 */
export function setDataAttribute(element, key, value) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('setDataAttribute requires a valid HTMLElement as the first argument');
  }
  
  if (typeof key !== 'string' || key.trim() === '') {
    throw new Error('setDataAttribute requires a valid key as the second argument');
  }
  
  // Convert camelCase to kebab-case for data attributes
  const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
  element.setAttribute(`data-${kebabKey}`, String(value));
}

/**
 * Gets a data attribute from an element.
 * @param {HTMLElement} element - The HTML element.
 * @param {string} key - The data attribute key (without 'data-').
 * @returns {string | undefined} The value of the data attribute, or undefined if not set.
 * @throws {Error} If element is not a valid HTMLElement or key is invalid
 */
export function getDataAttribute(element, key) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('getDataAttribute requires a valid HTMLElement as the first argument');
  }
  
  if (typeof key !== 'string' || key.trim() === '') {
    throw new Error('getDataAttribute requires a valid key as the second argument');
  }
  
  // Convert camelCase to kebab-case for data attributes
  const kebabKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
  return element.getAttribute(`data-${kebabKey}`);
}

/**
 * Attaches an event listener to an element, with optional delegation.
 * @param {HTMLElement | Window | Document} element - The element to attach the listener to.
 * @param {string} eventType - The type of event (e.g., 'click', 'input').
 * @param {Function} handler - The event handler function.
 * @param {string} [delegationSelector] - Optional CSS selector for event delegation.
 *                                        The handler will only be called if the event target (or its parent) matches this selector.
 * @param {boolean | AddEventListenerOptions} [options=false] - Options for addEventListener (e.g., { once: true, capture: false }).
 * @throws {Error} If element is invalid or handler is not a function
 */
export function on(element, eventType, handler, delegationSelector, options = false) {
  if (!(element instanceof HTMLElement || element instanceof Window || element instanceof Document)) {
    throw new Error('on requires a valid HTMLElement, Window, or Document as the first argument');
  }
  
  if (typeof eventType !== 'string' || eventType.trim() === '') {
    throw new Error('on requires a valid eventType as the second argument');
  }
  
  if (typeof handler !== 'function') {
    throw new Error('on requires a valid handler function as the third argument');
  }
  
  // Handle event delegation
  if (delegationSelector) {
    const delegatedHandler = (event) => {
      const delegateTarget = event.target.closest(delegationSelector);
      if (delegateTarget && (element === document || element === window || element.contains(delegateTarget))) {
        handler.call(delegateTarget, event);
      }
    };
    
    element.addEventListener(eventType, delegatedHandler, options);
    // Store the original handler for removal purposes
    handler.delegatedHandler = delegatedHandler;
  } else {
    element.addEventListener(eventType, handler, options);
  }
}

/**
 * Removes an event listener from an element.
 * @param {HTMLElement | Window | Document} element - The element.
 * @param {string} eventType - The event type.
 * @param {Function} handler - The handler function that was originally attached.
 * @param {boolean | EventListenerOptions} [options=false] - Options used when attaching.
 * @throws {Error} If element is invalid or handler is not a function
 */
export function off(element, eventType, handler, options = false) {
  if (!(element instanceof HTMLElement || element instanceof Window || element instanceof Document)) {
    throw new Error('off requires a valid HTMLElement, Window, or Document as the first argument');
  }
  
  if (typeof eventType !== 'string' || eventType.trim() === '') {
    throw new Error('off requires a valid eventType as the second argument');
  }
  
  if (typeof handler !== 'function') {
    throw new Error('off requires a valid handler function as the third argument');
  }
  
  // Handle delegated handlers
  if (handler.delegatedHandler) {
    element.removeEventListener(eventType, handler.delegatedHandler, options);
  } else {
    element.removeEventListener(eventType, handler, options);
  }
}

/**
 * Sets multiple attributes on an element
 * @param {HTMLElement} element - The HTML element
 * @param {Record<string, string>} attributes - Attributes to set
 * @throws {Error} If element is invalid or attributes are not provided
 */
export function setAttributes(element, attributes) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('setAttributes requires a valid HTMLElement as the first argument');
  }
  
  if (typeof attributes !== 'object' || attributes === null) {
    throw new Error('setAttributes requires an attributes object as the second argument');
  }
  
  for (const [attr, value] of Object.entries(attributes)) {
    if (attr && value !== undefined) {
      element.setAttribute(attr, String(value));
    }
  }
}

/**
 * Gets multiple attributes from an element
 * @param {HTMLElement} element - The HTML element
 * @param {string[]} attributeNames - Names of attributes to get
 * @returns {Record<string, string|null>} Object with attribute values
 * @throws {Error} If element is invalid or attributeNames is not an array
 */
export function getAttributes(element, attributeNames) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('getAttributes requires a valid HTMLElement as the first argument');
  }
  
  if (!Array.isArray(attributeNames)) {
    throw new Error('getAttributes requires an array of attribute names');
  }
  
  const result = {};
  for (const attr of attributeNames) {
    result[attr] = element.getAttribute(attr);
  }
  
  return result;
}

/**
 * Removes multiple attributes from an element
 * @param {HTMLElement} element - The HTML element
 * @param {string[]} attributeNames - Names of attributes to remove
 * @throws {Error} If element is invalid or attributeNames is not an array
 */
export function removeAttributes(element, attributeNames) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('removeAttributes requires a valid HTMLElement as the first argument');
  }
  
  if (!Array.isArray(attributeNames)) {
    throw new Error('removeAttributes requires an array of attribute names');
  }
  
  for (const attr of attributeNames) {
    element.removeAttribute(attr);
  }
}

/**
 * Sets the text content of an element safely
 * @param {HTMLElement} element - The HTML element
 * @param {string} text - The text content
 * @throws {Error} If element is invalid or text is not a string
 */
export function setTextContent(element, text) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('setTextContent requires a valid HTMLElement as the first argument');
  }
  
  if (typeof text !== 'string') {
    throw new Error('setTextContent requires a string value');
  }
  
  element.textContent = text;
}

/**
 * Sets the HTML content of an element safely
 * @param {HTMLElement} element - The HTML element
 * @param {string} html - The HTML content
 * @throws {Error} If element is invalid or html is not a string
 */
export function setInnerHTML(element, html) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('setInnerHTML requires a valid HTMLElement as the first argument');
  }
  
  if (typeof html !== 'string') {
    throw new Error('setInnerHTML requires a string value');
  }
  
  element.innerHTML = html;
}

/**
 * Gets the computed style for an element
 * @param {HTMLElement} element - The HTML element
 * @param {string} property - The CSS property to get
 * @returns {string} The computed style value
 * @throws {Error} If element is invalid or property is not a string
 */
export function getStyle(element, property) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('getStyle requires a valid HTMLElement as the first argument');
  }
  
  if (typeof property !== 'string' || property.trim() === '') {
    throw new Error('getStyle requires a valid property name as the second argument');
  }
  
  return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Sets a CSS style property on an element
 * @param {HTMLElement} element - The HTML element
 * @param {string} property - The CSS property to set
 * @param {string} value - The value to set
 * @throws {Error} If element is invalid or property is not a string
 */
export function setStyle(element, property, value) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('setStyle requires a valid HTMLElement as the first argument');
  }
  
  if (typeof property !== 'string' || property.trim() === '') {
    throw new Error('setStyle requires a valid property name as the second argument');
  }
  
  element.style.setProperty(property, value);
}

/**
 * Sets multiple CSS styles on an element
 * @param {HTMLElement} element - The HTML element
 * @param {Object<string, string>} styles - Object with CSS properties and values
 * @throws {Error} If element is invalid or styles is not an object
 */
export function setStyles(element, styles) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('setStyles requires a valid HTMLElement as the first argument');
  }
  
  if (typeof styles !== 'object' || styles === null) {
    throw new Error('setStyles requires a styles object as the second argument');
  }
  
  for (const [property, value] of Object.entries(styles)) {
    if (property && value !== undefined) {
      element.style.setProperty(property, String(value));
    }
  }
}

/**
 * Removes a CSS style property from an element
 * @param {HTMLElement} element - The HTML element
 * @param {string} property - The CSS property to remove
 * @throws {Error} If element is invalid or property is not a string
 */
export function removeStyle(element, property) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('removeStyle requires a valid HTMLElement as the first argument');
  }
  
  if (typeof property !== 'string' || property.trim() === '') {
    throw new Error('removeStyle requires a valid property name as the second argument');
  }
  
  element.style.removeProperty(property);
}

/**
 * Checks if an element is in the DOM
 * @param {HTMLElement} element - The HTML element to check
 * @returns {boolean} True if element is in the DOM
 * @throws {Error} If element is invalid
 */
export function isInDOM(element) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('isInDOM requires a valid HTMLElement as the first argument');
  }
  
  return document.body.contains(element);
}

/**
 * Gets the closest ancestor element matching a selector
 * @param {HTMLElement} element - The starting element
 * @param {string} selector - The CSS selector to match
 * @returns {HTMLElement|null} The closest ancestor or null if not found
 * @throws {Error} If element is invalid or selector is not a string
 */
export function closest(element, selector) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('closest requires a valid HTMLElement as the first argument');
  }
  
  if (typeof selector !== 'string' || selector.trim() === '') {
    throw new Error('closest requires a valid selector as the second argument');
  }
  
  return element.closest(selector);
}

/**
 * Gets all elements that match a selector within the element
 * @param {HTMLElement} element - The starting element
 * @param {string} selector - The CSS selector to match
 * @returns {NodeList} The matching elements
 * @throws {Error} If element is invalid or selector is not a string
 */
export function queryAll(element, selector) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('queryAll requires a valid HTMLElement as the first argument');
  }
  
  if (typeof selector !== 'string' || selector.trim() === '') {
    throw new Error('queryAll requires a valid selector as the second argument');
  }
  
  return element.querySelectorAll(selector);
}

/**
 * Gets the first element that matches a selector within the element
 * @param {HTMLElement} element - The starting element
 * @param {string} selector - The CSS selector to match
 * @returns {HTMLElement|null} The matching element or null if not found
 * @throws {Error} If element is invalid or selector is not a string
 */
export function query(element, selector) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('query requires a valid HTMLElement as the first argument');
  }
  
  if (typeof selector !== 'string' || selector.trim() === '') {
    throw new Error('query requires a valid selector as the second argument');
  }
  
  return element.querySelector(selector);
}

/**
 * Appends multiple children to an element
 * @param {HTMLElement} element - The parent element
 * @param {...(HTMLElement|string)} children - The children to append
 * @throws {Error} If element is invalid
 */
export function appendChildren(element, ...children) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('appendChildren requires a valid HTMLElement as the first argument');
  }
  
  children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof HTMLElement) {
      element.appendChild(child);
    }
  });
}

/**
 * Removes an element from the DOM
 * @param {HTMLElement} element - The element to remove
 * @throws {Error} If element is invalid
 */
export function removeElement(element) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('removeElement requires a valid HTMLElement as the first argument');
  }
  
  if (element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

/**
 * Removes all children from an element
 * @param {HTMLElement} element - The element to clear
 * @throws {Error} If element is invalid
 */
export function clearChildren(element) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('clearChildren requires a valid HTMLElement as the first argument');
  }
  
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Clones an element
 * @param {HTMLElement} element - The element to clone
 * @param {boolean} [deep=true] - Whether to perform a deep copy
 * @returns {HTMLElement} A clone of the element
 * @throws {Error} If element is invalid
 */
export function cloneElement(element, deep = true) {
  if (!(element instanceof HTMLElement)) {
    throw new Error('cloneElement requires a valid HTMLElement as the first argument');
  }
  
  return element.cloneNode(deep);
}
