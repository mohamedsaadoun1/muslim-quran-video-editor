// js/core/event-aggregator.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

/**
 * @typedef {Object} Subscription
 * @property {Function} unsubscribe - وظيفة لإلغاء الاشتراك
 */

/**
 * @typedef {Object} EventAggregator
 * @property {(eventName: string, callback: Function) => Subscription} subscribe - الاشتراك في حدث
 * @property {(eventName: string, data?: any) => void} publish - نشر حدث
 * @property {(eventName?: string) => void} clearSubscriptions - مسح الاشتراكات
 * @property {() => Object<string, Function[]>} _getSubscriptionsForTest - (للاستخدام في الاختبارات فقط)
 */

const eventAggregator = (() => {
  // استخدام Map لتحسين الأداء مع عدد كبير من الأحداث
  const subscriptions = new Map(); // مثلاً: Map<string, Function[]>
  
  // الدوال المساعدة
  const validateEventName = (eventName) => {
    if (typeof eventName !== 'string' || eventName.trim() === '') {
      throw new Error('اسم الحدث يجب أن يكون سلسلة نصية صالحة');
    }
  };

  const validateCallback = (callback) => {
    if (typeof callback !== 'function') {
      throw new Error('الدالة يجب أن تكون وظيفة صالحة');
    }
  };

  const getLogger = () => {
    // محاولة استخدام errorLogger من window
    if (typeof window !== 'undefined' && window.errorLogger) {
      return window.errorLogger;
    }
    
    // محاولة استخدام errorLogger من النطاق المحلي
    if (typeof errorLogger !== 'undefined') {
      return errorLogger;
    }
    
    // العودة إلى وظائف console
    return {
      logWarning: console.warn.bind(console),
      handleError: console.error.bind(console)
    };
  };

  /**
   * الاشتراك في حدث
   * @param {string} eventName - اسم الحدث
   * @param {Function} callback - الدالة التي سيتم استدعاؤها
   * @returns {{ unsubscribe: () => void }} كائن لإلغاء الاشتراك
   */
  const subscribe = (eventName, callback) => {
    try {
      validateEventName(eventName);
      validateCallback(callback);
      
      if (!subscriptions.has(eventName)) {
        subscriptions.set(eventName, []);
      }
      
      const callbacks = subscriptions.get(eventName);
      callbacks.push(callback);
      
      // إرجاع كائن لإلغاء الاشتراك
      return {
        unsubscribe: () => {
          if (subscriptions.has(eventName)) {
            const callbacks = subscriptions.get(eventName);
            const index = callbacks.indexOf(callback);
            
            if (index > -1) {
              callbacks.splice(index, 1);
            }
            
            if (callbacks.length === 0) {
              subscriptions.delete(eventName);
            }
          }
        }
      };
    } catch (error) {
      const logger = getLogger();
      logger.handleError({
        error,
        message: `فشل في الاشتراك في الحدث: ${eventName}`,
        origin: 'event-aggregator.subscribe',
        severity: 'error',
        context: { eventName }
      });
      
      return {
        unsubscribe: () => {}
      };
    }
  };

  /**
   * نشر حدث
   * @param {string} eventName - اسم الحدث
   * @param {any} [data] - البيانات المراد تمريرها
   */
  const publish = (eventName, data) => {
    try {
      validateEventName(eventName);
      
      if (!subscriptions.has(eventName)) {
        return;
      }
      
      // إنشاء نسخة من القائمة لتجنب المشاكل أثناء التعديل
      const callbacks = [...subscriptions.get(eventName)];
      
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          const logger = getLogger();
          logger.handleError({
            error,
            message: `خطأ في تنفيذ callback للحدث: ${eventName}`,
            origin: `event-aggregator.publish("${eventName}")`,
            severity: 'error',
            context: { eventData: data }
          });
        }
      });
    } catch (error) {
      const logger = getLogger();
      logger.handleError({
        error,
        message: `فشل في نشر الحدث: ${eventName}`,
        origin: 'event-aggregator.publish',
        severity: 'error',
        context: { eventName }
      });
    }
  };

  /**
   * مسح الاشتراكات
   * @param {string} [eventName] - اسم الحدث (اختياري)
   */
  const clearSubscriptions = (eventName) => {
    try {
      if (eventName) {
        validateEventName(eventName);
        if (subscriptions.has(eventName)) {
          subscriptions.delete(eventName);
        }
      } else {
        subscriptions.clear();
      }
    } catch (error) {
      const logger = getLogger();
      logger.handleError({
        error,
        message: `فشل في مسح الاشتراكات: ${eventName}`,
        origin: 'event-aggregator.clearSubscriptions',
        severity: 'error',
        context: { eventName }
      });
    }
  };

  /**
   * (للاستخدام في الاختبارات فقط)
   * @returns {Object<string, Function[]>}
   * @private
   */
  const _getSubscriptionsForTest = () => {
    const obj = {};
    for (const [key, value] of subscriptions.entries()) {
      obj[key] = value;
    }
    return obj;
  };

  return {
    subscribe,
    publish,
    clearSubscriptions,
    _getSubscriptionsForTest
  };
})();

export default eventAggregator;
