/**
 * @fileoverview وحدة إدارة الموارد مع وظائف تحميل وتخزين مؤقت للموارد المختلفة
 * @module resource-manager
 */

/**
 * وحدة إدارة الموارد مع وظائف تحميل وتخزين مؤقت للموارد المختلفة
 */
const resourceManager = {
  /**
   * تهيئة مُدير الموارد
   * @param {Object} options - خيارات التهيئة
   * @param {number} [options.maxCacheSize=100] - الحد الأقصى لعدد الموارد في الكاش
   * @param {number} [options.cacheTTL=3600000] - وقت بقاء الموارد في الكاش (بالملي ثانية)
   * @returns {void}
   */
  initialize(options = {}) {
    // تهيئة متغيرات الكاش
    this.cache = new Map(); // { url: { timestamp, data } }
    this.maxCacheSize = options.maxCacheSize || 100; // الحد الأقصى لعدد الموارد
    this.cacheTTL = options.cacheTTL || 3600000; // 1 ساعة افتراضيًا
    this.cacheCleanupInterval = setInterval(() => this._cleanupCache(), 300000); // كل 5 دقائق
  },

  /**
   * تحميل صورة
   * @param {string} url - رابط الصورة
   * @param {Object} [options={}] - خيارات التحميل
   * @param {import('./error-logger.js').default | Console} [options.errorLogger=console] - مسجل الأخطاء
   * @param {boolean} [options.useCORS=false] - استخدام CORS عند تحميل الصورة
   * @param {string} [options.crossOriginPolicy='anonymous'] - سياسة تحميل الصورة عبر الدومينات
   * @returns {Promise<HTMLImageElement>} وعـد بإرجاع عنصر الصورة بعد تحميله
   */
  loadImage(url, { 
    errorLogger = console,
    useCORS = false,
    crossOriginPolicy = 'anonymous'
  } = {}) {
    // التحقق من صحة الرابط
    if (!this._isValidUrl(url)) {
      return this._rejectWithInvalidUrlError('image', url, errorLogger);
    }

    // استخدام الكاش إذا كان متاحًا
    const cached = this._getCached(url);
    if (cached) {
      this._logDebug(errorLogger, `[ResourceManager] Returning cached image: ${url}`);
      return Promise.resolve(cached);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // تعيين سياسة CORS إذا لزم الأمر
      if (useCORS && this._isCrossOrigin(url)) {
        img.crossOrigin = crossOriginPolicy;
      }

      // معالجة تحميل الصورة
      img.onload = () => {
        this._addToCache(url, img);
        this._logDebug(errorLogger, `[ResourceManager] Image loaded and cached: ${url}`);
        resolve(img);
      };

      // معالجة الأخطاء
      img.onerror = (errorEvent) => {
        const error = new Error(`فشل تحميل الصورة من: ${url}`);
        this._handleError(errorLogger, error, 'resourceManager.loadImage', {
          url,
          errorEventDetails: String(errorEvent)
        });
        reject(error);
      };

      img.onabort = () => {
        const error = new Error(`تم إلغاء تحميل الصورة: ${url}`);
        this._handleWarning(errorLogger, error, 'resourceManager.loadImage', { url });
        reject(error);
      };

      // بدء تحميل الصورة
      img.src = url;
    });
  },

  /**
   * تحميل ملف JSON
   * @param {string} url - رابط ملف JSON
   * @param {Object} [options={}] - خيارات التحميل
   * @param {import('./error-logger.js').default | Console} [options.errorLogger=console] - مسجل الأخطاء
   * @param {Object} [options.headers={}] - الرؤوس المرسلة مع الطلب
   * @param {string} [options.cacheMode='default'] - وضع الكاش (default/no-cache/reload/no-store/cache-only/network-only)
   * @returns {Promise<Object>} وعـد بإرجاع البيانات JSON بعد تحليلها
   */
  async loadJSON(url, { 
    errorLogger = console,
    headers = {},
    cacheMode = 'default'
  } = {}) {
    // التحقق من صحة الرابط
    if (!this._isValidUrl(url)) {
      return this._rejectWithInvalidUrlError('JSON', url, errorLogger);
    }

    // استخدام الكاش إذا كان متاحًا
    const cached = this._getCached(url);
    if (cached) {
      this._logDebug(errorLogger, `[ResourceManager] Returning cached JSON: ${url}`);
      return Promise.resolve(cached);
    }

    try {
      // إعدادات الطلب
      const fetchOptions = {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          ...headers
        },
        cache: cacheMode
      };

      // تنفيذ الطلب
      const response = await fetch(url, fetchOptions);

      // التحقق من استجابة الطلب
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'تعذر الحصول على تفاصيل الخطأ');
        throw new Error(`خطأ HTTP! الحالة: ${response.status}. الرابط: ${url}. الاستجابة: ${errorText.substring(0, 200)}`);
      }

      // تحليل البيانات
      const jsonData = await response.json();
      
      // إضافة البيانات إلى الكاش
      this._addToCache(url, jsonData);
      
      // تسجيل التحميل
      this._logDebug(errorLogger, `[ResourceManager] تم تحميل وتخزين البيانات JSON: ${url}`);
      
      // إرجاع البيانات
      return jsonData;
    } catch (error) {
      this._handleError(errorLogger, error, 'resourceManager.loadJSON', { url });
      throw error instanceof Error ? error : new Error(String(error));
    }
  },

  /**
   * تحميل ملف صوتي
   * @param {string} url - رابط الملف الصوتي
   * @param {Object} [options={}] - خيارات التحميل
   * @param {import('./error-logger.js').default | Console} [options.errorLogger=console] - مسجل الأخطاء
   * @param {boolean} [options.preload=false] - ما إذا كان سيتم تحميل الملف فعليًا
   * @returns {Promise<string|ArrayBuffer>} وعـد بإرجاع الرابط أو الملف الصوتي
   */
  async loadAudio(url, { 
    errorLogger = console,
    preload = false
  } = {}) {
    // التحقق من صحة الرابط
    if (!this._isValidUrl(url)) {
      return this._rejectWithInvalidUrlError('audio', url, errorLogger);
    }

    // استخدام الكاش إذا كان متاحًا
    const cached = this._getCached(url);
    if (cached) {
      this._logDebug(errorLogger, `[ResourceManager] Returning cached audio: ${url}`);
      return Promise.resolve(cached);
    }

    if (!preload) {
      // إرجاع الرابط فقط دون تحميل فعلي
      this._logDebug(errorLogger, `[ResourceManager] Audio resource URL validated: ${url}`);
      return Promise.resolve(url);
    }

    // تحميل الملف الصوتي فعليًا
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} للصوت ${url}`);
      }
      
      const audioData = await response.arrayBuffer();
      this._addToCache(url, audioData);
      this._logDebug(errorLogger, `[ResourceManager] تم تحميل البيانات الصوتية وتخزينها: ${url}`);
      
      return audioData;
    } catch (error) {
      this._handleError(errorLogger, error, 'resourceManager.loadAudio', { url });
      throw error instanceof Error ? error : new Error(String(error));
    }
  },

  /**
   * تحميل فيديو
   * @param {string} url - رابط الفيديو
   * @param {Object} [options={}] - خيارات التحميل
   * @param {import('./error-logger.js').default | Console} [options.errorLogger=console] - مسجل الأخطاء
   * @param {boolean} [options.preload=false] - ما إذا كان سيتم تحميل الملف فعليًا
   * @returns {Promise<string|ArrayBuffer>} وعـد بإرجاع الرابط أو ملف الفيديو
   */
  async loadVideo(url, { 
    errorLogger = console,
    preload = false
  } = {}) {
    // التحقق من صحة الرابط
    if (!this._isValidUrl(url)) {
      return this._rejectWithInvalidUrlError('video', url, errorLogger);
    }

    // استخدام الكاش إذا كان متاحًا
    const cached = this._getCached(url);
    if (cached) {
      this._logDebug(errorLogger, `[ResourceManager] Returning cached video: ${url}`);
      return Promise.resolve(cached);
    }

    if (!preload) {
      // إرجاع الرابط فقط دون تحميل فعلي
      this._logDebug(errorLogger, `[ResourceManager] Video resource URL validated: ${url}`);
      return Promise.resolve(url);
    }

    // تحميل الفيديو فعليًا
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} للفيديو ${url}`);
      }
      
      const videoData = await response.blob();
      const blobURL = URL.createObjectURL(videoData);
      
      this._addToCache(url, blobURL);
      this._logDebug(errorLogger, `[ResourceManager] تم تحميل الفيديو وتخزينه: ${url}`);
      
      return blobURL;
    } catch (error) {
      this._handleError(errorLogger, error, 'resourceManager.loadVideo', { url });
      throw error instanceof Error ? error : new Error(String(error));
    }
  },

  /**
   * تحميل خط (Font)
   * @param {string} fontUrl - رابط الخط
   * @param {Object} [options={}] - خيارات التحميل
   * @param {import('./error-logger.js').default | Console} [options.errorLogger=console] - مسجل الأخطاء
   * @param {string} [options.format='woff2'] - صيغة الخط
   * @returns {Promise<string>} وعـد بإرجاع CSS لتحميل الخط
   */
  async loadFont(fontUrl, { 
    errorLogger = console,
    format = 'woff2'
  } = {}) {
    // التحقق من صحة الرابط
    if (!this._isValidUrl(fontUrl)) {
      return this._rejectWithInvalidUrlError('font', fontUrl, errorLogger);
    }

    // التحقق من أن الخط لم يتم تحميله من قبل
    const fontFamilyName = this._extractFontFamilyFromUrl(fontUrl);
    if (this._isFontLoaded(fontFamilyName)) {
      this._logDebug(errorLogger, `[ResourceManager] الخط بالفعل محمل: ${fontFamilyName}`);
      return Promise.resolve(fontFamilyName);
    }

    try {
      // إنشاء كائن FontFace
      const font = new FontFace(fontFamilyName, `url(${fontUrl})`, { weight: 'normal' });
      
      // تحميل الخط
      await font.load();
      
      // إضافة الخط إلى المستند
      document.fonts.add(font);
      document.body.style.fontFamily = `${fontFamilyName}, ${document.body.style.fontFamily}`;
      
      // إضافة الخط إلى الكاش
      this._addToCache(fontUrl, fontFamilyName);
      this._logInfo(errorLogger, `[ResourceManager] تم تحميل الخط: ${fontFamilyName}`);
      
      // إرجاع اسم الخط
      return fontFamilyName;
    } catch (error) {
      this._handleError(errorLogger, error, 'resourceManager.loadFont', { fontUrl });
      throw error instanceof Error ? error : new Error(String(error));
    }
  },

  /**
   * التحقق مما إذا كان الخط قد تم تحميله بالفعل
   * @param {string} fontFamily - اسم عائلة الخط
   * @returns {boolean} هل الخط محمل؟
   */
  _isFontLoaded(fontFamily) {
    if (typeof document === 'undefined' || !document.fonts) return false;
    
    let isLoaded = false;
    try {
      // إنشاء عنصر نصي لاختبار الخط
      const testElement = document.createElement('span');
      testElement.textContent = 'abcdefghijklmnopqrstuvwxyz';
      testElement.style.position = 'absolute';
      testElement.style.left = '-9999px';
      testElement.style.fontSize = '16px';
      testElement.style.fontFamily = fontFamily;
      
      document.body.appendChild(testElement);
      
      // قياس العرض لتحديد تحميل الخط
      const width = testElement.offsetWidth;
      document.body.removeChild(testElement);
      
      // إذا كان العرض غير محدد، فإن الخط لم يتم تحميله
      isLoaded = width !== undefined;
    } catch (error) {
      isLoaded = false;
    }
    
    return isLoaded;
  },

  /**
   * تحميل ملف
   * @param {string} url - رابط الملف
   * @param {Object} [options={}] - خيارات التحميل
   * @param {import('./error-logger.js').default | Console} [options.errorLogger=console] - مسجل الأخطاء
   * @param {string} [options.responseType='blob'] - نوع الاستجابة (blob/json/text/arraybuffer)
   * @returns {Promise<Blob|Object|string|ArrayBuffer>} وعـد بإرجاع الملف بعد تحميله
   */
  async loadFile(url, { 
    errorLogger = console,
    responseType = 'blob'
  } = {}) {
    // التحقق من صحة الرابط
    if (!this._isValidUrl(url)) {
      return this._rejectWithInvalidUrlError('file', url, errorLogger);
    }

    // استخدام الكاش إذا كان متاحًا
    const cached = this._getCached(url);
    if (cached) {
      this._logDebug(errorLogger, `[ResourceManager] إرجاع الملف من الكاش: ${url}`);
      return Promise.resolve(cached);
    }

    try {
      // تنفيذ الطلب
      const response = await fetch(url);
      
      // التحقق من استجابة الطلب
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'تعذر الحصول على تفاصيل الخطأ');
        throw new Error(`خطأ HTTP! الحالة: ${response.status}. الرابط: ${url}. الاستجابة: ${errorText.substring(0, 200)}`);
      }
      
      // معالجة البيانات حسب نوع الاستجابة
      let fileData;
      switch (responseType.toLowerCase()) {
        case 'json':
          fileData = await response.json();
          break;
        case 'text':
          fileData = await response.text();
          break;
        case 'arraybuffer':
          fileData = await response.arrayBuffer();
          break;
        case 'blob':
        default:
          fileData = await response.blob();
          break;
      }
      
      // إضافة الملف إلى الكاش
      this._addToCache(url, fileData);
      this._logDebug(errorLogger, `[ResourceManager] تم تحميل الملف وتخزينه: ${url}`);
      
      // إرجاع الملف
      return fileData;
    } catch (error) {
      this._handleError(errorLogger, error, 'resourceManager.loadFile', { url });
      throw error instanceof Error ? error : new Error(String(error));
    }
  },

  /**
   * الحصول على مورد من الكاش
   * @param {string} url - الرابط
   * @returns {any|undefined} المورد من الكاش أو undefined إذا لم يكن موجودًا
   */
  getCachedResource(url) {
    return this._getCached(url);
  },

  /**
   * مسح مورد من الكاش
   * @param {string} url - الرابط
   */
  clearCachedResource(url) {
    this._removeFromCache(url);
  },

  /**
   * مسح جميع الموارد من الكاش
   */
  clearAllCache() {
    this._clearAllCache();
  },

  /**
   * إغلاق مُدير الموارد وإزالة المهام المجدولة
   */
  dispose() {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }
    this.cache = null;
  },

  /**
   * التحقق من صحة الرابط
   * @param {string} url - الرابط للتحقق منه
   * @returns {boolean} هل الرابط صحيح؟
   * @private
   */
  _isValidUrl(url) {
    try {
      new URL(url, window.location.href);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * التحقق مما إذا كان الرابط عبر الدومينات
   * @param {string} url - الرابط للتحقق منه
   * @returns {boolean} هل الرابط عبر الدومينات؟
   * @private
   */
  _isCrossOrigin(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.origin !== window.location.origin;
    } catch (e) {
      // إذا كان الرابط نسبيًا، فهو ليس عبر الدومينات
      return false;
    }
  },

  /**
   * استخراج اسم عائلة الخط من الرابط
   * @param {string} url - الرابط
   * @returns {string} اسم عائلة الخط
   * @private
   */
  _extractFontFamilyFromUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const fileName = pathParts[pathParts.length - 1].split('.')[0];
      return fileName.replace(/[-_]/g, ' ');
    } catch (e) {
      return 'CustomFont';
    }
  },

  /**
   * إضافة مورد إلى الكاش
   * @param {string} url - الرابط
   * @param {any} data - البيانات للتخزين
   * @private
   */
  _addToCache(url, data) {
    if (!this.cache) {
      this.cache = new Map();
    }

    // إضافة الوقت الحالي لفحص TTL لاحقًا
    this.cache.set(url, { 
      timestamp: Date.now(), 
      data 
    });

    // تنظيف الكاش إذا تجاوز الحد الأقصى
    if (this.cache.size > this.maxCacheSize) {
      this._evictFromCache();
    }
  },

  /**
   * إزالة مورد من الكاش
   * @param {string} url - الرابط
   * @private
   */
  _removeFromCache(url) {
    if (this.cache && this.cache.has(url)) {
      const cached = this.cache.get(url);
      if (cached && cached.data && cached.data instanceof Blob) {
        URL.revokeObjectURL(cached.data);
      }
      this.cache.delete(url);
    }
  },

  /**
   * إزالة جميع الموارد من الكاش
   * @private
   */
  _clearAllCache() {
    if (!this.cache) return;
    
    // إلغاء إشارات ObjectURL
    for (const [url, cached] of this.cache.entries()) {
      if (cached && cached.data && cached.data instanceof Blob) {
        URL.revokeObjectURL(cached.data);
      }
    }
    
    this.cache.clear();
  },

  /**
   * إزالة أقدم مورد من الكاش عندما يتجاوز الحد الأقصى
   * @private
   */
  _evictFromCache() {
    if (!this.cache || this.cache.size <= 0) return;

    // البحث عن أقدم مورد
    let oldest = { url: null, timestamp: Date.now() };
    
    for (const [url, entry] of this.cache.entries()) {
      if (entry.timestamp < oldest.timestamp) {
        oldest = { url, timestamp: entry.timestamp };
      }
    }

    // إزالة أقدم مورد
    if (oldest.url) {
      this._removeFromCache(oldest.url);
    }
  },

  /**
   * تنظيف الكاش من الموارد القديمة
   * @private
   */
  _cleanupCache() {
    if (!this.cache) return;
    
    const now = Date.now();
    const expiredUrls = [];

    // تحديد الموارد القديمة
    for (const [url, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheTTL) {
        expiredUrls.push(url);
      }
    }

    // إزالة الموارد القديمة
    for (const url of expiredUrls) {
      this._removeFromCache(url);
    }
  },

  /**
   * الحصول على مورد من الكاش مع التحقق من صلاحيته
   * @param {string} url - الرابط
   * @returns {any|undefined} المورد من الكاش أو undefined إذا لم يكن موجودًا أو كان منتهي الصلاحية
   * @private
   */
  _getCached(url) {
    if (!this.cache || !this.cache.has(url)) {
      return undefined;
    }

    const entry = this.cache.get(url);
    
    // التحقق من سريان المورد
    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this._removeFromCache(url);
      return undefined;
    }

    return entry.data;
  },

  /**
   * إنشاء وتسجيل خطأ لرابط غير صالح
   * @param {Object} errorLogger - مسجل الأخطاء
   * @param {string} resourceType - نوع المورد
   * @param {string} url - الرابط
   * @returns {Promise<Error>} وعـد بإرجاع الخطأ
   * @private
   */
  _rejectWithInvalidUrlError(resourceType, url, errorLogger) {
    const errMsg = `رابط غير صالح لـ ${resourceType}: ${url}`;
    this._handleWarning(errorLogger, new Error(errMsg), 'resourceManager._rejectWithInvalidUrlError', { url });
    return Promise.reject(new Error(errMsg));
  },

  /**
   * معالجة الخطأ
   * @param {Object} logger - مسجل الأخطاء
   * @param {Error} error - كائن الخطأ
   * @param {string} origin - مصدر الخطأ
   * @param {Object} context - السياق
   * @private
   */
  _handleError(logger, error, origin, context) {
    const finalError = error instanceof Error ? error : new Error(String(error));
    const message = finalError.message;
    
    if (typeof logger.handleError === 'function') {
      logger.handleError({
        error: finalError,
        message,
        origin,
        severity: 'error',
        context
      });
    } else if (typeof logger.error === 'function') {
      logger.error({
        error: finalError,
        message,
        origin,
        context
      });
    } else {
      console.error(`[ERROR] ${origin}: ${message}`, context);
    }
  },

  /**
   * تسجيل تحذير
   * @param {Object} logger - مسجل الأخطاء
   * @param {Error} error - كائن الخطأ
   * @param {string} origin - مصدر الخطأ
   * @param {Object} context - السياق
   * @private
   */
  _handleWarning(logger, error, origin, context) {
    const finalError = error instanceof Error ? error : new Error(String(error));
    const message = finalError.message;
    
    if (typeof logger.logWarning === 'function') {
      logger.logWarning({
        error: finalError,
        message,
        origin,
        context
      });
    } else if (typeof logger.warn === 'function') {
      logger.warn({
        error: finalError,
        message,
        origin,
        context
      });
    } else {
      console.warn(`[WARNING] ${origin}: ${message}`, context);
    }
  },

  /**
   * تسجيل رسالة تفصيلية
   * @param {Object} logger - مسجل الأخطاء
   * @param {string} message - الرسالة
   * @private
   */
  _logDebug(logger, message) {
    if (typeof logger.debug === 'function') {
      logger.debug(message);
    } else if (typeof logger.log === 'function') {
      logger.log(message);
    }
  },

  /**
   * تسجيل معلومات
   * @param {Object} logger - مسجل الأخطاء
   * @param {string} message - الرسالة
   * @private
   */
  _logInfo(logger, message) {
    if (typeof logger.info === 'function') {
      logger.info(message);
    } else if (typeof logger.log === 'function') {
      logger.log(message);
    }
  }
};

// تهيئة مُدير الموارد
resourceManager.initialize();

// تصدير الوحدة
export default resourceManager;
