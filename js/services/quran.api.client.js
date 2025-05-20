// js/services/quran.api.client.js

/**
 * @typedef {Object} QuranSurah
 * @property {number} number - رقم السورة (1-114)
 * @property {string} name - اسم السورة بالعربية
 * @property {string} englishName - اسم السورة بالإنجليزية
 * @property {string} englishNameTranslation - ترجمة اسم السورة
 * @property {string} revelationType - نوع السورة (مكية أو مدنية)
 * @property {number} numberOfAyahs - عدد آيات السورة
 * @property {Array<QuranAyah>} [ayahs] - آيات السورة (اختياري)
 */

/**
 * @typedef {Object} QuranAyah
 * @property {number} number - الرقم العالمي للآية (1-6236)
 * @property {number} numberInSurah - الرقم داخل السورة
 * @property {string} text - نص الآية
 * @property {number} juz - الجزء
 * @property {number} manzil - المنزل
 * @property {number} page - الصفحة
 * @property {number} ruku - الركوع
 * @property {number} hizbQuarter - الربع
 * @property {boolean} sajda - هل تحتوي الآية على سجدة
 * @property {Object} [surah] - معلومات السورة
 * @property {number} surah.number - رقم السورة
 * @property {string} surah.name - اسم السورة
 */

/**
 * @typedef {Object} QuranEdition
 * @property {string} identifier - معرف الإصدار (مثال: 'quran-uthmani')
 * @property {string} language - اللغة (مثال: 'ar'، 'en')
 * @property {string} name - اسم الإصدار بالعربية
 * @property {string} englishName - اسم الإصدار بالإنجليزية
 * @property {string} format - التنسيق (نص، صوت، فيديو)
 * @property {string} type - النوع (ترجمة، تفسير، قرآن)
 * @property {string} direction - اتجاه النص (rtl، ltr)
 */

/**
 * @typedef {Object} QuranAudioEdition
 * @property {string} identifier - معرف الإصدار (مثال: 'ar.alafasy')
 * @property {string} language - اللغة (مثال: 'ar')
 * @property {string} name - اسم الإصدار بالعربية
 * @property {string} englishName - اسم الإصدار بالإنجليزية
 * @property {string} format - التنسيق (mp3، wav)
 * @property {string} type - النوع (تلاوة، تفسير صوتي)
 * @property {string} direction - اتجاه النص (rtl، ltr)
 */

/**
 * @typedef {Object} QuranTranslationEdition
 * @property {string} identifier - معرف الإصدار (مثال: 'en.sahih')
 * @property {string} language - اللغة (مثال: 'en')
 * @property {string} name - اسم الإصدار بالعربية
 * @property {string} englishName - اسم الإصدار بالإنجليزية
 * @property {string} format - التنسيق (نص)
 * @property {string} type - النوع (ترجمة، تفسير)
 * @property {string} direction - اتجاه النص (rtl، ltr)
 */

/**
 * @typedef {Object} QuranWordTiming
 * @property {string} text - نص الكلمة
 * @property {number} start - وقت البدء (بالمللي ثانية)
 * @property {number} end - وقت الانتهاء (بالمللي ثانية)
 * @property {number} charIndex - موقع الحرف في الآية
 * @property {number} wordIndex - موقع الكلمة في الآية
 */

const QURAN_API_BASE_URL = 'https://api.alquran.cloud/v1 ';

/**
 * العميل الخاص بـ Alquran.cloud API
 * @type {{}}
 */
const quranApiClient = {
  /**
   * إجراء طلب إلى Alquran.cloud API
   * @private
   * @param {string} endpoint - النقطة النهائية للطلب
   * @param {Object} [params] - معلمات الطلب
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {Promise<Object>} وعد بالنتيجة
   */
  async _request(endpoint, params, errorLogger = console) {
    const url = new URL(`${QURAN_API_BASE_URL}${endpoint}`);
    
    if (params) {
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });
    }
    
    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const responseData = await response.json();
      
      if (!response.ok || responseData.status === 'error' || responseData.code !== 200) {
        const errorMessage = typeof responseData.data === 'string' ? 
                             responseData.data : 
                             (responseData.message || `فشل الطلب مع حالة ${response.status}`);
        
        throw new Error(errorMessage);
      }
      
      return responseData.data;
    } catch (error) {
      const isNetworkError = !(error.message && error.message.startsWith('فشل الطلب'));
      
      if (errorLogger.handleError) {
        errorLogger.handleError(error, `خطأ في طلب Alquran.cloud API إلى "${endpoint}"`, 'quranApiClient._request', {
          endpoint, 
          params: params || {}, 
          fullUrl: url.toString()
        });
      } else if (errorLogger.error) {
        errorLogger.error(`خطأ في طلب Alquran.cloud API إلى "${endpoint}"`, error, {
          endpoint, 
          params: params || {}, 
          fullUrl: url.toString()
        });
      } else {
        console.error(`[quranApiClient] خطأ في طلب Alquran.cloud API إلى "${endpoint}"`, error);
      }
      
      throw error instanceof Error ? error : new Error(String(error));
    }
  },

  /**
   * الحصول على قائمة كل السور
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {Promise<Array<QuranSurah>>} وعد بقائمة السور
   */
  async getAllSurahs(errorLogger = console) {
    return this._request('/meta', undefined, errorLogger)
      .then(metaData => {
        if (metaData && metaData.surahs && metaData.surahs.references) {
          return metaData.surahs.references;
        }
        
        throw new Error('لم يتم العثور على قائمة السور في استجابة /meta.');
      });
  },

  /**
   * الحصول على سورة معينة مع آياتها
   * @param {number} surahNumber - رقم السورة (1-114)
   * @param {string} [editionIdentifier='quran-uthmani'] - معرف الإصدار
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {Promise<QuranSurah>} وعد بمعلومات السورة
   */
  async getSurahWithAyahs(surahNumber, editionIdentifier = 'quran-uthmani', errorLogger = console) {
    if (typeof surahNumber !== 'number' || surahNumber < 1 || surahNumber > 114) {
      const err = new Error('رقم السورة غير صالح. يجب أن يكون بين 1 و114.');
      this._logWarning(errorLogger, err.message, 'quranApiClient.getSurahWithAyahs', { surahNumber });
      return Promise.reject(err);
    }
    
    return this._request(`/surah/${surahNumber}/${editionIdentifier}`, undefined, errorLogger);
  },

  /**
   * الحصول على آية معينة
   * @param {string | number} ayahReference - مرجع الآية (مثال: "2:255" أو 282)
   * @param {string} [editionIdentifier='quran-uthmani'] - معرف الإصدار
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {Promise<QuranAyah | Array<QuranAyah>>} وعد بمعلومات الآية
   */
  async getAyah(ayahReference, editionIdentifier = 'quran-uthmani', errorLogger = console) {
    if (!ayahReference) {
      const err = new Error('مرجع الآية مطلوب.');
      this._logWarning(errorLogger, err.message, 'quranApiClient.getAyah', { ayahReference });
      return Promise.reject(err);
    }
    
    return this._request(`/ayah/${ayahReference}/${editionIdentifier}`, undefined, errorLogger);
  },

  /**
   * الحصول على بيانات الصوت للآية
   * @param {string | number} ayahReference - مرجع الآية
   * @param {string} audioEditionIdentifier - معرف إصدار الصوت
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {Promise<QuranAyah>} وعد بمعلومات الآية مع روابط الصوت
   */
  async getAyahAudioData(ayahReference, audioEditionIdentifier, errorLogger = console) {
    if (!ayahReference || !audioEditionIdentifier) {
      const err = new Error('مرجع الآية ومعرف إصدار الصوت مطلوبان.');
      this._logWarning(errorLogger, err.message, 'quranApiClient.getAyahAudioData', { ayahReference, audioEditionIdentifier });
      return Promise.reject(err);
    }
    
    return this._request(`/ayah/${ayahReference}/${audioEditionIdentifier}`, undefined, errorLogger);
  },

  /**
   * الحصول على ترجمة للآية
   * @param {string | number} ayahReference - مرجع الآية
   * @param {string} translationEditionIdentifier - معرف إصدار الترجمة
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {Promise<QuranAyah>} وعد بمعلومات الآية مع الترجمة
   */
  async getAyahTranslation(ayahReference, translationEditionIdentifier, errorLogger = console) {
    if (!ayahReference || !translationEditionIdentifier) {
      const err = new Error('مرجع الآية ومعرف إصدار الترجمة مطلوبان.');
      this._logWarning(errorLogger, err.message, 'quranApiClient.getAyahTranslation', { ayahReference, translationEditionIdentifier });
      return Promise.reject(err);
    }
    
    return this._request(`/ayah/${ayahReference}/${translationEditionIdentifier}`, undefined, errorLogger);
  },

  /**
   * الحصول على قائمة الإصدارات المتاحة
   * @param {Object} [options] - خيارات التصفية
   * @param {string} [options.format] - التنسيق (text، audio)
   * @param {string} [options.type] - النوع (ترجمة، تفسير، قرآن)
   * @param {string} [options.language] - اللغة (en، ar)
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {Promise<Array<QuranEdition>>} وعد بقائمة الإصدارات
   */
  async getEditions(options = {}, errorLogger = console) {
    return this._request('/edition', options, errorLogger);
  },

  /**
   * الحصول على ترجمة الآية
   * @param {string | number} ayahReference - مرجع الآية
   * @param {string} translationEditionIdentifier - معرف إصدار الترجمة
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {Promise<QuranAyah>} وعد بمعلومات الآية مع الترجمة
   */
  async getAyahTranslation(ayahReference, translationEditionIdentifier, errorLogger = console) {
    if (!ayahReference || !translationEditionIdentifier) {
      const err = new Error('مرجع الآية ومعرف إصدار الترجمة مطلوبان.');
      this._logWarning(errorLogger, err.message, 'quranApiClient.getAyahTranslation', { ayahReference, translationEditionIdentifier });
      return Promise.reject(err);
    }
    
    return this._request(`/ayah/${ayahReference}/${translationEditionIdentifier}`, undefined, errorLogger);
  },

  /**
   * الحصول على معلومات عن الآيات مع أوقات الكلمات
   * @param {string | number} ayahReference - مرجع الآية
   * @param {string} audioEditionIdentifier - معرف إصدار الصوت
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {Promise<QuranAyah>} وعد بمعلومات الآية مع أوقات الكلمات
   */
  async getAyahWordTimings(ayahReference, audioEditionIdentifier, errorLogger = console) {
    if (!ayahReference || !audioEditionIdentifier) {
      const err = new Error('مرجع الآية ومعرف إصدار الصوت مطلوبان.');
      this._logWarning(errorLogger, err.message, 'quranApiClient.getAyahWordTimings', { ayahReference, audioEditionIdentifier });
      return Promise.reject(err);
    }
    
    // إضافة معلمات إضافية للحصول على أوقات الكلمات
    return this._request(`/ayah/${ayahReference}/${audioEditionIdentifier}`, {
      offsets: true,
      timing: 'word'
    }, errorLogger);
  },

  /**
   * التحقق من صحة رقم السورة
   * @param {number} surahNumber - رقم السورة
   * @returns {boolean} true إذا كان الرقم صحيحًا
   */
  validateSurahNumber(surahNumber) {
    return typeof surahNumber === 'number' && 
           surahNumber >= 1 && 
           surahNumber <= 114;
  },

  /**
   * التحقق من صحة مرجع الآية
   * @param {string | number} ayahReference - مرجع الآية
   * @returns {boolean} true إذا كان المرجع صحيحًا
   */
  validateAyahReference(ayahReference) {
    if (typeof ayahReference === 'number') {
      return ayahReference >= 1 && ayahReference <= 6236;
    }
    
    if (typeof ayahReference === 'string') {
      const ayahRangeRegex = /^(\d+):(\d+)(?:-(\d+):(\d+))?$/;
      return ayahRangeRegex.test(ayahReference);
    }
    
    return false;
  },

  /**
   * تحليل مرجع الآية
   * @param {string} ayahReference - مرجع الآية
   * @returns {Object} معلومات تفصيلية عن الآية أو المدى
   */
  parseAyahReference(ayahReference) {
    if (typeof ayahReference === 'number') {
      return { globalAyahNumber: ayahReference };
    }
    
    const parts = ayahReference.split(':');
    
    if (parts.length === 2) {
      const surahNumber = parseInt(parts[0], 10);
      const ayahNumber = parseInt(parts[1], 10);
      
      if (!isNaN(surahNumber) && !isNaN(ayahNumber)) {
        return { surahNumber, ayahNumber };
      }
    }
    
    const rangeParts = ayahReference.split('-');
    
    if (rangeParts.length === 2) {
      const start = this.parseAyahReference(rangeParts[0]);
      const end = this.parseAyahReference(rangeParts[1]);
      
      if (start.surahNumber === end.surahNumber) {
        return {
          surahNumber: start.surahNumber,
          startAyah: start.ayahNumber,
          endAyah: end.ayahNumber
        };
      }
    }
    
    return null;
  },

  /**
   * تنسيق معرف الإصدار
   * @param {string} identifier - المعرف الأصلي
   * @returns {string} المعرف المنقح
   */
  formatEditionIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') {
      return 'quran-uthmani';
    }
    
    return identifier.trim().toLowerCase();
  },

  /**
   * الحصول على مدى الآيات
   * @param {string} ayahRange - مدى الآيات (مثال: "1:1-1:7")
   * @param {string} [editionIdentifier='quran-uthmani'] - معرف الإصدار
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {Promise<Array<QuranAyah>>} وعد بقائمة الآيات
   */
  async getAyahRange(ayahRange, editionIdentifier = 'quran-uthmani', errorLogger = console) {
    const parsed = this.parseAyahReference(ayahRange);
    
    if (!parsed || !parsed.surahNumber || !parsed.startAyah || !parsed.endAyah) {
      const err = new Error('مدى الآيات غير صحيح.');
      this._logWarning(errorLogger, err.message, 'quranApiClient.getAyahRange', { ayahRange });
      return Promise.reject(err);
    }
    
    return this._request(`/surah/${parsed.surahNumber}/${editionIdentifier}`, undefined, errorLogger)
      .then(surah => {
        if (!surah || !surah.ayahs) {
          throw new Error('بيانات الآيات غير متاحة.');
        }
        
        const startIndex = Math.max(0, parsed.startAyah - 1);
        const endIndex = Math.min(surah.ayahs.length, parsed.endAyah);
        
        return surah.ayahs.slice(startIndex, endIndex);
      });
  },

  /**
   * الحصول على تفاصيل الآية من نصها
   * @param {string} ayahText - نص الآية
   * @param {string} [language='ar'] - لغة البحث
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {Promise<QuranAyah>} وعد بمعلومات الآية
   */
  async getAyahByContent(ayahText, language = 'ar', errorLogger = console) {
    if (!ayahText || typeof ayahText !== 'string' || ayahText.trim().length < 10) {
      const err = new Error('نص الآية غير كافٍ للبحث.');
      this._logWarning(errorLogger, err.message, 'quranApiClient.getAyahByContent', { ayahText });
      return Promise.reject(err);
    }
    
    // هذه الوظيفة تتطلب واجهة بحث متقدمة لم يتم توفيرها في API الحالي
    // يمكن استخدام واجهات بحث خارجية أو قاعدة بيانات محلية
    return new Promise((resolve, reject) => {
      import('../data/quran-index.js').then(quranIndex => {
        const result = quranIndex.findAyahByText(ayahText, language);
        
        if (result) {
          resolve(this.getAyah(result.globalAyahNumber, 'quran-uthmani', errorLogger));
        } else {
          reject(new Error('لم يتم العثور على الآية.'));
        }
      }).catch(e => {
        reject(new Error('فشل في تحميل فهرس القرآن للبحث.'));
      });
    });
  },

  /**
   * تسجيل تحذير
   * @param {Object} logger - مسجل الأخطاء
   * @param {string} message - رسالة التحذير
   * @param {string} origin - مصدر التحذير
   * @param {Object} context - سياق التحذير
   */
  _logWarning(logger, message, origin, context) {
    if (logger.logWarning) {
      logger.logWarning({ message, origin, context });
    } else if (logger.warn) {
      logger.warn(message, context);
    } else {
      console.warn(message, context);
    }
  }
};

/**
 * تهيئة العميل الخاص بـ Alquran.cloud API
 * @param {Object} [dependencies] - التبعيات الاختيارية
 */
export function initializeQuranApiClient(dependencies = {}) {
  const { errorLogger } = dependencies;
  
  try {
    console.info('[QuranApiClient] تم تهيئته بنجاح');
    
    // جعل الوظائف متاحة عالميًا لتسهيل التصحيح
    if (typeof window !== 'undefined' && 
        (typeof process === 'undefined' || process.env.NODE_ENV === 'development')) {
      window.quranApiClient = {
        ...quranApiClient
      };
    }
    
    return {
      ...quranApiClient
    };
  } catch (error) {
    if (errorLogger) {
      errorLogger.logError(error, 'فشل في تهيئة QuranApiClient');
    } else {
      console.error('[QuranApiClient] فشل في التهيئة:', error);
    }
    
    return {};
  }
}

export default quranApiClient;
