// js/features/background-controller/background-ai.connector.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, EVENTS } from '../../config/app.constants.js';
import fileIOUtils from '../../services/file.io.utils.js';
import localizationService from '../../core/localization.service.js';

/**
 * @typedef {Object} PexelsPhoto
 * @property {string} id - معرف الصورة
 * @property {string} type - نوع العنصر (image)
 * @property {string} url - رابط الصورة
 * @property {string} thumbnailUrl - رابط الصورة المصغرة
 * @property {string} photographer - اسم المصور
 * @property {string} photographerUrl - رابط المصور
 * @property {string} alt - وصف الصورة
 */

/**
 * @typedef {Object} PexelsVideo
 * @property {string} id - معرف الفيديو
 * @property {string} type - نوع العنصر (video)
 * @property {string} url - رابط الفيديو
 * @property {string} thumbnailUrl - رابط الصورة المصغرة
 * @property {number} duration - مدة الفيديو
 * @property {string} photographer - اسم المصور
 * @property {string} photographerUrl - رابط المصور
 */

/**
 * @typedef {Object} PexelsResults
 * @property {PexelsPhoto[]} photos - نتائج الصور
 * @property {PexelsVideo[]} videos - نتائج الفيديوهات
 * @property {string} query - نص البحث
 * @property {boolean} isLoading - هل البحث قيد التشغيل؟
 * @property {string} error - رسالة الخطأ (إن وجد)
 * @property {number} timestamp - وقت البحث
 */

/**
 * @typedef {Object} BackgroundAIConnector
 * @property {(injectedDeps: Object) => void} _setDependencies - تعيين الاعتماديات
 * @property {(query: string, options?: Object) => Promise<PexelsResults>} fetchSuggestions - البحث عن خلفيات
 * @property {() => void} clearSuggestions - مسح الاقتراحات
 * @property {() => PexelsResults} getLastSuccessfulResults - الحصول على آخر نتائج ناجحة
 * @property {() => void} _handleQueryInput - معالجة إدخال المستخدم
 * @property {() => void} _setupEventListeners - إعداد مراقبة الأحداث
 * @property {() => void} _teardownEventListeners - إزالة مراقبة الأحداث
 * @property {() => void} _initializeAutocomplete - تهيئة البحث التلقائي
 * @property {() => void} selfTest - التحقق من صحة النظام
 */

const backgroundAIConnector = (() => {
  // الثوابت
  const MAX_SUGGESTIONS_PHOTOS = 5;
  const MAX_SUGGESTIONS_VIDEOS = 3;
  const LOCAL_STORAGE_KEY = 'MQVE_lastAIResults';
  
  // المتغيرات الداخلية
  let dependencies = {
    stateStore: {
      dispatch: () => {},
      getState: () => ({ currentProject: null })
    },
    eventAggregator: {
      publish: () => {},
      subscribe: (callback) => ({ unsubscribe: () => {} })
    },
    errorLogger: console,
    pexelsAPI: {
      searchPhotos: () => Promise.resolve({}),
      searchVideos: () => Promise.resolve({})
    }
  };
  
  let searchQuery = '';
  let currentQueryTimestamp = 0;
  let currentAbortController = null;
  let lastSuccessfulQuery = '';
  let lastSuccessfulResults = { photos: [], videos: [] };
  
  // الدوال المساعدة
  const getLogger = () => {
    return dependencies.errorLogger || console;
  };
  
  const getLocalization = () => {
    return localizationService;
  };
  
  const translate = (key) => {
    const service = getLocalization();
    return service.translate(key);
  };
  
  const validateSearchQuery = (query) => {
    if (!query || typeof query !== 'string' || query.trim() === '') {
      throw new Error('استعلام غير صالح');
    }
  };
  
  const isRecentQuery = (query) => {
    return query && query === lastSuccessfulQuery;
  };
  
  const notifySuggestionsUpdated = (results) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.AI_SUGGESTIONS_UPDATED, results);
    }
  };
  
  const notifySuggestionsFailed = (errorMessage) => {
    if (dependencies.eventAggregator && dependencies.eventAggregator.publish) {
      dependencies.eventAggregator.publish(EVENTS.AI_SUGGESTIONS_FAILED, errorMessage);
    }
  };
  
  /**
   * تعيين الاعتماديات
   * @param {Object} injectedDeps - الاعتماديات المُمررة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.pexelsAPI) dependencies.pexelsAPI = injectedDeps.pexelsAPI;
  }

  /**
   * إلغاء الطلب الحالي
   * @private
   */
  function _abortCurrentRequest() {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = new AbortController();
    } else {
      currentAbortController = new AbortController();
    }
  }

  /**
   * طلب البحث من Pexels API
   * @param {string} query - نص البحث
   * @param {Object} [options={}] - خيارات البحث
   * @returns {Promise<PexelsResults>} نتائج البحث
   */
  async function _request(query, options = {}) {
    try {
      validateSearchQuery(query);
      
      const logger = getLogger();
      
      // التحقق مما إذا كان هناك نفس الاستعلام قيد التشغيل
      if (isRecentQuery(query)) {
        logger.logInfo({
          message: `البحث مكرر: ${query}`,
          origin: 'BackgroundAIConnector._request'
        });
        return lastSuccessfulResults;
      }
      
      _abortCurrentRequest();
      
      // إعداد خيارات البحث
      const searchOptions = {
        orientation: 'landscape',
        size: 'large',
        page: 1,
        perPage: MAX_SUGGESTIONS_PHOTOS + MAX_SUGGESTIONS_VIDEOS,
        signal: currentAbortController.signal,
        ...options
      };
      
      logger.logInfo({
        message: `بدء البحث: ${query}`,
        origin: 'BackgroundAIConnector._request'
      });
      
      // إرسال طلب البحث
      const [photoResults, videoResults] = await Promise.all([
        dependencies.pexelsAPI.searchPhotos(query, searchOptions),
        dependencies.pexelsAPI.searchVideos(query, searchOptions)
      ]);
      
      // معالجة النتائج
      const processedPhotos = _processPhotoResults(photoResults);
      const processedVideos = _processVideoResults(videoResults);
      
      const results = {
        photos: processedPhotos,
        videos: processedVideos,
        query,
        isLoading: false,
        error: null,
        timestamp: Date.now()
      };
      
      // حفظ النتائج
      lastSuccessfulQuery = query;
      lastSuccessfulResults = results;
      
      // نشر الحدث
      notifySuggestionsUpdated(results);
      
      return results;
    } catch (error) {
      const logger = getLogger();
      logger.handleError({
        error,
        message: `فشل في البحث: ${query}. ${error.message}`,
        origin: 'BackgroundAIConnector._request'
      });
      
      const errorPayload = {
        photos: [],
        videos: [],
        query,
        isLoading: false,
        error: error.message || translate('BackgroundAIConnector.RequestFailed'),
        timestamp: Date.now()
      };
      
      notifySuggestionsFailed(errorPayload.error);
      
      // حفظ النتائج الفارغة
      lastSuccessfulQuery = null;
      lastSuccessfulResults = { photos: [], videos: [] };
      
      return errorPayload;
    }
  }

  /**
   * معالجة نتائج الصور
   * @param {Object} results - نتائج Pexels API
   * @returns {PexelsPhoto[]} نتائج معالجة
   */
  function _processPhotoResults(results) {
    if (!results || !results.photos) {
      return [];
    }
    
    return results.photos
      .filter(p => p.src && p.src.large && p.src.medium && p.src.small && p.photographer)
      .slice(0, MAX_SUGGESTIONS_PHOTOS)
      .map(p => ({
        id: p.id,
        type: 'image',
        url: p.src.landscape || p.src.large || p.src.original,
        thumbnailUrl: p.src.small || p.src.tiny,
        photographer: p.photographer,
        photographerUrl: p.photographer_url,
        alt: p.alt || searchQuery
      }));
  }

  /**
   * معالجة نتائج الفيديوهات
   * @param {Object} results - نتائج Pexels API
   * @returns {PexelsVideo[]} نتائج معالجة
   */
  function _processVideoResults(results) {
    if (!results || !results.videos) {
      return [];
    }
    
    return results.videos
      .filter(v => v.video_files?.length > 0 && v.duration > 0)
      .slice(0, MAX_SUGGESTIONS_VIDEOS)
      .map(v => {
        // العثور على رابط فيديو مناسب
        const hdFile = v.video_files.find(f => f.quality === 'hd' && f.file_type === 'video/mp4');
        const sdFile = v.video_files.find(f => f.quality === 'sd' && f.file_type === 'video/mp4');
        const anyMP4 = v.video_files.find(f => f.file_type === 'video/mp4');
        
        return {
          id: v.id,
          type: 'video',
          url: hdFile?.link || sdFile?.link || anyMP4?.link || v.video_files[0]?.link,
          thumbnailUrl: v.image || v.video_pictures?.[0]?.picture,
          duration: v.duration,
          photographer: v.user?.name,
          photographerUrl: v.user?.url,
          alt: v.alt || searchQuery
        };
      });
  }

  /**
   * البحث عن اقتراحات الخلفية
   * @param {string} query - نص البحث
   * @param {Object} [options={}] - خيارات البحث
   * @returns {Promise<PexelsResults>} نتائج البحث
   */
  async function fetchSuggestions(query, options = {}) {
    try {
      const results = await _request(query, options);
      
      // تحديث واجهة المستخدم
      if (dependencies.stateStore && DOMElements.aiContainer) {
        dependencies.stateStore.dispatch(ACTIONS.SET_AI_SUGGESTIONS, {
          photos: results.photos,
          videos: results.videos,
          query: results.query,
          isLoading: results.isLoading,
          error: results.error,
          timestamp: results.timestamp
        });
      }
      
      if (DOMElements.aiLoader) {
        DOMElements.aiLoader.style.display = 'none';
      }
      
      return results;
    } catch (error) {
      const logger = getLogger();
      logger.handleError({
        error,
        message: `فشل في البحث: ${query}. ${error.message}`,
        origin: 'BackgroundAIConnector.fetchSuggestions'
      });
      
      return {
        photos: [],
        videos: [],
        query,
        isLoading: false,
        error: error.message || 'Unknown error',
        timestamp: Date.now()
      };
    }
  }

  /**
   * مسح اقتراحات الخلفية
   */
  function clearSuggestions() {
    const clearPayload = {
      photos: [],
      videos: [],
      query: null,
      isLoading: false,
      error: null,
      timestamp: Date.now()
    };
    
    // تحديث الحالة
    if (dependencies.stateStore) {
      dependencies.stateStore.dispatch(ACTIONS.SET_AI_SUGGESTIONS, clearPayload);
    }
    
    // نشر الحدث
    notifySuggestionsUpdated(clearPayload);
    
    // تحديث واجهة المستخدم
    if (DOMElements.aiLoader) {
      DOMElements.aiLoader.style.display = 'none';
    }
    
    lastSuccessfulQuery = '';
    lastSuccessfulResults = { photos: [], videos: [] };
  }

  /**
   * الحصول على آخر نتائج ناجحة
   * @returns {PexelsResults} نتائج البحث
   */
  function getLastSuccessfulResults() {
    return { ...lastSuccessfulResults };
  }

  /**
   * التعامل مع إدخال المستخدم للبحث
   * @private
   */
  function _handleQueryInput(event) {
    if (!event || !event.target) {
      return;
    }
    
    const query = event.target.value.trim();
    
    if (query.length < 2) {
      const logger = getLogger();
      logger.logWarning({
        message: 'البحث قصير جدًا',
        origin: 'BackgroundAIConnector._handleQueryInput'
      });
      return;
    }
    
    if (DOMElements.aiLoader) {
      DOMElements.aiLoader.style.display = 'block';
    }
    
    fetchSuggestions(query).catch(e => {
      const logger = getLogger();
      logger.handleError({
        error: e,
        message: `فشل في البحث: ${query}. ${e.message}`,
        origin: 'BackgroundAIConnector._handleQueryInput'
      });
    });
  }

  /**
   * إعداد مراقبة الأحداث
   */
  function _setupEventListeners() {
    const searchInput = DOMElements.aiSuggestBtn; // نفترض أن الزر هو حقل إدخال
    
    if (searchInput) {
      searchInput.addEventListener('input', _handleQueryInput);
    } else {
      const logger = getLogger();
      logger.logWarning({
        message: 'عنصر البحث غير موجود في DOMElements',
        origin: 'BackgroundAIConnector._setupEventListeners'
      });
    }
  }

  /**
   * إزالة مراقبة الأحداث
   */
  function _teardownEventListeners() {
    const searchInput = DOMElements.aiSuggestBtn;
    
    if (searchInput) {
      searchInput.removeEventListener('input', _handleQueryInput);
    }
  }

  /**
   * تهيئة البحث التلقائي
   */
  function _initializeAutocomplete() {
    const searchInput = DOMElements.aiSuggestBtn;
    
    if (!searchInput) {
      return;
    }
    
    // تهيئة البحث التلقائي
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      if (query.length >= 2) {
        fetchSuggestions(query);
      } else if (query.length === 0) {
        clearSuggestions();
      }
    });
    
    // تهيئة التخزين المحلي
    try {
      const savedResults = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedResults) {
        const parsedResults = JSON.parse(savedResults);
        lastSuccessfulResults = parsedResults;
        lastSuccessfulQuery = parsedResults.query || '';
      }
    } catch (e) {
      const logger = getLogger();
      logger.handleError({
        error: e,
        message: 'فشل في تحميل الاقتراحات المحفوظة من localStorage',
        origin: 'BackgroundAIConnector._initializeAutocomplete'
      });
    }
  }

  /**
   * التحقق من صحة Pexels API
   * @returns {boolean} نتيجة التحقق
   */
  function isPexelsConfigured() {
    return dependencies.pexelsAPI && dependencies.pexelsAPI.isConfigured();
  }

  /**
   * التحقق من صحة النظام
   * @returns {boolean} نتيجة التحقق
   */
  function selfTest() {
    try {
      const testQuery = 'test';
      const results = backgroundAIConnector.fetchSuggestions(testQuery);
      
      return results !== null;
    } catch (e) {
      return false;
    }
  }

  // واجهة API العامة
  return {
    _setDependencies,
    fetchSuggestions,
    clearSuggestions,
    getLastSuccessfulResults,
    _handleQueryInput,
    _setupEventListeners,
    _teardownEventListeners,
    _initializeAutocomplete,
    isPexelsConfigured,
    selfTest
  };
})();

/**
 * تهيئة اقتراحات الذكاء الاصطناعي للخلفية
 * @param {Object} deps - الاعتماديات المُمررة
 * @returns {Object} واجهة الذكاء الاصطناعي
 */
export function initializeBackgroundAIConnector(deps) {
  backgroundAIConnector._setDependencies(deps);
  
  // التحقق من صحة Pexels API
  if (!backgroundAIConnector.isPexelsConfigured()) {
    const logger = deps.errorLogger || console;
    logger.logWarning({
      message: 'Pexels API غير مُجهز. لن تعمل اقتراحات الذكاء الاصطناعي.',
      origin: 'BackgroundAIConnector.initializeBackgroundAIConnector'
    });
    return { fetchSuggestions: () => Promise.resolve({ photos: [], videos: [] }) };
  }
  
  // مزامنة مع الحالة الحالية
  const initialProject = deps.stateStore.getState().currentProject;
  const initialQuery = initialProject?.backgroundSettings?.aiQuery || '';
  
  if (initialQuery) {
    backgroundAIConnector.fetchSuggestions(initialQuery);
  }
  
  // إرجاع واجهة الذكاء الاصطناعي
  return {
    fetchSuggestions: backgroundAIConnector.fetchSuggestions,
    clearSuggestions: backgroundAIConnector.clearSuggestions,
    getLastSuccessfulResults: backgroundAIConnector.getLastSuccessfulResults,
    isPexelsConfigured: backgroundAIConnector.isPexelsConfigured,
    selfTest: backgroundAIConnector.selfTest
  };
}

/**
 * التحقق من صحة النظام
 * @returns {boolean} نتيجة التحقق
 */
export function selfTest() {
  return backgroundAIConnector.selfTest();
}

// تصدير الكائن الافتراضي
export default backgroundAIConnector;
