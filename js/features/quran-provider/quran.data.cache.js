// js/features/quran-provider/quran.data.cache.js
import { EVENTS } from '../../config/app.constants.js';
import notificationPresenter from '../../shared-ui-components/notification.presenter.js';

/**
 * خدمة تخزين بيانات القرآن المؤقتة
 */
const quranDataCache = (() => {
  // تخزين البيانات
  let surahsListCache = null;
  let editionsCache = null;
  let recitersCache = null;
  let translationsCache = null;
  let quranStructureCache = null;
  let fullSurahDataCache = new Map();
  
  // الاعتمادات
  let dependencies = {
    quranApiClient: {
      getAllSurahs: async () => [],
      getEditions: async () => [],
      getSurahWithAyahs: async (num, ed) => ({ ayahs: [] })
    },
    errorLogger: console,
    eventAggregator: { publish: () => {} }
  };
  
  /**
   * تحميل قائمة السور
   * @private
   * @returns {Promise<Array>} قائمة السور
   */
  async function _loadSurahsListIfNeeded() {
    if (surahsListCache !== null) return surahsListCache;
    
    try {
      const surahs = await dependencies.quranApiClient.getAllSurahs();
      
      if (Array.isArray(surahs)) {
        // التأكد من أن البيانات تحتوي على الحقول المطلوبة
        surahsListCache = surahs
          .filter(s => s.number && s.name && s.englishName && typeof s.numberOfAyahs === 'number')
          .sort((a, b) => a.number - b.number);
          
        dependencies.eventAggregator.publish(EVENTS.SURAH_LIST_LOADED, surahsListCache);
        
        return surahsListCache;
      }
      
      throw new Error('تنسيق بيانات السور غير صالح');
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.surah.list.load') || 
                 'فشل في تحميل قائمة السور',
        origin: 'QuranDataCache._loadSurahsListIfNeeded'
      });
      
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('error.surah.list.load') || 
                 'فشل في تحميل قائمة السور',
        type: 'error'
      });
      
      surahsListCache = [];
      return [];
    }
  }
  
  /**
   * تحميل الإصدارات
   * @private
   * @returns {Promise<boolean>} هل تم التحميل؟
   */
  async function _loadEditionsIfNeeded() {
    if (editionsCache !== null) return true;
    
    try {
      const editions = await dependencies.quranApiClient.getEditions();
      
      if (Array.isArray(editions)) {
        editionsCache = editions;
        recitersCache = editions.filter(ed => ed.format === 'audio' && ed.type === 'versebyverse');
        translationsCache = editions.filter(ed => ed.format === 'text' && (ed.type === 'translation' || ed.type === 'tafsir'));
        
        dependencies.eventAggregator.publish(EVENTS.RECITERS_LOADED, recitersCache);
        dependencies.eventAggregator.publish(EVENTS.TRANSLATIONS_LOADED, translationsCache);
        
        return true;
      }
      
      throw new Error('تنسيق بيانات الإصدارات غير صالح');
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.editions.load') || 
                 'فشل في تحميل إصدارات القرآن',
        origin: 'QuranDataCache._loadEditionsIfNeeded'
      });
      
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('error.editions.load') || 
                 'فشل في تحميل إصدارات القرآن',
        type: 'error'
      });
      
      editionsCache = [];
      recitersCache = [];
      translationsCache = [];
      return false;
    }
  }
  
  /**
   * إنشاء بنية القرآن
   * @private
   * @returns {Promise<Object|null>} بنية القرآن
   */
  async function _loadQuranStructureIfNeeded() {
    if (quranStructureCache !== null) return quranStructureCache;
    
    const surahs = await _loadSurahsListIfNeeded();
    
    if (!surahs || surahs.length === 0) {
      dependencies.errorLogger.warn({
        message: dependencies.localizationService.translate('warning.structure.surahs.missing') || 
                 'تعذر إنشاء بنية القرآن بدون قائمة السور',
        origin: 'QuranDataCache._loadQuranStructureIfNeeded'
      });
      
      return null;
    }
    
    try {
      let cumulative = 0;
      const structuredSurahs = surahs.map(s => {
        const surahWithCumulative = {
          number: s.number,
          name: s.name,
          englishName: s.englishName,
          numberOfAyahs: s.numberOfAyahs,
          cumulativeAyahsStart: cumulative + 1
        };
        
        cumulative += s.numberOfAyahs;
        return surahWithCumulative;
      });
      
      quranStructureCache = {
        totalAyahs: cumulative,
        surahs: structuredSurahs
      };
      
      return quranStructureCache;
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.structure.process') || 
                 'فشل في معالجة بنية القرآن',
        origin: 'QuranDataCache._loadQuranStructureIfNeeded'
      });
      
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('error.structure.process') || 
                 'فشل في معالجة بنية القرآن',
        type: 'error'
      });
      
      quranStructureCache = { totalAyahs: 0, surahs: [] };
      return null;
    }
  }
  
  /**
   * الحصول على قائمة السور
   * @returns {Promise<Array>} قائمة السور
   */
  async function getSurahsList() {
    return await _loadSurahsListIfNeeded();
  }
  
  /**
   * الحصول على تفاصيل السورة
   * @param {number} surahNumber - رقم السورة
   * @param {boolean} [forceFetch=false] - هل يتم التحميل القسري؟
   * @returns {Promise<Object|null>} تفاصيل السورة
   */
  async function getSurahDetail(surahNumber, forceFetch = false) {
    if (!forceFetch && surahsListCache && surahsListCache.length > 0) {
      return surahsListCache.find(s => s.number === surahNumber) || null;
    }
    
    // في حالة عدم توفر البيانات أو التحميل القسري، استخدم API
    const surahs = await _loadSurahsListIfNeeded();
    return surahs.find(s => s.number === surahNumber) || null;
  }
  
  /**
   * الحصول على آيات السورة
   * @param {number} surahNumber - رقم السورة
   * @param {string} [editionIdentifier='quran-uthmani'] - معرف الإصدار
   * @param {boolean} [forceFetch=false] - هل يتم التحميل القسري؟
   * @returns {Promise<Array>} آيات السورة
   */
  async function getAyahsForSurah(surahNumber, editionIdentifier = 'quran-uthmani', forceFetch = false) {
    const cacheKey = `${surahNumber}-${editionIdentifier}`;
    
    if (!forceFetch && fullSurahDataCache.has(cacheKey)) {
      return fullSurahDataCache.get(cacheKey).ayahs;
    }
    
    try {
      const surahData = await dependencies.quranApiClient.getSurahWithAyahs(surahNumber, editionIdentifier);
      
      if (surahData && Array.isArray(surahData.ayahs)) {
        fullSurahDataCache.set(cacheKey, surahData);
        return surahData.ayahs;
      }
      
      throw new Error(`الآيات غير موجودة في الاستجابة للسورة ${surahNumber}`);
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.verses.load', { 
          surah: surahNumber, 
          edition: editionIdentifier 
        }) || 
        `فشل في تحميل الآيات للسورة ${surahNumber}`,
        origin: 'QuranDataCache.getAyahsForSurah'
      });
      
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('error.verses.load', { 
          surah: surahNumber, 
          edition: editionIdentifier 
        }) || 
        `فشل في تحميل الآيات للسورة ${surahNumber}`,
        type: 'error'
      });
      
      return [];
    }
  }
  
  /**
   * الحصول على بيانات السورة الكاملة
   * @param {number} surahNumber - رقم السورة
   * @param {string} [editionIdentifier='quran-uthmani'] - معرف الإصدار
   * @param {boolean} [forceFetch=false] - هل يتم التحميل القسري؟
   * @returns {Promise<Object|null>} بيانات السورة
   */
  async function getFullSurahData(surahNumber, editionIdentifier = 'quran-uthmani', forceFetch = false) {
    const cacheKey = `${surahNumber}-${editionIdentifier}`;
    
    if (!forceFetch && fullSurahDataCache.has(cacheKey)) {
      return fullSurahDataCache.get(cacheKey);
    }
    
    try {
      const surahData = await dependencies.quranApiClient.getSurahWithAyahs(surahNumber, editionIdentifier);
      
      if (surahData && surahData.ayahs) {
        fullSurahDataCache.set(cacheKey, surahData);
        return surahData;
      }
      
      throw new Error('بيانات السورة غير موجودة في الاستجابة');
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.surah.data', { 
          surah: surahNumber 
        }) || 
        `فشل في تحميل بيانات السورة ${surahNumber}`,
        origin: 'QuranDataCache.getFullSurahData'
      });
      
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('error.surah.data', { 
          surah: surahNumber 
        }) || 
        `فشل في تحميل بيانات السورة ${surahNumber}`,
        type: 'error'
      });
      
      return null;
    }
  }
  
  /**
   * الحصول على القراء المتاحين
   * @param {boolean} [forceRefetch=false] - هل يتم إعادة التحميل؟
   * @returns {Promise<Array>} قائمة القراء
   */
  async function getAvailableReciters(forceRefetch = false) {
    if (forceRefetch) {
      editionsCache = null;
      recitersCache = null;
    }
    
    await _loadEditionsIfNeeded();
    return recitersCache || [];
  }
  
  /**
   * الحصول على الترجمات المتاحة
   * @param {boolean} [forceRefetch=false] - هل يتم إعادة التحميل؟
   * @returns {Promise<Array>} قائمة الترجمات
   */
  async function getAvailableTranslations(forceRefetch = false) {
    if (forceRefetch) {
      editionsCache = null;
      translationsCache = null;
    }
    
    await _loadEditionsIfNeeded();
    return translationsCache || [];
  }
  
  /**
   * الحصول على بنية القرآن
   * @returns {Promise<Object|null>} بنية القرآن
   */
  async function getQuranStructure() {
    return await _loadQuranStructureIfNeeded();
  }
  
  /**
   * إزالة جميع البيانات من التخزين المؤقت
   */
  function clearAllCaches() {
    surahsListCache = null;
    editionsCache = null;
    recitersCache = null;
    translationsCache = null;
    quranStructureCache = null;
    fullSurahDataCache.clear();
    
    dependencies.eventAggregator.publish(EVENTS.CACHE_CLEARED, {
      timestamp: Date.now()
    });
    
    return {
      status: 'cleared',
      timestamp: Date.now()
    };
  }
  
  /**
   * تعيين الاعتمادات
   * @param {Object} injectedDeps - الاعتمادات
   */
  function _setDependencies(injectedDeps) {
    Object.keys(injectedDeps).forEach(key => {
      if (injectedDeps[key]) {
        dependencies[key] = injectedDeps[key];
      }
    });
  }
  
  return {
    _setDependencies,
    getSurahsList,
    getSurahDetail,
    getAyahsForSurah,
    getFullSurahData,
    getAvailableReciters,
    getAvailableTranslations,
    getQuranStructure,
    clearAllCaches
  };
})();

/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 * @returns {Object} واجهة عامة للوحدة
 */
export async function initializeQuranDataCache(deps) {
  quranDataCache._setDependencies(deps);
  
  try {
    // تحميل البيانات الأساسية
    const [surahs, recitersLoaded] = await Promise.all([
      quranDataCache.getSurahsList(),
      quranDataCache.getAvailableReciters()
    ]);
    
    // التأكد من تحميل بنية القرآن
    await quranDataCache.getQuranStructure();
    
    // إرسال حدث نجاح التهيئة
    deps.eventAggregator.publish(EVENTS.DATA_CACHE_READY, {
      surahCount: surahs.length,
      recitersCount: recitersCache?.length || 0,
      hasStructure: !!quranStructureCache
    });
    
    return {
      getSurahsList: quranDataCache.getSurahsList,
      getSurahDetail: quranDataCache.getSurahDetail,
      getAyahsForSurah: quranDataCache.getAyahsForSurah,
      getFullSurahData: quranDataCache.getFullSurahData,
      getAvailableReciters: quranDataCache.getAvailableReciters,
      getAvailableTranslations: quranDataCache.getAvailableTranslations,
      getQuranStructure: quranDataCache.getQuranStructure,
      clearAllCaches: quranDataCache.clearAllCaches
    };
  } catch (error) {
    deps.errorLogger.error({
      error,
      message: deps.localizationService.translate('error.initialization.data.cache') || 
               'فشل في تهيئة تخزين بيانات القرآن',
      origin: 'initializeQuranDataCache'
    });
    
    notificationPresenter.showNotification({
      message: deps.localizationService.translate('error.initialization.data.cache') || 
               'فشل في تهيئة تخزين بيانات القرآن',
      type: 'error'
    });
    
    return {
      getSurahsList: async () => [],
      getSurahDetail: async () => null,
      getAyahsForSurah: async () => [],
      getFullSurahData: async () => null,
      getAvailableReciters: async () => [],
      getAvailableTranslations: async () => [],
      getQuranStructure: async () => null,
      clearAllCaches: quranDataCache.clearAllCaches
    };
  }
}

/**
 * تعيين مهلة للتخزين المؤقت
 * @param {Function} callback - الوظيفة التي سيتم تنفيذها
 * @param {number} [timeout=30000] - مهلة التنفيذ بالمللي ثانية
 * @returns {Function} وظيفة مع مهلة
 */
export function withCacheTimeout(callback, timeout = 30000) {
  return async function(...args) {
    const cacheTimeout = setTimeout(() => {
      throw new Error('تجاوزت مهلة التخزين المؤقت');
    }, timeout);
    
    try {
      const result = await callback(...args);
      clearTimeout(cacheTimeout);
      return result;
    } catch (error) {
      clearTimeout(cacheTimeout);
      throw error;
    }
  };
}

export default quranDataCache;
