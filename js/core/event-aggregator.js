// js/core/event-aggregator.js

const eventAggregator = (() => {
  const subscriptions = {}; // e.g., { 'eventName': [callback1, callback2], ... }

  /**
   * Subscribes a callback function to an event.
   * @param {string} eventName - The name of the event to subscribe to.
   * @param {Function} callback - The function to execute when the event is published.
   * @returns {{ unsubscribe: () => void }} An object with an unsubscribe method.
   */
  const subscribe = (eventName, callback) => {
    if (typeof eventName !== 'string' || eventName.trim() === '') {
      console.error('[EventAggregator] Invalid eventName for subscribe:', eventName);
      return { unsubscribe: () => {} };
    }
    if (typeof callback !== 'function') {
      console.error('[EventAggregator] Invalid callback for subscribe on event:', eventName);
      return { unsubscribe: () => {} };
    }

    if (!subscriptions[eventName]) {
      subscriptions[eventName] = [];
    }
    subscriptions[eventName].push(callback);

    // Return an unsubscribe function
    return {
      unsubscribe: () => {
        if (subscriptions[eventName]) {
          subscriptions[eventName] = subscriptions[eventName].filter(cb => cb !== callback);
          if (subscriptions[eventName].length === 0) {
            delete subscriptions[eventName];
          }
        }
      }
    };
  };

  /**
   * Publishes an event, triggering all subscribed callbacks.
   * @param {string} eventName - The name of the event to publish.
   * @param {any} [data] - Optional data to pass to the event callbacks.
   */
  const publish = (eventName, data) => {
    if (typeof eventName !== 'string' || eventName.trim() === '') {
      console.warn('[EventAggregator] Invalid eventName for publish:', eventName);
      return;
    }

    // console.debug(`[EventAggregator] Publishing event: ${eventName}`, data !== undefined ? data : '');

    if (subscriptions[eventName]) {
      // Iterate over a copy of the array in case a callback unsubscribes itself or another
      [...subscriptions[eventName]].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          // Use the errorLogger if available, otherwise console.error
          const message = `Error in subscriber for event "${eventName}"`;
          // Check if errorLogger is available on window or directly if circular dependency allows
          const logger = (typeof window !== 'undefined' && window.errorLogger) || 
                         (typeof errorLogger !== 'undefined' ? errorLogger : null);
          if (logger && typeof logger.handleError === 'function') {
             logger.handleError({
                error,
                message,
                origin: `EventAggregator.publish(${eventName})->callback`,
                severity: 'error',
                context: { eventData: data }
             });
          } else {
            console.error(`${message}\nError:`, error, '\nEvent Data:', data);
          }
        }
      });
    }
  };

  /**
   * Clears all subscriptions for a specific event or all events if no eventName is provided.
   * Useful for testing or full app reset.
   * @param {string} [eventName] - The specific event to clear subscriptions for.
   */
  const clearSubscriptions = (eventName) => {
    if (eventName) {
      if (subscriptions[eventName]) {
        delete subscriptions[eventName];
        // console.debug(`[EventAggregator] Cleared subscriptions for event: ${eventName}`);
      }
    } else {
      Object.keys(subscriptions).forEach(key => delete subscriptions[key]);
      // console.debug('[EventAggregator] Cleared all subscriptions.');
    }
  };

  return {
    subscribe,
    publish,
    clearSubscriptions, // Expose for testing or reset scenarios
  };
})();

export default eventAggregator;
