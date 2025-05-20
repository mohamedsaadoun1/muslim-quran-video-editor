// js/features/quran-provider/quran-verse.analyzer.js
// وحدة تحليل آيات القرآن الكريم
const quranVerseAnalyzer = (() => {
  // الاعتمادات
  let dependencies = {
    errorLogger: console,
    quranDataCacheAPI: {
      getSurahDetail: async (surahNumber) => null,
      getQuranStructure: async () => ({ totalAyahs: 6236, surahs: [] })
    },
    localizationService: { translate: key => key }
  };
  
  // تخزين مؤقت للبنية القرآنية
  let quranStructureCache = null;
  
  /**
   * التأكد من تحميل بنية القرآن
   * @private
   * @returns {Promise<boolean>} هل البنية جاهزة؟
   */
  async function _ensureQuranStructure() {
    if (quranStructureCache) return true;
    
    try {
      const structure = await dependencies.quranDataCacheAPI.getQuranStructure();
      
      if (structure && structure.surahs && structure.surahs.length === 114) {
        let cumulative = 0;
        quranStructureCache = {
          ...structure,
          surahs: structure.surahs.map(s => {
            const surahWithCumulative = { 
              ...s, 
              cumulativeAyahsStart: cumulative + 1 
            };
            cumulative += s.numberOfAyahs;
            return surahWithCumulative;
          })
        };
        quranStructureCache.totalAyahs = cumulative;
        return true;
      }
      
      dependencies.errorLogger.warn({
        message: dependencies.localizationService.translate('error.quran.structure.incomplete') || 
                 'بيانات بنية القرآن غير مكتملة أو غير صحيحة',
        origin: 'QuranVerseAnalyzer._ensureQuranStructure'
      });
      
      return false;
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.verse.analysis.structure.load') || 
                 'فشل في تحميل أو معالجة بنية القرآن',
        origin: 'QuranVerseAnalyzer._ensureQuranStructure'
      });
      return false;
    }
  }
  
  /**
   * التحقق من صحة نطاق الآيات
   * @param {number} surahNumber - رقم السورة
   * @param {number} startAyah - بداية الآية
   * @param {number} endAyah - نهاية الآية
   * @returns {Promise<{isValid: boolean, message?: string, correctedStart?: number, correctedEnd?: number, numberOfAyahsInSurah?: number}>}
   */
  async function validateAyahRange(surahNumber, startAyah, endAyah) {
    // التحقق من صحة المدخلات الأساسية
    if (typeof surahNumber !== 'number' || surahNumber < 1 || surahNumber > 114) {
      return {
        isValid: false,
        message: dependencies.localizationService.translate('error.verse.range.invalid.surah', { surah: surahNumber }) || 
                 `رقم السورة غير صحيح (${surahNumber})`
      };
    }
    
    if (typeof startAyah !== 'number' || startAyah < 1) {
      return {
        isValid: false,
        message: dependencies.localizationService.translate('error.verse.range.start.required') || 
                 'يجب أن يكون رقم الآية البداية عددًا موجبًا'
      };
    }
    
    if (typeof endAyah !== 'number' || endAyah < 1) {
      return {
        isValid: false,
        message: dependencies.localizationService.translate('error.verse.range.end.required') || 
                 'يجب أن يكون رقم الآية النهاية عددًا موجبًا'
      };
    }
    
    try {
      // الحصول على معلومات السورة
      const surahInfo = await dependencies.quranDataCacheAPI.getSurahDetail(surahNumber);
      
      if (!surahInfo || typeof surahInfo.numberOfAyahs !== 'number') {
        return {
          isValid: false,
          message: dependencies.localizationService.translate('error.verse.range.surah.info', { surah: surahNumber }) || 
                   `تعذر الحصول على معلومات السورة ${surahNumber}`
        };
      }
      
      const { numberOfAyahs } = surahInfo;
      
      // التحقق من صحة الآيات داخل السورة
      if (startAyah > numberOfAyahs) {
        return {
          isValid: false,
          message: dependencies.localizationService.translate('error.verse.range.start.exceeds', { 
            start: startAyah, 
            surah: surahNumber, 
            total: numberOfAyahs 
          }) || 
          `رقم الآية البداية (${startAyah}) يتجاوز عدد الآيات في السورة ${surahNumber} (${numberOfAyahs})`,
          correctedStart: 1,
          correctedEnd: numberOfAyahs,
          numberOfAyahsInSurah: numberOfAyahs
        };
      }
      
      if (endAyah > numberOfAyahs) {
        return {
          isValid: false,
          message: dependencies.localizationService.translate('error.verse.range.end.exceeds', { 
            end: endAyah, 
            surah: surahNumber, 
            total: numberOfAyahs 
          }) || 
          `رقم الآية النهاية (${endAyah}) يتجاوز عدد الآيات في السورة ${surahNumber} (${numberOfAyahs})`,
          correctedStart: Math.min(startAyah, numberOfAyahs),
          correctedEnd: numberOfAyahs,
          numberOfAyahsInSurah: numberOfAyahs
        };
      }
      
      if (endAyah < startAyah) {
        return {
          isValid: true,
          message: dependencies.localizationService.translate('warning.verse.range.end.before.start', { 
            end: endAyah, 
            start: startAyah 
          }) || 
          `رقم الآية النهاية (${endAyah}) قبل البداية (${startAyah})، تم التصحيح`,
          correctedStart: startAyah,
          correctedEnd: startAyah,
          numberOfAyahsInSurah: numberOfAyahs
        };
      }
      
      return {
        isValid: true,
        correctedStart: startAyah,
        correctedEnd: endAyah,
        numberOfAyahsInSurah: numberOfAyahs
      };
      
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.verse.range.validation', { surah: surahNumber }) || 
                 `خطأ في التحقق من نطاق الآيات للسورة ${surahNumber}`,
        origin: 'QuranVerseAnalyzer.validateAyahRange'
      });
      
      return {
        isValid: false,
        message: dependencies.localizationService.translate('error.verse.range.unexpected') || 
                 'حدث خطأ غير متوقع أثناء التحقق من النطاق'
      };
    }
  }
  
  /**
   * تحويل رقم الآية النسبي إلى رقم عالمي
   * @param {number} surahNumber - رقم السورة
   * @param {number} ayahInSurahNumber - رقم الآية داخل السورة
   * @returns {Promise<number | null>} رقم الآية العالمي
   */
  async function getGlobalAyahNumber(surahNumber, ayahInSurahNumber) {
    if (!await _ensureQuranStructure() || !quranStructureCache) return null;
    
    // التحقق من صحة المدخلات
    if (typeof surahNumber !== 'number' || 
        typeof ayahInSurahNumber !== 'number' ||
        surahNumber < 1 || surahNumber > 114 || 
        ayahInSurahNumber < 1) {
      return null;
    }
    
    // العثور على بيانات السورة
    const surahData = quranStructureCache.surahs.find(s => s.number === surahNumber);
    
    if (!surahData || ayahInSurahNumber > surahData.numberOfAyahs) {
      dependencies.errorLogger.warn({
        message: dependencies.localizationService.translate('error.verse.global.number.invalid', { 
          surah: surahNumber, 
          ayah: ayahInSurahNumber 
        }) || 
        `رقم السورة أو الآية غير صحيح للحصول على الرقم العالمي (${surahNumber}:${ayahInSurahNumber})`,
        origin: 'QuranVerseAnalyzer.getGlobalAyahNumber',
        context: { surahNumber, ayahInSurahNumber, surahData }
      });
      return null;
    }
    
    // حساب الرقم العالمي
    return surahData.cumulativeAyahsStart + (ayahInSurahNumber - 1);
  }
  
  /**
   * تحويل الرقم العالمي إلى بيانات السورة والآية
   * @param {number} globalAyahNumber - الرقم العالمي للآية
   * @returns {Promise<{surahNumber: number, ayahInSurahNumber: number, surahName?: string} | null>}
   */
  async function getSurahAndAyahFromGlobal(globalAyahNumber) {
    if (!await _ensureQuranStructure() || !quranStructureCache) return null;
    
    // التحقق من صحة الرقم العالمي
    if (typeof globalAyahNumber !== 'number' || 
        globalAyahNumber < 1 || 
        globalAyahNumber > quranStructureCache.totalAyahs) {
      return null;
    }
    
    // البحث عن السورة المناسبة
    for (const surah of quranStructureCache.surahs) {
      const endAyahGlobal = surah.cumulativeAyahsStart + surah.numberOfAyahs - 1;
      
      if (globalAyahNumber >= surah.cumulativeAyahsStart && 
          globalAyahNumber <= endAyahGlobal) {
        return {
          surahNumber: surah.number,
          ayahInSurahNumber: globalAyahNumber - surah.cumulativeAyahsStart + 1,
          surahName: surah.name,
          surahEnglishName: surah.englishName,
          surahEnglishNameTranslation: surah.englishNameTranslation
        };
      }
    }
    
    dependencies.errorLogger.warn({
      message: dependencies.localizationService.translate('error.verse.global.map', { 
        number: globalAyahNumber 
      }) || 
      `تعذر ربط الرقم العالمي للآية ${globalAyahNumber} بسورة`,
      origin: 'QuranVerseAnalyzer.getSurahAndAyahFromGlobal'
    });
    
    return null;
  }
  
  /**
   * الحصول على قائمة الأرقام العالمية لآيات معينة
   * @param {number} surahNumber - رقم السورة
   * @param {number} startAyah - بداية الآية
   * @param {number} endAyah - نهاية الآية
   * @returns {Promise<Array<number>>} قائمة الأرقام العالمية
   */
  async function getGlobalAyahNumbersForRange(surahNumber, startAyah, endAyah) {
    if (!await _ensureQuranStructure() || !quranStructureCache) return [];
    
    // التحقق من صحة النطاق
    const validation = await validateAyahRange(surahNumber, startAyah, endAyah);
    
    if (!validation.isValid) {
      dependencies.errorLogger.warn({
        message: dependencies.localizationService.translate('warning.verse.range.validation', {
          surah: surahNumber,
          start: startAyah,
          end: endAyah,
          message: validation.message
        }) || 
        `نطاق الآية غير صحيح للسورة ${surahNumber}: ${validation.message}`,
        origin: 'QuranVerseAnalyzer.getGlobalAyahNumbersForRange'
      });
      
      return [];
    }
    
    const { correctedStart, correctedEnd } = validation;
    
    // العثور على بيانات السورة
    const surahData = quranStructureCache.surahs.find(s => s.number === surahNumber);
    
    if (!surahData) {
      dependencies.errorLogger.warn({
        message: dependencies.localizationService.translate('error.verse.range.surah.not.found', { 
          surah: surahNumber 
        }) || 
        `تعذر العثور على السورة ${surahNumber} في البنية`,
        origin: 'QuranVerseAnalyzer.getGlobalAyahNumbersForRange'
      });
      return [];
    }
    
    // إنشاء قائمة الأرقام العالمية
    const globalNumbers = [];
    for (let i = correctedStart; i <= correctedEnd; i++) {
      globalNumbers.push(surahData.cumulativeAyahsStart + (i - 1));
    }
    
    return globalNumbers;
  }
  
  /**
   * الحصول على بيانات الآية من النص
   * @param {string} verseText - نص الآية
   * @returns {Promise<{surahNumber: number, ayahNumber: number, globalNumber: number} | null>}
   */
  async function getVerseInfoFromText(verseText) {
    if (!verseText || typeof verseText !== 'string' || !verseText.trim()) {
      return null;
    }
    
    // في المستقبل يمكن استخدام واجهة بحث لتحليل النص
    dependencies.errorLogger.warn({
      message: dependencies.localizationService.translate('warning.verse.text.search.not.implemented') || 
               'بحث الآية بالنص لم يتم تنفيذه بعد',
      origin: 'QuranVerseAnalyzer.getVerseInfoFromText'
    });
    
    return null;
  }
  
  /**
   * الحصول على معلومات السورة
   * @param {number} surahNumber - رقم السورة
   * @returns {Promise<{number: number, name: string, englishName: string, numberOfAyahs: number} | null>}
   */
  async function getSurahInfo(surahNumber) {
    if (typeof surahNumber !== 'number' || surahNumber < 1 || surahNumber > 114) {
      return null;
    }
    
    if (!await _ensureQuranStructure() || !quranStructureCache) return null;
    
    return quranStructureCache.surahs.find(s => s.number === surahNumber) || null;
  }
  
  /**
   * الحصول على عدد الآيات في السورة
   * @param {number} surahNumber - رقم السورة
   * @returns {Promise<number | null>}
   */
  async function getAyahCountForSurah(surahNumber) {
    const surahInfo = await getSurahInfo(surahNumber);
    return surahInfo?.numberOfAyahs || null;
  }
  
  /**
   * التحقق من وجود آية معينة
   * @param {number} surahNumber - رقم السورة
   * @param {number} ayahNumber - رقم الآية
   * @returns {Promise<boolean>}
   */
  async function isAyahValid(surahNumber, ayahNumber) {
    const count = await getAyahCountForSurah(surahNumber);
    return count !== null && ayahNumber >= 1 && ayahNumber <= count;
  }
  
  /**
   * تعيين الاعتمادات
   * @param {Object} injectedDeps - الاعتمادات
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.quranDataCacheAPI) dependencies.quranDataCacheAPI = injectedDeps.quranDataCacheAPI;
    if (injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService;
  }
  
  /**
   * إرجاع البنية الكاملة للقرآن
   * @returns {Promise<Object | null>} بنية القرآن
   */
  async function getQuranStructure() {
    if (!await _ensureQuranStructure() || !quranStructureCache) return null;
    return { ...quranStructureCache };
  }
  
  return {
    _setDependencies,
    validateAyahRange,
    getGlobalAyahNumber,
    getSurahAndAyahFromGlobal,
    getGlobalAyahNumbersForRange,
    getVerseInfoFromText,
    getSurahInfo,
    getAyahCountForSurah,
    isAyahValid,
    getQuranStructure
  };
})();

/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 * @returns {Object} واجهة عامة للوحدة
 */
export async function initializeQuranVerseAnalyzer(deps) {
  quranVerseAnalyzer._setDependencies(deps);
  
  // محاولة تحميل البنية للتخزين المؤقت
  try {
    await quranVerseAnalyzer.getQuranStructure();
  } catch (error) {
    deps.errorLogger.warn({
      message: deps.localizationService.translate('warning.quran.structure.preload.failed') || 
               'فشل في تحميل بنية القرآن مسبقًا',
      origin: 'initializeQuranVerseAnalyzer'
    });
  }
  
  return {
    validateAyahRange: quranVerseAnalyzer.validateAyahRange,
    getGlobalAyahNumber: quranVerseAnalyzer.getGlobalAyahNumber,
    getSurahAndAyahFromGlobal: quranVerseAnalyzer.getSurahAndAyahFromGlobal,
    getGlobalAyahNumbersForRange: quranVerseAnalyzer.getGlobalAyahNumbersForRange,
    getVerseInfoFromText: quranVerseAnalyzer.getVerseInfoFromText,
    getSurahInfo: quranVerseAnalyzer.getSurahInfo,
    getAyahCountForSurah: quranVerseAnalyzer.getAyahCountForSurah,
    isAyahValid: quranVerseAnalyzer.isAyahValid,
    getQuranStructure: quranVerseAnalyzer.getQuranStructure
  };
}

export default quranVerseAnalyzer;
