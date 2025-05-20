// js/shared-ui-components/notification.presenter.js

/**
 * @typedef {'success' | 'error' | 'info' | 'warning'} NotificationType
 * أنواع الإشعارات المتاحة
 */

/**
 * @typedef {Object} NotificationConfig
 * @property {string} message - رسالة الإشعار
 * @property {NotificationType} [type='info'] - نوع الإشعار
 * @property {number} [duration=4000] - مدة عرض الإشعار بالمللي ثانية
 * @property {string} [id] - معرف فريد للإشعار
 * @property {boolean} [dismissible=true] - هل يمكن إغلاق الإشعار يدويًا
 * @property {function} [onDismiss] - وظيفة عند إغلاق الإشعار
 * @property {function} [onClick] - وظيفة عند النقر على الإشعار
 * @property {string} [position='bottom-right'] - موقع الإشعار على الشاشة
 * @property {string} [customClass] - فئة CSS مخصصة
 * @property {boolean} [rtl=false] - هل الإشعار يدعم اللغة العربية
 */

/**
 * @typedef {Object} NotificationDependencies
 * @property {Object} eventAggregator - محرك الأحداث
 * @property {Object} errorLogger - مسجل الأخطاء
 * @property {Object} localizationService - خدمة الترجمة
 */

/**
 * مُقدّم الإشعارات الديناميكية
 * @type {{}}
 */
const notificationPresenter = (() => {
  let notificationContainer = null;
  const defaultNotificationDuration = 4000; // 4 ثوانٍ
  const maxNotifications = 5; // الحد الأقصى للإشعارات
  let activeNotifications = new Set(); // تتبع الإشعارات النشطة
  let dependencies = {
    eventAggregator: {
      subscribe: (event, handler) => {
        window.addEventListener(event, handler);
        return { unsubscribe: () => window.removeEventListener(event, handler) };
      },
      publish: (event, detail) => window.dispatchEvent(new CustomEvent(event, { detail }))
    },
    errorLogger: console,
    localizationService: {
      translate: (key) => key
    }
  };

  /**
   * إنشاء حاوية الإشعارات
   * @private
   */
  function _ensureNotificationContainer() {
    if (!notificationContainer || !document.body.contains(notificationContainer)) {
      notificationContainer = document.createElement('div');
      notificationContainer.className = 'notification-container';
      document.body.appendChild(notificationContainer);
    }
  }

  /**
   * إنشاء عنصر الإشعار
   * @private
   * @param {NotificationConfig} config - إعدادات الإشعار
   * @returns {HTMLElement} عنصر الإشعار
   */
  function _createNotificationElement(config) {
    const {
      message,
      type = 'info',
      duration = defaultNotificationDuration,
      id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      dismissible = true,
      onDismiss,
      onClick,
      position = 'bottom-right',
      customClass = '',
      rtl = false
    } = config;

    const notificationElement = document.createElement('div');
    notificationElement.className = `notification notification-${type} ${customClass} ${position} ${rtl ? 'rtl' : 'ltr'}`;
    notificationElement.id = id;
    notificationElement.setAttribute('role', type === 'error' ? 'alert' : 'status');
    notificationElement.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    notificationElement.setAttribute('aria-atomic', 'true');
    
    // عنصر الرسالة
    const messageElement = document.createElement('span');
    messageElement.className = 'notification-message';
    messageElement.textContent = message;
    notificationElement.appendChild(messageElement);

    // زر الإغلاق (إن وجد)
    if (dismissible) {
      const closeButton = document.createElement('button');
      closeButton.className = 'notification-close-btn';
      closeButton.innerHTML = '×'; // رمز إغلاق بسيط
      closeButton.setAttribute('aria-label', dependencies.localizationService.translate('notification.close'));
      closeButton.onclick = (e) => {
        e.stopPropagation();
        _removeNotification(notificationElement);
        if (typeof onDismiss === 'function') {
          onDismiss(notificationElement);
        }
      };
      notificationElement.appendChild(closeButton);
    }

    // معالج النقر على الإشعار
    if (typeof onClick === 'function') {
      notificationElement.style.cursor = 'pointer';
      notificationElement.onclick = (e) => {
        onClick(e);
        _removeNotification(notificationElement);
      };
    }

    return notificationElement;
  }

  /**
   * عرض الإشعار
   * @private
   * @param {NotificationConfig} notificationConfig - إعدادات الإشعار
   */
  function _showNotification(notificationConfig) {
    try {
      // التحقق من صحة الإعدادات
      if (!_validateNotificationConfig(notificationConfig)) {
        return;
      }

      _ensureNotificationContainer();

      // إنشاء عنصر الإشعار
      const notificationElement = _createNotificationElement(notificationConfig);

      // تحديد موقع الإشعار بناءً على الوضع
      const position = notificationConfig.position || 'bottom-right';
      const isTop = position.includes('top');
      const isRight = position.includes('right');

      if (notificationContainer && notificationContainer.children.length >= maxNotifications) {
        // مسح الإشعار الأقدم
        const oldest = notificationContainer.firstElementChild;
        if (oldest) {
          _removeNotification(oldest);
        }
      }

      // إضافة الإشعار إلى الحاوية
      if (isTop) {
        notificationContainer.insertBefore(notificationElement, notificationContainer.firstChild);
      } else {
        notificationContainer.appendChild(notificationElement);
      }

      // تشغيل تحريك الدخول
      requestAnimationFrame(() => {
        notificationElement.classList.add('notification-show');
        notificationElement.classList.remove('notification-enter');
      });

      // تشغيل تحريك الخروج بعد المدة المحددة
      if (notificationConfig.duration > 0 && notificationConfig.duration !== Infinity) {
        setTimeout(() => {
          _removeNotification(notificationElement);
        }, notificationConfig.duration);
      }

      activeNotifications.add(notificationElement);

    } catch (error) {
      console.error('[NotificationPresenter] خطأ في عرض الإشعار:', error);
    }
  }

  /**
   * إزالة إشعار مع تحريك
   * @private
   * @param {HTMLElement} notificationElement - عنصر الإشعار
   */
  function _removeNotification(notificationElement) {
    if (!notificationElement || !activeNotifications.has(notificationElement)) {
      return;
    }

    // تشغيل تحريك الخروج
    notificationElement.classList.remove('notification-show');
    notificationElement.classList.add('notification-exit');

    // إزالة العنصر بعد انتهاء التحريك
    const handleAnimationEnd = () => {
      if (notificationElement.parentNode) {
        notificationElement.parentNode.removeChild(notificationElement);
      }
      activeNotifications.delete(notificationElement);
      notificationElement.removeEventListener('animationend', handleAnimationEnd);
    };

    notificationElement.addEventListener('animationend', handleAnimationEnd);

    // احتياطي في حالة عدم تشغيل التحريك
    setTimeout(() => {
      if (notificationContainer && notificationContainer.contains(notificationElement)) {
        handleAnimationEnd();
      }
    }, 500);
  }

  /**
   * التحقق من صحة إعدادات الإشعار
   * @private
   * @param {NotificationConfig} config - إعدادات الإشعار
   * @returns {boolean} true إذا كانت الإعدادات صحيحة
   */
  function _validateNotificationConfig(config) {
    if (!config || typeof config !== 'object') {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'إعدادات الإشعار غير صالحة.',
        origin: 'NotificationPresenter._validateNotificationConfig'
      });
      return false;
    }

    if (!config.message || typeof config.message !== 'string') {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'نص الإشعار مطلوب.',
        origin: 'NotificationPresenter._validateNotificationConfig'
      });
      return false;
    }

    const validTypes = ['success', 'error', 'info', 'warning'];
    if (config.type && !validTypes.includes(config.type)) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: `نوع الإشعار غير صالح: ${config.type}`,
        origin: 'NotificationPresenter._validateNotificationConfig'
      });
      return false;
    }

    if (config.duration !== undefined && (typeof config.duration !== 'number' || config.duration < 0)) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'مدة الإشعار يجب أن تكون عددًا موجبًا.',
        origin: 'NotificationPresenter._validateNotificationConfig'
      });
      return false;
    }

    return true;
  }

  /**
   * معالجة طلب الإشعار من محرك الأحداث
   * @private
   * @param {NotificationConfig} notificationConfig - إعدادات الإشعار
   */
  function _handleNotificationRequest(notificationConfig) {
    if (notificationConfig && notificationConfig.message) {
      _showNotification(notificationConfig);
    } else {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'طلب إشعار غير صالح.',
        origin: 'NotificationPresenter._handleNotificationRequest',
        context: { config: notificationConfig }
      });
    }
  }

  /**
   * التحقق من صحة الإعدادات
   * @private
   * @param {NotificationDependencies} injectedDeps - التبعيات المُدخلة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.eventAggregator) {
      dependencies.eventAggregator = injectedDeps.eventAggregator;
    }
    if (injectedDeps.errorLogger) {
      dependencies.errorLogger = injectedDeps.errorLogger;
    }
    if (injectedDeps.localizationService) {
      dependencies.localizationService = injectedDeps.localizationService;
    }
  }

  /**
   * التحقق من وجود إشعار نشط
   * @returns {boolean} true إذا كان هناك إشعار نشط
   */
  function hasActiveNotifications() {
    return activeNotifications.size > 0;
  }

  /**
   * إزالة كل الإشعارات
   * @returns {number} عدد الإشعارات التي تم إزالتها
   */
  function dismissAllNotifications() {
    const count = activeNotifications.size;
    
    if (count === 0) {
      return 0;
    }
    
    const notifications = Array.from(activeNotifications);
    
    notifications.forEach(notification => {
      _removeNotification(notification);
    });
    
    return count;
  }

  /**
   * عرض إشعار نجاح
   * @param {string} message - الرسالة
   * @param {number} [duration=defaultNotificationDuration] - المدة
   * @param {string} [position='bottom-right'] - الموقع
   * @param {boolean} [rtl=false] - هل الإشعار يدعم RTL
   * @param {string} [customClass=''] - فئة مخصصة
   */
  function showSuccess(message, duration = defaultNotificationDuration, position = 'bottom-right', rtl = false, customClass = '') {
    if (!message || typeof message !== 'string') {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'نص الإشعار مطلوب.',
        origin: 'NotificationPresenter.showSuccess'
      });
      return;
    }

    _showNotification({
      message,
      type: 'success',
      duration,
      position,
      rtl,
      customClass
    });
  }

  /**
   * عرض إشعار خطأ
   * @param {string} message - الرسالة
   * @param {number} [duration=5000] - المدة
   * @param {string} [position='bottom-right'] - الموقع
   * @param {boolean} [rtl=false] - هل الإشعار يدعم RTL
   * @param {string} [customClass=''] - فئة مخصصة
   */
  function showError(message, duration = 5000, position = 'bottom-right', rtl = false, customClass = '') {
    if (!message || typeof message !== 'string') {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'نص الإشعار مطلوب.',
        origin: 'NotificationPresenter.showError'
      });
      return;
    }

    _showNotification({
      message,
      type: 'error',
      duration,
      position,
      rtl,
      customClass
    });
  }

  /**
   * عرض إشعار معلومات
   * @param {string} message - الرسالة
   * @param {number} [duration=defaultNotificationDuration] - المدة
   * @param {string} [position='bottom-right'] - الموقع
   * @param {boolean} [rtl=false] - هل الإشعار يدعم RTL
   * @param {string} [customClass=''] - فئة مخصصة
   */
  function showInfo(message, duration = defaultNotificationDuration, position = 'bottom-right', rtl = false, customClass = '') {
    if (!message || typeof message !== 'string') {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'نص الإشعار مطلوب.',
        origin: 'NotificationPresenter.showInfo'
      });
      return;
    }

    _showNotification({
      message,
      type: 'info',
      duration,
      position,
      rtl,
      customClass
    });
  }

  /**
   * عرض إشعار تحذيري
   * @param {string} message - الرسالة
   * @param {number} [duration=defaultNotificationDuration] - المدة
   * @param {string} [position='bottom-right'] - الموقع
   * @param {boolean} [rtl=false] - هل الإشعار يدعم RTL
   * @param {string} [customClass=''] - فئة مخصصة
   */
  function showWarning(message, duration = defaultNotificationDuration, position = 'bottom-right', rtl = false, customClass = '') {
    if (!message || typeof message !== 'string') {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'نص الإشعار مطلوب.',
        origin: 'NotificationPresenter.showWarning'
      });
      return;
    }

    _showNotification({
      message,
      type: 'warning',
      duration,
      position,
      rtl,
      customClass
    });
  }

  /**
   * عرض إشعار مع خيارات مخصصة
   * @param {NotificationConfig} config - إعدادات الإشعار
   */
  function showCustomNotification(config) {
    if (!config || !config.message) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'إعدادات الإشعار غير صالحة.',
        origin: 'NotificationPresenter.showCustomNotification'
      });
      return;
    }

    _showNotification(config);
  }

  /**
   * إنشاء معرف فريد للإشعار
   * @returns {string} المعرف الفريد
   */
  function generateUniqueId() {
    return `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * الحصول على نوع الإشعار
   * @param {string} type - نوع الإشعار
   * @returns {NotificationType} النوع المعالج
   */
  function getNotificationType(type) {
    const validTypes = ['success', 'error', 'info', 'warning'];
    return validTypes.includes(type) ? type : 'info';
  }

  /**
   * التحقق من وجود إشعار معين
   * @param {string} id - معرف الإشعار
   * @returns {boolean} true إذا وُجد الإشعار
   */
  function isNotificationVisible(id) {
    if (!id || typeof id !== 'string') return false;
    
    return Array.from(notificationContainer?.children || []).some(
      el => el.id === id
    );
  }

  /**
   * إزالة إشعار معين
   * @param {string} id - معرف الإشعار
   * @returns {boolean} true إذا تم العثور على الإشعار وإزالته
   */
  function dismissNotification(id) {
    if (!id || typeof id !== 'string') {
      return false;
    }

    const notification = notificationContainer?.querySelector(`#${id}`);
    
    if (notification && activeNotifications.has(notification)) {
      _removeNotification(notification);
      return true;
    }
    
    return false;
  }

  /**
   * عرض إشعار مع ترجمة
   * @param {string} messageKey - مفتاح الترجمة
   * @param {NotificationType} [type='info'] - نوع الإشعار
   * @param {number} [duration=defaultNotificationDuration] - مدة العرض
   * @param {string} [position='bottom-right'] - الموقع
   * @param {boolean} [rtl=false] - هل يدعم RTL
   * @param {string} [customClass=''] - فئة مخصصة
   */
  function showTranslatedNotification(messageKey, type = 'info', duration = defaultNotificationDuration, position = 'bottom-right', rtl = false, customClass = '') {
    if (!messageKey || typeof messageKey !== 'string') {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'مفتاح الترجمة مطلوب.',
        origin: 'NotificationPresenter.showTranslatedNotification'
      });
      return;
    }

    const translatedMessage = dependencies.localizationService.translate(messageKey);
    
    if (!translatedMessage || typeof translatedMessage !== 'string') {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: `فشل في ترجمة الإشعار: ${messageKey}`,
        origin: 'NotificationPresenter.showTranslatedNotification'
      });
      return;
    }

    _showNotification({
      message: translatedMessage,
      type,
      duration,
      position,
      rtl,
      customClass
    });
  }

  /**
   * إعداد الإشعارات
   * @param {Object} injectedDeps - التبعيات المُدخلة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService;
    
    // الاشتراك في الأحداث إن لم يكن قد تم ذلك من قبل
    if (dependencies.eventAggregator && !dependencies.eventAggregator.isSubscribed) {
      dependencies.eventAggregator.subscribe(
        'NOTIFICATION_REQUESTED',
        _handleNotificationRequest
      );
    }
  }

  return {
    _setDependencies,
    show: showCustomNotification,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showTranslatedNotification,
    dismissNotification,
    dismissAllNotifications,
    hasActiveNotifications: () => activeNotifications.size > 0,
    getNotificationType,
    isNotificationVisible
  };
})();

/**
 * تهيئة مُقدّم الإشعارات
 * @param {NotificationDependencies} dependencies - التبعيات
 */
export function initializeNotificationPresenter(dependencies = {}) {
  try {
    console.info('[NotificationPresenter] تم تهيئته بنجاح');
    
    // جعل الإشعارات متاحة عالميًا لتسهيل التصحيح
    if (typeof window !== 'undefined' && 
        (typeof process === 'undefined' || process.env.NODE_ENV === 'development')) {
      window.notificationPresenter = {
        ...notificationPresenter
      };
    }
    
    // تعيين التبعيات
    if (dependencies.eventAggregator || dependencies.errorLogger || dependencies.localizationService) {
      notificationPresenter._setDependencies({
        eventAggregator: dependencies.eventAggregator || {
          subscribe: (event, handler) => {
            window.addEventListener(event, handler);
            return { unsubscribe: () => window.removeEventListener(event, handler) };
          },
          publish: (event, detail) => window.dispatchEvent(new CustomEvent(event, { detail }))
        },
        errorLogger: dependencies.errorLogger || console,
        localizationService: dependencies.localizationService || { translate: (key) => key }
      });
    }
    
    return {
      ...notificationPresenter
    };
  } catch (error) {
    console.error('[NotificationPresenter] فشل في التهيئة:', error);
    return {};
  }
}

export default notificationPresenter;
