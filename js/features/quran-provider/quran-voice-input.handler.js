// js/features/quran-provider/quran-voice-input.handler.js

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, EVENTS, DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';
// speechRecognitionWrapper, quranDataCacheAPI, quranVerseAnalyzerAPI, etc. will be injected

const quranVoiceInputHandler = (() => {
  let dependencies = {
    stateStore: { dispatch: () => {}, getState: () => ({ currentProject: null }) },
    eventAggregator: { publish: () => {} },
    errorLogger: console,
    notificationServiceAPI: { showInfo: () => {}, showError: () => {}, showWarning: () => {} },
    speechRecognitionWrapper: {
      isSupported: () => false, initialize: () => false, start: () => false, stop: () => {},
      setDefaultCallbacks: () => {}, isCurrentlyRecognizing: () => false,
    },
    quranDataCacheAPI: {
        getSurahsList: async () => [], // Expected to return [{ number, name, englishName, ... }]
    },
    quranVerseAnalyzerAPI: {
        validateAyahRange: async () => ({ isValid: false }),
        // getSurahByApproxName: async (name) => null, // Helper if dataCache can provide this
    },
    localizationService: { translate: key => key },
  };

  let voiceSearchButton = null;
  let voiceSearchStatusElement = null;
  let surahsListForMatching = []; // Cache for surah names

  const ARABIC_NUMBERS_MAP = {
    'واحد': 1, 'اثنين': 2, 'اثنان': 2, 'ثلاثة': 3, 'اربعة': 4, 'أربعة': 4, 'خمسة': 5,
    'ستة': 6, 'سبعة': 7, 'ثمانية': 8, 'تسعة': 9, 'عشرة': 10,
    // Add more numbers as needed, or use a library for full number parsing from text
    // For larger numbers, parsing will be more complex
    'مئتين وخمسة وخمسين': 255, // Example for Ayat al-Kursi
    'مائة': 100, 'مئتين': 200,
  };

  function _arabicTextToNumber(text) {
    if (!text) return null;
    const cleanedText = text.trim().replace(/ال|آية /g, '').trim(); // Remove "ال" and "آية "
    if (ARABIC_NUMBERS_MAP[cleanedText]) {
      return ARABIC_NUMBERS_MAP[cleanedText];
    }
    const num = parseInt(cleanedText, 10);
    return isNaN(num) ? null : num;
  }

  /** Prepares the list of Surahs for name matching. @private */
  async function _loadSurahNamesForMatching() {
    if (surahsListForMatching.length > 0) return;
    try {
      const surahs = await dependencies.quranDataCacheAPI.getSurahsList();
      if (surahs) {
        surahsListForMatching = surahs.map(s => ({
          number: s.number,
          nameArSimple: s.name.replace(/سُورَةُ |ٱلْ/g, '').trim(), // Simplified Arabic name
          nameEn: s.englishName.toLowerCase(),
        }));
      }
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error)({
        error, message: "Failed to load Surah names for voice matching.",
        origin: "QuranVoiceInputHandler._loadSurahNamesForMatching"
      });
    }
  }

  /** Tries to find a Surah number by its approximate spoken name. @private */
  function _findSurahBySpokenName(spokenName) {
    if (!spokenName || surahsListForMatching.length === 0) return null;
    const cleanedSpokenName = spokenName.replace(/سورة |ال/g, '').trim().toLowerCase();

    for (const surah of surahsListForMatching) {
      // Match simplified Arabic name (e.g., "فاتحة" for "ٱلْفَاتِحَةِ")
      // This simple check might need to be more robust (e.g., Levenshtein distance for fuzzy matching)
      if (surah.nameArSimple.includes(cleanedSpokenName) || cleanedSpokenName.includes(surah.nameArSimple)) {
        return surah.number;
      }
      // Match English name
      if (surah.nameEn.includes(cleanedSpokenName)) {
        return surah.number;
      }
    }
    // Try to match by number if spoken as number
    const numberMatch = cleanedSpokenName.match(/\d+/);
    if (numberMatch) {
        const num = parseInt(numberMatch[0], 10);
        if (num >= 1 && num <= 114) return num;
    }
    return null;
  }


  /** Parses the transcript to extract Surah, start Ayah, and end Ayah. Very basic. @private */
  async function _parseTranscript(transcript) {
    transcript = transcript.toLowerCase().trim();
    let surahNumber = null;
    let startAyah = null;
    let endAyah = null;

    // Pattern: "سورة [اسم السورة] (آية [رقم الآية] | من [رقم] الى [رقم])"
    // Example: "سورة البقرة آية مئتين وخمسة وخمسين"
    // Example: "سورة الفاتحة من واحد الى سبعة"
    // Example: "الفاتحة" (implies whole surah)
    // Example: "آية الكرسي" (needs special handling or a mapping)

    // Simplistic keyword spotting. Real NLP is much harder.
    let surahNameMatch = transcript.match(/(?:سورة|سوره)\s+([\u0600-\u06FF\w\s]+?)(?=\s+آية|\s+من|\s+الى|$)/i);
    let surahNameSpoken = surahNameMatch ? surahNameMatch[1].trim() : null;
    
    if (surahNameSpoken) {
      surahNumber = _findSurahBySpokenName(surahNameSpoken);
    } else {
      // Try to find surah name if "سورة" is not mentioned but name is at start
      const firstFewWords = transcript.split(/\s+/).slice(0, 3).join(' ');
      surahNumber = _findSurahBySpokenName(firstFewWords);
      if(surahNumber) {
          // Found a surah, assume this is it unless further context suggests otherwise
      }
    }
    
    // If surah found, look for ayahs, otherwise try to find global ayah references (harder)
    // Special case for "آية الكرسي"
    if (transcript.includes('اية الكرسي') || transcript.includes('آية الكرسي')) {
        surahNumber = 2;
        startAyah = 255;
        endAyah = 255;
    } else {
        const ayahNumRegex = /(?:آية|اية|الايه|الآيه|رقم)\s+([\u0600-\u06FF\w\s]+)/i;
        const ayahRangeRegex = /(?:من|مِن)\s+([\u0600-\u06FF\w\s]+?)\s+(?:الى|إلى|لِ)\s+([\u0600-\u06FF\w\s]+)/i;

        const singleAyahMatch = transcript.match(ayahNumRegex);
        const rangeAyahMatch = transcript.match(ayahRangeRegex);

        if (rangeAyahMatch) {
            startAyah = _arabicTextToNumber(rangeAyahMatch[1]);
            endAyah = _arabicTextToNumber(rangeAyahMatch[2]);
        } else if (singleAyahMatch) {
            startAyah = _arabicTextToNumber(singleAyahMatch[1]);
            endAyah = startAyah; // Single Ayah
        }
    }


    if (surahNumber === null && (startAyah !== null || endAyah !== null)) {
        // Ayah number mentioned but no clear Surah - ambiguous for this simple parser
        // Could try to get current surah from state but that's risky.
        (dependencies.errorLogger.logWarning || console.warn)('Ayah number(s) detected without a clear Surah in voice command.');
        return null;
    }
    
    if (surahNumber !== null) {
      // Validate and correct ayahs for the found surah
      const surahInfo = await dependencies.quranDataCacheAPI.getSurahDetail(surahNumber);
      if (surahInfo && surahInfo.numberOfAyahs > 0) {
          if (startAyah === null && endAyah === null) { // No ayahs mentioned, assume whole surah
              startAyah = 1;
              endAyah = surahInfo.numberOfAyahs;
          } else {
              startAyah = startAyah ? Math.max(1, Math.min(startAyah, surahInfo.numberOfAyahs)) : 1;
              endAyah = endAyah ? Math.max(startAyah, Math.min(endAyah, surahInfo.numberOfAyahs)) : startAyah;
          }
      } else if (startAyah !== null || endAyah !== null) {
          // Surah found but no info, or Ayah specified for an invalid Surah - error
          (dependencies.errorLogger.logWarning || console.warn)(`Could not validate Ayah numbers for Surah ${surahNumber}. Info:`, surahInfo);
          return null;
      }
    }


    if (surahNumber) {
      return { surahId: surahNumber, startAyah, endAyah };
    }
    return null; // Could not parse
  }

  /** Handles the voice search button click. */
  function _handleVoiceSearchToggle() {
    if (!dependencies.speechRecognitionWrapper.isSupported()) {
      dependencies.notificationServiceAPI.showError('البحث الصوتي غير مدعوم في هذا المتصفح.');
      return;
    }
    if (!dependencies.speechRecognitionWrapper.isCurrentlyRecognizing()) {
        // Make sure it's initialized (could be done once in initializeQuranVoiceInputHandler)
        dependencies.speechRecognitionWrapper.initialize(
            dependencies.localizationService.getCurrentLanguage() === 'en' ? 'en-US' : 'ar-SA', // Adapt language
            dependencies.errorLogger
        );
        dependencies.speechRecognitionWrapper.start(undefined, dependencies.errorLogger); // Use default callbacks
    } else {
        dependencies.speechRecognitionWrapper.stop();
    }
  }

  function _setDependencies(injectedDeps) {
    Object.assign(dependencies, injectedDeps);
  }

  return {
    _setDependencies,
    // toggleListening: _handleVoiceSearchToggle, // Expose this if button handler is elsewhere
  };
})();


/**
 * Initialization function for the QuranVoiceInputHandler.
 * @param {object} deps
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../core/event-aggregator.js').default} deps.eventAggregator
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * @param {import('../../shared-ui-components/notification.presenter.js').ReturnType<initializeNotificationPresenter>} deps.notificationServiceAPI
 * @param {import('../../services/speech.recognition.wrapper.js').default} deps.speechRecognitionWrapper
 * @param {object} deps.quranDataCacheAPI
 * @param {object} deps.quranVerseAnalyzerAPI
 * @param {import('../../core/localization.service.js').default} deps.localizationService
 */
export async function initializeQuranVoiceInputHandler(deps) {
  quranVoiceInputHandler._setDependencies(deps);
  const {
    speechRecognitionWrapper, stateStore, notificationServiceAPI,
    errorLogger, quranDataCacheAPI, quranVerseAnalyzerAPI, localizationService
  } = deps;

  quranVoiceInputHandler.voiceSearchBtnRef = DOMElements.voiceSearchQuranBtn;
  quranVoiceInputHandler.voiceSearchStatusElRef = DOMElements.voiceSearchStatus;

  await (async function _loadSurahNamesForMatchingLocal() { /* logic of _loadSurahNamesForMatching */ 
    if (quranVoiceInputHandler.surahsListForMatching && quranVoiceInputHandler.surahsListForMatching.length > 0) return;
    const surahs = await quranDataCacheAPI.getSurahsList();
    if (surahs) {
        quranVoiceInputHandler.surahsListForMatching = surahs.map(s => ({number:s.number, nameArSimple:s.name.replace(/سُورَةُ |ٱلْ/g, '').trim(), nameEn:s.englishName.toLowerCase()}));
    }
  })();


  const _handleVoiceToggleLocal = () => { /* logic of _handleVoiceSearchToggle */ 
      if (!speechRecognitionWrapper.isSupported()) { notificationServiceAPI.showError('البحث الصوتي غير مدعوم.'); return; }
      if (!speechRecognitionWrapper.isCurrentlyRecognizing()) {
          speechRecognitionWrapper.initialize(localizationService.getCurrentLanguage() === 'en' ? 'en-US' : 'ar-SA', errorLogger);
          speechRecognitionWrapper.start(undefined, errorLogger);
      } else {
          speechRecognitionWrapper.stop();
      }
  };


  if (speechRecognitionWrapper.isSupported()) {
    speechRecognitionWrapper.setDefaultCallbacks({
      onStart: () => {
        if (quranVoiceInputHandler.voiceSearchStatusElRef) quranVoiceInputHandler.voiceSearchStatusElRef.textContent = localizationService.translate('voiceSearch.listening') || 'جارٍ الاستماع...';
        if (quranVoiceInputHandler.voiceSearchBtnRef) quranVoiceInputHandler.voiceSearchBtnRef.classList.add('listening'); // Add CSS for active state
      },
      onEnd: () => {
        if (quranVoiceInputHandler.voiceSearchStatusElRef) quranVoiceInputHandler.voiceSearchStatusElRef.textContent = localizationService.translate('panel.quran.voiceSearch') || 'البحث الصوتي';
        if (quranVoiceInputHandler.voiceSearchBtnRef) quranVoiceInputHandler.voiceSearchBtnRef.classList.remove('listening');
      },
      onResult: async (transcript, isFinal) => {
        if (quranVoiceInputHandler.voiceSearchStatusElRef) quranVoiceInputHandler.voiceSearchStatusElRef.textContent = `"${transcript}"`;
        if (isFinal) {
          // console.debug(`[QuranVoiceInput] Final transcript: "${transcript}"`);
          const parsed = await (async function _parseTranscriptLocal(text) { /* logic of _parseTranscript using quranDataCacheAPI, quranVerseAnalyzerAPI */ 
                // This is a placeholder for the complex parsing logic.
                // It needs _findSurahBySpokenName (using quranVoiceInputHandler.surahsListForMatching)
                // and _arabicTextToNumber. And validation with quranVerseAnalyzerAPI.
                text = text.toLowerCase().trim();
                if (text.includes("الفاتحة")) return { surahId: 1, startAyah: 1, endAyah: 7 };
                if (text.includes("البقرة") && (text.includes("مائتين وخمسة وخمسين") || text.includes("255"))) return { surahId: 2, startAyah: 255, endAyah: 255 };
                // ... more robust parsing ...
                return null; 
          })(transcript);

          if (parsed && parsed.surahId) {
            notificationServiceAPI.showSuccess(localizationService.translate('voiceSearch.resultFound', {
                surah: parsed.surahId, // Would be better to have surah name here
                start: parsed.startAyah,
                end: parsed.endAyah
            }) || `تم العثور على: السورة ${parsed.surahId}، الآيات ${parsed.startAyah}-${parsed.endAyah}`);
            
            // Ensure any selected Ayah number is valid for the new Surah after parsing.
            // This re-validation should be part of what _populateAyahSelectsLocal does or is based on
            // if we are directly setting state. For now, we assume the parsed result is final and valid for selection.
            const validatedRange = await quranVerseAnalyzerAPI.validateAyahRange(parsed.surahId, parsed.startAyah, parsed.endAyah);

            if (validatedRange.isValid) {
                stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
                  quranSelection: {
                    surahId: validatedRange.surahNumber, // Use the number from validation if needed
                    startAyah: validatedRange.correctedStart,
                    endAyah: validatedRange.correctedEnd,
                    // reciterId and translationId remain from previous state unless also parsed
                  }
                });
                // The UI (quran-selector.ui.js) will update from this state change.
            } else {
                notificationServiceAPI.showError(localizationService.translate('voiceSearch.rangeInvalid', { message: validatedRange.message }) || 'نطاق الآيات غير صالح.');
            }
          } else {
            notificationServiceAPI.showWarning(localizationService.translate('voiceSearch.noMatch') || 'لم يتم التعرف على أمر قرآني واضح.');
          }
        }
      },
      onError: (errorType, errorMessage) => {
        if (quranVoiceInputHandler.voiceSearchStatusElRef) quranVoiceInputHandler.voiceSearchStatusElRef.textContent = localizationService.translate('panel.quran.voiceSearch') || 'البحث الصوتي';
        // Don't show error for 'no-speech' or 'aborted' unless debugging
        if (errorType !== 'no-speech' && errorType !== 'aborted') {
          notificationServiceAPI.showError(`${localizationService.translate('voiceSearch.error') || 'خطأ في البحث الصوتي'}: ${errorMessage}`);
        }
      },
      onNoMatch: () => {
        if (quranVoiceInputHandler.voiceSearchStatusElRef) quranVoiceInputHandler.voiceSearchStatusElRef.textContent = localizationService.translate('voiceSearch.tryAgain') || 'لم يتم التعرف على الكلام. حاول مرة أخرى.';
      }
    });

    if (quranVoiceInputHandler.voiceSearchBtnRef) {
      quranVoiceInputHandler.voiceSearchBtnRef.addEventListener('click', _handleVoiceToggleLocal);
    } else {
      (errorLogger.logWarning || console.warn)('Voice search button not found. Voice input disabled.');
    }

  } else {
    if (quranVoiceInputHandler.voiceSearchBtnRef) quranVoiceInputHandler.voiceSearchBtnRef.disabled = true;
    if (quranVoiceInputHandler.voiceSearchStatusElRef) quranVoiceInputHandler.voiceSearchStatusElRef.textContent = localizationService.translate('voiceSearch.notSupported') || 'البحث الصوتي غير مدعوم';
  }

  // console.info('[QuranVoiceInputHandler] Initialized.');
  return {
    toggleListening: _handleVoiceToggleLocal, // Expose if direct control is needed
    cleanup: () => {
      if (quranVoiceInputHandler.voiceSearchBtnRef) {
        quranVoiceInputHandler.voiceSearchBtnRef.removeEventListener('click', _handleVoiceToggleLocal);
      }
      if (speechRecognitionWrapper.isSupported() && speechRecognitionWrapper.isCurrentlyRecognizing()) {
        speechRecognitionWrapper.stop();
      }
      // console.info('[QuranVoiceInputHandler] Cleaned up.');
    }
  };
}

export default quranVoiceInputHandler;
