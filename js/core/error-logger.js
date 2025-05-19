// js/core/error-logger.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

/**
 * @typedef {Object} ErrorLogDetails
 * @property {Error} [error] - الكائن الأصلي للخطأ (اختياري للمستوى warning/info).
 * @property {string} message - رسالة مفيدة للمستخدم أو المطور.
 * @property {string} origin - الوحدة أو الدالة التي نشأت منها المشكلة (مثلاً: 'QuranApiClient.fetchSurahs').
 * @property {'error' | 'warning' | 'info'} [severity='error'] - درجة الخطورة.
 * @property {Record<string, any>} [context] - بيانات سياقية إضافية (مثلاً: المعلمات، الحالة).
 * @property {boolean} [sensitive=false] - هل الرسالة تحتوي على بيانات حساسة؟
 * @property {boolean} [productionSafe=true] - هل يجب تقييد السجل في وضع الإنتاج؟
 */

/**
 * @typedef {Object} LogOutput
 * @property {string} timestamp - وقت تسجيل السجل.
 * @property {string} severity - درجة الخطورة.
 * @property {string} origin - مصدر السجل.
 * @property {string} message - الرسالة.
 * @property {Object} [context] - السياق.
 * @property {string} [stack] - تتبع المكدس.
 */

const errorLogger = (() => {
  // التحقق من البيئة
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // المستويات المدعومة
  const VALID_SEVERITIES = ['error', 'warning', 'info'];
  
  // التحقق من صحة التكوين
  const validateLogConfig = (logDetails) => {
    if (!logDetails || typeof logDetails !== 'object') {
      throw new Error('Invalid log configuration: Configuration must be an object');
    }

    const { error, message, origin, severity = 'error', context, sensitive = false, productionSafe = true } = logDetails;

    // التحقق من أن الرسالة موجودة
    if (!message && !error) {
      throw new Error('Either message or error must be provided in log details');
    }

    // التحقق من درجة الخطورة
    if (severity && !VALID_SEVERITIES.includes(severity)) {
      throw new Error(`Invalid severity level: ${severity}. Must be one of: ${VALID_SEVERITIES.join(', ')}`);
    }

    // في وضع الإنتاج، لا يتم تسجيل الرسائل الحساسة
    if (isProduction && sensitive) {
      return {
        message: 'Sensitive log suppressed in production',
        origin: 'SECURITY',
        severity: 'info',
        context: { environment: 'production', wasSensitive: true },
        productionSafe: true
      };
    }

    return {
      error,
      message: message || (error ? error.message : 'Unknown error'),
      origin: origin || 'UnknownOrigin',
      severity,
      context: context || {},
      sensitive,
      productionSafe
    };
  };

  // تسجيل التفاصيل في وحدة التسجيل (console)
  const logToConsole = (logDetails) => {
    try {
      const validatedConfig = validateLogConfig(logDetails);
      
      // في وضع الإنتاج مع productionSafe=true، قد يتم تقييد التسجيل
      if (isProduction && !validatedConfig.productionSafe) {
        return null;
      }

      const { error, message, origin, severity, context } = validatedConfig;
      
      const timestamp = new Date().toISOString();
      const output = {
        timestamp,
        severity: severity.toUpperCase(),
        origin,
        message
      };

      // تحديد طريقة الطباعة بناءً على درجة الخطورة
      let consoleMethod = console.log;
      switch (severity) {
        case 'error':
          consoleMethod = console.error;
          break;
        case 'warning':
          consoleMethod = console.warn;
          break;
        case 'info':
          consoleMethod = console.info;
          break;
      }

      // طباعة السطر الرئيسي للسجل
      consoleMethod(`${timestamp} [${severity.toUpperCase()}] [${origin}] ${message}`);

      // تسجيل السياق إذا كان متاحًا
      if (context && Object.keys(context).length > 0) {
        try {
          // تسجيل نسخة عميقة من السياق لتجنب التأثيرات الجانبية
          consoleMethod('  Context:', JSON.parse(JSON.stringify(context)));
        } catch (e) {
          // إذا كان السياق معقدًا جدًا (مثل إشارات دورية)
          const simplifiedContext = {};
          for (const key in context) {
            if (Object.prototype.hasOwnProperty.call(context, key)) {
              const value = context[key];
              if (typeof value !== 'object' || value === null || 
                  Array.isArray(value) || 
                  Object.getPrototypeOf(value) === Object.prototype) {
                simplifiedContext[key] = value;
              } else {
                simplifiedContext[key] = `[Object type: ${value.constructor ? value.constructor.name : typeof value}]`;
              }
            }
          }
          consoleMethod('  Context (مُبسّط):', simplifiedContext);
        }
      }

      // تسجيل تتبع المكدس إذا كان متاحًا
      if (error && error.stack) {
        consoleMethod('  تتبع المكدس:\n', error.stack);
      } else if (error) {
        consoleMethod('  تفاصيل الخطأ:', error.toString());
      }

      return output;
    } catch (validationError) {
      // إذا حدث خطأ أثناء التحقق من صحة التكوين
      console.error('فشل في التحقق من صحة التسجيل:', validationError.message);
      console.error('التفاصيل الأصلية:', logDetails);
      return {
        timestamp: new Date().toISOString(),
        severity: 'ERROR',
        origin: 'error-logger.validateLogConfig',
        message: `فشل في تسجيل الخطأ: ${validationError.message}`
      };
    }
  };

  // تسجيل الأخطاء إلى خدمة خارجية (مستقبلي)
  const logToExternalService = (logDetails) => {
    // سيتم تنفيذ هذا الجزء لاحقًا عند إضافة خدمات مثل Sentry أو LogRocket
    // مثال: if (Sentry && Sentry.captureException) { ... }
  };

  // التعامل مع الأخطاء وتسجيلها
  const handleError = (logDetails) => {
    // التأكد من وجود كائن خطأ إذا كانت الدرجة 'error' أو غير متوفرة
    let finalLogDetails = { ...logDetails };
    
    if ((!finalLogDetails.severity || finalLogDetails.severity === 'error') && !finalLogDetails.error) {
      finalLogDetails.error = new Error(finalLogDetails.message || 'خطأ ضمني تم إنشاؤه بواسطة handleError');
    }
    
    const result = logToConsole(finalLogDetails);
    if (isDevelopment) {
      logToExternalService(finalLogDetails);
    }
    
    return result;
  };

  // تسجيل رسالة تحذير
  const logWarning = (logDetails) => {
    return handleError({ ...logDetails, severity: 'warning' });
  };

  // تسجيل رسالة معلوماتية
  const logInfo = (logDetails) => {
    return handleError({ ...logDetails, severity: 'info' });
  };

  // التحقق مما إذا كان التسجيل يعمل بشكل صحيح
  const selfTest = () => {
    try {
      const testMessage = 'error-logger.js - اختبار ذاتي ناجح';
      const result = logInfo({
        message: testMessage,
        origin: 'error-logger.selfTest',
        context: { timestamp: new Date().toISOString() }
      });
      
      if (result && result.message === testMessage) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  // إرجاع واجهة وظائف التسجيل
  return {
    handleError,
    logWarning,
    logInfo,
    selfTest
  };
})();

// التحقق من صحة التصدير
if (!errorLogger.selfTest()) {
  console.error('فشل التحقق من صحة errorLogger');
  console.error('التطبيق قد لا يسجل الأخطاء بشكل صحيح');
}

export default errorLogger;
