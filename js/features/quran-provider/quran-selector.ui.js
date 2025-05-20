// js/features/quran-provider/quran-selector.ui.js
import DOMElements from '../../core/dom-elements.js';
import dynamicSelectBuilder from '../../shared-ui-components/dynamic-select.builder.js';
import { ACTIONS, DEFAULT_PROJECT_SCHEMA, EVENTS } from '../../config/app.constants.js';
import notificationPresenter from '../../shared-ui-components/notification.presenter.js';
import spinnerView from '../../shared-ui-components/spinner.view.js';

/**
 * واجهة مستخدم لاختيار القرآن الكريم
 */
const quranSelectorUI = (() => {
  // مراجع عناصر DOM
  let surahSelect, ayahStartSelect, ayahEndSelect, reciterSelect, translationSelect;
  let voiceSearchButton, voiceSearchStatus, versePreviewContainer;
  
  // الاعتمادات
  let dependencies = {
    stateStore: {
      getState: () => ({ currentProject: { quranSelection: { ...DEFAULT_PROJECT_SCHEMA.quranSelection } } }),
      dispatch: () => {},
      subscribe: () => (() => {})
    },
    eventAggregator: { 
      publish: () => {}, 
      subscribe: () => ({unsubscribe: ()=>{}}) 
    },
    errorLogger: console,
    quranDataCacheAPI: { 
      getSurahsList: async () => [],
      getAyahsForSurah: async (surahNum) => [],
      getAvailableReciters: async () => [],
      getAvailableTranslations: async () => [],
      getSurahDetail: async (surahNum) => ({ numberOfAyahs: 0 })
    },
    localizationService: { 
      translate: key => key 
    }
  };
  
  // معلومات السورة الحالية
  let currentSurahInfo = { number: null, numberOfAyahs: 0 };
  
  // حالة البحث الصوتي
  let isVoiceSearchActive = false;
  
  /**
   * ملء قائمة السور
   * @private
   */
  async function _populateSurahSelect() {
    if (!surahSelect) return;
    
    spinnerView.show(surahSelect);
    
    try {
      const surahs = await dependencies.quranDataCacheAPI.getSurahsList();
      
      if (!surahs || surahs.length === 0) {
        throw new Error('لا توجد سور متاحة');
      }
      
      dynamicSelectBuilder.populateSelect({
        selectElement: surahSelect,
        data: surahs,
        valueField: 'number',
        textField: (surah) => {
          return `${surah.number}. ${surah.name} (${surah.englishName || ''})`;
        },
        placeholderText: dependencies.localizationService.translate('select.surah.placeholder') || 'اختر السورة...',
        emptyOption: true
      });
      
      spinnerView.hide(surahSelect);
    } catch (error) {
      spinnerView.hide(surahSelect);
      dependencies.errorLogger.error('فشل في تحميل قائمة السور', error);
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('error.load.surahs') || 'فشل في تحميل السور',
        type: 'error'
      });
    }
  }
  
  /**
   * ملء قوائم الآيات
   * @param {number} surahNumber - رقم السورة
   * @param {number} [selectedStart=1] - الآية البداية المحددة
   * @param {number} [selectedEnd=numberOfAyahs] - الآية النهاية المحددة
   * @private
   */
  async function _populateAyahSelects(surahNumber, selectedStart = 1, selectedEnd) {
    if (!surahSelect || !ayahStartSelect || !ayahEndSelect || !surahNumber) return;
    
    const loadingId = `ayah-loading-${surahNumber}`;
    spinnerView.show(ayahStartSelect, loadingId);
    spinnerView.show(ayahEndSelect, loadingId);
    
    try {
      const surahData = await dependencies.quranDataCacheAPI.getSurahDetail(surahNumber);
      const numberOfAyahs = surahData?.numberOfAyahs || 0;
      currentSurahInfo = { number: surahNumber, numberOfAyahs };
      
      const ayahOptions = Array.from({ length: numberOfAyahs }, (_, i) => ({
        value: i + 1,
        name: dependencies.localizationService.translate('ayah.number', { num: i + 1 }) || `آية ${i + 1}`
      }));
      
      // التحقق من صحة القيم المحددة
      const validStart = Math.max(1, Math.min(selectedStart || 1, numberOfAyahs));
      const validEnd = Math.max(validStart, Math.min(selectedEnd || numberOfAyahs, numberOfAyahs));
      
      dynamicSelectBuilder.populateSelect({
        selectElement: ayahStartSelect,
        data: ayahOptions,
        valueField: 'value', 
        textField: 'name',
        selectedValue: validStart,
        placeholderText: dependencies.localizationService.translate('select.ayah.startPlaceholder') || 'من آية...',
        emptyOption: false
      });
      
      dynamicSelectBuilder.populateSelect({
        selectElement: ayahEndSelect,
        data: ayahOptions,
        valueField: 'value', 
        textField: 'name',
        selectedValue: validEnd,
        placeholderText: dependencies.localizationService.translate('select.ayah.endPlaceholder') || 'إلى آية...',
        emptyOption: false
      });
      
      // التأكد من أن نهاية الآية ليست قبل البداية
      if (parseInt(ayahEndSelect.value) < parseInt(ayahStartSelect.value)) {
        ayahEndSelect.value = ayahStartSelect.value;
      }
      
      spinnerView.hide(ayahStartSelect, loadingId);
      spinnerView.hide(ayahEndSelect, loadingId);
      
    } catch (error) {
      spinnerView.hide(ayahStartSelect, loadingId);
      spinnerView.hide(ayahEndSelect, loadingId);
      dependencies.errorLogger.error('فشل في تحميل الآيات', error);
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('error.load.verses') || 'فشل في تحميل الآيات',
        type: 'error'
      });
    }
  }
  
  /**
   * ملء قائمة القراء
   * @private
   */
  async function _populateReciterSelect() {
    if (!reciterSelect) return;
    
    spinnerView.show(reciterSelect);
    
    try {
      const reciters = await dependencies.quranDataCacheAPI.getAvailableReciters('audio');
      
      if (!reciters || reciters.length === 0) {
        throw new Error('لا توجد قراء متاحين');
      }
      
      dynamicSelectBuilder.populateSelect({
        selectElement: reciterSelect,
        data: reciters,
        valueField: 'identifier',
        textField: 'name',
        placeholderText: dependencies.localizationService.translate('select.reciter.placeholder') || 'اختر القارئ...',
        emptyOption: true
      });
      
      spinnerView.hide(reciterSelect);
    } catch (error) {
      spinnerView.hide(reciterSelect);
      dependencies.errorLogger.error('فشل في تحميل قائمة القراء', error);
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('error.load.reciters') || 'فشل في تحميل القراء',
        type: 'error'
      });
    }
  }
  
  /**
   * ملء قائمة الترجمات
   * @private
   */
  async function _populateTranslationSelect() {
    if (!translationSelect) return;
    
    spinnerView.show(translationSelect);
    
    try {
      const translations = await dependencies.quranDataCacheAPI.getAvailableTranslations();
      
      if (!translations || translations.length === 0) {
        throw new Error('لا توجد ترجمات متاحة');
      }
      
      const optionsWithNone = [
        { identifier: '', name: dependencies.localizationService.translate('panel.quran.translation.none') || 'بدون ترجمة' },
        ...translations
      ];
      
      dynamicSelectBuilder.populateSelect({
        selectElement: translationSelect,
        data: optionsWithNone,
        valueField: 'identifier',
        textField: (item) => {
          return `${item.name} (${item.language || 'N/A})`;
        },
        emptyOption: false
      });
      
      spinnerView.hide(translationSelect);
    } catch (error) {
      spinnerView.hide(translationSelect);
      dependencies.errorLogger.error('فشل في تحميل الترجمات', error);
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('error.load.translations') || 'فشل في تحميل الترجمات',
        type: 'error'
      });
    }
  }
  
  /**
   * تحديث واجهة المستخدم من حالة المشروع
   * @param {Object} quranSelectionState - حالة اختيار القرآن
   * @private
   */
  async function _updateUIFromState(quranSelectionState) {
    const qs = quranSelectionState || DEFAULT_PROJECT_SCHEMA.quranSelection;
    
    // تحديث السورة المحددة
    if (surahSelect && surahSelect.value !== String(qs.surahId)) {
      dynamicSelectBuilder.setSelectedValue(surahSelect, qs.surahId);
      await _populateAyahSelects(qs.surahId, qs.startAyah, qs.endAyah);
    }
    
    // تحديث الآيات المحددة
    if (ayahStartSelect && ayahStartSelect.value !== String(qs.startAyah)) {
      dynamicSelectBuilder.setSelectedValue(ayahStartSelect, qs.startAyah);
    }
    
    if (ayahEndSelect && ayahEndSelect.value !== String(qs.endAyah)) {
      dynamicSelectBuilder.setSelectedValue(ayahEndSelect, qs.endAyah);
    }
    
    // تحديث القارئ المحدد
    if (reciterSelect && reciterSelect.value !== qs.reciterId) {
      dynamicSelectBuilder.setSelectedValue(reciterSelect, qs.reciterId);
    }
    
    // تحديث الترجمة المحددة
    if (translationSelect && translationSelect.value !== (qs.translationId || '')) {
      dynamicSelectBuilder.setSelectedValue(translationSelect, qs.translationId || '');
    }
    
    // تعطيل قوائم الآيات إذا لم يتم اختيار سورة
    const ayahsDisabled = !qs.surahId || (currentSurahInfo.number === qs.surahId && currentSurahInfo.numberOfAyahs === 0);
    if(ayahStartSelect) ayahStartSelect.disabled = ayahsDisabled;
    if(ayahEndSelect) ayahEndSelect.disabled = ayahsDisabled;
    
    // تحديث عرض الآية
    if (versePreviewContainer && qs.surahId && qs.startAyah) {
      try {
        const verseText = await dependencies.quranDataCacheAPI.getAyahText(qs.surahId, qs.startAyah);
        versePreviewContainer.innerHTML = `
          <div class="verse-preview">
            <p dir="rtl" style="font-family: 'Amiri Quran'; font-size: 24px;">${verseText}</p>
            <p class="verse-number">${qs.surahId}:${qs.startAyah}</p>
          </div>
        `;
      } catch (error) {
        versePreviewContainer.innerHTML = '<div class="verse-preview">تعذر تحميل الآية</div>';
        dependencies.errorLogger.error('فشل في تحميل نص الآية', error);
      }
    }
  }
  
  /**
   * معالجة تغييرات الاختيار
   * @param {Event} event - حدث تغيير
   * @private
   */
  function _handleSelectionChange(event) {
    const project = dependencies.stateStore.getState().currentProject;
    if (!project) return;
    
    let currentSelection = project.quranSelection || { ...DEFAULT_PROJECT_SCHEMA.quranSelection };
    let newSelection = { ...currentSelection };
    let repopulateAyahs = false;
    const target = event.target;
    
    switch (target) {
      case surahSelect:
        newSelection.surahId = parseInt(surahSelect.value, 10) || null;
        newSelection.startAyah = 1;
        newSelection.endAyah = 1;
        repopulateAyahs = true;
        break;
        
      case ayahStartSelect:
        newSelection.startAyah = parseInt(ayahStartSelect.value, 10);
        if (newSelection.endAyah < newSelection.startAyah) {
          newSelection.endAyah = newSelection.startAyah;
        }
        break;
        
      case ayahEndSelect:
        newSelection.endAyah = parseInt(ayahEndSelect.value, 10);
        if (newSelection.startAyah > newSelection.endAyah) {
          newSelection.startAyah = newSelection.endAyah;
        }
        break;
        
      case reciterSelect:
        newSelection.reciterId = reciterSelect.value || null;
        break;
        
      case translationSelect:
        newSelection.translationId = translationSelect.value || null;
        break;
        
      default:
        return;
    }
    
    if (repopulateAyahs && newSelection.surahId) {
      _populateAyahSelects(newSelection.surahId, newSelection.startAyah, newSelection.startAyah)
        .then(() => {
          if(ayahEndSelect) newSelection.endAyah = parseInt(ayahEndSelect.value, 10);
          dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { quranSelection: newSelection });
        });
    } else {
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { quranSelection: newSelection });
    }
  }
  
  /**
   * معالجة النقر على زر البحث الصوتي
   * @private
   */
  function _handleVoiceSearchClick() {
    if (!dependencies.quranVoiceInputAPI || !dependencies.quranVoiceInputAPI.toggleListening) {
      dependencies.errorLogger.warn('API البحث الصوتي غير متاح');
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('voice.search.unavailable') || 'البحث الصوتي غير متاح',
        type: 'warning'
      });
      return;
    }
    
    isVoiceSearchActive = !isVoiceSearchActive;
    dependencies.quranVoiceInputAPI.toggleListening(isVoiceSearchActive);
    
    if (voiceSearchStatus) {
      voiceSearchStatus.textContent = isVoiceSearchActive ? 
        dependencies.localizationService.translate('voice.search.active') || 'جاري التسجيل...' : 
        dependencies.localizationService.translate('voice.search.inactive') || 'اضغط للبحث الصوتي';
    }
    
    if (voiceSearchButton) {
      voiceSearchButton.classList.toggle('active', isVoiceSearchActive);
    }
  }
  
  /**
   * معالجة نتائج البحث الصوتي
   * @param {Object} result - نتائج البحث
   * @private
   */
  function _handleVoiceSearchResult(result) {
    if (!result || !result.surah || !result.ayah) {
      notificationPresenter.showNotification({
        message: dependencies.localizationService.translate('voice.search.no.match') || 'لم يتم العثور على مطابقة',
        type: 'info'
      });
      return;
    }
    
    if (surahSelect) surahSelect.value = result.surah;
    if (ayahStartSelect) ayahStartSelect.value = result.ayah;
    if (ayahEndSelect) ayahEndSelect.value = result.ayah;
    
    _populateAyahSelects(result.surah, result.ayah, result.ayah);
    dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      quranSelection: {
        surahId: result.surah,
        startAyah: result.ayah,
        endAyah: result.ayah,
        reciterId: dependencies.stateStore.getState().currentProject?.quranSelection?.reciterId || null,
        translationId: dependencies.stateStore.getState().currentProject?.quranSelection?.translationId || null
      }
    });
    
    notificationPresenter.showNotification({
      message: dependencies.localizationService.translate('voice.search.match', {
        surah: result.surahName || result.surah,
        ayah: result.ayah
      }) || `تم العثور على آية ${result.surah}:${result.ayah}`,
      type: 'success'
    });
  }
  
  /**
   * تحديث حالة البحث الصوتي
   * @param {boolean} isActive - هل البحث نشط؟
   * @private
   */
  function _updateVoiceSearchStatus(isActive) {
    if (voiceSearchStatus) {
      voiceSearchStatus.textContent = isActive ? 
        dependencies.localizationService.translate('voice.search.listening') || 'جاري الاستماع...' : 
        dependencies.localizationService.translate('voice.search.ready') || 'جاهز للبحث الصوتي';
    }
    
    if (voiceSearchButton) {
      voiceSearchButton.classList.toggle('listening', isActive);
    }
  }
  
  /**
   * تحديد الاعتمادات
   * @param {Object} injectedDeps - الاعتمادات
   * @private
   */
  function _setDependencies(injectedDeps) {
    Object.keys(injectedDeps).forEach(key => {
      if (injectedDeps[key]) {
        dependencies[key] = injectedDeps[key];
      }
    });
    
    // الاشتراك في أحداث البحث الصوتي
    if (dependencies.quranVoiceInputAPI && dependencies.quranVoiceInputAPI.subscribeToResults) {
      dependencies.quranVoiceInputAPI.subscribeToResults(_handleVoiceSearchResult);
    }
    
    if (dependencies.quranVoiceInputAPI && dependencies.quranVoiceInputAPI.subscribeToStatus) {
      dependencies.quranVoiceInputAPI.subscribeToStatus(_updateVoiceSearchStatus);
    }
  }
  
  /**
   * تنظيف الموارد
   * @private
   */
  function _cleanup() {
    // إزالة المستمعين
    [surahSelect, ayahStartSelect, ayahEndSelect, reciterSelect, translationSelect]
      .filter(el => el)
      .forEach(el => el.removeEventListener('change', _handleSelectionChange));
      
    if (voiceSearchButton) {
      voiceSearchButton.removeEventListener('click', _handleVoiceSearchClick);
    }
    
    // إزالة الاشتراكات
    if (dependencies.quranVoiceInputAPI && dependencies.quranVoiceInputAPI.unsubscribeFromResults) {
      dependencies.quranVoiceInputAPI.unsubscribeFromResults(_handleVoiceSearchResult);
    }
    
    if (dependencies.quranVoiceInputAPI && dependencies.quranVoiceInputAPI.unsubscribeFromStatus) {
      dependencies.quranVoiceInputAPI.unsubscribeFromStatus(_updateVoiceSearchStatus);
    }
  }
  
  return {
    _setDependencies,
    _cleanup
  };
})();

/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 */
export async function initializeQuranSelectorUI(deps) {
  quranSelectorUI._setDependencies(deps);
  
  const { stateStore, errorLogger } = deps;
  
  // تهيئة مراجع العناصر
  surahSelect = DOMElements.surahSelect;
  ayahStartSelect = DOMElements.ayahStartSelect;
  ayahEndSelect = DOMElements.ayahEndSelect;
  reciterSelect = DOMElements.reciterSelect;
  translationSelect = DOMElements.translationSelect;
  voiceSearchButton = DOMElements.voiceSearchQuranBtn;
  voiceSearchStatus = DOMElements.voiceSearchStatus;
  versePreviewContainer = DOMElements.versePreviewContainer;
  
  // ملء القوائم
  try {
    await Promise.all([
      _populateSurahSelect(),
      _populateReciterSelect(),
      _populateTranslationSelect()
    ]);
    
    // ملء آيات السورة الحالية
    const currentState = stateStore.getState().currentProject?.quranSelection;
    if (currentState && currentState.surahId) {
      await _populateAyahSelects(currentState.surahId, currentState.startAyah, currentState.endAyah);
    }
    
    // إضافة مستمعي الأحداث
    [surahSelect, ayahStartSelect, ayahEndSelect, reciterSelect, translationSelect]
      .filter(el => el)
      .forEach(el => el.addEventListener('change', _handleSelectionChange));
      
    if (voiceSearchButton) {
      voiceSearchButton.addEventListener('click', _handleVoiceSearchClick);
      voiceSearchButton.addEventListener('touchstart', _handleVoiceSearchClick);
    }
    
    // الاشتراك في تغييرات الحالة
    const unsubscribe = stateStore.subscribe((newState) => {
      _updateUIFromState(newState.currentProject?.quranSelection);
    });
    
    // تحديث واجهة المستخدم أول مرة
    _updateUIFromState(stateStore.getState().currentProject?.quranSelection);
    
    return {
      cleanup: () => {
        _cleanup();
        unsubscribe();
      }
    };
    
  } catch (error) {
    errorLogger.error('فشل في تهيئة واجهة اختيار القرآن', error);
    notificationPresenter.showNotification({
      message: 'تعذر تهيئة واجهة القرآن',
      type: 'error'
    });
    
    return {
      cleanup: () => {}
    };
  }
}

/**
 * وظيفة تهيئة عرض الآية
 * @param {Object} verseElement - عنصر عرض الآية
 * @param {Object} quranSelection - حالة اختيار القرآن
 */
export function initializeVersePreview(verseElement, quranSelection) {
  if (!verseElement || !quranSelection || !quranSelection.surahId || !quranSelection.startAyah) {
    verseElement.innerHTML = '<div class="verse-preview">لم يتم اختيار آية بعد</div>';
    return;
  }
  
  try {
    verseElement.innerHTML = `
      <div class="verse-preview">
        <p dir="rtl" style="font-family: 'Amiri Quran'; font-size: 24px;">
          ${quranSelection.verseText || 'جاري تحميل الآية...'}
        </p>
        <p class="verse-number">${quranSelection.surahId}:${quranSelection.startAyah}</p>
      </div>
    `;
  } catch (error) {
    verseElement.innerHTML = '<div class="verse-preview">فشل في تحميل الآية</div>';
    console.error('فشل في تحميل الآية', error);
  }
}

export default quranSelectorUI;
