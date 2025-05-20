// js/services/pexels.api.client.js

/**
 * @typedef {Object} PexelsPhoto
 * @property {number} id - معرف الصورة
 * @property {number} width - عرض الصورة
 * @property {number} height - ارتفاع الصورة
 * @property {string} url - رابط الصورة
 * @property {string} photographer - اسم المصور
 * @property {Object} src - مصادر الصورة المختلفة
 * @property {string} src.original - الرابط الأصلي للصورة
 * @property {string} src.large2x - الرابط بجودة عالية 2x
 * @property {string} src.large - الرابط بجودة عالية
 * @property {string} src.medium - الرابط بجودة متوسطة
 * @property {string} src.small - الرابط بجودة منخفضة
 * @property {string} src.portrait - الرابط بوضع عمودي
 * @property {string} src.landscape - الرابط بوضع أفقي
 * @property {string} src.tiny - الرابط بحجم صغير
 */

/**
 * @typedef {Object} PexelsVideo
 * @property {number} id - معرف الفيديو
 * @property {number} width - عرض الفيديو
 * @property {number} height - ارتفاع الفيديو
 * @property {string} url - رابط الفيديو
 * @property {string} image - رابط الصورة المصغرة
 * @property {number} duration - مدة الفيديو بالثواني
 * @property {Object} user - معلومات المستخدم
 * @property {number} user.id - معرف المستخدم
 * @property {string} user.name - اسم المستخدم
 * @property {string} user.url - رابط صفحة المستخدم
 * @property {Array<Object>} video_files - قائمة ملفات الفيديو المختلفة
 * @property {number} video_files[].id - معرف ملف الفيديو
 * @property {string} video_files[].quality - جودة الفيديو ('hd', 'sd')
 * @property {string} video_files[].file_type - نوع الملف
 * @property {number} video_files[].width - عرض الفيديو
 * @property {number} video_files[].height - ارتفاع الفيديو
 * @property {string} video_files[].link - رابط ملف الفيديو
 * @property {Array<Object>} video_pictures - صور الفيديو
 * @property {number} video_pictures[].id - معرف الصورة
 * @property {string} video_pictures[].picture - رابط الصورة
 * @property {number} video_pictures[].nr - رقم الصورة
 */

/**
 * @typedef {Object} PexelsSearchResult
 * @property {Array<PexelsPhoto>} photos - قائمة الصور
 * @property {number} page - رقم الصفحة
 * @property {number} per_page - عدد النتائج في الصفحة
 * @property {number} total_results - إجمالي عدد النتائج
 * @property {string} next_page - الرابط للصفحة التالية
 */

/**
 * @typedef {Object} PexelsVideoSearchResult
 * @property {Array<PexelsVideo>} videos - قائمة الفيديوهات
 * @property {number} page - رقم الصفحة
 * @property {number} per_page - عدد النتائج في الصفحة
 * @property {number} total_results - إجمالي عدد النتائج
 * @property {string} next_page - الرابط للصفحة التالية
 */

let PEXELS_API_KEY_VALUE = null;

try {
  // استيراد مفتاح Pexels API من ملف الإعدادات
  const apiKeysConfig = await import('../config/api-keys.config.js');
  
  if (apiKeysConfig && apiKeysConfig.PEXELS_API_KEY) {
    PEXELS_API_KEY_VALUE = apiKeysConfig.PEXELS_API_KEY;
  } else {
    console.warn('[PexelsApiClient] لم يتم العثور على مفتاح PEXELS_API_KEY في ملف الإعدادات.');
  }
} catch (e) {
  console.warn('[PexelsApiClient] لا يمكن تحميل ملف api-keys.config.js:', e);
}

// قاعدة روابط Pexels API
const PEXELS_API_BASE_URL = 'https://api.pexels.com/v1 ';
const PEXELS_VIDEO_API_BASE_URL = 'https://api.pexels.com/videos ';

// القيم الافتراضية للبحث
const DEFAULT_PER_PAGE = 15;
const DEFAULT_ORIENTATION = 'landscape'; // 'landscape', 'portrait', 'square'
const DEFAULT_SIZE = 'medium'; // 'small', 'medium', 'large'

/**
 * العميل الخاص بـ Pexels API
 */
const pexelsApiClient = {
  /**
   * التحقق من تهيئة العميل
   * @returns {boolean} true إذا كان العميل جاهزًا
   */
  isConfigured() {
    return !!PEXELS_API_KEY_VALUE;
  },

  /**
   * إجراء طلب إلى Pexels API
   * @private
   * @param {string} endpoint - النقطة النهائية للطلب
   * @param {Object} params - معلمات الطلب
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @param {string} [baseUrl=PEXELS_API_BASE_URL] - رابط القاعدة
   * @returns {Promise<Object>} - وعد بالنتيجة
   */
  async _request(endpoint, params, errorLogger = console, baseUrl = PEXELS_API_BASE_URL) {
    if (!this.isConfigured()) {
      const err = new Error('مفتاح Pexels API غير مهيأ. لا يمكن إرسال الطلبات.');
      this._logWarning(errorLogger, err.message, 'PexelsApiClient._request');
      throw err;
    }
    
    const queryString = new URLSearchParams(params).toString();
    const url = `${baseUrl}${endpoint}?${queryString}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': PEXELS_API_KEY_VALUE,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        let errorData;
        
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: await response.text().catch(() => 'تنسيق غير معروف') };
        }
        
        const errMessage = `فشل طلب Pexels API مع حالة ${response.status}: ${errorData.error || JSON.stringify(errorData)}`;
        throw new Error(errMessage);
      }
      
      return await response.json();
    } catch (error) {
      this._handleError(errorLogger, error, `طلب Pexels API إلى "${endpoint}"`, { endpoint, params, url });
      throw error instanceof Error ? error : new Error(String(error));
    }
  },

  /**
   * البحث عن صور على Pexels
   * @param {string} query - العبارة البحثية
   * @param {Object} [options={}] - خيارات البحث
   * @param {number} [options.per_page=DEFAULT_PER_PAGE] - عدد النتائج في الصفحة
   * @param {number} [options.page=1] - رقم الصفحة
   * @param {'landscape' | 'portrait' | 'square'} [options.orientation=DEFAULT_ORIENTATION] - اتجاه الصورة
   * @param {'large' | 'medium' | 'small' | 'large2x' | 'original' | 'tiny'} [options.size] - حجم الصورة
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {Promise<PexelsSearchResult>} - وعد بنتائج البحث
   */
  async searchPhotos(query, options = {}, errorLogger = console) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      const errMsg = "العبارة البحثية مطلوبة للبحث عن الصور على Pexels.";
      this._logWarning(errorLogger, errMsg, 'PexelsApiClient.searchPhotos');
      throw new Error(errMsg);
    }
    
    const params = {
      query,
      per_page: options.per_page || DEFAULT_PER_PAGE,
      page: options.page || 1,
      orientation: options.orientation || DEFAULT_ORIENTATION,
      ...(options.size && { size: options.size })
    };
    
    return this._request('/search', params, errorLogger, PEXELS_API_BASE_URL);
  },

  /**
   * البحث عن فيديوهات على Pexels
   * @param {string} query - العبارة البحثية
   * @param {Object} [options={}] - خيارات البحث
   * @param {number} [options.per_page=5] - عدد النتائج في الصفحة
   * @param {number} [options.page=1] - رقم الصفحة
   * @param {'landscape' | 'portrait' | 'square'} [options.orientation] - اتجاه الفيديو
   * @param {'small' | 'medium' | 'large'} [options.size] - الحد الأدنى للعرض
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {Promise<PexelsVideoSearchResult>} - وعد بنتائج البحث
   */
  async searchVideos(query, options = {}, errorLogger = console) {
    if (!query || typeof query !== 'string' || !query.trim()) {
      const errMsg = "العبارة البحثية مطلوبة للبحث عن الفيديوهات على Pexels.";
      this._logWarning(errorLogger, errMsg, 'PexelsApiClient.searchVideos');
      throw new Error(errMsg);
    }
    
    const params = {
      query,
      per_page: options.per_page || 5,
      page: options.page || 1,
      ...(options.orientation && { orientation: options.orientation }),
      ...(options.size && { size: options.size })
    };
    
    return this._request('/search', params, errorLogger, PEXELS_VIDEO_API_BASE_URL);
  },

  /**
   * الحصول على الصور المميزة
   * @param {Object} [options={}] - خيارات البحث
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {Promise<PexelsSearchResult>} - وعد بنتائج الصور المميزة
   */
  async getCuratedPhotos(options = {}, errorLogger = console) {
    const params = {
      per_page: options.per_page || DEFAULT_PER_PAGE,
      page: options.page || 1
    };
    
    return this._request('/curated', params, errorLogger, PEXELS_API_BASE_URL);
  },

  /**
   * الحصول على الفيديوهات الشائعة
   * @param {Object} [options={}] - خيارات البحث
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {Promise<PexelsVideoSearchResult>} - وعد بنتائج الفيديوهات الشائعة
   */
  async getPopularVideos(options = {}, errorLogger = console) {
    const params = {
      per_page: options.per_page || 5,
      page: options.page || 1,
      ...(options.min_width && { min_width: options.min_width }),
      ...(options.min_duration && { min_duration: options.min_duration })
    };
    
    return this._request('/popular', params, errorLogger, PEXELS_VIDEO_API_BASE_URL);
  },

  /**
   * الحصول على صورة بحسب معرفها
   * @param {number | string} photoId - معرف الصورة
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {Promise<PexelsPhoto>} - وعد ببيانات الصورة
   */
  async getPhotoById(photoId, errorLogger = console) {
    if (!photoId) {
      const errMsg = "معرف الصورة مطلوب.";
      this._logWarning(errorLogger, errMsg, 'PexelsApiClient.getPhotoById');
      throw new Error(errMsg);
    }
    
    return this._request(`/photos/${photoId}`, {}, errorLogger, PEXELS_API_BASE_URL);
  },

  /**
   * الحصول على فيديو بحسب معرفه
   * @param {number | string} videoId - معرف الفيديو
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {Promise<PexelsVideo>} - وعد ببيانات الفيديو
   */
  async getVideoById(videoId, errorLogger = console) {
    if (!videoId) {
      const errMsg = "معرف الفيديو مطلوب.";
      this._logWarning(errorLogger, errMsg, 'PexelsApiClient.getVideoById');
      throw new Error(errMsg);
    }
    
    return this._request(`/videos/${videoId}`, {}, errorLogger, PEXELS_VIDEO_API_BASE_URL);
  },

  /**
   * الحصول على أفضل رابط لصورة بحسب الجودة
   * @param {PexelsPhoto} photo - بيانات الصورة
   * @param {'original' | 'large2x' | 'large' | 'medium' | 'small' | 'portrait' | 'landscape' | 'tiny'} [quality='original'] - الجودة المطلوبة
   * @returns {string} - الرابط المناسب
   */
  getPhotoUrl(photo, quality = 'original') {
    if (!photo || !photo.src || !photo.src[quality]) {
      return null;
    }
    
    return photo.src[quality];
  },

  /**
   * الحصول على أفضل رابط لفيديو بحسب الجودة
   * @param {PexelsVideo} video - بيانات الفيديو
   * @param {'hd' | 'sd'} [quality='hd'] - الجودة المطلوبة
   * @returns {string} - الرابط المناسب
   */
  getVideoUrl(video, quality = 'hd') {
    if (!video || !video.video_files || !Array.isArray(video.video_files)) {
      return null;
    }
    
    const bestQuality = video.video_files.find(file => file.quality === quality);
    
    if (bestQuality && bestQuality.link) {
      return bestQuality.link;
    }
    
    if (video.video_files.length > 0 && video.video_files[0].link) {
      return video.video_files[0].link;
    }
    
    return null;
  },

  /**
   * الحصول على أفضل دقة لصورة
   * @param {PexelsPhoto} photo - بيانات الصورة
   * @returns {string} - الرابط بأفضل دقة
   */
  getBestResolutionPhoto(photo) {
    return this.getPhotoUrl(photo, 'original');
  },

  /**
   * الحصول على أفضل دقة لفيديو
   * @param {PexelsVideo} video - بيانات الفيديو
   * @returns {string} - الرابط بأفضل دقة
   */
  getBestResolutionVideo(video) {
    return this.getVideoUrl(video, 'hd');
  },

  /**
   * التحقق من صحة معلمات البحث
   * @param {Object} params - معلمات البحث
   * @returns {boolean} true إذا كانت المعلمات صحيحة
   */
  validateSearchParams(params) {
    if (!params || typeof params !== 'object') {
      return false;
    }
    
    if (params.query && typeof params.query !== 'string') {
      return false;
    }
    
    if (params.per_page && (typeof params.per_page !== 'number' || params.per_page <= 0)) {
      return false;
    }
    
    if (params.page && (typeof params.page !== 'number' || params.page <= 0)) {
      return false;
    }
    
    if (params.orientation && !['landscape', 'portrait', 'square'].includes(params.orientation)) {
      return false;
    }
    
    if (params.size && !['small', 'medium', 'large', 'large2x', 'original', 'tiny'].includes(params.size)) {
      return false;
    }
    
    if (params.min_width && (typeof params.min_width !== 'number' || params.min_width <= 0)) {
      return false;
    }
    
    if (params.min_duration && (typeof params.min_duration !== 'number' || params.min_duration <= 0)) {
      return false;
    }
    
    return true;
  },

  /**
   * تنسيق العبارة البحثية
   * @param {string} query - العبارة الأصلية
   * @returns {string} - العبارة المنقاة
   */
  formatSearchQuery(query) {
    if (!query || typeof query !== 'string') {
      return '';
    }
    
    return query.trim().replace(/\s+/g, ' ');
  },

  /**
   * تسجيل خطأ
   * @param {Object} logger - مسجل الأخطاء
   * @param {Error} error - الكائن الخاص بالخطأ
   * @param {string} message - رسالة الخطأ
   * @param {Object} context - سياق الخطأ
   */
  _handleError(logger, error, message, context) {
    if (logger.handleError) {
      logger.handleError(error, message, 'PexelsApiClient', context);
    } else if (logger.error) {
      logger.error(message, error, context);
    } else {
      logger.error(message, error, context);
    }
  },

  /**
   * تسجيل تحذير
   * @param {Object} logger - مسجل الأخطاء
   * @param {string} message - رسالة التحذير
   * @param {string} origin - مصدر التحذير
   */
  _logWarning(logger, message, origin) {
    if (logger.logWarning) {
      logger.logWarning({ message, origin });
    } else if (logger.warn) {
      logger.warn(message);
    } else {
      logger.warn(message);
    }
  }
};

/**
 * تهيئة العميل الخاص بـ Pexels API
 * @param {Object} [dependencies] - التبعيات الاختيارية
 */
export function initializePexelsApiClient(dependencies = {}) {
  const { errorLogger } = dependencies;
  
  try {
    console.info('[PexelsApiClient] تم تهيئته بنجاح');
    
    // جعل الوظائف متاحة عالميًا لتسهيل التصحيح
    if (typeof window !== 'undefined' && 
        (typeof process === 'undefined' || process.env.NODE_ENV === 'development')) {
      window.pexelsApiClient = {
        ...pexelsApiClient
      };
    }
    
    return {
      ...pexelsApiClient
    };
  } catch (error) {
    if (errorLogger) {
      errorLogger.logError(error, 'فشل في تهيئة PexelsApiClient');
    } else {
      console.error('[PexelsApiClient] فشل في التهيئة:', error);
    }
    
    return {};
  }
}

export default pexelsApiClient;
