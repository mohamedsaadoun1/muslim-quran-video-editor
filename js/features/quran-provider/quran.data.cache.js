// js/features/quran-provider/quran.data.cache.js

// quranApiClient will be injected
// import quranApiClient from '../../services/quran.api.client.js';
import { EVENTS } from '../../config/app.constants.js';

const quranDataCache = (() => {
  // Internal cache storage
  let surahsListCache = null; // Array of Surah objects: { number, name, englishName, numberOfAyahs, revelationType, ... }
  let editionsCache = null; // Array of Edition objects from API: { identifier, language, name, format, type, ... }
  let recitersCache = null; // Filtered from editionsCache
  let translationsCache = null; // Filtered from editionsCache
  let quranStructureCache = null; // { totalAyahs, surahs: [{number, numberOfAyahs, cumulativeAyahsStart}]}

  // Cache for full Surah data (including ayahs text) if fetched
  // Key: surahNumber, Value: Surah object with ayahs array
  const fullSurahDataCache = new Map();


  let dependencies = {
    quranApiClient: { // Fallback/Mock
      getAllSurahs: async () => [],
      getEditions: async () => [],
      getSurahWithAyahs: async (num, ed) => ({ ayahs: [] }), // For fetching ayahs text of a surah
    },
    errorLogger: console,
    eventAggregator: { publish: () => {} },
    // stateStore: { dispatch: () => {} }, // If managing loading states globally
  };


  /** Fetches and caches the list of all Surahs. @private */
  async function _loadSurahsListIfNeeded() {
    if (surahsListCache !== null) return surahsListCache;

    // dependencies.stateStore?.dispatch(ACTIONS.SET_DATA_LOADING, { key: 'surahsList', loading: true });
    try {
      const surahs = await dependencies.quranApiClient.getAllSurahs(dependencies.errorLogger);
      if (surahs && Array.isArray(surahs)) {
        surahsListCache = surahs.sort((a, b) => a.number - b.number); // Ensure sorted
        dependencies.eventAggregator.publish(EVENTS.SURAH_LIST_LOADED, surahsListCache);
        // console.debug('[QuranDataCache] Surahs list loaded and cached.');
        return surahsListCache;
      }
      throw new Error('Surahs data format from API is invalid.');
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error, message: 'Failed to load Surahs list.', origin: 'QuranDataCache._loadSurahsListIfNeeded'
      });
      surahsListCache = []; // Cache empty array on error to prevent repeated failed attempts
      return [];
    } finally {
      // dependencies.stateStore?.dispatch(ACTIONS.SET_DATA_LOADING, { key: 'surahsList', loading: false });
    }
  }

  /** Fetches and caches all available editions, then filters them. @private */
  async function _loadEditionsIfNeeded() {
    if (editionsCache !== null) return true; // Already loaded

    // dependencies.stateStore?.dispatch(ACTIONS.SET_DATA_LOADING, { key: 'editions', loading: true });
    try {
      const editions = await dependencies.quranApiClient.getEditions({}, dependencies.errorLogger); // Empty options for all
      if (editions && Array.isArray(editions)) {
        editionsCache = editions;
        recitersCache = editions.filter(ed => ed.format === 'audio' && ed.type === 'versebyverse'); // Common type for recitations
        translationsCache = editions.filter(ed => ed.format === 'text' && (ed.type === 'translation' || ed.type === 'tafsir'));
        
        dependencies.eventAggregator.publish(EVENTS.RECITERS_LOADED, recitersCache); // Define these EVENTS
        dependencies.eventAggregator.publish(EVENTS.TRANSLATIONS_LOADED, translationsCache);
        // console.debug('[QuranDataCache] Editions loaded and cached. Reciters:', recitersCache.length, 'Translations:', translationsCache.length);
        return true;
      }
      throw new Error('Editions data format from API is invalid.');
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error, message: 'Failed to load Quran editions.', origin: 'QuranDataCache._loadEditionsIfNeeded'
      });
      editionsCache = []; recitersCache = []; translationsCache = []; // Cache empty on error
      return false;
    } finally {
      // dependencies.stateStore?.dispatch(ACTIONS.SET_DATA_LOADING, { key: 'editions', loading: false });
    }
  }
  
  /** Fetches and caches Quran structure (surah names, ayah counts). @private */
  async function _loadQuranStructureIfNeeded() {
      if (quranStructureCache !== null) return quranStructureCache;
      
      // Ensure Surah list is loaded first, as it contains numberOfAyahs
      const surahs = await _loadSurahsListIfNeeded();
      if (!surahs || surahs.length === 0) {
          (dependencies.errorLogger.logWarning || console.warn)('Cannot build Quran structure without Surahs list.');
          return null;
      }

      try {
          let cumulative = 0;
          const structuredSurahs = surahs.map(s => {
              const surahWithCumulative = {
                  number: s.number,
                  name: s.name, // Keep original Arabic name
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
        //   console.debug('[QuranDataCache] Quran structure processed and cached.');
          return quranStructureCache;
      } catch(error) {
        (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
            error, message: 'Failed to process Quran structure from Surahs list.',
            origin: 'QuranDataCache._loadQuranStructureIfNeeded'
        });
        quranStructureCache = { totalAyahs: 0, surahs: [] }; // Cache empty structure on error
        return null;
      }
  }


  // --- Public API ---
  async function getSurahsList() {
    return await _loadSurahsListIfNeeded();
  }

  async function getSurahDetail(surahNumber, forceFetch = false) {
    // Surah details (like numberOfAyahs) should already be in surahsListCache
    // This method could be enhanced to fetch detailed info if surahsListCache only has basic data.
    const surahs = await _loadSurahsListIfNeeded();
    const surahInfo = surahs.find(s => s.number === surahNumber);
    if (!surahInfo && forceFetch) {
        // This would imply an API endpoint for a single surah's metadata, which Alquran.cloud's /meta gives all at once.
        // The /surah/{number} endpoint fetches ayahs too.
        // So, this 'forceFetch' might be for getSurahWithAyahsText instead.
        (dependencies.errorLogger.logWarning || console.warn)({
            message: `Surah detail for ${surahNumber} not in cache, and forceFetch for metadata-only not standard with this API.`,
            origin: "QuranDataCache.getSurahDetail"
        });
        return null; // Or try to fetch /meta again
    }
    return surahInfo || null;
  }

  async function getAyahsForSurah(surahNumber, editionIdentifier = 'quran-uthmani', forceFetch = false) {
    const cacheKey = `${surahNumber}-${editionIdentifier}`;
    if (!forceFetch && fullSurahDataCache.has(cacheKey)) {
      return fullSurahDataCache.get(cacheKey).ayahs;
    }

    // dependencies.stateStore?.dispatch(ACTIONS.SET_DATA_LOADING, { key: `surah_${surahNumber}_${editionIdentifier}`, loading: true });
    try {
      // quranApiClient.getSurahWithAyahs returns the full Surah object including ayahs.
      const surahData = await dependencies.quranApiClient.getSurahWithAyahs(surahNumber, editionIdentifier, dependencies.errorLogger);
      if (surahData && surahData.ayahs) {
        fullSurahDataCache.set(cacheKey, surahData); // Cache the full surah data (name, englishName, ayahs, etc.)
        // console.debug(`[QuranDataCache] Ayahs for Surah ${surahNumber} (Ed: ${editionIdentifier}) loaded and cached.`);
        return surahData.ayahs; // Return only the ayahs array
      }
      throw new Error(`Ayahs not found in response for Surah ${surahNumber}, Edition ${editionIdentifier}.`);
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error, message: `Failed to load Ayahs for Surah ${surahNumber}, Edition ${editionIdentifier}.`,
        origin: 'QuranDataCache.getAyahsForSurah'
      });
      return []; // Return empty array on error
    } finally {
      // dependencies.stateStore?.dispatch(ACTIONS.SET_DATA_LOADING, { key: `surah_${surahNumber}_${editionIdentifier}`, loading: false });
    }
  }
  
  /** Returns full Surah data including text from cache or fetches it. */
  async function getFullSurahData(surahNumber, editionIdentifier = 'quran-uthmani', forceFetch = false) {
    const cacheKey = `${surahNumber}-${editionIdentifier}`;
    if (!forceFetch && fullSurahDataCache.has(cacheKey)) {
      return fullSurahDataCache.get(cacheKey);
    }
     try {
      const surahData = await dependencies.quranApiClient.getSurahWithAyahs(surahNumber, editionIdentifier, dependencies.errorLogger);
      if (surahData && surahData.ayahs) {
        fullSurahDataCache.set(cacheKey, surahData);
        return surahData;
      }
      throw new Error('Full surah data not found in response.');
    } catch (error) { /* error handling as in getAyahsForSurah */ return null; }
  }


  async function getAvailableReciters(forceRefetch = false) {
    if (forceRefetch) editionsCache = null; // Clear cache to force refetch
    await _loadEditionsIfNeeded();
    return recitersCache || [];
  }

  async function getAvailableTranslations(forceRefetch = false) {
    if (forceRefetch) editionsCache = null;
    await _loadEditionsIfNeeded();
    return translationsCache || [];
  }

  async function getQuranStructure() {
      return await _loadQuranStructureIfNeeded();
  }
  
  function clearAllCaches() {
      surahsListCache = null;
      editionsCache = null;
      recitersCache = null;
      translationsCache = null;
      quranStructureCache = null;
      fullSurahDataCache.clear();
      // console.info('[QuranDataCache] All caches cleared.');
  }
  
  function _setDependencies(injectedDeps) {
    Object.assign(dependencies, injectedDeps);
  }

  // Public API
  return {
    _setDependencies,
    getSurahsList,
    getSurahDetail, // Primarily gets from cached surahs list, useful for numberOfAyahs
    getAyahsForSurah, // Fetches ayahs (text) for a given surah and edition
    getFullSurahData, // Fetches the entire surah object including ayahs and surah metadata
    getAvailableReciters,
    getAvailableTranslations,
    getQuranStructure, // For verse analyzer
    clearAllCaches,
  };
})(); // IIFE removed.


/**
 * Initialization function for the QuranDataCache.
 * @param {object} deps
 * @param {import('../../services/quran.api.client.js').default} deps.quranApiClient
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * @param {import('../../core/event-aggregator.js').default} deps.eventAggregator
 * // @param {import('../../core/state-store.js').default} [deps.stateStore]
 */
export async function initializeQuranDataCache(deps) {
  quranDataCache._setDependencies(deps);
  const { errorLogger } = deps;

  // Preload essential data on app startup (optional, but often good for UX)
  // Doing this in parallel.
  // dependencies.stateStore?.dispatch(ACTIONS.SET_DATA_LOADING, { key: 'initialQuranData', loading: true });
  try {
    await Promise.all([
      quranDataCache.getSurahsList(),       // Also populates quranStructure indirectly
      quranDataCache.getAvailableReciters(), // Also populates translations
    ]);
    await quranDataCache.getQuranStructure(); // Ensure structure is built after surahs are loaded
    // console.info('[QuranDataCache] Initial data (Surahs, Editions, Structure) preloaded.');
  } catch (error) {
    (errorLogger.handleError || console.error).call(errorLogger, {
        error, message: "Failed to preload initial Quran data.",
        origin: "initializeQuranDataCache"
    });
    // App can continue, but selectors might be slow or fail on first use until data loads.
  } finally {
    // dependencies.stateStore?.dispatch(ACTIONS.SET_DATA_LOADING, { key: 'initialQuranData', loading: false });
  }

  // Return the public API of the cache service.
  return {
    getSurahsList: quranDataCache.getSurahsList,
    getSurahDetail: quranDataCache.getSurahDetail,
    getAyahsForSurah: quranDataCache.getAyahsForSurah,
    getFullSurahData: quranDataCache.getFullSurahData,
    getAvailableReciters: quranDataCache.getAvailableReciters,
    getAvailableTranslations: quranDataCache.getAvailableTranslations,
    getQuranStructure: quranDataCache.getQuranStructure,
    clearAllCaches: quranDataCache.clearAllCaches,
  };
}

export default quranDataCache;
