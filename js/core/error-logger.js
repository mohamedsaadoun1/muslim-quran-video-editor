// js/core/error-logger.js

/**
 * @typedef {Object} ErrorLogDetails
 * @property {Error} error - The original error object.
 * @property {string} message - A user-friendly or developer-specific message.
 * @property {string} origin - The module or function where the error originated (e.g., 'QuranApiClient.fetchSurahs').
 * @property {'error' | 'warning' | 'info'} [severity='error'] - The severity of the log.
 * @property {Record<string, any>} [context] - Additional context data (e.g., parameters, state).
 */

const errorLogger = (() => {
  const logToConsole = (logDetails) => {
    const { error, message, origin, severity = 'error', context } = logDetails;

    const timestamp = new Date().toISOString();
    let logMessage = `${timestamp} [${severity.toUpperCase()}] [${origin}]: ${message}`;

    if (context) {
      try {
        logMessage += `\n  Context: ${JSON.stringify(context, null, 2)}`;
      } catch (e) {
        logMessage += `\n  Context: (Unserializable)`;
      }
    }

    if (error && error.stack) {
      logMessage += `\n  Stack Trace:\n  ${error.stack}`;
    } else if (error) {
      logMessage += `\n  Error Details: ${error.toString()}`;
    }

    switch (severity) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warning':
        console.warn(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  };

  // مستقبلاً: يمكن إضافة إرسال الأخطاء إلى خدمة خارجية مثل Sentry
  // const logToExternalService = (logDetails) => { ... };

  /**
   * Handles and logs an error.
   * @param {ErrorLogDetails} logDetails - The details of the error to log.
   */
  const handleError = (logDetails) => {
    logToConsole(logDetails);
    // logToExternalService(logDetails); // For future implementation
  };

  /**
   * Logs a warning message.
   * @param {Omit<ErrorLogDetails, 'severity' | 'error'> & { error?: Error }} logDetails - Warning details.
   */
  const logWarning = (logDetails) => {
    handleError({ ...logDetails, severity: 'warning' });
  };

  /**
   * Logs an informational message.
   * @param {Omit<ErrorLogDetails, 'severity' | 'error'> & { error?: Error }} logDetails - Info details.
   */
  const logInfo = (logDetails) => {
    handleError({ ...logDetails, severity: 'info' });
  };

  return {
    handleError,
    logWarning,
    logInfo,
  };
})();

export default errorLogger;
