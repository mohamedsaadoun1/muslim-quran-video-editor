// js/features/quran-provider/quran-verse.analyzer.js

// This module needs access to Quranic metadata, specifically:
// 1. List of Surahs with their number of ayahs.
// 2. Total number of ayahs in the Quran (6236, though this can vary slightly with basmalah counting).
// This data is assumed to be obtainable via quranDataCacheAPI.

const quranVerseAnalyzer = (() => {
  let dependencies = {
    errorLogger: console, // Fallback
    quranDataCacheAPI: { // Mock/Fallback API from quran.data.cache.js
      getSurahDetail: async (surahNumber) => null, // Returns { number, name, numberOfAyahs, ... }
      getQuranStructure: async () => ({ // Returns structure for global number calculation
        totalAyahs: 6236,
        surahs: [ /* {number: 1, numberOfAyahs: 7, cumulativeAyahsStart: 1}, ... */ ]
      })
    }
  };

  // Cache for Quran structure to avoid re-fetching for every calculation
  let quranStructureCache = null;

  /**
   * Ensures the Quran structure (surah counts, cumulative counts) is loaded.
   * @private
   * @returns {Promise<boolean>} True if structure is available, false otherwise.
   */
  async function _ensureQuranStructure() {
    if (quranStructureCache) return true;
    try {
      const structure = await dependencies.quranDataCacheAPI.getQuranStructure();
      if (structure && structure.surahs && structure.surahs.length === 114) {
        // Pre-calculate cumulative starting ayah number for each surah if not already present
        let cumulative = 0;
        quranStructureCache = {
            ...structure,
            surahs: structure.surahs.map(s => {
                const surahWithCumulative = { ...s, cumulativeAyahsStart: cumulative + 1 };
                cumulative += s.numberOfAyahs;
                return surahWithCumulative;
            })
        };
        quranStructureCache.totalAyahs = cumulative; // Recalculate total based on provided counts
        return true;
      } else {
        (dependencies.errorLogger.logWarning || console.warn)({
            message: "Quran structure data from quranDataCacheAPI is incomplete or invalid.",
            origin: "QuranVerseAnalyzer._ensureQuranStructure"
        });
        return false;
      }
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error)({
        error, message: "Failed to fetch or process Quran structure for verse analysis.",
        origin: "QuranVerseAnalyzer._ensureQuranStructure"
      });
      return false;
    }
  }


  /**
   * Validates if a start and end Ayah range is valid for a given Surah.
   * @param {number} surahNumber - The number of the Surah (1-114).
   * @param {number} startAyah - The starting Ayah number within the Surah.
   * @param {number} endAyah - The ending Ayah number within the Surah.
   * @returns {Promise<{isValid: boolean, message?: string, correctedStart?: number, correctedEnd?: number, numberOfAyahsInSurah?: number}>}
   *          An object indicating validity and potentially corrected values.
   */
  async function validateAyahRange(surahNumber, startAyah, endAyah) {
    if (typeof surahNumber !== 'number' || surahNumber < 1 || surahNumber > 114) {
      return { isValid: false, message: 'Invalid Surah number.' };
    }
    if (typeof startAyah !== 'number' || startAyah < 1) {
      return { isValid: false, message: 'Start Ayah must be a positive number.' };
    }
    if (typeof endAyah !== 'number' || endAyah < 1) {
      return { isValid: false, message: 'End Ayah must be a positive number.' };
    }

    try {
      const surahInfo = await dependencies.quranDataCacheAPI.getSurahDetail(surahNumber);
      if (!surahInfo || typeof surahInfo.numberOfAyahs !== 'number') {
        return { isValid: false, message: `Could not retrieve information for Surah ${surahNumber}.` };
      }
      const { numberOfAyahs } = surahInfo;

      if (startAyah > numberOfAyahs) {
        return { isValid: false, message: `Start Ayah (${startAyah}) exceeds number of Ayahs in Surah ${surahNumber} (${numberOfAyahs}).`, correctedStart: 1, correctedEnd: numberOfAyahs, numberOfAyahsInSurah: numberOfAyahs };
      }
      if (endAyah > numberOfAyahs) {
        // Correct endAyah to the max, but maintain startAyah if valid
        const correctedStart = Math.min(startAyah, numberOfAyahs);
        return { isValid: true, message: `End Ayah (${endAyah}) corrected to ${numberOfAyahs} for Surah ${surahNumber}.`, correctedStart, correctedEnd: numberOfAyahs, numberOfAyahsInSurah: numberOfAyahs };
      }
      if (endAyah < startAyah) {
        return { isValid: true, message: `End Ayah (${endAyah}) was before Start Ayah (${startAyah}). Corrected.`, correctedStart: startAyah, correctedEnd: startAyah, numberOfAyahsInSurah: numberOfAyahs };
      }
      return { isValid: true, correctedStart: startAyah, correctedEnd: endAyah, numberOfAyahsInSurah: numberOfAyahs };
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error)({
        error, message: `Error validating Ayah range for Surah ${surahNumber}.`,
        origin: "QuranVerseAnalyzer.validateAyahRange"
      });
      return { isValid: false, message: 'An error occurred during validation.' };
    }
  }

  /**
   * Converts a Surah number and Ayah number within that Surah to a global Ayah number (1-6236).
   * @param {number} surahNumber - The number of the Surah (1-114).
   * @param {number} ayahInSurahNumber - The number of the Ayah within its Surah.
   * @returns {Promise<number | null>} The global Ayah number, or null if invalid input or structure not loaded.
   */
  async function getGlobalAyahNumber(surahNumber, ayahInSurahNumber) {
    if (!await _ensureQuranStructure() || !quranStructureCache) return null;
    if (typeof surahNumber !== 'number' || typeof ayahInSurahNumber !== 'number' ||
        surahNumber < 1 || surahNumber > 114 || ayahInSurahNumber < 1) {
      return null;
    }

    const surahData = quranStructureCache.surahs.find(s => s.number === surahNumber);
    if (!surahData || ayahInSurahNumber > surahData.numberOfAyahs) {
      (dependencies.errorLogger.logWarning || console.warn)({
        message: "Invalid surahNumber or ayahInSurahNumber for getGlobalAyahNumber.",
        origin: "QuranVerseAnalyzer.getGlobalAyahNumber",
        context: { surahNumber, ayahInSurahNumber, surahData }
      });
      return null;
    }

    // `cumulativeAyahsStart` is the global number of the *first* ayah of this surah.
    // So, global number = (start of surah) + (ayah index within surah, which is ayahInSurahNumber - 1)
    return surahData.cumulativeAyahsStart + (ayahInSurahNumber - 1);
  }

  /**
   * Converts a global Ayah number (1-6236) to its Surah number and Ayah number within that Surah.
   * @param {number} globalAyahNumber - The global Ayah number.
   * @returns {Promise<{surahNumber: number, ayahInSurahNumber: number, surahName?: string} | null>}
   *          Object with Surah and Ayah details, or null if invalid input or structure not loaded.
   */
  async function getSurahAndAyahFromGlobal(globalAyahNumber) {
    if (!await _ensureQuranStructure() || !quranStructureCache) return null;
    if (typeof globalAyahNumber !== 'number' || globalAyahNumber < 1 || globalAyahNumber > quranStructureCache.totalAyahs) {
      return null;
    }

    // Find the Surah that contains this globalAyahNumber
    for (const surah of quranStructureCache.surahs) {
      const endAyahGlobal = surah.cumulativeAyahsStart + surah.numberOfAyahs - 1;
      if (globalAyahNumber >= surah.cumulativeAyahsStart && globalAyahNumber <= endAyahGlobal) {
        return {
          surahNumber: surah.number,
          ayahInSurahNumber: globalAyahNumber - surah.cumulativeAyahsStart + 1,
          surahName: surah.name // Optional, from cache
        };
      }
    }
    (dependencies.errorLogger.logWarning || console.warn)({
      message: `Could not map globalAyahNumber ${globalAyahNumber} to a Surah. Quran structure might be inconsistent.`,
      origin: "QuranVerseAnalyzer.getSurahAndAyahFromGlobal"
    });
    return null; // Should not happen if globalAyahNumber is within totalAyahs range
  }

  /**
   * Generates an array of global Ayah numbers for a given Surah and Ayah range.
   * @param {number} surahNumber
   * @param {number} startAyahInSurah
   * @param {number} endAyahInSurah
   * @returns {Promise<Array<number>>} Array of global Ayah numbers, or empty array on error.
   */
  async function getGlobalAyahNumbersForRange(surahNumber, startAyahInSurah, endAyahInSurah) {
    if (!await _ensureQuranStructure() || !quranStructureCache) return [];
    
    const validation = await validateAyahRange(surahNumber, startAyahInSurah, endAyahInSurah);
    if (!validation.isValid) return [];

    const actualStart = validation.correctedStart;
    const actualEnd = validation.correctedEnd;
    const globalNumbers = [];

    const surahData = quranStructureCache.surahs.find(s => s.number === surahNumber);
    if (!surahData) return [];

    for (let i = actualStart; i <= actualEnd; i++) {
        globalNumbers.push(surahData.cumulativeAyahsStart + (i - 1));
    }
    return globalNumbers;
  }
  
  function _setDependencies(injectedDeps) {
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.quranDataCacheAPI) dependencies.quranDataCacheAPI = injectedDeps.quranDataCacheAPI;
  }

  return {
    _setDependencies,
    validateAyahRange,
    getGlobalAyahNumber,
    getSurahAndAyahFromGlobal,
    getGlobalAyahNumbersForRange,
    // For testing or advanced use:
    // _getQuranStructure: async () => { await _ensureQuranStructure(); return quranStructureCache; }
  };

})(); // IIFE removed


/**
 * Initialization function for the QuranVerseAnalyzer.
 * It primarily ensures that core dependencies like quranDataCacheAPI are available.
 * It can also pre-load the Quran structure.
 * @param {object} deps
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * @param {object} deps.quranDataCacheAPI - API from quran.data.cache.js
 */
export async function initializeQuranVerseAnalyzer(deps) {
  quranVerseAnalyzer._setDependencies(deps);
  const { errorLogger } = deps;

  // Try to pre-load Quran structure for faster subsequent calls
  // if (!await quranVerseAnalyzer._getQuranStructure()) { // If _getQuranStructure was public
  // The _ensureQuranStructure is now internal, it will be called on first use.
  // (errorLogger.logWarning || console.warn).call(errorLogger, {
  //     message: "Quran structure could not be pre-loaded for QuranVerseAnalyzer. Operations might be slower on first call.",
  //     origin: "initializeQuranVerseAnalyzer"
  // });
  // }
  
  // console.info('[QuranVerseAnalyzer] Initialized.');
  // Return the public API
  return {
    validateAyahRange: quranVerseAnalyzer.validateAyahRange,
    getGlobalAyahNumber: quranVerseAnalyzer.getGlobalAyahNumber,
    getSurahAndAyahFromGlobal: quranVerseAnalyzer.getSurahAndAyahFromGlobal,
    getGlobalAyahNumbersForRange: quranVerseAnalyzer.getGlobalAyahNumbersForRange,
  };
}

export default quranVerseAnalyzer;
