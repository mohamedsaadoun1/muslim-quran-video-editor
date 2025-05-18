// js/core/localization.service.js

import errorLogger from './error-logger.js';
import eventAggregator from './event-aggregator.js'; // Optional: To publish lang change events
import { ACTIONS, EVENTS, LS_KEY_CURRENT_LANGUAGE } from '../config/app.constants.js'; // If language is in state

// Define available languages and their translation files (or inline data)
// For a real app, these might be separate JSON files (e.g., locales/ar.json, locales/en.json)
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
      'initialScreen.copyright': `الحقوق محفوظة © {year} محرر فيديوهات القرآن الكريم`, // {year} is a placeholder
      // Editor Screen
      'editorScreen.backButton.title': 'العودة للقائمة الرئيسية',
      'editorScreen.projectTitle.default': 'مشروع جديد',
      'editorScreen.projectTitle.edit.tooltip': 'اضغط للتعديل',
      'editorScreen.saveButton.title': 'حفظ المشروع',
      // Panels
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
      // ... Add many more keys as you develop UI elements
      'exportPanel.title': 'تصدير الفيديو',
      'exportPanel.resolution': 'دقة التصدير:',
      'exportPanel.format': 'صيغة الفيديو:',
      'exportPanel.fps': 'معدل الإطارات (FPS):',
      'exportPanel.button': 'تصدير الفيديو',
      'exportPanel.note.webm': 'WebM (جودة عالية، حجم أصغر، قد لا يعمل على جميع الأجهزة بدون تحويل)',
      'exportPanel.note.mp4': 'MP4 (توافق أوسع - قيد التطوير)',
      'exportPanel.note.gif': 'GIF (متحرك، بدون صوت، قد يستغرق وقتًا أطول)',
      'exportPanel.progress': 'تقدم التصدير',
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
      // Panels
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
      // ... Add English translations
      'exportPanel.title': 'Export Video',
      'exportPanel.resolution': 'Export Resolution:',
      'exportPanel.format': 'Video Format:',
      'exportPanel.fps': 'Framerate (FPS):',
      'exportPanel.button': 'Export Video',
      'exportPanel.note.webm': 'WebM (High quality, smaller size, may not play on all devices without conversion)',
      'exportPanel.note.mp4': 'MP4 (Wider compatibility - Under Development)',
      'exportPanel.note.gif': 'GIF (Animated, no audio, may take longer)',
      'exportPanel.progress': 'Export Progress',
    }
  }
};

let currentLanguageCode = 'ar'; // Default language
let currentTranslations = availableLanguages[currentLanguageCode].translations;
let currentDirection = availableLanguages[currentLanguageCode].dir;

// Reference to stateStore if language is managed there
let _stateStore = null;

const localizationService = {
  /**
   * Initializes the localization service.
   * @param {object} dependencies - Core dependencies.
   * @param {import('../core/state-store.js').default} dependencies.stateStore - The state store.
   */
  initialize(dependencies = {}) {
    // _stateStore = dependencies.stateStore; // If language selection is driven by global state

    // For now, try to load preferred language from localStorage or default to 'ar'
    try {
        const savedLang = localStorage.getItem(LS_KEY_CURRENT_LANGUAGE); // Define this constant
        if (savedLang && availableLanguages[savedLang]) {
            this.setLanguage(savedLang, false); // Set without publishing event if it's initial load
        } else {
            this.setLanguage(currentLanguageCode, false); // Set default
        }
    } catch (e) {
        errorLogger.handleError({
            error: e,
            message: 'Error initializing language from localStorage.',
            origin: 'LocalizationService.initialize'
        });
        this.setLanguage('ar', false); // Fallback to Arabic
    }
    // console.info(`[LocalizationService] Initialized with language: ${currentLanguageCode}`);
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
      document.documentElement.lang = langCode;
      document.documentElement.dir = currentDirection;

      try {
        localStorage.setItem(LS_KEY_CURRENT_LANGUAGE, langCode);
      } catch (e) {
         errorLogger.handleError({
            error: e,
            message: `Failed to save language '${langCode}' to localStorage.`,
            origin: 'LocalizationService.setLanguage'
        });
      }

      if (publishChange && oldLangCode !== langCode) {
        eventAggregator.publish(EVENTS.LANGUAGE_CHANGED, { // Define EVENTS.LANGUAGE_CHANGED
          langCode: currentLanguageCode,
          dir: currentDirection
        });
        // console.log(`[LocalizationService] Language changed to: ${langCode}`);
      }
      // If using stateStore for language:
      // if (_stateStore && _stateStore.getState().appSettings.language !== langCode) {
      //   _stateStore.dispatch(ACTIONS.SET_APP_LANGUAGE, langCode); // Define this action
      // }
      return true;
    } else {
      errorLogger.logWarning({
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
      // errorLogger.logWarning({ // Can be too noisy during development
      //   message: `Translation not found for key: "${key}" in language "${currentLanguageCode}". Returning key.`,
      //   origin: 'LocalizationService.translate',
      // });
      return key; // Fallback to the key itself
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
      langList[code] = { name: availableLanguages[code].name, dir: availableLanguages[code].dir };
    }
    return langList;
  }
};

// The initialization function to be called by moduleBootstrap
// This module doesn't have complex async init needs beyond loading from localStorage,
// so it can be simpler.
export function initializeLocalizationService(dependencies) {
  localizationService.initialize(dependencies);
  // console.info('[LocalizationService] Initialized wrapper.');
  // No specific instance or complex API returned, the service itself is the API.
  // Other modules will import `localizationService` directly.
  // However, to fit the moduleBootstrap pattern, we can return the service.
  return localizationService;
}

// Export the service itself for direct use by other modules
export default localizationService;
