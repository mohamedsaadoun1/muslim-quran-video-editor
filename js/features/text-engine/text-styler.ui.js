// js/features/text-engine/text-styler.ui.js
import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';
import dynamicSelectBuilder from '../../shared-ui-components/dynamic-select.builder.js';

// تعريف الخطوط والتأثيرات
export const SUPPORTED_QURAN_FONTS = {
  "'Amiri Quran', serif": { name: 'Amiri Quran (نسخ تقليدي)' },
  "'Noto Naskh Arabic', serif": { name: 'Noto Naskh Arabic (نسخ واضح)' },
  "'Uthmanic Hafs', 'KFGQPC Uthmanic Script Hafs', serif": { name: 'Uthmanic Hafs (مصحف المدينة)' },
  "'Katibeh', cursive": { name: 'Katibeh (رقعة/ديواني بسيط)' },
  "'Tajawal', sans-serif": { name: 'Tajawal (حديث وبسيط)' },
};

export const SUPPORTED_TEXT_ANIMATIONS = {
  'none': { name: 'بدون تأثير' },
  'fade': { name: 'تلاشي (Fade In)' },
  'typewriter': { name: 'كتابة تدريجية (Typewriter)' },
  'slideUp': { name: 'انزلاق للأعلى (Slide Up)' },
};

const textStylerUI = (() => {
  // المتغيرات الداخلية
  let fontFamilySelect, fontSizeSlider, fontSizeValueDisplay, fontColorPicker,
      ayahTextBgColorPicker, textAnimationSelect;
  let unsubscribeState = () => {};

  // الاعتمادات (dependencies)
  let dependencies = {
    stateStore: {
      getState: () => ({ currentProject: { textStyle: { ...DEFAULT_PROJECT_SCHEMA.textStyle } } }),
      dispatch: () => {},
      subscribe: () => (() => {})
    },
    errorLogger: console,
    localizationService: { translate: key => key }
  };

  // أدوات مساعدة
  const _parseNumberInput = (value, defaultValue) => {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : Math.min(num, 100);
  };

  const _safeText = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // تحديث واجهة المستخدم من الحالة
  const _updateUIFromState = (textStyleState) => {
    const ts = textStyleState || DEFAULT_PROJECT_SCHEMA.textStyle;
    
    if (fontFamilySelect && SUPPORTED_QURAN_FONTS[ts.fontFamily]) {
      fontFamilySelect.value = ts.fontFamily;
    }
    
    if (fontSizeSlider) {
      fontSizeSlider.value = ts.fontSize;
      fontSizeValueDisplay.textContent = `${ts.fontSize}px`;
    }
    
    if (fontColorPicker) fontColorPicker.value = ts.fontColor;
    if (ayahTextBgColorPicker) ayahTextBgColorPicker.value = ts.textBgColor;
    
    if (textAnimationSelect && SUPPORTED_TEXT_ANIMATIONS[ts.textAnimation]) {
      textAnimationSelect.value = ts.textAnimation;
    }
  };

  // معالجة تغييرات الحالة
  const _handleStyleChange = debounce((event) => {
    const currentProject = dependencies.stateStore.getState().currentProject;
    if (!currentProject) return;

    const currentTextStyle = currentProject.textStyle || { ...DEFAULT_PROJECT_SCHEMA.textStyle };
    let updatedTextStyle = { ...currentTextStyle };

    switch (event.target) {
      case fontFamilySelect:
        updatedTextStyle.fontFamily = fontFamilySelect.value;
        break;
      case fontSizeSlider:
        updatedTextStyle.fontSize = _parseNumberInput(fontSizeSlider.value, currentTextStyle.fontSize);
        fontSizeValueDisplay.textContent = `${updatedTextStyle.fontSize}px`;
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
        return;
    }

    dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
      textStyle: updatedTextStyle
    });
  }, 200);

  // ملء القوائم
  const _populateSelects = () => {
    if (fontFamilySelect) {
      dynamicSelectBuilder.populateSelect({
        selectElement: fontFamilySelect,
        data: Object.entries(SUPPORTED_QURAN_FONTS).map(([value, { name }]) => ({
          value, name: _safeText(name)
        })),
        valueField: 'value',
        textField: 'name'
      });
    }

    if (textAnimationSelect) {
      dynamicSelectBuilder.populateSelect({
        selectElement: textAnimationSelect,
        data: Object.entries(SUPPORTED_TEXT_ANIMATIONS).map(([value, { name }]) => ({
          value, name: _safeText(name)
        })),
        valueField: 'value',
        textField: 'name'
      });
    }
  };

  // إعداد المستمعين
  const _setupEventListeners = () => {
    fontFamilySelect = DOMElements.fontFamilySelect;
    fontSizeSlider = DOMElements.fontSizeSlider;
    fontSizeValueDisplay = DOMElements.fontSizeValueDisplay;
    fontColorPicker = DOMElements.fontColorPicker;
    ayahTextBgColorPicker = DOMElements.ayahTextBgColorPicker;
    textAnimationSelect = DOMElements.textAnimationSelect;

    const elementsToListen = [
      { el: fontFamilySelect, event: 'change' },
      { el: fontSizeSlider, event: 'input' },
      { el: fontColorPicker, event: 'input' },
      { el: ayahTextBgColorPicker, event: 'input' },
      { el: textAnimationSelect, event: 'change' }
    ];

    elementsToListen.forEach(({ el, event }) => {
      if (el) el.addEventListener(event, _handleStyleChange);
    });

    if (fontSizeSlider && fontSizeValueDisplay) {
      fontSizeSlider.addEventListener('input', () => {
        fontSizeValueDisplay.textContent = `${fontSizeSlider.value}px`;
      });
    }

    unsubscribeState = dependencies.stateStore.subscribe((newState) => {
      _updateUIFromState(newState.currentProject?.textStyle);
    });

    _updateUIFromState(dependencies.stateStore.getState().currentProject?.textStyle);
  };

  // تحديد الاعتمادات
  const _setDependencies = (injectedDeps) => {
    dependencies = { ...dependencies, ...injectedDeps };
  };

  // تنظيف الموارد
  const cleanup = () => {
    unsubscribeState();
    [fontFamilySelect, fontSizeSlider, fontColorPicker, ayahTextBgColorPicker, textAnimationSelect].forEach(el => {
      if (el) el.removeEventListener('change', _handleStyleChange);
      if (el) el.removeEventListener('input', _handleStyleChange);
    });
    fontFamilySelect = fontSizeSlider = fontSizeValueDisplay = fontColorPicker = ayahTextBgColorPicker = textAnimationSelect = null;
  };

  return {
    _setDependencies,
    cleanup
  };
})();

/**
 * وظيفة التهيئة
 * @param {Object} deps - الاعتمادات
 */
export function initializeTextStylerUI(deps) {
  textStylerUI._setDependencies(deps);
  textStylerUI.cleanup();
  textStylerUI._setupEventListeners();
  textStylerUI._populateSelects();
  return { cleanup: textStylerUI.cleanup };
}

export default textStylerUI;
