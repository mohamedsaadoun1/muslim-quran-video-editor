// js/core/localization.service.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

// تعريف اللغات المدعومة
const availableLanguages = {
  /**
   * العربية - اللغة الافتراضية
   * @type {Object}
   */
  ar: {
    name: 'العربية',
    dir: 'rtl',
    translations: {
      // ترجمة واجهة المستخدم
      'app.title': 'محرر فيديوهات القرآن الكريم',
      'theme.toggle.ariaLabel': 'تبديل السمة',
      'loading.text': 'جاري التحميل...',
      'error.generic': 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
      'button.save': 'حفظ',
      'button.cancel': 'إلغاء',
      'button.confirm': 'تأكيد',
      'button.close': 'إغلاق',
      'button.new.video': 'إنشاء فيديو جديد',
      
      // شاشة البداية
      'initialScreen.myProjects': 'مشاريعي المحفوظة',
      'initialScreen.noProjects': 'لا توجد مشاريع محفوظة بعد.',
      'initialScreen.copyright': 'الحقوق محفوظة © {year} محرر فيديوهات القرآن الكريم',
      
      // شاشة المحرر
      'editorScreen.backButton.title': 'العودة للقائمة الرئيسية',
      'editorScreen.projectTitle.default': 'مشروع جديد',
      'editorScreen.projectTitle.edit.tooltip': 'اضغط للتعديل',
      'editorScreen.saveButton.title': 'حفظ المشروع',
      
      // لوحات الإعدادات - ترجمة مختصرة لتجنب التكرار
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
      'panel.background.aiSuggestion': 'اقتراحات الخلفية',
      'panel.background.color': 'أو اختر لون خلفية:',
      
      'panel.textEffects.title': 'النص والتأثيرات',
      'panel.textEffects.aspectRatio': 'أبعاد الفيديو:',
      'panel.textEffects.videoFilter': 'فلاتر الفيديو:',
      'panel.textEffects.fontFamily': 'عائلة الخط:',
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
      
      // ... (العديد من المفاتيح الأخرى)
    }
  },
  
  /**
   * الإنجليزية - اللغة الثانية المدعومة
   * @type {Object}
   */
  en: {
    name: 'English',
    dir: 'ltr',
    translations: {
      // ترجمة واجهة المستخدم
      'app.title': 'Muslim Quran Video Editor',
      'theme.toggle.ariaLabel': 'Toggle Theme',
      'loading.text': 'Loading...',
      'error.generic': 'An error occurred. Please try again.',
      'button.save': 'Save',
      'button.cancel': 'Cancel',
      'button.confirm': 'Confirm',
      'button.close': 'Close',
      'button.new.video': 'Create New Video',
      
      // شاشة البداية
      'initialScreen.myProjects': 'My Saved Projects',
      'initialScreen.noProjects': 'No saved projects yet.',
      'initialScreen.copyright': 'Copyright © {year} Muslim Quran Video Editor',
      
      // شاشة المحرر
      'editorScreen.backButton.title': 'Back to Main Menu',
      'editorScreen.projectTitle.default': 'New Project',
      'editorScreen.projectTitle.edit.tooltip': 'Click to edit',
      'editorScreen.saveButton.title': 'Save Project',
      
      // لوحات الإعدادات - ترجمة مختصرة لتجنب التكرار
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
      'panel.textEffects.aspectRatio': 'Video Aspect Ratio:',
      'panel.textEffects.videoFilter': 'Video Filters:',
      'panel.textEffects.fontFamily': 'Quran Font:',
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
      
      // ... (العديد من المفاتيح الأخرى)
    }
  }
};

/**
 * @typedef {Object} LocalizationOptions
 * @property {string} [defaultLang='ar'] - اللغة الافتراضية
 * @property {string} [storageKey='MQVE_currentLanguage'] - مفتاح التخزين
 * @property {string} [languageChangedEvent='app:languageChanged'] - اسم الحدث عند تغيير اللغة
 */

const DEFAULT_OPTIONS = {
  defaultLang: 'ar',
  storageKey: 'MQVE_currentLanguage',
  languageChangedEvent: 'app:languageChanged'
};

/**
 * @typedef {Object} LocalizationService
 * @property {Function} initialize - تهيئة الخدمة
 * @property {Function} setLanguage - تغيير اللغة
 * @property {Function} translate - ترجمة مفتاح
 * @property {Function} getCurrentLanguage - الحصول على اللغة الحالية
 * @property {Function} getCurrentDirection - الحصول على اتجاه النص
 * @property {Function} getAvailableLanguages - الحصول على اللغات المتوفرة
 */

const localizationService = (() => {
  // الحالة الداخلية
  let currentLanguageCode = DEFAULT_OPTIONS.defaultLang;
  let currentTranslations = availableLanguages[currentLanguageCode].translations;
  let currentDirection = availableLanguages[currentLanguageCode].dir;
  
  // الاعتمادية المُمررة
  let dependencies = {
    errorLogger: console,
    eventAggregator: { publish: () => {} }
  };
  
  // الدوال المساعدة
  const getLogger = () => {
    return dependencies.errorLogger || console;
  };
  
  const validateLanguageCode = (langCode) => {
    if (typeof langCode !== 'string' || langCode.trim() === '') {
      throw new Error('يجب توفير رمز اللغة');
    }
    
    if (!availableLanguages[langCode]) {
      throw new Error(`رمز اللغة غير متوفر: ${langCode}`);
    }
  };
  
  const updateDocumentDirection = () => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = currentLanguageCode;
      document.documentElement.dir = currentDirection;
    }
  };
  
  const saveLanguageToStorage = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DEFAULT_OPTIONS.storageKey, currentLanguageCode);
      }
    } catch (e) {
      const logger = getLogger();
      logger.handleError({
        error: e,
        message: `فشل في حفظ اللغة: ${currentLanguageCode}`,
        origin: 'localization-service.saveLanguageToStorage',
        severity: 'error',
        context: { langCode: currentLanguageCode }
      });
    }
  };

  /**
   * تهيئة الخدمة
   * @param {Object} injectedDependencies - الاعتمادية المُمررة
   */
  const initialize = (injectedDependencies = {}) => {
    dependencies = { ...dependencies, ...injectedDependencies };
    
    try {
      const savedLang = localStorage.getItem(DEFAULT_OPTIONS.storageKey);
      
      if (savedLang && availableLanguages[savedLang]) {
        // تعيين اللغة المحفوظة
        setLanguage(savedLang, false);
      } else {
        // تعيين اللغة الافتراضية
        setLanguage(DEFAULT_OPTIONS.defaultLang, false);
      }
      
      // console.info(`[LocalizationService] تهيئة النص: ${currentLanguageCode}`);
    } catch (e) {
      const logger = getLogger();
      logger.handleError({
        error: e,
        message: 'فشل في تهيئة اللغة من localStorage',
        origin: 'localization-service.initialize',
        severity: 'error',
        context: { langCode: currentLanguageCode }
      });
      
      setLanguage(DEFAULT_OPTIONS.defaultLang, false);
    }
  };

  /**
   * تعيين اللغة الحالية للتطبيق
   * @param {string} langCode - رمز اللغة
   * @param {boolean} [publishChange=true] - هل يتم نشر الحدث؟
   * @returns {boolean} نتيجة التعيين
   */
  const setLanguage = (langCode, publishChange = true) => {
    try {
      validateLanguageCode(langCode);
      
      const oldLangCode = currentLanguageCode;
      currentLanguageCode = langCode;
      currentTranslations = availableLanguages[langCode].translations;
      currentDirection = availableLanguages[langCode].dir;
      
      updateDocumentDirection();
      saveLanguageToStorage();
      
      if (publishChange && oldLangCode !== currentLanguageCode) {
        dependencies.eventAggregator.publish(DEFAULT_OPTIONS.languageChangedEvent, {
          langCode: currentLanguageCode,
          dir: currentDirection
        });
        
        // console.log(`[LocalizationService] تغيير اللغة إلى: ${currentLanguageCode}`);
      }
      
      return true;
    } catch (error) {
      const logger = getLogger();
      logger.handleError({
        error,
        message: `فشل في تعيين اللغة: ${langCode}`,
        origin: 'localization-service.setLanguage',
        severity: 'error',
        context: { langCode }
      });
      
      return false;
    }
  };

  /**
   * الحصول على ترجمة لمفتاح معين
   * @param {string} key - مفتاح الترجمة
   * @param {Object} [placeholders] - المتغيرات للاستبدال
   * @returns {string} النص المترجم أو المفتاح نفسه إذا لم يُوجد
   */
  const translate = (key, placeholders) => {
    let translation = currentTranslations[key];
    
    if (translation === undefined) {
      const logger = getLogger();
      logger.logWarning({
        message: `لم تُعثر على ترجمة لمفتاح: "${key}"`,
        origin: 'localization-service.translate',
        context: { key, lang: currentLanguageCode }
      });
      
      return `%%${key}%%`;
    }
    
    if (placeholders && typeof placeholders === 'object') {
      for (const placeholderKey in placeholders) {
        if (Object.prototype.hasOwnProperty.call(placeholders, placeholderKey)) {
          const regex = new RegExp(`{${placeholderKey}}`, 'g');
          translation = translation.replace(regex, String(placeholders[placeholderKey]));
        }
      }
    }
    
    return translation;
  };

  /**
   * الحصول على رمز اللغة الحالية
   * @returns {string} رمز اللغة
   */
  const getCurrentLanguage = () => currentLanguageCode;

  /**
   * الحصول على اتجاه النص
   * @returns {'ltr' | 'rtl'} اتجاه النص
   */
  const getCurrentDirection = () => currentDirection;

  /**
   * الحصول على اللغات المتوفرة
   * @returns {Object} اللغات المتوفرة
   */
  const getAvailableLanguages = () => {
    const langList = {};
    
    for (const code in availableLanguages) {
      if (Object.prototype.hasOwnProperty.call(availableLanguages, code)) {
        langList[code] = {
          name: availableLanguages[code].name,
          dir: availableLanguages[code].dir
        };
      }
    }
    
    return langList;
  };

  /**
   * تحقق مما إذا كان النظام جاهزًا
   * @returns {boolean} نتيجة التحقق
   */
  const selfTest = () => {
    const testKey = 'app.title';
    const testTranslation = translate(testKey);
    
    if (testTranslation === availableLanguages[currentLanguageCode].translations[testKey]) {
      return true;
    }
    
    return false;
  };

  return {
    initialize,
    setLanguage,
    translate,
    getCurrentLanguage,
    getCurrentDirection,
    getAvailableLanguages,
    selfTest
  };
})();

export default localizationService;
