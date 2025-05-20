// js/utils/async.helpers.js

/**
 * @typedef {Object} ThrottleOptions
 * @property {boolean} [leading=true] - Whether to invoke the function on the leading edge
 * @property {boolean} [trailing=false] - Whether to invoke the function on the trailing edge
 */

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
 * @throws {Error} If func is not a function
 */
export function debounce(func, delay) {
  if (typeof func !== 'function') {
    throw new Error('debounce requires a function as the first argument');
  }

  if (typeof delay !== 'number' || delay < 0) {
    console.warn('debounce delay must be a non-negative number. Using default of 0.');
    delay = 0;
  }
  
  let timeoutId;
  
  return function debouncedFunction(...args) {
    const context = this;
    
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      func.apply(context, args);
    }, delay);
  };
}

/**
 * Throttle function: ensures that a function is called at most once in a specified time limit.
 *
 * Useful for rate-limiting functions that handle events like mouse move or scroll.
 * Supports both leading and trailing edge execution options.
 *
 * @param {Function} func - The function to throttle.
 * @param {number} limit - The time limit in milliseconds.
 * @param {ThrottleOptions} [options={leading: true, trailing: false}] - Throttle options
 * @returns {Function} A new throttled function.
 * @throws {Error} If func is not a function or limit is invalid
 */
export function throttle(func, limit, options = { leading: true, trailing: false }) {
  if (typeof func !== 'function') {
    throw new Error('throttle requires a function as the first argument');
  }
  
  if (typeof limit !== 'number' || limit < 0) {
    console.warn('throttle limit must be a non-negative number. Using default of 0.');
    limit = 0;
  }
  
  const { leading = true, trailing = false } = options;
  
  let lastExecution = 0;
  let lastArgs = null;
  let lastThis = null;
  
  function execute() {
    lastExecution = Date.now();
    func.apply(lastThis, lastArgs);
    lastArgs = lastThis = null;
  }
  
  return function throttledFunction(...args) {
    const now = Date.now();
    const remaining = limit - (now - lastExecution);
    
    lastThis = this;
    lastArgs = args;
    
    if (remaining <= 0 && leading) {
      execute();
    } else if (trailing && !lastArgs) {
      setTimeout(() => {
        if (lastArgs) {
          execute();
        }
      }, limit);
    }
    
    return null;
  };
}

/**
 * Creates a promise that resolves after a specified delay.
 * Useful for adding artificial delays, simulating async operations, or timing.
 *
 * @param {number} ms - The delay in milliseconds.
 * @returns {Promise<void>} A promise that resolves after the delay.
 * @throws {Error} If ms is not a valid number
 */
export function delayPromise(ms) {
  if (typeof ms !== 'number' || ms < 0) {
    console.warn('delayPromise requires a non-negative number for delay. Using default of 0.');
    ms = 0;
  }
  
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Polls a condition function until it returns true or a timeout is reached.
 * 
 * @param {() => boolean | Promise<boolean>} conditionFn - A function that returns a boolean or a Promise<boolean>.
 *                                                        Polling stops when it returns true.
 * @param {number} [timeout=5000] - Maximum time to poll in milliseconds.
 * @param {number} [interval=100] - How often to check the condition in milliseconds.
 * @param {boolean} [debug=false] - Whether to log debug information
 * @returns {Promise<void>} A promise that resolves when the condition is met, or rejects on timeout.
 * @throws {Error} If conditionFn is not a function or parameters are invalid
 */
export async function pollUntil(conditionFn, timeout = 5000, interval = 100, debug = false) {
  if (typeof conditionFn !== 'function') {
    throw new Error('pollUntil requires a function as the conditionFn argument');
  }
  
  if (typeof timeout !== 'number' || timeout < 0) {
    console.warn('pollUntil timeout must be a non-negative number. Using default of 5000ms.');
    timeout = 5000;
  }
  
  if (typeof interval !== 'number' || interval < 0) {
    console.warn('pollUntil interval must be a non-negative number. Using default of 100ms.');
    interval = 100;
  }
  
  const startTime = Date.now();
  let attempt = 0;
  
  return new Promise(async (resolve, reject) => {
    async function checkCondition() {
      attempt++;
      
      try {
        const result = await conditionFn();
        
        if (debug) {
          console.debug(`Polling attempt ${attempt}: Condition returned ${result}`);
        }
        
        if (result === true) {
          if (debug) {
            console.debug(`Condition met after ${Date.now() - startTime}ms`);
          }
          resolve();
        } else if (Date.now() - startTime >= timeout) {
          const errorMessage = `Polling timed out after ${timeout}ms (${attempt} attempts). Last result: ${result}`;
          if (debug) {
            console.debug(errorMessage);
          }
          reject(new Error(errorMessage));
        } else {
          setTimeout(checkCondition, interval);
        }
      } catch (error) {
        const errorMessage = `Condition function threw an error during polling: ${error.message}`;
        if (debug) {
          console.debug(errorMessage);
        }
        reject(error);
      }
    }
    
    if (debug) {
      console.debug(`Starting polling with ${timeout}ms timeout and ${interval}ms interval`);
    }
    
    try {
      await checkCondition();
    } catch (error) {
      if (debug) {
        console.error('Polling failed:', error);
      }
      reject(error);
    }
  });
}

/**
 * Retries a promise-returning function a specified number of times with a delay.
 * 
 * @param {() => Promise<any>} promiseFn - A function that returns a Promise.
 * @param {number} [maxRetries=3] - Maximum number of retry attempts.
 * @param {number} [retryDelay=1000] - Delay between retries in milliseconds.
 * @param {boolean} [exponentialBackoff=false] - Whether to use exponential backoff for retries
 * @param {Function} [shouldRetry] - Optional predicate to determine if a retry should occur for a specific error
 * @param {Function} [onRetry] - Optional callback function called before each retry: (attempt, error, delay) => void
 * @returns {Promise<any>} A promise that resolves with the result of promiseFn or rejects after all retries.
 * @throws {Error} If promiseFn is not a function or parameters are invalid
 */
export async function retryPromise(promiseFn, maxRetries = 3, retryDelay = 1000, 
                                  exponentialBackoff = false, shouldRetry = () => true, onRetry = null) {
  if (typeof promiseFn !== 'function') {
    throw new Error('retryPromise requires a function as the first argument');
  }
  
  if (typeof maxRetries !== 'number' || maxRetries < 0) {
    console.warn('retryPromise maxRetries must be a non-negative number. Using default of 3.');
    maxRetries = 3;
  }
  
  if (typeof retryDelay !== 'number' || retryDelay < 0) {
    console.warn('retryPromise retryDelay must be a non-negative number. Using default of 1000ms.');
    retryDelay = 1000;
  }
  
  if (typeof onRetry !== 'function' && onRetry !== null && onRetry !== undefined) {
    console.warn('retryPromise onRetry must be a function or null. Ignoring.');
    onRetry = null;
  }
  
  if (typeof shouldRetry !== 'function') {
    console.warn('retryPromise shouldRetry must be a function. Using default logic.');
    shouldRetry = () => true;
  }
  
  let attempts = 0;
  let lastError = null;
  
  while (attempts <= maxRetries) {
    try {
      // First attempt doesn      if (attempts === 0) {
        if (exponentialBackoff && attempts > 0) {
          const currentDelay = Math.min(retryDelay * Math.pow(2, attempts), 30000); // Cap at 30 seconds
          if (onRetry) {
            onRetry(attempts, lastError, currentDelay);
          }
          await delayPromise(currentDelay);
        } else if (attempts > 0) {
          if (onRetry) {
            onRetry(attempts, lastError, retryDelay);
          }
          await delayPromise(retryDelay);
        }
        
        return await promiseFn();
      } catch (error) {
        lastError = error;
        attempts++;
        
        if (attempts > maxRetries || !shouldRetry(error, attempts)) {
          const message = `Failed after ${maxRetries} ${maxRetries === 1 ? 'attempt' : 'attempts'}: ${error.message}`;
          const finalError = new Error(message);
          finalError.originalError = error;
          finalError.attempts = attempts;
          throw finalError;
        }
      }
    }
    
    // This line should not be reached if maxRetries is valid
    return Promise.reject(new Error('Max retries reached or invalid retry configuration.'));
  }
