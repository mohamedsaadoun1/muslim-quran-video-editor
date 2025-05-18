// js/services/local-storage.adapter.js

import errorLogger from '../core/error-logger.js'; // لتسجيل أي أخطاء عند التعامل مع localStorage

const localStorageAdapter = {
  /**
   * Retrieves an item from localStorage.
   * Parses it as JSON if possible.
   * @param {string} key - The key of the item to retrieve.
   * @returns {any | null} The retrieved item, or null if not found or an error occurs.
   */
  getItem(key) {
    if (typeof localStorage === 'undefined') {
      errorLogger.logWarning({
        message: 'localStorage is not available in this environment.',
        origin: 'localStorageAdapter.getItem',
        context: { key },
      });
      return null;
    }
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return null;
      }
      // Attempt to parse as JSON, but return raw string if it fails
      // (in case something non-JSON was stored by mistake or by other code)
      try {
        return JSON.parse(item);
      } catch (e) {
        // errorLogger.logWarning({ // This might be too noisy if you intentionally store non-JSON strings
        //   message: `Value for key "${key}" in localStorage is not valid JSON. Returning raw string.`,
        //   origin: 'localStorageAdapter.getItem',
        //   context: { rawValue: item }
        // });
        return item; // Return as string if not JSON
      }
    } catch (error) {
      errorLogger.handleError({
        error,
        message: `Error retrieving item "${key}" from localStorage.`,
        origin: 'localStorageAdapter.getItem',
        context: { key },
      });
      return null;
    }
  },

  /**
   * Stores an item in localStorage.
   * Converts the item to a JSON string before storing.
   * @param {string} key - The key to store the item under.
   * @param {any} value - The value to store.
   * @returns {boolean} True if successful, false otherwise.
   */
  setItem(key, value) {
    if (typeof localStorage === 'undefined') {
      errorLogger.logWarning({
        message: 'localStorage is not available. Cannot set item.',
        origin: 'localStorageAdapter.setItem',
        context: { key },
      });
      return false;
    }
    try {
      if (value === undefined) {
        // Storing undefined as JSON results in it being removed if it's a property of an object.
        // To be consistent with localStorage behavior (which stringifies undefined to "undefined"),
        // we might choose to remove the item or log a warning.
        // For simplicity, let's remove it if the intent was to "clear" it.
        errorLogger.logWarning({
            message: `Attempted to store 'undefined' for key "${key}". Removing item instead.`,
            origin: 'localStorageAdapter.setItem',
        });
        this.removeItem(key);
        return true;
      }
      const stringifiedValue = JSON.stringify(value);
      localStorage.setItem(key, stringifiedValue);
      return true;
    } catch (error) {
      errorLogger.handleError({
        error, // This could be a QuotaExceededError
        message: `Error setting item "${key}" in localStorage. Value might be too large or localStorage is full.`,
        origin: 'localStorageAdapter.setItem',
        context: { key /*, value: (value might be very large, be careful logging it) */ },
      });
      return false;
    }
  },

  /**
   * Removes an item from localStorage.
   * @param {string} key - The key of the item to remove.
   */
  removeItem(key) {
    if (typeof localStorage === 'undefined') {
      errorLogger.logWarning({
        message: 'localStorage is not available. Cannot remove item.',
        origin: 'localStorageAdapter.removeItem',
        context: { key },
      });
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch (error) {
      errorLogger.handleError({
        error,
        message: `Error removing item "${key}" from localStorage.`,
        origin: 'localStorageAdapter.removeItem',
        context: { key },
      });
    }
  },

  /**
   * Clears all items from localStorage managed by this application (if using a prefix).
   * For now, this is a generic clear all.
   * CAUTION: This will clear EVERYTHING in localStorage for the current origin.
   * A more sophisticated approach would be to iterate and remove only prefixed keys.
   */
  clearAll() {
    if (typeof localStorage === 'undefined') {
      errorLogger.logWarning({
        message: 'localStorage is not available. Cannot clear items.',
        origin: 'localStorageAdapter.clearAll',
      });
      return;
    }
    try {
      localStorage.clear();
      // console.info('[LocalStorageAdapter] All items cleared from localStorage.');
    } catch (error) {
      errorLogger.handleError({
        error,
        message: 'Error clearing localStorage.',
        origin: 'localStorageAdapter.clearAll',
      });
    }
  }
};

export default localStorageAdapter;
