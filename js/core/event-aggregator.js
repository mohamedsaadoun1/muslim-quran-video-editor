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
      // Attempt to use errorLogger if available, otherwise fallback to console.error
      const logger = (typeof window !== 'undefined' && window.errorLogger) ||
                     (typeof errorLogger !== 'undefined' ? errorLogger : null);
      if (logger && typeof logger.logWarning === 'function') {
        logger.logWarning({
          message: `Invalid eventName for subscribe: "${eventName}". Subscription failed.`,
          origin: 'EventAggregator.subscribe'
        });
      } else {
        console.warn('[EventAggregator] Invalid eventName for subscribe:', eventName);
      }
      return { unsubscribe: () => {} }; // Return a no-op unsubscribe
    }

    if (typeof callback !== 'function') {
      const logger = (typeof window !== 'undefined' && window.errorLogger) ||
                     (typeof errorLogger !== 'undefined' ? errorLogger : null);
      if (logger && typeof logger.logWarning === 'function') {
        logger.logWarning({
          message: `Invalid callback for subscribe on event: "${eventName}". Subscription failed.`,
          origin: 'EventAggregator.subscribe',
          context: { eventName }
        });
      } else {
        console.warn('[EventAggregator] Invalid callback for subscribe on event:', eventName);
      }
      return { unsubscribe: () => {} }; // Return a no-op unsubscribe
    }

    if (!subscriptions[eventName]) {
      subscriptions[eventName] = [];
    }
    subscriptions[eventName].push(callback);

    // Return an unsubscribe function
    return {
      unsubscribe: () => {
        if (subscriptions[eventName]) {
          const index = subscriptions[eventName].indexOf(callback);
          if (index > -1) {
            subscriptions[eventName].splice(index, 1);
          }
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
    // errorLogger might not be defined globally yet during initial script parsing,
    // so we make its usage conditional or fallback to console.
    const logger = (typeof window !== 'undefined' && window.errorLogger) ||
                   (typeof errorLogger !== 'undefined' ? errorLogger : null);

    if (typeof eventName !== 'string' || eventName.trim() === '') {
      if (logger && typeof logger.logWarning === 'function') {
        logger.logWarning({
            message: `Invalid eventName for publish: "${eventName}". Event not published.`,
            origin: 'EventAggregator.publish'
        });
      } else {
        console.warn('[EventAggregator] Invalid eventName for publish:', eventName);
      }
      return;
    }

    // Optional: For debugging, log published events
    // console.debug(`[EventAggregator] Publishing event: ${eventName}`, data !== undefined ? data : '');

    if (subscriptions[eventName] && subscriptions[eventName].length > 0) {
      // Iterate over a copy of the array in case a callback unsubscribes itself or another during iteration
      const callbacksToExecute = [...subscriptions[eventName]];
      
      callbacksToExecute.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          const message = `Error in subscriber callback for event "${eventName}"`;
          if (logger && typeof logger.handleError === 'function') {
             logger.handleError({
                error,
                message,
                origin: `EventAggregator.publish("${eventName}")->callback`,
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
    if (eventName && typeof eventName === 'string') {
      if (subscriptions[eventName]) {
        delete subscriptions[eventName];
        // console.debug(`[EventAggregator] Cleared subscriptions for event: ${eventName}`);
      }
    } else if (eventName === undefined) { // Clear all if no argument or undefined is passed
      Object.keys(subscriptions).forEach(key => delete subscriptions[key]);
      // console.debug('[EventAggregator] Cleared all subscriptions.');
    } else {
        const logger = (typeof window !== 'undefined' && window.errorLogger) ||
                       (typeof errorLogger !== 'undefined' ? errorLogger : null);
        if (logger && typeof logger.logWarning === 'function') {
            logger.logWarning({
                message: `Invalid argument for clearSubscriptions. Expected string or undefined, got: ${typeof eventName}`,
                origin: 'EventAggregator.clearSubscriptions'
            });
        } else {
            console.warn('[EventAggregator] Invalid argument for clearSubscriptions.');
        }
    }
  };

  return {
    subscribe,
    publish,
    clearSubscriptions,
  };
})();

// Expose to window for debugging if errorLogger isn't available initially (during development)
// if (typeof window !== 'undefined' && !window.errorLogger && typeof errorLogger !== 'undefined') {
//   window.errorLogger = errorLogger; // Temporary for initial access
// }


export default eventAggregator;
