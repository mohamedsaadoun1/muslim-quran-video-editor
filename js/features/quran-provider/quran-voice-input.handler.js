// js/features/quran-provider/quran-voice-input.handler.js
import DOMElements from '../../core/dom-elements.js';
import { 
  ACTIONS, 
  EVENTS, 
  DEFAULT_PROJECT_SCHEMA,
  APP_CONSTANTS
} from '../../config/app.constants.js';
import notificationPresenter from '../../shared-ui-components/notification.presenter.js';
import spinnerView from '../../shared-ui-components/spinner.view.js';

/**
 * معالج إدخال القرآن الصوتي
 */
const quranVoiceInputHandler = (() => {
  // الاعتمادات
  let dependencies = {
    stateStore: { 
      dispatch: () => {}, 
      getState: () => ({ currentProject: null }) 
    },
    eventAggregator: { publish: () => {} },
    errorLogger: console,
    speechRecognitionWrapper: {
      isSupported: () => false, 
      initialize: () => false, 
      start: () => false, 
      stop: () => {},
      setDefaultCallbacks: () => {}, 
      isCurrentlyRecognizing: () => false,
    },
    quranDataCacheAPI: {
      getSurahsList: async () => [], 
      getSurahDetail: async () => ({ numberOfAyahs: 0 }),
    },
    quranVerseAnalyzerAPI: {
      validateAyahRange: async () => ({ isValid: false }),
    },
    localizationService: { 
      translate: key => key,
      getCurrentLanguage: () => 'ar'
    }
  };
  
  // مراجع عناصر DOM
  let voiceSearchButton = null;
  let voiceSearchStatusElement = null;
  
  // بيانات السور للبحث
  let surahsListForMatching = [];
  
  // خريطة أرقام عربية
  const ARABIC_NUMBERS_MAP = {
    '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4,
    '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9,
    'واحد': 1, 'اثنين': 2, 'اثنان': 2, 'ثلاثة': 3, 
    'اربعة': 4, 'أربعة': 4, 'خمسة': 5, 'ستة': 6, 
    'سبعة': 7, 'ثمانية': 8, 'تسعة': 9, 'عشرة': 10,
    'مئتين وخمسة وخمسين': 255, 'مائة': 100, 'مئتين': 200
  };
  
  // أنماط البحث
  const SEARCH_PATTERNS = {
    SURAH_NAME: /(?:سورة|سوره)\s+([\u0600-\u06FF\s\d]+)/i,
    AYAH_NUMBER: /(?:آية|اية|الايه|الآيه|رقم)\s+([\u0600-\u06FF\s\d]+)/i,
    AYAH_RANGE: /(?:من|مِن)\s+([\u0600-\u06FF\s\d]+)\s+(?:الى|إلى|لِ)\s+([\u0600-\u06FF\s\d]+)/i
  };
  
  /**
   * تحويل نص عربي إلى رقم
   * @param {string} text - النص العربي
   * @returns {number | null} الرقم أو null إذا لم يتم العثور عليه
   */
  function _arabicTextToNumber(text) {
    if (!text) return null;
    
    const cleanedText = text.trim()
      .replace(/ال|آية |اية |الايه |الآيه/gi, '')
      .replace(/[\u0660-\u0669]/g, c => 
        String.fromCharCode(c.charCodeAt(0) - 0x0660 + 0x0030)
      ) // تحويل الأرقام العربية إلى أرقام لاتينية
      .replace(/[\u06F0-\u06F9]/g, c => 
        String.fromCharCode(c.charCodeAt(0) - 0x06F0 + 0x0030)
      );
    
    if (ARABIC_NUMBERS_MAP[cleanedText]) {
      return ARABIC_NUMBERS_MAP[cleanedText];
    }
    
    const num = parseInt(cleanedText, 10);
    return isNaN(num) ? null : num;
  }
  
  /**
   * إعداد قائمة السور للبحث
   * @private
   */
  async function _loadSurahNamesForMatching() {
    if (surahsListForMatching.length > 0) return;
    
    try {
      const surahs = await dependencies.quranDataCacheAPI.getSurahsList();
      
      if (surahs && surahs.length > 0) {
        surahsListForMatching = surahs.map(s => ({
          number: s.number,
          nameArSimple: s.name.replace(/سُورَةُ |ٱلْ/g, '').trim(),
          nameEn: s.englishName.toLowerCase(),
          englishNameTranslation: s.englishNameTranslation || ''
        }));
      }
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.load.surah.names') || 
                 'فشل في تحميل أسماء السور للبحث',
        origin: 'QuranVoiceInputHandler._loadSurahNamesForMatching'
      });
    }
  }
  
  /**
   * البحث عن سورة باستخدام اسمها
   * @param {string} spokenName - الاسم المسموع
   * @returns {number | null} رقم السورة أو null إذا لم يتم العثور عليها
   */
  function _findSurahBySpokenName(spokenName) {
    if (!spokenName || surahsListForMatching.length === 0) return null;
    
    const cleanedSpokenName = spokenName
      .replace(/سورة |سوره |ال/gi, '')
      .trim()
      .toLowerCase();
    
    for (const surah of surahsListForMatching) {
      // مقارنة الاسم العربي البسيط
      if (surah.nameArSimple.includes(cleanedSpokenName) || 
          cleanedSpokenName.includes(surah.nameArSimple)) {
        return surah.number;
      }
      
      // مقارنة الاسم الإنجليزي
      if (surah.nameEn.includes(cleanedSpokenName)) {
        return surah.number;
      }
    }
    
    // محاولة مطابقة الرقم إذا تم ذكره كرقم
    const numberMatch = cleanedSpokenName.match(/\d+/);
    if (numberMatch) {
      const num = parseInt(numberMatch[0], 10);
      if (num >= 1 && num <= 114) return num;
    }
    
    return null;
  }
  
  /**
   * تحليل النص المسموع
   * @param {string} transcript - النص المسموع
   * @returns {Promise<{surahId: number, startAyah: number, endAyah: number} | null>}
   */
  async function _parseTranscript(transcript) {
    if (!transcript) return null;
    
    transcript = transcript.toLowerCase().trim();
    let surahNumber = null;
    let startAyah = null;
    let endAyah = null;
    
    // معالجة خاصة لآية الكرسي
    if (transcript.includes('اية الكرسي') || transcript.includes('آية الكرسي')) {
      return {
        surahId: 2,
        startAyah: 255,
        endAyah: 255
      };
    }
    
    // البحث عن السورة
    let surahNameMatch = transcript.match(SEARCH_PATTERNS.SURAH_NAME);
    let surahNameSpoken = surahNameMatch ? surahNameMatch[1].trim() : null;
    
    if (surahNameSpoken) {
      surahNumber = _findSurahBySpokenName(surahNameSpoken);
    } else {
      const firstFewWords = transcript.split(/\s+/).slice(0, 3).join(' ');
      surahNumber = _findSurahBySpokenName(firstFewWords);
    }
    
    // البحث عن الآيات
    const singleAyahMatch = transcript.match(SEARCH_PATTERNS.AYAH_NUMBER);
    const rangeAyahMatch = transcript.match(SEARCH_PATTERNS.AYAH_RANGE);
    
    if (rangeAyahMatch) {
      startAyah = _arabicTextToNumber(rangeAyahMatch[1]);
      endAyah = _arabicTextToNumber(rangeAyahMatch[2]);
    } else if (singleAyahMatch) {
      startAyah = _arabicTextToNumber(singleAyahMatch[1]);
      endAyah = startAyah;
    }
    
    // التحقق من صحة الآيات
    if (surahNumber !== null) {
      const surahInfo = await dependencies.quranDataCacheAPI.getSurahDetail(surahNumber);
      
      if (surahInfo && surahInfo.numberOfAyahs > 0) {
        if (startAyah === null && endAyah === null) {
          startAyah = 1;
          endAyah = surahInfo.numberOfAyahs;
        } else {
          startAyah = startAyah ? Math.max(1, Math.min(startAyah, surahInfo.numberOfAyahs)) : 1;
          endAyah = endAyah ? Math.max(startAyah, Math.min(endAyah, surahInfo.numberOfAyahs)) : startAyah;
        }
      } else if (startAyah !== null || endAyah !== null) {
        dependencies.errorLogger.warn({
          message: dependencies.localizationService.translate('warning.surah.info.not.found', {
            surah: surahNumber
          }) || 
          `تعذر الحصول على معلومات السورة ${surahNumber} للتحقق من الآيات`,
          origin: 'QuranVoiceInputHandler._parseTranscript'
        });
        return null;
      }
    }
    
    if (surahNumber) {
      return {
        surahId: surahNumber,
        startAyah,
        endAyah
      };
    }
    
    return null;
  }
  
  /**
   * معالجة زر البحث الصوتي
   * @private
   */
  function _handleVoiceSearchToggle() {
    if (!dependencies.speechRecognitionWrapper.isSupported()) {
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('voice.search.unsupported') || 
                 'البحث الصوتي غير مدعوم في هذا المتصفح',
        type: 'error'
      });
      return;
    }
    
    if (!dependencies.speechRecognitionWrapper.isCurrentlyRecognizing()) {
      const language = dependencies.localizationService.getCurrentLanguage() === 'en' ? 'en-US' : 'ar-SA';
      
      dependencies.speechRecognitionWrapper.initialize(language, dependencies.errorLogger);
      dependencies.speechRecognitionWrapper.start(undefined, dependencies.errorLogger);
    } else {
      dependencies.speechRecognitionWrapper.stop();
    }
  }
  
  /**
   * تحديث حالة البحث الصوتي
   * @param {boolean} isListening - هل النظام يستمع؟
   */
  function _updateVoiceSearchStatus(isListening) {
    if (voiceSearchStatusElement) {
      voiceSearchStatusElement.textContent = isListening ? 
        dependencies.localizationService.translate('voice.search.listening') || 'جارٍ الاستماع...' : 
        dependencies.localizationService.translate('voice.search.ready') || 'جاهز للبحث الصوتي';
    }
    
    if (voiceSearchButton) {
      voiceSearchButton.classList.toggle('listening', isListening);
    }
  }
  
  /**
   * معالجة النتائج الصوتية
   * @param {string} transcript - النص المسموع
   * @param {boolean} isFinal - هل النتيجة نهائية؟
   */
  async function _handleVoiceResult(transcript, isFinal) {
    if (voiceSearchStatusElement) {
      voiceSearchStatusElement.textContent = `"${transcript}"`;
    }
    
    if (!isFinal) return;
    
    try {
      const parsed = await _parseTranscript(transcript);
      
      if (parsed && parsed.surahId) {
        notificationPresenter.showNotification({
          message: dependencies.localizationService.translate('voice.search.found', {
            surah: parsed.surahId,
            start: parsed.startAyah,
            end: parsed.endAyah
          }) || 
          `تم العثور على: السورة ${parsed.surahId}، الآيات ${parsed.startAyah}-${parsed.endAyah}`,
          type: 'success'
        });
        
        const validatedRange = await dependencies.quranVerseAnalyzerAPI.validateAyahRange(
          parsed.surahId, 
          parsed.startAyah, 
          parsed.endAyah
        );
        
        if (validatedRange.isValid) {
          dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
            quranSelection: {
              surahId: validatedRange.correctedStartSurah || validatedRange.correctedSurah,
              startAyah: validatedRange.correctedStart,
              endAyah: validatedRange.correctedEnd,
              reciterId: dependencies.stateStore.getState().currentProject?.quranSelection?.reciterId || null,
              translationId: dependencies.stateStore.getState().currentProject?.quranSelection?.translationId || null
            }
          });
        } else {
          notificationPresenter.showNotification({
            message: validatedRange.message,
            type: 'warning'
          });
        }
      } else {
        notificationPresenter.showNotification({
          message: dependencies.localizationService.translate('voice.search.no.match') || 
                   'لم يتم التعرف على أمر قرآني واضح',
          type: 'warning'
        });
      }
    } catch (error) {
      dependencies.errorLogger.error({
        error,
        message: dependencies.localizationService.translate('error.voice.search.process') || 
                 'حدث خطأ أثناء معالجة النص المسموع',
        origin: 'QuranVoiceInputHandler._handleVoiceResult'
      });
    }
  }
  
  /**
   * معالجة أخطاء البحث الصوتي
   * @param {string} errorType - نوع الخطأ
   * @param {string} errorMessage - رسالة الخطأ
   */
  function _handleVoiceError(errorType, errorMessage) {
    if (voiceSearchStatusElement) {
      voiceSearchStatusElement.textContent = dependencies.localizationService.translate('panel.quran.voiceSearch') || 'البحث الصوتي';
    }
    
    if (voiceSearchButton) {
      voiceSearchButton.classList.remove('listening');
    }
    
    if (errorType === 'no-speech' || errorType === 'aborted') {
      return;
    }
    
    notificationPresenter.showNotification({
      message: `${dependencies.localizationService.translate('voice.search.error') || 'خطأ في البحث الصوتي'}: ${errorMessage}`,
      type: 'error'
    });
  }
  
  /**
   * معالجة عدم وجود تطابق للبحث
   */
  function _handleVoiceNoMatch() {
    if (voiceSearchStatusElement) {
      voiceSearchStatusElement.textContent = dependencies.localizationService.translate('voice.search.try.again') || 
                                             'لم يتم التعرف على الكلام. حاول مرة أخرى.';
    }
  }
  
  /**
   * تحديد الاعتمادات
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
    toggleListening: _handleVoiceSearchToggle,
    setVoiceSearchStatus: _updateVoiceSearchStatus,
    parseTranscript: _parseTranscript,
    handleVoiceResult: _handleVoiceResult,
    handleVoiceError: _handleVoiceError,
    handleVoiceNoMatch: _handleVoiceNoMatch
  };
})();

/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 * @returns {Object} واجهة عامة للوحدة
 */
export async function initializeQuranVoiceInputHandler(deps) {
  quranVoiceInputHandler._setDependencies(deps);
  const {
    speechRecognitionWrapper, 
    stateStore, 
    localizationService
  } = deps;
  
  // تعيين مراجع عناصر DOM
  quranVoiceInputHandler.voiceSearchBtnRef = DOMElements.voiceSearchQuranBtn;
  quranVoiceInputHandler.voiceSearchStatusElRef = DOMElements.voiceSearchStatus;
  
  // تحميل أسماء السور للبحث
  await _loadSurahNamesForMatching(deps);
  
  // إعداد واجهة المستخدم
  if (speechRecognitionWrapper.isSupported()) {
    // تحديد اللغة
    const language = localizationService.getCurrentLanguage() === 'en' ? 'en-US' : 'ar-SA';
    
    // تعيين الدوال الافتراضية للبحث الصوتي
    speechRecognitionWrapper.setDefaultCallbacks({
      onStart: () => {
        if (quranVoiceInputHandler.voiceSearchStatusElRef) {
          quranVoiceInputHandler.voiceSearchStatusElRef.textContent = 
            localizationService.translate('voice.search.listening') || 'جارٍ الاستماع...';
        }
        if (quranVoiceInputHandler.voiceSearchBtnRef) {
          quranVoiceInputHandler.voiceSearchBtnRef.classList.add('listening');
        }
      },
      onEnd: () => {
        if (quranVoiceInputHandler.voiceSearchStatusElRef) {
          quranVoiceInputHandler.voiceSearchStatusElRef.textContent = 
            localizationService.translate('panel.quran.voiceSearch') || 'البحث الصوتي';
        }
        if (quranVoiceInputHandler.voiceSearchBtnRef) {
          quranVoiceInputHandler.voiceSearchBtnRef.classList.remove('listening');
        }
      },
      onResult: async (transcript, isFinal) => {
        await quranVoiceInputHandler.handleVoiceResult(transcript, isFinal);
      },
      onError: quranVoiceInputHandler.handleVoiceError,
      onNoMatch: quranVoiceInputHandler.handleVoiceNoMatch
    });
    
    // تعيين مستمعي الأحداث للزر
    if (quranVoiceInputHandler.voiceSearchBtnRef) {
      quranVoiceInputHandler.voiceSearchBtnRef.addEventListener('click', () => {
        if (!speechRecognitionWrapper.isCurrentlyRecognizing()) {
          speechRecognitionWrapper.initialize(
            localizationService.getCurrentLanguage() === 'en' ? 'en-US' : 'ar-SA', 
            deps.errorLogger
          );
          speechRecognitionWrapper.start(undefined, deps.errorLogger);
        } else {
          speechRecognitionWrapper.stop();
        }
      });
    } else {
      deps.errorLogger.warn({
        message: deps.localizationService.translate('warning.voice.search.button.not.found') || 
                 'زر البحث الصوتي غير موجود. تعطيل البحث الصوتي.',
        origin: 'initializeQuranVoiceInputHandler'
      });
    }
  } else {
    if (quranVoiceInputHandler.voiceSearchBtnRef) {
      quranVoiceInputHandler.voiceSearchBtnRef.disabled = true;
    }
    if (quranVoiceInputHandler.voiceSearchStatusElRef) {
      quranVoiceInputHandler.voiceSearchStatusElRef.textContent = 
        localizationService.translate('voice.search.not.supported') || 'البحث الصوتي غير مدعوم';
    }
  }
  
  return {
    toggleListening: () => {
      if (speechRecognitionWrapper.isSupported()) {
        if (!speechRecognitionWrapper.isCurrentlyRecognizing()) {
          speechRecognitionWrapper.start(undefined, deps.errorLogger);
        } else {
          speechRecognitionWrapper.stop();
        }
      } else {
        notificationPresenter.showNotification({
          message: localizationService.translate('voice.search.unsupported') || 
                   'البحث الصوتي غير مدعوم في هذا المتصفح',
          type: 'error'
        });
      }
    },
    cleanup: () => {
      if (quranVoiceInputHandler.voiceSearchBtnRef) {
        quranVoiceInputHandler.voiceSearchBtnRef.removeEventListener('click', () => {});
      }
      
      if (speechRecognitionWrapper.isSupported() && 
          speechRecognitionWrapper.isCurrentlyRecognizing()) {
        speechRecognitionWrapper.stop();
      }
    }
  };
}

/**
 * تحميل أسماء السور للبحث
 * @param {Object} deps - الاعتمادات
 */
async function _loadSurahNamesForMatching(deps) {
  if (quranVoiceInputHandler.surahsListForMatching && 
      quranVoiceInputHandler.surahsListForMatching.length > 0) return;
  
  try {
    const surahs = await deps.quranDataCacheAPI.getSurahsList();
    
    if (surahs && surahs.length > 0) {
      quranVoiceInputHandler.surahsListForMatching = surahs.map(s => ({
        number: s.number,
        nameArSimple: s.name.replace(/سُورَةُ |ٱلْ/g, '').trim(),
        nameEn: s.englishName.toLowerCase(),
        englishNameTranslation: s.englishNameTranslation || ''
      }));
    }
  } catch (error) {
    deps.errorLogger.error({
      error,
      message: deps.localizationService.translate('error.load.surah.names') || 
               'فشل في تحميل أسماء السور للبحث',
      origin: 'QuranVoiceInputHandler._loadSurahNamesForMatching'
    });
  }
}

export default quranVoiceInputHandler;
