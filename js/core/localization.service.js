// js/core/localization.service.js

// errorLogger, eventAggregator, stateStore, and constants will be passed as dependencies
// or imported where appropriate in the final integrated application.
// For this standalone file, we'll assume placeholders or define minimal versions
// if absolutely necessary for the logic to be understandable.

// Placeholder for app.constants.js imports (in a real app, these come from the constants file)
const LS_KEY_CURRENT_LANGUAGE = 'MQVE_currentLanguage'; // Example, use constant from app.constants.js
const EVENTS = {
  LANGUAGE_CHANGED: 'app:languageChanged', // Example, use constant
};

// Define available languages and their translation files (or inline data)
const availableLanguages = {
  ar: {
    name: 'العربية',
    dir: 'rtl',
    translations: {
      // General UI
      'app.title': 'محرر فيديوهات القرآن الكريم',
      'theme.toggle.ariaLabel': 'تبديل السمة',
      'loading.text': 'جاري التحميل...',
      'error.generic': 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
      'button.save': 'حفظ',
      'button.cancel': 'إلغاء',
      'button.confirm': 'تأكيد',
      'button.close': 'إغلاق',
      'button.new.video': 'إنشاء فيديو جديد',
      // Initial Screen
      'initialScreen.myProjects': 'مشاريعي المحفوظة',
      'initialScreen.noProjects': 'لا توجد مشاريع محفوظة بعد.',
      'initialScreen.copyright': `الحقوق محفوظة © {year} محرر فيديوهات القرآن الكريم`,
      // Editor Screen
      'editorScreen.backButton.title': 'العودة للقائمة الرئيسية',
      'editorScreen.projectTitle.default': 'مشروع جديد',
      'editorScreen.projectTitle.edit.tooltip': 'اضغط للتعديل',
      'editorScreen.saveButton.title': 'حفظ المشروع',
      // Panels & Controls - Abbreviated for brevity, include all your keys
      'panel.quran.title': 'القرآن الكريم',
      'panel.quran.surah': 'السورة:',
      'panel.quran.ayahFrom': 'من آية:',
      'panel.quran.ayahTo': 'إلى آية:',
      'panel.quran.reciter': 'القارئ:',
      'panel.quran.translation': 'الترجمة:',
      'panel.quran.translation.none': 'بدون ترجمة',
      'panel.quran.voiceSearch': 'البحث الصوتي',
      'panel.background.title': 'الخلفية',
      'panel.background.import': 'استيراد خلفية (صورة/فيديو):',
      'panel.background.aiSuggest': 'اقتراح خلفية (AI)',
      'panel.background.aiLoading': 'جاري تحميل الاقتراحات...',
      'panel.background.color': 'أو اختر لون خلفية:',
      'panel.textEffects.title': 'النص والتأثيرات',
      'panel.textEffects.videoDimensions': 'أبعاد وفلاتر الفيديو',
      'panel.textEffects.aspectRatio': 'أبعاد الفيديو:',
      'panel.textEffects.videoFilter': 'فلاتر الفيديو:',
      'panel.textEffects.textSettings': 'إعدادات النص',
      'panel.textEffects.quranFont': 'خط القرآن:',
      'panel.textEffects.fontSize': 'حجم الخط:',
      'panel.textEffects.fontColor': 'لون الخط:',
      'panel.textEffects.ayahBgColor': 'لون خلفية الآية:',
      'panel.textEffects.textEffect': 'تأثير ظهور النص:',
      'panel.audio.title': 'الصوت',
      'panel.audio.recitationSettings': 'إعدادات التلاوة',
      'panel.audio.delayBetweenAyahs': 'تأخير بين الآيات (ثواني):',
      'panel.audio.extractAudio': 'استخراج الصوت',
      'panel.audio.addSound': 'إضافة صوت/موسيقى',
      'exportPanel.title': 'تصدير الفيديو',
      'exportPanel.resolution': 'دقة التصدير:',
      'exportPanel.format': 'صيغة الفيديو:',
      'exportPanel.fps': 'معدل الإطارات (FPS):',
      'exportPanel.button': 'تصدير الفيديو',
      'exportPanel.note.webm': 'WebM (جودة عالية، حجم أصغر)',
      'exportPanel.note.mp4': 'MP4 (توافق أوسع)',
      'exportPanel.note.gif': 'GIF (متحرك، بدون صوت)',
      'exportPanel.progress': 'تقدم التصدير',
      // ... (أضف باقي المفاتيح كما هو الحال في النسخة السابقة للملف)
    }
  },
  en: {
    name: 'English',
    dir: 'ltr',
    translations: {
      // General UI
      'app.title': 'Muslim Quran Video Editor',
      'theme.toggle.ariaLabel': 'Toggle Theme',
      'loading.text': 'Loading...',
      'error.generic': 'An error occurred. Please try again.',
      'button.save': 'Save',
      'button.cancel': 'Cancel',
      'button.confirm': 'Confirm',
      'button.close': 'Close',
      'button.new.video': 'Create New Video',
      // Initial Screen
      'initialScreen.myProjects': 'My Saved Projects',
      'initialScreen.noProjects': 'No saved projects yet.',
      'initialScreen.copyright': `Copyright © {year} Muslim Quran Video Editor`,
      // Editor Screen
      'editorScreen.backButton.title': 'Back to Main Menu',
      'editorScreen.projectTitle.default': 'New Project',
      'editorScreen.projectTitle.edit.tooltip': 'Click to edit',
      'editorScreen.saveButton.title': 'Save Project',
      // Panels & Controls - Abbreviated
      'panel.quran.title': 'Holy Quran',
      'panel.quran.surah': 'Surah:',
      'panel.quran.ayahFrom': 'From Ayah:',
      'panel.quran.ayahTo': 'To Ayah:',
      'panel.quran.reciter': 'Reciter:',
      'panel.quran.translation': 'Translation:',
      'panel.quran.translation.none': 'No Translation',
      'panel.quran.voiceSearch': 'Voice Search',
      'panel.background.title': 'Background',
      'panel.background.import': 'Import Background (Image/Video):',
      'panel.background.aiSuggest': 'AI Suggest Background',
      'panel.background.aiLoading': 'Loading suggestions...',
      'panel.background.color': 'Or choose background color:',
      'panel.textEffects.title': 'Text & Effects',
      'panel.textEffects.videoDimensions': 'Video Dimensions & Filters',
      'panel.textEffects.aspectRatio': 'Video Aspect Ratio:',
      'panel.textEffects.videoFilter': 'Video Filters:',
      'panel.textEffects.textSettings': 'Text Settings',
      'panel.textEffects.quranFont': 'Quran Font:',
      'panel.textEffects.fontSize': 'Font Size:',
      'panel.textEffects.fontColor': 'Font Color:',
      'panel.textEffects.ayahBgColor': 'Ayah Background Color:',
      'panel.textEffects.textEffect': 'Text Appearance Effect:',
      'panel.audio.title': 'Audio',
      'panel.audio.recitationSettings': 'Recitation Settings',
      'panel.audio.delayBetweenAyahs': 'Delay Between Ayahs (sec):',
      'panel.audio.extractAudio': 'Extract Audio',
      'panel.audio.addSound': 'Add Sound/Music',
      'exportPanel.title': 'Export Video',
      'exportPanel.resolution': 'Export Resolution:',
      'exportPanel.format': 'Video Format:',
      'exportPanel.fps': 'Framerate (FPS):',
      'exportPanel.button': 'Export Video',
      'exportPanel.note.webm': 'WebM (High quality, smaller size)',
      'exportPanel.note.mp4': 'MP4 (Wider compatibility)',
      'exportPanel.note.gif': 'GIF (Animated, no audio)',
      'exportPanel.progress': 'Export Progress',
      // ... (أضف باقي المفاتيح بالإنجليزية)
    }
  }
};

let currentLanguageCode = 'ar'; // Default language
let currentTranslations = availableLanguages[currentLanguageCode].translations;
let currentDirection = availableLanguages[currentLanguageCode].dir;

// To store injected dependencies
let dependencies = {
  errorLogger: console, // Fallback
  eventAggregator: { publish: () => {} }, // Fallback
  // stateStore: null // If language selection is driven by global state
};

const localizationService = {
  /**
   * Initializes the localization service.
   * @param {object} injectedDependencies - Core dependencies (errorLogger, eventAggregator, etc.).
   */
  initialize(injectedDependencies = {}) {
    dependencies = { ...dependencies, ...injectedDependencies };

    try {
        const savedLang = localStorage.getItem(LS_KEY_CURRENT_LANGUAGE);
        if (savedLang && availableLanguages[savedLang]) {
            // Set without publishing event if it's initial load and no change
            this.setLanguage(savedLang, false);
        } else {
            // Set default language if nothing is saved or invalid
            this.setLanguage(currentLanguageCode, false); // `currentLanguageCode` is 'ar' by default
        }
    } catch (e) {
        (dependencies.errorLogger.handleError || console.error)({ // Use injected logger
            error: e,
            message: 'Error initializing language from localStorage.',
            origin: 'LocalizationService.initialize'
        });
        this.setLanguage('ar', false); // Fallback to Arabic
    }
    // console.info(`[LocalizationService] Initialized. Current language: ${currentLanguageCode}`);
  },

  /**
   * Sets the current language for the application.
   * @param {string} langCode - The language code (e.g., 'ar', 'en').
   * @param {boolean} [publishChange=true] - Whether to publish a language change event.
   * @returns {boolean} True if language was set successfully, false otherwise.
   */
  setLanguage(langCode, publishChange = true) {
    if (availableLanguages[langCode]) {
      const oldLangCode = currentLanguageCode;
      currentLanguageCode = langCode;
      currentTranslations = availableLanguages[langCode].translations;
      currentDirection = availableLanguages[langCode].dir;

      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.lang = currentLanguageCode;
        document.documentElement.dir = currentDirection;
      }

      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(LS_KEY_CURRENT_LANGUAGE, currentLanguageCode);
        }
      } catch (e) {
         (dependencies.errorLogger.handleError || console.error)({
            error: e,
            message: `Failed to save language '${currentLanguageCode}' to localStorage.`,
            origin: 'LocalizationService.setLanguage'
        });
      }

      if (publishChange && oldLangCode !== currentLanguageCode) {
        dependencies.eventAggregator.publish(EVENTS.LANGUAGE_CHANGED, {
          langCode: currentLanguageCode,
          dir: currentDirection
        });
        // console.log(`[LocalizationService] Language changed to: ${currentLanguageCode}`);
      }
      // Example: If language is part of global state managed by stateStore
      // if (dependencies.stateStore && dependencies.stateStore.getState().appSettings.language !== currentLanguageCode) {
      //   dependencies.stateStore.dispatch(ACTIONS.SET_APP_LANGUAGE, currentLanguageCode);
      // }
      return true;
    } else {
      (dependencies.errorLogger.logWarning || console.warn)({
        message: `Language code "${langCode}" is not available.`,
        origin: 'LocalizationService.setLanguage',
        context: { requestedLang: langCode, available: Object.keys(availableLanguages) }
      });
      return false;
    }
  },

  /**
   * Gets the translation for a given key.
   * Supports simple placeholder replacement (e.g., {placeholderName}).
   * @param {string} key - The translation key (e.g., 'app.title').
   * @param {Record<string, string | number>} [placeholders] - An object of placeholders to replace.
   * @returns {string} The translated string, or the key itself if not found.
   */
  translate(key, placeholders) {
    let translation = currentTranslations[key];

    if (translation === undefined) {
      // This can be noisy during development if keys are temporarily missing
      // (dependencies.errorLogger.logWarning || console.warn)({
      //   message: `Translation not found for key: "${key}" in language "${currentLanguageCode}". Returning key.`,
      //   origin: 'LocalizationService.translate',
      // });
      return `%%${key}%%`; // Fallback to the key itself, clearly marked
    }

    if (placeholders && typeof placeholders === 'object') {
      for (const placeholderKey in placeholders) {
        if (Object.hasOwnProperty.call(placeholders, placeholderKey)) {
          const regex = new RegExp(`{${placeholderKey}}`, 'g');
          translation = translation.replace(regex, String(placeholders[placeholderKey]));
        }
      }
    }
    return translation;
  },

  /**
   * Gets the current language code.
   * @returns {string} The current language code.
   */
  getCurrentLanguage() {
    return currentLanguageCode;
  },

  /**
   * Gets the current text direction ('ltr' or 'rtl').
   * @returns {'ltr' | 'rtl'} The current text direction.
   */
  getCurrentDirection() {
    return currentDirection;
  },

  /**
   * Gets the list of available languages.
   * @returns {Record<string, {name: string, dir: string}>}
   */
  getAvailableLanguages() {
    const langList = {};
    for (const code in availableLanguages) {
      if (Object.hasOwnProperty.call(availableLanguages, code)) {
         langList[code] = { name: availableLanguages[code].name, dir: availableLanguages[code].dir };
      }
    }
    return langList;
  }
};

// The initialization function to be called by moduleBootstrap
export function initializeLocalizationService(injectedDependencies) {
  localizationService.initialize(injectedDependencies);
  // console.info('[LocalizationServiceWrapper] Initialized.');
  // Return the service so it can be potentially injected into other modules if moduleBootstrap handles that
  return localizationService;
}

// Export the service itself for direct use by other modules if they import it directly.
export default localizationService;
