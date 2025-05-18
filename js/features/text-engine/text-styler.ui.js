// js/features/text-engine/text-styler.ui.js

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';
import dynamicSelectBuilder from '../../shared-ui-components/dynamic-select.builder.js'; // Optional but helpful

// Define supported fonts and text animations
// These could also come from app.constants.js or a dedicated config file.
export const SUPPORTED_QURAN_FONTS = {
  "'Amiri Quran', serif": { name: 'Amiri Quran (نسخ تقليدي)' },
  "'Noto Naskh Arabic', serif": { name: 'Noto Naskh Arabic (نسخ واضح)' },
  "'Uthmanic Hafs', 'KFGQPC Uthmanic Script Hafs', serif": { name: 'Uthmanic Hafs (مصحف المدينة)' }, // Requires font to be loaded
  "'Katibeh', cursive": { name: 'Katibeh (رقعة/ديواني بسيط)'},
  "'Tajawal', sans-serif": { name: 'Tajawal (حديث وبسيط)' },
  // Add more fonts. Ensure they are loaded via @import in CSS or <link> in HTML.
};

export const SUPPORTED_TEXT_ANIMATIONS = {
  'none': { name: 'بدون تأثير' },
  'fade': { name: 'تلاشي (Fade In)' },
  'typewriter': { name: 'كتابة تدريجية (Typewriter)' },
  'slideUp': { name: 'انزلاق للأعلى (Slide Up)'}, // Example, would need CSS/JS logic
  // 'reveal': { name: 'ظهور تدريجي (Reveal)'}, // Example
};


const textStylerUI = (() => {
  // DOM element references (will be assigned in init)
  let fontFamilySelect, fontSizeSlider, fontSizeValueDisplay, fontColorPicker,
      ayahTextBgColorPicker, textAnimationSelect;

  let dependencies = {
    stateStore: {
      getState: () => ({ currentProject: { textStyle: { ...DEFAULT_PROJECT_SCHEMA.textStyle } } }),
      dispatch: () => {},
      subscribe: () => (() => {})
    },
    errorLogger: console,
    // localizationService: { translate: key => key } // For labels if not hardcoded or in HTML
  };
  
  /** Helper to safely get number from input or default */
  const _parseNumberInput = (value, defaultValue) => {
      const num = parseFloat(value);
      return isNaN(num) ? defaultValue : num;
  };

  /** Updates all UI controls based on the provided textStyle state. @private */
  function _updateUIFromState(textStyleState) {
    const ts = textStyleState || DEFAULT_PROJECT_SCHEMA.textStyle;

    if (fontFamilySelect && fontFamilySelect.value !== ts.fontFamily) {
        // dynamicSelectBuilder.setSelectedValue might be better if used for population
        if (SUPPORTED_QURAN_FONTS[ts.fontFamily]) {
            fontFamilySelect.value = ts.fontFamily;
        } else {
            fontFamilySelect.value = DEFAULT_PROJECT_SCHEMA.textStyle.fontFamily; // Fallback
        }
    }
    if (fontSizeSlider && fontSizeSlider.value !== String(ts.fontSize)) {
      fontSizeSlider.value = ts.fontSize;
    }
    if (fontSizeValueDisplay) {
      fontSizeValueDisplay.textContent = `${ts.fontSize}px`;
    }
    if (fontColorPicker && fontColorPicker.value !== ts.fontColor) {
      fontColorPicker.value = ts.fontColor;
    }
    if (ayahTextBgColorPicker && ayahTextBgColorPicker.value !== ts.textBgColor) {
      // Color pickers usually handle hex, but for rgba, direct set might be tricky or need a lib
      // For now, assume it handles standard color strings including rgba for preview
      ayahTextBgColorPicker.value = ts.textBgColor;
    }
    if (textAnimationSelect && textAnimationSelect.value !== ts.textAnimation) {
      if (SUPPORTED_TEXT_ANIMATIONS[ts.textAnimation]) {
        textAnimationSelect.value = ts.textAnimation;
      } else {
        textAnimationSelect.value = DEFAULT_PROJECT_SCHEMA.textStyle.textAnimation; // Fallback
      }
    }
  }

  /** Handles changes from any of the text style UI controls. @private */
  function _handleStyleChange(event) {
    const currentProject = dependencies.stateStore.getState().currentProject;
    if (!currentProject) return; // No project, no settings to change

    const currentTextStyle = currentProject.textStyle || { ...DEFAULT_PROJECT_SCHEMA.textStyle };
    let updatedTextStyle = { ...currentTextStyle }; // Start with current styles

    switch (event.target) {
      case fontFamilySelect:
        updatedTextStyle.fontFamily = fontFamilySelect.value;
        break;
      case fontSizeSlider:
        updatedTextStyle.fontSize = _parseNumberInput(fontSizeSlider.value, currentTextStyle.fontSize);
        if(fontSizeValueDisplay) fontSizeValueDisplay.textContent = `${updatedTextStyle.fontSize}px`; // Immediate UI feedback
        break;
      case fontColorPicker:
        updatedTextStyle.fontColor = fontColorPicker.value;
        break;
      case ayahTextBgColorPicker:
        updatedTextStyle.textBgColor = ayahTextBgColorPicker.value;
        break;
      case textAnimationSelect:
        updatedTextStyle.textAnimation = textAnimationSelect.value;
        break;
      default:
        return; // Unknown target
    }
    
    // Only dispatch if something actually changed (simple object comparison won't work for deep changes)
    // A more robust check would compare property by property or use a utility.
    // For now, assume a change and dispatch. State store should handle no-op if identical.
    dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      textStyle: updatedTextStyle
    });
  }

  /** Populates select elements with their respective options. @private */
  function _populateSelects() {
    if (fontFamilySelect) {
      dynamicSelectBuilder.populateSelect({
        selectElement: fontFamilySelect,
        data: Object.entries(SUPPORTED_QURAN_FONTS).map(([value, { name }]) => ({ value, name })),
        valueField: 'value',
        textField: 'name',
        // selectedValue will be set by _updateUIFromState
      });
    } else {
        (dependencies.errorLogger.logWarning || console.warn)('Font family select not found for population.');
    }

    if (textAnimationSelect) {
      dynamicSelectBuilder.populateSelect({
        selectElement: textAnimationSelect,
        data: Object.entries(SUPPORTED_TEXT_ANIMATIONS).map(([value, { name }]) => ({ value, name })),
        valueField: 'value',
        textField: 'name',
      });
    } else {
        (dependencies.errorLogger.logWarning || console.warn)('Text animation select not found for population.');
    }
  }

  /** Sets up event listeners for all UI controls. @private */
  function _setupEventListeners() {
    // Assign DOMElements (assuming they are populated by the time this module's init runs)
    fontFamilySelect = DOMElements.fontFamilySelect;
    fontSizeSlider = DOMElements.fontSizeSlider;
    fontSizeValueDisplay = DOMElements.fontSizeValueDisplay;
    fontColorPicker = DOMElements.fontColorPicker;
    ayahTextBgColorPicker = DOMElements.ayahTextBgColorPicker;
    textAnimationSelect = DOMElements.textAnimationSelect;

    const elementsToListen = [
        fontFamilySelect, fontSizeSlider, fontColorPicker,
        ayahTextBgColorPicker, textAnimationSelect
    ];
    
    elementsToListen.forEach(element => {
      if (element) {
        // Use 'input' for sliders and color pickers for immediate feedback.
        // Use 'change' for select dropdowns.
        const eventType = (element.type === 'range' || element.type === 'color') ? 'input' : 'change';
        element.addEventListener(eventType, _handleStyleChange);
      } else {
        // This log might be too noisy if some elements are optional or not found in a test
        // A more robust way is to check DOMElements directly.
        // dependencies.errorLogger.logWarning({
        //     message: `A text styler UI element was not found in DOMElements during event listener setup.`,
        //     origin: 'TextStylerUI._setupEventListeners'
        // });
      }
    });
    
    // Specific handling for font size slider immediate display update (if not using 'input' for dispatch)
    if(fontSizeSlider && fontSizeValueDisplay && fontSizeSlider.type === 'range'){
        fontSizeSlider.addEventListener('input', () => { // Always update display on 'input'
             fontSizeValueDisplay.textContent = `${fontSizeSlider.value}px`;
        });
        // If 'change' is used for dispatch, 'input' updates display, 'change' updates state.
    }
  }
  
  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    // if (injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService;
  }

  // Public API of the module
  return {
    _setDependencies, // For initialization
    // Methods here could be for directly setting/getting styles if this module controlled more logic,
    // but its primary role via initializeTextStylerUI is to bind UI to state.
  };
})(); // IIFE removed for consistency

/**
 * Initialization function for the TextStylerUI.
 * @param {object} deps - Dependencies.
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * // @param {import('../../shared-ui-components/dynamic-select.builder.js').default} deps.dynamicSelectBuilder - if injected
 * // @param {import('../../core/localization.service.js').default} [deps.localizationService]
 */
export function initializeTextStylerUI(deps) {
  textStylerUI._setDependencies(deps); // Pass dependencies to internal scope
  const { stateStore, errorLogger } = deps;

  // --- Logic previously in IIFE's _setupEventListeners and _populateSelects ---
  textStylerUI.fontFamilySelectRef = DOMElements.fontFamilySelect;
  textStylerUI.fontSizeSliderRef = DOMElements.fontSizeSlider;
  textStylerUI.fontSizeValueDisplayRef = DOMElements.fontSizeValueDisplay;
  textStylerUI.fontColorPickerRef = DOMElements.fontColorPicker;
  textStylerUI.ayahTextBgColorPickerRef = DOMElements.ayahTextBgColorPicker;
  textStylerUI.textAnimationSelectRef = DOMElements.textAnimationSelect;

  // Populate select elements
  if (textStylerUI.fontFamilySelectRef) {
    dynamicSelectBuilder.populateSelect({
      selectElement: textStylerUI.fontFamilySelectRef,
      data: Object.entries(SUPPORTED_QURAN_FONTS).map(([value, { name }]) => ({ value, name })),
      valueField: 'value', textField: 'name',
    });
  }
  if (textStylerUI.textAnimationSelectRef) {
    dynamicSelectBuilder.populateSelect({
      selectElement: textStylerUI.textAnimationSelectRef,
      data: Object.entries(SUPPORTED_TEXT_ANIMATIONS).map(([value, { name }]) => ({ value, name })),
      valueField: 'value', textField: 'name',
    });
  }

  const _handleStyleChangeEvent = (event) => { // Event handler using deps from closure
    const currentTextStyle = stateStore.getState().currentProject?.textStyle || { ...DEFAULT_PROJECT_SCHEMA.textStyle };
    let updatedTextStyle = { ...currentTextStyle };

    const target = event.target;
    if (target === textStylerUI.fontFamilySelectRef) updatedTextStyle.fontFamily = target.value;
    else if (target === textStylerUI.fontSizeSliderRef) updatedTextStyle.fontSize = parseFloat(target.value);
    else if (target === textStylerUI.fontColorPickerRef) updatedTextStyle.fontColor = target.value;
    else if (target === textStylerUI.ayahTextBgColorPickerRef) updatedTextStyle.textBgColor = target.value;
    else if (target === textStylerUI.textAnimationSelectRef) updatedTextStyle.textAnimation = target.value;
    else return;

    stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { textStyle: updatedTextStyle });
  };
  
  // Attach listeners
  const elementsToListen = [
    { el: textStylerUI.fontFamilySelectRef, event: 'change' },
    { el: textStylerUI.fontSizeSliderRef, event: 'input' }, // 'input' for immediate dispatch
    { el: textStylerUI.fontColorPickerRef, event: 'input' },
    { el: textStylerUI.ayahTextBgColorPickerRef, event: 'input' },
    { el: textStylerUI.textAnimationSelectRef, event: 'change' },
  ];

  elementsToListen.forEach(({el, event}) => {
    if(el) el.addEventListener(event, _handleStyleChangeEvent);
  });

  if(textStylerUI.fontSizeSliderRef && textStylerUI.fontSizeValueDisplayRef) {
      textStylerUI.fontSizeSliderRef.addEventListener('input', () => { // Always update display on input
          textStylerUI.fontSizeValueDisplayRef.textContent = `${textStylerUI.fontSizeSliderRef.value}px`;
      });
  }


  // Subscribe to state changes to update UI
  const _updateUIFromStateDirect = (textStyleState) => {
      const ts = textStyleState || DEFAULT_PROJECT_SCHEMA.textStyle;
      if(textStylerUI.fontFamilySelectRef && textStylerUI.fontFamilySelectRef.value !== ts.fontFamily && SUPPORTED_QURAN_FONTS[ts.fontFamily]) textStylerUI.fontFamilySelectRef.value = ts.fontFamily;
      if(textStylerUI.fontSizeSliderRef && textStylerUI.fontSizeSliderRef.value !== String(ts.fontSize)) textStylerUI.fontSizeSliderRef.value = ts.fontSize;
      if(textStylerUI.fontSizeValueDisplayRef) textStylerUI.fontSizeValueDisplayRef.textContent = `${ts.fontSize}px`;
      if(textStylerUI.fontColorPickerRef && textStylerUI.fontColorPickerRef.value !== ts.fontColor) textStylerUI.fontColorPickerRef.value = ts.fontColor;
      if(textStylerUI.ayahTextBgColorPickerRef && textStylerUI.ayahTextBgColorPickerRef.value !== ts.textBgColor) textStylerUI.ayahTextBgColorPickerRef.value = ts.textBgColor;
      if(textStylerUI.textAnimationSelectRef && textStylerUI.textAnimationSelectRef.value !== ts.textAnimation && SUPPORTED_TEXT_ANIMATIONS[ts.textAnimation]) textStylerUI.textAnimationSelectRef.value = ts.textAnimation;
  };

  const unsubscribeState = stateStore.subscribe((newState) => {
    _updateUIFromStateDirect(newState.currentProject?.textStyle);
  });

  // Initial UI sync
  _updateUIFromStateDirect(stateStore.getState().currentProject?.textStyle);

  // console.info('[TextStylerUI] Initialized.');
  return {
    cleanup: () => {
      unsubscribeState();
      elementsToListen.forEach(({el, event}) => {
        if(el) el.removeEventListener(event, _handleStyleChangeEvent);
      });
       if(textStylerUI.fontSizeSliderRef && textStylerUI.fontSizeValueDisplayRef) { // Also remove its specific input listener
           textStylerUI.fontSizeSliderRef.removeEventListener('input', () => {
               textStylerUI.fontSizeValueDisplayRef.textContent = `${textStylerUI.fontSizeSliderRef.value}px`;
           });
       }
      // console.info('[TextStylerUI] Cleaned up.');
    }
    // No other public API typically needed by other modules for this UI controller.
  };
}

export default textStylerUI;
