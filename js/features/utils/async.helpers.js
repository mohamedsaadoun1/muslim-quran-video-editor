// js/utils/async.helpers.js

/**
 * Debounce function: postpones the execution of a function until after `delay` milliseconds
 * have elapsed since the last time it was invoked.
 *
 * Useful for events that fire rapidly, like window resize, scroll, or input typing,
 * to prevent excessive processing.
 *
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The debounce delay in milliseconds.
 * @returns {Function} A new debounced function.
 */
export function debounce(func, delay) {
  let timeoutId;

  // Use a function wrapper to properly handle `this` context and arguments
  return function(...args) {
    // `this` will be the context of where the debounced function is called
    // (e.g., an event listener's `this` if bound directly, or an object if called as a method)
    const context = this; 

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      // Call the original function with the saved context and arguments
      func.apply(context, args);
    }, delay);
  };
}

/**
 * Throttle function: ensures that a function is called at most once in a specified time limit.
 *
 * Useful for rate-limiting functions that handle events like mouse move or scroll.
 * This implementation calls the function on the leading edge (first call in a period).
 *
 * @param {Function} func - The function to throttle.
 * @param {number} limit - The time limit in milliseconds.
 * @returns {Function} A new throttled function.
 */
export function throttle(func, limit) {
  let inThrottle = false;
  let lastArgs = null;
  let lastThis = null;

  return function(...args) {
    lastArgs = args;
    lastThis = this; // Capture `this` context

    if (!inThrottle) {
      func.apply(lastThis, lastArgs); // Call immediately on first invocation in period
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        // If there was a call during the throttle period, call it now (trailing edge).
        // This part is optional and creates a leading & trailing edge throttle.
        // If you only want leading edge, remove this if block.
        // if (lastArgs) {
        //   func.apply(lastThis, lastArgs);
        //   lastArgs = null; // Clear for next period
        //   lastThis = null;
        // }
      }, limit);
    }
    // To implement trailing edge only, or leading & trailing more precisely,
    // the logic might involve checking `lastArgs` within the setTimeout callback.
  };
}


/**
 * Creates a promise that resolves after a specified delay.
 * Useful for adding artificial delays, simulating async operations, or timing.
 *
 * @param {number} ms - The delay in milliseconds.
 * @returns {Promise<void>} A promise that resolves after the delay.
 */
export function delayPromise(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * Polls a condition function until it returns true or a timeout is reached.
 * @param {() => boolean | Promise<boolean>} conditionFn - A function that returns a boolean or a Promise<boolean>.
 *                                                        Polling stops when it returns true.
 * @param {number} [timeout=5000] - Maximum time to poll in milliseconds.
 * @param {number} [interval=100] - How often to check the condition in milliseconds.
 * @returns {Promise<void>} A promise that resolves when the condition is met, or rejects on timeout.
 */
export async function pollUntil(conditionFn, timeout = 5000, interval = 100) {
  const startTime = Date.now();

  return new Promise(async (resolve, reject) => {
    async function checkCondition() {
      try {
        const result = await conditionFn();
        if (result === true) {
          resolve();
        } else if (Date.now() - startTime < timeout) {
          setTimeout(checkCondition, interval);
        } else {
          reject(new Error(`Polling timed out after ${timeout}ms.`));
        }
      } catch (error) {
        // If conditionFn itself throws an error, reject the poll promise
        reject(error);
      }
    }
    await checkCondition();
  });
}


/**
 * Retries a promise-returning function a specified number of times with a delay.
 * @param {() => Promise<any>} promiseFn - A function that returns a Promise.
 * @param {number} [maxRetries=3] - Maximum number of retry attempts.
 * @param {number} [retryDelay=1000] - Delay between retries in milliseconds.
 * @param {Function} [onRetry] - Optional callback function called before each retry: (attempt, error) => void
 * @returns {Promise<any>} A promise that resolves with the result of promiseFn or rejects after all retries.
 */
export async function retryPromise(promiseFn, maxRetries = 3, retryDelay = 1000, onRetry) {
    let attempts = 0;
    while (attempts < maxRetries) {
        try {
            return await promiseFn(); // Attempt to resolve the promise
        } catch (error) {
            attempts++;
            if (onRetry && typeof onRetry === 'function') {
                onRetry(attempts, error);
            }
            if (attempts >= maxRetries) {
                // console.error(`[retryPromise] Max retries (${maxRetries}) reached. Last error:`, error);
                throw error; // Re-throw the last error after all attempts
            }
            // console.warn(`[retryPromise] Attempt ${attempts} failed. Retrying in ${retryDelay}ms... Error:`, error.message);
            await delayPromise(retryDelay); // Wait before retrying
        }
    }
    // This line should not be reached if maxRetries > 0,
    // but as a fallback if maxRetries is 0 or negative:
    return Promise.reject(new Error('Max retries reached or invalid retry count.'));
}


// This module exports utility functions and does not need an `initialize...` function.
// Modules import these functions directly.
