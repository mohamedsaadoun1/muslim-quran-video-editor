// js/services/local-storage.adapter.js

// errorLogger يمكن تمريره إذا احتاجت هذه الوحدة إلى تسجيل متقدم،
// ولكن بشكل عام، دوالها تُرجع قيمة أو لا تفعل شيئًا بهدوء إذا فشلت،
// والكود المستدعي هو الذي يتعامل مع النتيجة.
// لتسجيل أخطاء داخلية حرجة (مثل localStorage غير متاح)، يمكنها استخدام console.warn أو console.error مباشرة.
// let localErrorLoggerRef = console;
// if (typeof window !== 'undefined' && window.errorLogger) {
//     localErrorLoggerRef = window.errorLogger;
// }

const localStorageAdapter = {
  /**
   * Checks if localStorage is available and usable.
   * @returns {boolean} True if localStorage is available, false otherwise.
   */
  isAvailable() {
    try {
      const testKey = '__localStorageTest__';
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
      }
      return false;
    } catch (e) {
      return false; // localStorage is disabled or quota exceeded even for test.
    }
  },

  /**
   * Retrieves an item from localStorage.
   * Automatically parses JSON strings.
   * @param {string} key - The key of the item to retrieve.
   * @param {any} [defaultValue=null] - The value to return if the key is not found or an error occurs.
   * @returns {any | null} The retrieved and parsed item, or the defaultValue.
   */
  getItem(key, defaultValue = null) {
    if (!this.isAvailable()) {
      console.warn(`[LocalStorageAdapter] localStorage is not available. Cannot get item: "${key}".`);
      return defaultValue;
    }
    try {
      const itemString = localStorage.getItem(key);
      if (itemString === null) {
        return defaultValue;
      }
      // Attempt to parse as JSON. If it fails, it might be a raw string.
      try {
        return JSON.parse(itemString);
      } catch (e) {
        // console.warn(`[LocalStorageAdapter] Value for key "${key}" is not valid JSON. Returning as raw string.`, itemString);
        return itemString; // Return as raw string if parsing failed
      }
    } catch (error) {
      console.error(`[LocalStorageAdapter] Error retrieving item "${key}" from localStorage:`, error);
      // If a global errorLogger is available and configured, use it:
      // (localErrorLoggerRef.handleError || console.error).call(localErrorLoggerRef, {
      //   error, message: `Error retrieving item "${key}" from localStorage.`,
      //   origin: 'localStorageAdapter.getItem', context: { key }
      // });
      return defaultValue;
    }
  },

  /**
   * Stores an item in localStorage.
   * Automatically stringifies the value to JSON.
   * @param {string} key - The key to store the item under.
   * @param {any} value - The value to store. Must be JSON-serializable.
   * @returns {boolean} True if successful, false otherwise.
   */
  setItem(key, value) {
    if (!this.isAvailable()) {
      console.warn(`[LocalStorageAdapter] localStorage is not available. Cannot set item: "${key}".`);
      return false;
    }
    try {
      if (value === undefined) {
        // console.warn(`[LocalStorageAdapter] Attempted to store 'undefined' for key "${key}". Removing item instead.`);
        this.removeItem(key); // Or just return false / do nothing
        return true; // Technically, the "undefined" state is achieved
      }
      const stringifiedValue = JSON.stringify(value);
      localStorage.setItem(key, stringifiedValue);
      return true;
    } catch (error) { // This could be a QuotaExceededError or other serialization error
      console.error(`[LocalStorageAdapter] Error setting item "${key}" in localStorage:`, error);
      // (localErrorLoggerRef.handleError || console.error).call(localErrorLoggerRef, {
      //   error, message: `Error setting item "${key}" in localStorage. Value might be too large or localStorage is full.`,
      //   origin: 'localStorageAdapter.setItem',
      //   context: { key /* value might be too large to log directly */ }
      // });
      return false;
    }
  },

  /**
   * Removes an item from localStorage.
   * @param {string} key - The key of the item to remove.
   * @returns {boolean} True if removal was attempted (doesn't mean item existed), false if localStorage not available.
   */
  removeItem(key) {
    if (!this.isAvailable()) {
      console.warn(`[LocalStorageAdapter] localStorage is not available. Cannot remove item: "${key}".`);
      return false;
    }
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`[LocalStorageAdapter] Error removing item "${key}" from localStorage:`, error);
      // (localErrorLoggerRef.handleError || console.error).call(localErrorLoggerRef, {
      //   error, message: `Error removing item "${key}" from localStorage.`,
      //   origin: 'localStorageAdapter.removeItem', context: { key }
      // });
      return false; // Indicate an issue during removal attempt
    }
  },

  /**
   * Clears all items from localStorage for the current origin.
   * Use with caution.
   * @returns {boolean} True if clear was attempted, false if localStorage not available.
   */
  clearAll() {
    if (!this.isAvailable()) {
      console.warn('[LocalStorageAdapter] localStorage is not available. Cannot clear items.');
      return false;
    }
    try {
      localStorage.clear();
      // console.info('[LocalStorageAdapter] All items cleared from localStorage for this origin.');
      return true;
    } catch (error) {
      console.error('[LocalStorageAdapter] Error clearing localStorage:', error);
      // (localErrorLoggerRef.handleError || console.error).call(localErrorLoggerRef, {
      //   error, message: 'Error clearing localStorage.', origin: 'localStorageAdapter.clearAll'
      // });
      return false;
    }
  }
  // Note: A more sophisticated version for `clearAll` might iterate through keys
  // and only remove those matching a specific application prefix (e.g., from app.constants.js).
  // For example:
  // clearAppSpecificItems(appPrefix) {
  //   if (!this.isAvailable() || !appPrefix) return false;
  //   try {
  //     Object.keys(localStorage).forEach(key => {
  //       if (key.startsWith(appPrefix)) {
  //         localStorage.removeItem(key);
  //       }
  //     });
  //     return true;
  //   } catch (error) { ... }
  // }
};

// This service typically doesn't need an `initialize...` function called by moduleBootstrap.
// Its methods are utilities. Other modules import it directly when needed.
// If it needed to take `errorLogger` as a dependency for more advanced logging,
// then `moduleBootstrap` would need to initialize it and pass the logger.

export default localStorageAdapter;
