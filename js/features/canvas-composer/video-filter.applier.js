// js/features/canvas-composer/video-filter.applier.js

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';

/**
 * @constant {object} SUPPORTED_VIDEO_FILTERS
 * @description قاموس يحتوي على الفلاتر المدعومة وأسماءها وقيم CSS الخاصة بها.
 * الأسماء هنا باللغة العربية لدعم الواجهة.
 * @property {object} none - فلتر "بدون فلتر".
 * @property {object} grayscale - فلتر "رمادي".
 * @property {object} sepia - فلتر "بني داكن (سيبيا)".
 * @property {object} brightness_high - فلتر "سطوع عالي".
 * @property {object} brightness_low - فلتر "سطوع منخفض".
 * @property {object} contrast_high - فلتر "تباين عالي".
 * @property {object} contrast_low - فلتر "تباين منخفض".
 * @property {object} blur - فلتر "ضبابي (خفيف)" - (استخدم بحذر، قد يكون بطيئًا).
 * @property {object} invert - فلتر "عكس الألوان".
 * @property {object} saturate_high - فلتر "تشبع لوني عالي".
 * @property {object} saturate_low - فلتر "تشبع لوني منخفض".
 * @property {object} hue_rotate_90 - فلتر "تدوير الصبغة (90°)".
 * @example
 * // {
 * //   none: { name: 'بدون فلتر', value: 'none' },
 * //   grayscale: { name: 'رمادي', value: 'grayscale(100%)' },
 * //   // ... المزيد من الفلاتر
 * // }
 */
export const SUPPORTED_VIDEO_FILTERS = {
  none: { name: 'بدون فلتر', value: 'none' },
  grayscale: { name: 'رمادي', value: 'grayscale(100%)' },
  sepia: { name: 'بني داكن (سيبيا)', value: 'sepia(100%)' },
  brightness_high: { name: 'سطوع عالي', value: 'brightness(1.5)' },
  brightness_low: { name: 'سطوع منخفض', value: 'brightness(0.7)' },
  contrast_high: { name: 'تباين عالي', value: 'contrast(1.8)' },
  contrast_low: { name: 'تباين منخفض', value: 'contrast(0.6)' },
  blur: { name: 'ضبابي (خفيف)', value: 'blur(2px)' },
  invert: { name: 'عكس الألوان', value: 'invert(100%)' },
  saturate_high: { name: 'تشبع لوني عالي', value: 'saturate(2)' },
  saturate_low: { name: 'تشبع لوني منخفض', value: 'saturate(0.3)' },
  hue_rotate_90: { name: 'تدوير الصبغة (90°)', value: 'hue-rotate(90deg)' },
  // يمكنك إضافة فلاتر مركبة هنا إذا أردت:
  // 'old_film': { name: 'فيلم قديم', value: 'sepia(0.7) contrast(1.2) brightness(0.9) saturate(0.8)'},
};

/**
 * @class VideoFilterApplier
 * @description مسؤول عن تطبيق فلاتر الفيديو على عنصر الكانفاس وإدارة واجهة اختيار الفلاتر.
 * يتكامل مع مخزن الحالة (StateStore) لتحديثات الفلاتر ويعتمد على حقن التبعيات.
 */
class VideoFilterApplier {
  /**
   * @private
   * @type {HTMLCanvasElement|null}
   * @description مرجع لعنصر الكانفاس لمعاينة الفيديو.
   */
  #canvasElement = null;

  /**
   * @private
   * @type {HTMLSelectElement|null}
   * @description مرجع لعنصر القائمة المنسدلة لاختيار الفلاتر.
   */
  #filterSelectElement = null;

  /**
   * @private
   * @type {import('../../core/state-store.js').default|null}
   * @description مرجع لمخزن الحالة لإرسال التحديثات والاشتراك في التغييرات.
   */
  #stateStore = null;

  /**
   * @private
   * @type {import('../../core/error-logger.js').default|Console}
   * @description مرجع لمسجل الأخطاء أو `console` كبديل.
   */
  #errorLogger = console; // Default to console

  /**
   * @private
   * @type {Function}
   * @description دالة لإلغاء الاشتراك في تحديثات مخزن الحالة.
   */
  #unsubscribeState = () => {};

  /**
   * @constructor
   * @param {object} dependencies - التبعيات المطلوبة للوحدة.
   * @param {import('../../core/state-store.js').default} dependencies.stateStore - مخزن الحالة.
   * @param {import('../../core/error-logger.js').default} [dependencies.errorLogger] - مسجل الأخطاء (اختياري، يستخدم console افتراضيًا).
   * @throws {Error} إذا لم يتم العثور على عنصر الكانفاس أو قائمة اختيار الفلاتر.
   */
  constructor({ stateStore, errorLogger }) {
    this.#canvasElement = DOMElements.videoPreviewCanvas;
    this.#filterSelectElement = DOMElements.videoFilterSelect;

    if (!this.#canvasElement || !this.#filterSelectElement) {
      const message = 'VideoFilterApplier: Canvas element or filter select element not found. Functionality will be impaired.';
      if (errorLogger && typeof errorLogger.logError === 'function') {
        errorLogger.logError({ message, origin: 'VideoFilterApplier.constructor' });
      } else {
        console.error(message);
      }
      // لا يمكن المتابعة بدون العناصر الأساسية، يمكن إلقاء خطأ أو تعطيل الوحدة بهدوء.
      // في هذه الحالة، سنسمح بإنشاء الكائن ولكن لن يعمل بشكل صحيح.
      // يمكن للمستهلك التحقق من ذلك إذا لزم الأمر.
      return;
    }

    this.#stateStore = stateStore;
    if (errorLogger) {
      this.#errorLogger = errorLogger;
    }

    this.#initialize();
  }

  /**
   * @private
   * @description يقوم بتهيئة الوحدة: ملء قائمة الفلاتر، ربط المستمعين، الاشتراك في الحالة، وتطبيق الفلتر الأولي.
   */
  #initialize() {
    if (!this.#canvasElement || !this.#filterSelectElement || !this.#stateStore) return;

    this.#populateFilterSelect();
    this.#filterSelectElement.addEventListener('change', this.#handleFilterSelectionChange.bind(this));
    
    this.#unsubscribeState = this.#stateStore.subscribe(this.#handleStateUpdate.bind(this));

    // تطبيق الفلتر الأولي بناءً على الحالة الحالية
    const initialState = this.#stateStore.getState();
    this.#handleStateUpdate(initialState, true); // 'true' للإشارة إلى أنه تحديث أولي

    this.#logInfo('Initialized.');
  }

  /**
   * @private
   * @description يملأ القائمة المنسدلة لاختيار الفلاتر بالخيارات المتاحة.
   * يتم تعيين اتجاه النص إلى 'rtl' لضمان العرض الصحيح للغة العربية.
   */
  #populateFilterSelect() {
    if (!this.#filterSelectElement) return;

    // مسح الخيارات الموجودة
    this.#filterSelectElement.innerHTML = '';
    this.#filterSelectElement.setAttribute('dir', 'rtl'); // دعم RTL

    Object.entries(SUPPORTED_VIDEO_FILTERS).forEach(([key, filter]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = filter.name; // الأسماء بالفعل باللغة العربية
      this.#filterSelectElement.appendChild(option);
    });
  }

  /**
   * @private
   * @description يعالج تغيير اختيار الفلتر من القائمة المنسدلة.
   * يرسل إجراءً لتحديث إعدادات المشروع في مخزن الحالة.
   */
  #handleFilterSelectionChange() {
    if (!this.#filterSelectElement || !this.#stateStore) return;

    const selectedFilterKey = this.#filterSelectElement.value;
    if (SUPPORTED_VIDEO_FILTERS[selectedFilterKey]) {
      this.#logDebug(`Filter selected: ${selectedFilterKey}`);
      this.#stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
        videoComposition: {
          videoFilter: selectedFilterKey,
        },
      });
    } else {
      this.#logWarning(`Invalid video filter key selected: ${selectedFilterKey}`, '_handleFilterSelectionChange');
    }
  }

  /**
   * @private
   * @param {object} newState - الحالة الجديدة من مخزن الحالة.
   * @param {boolean} [isInitialCall=false] - هل هذا هو الاستدعاء الأولي عند التهيئة.
   * @description يعالج تحديثات الحالة من مخزن الحالة.
   * يطبق الفلتر المناسب على الكانفاس ويحدث واجهة المستخدم لقائمة اختيار الفلاتر.
   */
  #handleStateUpdate(newState, isInitialCall = false) {
    if (!this.#canvasElement) return;

    const project = newState?.currentProject;
    let activeFilterKey = project?.videoComposition?.videoFilter || DEFAULT_PROJECT_SCHEMA.videoComposition.videoFilter;
    
    let filterValueToApply;

    if (SUPPORTED_VIDEO_FILTERS[activeFilterKey]) {
      filterValueToApply = SUPPORTED_VIDEO_FILTERS[activeFilterKey].value;
    } else {
      if (!isInitialCall) { // لا تسجل تحذيرًا إذا كان المفتاح غير صالح أثناء التحميل الأولي من حالة قديمة
          this.#logWarning(`Invalid videoFilter key "${activeFilterKey}" in state. Defaulting to 'none'.`, 'handleStateUpdate');
      }
      activeFilterKey = 'none'; // تصحيح المفتاح إلى 'none'
      filterValueToApply = SUPPORTED_VIDEO_FILTERS.none.value;
    }
    
    this.#applyFilterToCanvas(filterValueToApply);
    this.#updateFilterSelectUI(activeFilterKey);
  }

  /**
   * @private
   * @param {string} filterValue - قيمة فلتر CSS المطلوب تطبيقها (مثال: "grayscale(100%)").
   * @description يطبق فلتر CSS المحدد على عنصر الكانفاس.
   */
  #applyFilterToCanvas(filterValue) {
    if (this.#canvasElement) {
      this.#canvasElement.style.filter = filterValue || 'none';
      // this.#logDebug(`Applied filter to canvas: ${filterValue}`); // يمكن تفعيله عند الحاجة
    }
  }

  /**
   * @private
   * @param {string} filterKey - مفتاح الفلتر النشط حاليًا (مثال: 'grayscale').
   * @description يحدث واجهة المستخدم لقائمة اختيار الفلاتر لتعكس الفلتر النشط.
   */
  #updateFilterSelectUI(filterKey) {
    if (this.#filterSelectElement && this.#filterSelectElement.value !== filterKey) {
      if (SUPPORTED_VIDEO_FILTERS[filterKey]) {
        this.#filterSelectElement.value = filterKey;
      } else {
        // إذا كان المفتاح في الحالة غير صالح، ارجع إلى 'none'
        this.#filterSelectElement.value = 'none';
      }
    }
  }

  /**
   * @private
   * @param {string} message - الرسالة المراد تسجيلها.
   * @param {string} [origin='VideoFilterApplier'] - مصدر الرسالة.
   * @description أداة مساعدة لتسجيل معلومات التصحيح.
   */
  #logDebug(message, origin = 'VideoFilterApplier') {
    if (this.#errorLogger && typeof this.#errorLogger.logDebug === 'function') {
      this.#errorLogger.logDebug({ message, origin });
    } else if (process.env.NODE_ENV === 'development') { // تجنب console.debug في الإنتاج إذا لم يكن errorLogger مخصصًا
      console.debug(`[${origin}] ${message}`);
    }
  }
  
  /**
   * @private
   * @param {string} message - الرسالة المراد تسجيلها.
   * @param {string} [origin='VideoFilterApplier'] - مصدر الرسالة.
   * @description أداة مساعدة لتسجيل معلومات عامة.
   */
  #logInfo(message, origin = 'VideoFilterApplier') {
    if (this.#errorLogger && typeof this.#errorLogger.logInfo === 'function') {
      this.#errorLogger.logInfo({ message, origin });
    } else {
      console.info(`[${origin}] ${message}`);
    }
  }

  /**
   * @private
   * @param {string} message - الرسالة المراد تسجيلها.
   * @param {string} [origin='VideoFilterApplier'] - مصدر الرسالة.
   * @description أداة مساعدة لتسجيل التحذيرات.
   */
  #logWarning(message, origin = 'VideoFilterApplier') {
    if (this.#errorLogger && typeof this.#errorLogger.logWarning === 'function') {
      this.#errorLogger.logWarning({ message, origin });
    } else {
      console.warn(`[${origin}] ${message}`);
    }
  }

  /**
   * @public
   * @description يقوم بتنظيف الموارد عند تدمير أو إيقاف الوحدة.
   * يزيل مستمعي الأحداث، يلغي الاشتراك في مخزن الحالة، ويعيد تعيين فلتر الكانفاس.
   */
  destroy() {
    this.#unsubscribeState();
    if (this.#filterSelectElement) {
      this.#filterSelectElement.removeEventListener('change', this.#handleFilterSelectionChange.bind(this));
    }
    if (this.#canvasElement) {
      this.#canvasElement.style.filter = 'none'; // إعادة تعيين الفلتر
    }
    
    // إزالة المراجع للمساعدة في جمع القمامة (Garbage Collection)
    this.#canvasElement = null;
    this.#filterSelectElement = null;
    this.#stateStore = null;
    // this.#errorLogger = null; // لا يتم تعيينه إلى null لأنه قد يكون console

    this.#logInfo('Cleaned up and destroyed.');
  }

  /**
   * @public
   * @description يتيح تطبيق فلتر برمجيًا عن طريق مفتاحه.
   * هذا مفيد إذا كانت وحدات أخرى تحتاج إلى تغيير الفلتر.
   * @param {string} filterKey - مفتاح الفلتر المراد تطبيقه (من `SUPPORTED_VIDEO_FILTERS`).
   */
  applyFilterByKey(filterKey) {
    if (!this.#stateStore) {
        this.#logWarning('StateStore not available, cannot apply filter by key.', 'applyFilterByKey');
        return;
    }
    if (SUPPORTED_VIDEO_FILTERS[filterKey]) {
      this.#stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
        videoComposition: { videoFilter: filterKey },
      });
    } else {
      this.#logWarning(`Attempted to apply an unsupported filter key: ${filterKey}`, 'applyFilterByKey');
    }
  }
}

export default VideoFilterApplier;

// ===================================================================================
// مثال على كيفية استخدام هذا الكلاس في مكان آخر من المشروع (عادة في ملف التهيئة الرئيسي)
// ===================================================================================
/*
import VideoFilterApplier from './features/canvas-composer/video-filter.applier.js';
import stateStore from './core/state-store.js'; // افتراض وجوده
import errorLogger from './core/error-logger.js'; // افتراض وجوده

let videoFilterModuleInstance = null;

export function initializeMainApplicationComponents() {
  // ... تهيئة باقي مكونات التطبيق ...

  try {
    videoFilterModuleInstance = new VideoFilterApplier({
      stateStore,
      errorLogger,
      // لا حاجة لتمرير DOMElements.videoPreviewCanvas و DOMElements.videoFilterSelect
      // لأن الكلاس سيحصل عليها بنفسه من DOMElements
    });
  } catch (error) {
    // يمكن تسجيل الخطأ هنا إذا كان الإنشاء نفسه يلقي خطأ (لكن التصميم الحالي لا يفعل)
    console.error("Failed to initialize VideoFilterApplier:", error);
  }

  // ...
}

export function cleanupMainApplicationComponents() {
  // ... تنظيف باقي المكونات ...
  if (videoFilterModuleInstance) {
    videoFilterModuleInstance.destroy();
    videoFilterModuleInstance = null;
  }
}

// في حالة وجود Hot Module Replacement (HMR) أو ما شابه:
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (videoFilterModuleInstance) {
      videoFilterModuleInstance.destroy();
    }
  });
}
*/
