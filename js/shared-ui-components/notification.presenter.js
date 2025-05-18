// js/shared-ui-components/notification.presenter.js

// DOMElements يمكن استخدامه إذا كان هناك حاوية إشعارات ثابتة في HTML،
// ولكننا سنقوم بإنشاء وإزالة الإشعارات ديناميكيًا ونضيفها إلى body أو حاوية مخصصة.
// import DOMElements from '../core/dom-elements.js';

// localizationService قد يُستخدم لترجمة أنواع الإشعارات إذا أردت ذلك،
// ولكن عادة ما تكون الرسالة نفسها هي المُترجمة بواسطة الوحدة المُطلِقة للحدث.
// import localizationService from '../core/localization.service.js';

import { EVENTS } from '../config/app.constants.js'; // لاستيراد EVENTS.NOTIFICATION_REQUESTED

const notificationPresenter = (() => {
  let notificationContainer = null;
  const defaultNotificationDuration = 4000; // milliseconds
  let activeNotifications = new Set(); // To manage multiple notifications if allowed

  // Dependencies injected during initialization
  let deps = {
    eventAggregator: { subscribe: () => ({ unsubscribe: () => {} }), publish: () => {} }, // Fallback
    errorLogger: console // Fallback
  };

  /**
   * Creates the main container for notifications if it doesn't exist.
   * The container is appended to the document body.
   * @private
   */
  function _ensureNotificationContainer() {
    if (!notificationContainer || !document.body.contains(notificationContainer)) {
      notificationContainer = document.createElement('div');
      notificationContainer.className = 'notification-container'; // Add CSS for this class
      document.body.appendChild(notificationContainer);
    }
  }

  /**
   * Creates and displays a single notification element.
   * @param {object} notificationConfig
   * @param {string} notificationConfig.message - The message to display.
   * @param {'success' | 'error' | 'info' | 'warning'} [notificationConfig.type='info'] - Type of notification for styling.
   * @param {number} [notificationConfig.duration=defaultNotificationDuration] - How long to display the notification.
   *                                                                               Set to 0 or Infinity for manual close.
   */
  function _showNotification(notificationConfig) {
    _ensureNotificationContainer();

    const {
      message,
      type = 'info',
      duration = defaultNotificationDuration,
      id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` // Unique ID
    } = notificationConfig;

    const notificationElement = document.createElement('div');
    notificationElement.className = `notification notification-${type} notification-enter`; // Base, type, and entry animation class
    notificationElement.setAttribute('role', type === 'error' ? 'alert' : 'status');
    notificationElement.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    notificationElement.id = id;

    const messageElement = document.createElement('span');
    messageElement.className = 'notification-message';
    messageElement.textContent = message;
    notificationElement.appendChild(messageElement);

    // Optional: Add a close button to each notification
    const closeButton = document.createElement('button');
    closeButton.className = 'notification-close-btn';
    closeButton.innerHTML = '×'; // Simple 'x' character
    closeButton.setAttribute('aria-label', 'Close notification'); // Accessibility
    closeButton.onclick = () => _removeNotification(notificationElement);
    notificationElement.appendChild(closeButton);

    // Prepend for newest notifications at the top (or append for bottom)
    if (notificationContainer.firstChild) {
        notificationContainer.insertBefore(notificationElement, notificationContainer.firstChild);
    } else {
        notificationContainer.appendChild(notificationElement);
    }
    activeNotifications.add(notificationElement);

    // Trigger reflow for CSS animation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = notificationElement.offsetHeight; // Reading offsetHeight forces a reflow
    notificationElement.classList.remove('notification-enter');
    notificationElement.classList.add('notification-show');


    if (duration > 0 && duration !== Infinity) {
      setTimeout(() => {
        _removeNotification(notificationElement);
      }, duration);
    }
  }

  /**
   * Removes a notification element from the DOM with an exit animation.
   * @private
   * @param {HTMLElement} notificationElement - The notification element to remove.
   */
  function _removeNotification(notificationElement) {
    if (!notificationElement || !activeNotifications.has(notificationElement)) return;

    notificationElement.classList.remove('notification-show');
    notificationElement.classList.add('notification-exit');

    // Remove the element after the animation completes
    const handleAnimationEnd = () => {
      if (notificationElement.parentNode) {
        notificationElement.parentNode.removeChild(notificationElement);
      }
      activeNotifications.delete(notificationElement);
      notificationElement.removeEventListener('animationend', handleAnimationEnd);
    };
    notificationElement.addEventListener('animationend', handleAnimationEnd);
    
    // Fallback if animationend event doesn't fire (e.g., if display:none is used by animation)
    setTimeout(() => {
        if (document.body.contains(notificationElement)) { // Check if still in DOM
             handleAnimationEnd(); // Manually trigger removal if still there
        }
    }, 500); // Match this to your CSS animation duration for exit
  }


  /**
   * Handles the NOTIFICATION_REQUESTED event from the event aggregator.
   * @private
   * @param {object} notificationConfig - Configuration passed with the event.
   */
  function _handleNotificationRequest(notificationConfig) {
    if (notificationConfig && notificationConfig.message) {
      _showNotification(notificationConfig);
    } else {
      (deps.errorLogger.logWarning || console.warn).call(deps.errorLogger, {
        message: 'Received notification request with invalid config.',
        origin: 'NotificationPresenter._handleNotificationRequest',
        context: { config: notificationConfig }
      });
    }
  }
  
  /**
   * Sets the dependencies for the notification presenter.
   * @param {object} injectedDeps - { eventAggregator, errorLogger }
   */
  function _setDependencies(injectedDeps) {
      if (injectedDeps.eventAggregator) deps.eventAggregator = injectedDeps.eventAggregator;
      if (injectedDeps.errorLogger) deps.errorLogger = injectedDeps.errorLogger;
  }

  return {
    _setDependencies, // Expose for initialization by moduleBootstrap
    // Public method to directly show a notification if needed (though event-driven is preferred)
    show: (message, type = 'info', duration = defaultNotificationDuration) => {
      _showNotification({ message, type, duration });
    },
    showSuccess: (message, duration) => _showNotification({ message, type: 'success', duration }),
    showError: (message, duration) => _showNotification({ message, type: 'error', duration }),
    showInfo: (message, duration) => _showNotification({ message, type: 'info', duration }),
    showWarning: (message, duration) => _showNotification({ message, type: 'warning', duration }),
  };
})();


/**
 * Initialization function for the NotificationPresenter, to be called by moduleBootstrap.
 * @param {object} dependencies
 * @param {import('../core/event-aggregator.js').default} dependencies.eventAggregator
 * @param {import('../core/error-logger.js').default} dependencies.errorLogger
 */
export function initializeNotificationPresenter(dependencies) {
  notificationPresenter._setDependencies(dependencies);

  if (dependencies.eventAggregator) {
    // Listen for requests to show notifications
    dependencies.eventAggregator.subscribe(
      EVENTS.NOTIFICATION_REQUESTED,
      notificationPresenter.show // Bind directly if show takes the config object
                                 // Or use: (config) => notificationPresenter.show(config.message, config.type, config.duration)
                                 // For more flexibility, show should take the config object directly
                                 // Let's adjust _showNotification to handle direct config
                                 // and the event handler too (DONE in _handleNotificationRequest)
    );
     // Subscribe the internal handler that expects the config object.
    dependencies.eventAggregator.subscribe(
        EVENTS.NOTIFICATION_REQUESTED,
        (config) => { // The handler in _handleNotificationRequest is better as it's private to the module.
            if (config && config.message) {
                notificationPresenter.show(config.message, config.type, config.duration);
            }
        }
    );

    // console.info('[NotificationPresenter] Initialized and subscribed to notification requests.');
  } else {
    (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'EventAggregator not provided to NotificationPresenter. Notifications via events will not work.',
        origin: 'initializeNotificationPresenter'
    });
  }
  
  // Return the public API of the presenter (e.g., the `show` methods)
  return {
    show: notificationPresenter.show,
    showSuccess: notificationPresenter.showSuccess,
    showError: notificationPresenter.showError,
    showInfo: notificationPresenter.showInfo,
    showWarning: notificationPresenter.showWarning,
  };
}

// For direct import and use if initialization is handled externally or not via moduleBootstrap for some reason.
// However, event subscription relies on `initializeNotificationPresenter` being called with eventAggregator.
export default notificationPresenter;
