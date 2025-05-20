// js/services/speech.recognition.wrapper.js

/**
 * @typedef {Object} SpeechRecognitionError
 * @property {'no-speech'|'audio-capture'|'network'|'not-allowed'|'bad-grammar'|'language-not-supported'} errorType - نوع الخطأ
 * @property {string} errorMessage - رسالة الخطأ
 * @property {Object} [context] - سياق الخطأ
 */

/**
 * @typedef {Object} SpeechRecognitionResult
 * @property {string} transcript - نص التعرف
 * @property {boolean} isFinal - هل هو نص نهائي أم غيره
 * @property {number} confidence - ثقة النتيجة (0-1)
 * @property {number} timestamp - وقت النتيجة
 */

/**
 * @typedef {Object} SpeechRecognitionCallbacks
 * @property {function(SpeechRecognitionResult): void} [onResult] - يتم استدعاؤها عند الحصول على نتائج
 * @property {function(SpeechRecognitionError): void} [onError] - يتم استدعاؤها عند حدوث خطأ
 * @property {function(): void} [onStart] - يتم استدعاؤها عند بدء التعرف
 * @property {function(): void} [onEnd] - يتم استدعاؤها عند انتهاء التعرف
 * @property {function(): void} [onNoMatch] - يتم استدعاؤها عندما يتم الكشف عن صوت ولكن لم يتم التعرف عليه
 * @property {function(): void} [onSpeechStart] - يتم استدعاؤها عند بدء الكلام
 * @property {function(): void} [onSpeechEnd] - يتم استدعاؤها عند انتهاء الكلام
 */

/**
 * @typedef {Object} SpeechRecognitionOptions
 * @property {string} [language='ar-SA'] - لغة التعرف على الصوت
 * @property {boolean} [continuous=true] - هل التعرف مستمر أم لمرة واحدة فقط
 * @property {boolean} [interimResults=true] - هل يتم إرجاع النتائج المؤقتة
 * @property {number} [maxAlternatives=3] - عدد البدائل القصوى
 * @property {string} [grammar] - قواعد نطق إضافية (إن وجدت)
 */

const speechRecognitionWrapper = (() => {
  // محاولة الحصول على كائن التعرف على الصوت حسب البادئة الخاصة بالمتصفح
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  // المتغيرات الداخلية
  let recognitionInstance = null;
  let isRecognizing = false;
  let currentLanguage = 'ar-SA'; // اللغة الافتراضية
  let continuousMode = true; // الوضع المستمر
  let interimResultsEnabled = true; // النتائج المؤقتة
  let maxAlternatives = 3; // الحد الأقصى للبدائل
  
  // الدوال المسؤولة عن المعالجة
  let onResultCallback = (transcript, isFinal, confidence) => {};
  let onErrorCallback = (errorType, errorMessage, context) => {};
  let onStartCallback = () => {};
  let onEndCallback = () => {};
  let onNoMatchCallback = () => {};
  let onSpeechStartCallback = () => {};
  let onSpeechEndCallback = () => {};
  
  /**
   * التحقق من دعم ميزة التعرف على الصوت من قبل المتصفح
   * @returns {boolean} true إذا كانت الميزة مدعومة
   */
  function isSupported() {
    return !!SpeechRecognition;
  }
  
  /**
   * التحقق من حالة التعرف
   * @returns {boolean} true إذا كان التعرف نشطًا
   */
  function isCurrentlyRecognizing() {
    return isRecognizing;
  }
  
  /**
   * الحصول على اللغة الحالية للتعرف
   * @returns {string} رمز اللغة
   */
  function getCurrentLanguage() {
    return currentLanguage;
  }
  
  /**
   * التحقق من صحة رمز اللغة
   * @param {string} lang - رمز اللغة
   * @returns {boolean} true إذا كان رمز اللغة صحيحًا
   */
  function validateLanguageCode(lang) {
    // نمط التحقق من رمز اللغة (مثال: ar-SA، en-US)
    const langRegex = /^[a-z]{2}-[A-Z]{2}$/;
    return langRegex.test(lang);
  }
  
  /**
   * الحصول على قائمة اللغات المدعومة
   * @returns {Array<string>} قائمة اللغات المدعومة
   */
  function getSupportedLanguages() {
    if (!isSupported()) return [];
    
    try {
      // بعض المتصفحات توفر هذه الخاصية
      if (typeof window.SpeechRecognition === 'function' && 
          typeof window.SpeechRecognition.getSupportedLanguages === 'function') {
        return window.SpeechRecognition.getSupportedLanguages();
      }
      
      // اللغات الافتراضية الشائعة
      return ['ar-SA', 'en-US', 'ur-PK', 'fr-FR', 'es-ES', 'de-DE'];
    } catch (e) {
      console.warn('[SpeechRecognition] لا يمكن الحصول على قائمة اللغات المدعومة:', e);
      return ['ar-SA', 'en-US'];
    }
  }
  
  /**
   * تهيئة محرك التعرف على الصوت
   * @param {SpeechRecognitionOptions} options - خيارات التعرف
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {boolean} true إذا تمت التهيئة بنجاح
   */
  function initialize(options = {}, errorLogger = console) {
    if (!isSupported()) {
      const error = new Error('Web Speech API غير مدعوم في هذا المتصفح.');
      this._logWarning(errorLogger, error.message, 'SpeechRecognitionWrapper.initialize');
      return false;
    }
    
    try {
      // إنشاء مثيل جديد فقط إذا لم يكن موجودًا أو تغيرت اللغة
      if (!recognitionInstance || options.language !== currentLanguage) {
        recognitionInstance = new SpeechRecognition();
        currentLanguage = options.language || currentLanguage;
      }
      
      // تعيين الخيارات
      recognitionInstance.lang = currentLanguage;
      recognitionInstance.continuous = options.continuous !== undefined ? options.continuous : continuousMode;
      recognitionInstance.interimResults = options.interimResults !== undefined ? options.interimResults : interimResultsEnabled;
      recognitionInstance.maxAlternatives = options.maxAlternatives || maxAlternatives;
      
      // تعيين القواعد (إن وجدت)
      if (options.grammar) {
        if ('SpeechGrammarList' in window) {
          const grammarList = new window.SpeechGrammarList();
          grammarList.addFromUri(options.grammar, 1);
          recognitionInstance.grammars = grammarList;
        } else {
          console.warn('[SpeechRecognition] SpeechGrammarList غير مدعوم في هذا المتصفح.');
        }
      }
      
      // معالجات الأحداث
      recognitionInstance.onresult = handleResult;
      recognitionInstance.onerror = handleError;
      recognitionInstance.onstart = handleStart;
      recognitionInstance.onend = handleEnd;
      recognitionInstance.onnomatch = handleNoMatch;
      
      // معالجات الأحداث الاختيارية
      if ('onspeechstart' in recognitionInstance) {
        recognitionInstance.onspeechstart = handleSpeechStart;
      }
      
      if ('onspeechend' in recognitionInstance) {
        recognitionInstance.onspeechend = handleSpeechEnd;
      }
      
      return true;
    } catch (error) {
      this._logError(errorLogger, error, 'فشل في تهيئة محرك التعرف على الصوت', {
        options
      });
      recognitionInstance = null;
      return false;
    }
  }
  
  /**
   * معالجة نتائج التعرف
   * @param {Event} event - حدث النتائج
   */
  function handleResult(event) {
    const results = [];
    
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const transcript = event.results[i][0].transcript.trim();
      const confidence = event.results[i][0].confidence;
      
      if (transcript) {
        results.push({
          transcript,
          isFinal: event.results[i].isFinal,
          confidence
        });
      }
    }
    
    if (results.length > 0) {
      // معالجة كل النتائج
      results.forEach(result => {
        if (onResultCallback && typeof onResultCallback === 'function') {
          onResultCallback(result.transcript, result.isFinal, result.confidence);
        }
      });
    }
  }
  
  /**
   * معالجة الأخطاء
   * @param {Event} event - حدث الخطأ
   */
  function handleError(event) {
    isRecognizing = false;
    let errorType = 'unknown';
    let errorMessage = 'حدث خطأ أثناء التعرف على الصوت.';
    let context = { errorEvent: event.error, messageFromEvent: event.message };
    
    switch (event.error) {
      case 'no-speech':
        errorType = 'no-speech';
        errorMessage = 'لم يتم الكشف عن أي كلام.';
        break;
      case 'audio-capture':
        errorType = 'audio-capture';
        errorMessage = 'فشل في التقاط الصوت. هل هناك مشكلة في الميكروفون؟';
        break;
      case 'not-allowed':
        errorType = 'not-allowed';
        errorMessage = 'تم رفض الأذن باستخدام الميكروفون أو لم يتم منحه.';
        break;
      case 'network':
        errorType = 'network';
        errorMessage = 'حدث خطأ شبكي أثناء التعرف على الصوت.';
        break;
      case 'bad-grammar':
        errorType = 'bad-grammar';
        errorMessage = 'حدث خطأ في قواعد النطق.';
        break;
      case 'language-not-supported':
        errorType = 'language-not-supported';
        errorMessage = 'اللغة غير مدعومة في هذا المتصفح.';
        break;
    }
    
    this._logError(console, new Error(errorMessage), `خطأ في التعرف على الصوت (${errorType})`, context);
    
    if (onErrorCallback && typeof onErrorCallback === 'function') {
      onErrorCallback(errorType, errorMessage, context);
    }
    
    if (onEndCallback && typeof onEndCallback === 'function') {
      onEndCallback();
    }
  }
  
  /**
   * معالجة بدء التعرف
   */
  function handleStart() {
    isRecognizing = true;
    if (onStartCallback && typeof onStartCallback === 'function') {
      onStartCallback();
    }
  }
  
  /**
   * معالجة انتهاء التعرف
   */
  function handleEnd() {
    isRecognizing = false;
    if (onEndCallback && typeof onEndCallback === 'function') {
      onEndCallback();
    }
  }
  
  /**
   * معالجة عدم التعرف على الصوت
   */
  function handleNoMatch() {
    if (onNoMatchCallback && typeof onNoMatchCallback === 'function') {
      onNoMatchCallback();
    }
  }
  
  /**
   * معالجة بدء الكلام
   */
  function handleSpeechStart() {
    if (onSpeechStartCallback && typeof onSpeechStartCallback === 'function') {
      onSpeechStartCallback();
    }
  }
  
  /**
   * معالجة انتهاء الكلام
   */
  function handleSpeechEnd() {
    if (onSpeechEndCallback && typeof onSpeechEndCallback === 'function') {
      onSpeechEndCallback();
    }
  }
  
  /**
   * بدء عملية التعرف على الصوت
   * @param {SpeechRecognitionOptions} options - خيارات التعرف
   * @param {SpeechRecognitionCallbacks} [callbacks] - معالجات الأحداث
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function start(options = {}, callbacks = {}, errorLogger = console) {
    if (!isSupported()) {
      const error = new Error('التعرف على الصوت غير مدعوم في هذا المتصفح.');
      this._logWarning(errorLogger, error.message, 'SpeechRecognitionWrapper.start');
      return false;
    }
    
    if (isRecognizing) {
      const error = new Error('البرنامج قيد التشغيل بالفعل. يرجى إيقافه أولًا.');
      this._logWarning(errorLogger, error.message, 'SpeechRecognitionWrapper.start');
      return false;
    }
    
    // تحديث المعالجات إن وجدت
    if (callbacks.onResult) onResultCallback = callbacks.onResult;
    if (callbacks.onError) onErrorCallback = callbacks.onError;
    if (callbacks.onStart) onStartCallback = callbacks.onStart;
    if (callbacks.onEnd) onEndCallback = callbacks.onEnd;
    if (callbacks.onNoMatch) onNoMatchCallback = callbacks.onNoMatch;
    if (callbacks.onSpeechStart) onSpeechStartCallback = callbacks.onSpeechStart;
    if (callbacks.onSpeechEnd) onSpeechEndCallback = callbacks.onSpeechEnd;
    
    // تهيئة المحرك إن لم يكن قد تم تهيئته
    if (!recognitionInstance || recognitionInstance.lang !== options.language) {
      if (!initialize(options, errorLogger)) {
        onErrorCallback('init-failed', 'فشل في تهيئة محرك التعرف على الصوت.');
        return false;
      }
    }
    
    try {
      recognitionInstance.start();
      return true;
    } catch (error) {
      this._logError(errorLogger, error, 'فشل في بدء التعرف على الصوت.', {
        options, callbacks
      });
      
      onErrorCallback('start-failed', error.message, { error });
      return false;
    }
  }
  
  /**
   * إيقاف عملية التعرف
   */
  function stop() {
    if (isRecognizing && recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (error) {
        console.error('[SpeechRecognitionWrapper] خطأ في إيقاف التعرف:', error);
        isRecognizing = false;
        if (onEndCallback && typeof onEndCallback === 'function') {
          onEndCallback();
        }
      }
    }
  }
  
  /**
   * إلغاء عملية التعرف فورًا
   */
  function abort() {
    if (isRecognizing && recognitionInstance) {
      try {
        recognitionInstance.abort();
      } catch (error) {
        console.error('[SpeechRecognitionWrapper] خطأ في إلغاء التعرف:', error);
        isRecognizing = false;
        if (onEndCallback && typeof onEndCallback === 'function') {
          onEndCallback();
        }
      }
    }
  }
  
  /**
   * تعيين المعالجات الافتراضية
   * @param {SpeechRecognitionCallbacks} callbacks - المعالجات الجديدة
   */
  function setDefaultCallbacks(callbacks) {
    if (callbacks.onResult) onResultCallback = callbacks.onResult;
    if (callbacks.onError) onErrorCallback = callbacks.onError;
    if (callbacks.onStart) onStartCallback = callbacks.onStart;
    if (callbacks.onEnd) onEndCallback = callbacks.onEnd;
    if (callbacks.onNoMatch) onNoMatchCallback = callbacks.onNoMatch;
    if (callbacks.onSpeechStart) onSpeechStartCallback = callbacks.onSpeechStart;
    if (callbacks.onSpeechEnd) onSpeechEndCallback = callbacks.onSpeechEnd;
  }
  
  /**
   * تعيين وضع التعرف المستمر
   * @param {boolean} enabled - تمكين أو تعطيل الوضع
   */
  function setContinuousMode(enabled) {
    continuousMode = Boolean(enabled);
    if (recognitionInstance) {
      recognitionInstance.continuous = continuousMode;
    }
  }
  
  /**
   * تعيين ترجمة النصوص المؤقتة
   * @param {boolean} enabled - تمكين أو تعطيل النتائج المؤقتة
   */
  function setInterimResults(enabled) {
    interimResultsEnabled = Boolean(enabled);
    if (recognitionInstance) {
      recognitionInstance.interimResults = interimResultsEnabled;
    }
  }
  
  /**
   * تعيين عدد البدائل القصوى
   * @param {number} count - عدد البدائل
   */
  function setMaxAlternatives(count) {
    maxAlternatives = Math.max(1, Math.min(5, Number(count)));
    if (recognitionInstance) {
      recognitionInstance.maxAlternatives = maxAlternatives;
    }
  }
  
  /**
   * تهيئة محرك التعرف
   * @param {SpeechRecognitionOptions} options - خيارات التعرف
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {boolean} true إذا تمت التهيئة بنجاح
   */
  function initialize(options = {}, errorLogger = console) {
    if (!isSupported()) {
      const error = new Error('Web Speech API غير مدعوم في هذا المتصفح.');
      this._logWarning(errorLogger, error.message, 'SpeechRecognitionWrapper.initialize');
      return false;
    }
    
    if (recognitionInstance && recognitionInstance.lang === options.language) {
      // تحديث الإعدادات إن لزم الأمر
      if (options.continuous !== undefined && recognitionInstance.continuous !== options.continuous) {
        recognitionInstance.continuous = options.continuous;
      }
      
      if (options.interimResults !== undefined && recognitionInstance.interimResults !== options.interimResults) {
        recognitionInstance.interimResults = options.interimResults;
      }
      
      if (options.maxAlternatives && recognitionInstance.maxAlternatives !== options.maxAlternatives) {
        recognitionInstance.maxAlternatives = options.maxAlternatives;
      }
      
      return true;
    }
    
    try {
      recognitionInstance = new SpeechRecognition();
      recognitionInstance.lang = options.language || currentLanguage;
      recognitionInstance.continuous = options.continuous !== undefined ? options.continuous : continuousMode;
      recognitionInstance.interimResults = options.interimResults !== undefined ? options.interimResults : interimResultsEnabled;
      recognitionInstance.maxAlternatives = options.maxAlternatives || maxAlternatives;
      
      // تعيين القواعد (إن وجدت)
      if (options.grammar) {
        if ('SpeechGrammarList' in window) {
          const grammarList = new window.SpeechGrammarList();
          grammarList.addFromUri(options.grammar, 1);
          recognitionInstance.grammars = grammarList;
        } else {
          console.warn('[SpeechRecognition] SpeechGrammarList غير مدعوم في هذا المتصفح.');
        }
      }
      
      // معالجات الأحداث
      recognitionInstance.onresult = handleResult;
      recognitionInstance.onerror = handleError;
      recognitionInstance.onstart = handleStart;
      recognitionInstance.onend = handleEnd;
      recognitionInstance.onnomatch = handleNoMatch;
      
      // معالجات الأحداث الاختيارية
      if ('onspeechstart' in recognitionInstance) {
        recognitionInstance.onspeechstart = handleSpeechStart;
      }
      
      if ('onspeechend' in recognitionInstance) {
        recognitionInstance.onspeechend = handleSpeechEnd;
      }
      
      return true;
    } catch (error) {
      this._logError(errorLogger, error, 'فشل في تهيئة محرك التعرف على الصوت', {
        options
      });
      recognitionInstance = null;
      return false;
    }
  }
  
  /**
   * تسجيل الخطأ
   * @param {Object} logger - مسجل الأخطاء
   * @param {Error} error - كائن الخطأ
   * @param {string} message - رسالة الخطأ
   * @param {Object} [context] - سياق الخطأ
   */
  function _logError(logger, error, message, context) {
    if (logger.handleError) {
      logger.handleError(error, message, 'SpeechRecognitionWrapper', context);
    } else if (logger.error) {
      logger.error(message, error, context);
    } else {
      console.error(message, error, context);
    }
  }
  
  /**
   * تسجيل التحذير
   * @param {Object} logger - مسجل الأخطاء
   * @param {string} message - رسالة التحذير
   * @param {string} origin - مصدر التحذير
   */
  function _logWarning(logger, message, origin) {
    if (logger.logWarning) {
      logger.logWarning({ message, origin });
    } else if (logger.warn) {
      logger.warn(message);
    } else {
      console.warn(message);
    }
  }
  
  return {
    isSupported,
    isCurrentlyRecognizing,
    getCurrentLanguage,
    getSupportedLanguages,
    start,
    stop,
    abort,
    setDefaultCallbacks,
    setContinuousMode,
    setInterimResults,
    setMaxAlternatives,
    initialize,
    _logError,
    _logWarning
  };
})();

/**
 * تهيئة العميل الخاص بالتعرف على الصوت
 * @param {Object} [dependencies] - التبعيات الاختيارية
 */
export function initializeSpeechRecognitionService(dependencies = {}) {
  const { errorLogger } = dependencies;
  
  try {
    console.info('[SpeechRecognitionWrapper] تم تهيئته بنجاح');
    
    // جعل الوظائف متاحة عالميًا لتسهيل التصحيح
    if (typeof window !== 'undefined' && 
        (typeof process === 'undefined' || process.env.NODE_ENV === 'development')) {
      window.speechRecognition = {
        ...speechRecognitionWrapper
      };
    }
    
    return {
      ...speechRecognitionWrapper
    };
  } catch (error) {
    if (errorLogger) {
      errorLogger.logError(error, 'فشل في تهيئة SpeechRecognitionWrapper');
    } else {
      console.error('[SpeechRecognitionWrapper] فشل في التهيئة:', error);
    }
    
    return {};
  }
}

export default speechRecognitionWrapper;
