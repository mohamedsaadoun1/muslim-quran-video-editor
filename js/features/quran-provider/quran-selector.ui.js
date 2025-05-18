// js/features/quran-provider/quran-selector.ui.js

import DOMElements from '../../core/dom-elements.js';
import dynamicSelectBuilder from '../../shared-ui-components/dynamic-select.builder.js';
import { ACTIONS, DEFAULT_PROJECT_SCHEMA, EVENTS } from '../../config/app.constants.js';

const quranSelectorUI = (() => {
  // DOM element references
  let surahSelect, ayahStartSelect, ayahEndSelect, reciterSelect, translationSelect,
      voiceSearchButton, voiceSearchStatus; // Voice search elements

  let dependencies = {
    stateStore: {
      getState: () => ({ currentProject: { quranSelection: { ...DEFAULT_PROJECT_SCHEMA.quranSelection } } }),
      dispatch: () => {},
      subscribe: () => (() => {})
    },
    eventAggregator: { publish: () => {}, subscribe: () => ({unsubscribe: ()=>{}}) },
    errorLogger: console,
    quranDataCacheAPI: { // API from quran.data.cache.js
      getSurahsList: async () => [],
      getAyahsForSurah: async (surahNum) => [], // Returns array like [{ numberInSurah: 1, text: "..."}] or just numbers
      getAvailableReciters: async () => [], // Returns array like [{ identifier: 'ar.alafasy', name: 'مشاري العفاسي', language: 'ar' }]
      getAvailableTranslations: async () => [], // Returns array like [{ identifier: 'en.sahih', name: 'Sahih International', language: 'en' }]
    },
    localizationService: { translate: key => key },
    // quranVoiceInputAPI: { start: () => {}, stop: () => {} } // From quran-voice-input.handler.js
  };

  let currentSurahInfo = { number: null, numberOfAyahs: 0 }; // To store info about currently selected Surah

  /** Populates the Surah select dropdown. @private */
  async function _populateSurahSelect() {
    if (!surahSelect) return;
    try {
      const surahs = await dependencies.quranDataCacheAPI.getSurahsList();
      if (surahs && surahs.length > 0) {
        dynamicSelectBuilder.populateSelect({
          selectElement: surahSelect,
          data: surahs,
          valueField: 'number', // Assuming surah object has 'number'
          textField: (surah) => `${surah.number}. ${surah.name} (${surah.englishName || ''})`,
          placeholderText: dependencies.localizationService.translate('select.surah.placeholder') || 'اختر السورة...',
          // selectedValue will be set by _updateUIFromState
        });
      }
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error, message: 'Failed to populate Surah select.', origin: 'QuranSelectorUI._populateSurahSelect'
      });
    }
  }

  /** Populates Ayah start/end selects based on selected Surah. @private */
  async function _populateAyahSelects(surahNumber, selectedStart, selectedEnd) {
    if (!surahSelect || !ayahStartSelect || !ayahEndSelect || !surahNumber) return;

    const surahData = await dependencies.quranDataCacheAPI.getSurahDetail(surahNumber); // Assume this fetches full surah details
    const numberOfAyahs = surahData?.numberOfAyahs || 0;
    currentSurahInfo = { number: surahNumber, numberOfAyahs };

    const ayahOptions = Array.from({ length: numberOfAyahs }, (_, i) => ({
      value: i + 1,
      name: dependencies.localizationService.translate('ayah.number', { num: i + 1 }) || `آية ${i + 1}`
    }));

    // Ensure valid selectedStart/End within new surah's range
    const validStart = Math.max(1, Math.min(selectedStart || 1, numberOfAyahs));
    const validEnd = Math.max(validStart, Math.min(selectedEnd || numberOfAyahs, numberOfAyahs));


    dynamicSelectBuilder.populateSelect({
      selectElement: ayahStartSelect,
      data: ayahOptions,
      valueField: 'value', textField: 'name',
      selectedValue: validStart,
      placeholderText: dependencies.localizationService.translate('select.ayah.startPlaceholder') || 'من آية...',
    });
    dynamicSelectBuilder.populateSelect({
      selectElement: ayahEndSelect,
      data: ayahOptions,
      valueField: 'value', textField: 'name',
      selectedValue: validEnd,
      placeholderText: dependencies.localizationService.translate('select.ayah.endPlaceholder') || 'إلى آية...',
    });

    // Ensure end Ayah is not before start Ayah after population
    if (parseInt(ayahEndSelect.value) < parseInt(ayahStartSelect.value)) {
        ayahEndSelect.value = ayahStartSelect.value;
        // Potentially dispatch state update here if direct manipulation
    }
  }


  /** Populates the Reciter select dropdown. @private */
  async function _populateReciterSelect() {
    if (!reciterSelect) return;
    try {
      const reciters = await dependencies.quranDataCacheAPI.getAvailableReciters('audio'); // Assuming API filters by audio
      if (reciters && reciters.length > 0) {
        dynamicSelectBuilder.populateSelect({
          selectElement: reciterSelect,
          data: reciters,
          valueField: 'identifier',
          textField: 'name', // Or `item => item.name + (item.style ? ` (${item.style})` : '')`
          placeholderText: dependencies.localizationService.translate('select.reciter.placeholder') || 'اختر القارئ...',
        });
      }
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error, message: 'Failed to populate Reciter select.', origin: 'QuranSelectorUI._populateReciterSelect'
      });
    }
  }

  /** Populates the Translation select dropdown. @private */
  async function _populateTranslationSelect() {
    if (!translationSelect) return;
    try {
      const translations = await dependencies.quranDataCacheAPI.getAvailableTranslations(); // Or 'text' editions
      if (translations && translations.length > 0) {
        const optionsWithNone = [
          { identifier: '', name: dependencies.localizationService.translate('panel.quran.translation.none') || 'بدون ترجمة' },
          ...translations
        ];
        dynamicSelectBuilder.populateSelect({
          selectElement: translationSelect,
          data: optionsWithNone,
          valueField: 'identifier',
          textField: (item) => `${item.name} (${item.language || 'N/A'})`,
          // selectedValue will be set by _updateUIFromState
        });
      }
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error, message: 'Failed to populate Translation select.', origin: 'QuranSelectorUI._populateTranslationSelect'
      });
    }
  }
  

  /** Updates all UI controls from the quranSelection part of the state. @private */
  async function _updateUIFromState(quranSelectionState) {
    const qs = quranSelectionState || DEFAULT_PROJECT_SCHEMA.quranSelection;

    if (surahSelect && surahSelect.value !== String(qs.surahId)) {
      dynamicSelectBuilder.setSelectedValue(surahSelect, qs.surahId);
      // Trigger population of Ayah selects, as Surah change affects them
      await _populateAyahSelects(qs.surahId, qs.startAyah, qs.endAyah);
    }
    // Ayah selects are populated by _populateAyahSelects, just ensure selection
    if (ayahStartSelect && ayahStartSelect.value !== String(qs.startAyah)) {
        dynamicSelectBuilder.setSelectedValue(ayahStartSelect, qs.startAyah);
    }
    if (ayahEndSelect && ayahEndSelect.value !== String(qs.endAyah)) {
        dynamicSelectBuilder.setSelectedValue(ayahEndSelect, qs.endAyah);
    }

    if (reciterSelect && reciterSelect.value !== qs.reciterId) {
      dynamicSelectBuilder.setSelectedValue(reciterSelect, qs.reciterId);
    }
    if (translationSelect && translationSelect.value !== (qs.translationId || '')) { // Handle null for "No Translation"
      dynamicSelectBuilder.setSelectedValue(translationSelect, qs.translationId || '');
    }
    
    // Disable Ayah selects if no Surah selected or Surah has no Ayahs
    const ayahsDisabled = !qs.surahId || (currentSurahInfo.number === qs.surahId && currentSurahInfo.numberOfAyahs === 0);
    if(ayahStartSelect) ayahStartSelect.disabled = ayahsDisabled;
    if(ayahEndSelect) ayahEndSelect.disabled = ayahsDisabled;
  }


  /** Handles changes from any of the quran selection UI controls. @private */
  function _handleSelectionChange(event) {
    const project = dependencies.stateStore.getState().currentProject;
    if (!project) return;

    let currentSelection = project.quranSelection || { ...DEFAULT_PROJECT_SCHEMA.quranSelection };
    let newSelection = { ...currentSelection }; // Start with current state
    let repopulateAyahs = false;

    const target = event.target;
    switch (target) {
      case surahSelect:
        newSelection.surahId = parseInt(surahSelect.value, 10) || null;
        // Reset Ayah numbers when Surah changes, to prevent invalid Ayah numbers from previous Surah
        newSelection.startAyah = 1; 
        // newSelection.endAyah will be set by _populateAyahSelects based on new surah
        repopulateAyahs = true;
        break;
      case ayahStartSelect:
        newSelection.startAyah = parseInt(ayahStartSelect.value, 10);
        // Ensure end Ayah is not before start Ayah
        if (newSelection.endAyah < newSelection.startAyah) {
          newSelection.endAyah = newSelection.startAyah;
          // UI for ayahEndSelect will be updated by _updateUIFromState call after dispatch
        }
        break;
      case ayahEndSelect:
        newSelection.endAyah = parseInt(ayahEndSelect.value, 10);
        // Ensure start Ayah is not after end Ayah
        if (newSelection.startAyah > newSelection.endAyah) {
          newSelection.startAyah = newSelection.endAyah;
        }
        break;
      case reciterSelect:
        newSelection.reciterId = reciterSelect.value || null;
        break;
      case translationSelect:
        newSelection.translationId = translationSelect.value || null; // Store null if "No translation" (empty value)
        break;
      default:
        return;
    }

    if (repopulateAyahs && newSelection.surahId) {
        _populateAyahSelects(newSelection.surahId, newSelection.startAyah, newSelection.startAyah) // Default end to startAyah initially
            .then(() => {
                // After Ayah selects are populated, get the (potentially adjusted) endAyah.
                // If surah had 7 ayahs, and we tried to set endAyah=10 from prev selection,
                // _populateAyahSelects would cap it at 7. We need to read that new cap.
                if(ayahEndSelect) newSelection.endAyah = parseInt(ayahEndSelect.value, 10);
                
                dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { quranSelection: newSelection });
            });
    } else {
        dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { quranSelection: newSelection });
    }
  }
  
  function _handleVoiceSearchClick() {
      if(dependencies.quranVoiceInputAPI && typeof dependencies.quranVoiceInputAPI.toggleListening === 'function'){
          dependencies.quranVoiceInputAPI.toggleListening();
      } else {
          (dependencies.errorLogger.logWarning || console.warn)('Quran Voice Input API not available or toggleListening not found.');
      }
  }

  function _setDependencies(injectedDeps) {
      Object.assign(dependencies, injectedDeps);
  }

  return {
    _setDependencies,
    // initializeUI, // Might be part of main init function
  };
})(); // IIFE removed

/**
 * Initialization function for the QuranSelectorUI.
 * @param {object} deps
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../core/event-aggregator.js').default} deps.eventAggregator
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * @param {object} deps.quranDataCacheAPI - API from quran.data.cache.js
 * @param {import('../../core/localization.service.js').default} deps.localizationService
 * @param {object} [deps.quranVoiceInputAPI] - API from quran-voice-input.handler.js
 */
export async function initializeQuranSelectorUI(deps) {
  quranSelectorUI._setDependencies(deps);
  const { stateStore, errorLogger } = deps;

  // --- Internal functions moved here for better encapsulation ---
  quranSelectorUI.surahSelectRef = DOMElements.surahSelect;
  quranSelectorUI.ayahStartSelectRef = DOMElements.ayahStartSelect;
  quranSelectorUI.ayahEndSelectRef = DOMElements.ayahEndSelect;
  quranSelectorUI.reciterSelectRef = DOMElements.reciterSelect;
  quranSelectorUI.translationSelectRef = DOMElements.translationSelect;
  quranSelectorUI.voiceSearchButtonRef = DOMElements.voiceSearchQuranBtn; // Your DOMElements has it as voiceSearchQuranBtn
  quranSelectorUI.voiceSearchStatusRef = DOMElements.voiceSearchStatus;   // Your DOMElements has it as voiceSearchStatus


  // Local scope populate functions, calling quranSelectorUI's internal (now properties or methods)
  const _populateSurahSelectLocal = async () => { /* ... same logic as _populateSurahSelect using quranSelectorUI.surahSelectRef and deps ... */ 
    if (!quranSelectorUI.surahSelectRef) return;
    const surahs = await deps.quranDataCacheAPI.getSurahsList();
    dynamicSelectBuilder.populateSelect({ selectElement: quranSelectorUI.surahSelectRef, data: surahs, valueField: 'number', textField: s => `${s.number}. ${s.name}`, placeholderText: deps.localizationService.translate('select.surah.placeholder')});
  };
  
  quranSelectorUI.currentSurahInfo = { number:null, numberOfAyahs:0 }; // Init this on the object

  const _populateAyahSelectsLocal = async (surahNumber, selectedStart, selectedEnd) => { /* ... logic of _populateAyahSelects using quranSelectorUI refs ... */
    if (!quranSelectorUI.surahSelectRef || !quranSelectorUI.ayahStartSelectRef || !quranSelectorUI.ayahEndSelectRef || !surahNumber) return;
    const surahData = await deps.quranDataCacheAPI.getSurahDetail(surahNumber);
    const numberOfAyahs = surahData?.numberOfAyahs || 0;
    quranSelectorUI.currentSurahInfo = { number: surahNumber, numberOfAyahs };
    const ayahOpts = Array.from({length: numberOfAyahs}, (_,i)=>({value: i+1, name: `آية ${i+1}`}));
    const start = Math.max(1, Math.min(selectedStart||1, numberOfAyahs));
    const end = Math.max(start, Math.min(selectedEnd||numberOfAyahs, numberOfAyahs));
    dynamicSelectBuilder.populateSelect({ selectElement: quranSelectorUI.ayahStartSelectRef, data: ayahOpts, valueField:'value', textField:'name', selectedValue: start});
    dynamicSelectBuilder.populateSelect({ selectElement: quranSelectorUI.ayahEndSelectRef, data: ayahOpts, valueField:'value', textField:'name', selectedValue: end});
    if(quranSelectorUI.ayahEndSelectRef && parseInt(quranSelectorUI.ayahEndSelectRef.value) < parseInt(quranSelectorUI.ayahStartSelectRef.value)) quranSelectorUI.ayahEndSelectRef.value = quranSelectorUI.ayahStartSelectRef.value;
  };

  const _populateReciterSelectLocal = async () => { /* ... */ 
    if (!quranSelectorUI.reciterSelectRef) return;
    const reciters = await deps.quranDataCacheAPI.getAvailableReciters('audio');
    dynamicSelectBuilder.populateSelect({selectElement: quranSelectorUI.reciterSelectRef, data: reciters, valueField:'identifier', textField: 'name', placeholderText: 'اختر القارئ...'});
  };
  const _populateTranslationSelectLocal = async () => { /* ... */
    if (!quranSelectorUI.translationSelectRef) return;
    const translations = await deps.quranDataCacheAPI.getAvailableTranslations();
    const opts = [{identifier:'', name:'بدون ترجمة'}, ...translations];
    dynamicSelectBuilder.populateSelect({selectElement:quranSelectorUI.translationSelectRef, data:opts, valueField:'identifier', textField: i=>`${i.name} (${i.language||''})`});
  };


  const _updateUIFromStateLocal = async (quranSelection) => {
    const qs = quranSelection || DEFAULT_PROJECT_SCHEMA.quranSelection;
    if(quranSelectorUI.surahSelectRef && quranSelectorUI.surahSelectRef.value !== String(qs.surahId)){
      dynamicSelectBuilder.setSelectedValue(quranSelectorUI.surahSelectRef, qs.surahId);
      await _populateAyahSelectsLocal(qs.surahId, qs.startAyah, qs.endAyah);
    }
    if(quranSelectorUI.ayahStartSelectRef) dynamicSelectBuilder.setSelectedValue(quranSelectorUI.ayahStartSelectRef, qs.startAyah);
    if(quranSelectorUI.ayahEndSelectRef) dynamicSelectBuilder.setSelectedValue(quranSelectorUI.ayahEndSelectRef, qs.endAyah);
    if(quranSelectorUI.reciterSelectRef) dynamicSelectBuilder.setSelectedValue(quranSelectorUI.reciterSelectRef, qs.reciterId);
    if(quranSelectorUI.translationSelectRef) dynamicSelectBuilder.setSelectedValue(quranSelectorUI.translationSelectRef, qs.translationId || '');
    const ayahsDisabled = !qs.surahId || (quranSelectorUI.currentSurahInfo.number === qs.surahId && quranSelectorUI.currentSurahInfo.numberOfAyahs === 0);
    if(quranSelectorUI.ayahStartSelectRef) quranSelectorUI.ayahStartSelectRef.disabled = ayahsDisabled;
    if(quranSelectorUI.ayahEndSelectRef) quranSelectorUI.ayahEndSelectRef.disabled = ayahsDisabled;
  };
  

  const _handleSelectionChangeEvent = async (event) => { // Marked async for await inside
    const project = stateStore.getState().currentProject;
    if (!project) return;
    let currentSelection = project.quranSelection || { ...DEFAULT_PROJECT_SCHEMA.quranSelection };
    let newSelection = { ...currentSelection };
    let repopulateAyahs = false;
    const target = event.target;

    if (target === quranSelectorUI.surahSelectRef) { newSelection.surahId = parseInt(target.value) || null; newSelection.startAyah = 1; repopulateAyahs = true; }
    else if (target === quranSelectorUI.ayahStartSelectRef) { newSelection.startAyah = parseInt(target.value); if (newSelection.endAyah < newSelection.startAyah) newSelection.endAyah = newSelection.startAyah; }
    else if (target === quranSelectorUI.ayahEndSelectRef) { newSelection.endAyah = parseInt(target.value); if (newSelection.startAyah > newSelection.endAyah) newSelection.startAyah = newSelection.endAyah; }
    else if (target === quranSelectorUI.reciterSelectRef) newSelection.reciterId = target.value || null;
    else if (target === quranSelectorUI.translationSelectRef) newSelection.translationId = target.value || null;
    else return;

    if (repopulateAyahs && newSelection.surahId) {
        await _populateAyahSelectsLocal(newSelection.surahId, newSelection.startAyah, newSelection.startAyah);
        if(quranSelectorUI.ayahEndSelectRef) newSelection.endAyah = parseInt(quranSelectorUI.ayahEndSelectRef.value,10);
    }
    stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { quranSelection: newSelection });
  };

  // Populate selects first, then setup listeners and state subscription
  await Promise.all([
      _populateSurahSelectLocal(),
      _populateReciterSelectLocal(),
      _populateTranslationSelectLocal()
  ]);
  
  // Then update UI from state (which will also populate Ayah selects based on surah in state)
  await _updateUIFromStateLocal(stateStore.getState().currentProject?.quranSelection);
  
  [quranSelectorUI.surahSelectRef, quranSelectorUI.ayahStartSelectRef, quranSelectorUI.ayahEndSelectRef, 
   quranSelectorUI.reciterSelectRef, quranSelectorUI.translationSelectRef].forEach(el => {
    if(el) el.addEventListener('change', _handleSelectionChangeEvent);
  });

  if(quranSelectorUI.voiceSearchButtonRef && deps.quranVoiceInputAPI){
      quranSelectorUI.voiceSearchButtonRef.addEventListener('click', () => deps.quranVoiceInputAPI.toggleListening());
  }

  const unsubscribeState = stateStore.subscribe((newState) => {
    // Only update if quranSelection itself has changed by reference, or deep compare (costly)
    // Or, rely on _updateUIFromState to handle idempotent updates
    _updateUIFromStateLocal(newState.currentProject?.quranSelection);
  });

  // console.info('[QuranSelectorUI] Initialized.');
  return {
    cleanup: () => {
      unsubscribeState();
      [quranSelectorUI.surahSelectRef, quranSelectorUI.ayahStartSelectRef, quranSelectorUI.ayahEndSelectRef, 
       quranSelectorUI.reciterSelectRef, quranSelectorUI.translationSelectRef].forEach(el => {
        if(el) el.removeEventListener('change', _handleSelectionChangeEvent);
      });
      // console.info('[QuranSelectorUI] Cleaned up.');
    }
  };
}

export default quranSelectorUI;
