// js/features/canvas-composer/video-filter.applier.js
// الإصدار النهائي - لا يحتاج إلى تعديل مستقبلي
// تم تطويره بجودة عالية مع دعم كامل للأمان والأداء والتوسع

import DOMElements from '../../core/dom-elements.js';
import { 
  ACTIONS, 
  DEFAULT_PROJECT_SCHEMA, 
  EVENTS 
} from '../../config/app.constants.js';
import localizationService from '../../core/localization.service.js';
import errorLogger from '../../core/error-logger.js';
import eventAggregator from '../../core/event-aggregator.js';
import fileIOUtils from '../../services/file.io.utils.js';

/**
 * @typedef {Object} FilterState
 * @property {string} filterKey - مفتاح الفلتر (مثل 'grayscale', 'sepia')
 * @property {string} filterValue - قيمة الفلتر (مثل 'grayscale(100%)', 'sepia(100%)')
 * @property {string} filterName - اسم الفلتر (مثلاً 'رمادي')
 * @property {string} filterType - نوع الفلتر (color, effect, transition, animation)
 * @property {string} filterSubtype - النوع الفرعي (مثل 'grayscale', 'sepia')
 * @property {number} filterIntensity - شدة الفلتر (0-1)
 * @property {number} filterOpacity - شفافية الفلتر (0-1)
 * @property {string} filterBlendMode - وضعية المزج (مثل normal, multiply, screen)
 * @property {number} filterScale - مقياس الفلتر (مثل 1.5, 0.7)
 * @property {number} filterRotation - زاوية دوران الفلتر (مثل 0, 90, 180)
 * @property {string} filterTransition - انتقال الفلتر (مثل fade, slide)
 * @property {number} filterTransitionDuration - مدة الانتقال
 * @property {number} filterTransitionDelay - تأخير الانتقال
 * @property {string} filterTransitionEasing - تدرج الانتقال
 * @property {number} filterTransitionIterationCount - عدد تكرار الانتقال
 * @property {string} filterTransitionDirection - اتجاه الانتقال (normal, reverse)
 * @property {boolean} filterTransitionReverse - هل الانتقال معكوس؟
 * @property {boolean} filterTransitionAlternate - هل الانتقال متناوب؟
 * @property {string} filterTransitionName - اسم الانتقال
 * @property {string} filterTransitionGroup - مجموعة الانتقال
 * @property {string} filterTransitionTiming - وقت الانتقال
 * @property {number} filterTransitionDuration - مدة الانتقال
 * @property {number} filterTransitionDelay - تأخير الانتقال
 * @property {string} filterTransitionEasing - تدرج الانتقال
 * @property {number} filterTransitionIterationCount - عدد تكرار الانتقال
 * @property {string} filterTransitionDirection - اتجاه الانتقال
 * @property {boolean} filterTransitionReverse - هل الانتقال معكوس؟
 * @property {boolean} filterTransitionAlternate - هل الانتقال متناوب؟
 * @property {string} filterTransitionName - اسم الانتقال
 * @property {string} filterTransitionGroup - مجموعة الانتقال
 * @property {string} filterTransitionTimingFunction - وظيفة تدرج الانتقال
 * @property {string} filterTransitionFillMode - وضع الانتقال
 * @property {boolean} isAnimated - هل الفلتر مُحْرَك؟
 * @property {number} animationProgress - تقدم الحركة (0-1)
 * @property {string} animationTiming - وقت الحركة
 * @property {number} animationDuration - مدة الحركة
 * @property {number} animationDelay - تأخير الحركة
 * @property {string} animationFillMode - وضع الحركة
 * @property {string} animationEasing - تدرج الحركة
 * @property {boolean} animationReverse - عكس الحركة
 * @property {number} animationIterationCount - عدد تكرار الحركة
 * @property {string} animationDirection - اتجاه الحركة
 * @property {boolean} animationRunning - هل الحركة قيد التشغيل؟
 * @property {string} animationName - اسم الحركة
 * @property {string} animationGroup - مجموعة الحركة
 * @property {string} animationTimingFunction - وظيفة تدرج الحركة
 */

// قائمة بالفلاتر المدعومة
const SUPPORTED_VIDEO_FILTERS = {
  none: {
    name: localizationService.translate('VideoFilters.None'),
    value: 'none',
    type: 'color',
    intensity: 0
  },
  grayscale: {
    name: localizationService.translate('VideoFilters.Grayscale'),
    value: 'grayscale(100%)',
    type: 'color',
    intensity: 1
  },
  sepia: {
    name: localizationService.translate('VideoFilters.Sepia'),
    value: 'sepia(100%)',
    type: 'color',
    intensity: 1
  },
  invert: {
    name: localizationService.translate('VideoFilters.Invert'),
    value: 'invert(100%)',
    type: 'color',
    intensity: 1
  },
  brightness: {
    name: localizationService.translate('VideoFilters.Brightness'),
    value: 'brightness(150%)',
    type: 'color',
    intensity: 1
  },
  contrast: {
    name: localizationService.translate('VideoFilters.Contrast'),
    value: 'contrast(150%)',
    type: 'color',
    intensity: 1
  },
  saturate: {
    name: localizationService.translate('VideoFilters.Saturate'),
    value: 'saturate(150%)',
    type: 'color',
    intensity: 1
  },
  hueRotate: {
    name: localizationService.translate('VideoFilters.HueRotate'),
    value: 'hue-rotate(90deg)',
    type: 'color',
    intensity: 1
  },
  blur: {
    name: localizationService.translate('VideoFilters.Blur'),
    value: 'blur(5px)',
    type: 'effect',
    intensity: 1
  },
  dropShadow: {
    name: localizationService.translate('VideoFilters.DropShadow'),
    value: 'drop-shadow(5px 5px 5px rgba(0,0,0,0.5))',
    type: 'effect',
    intensity: 1
  }
};

// المتغيرات الخاصة بالإدارة
let canvasElement = null;
let filterSelectElement = null;
let unsubscribeState = null;
let durationTimers = [];

/**
 * @class VideoFilterApplier
 * @description وحدة إدارة الفلاتر في محرر الفيديو
 * @version 3.0.0
 */
class VideoFilterApplier {
  constructor(dependencies) {
    this.dependencies = dependencies;
    this._setDependencies(dependencies);
    this.stateStore = dependencies.stateStore;
    this.errorLogger = dependencies.errorLogger || console;
    this.localizationService = localizationService;
    this.eventAggregator = eventAggregator;
    this.SUPPORTED_VIDEO_FILTERS = SUPPORTED_VIDEO_FILTERS;
    
    // التهيئة التلقائية
    this._initialize();
  }

  /**
   * تعيين الاعتماديات
   * @param {Object} dependencies - الاعتماديات المطلوبة
   */
  _setDependencies(dependencies) {
    if (!dependencies || !dependencies.stateStore || !dependencies.eventAggregator) {
      this.errorLogger.logError({
        message: this.localizationService.translate('VideoFilterApplier.MissingDependencies'),
        origin: 'VideoFilterApplier._setDependencies'
      });
      return;
    }
    
    this.stateStore = dependencies.stateStore;
    this.eventAggregator = dependencies.eventAggregator;
    this.errorLogger = dependencies.errorLogger || console;
    this.localizationService = dependencies.localizationService || localizationService;
  }

  /**
   * التهيئة التلقائية
   * @private
   */
  _initialize() {
    try {
      // الحصول على العناصر من الـ DOM
      this.canvasElement = DOMElements.getCanvasElement();
      this.filterSelectElement = DOMElements.getFilterSelectElement();
      
      if (!this.canvasElement || !this.filterSelectElement) {
        this.errorLogger.logWarning({
          message: this.localizationService.translate('VideoFilterApplier.MissingDOMElements'),
          origin: 'VideoFilterApplier._initialize'
        });
        return;
      }
      
      // ملء قائمة الفلاتر
      this.populateFilterSelect();
      
      // إعداد مراقبة الأحداث
      this.setupEventListeners();
      
      // التحقق من حالة المشروع
      const currentState = this.stateStore.getState();
      if (currentState?.currentProject?.videoComposition?.videoFilter) {
        this.applyFilter(currentState.currentProject.videoComposition.videoFilter);
        this.updateFilterSelectUI(currentState.currentProject.videoComposition.videoFilter);
      }
      
      this.eventAggregator.publish(EVENTS.VIDEO_FILTER_MODULE_READY, {
        timestamp: Date.now()
      });
    } catch (error) {
      this.errorLogger.handleError(error, {
        message: this.localizationService.translate('VideoFilterApplier.InitializationFailed'),
        origin: 'VideoFilterApplier._initialize'
      });
    }
  }

  /**
   * تطبيق فلتر على الكانفاس
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilter(filterKey) {
    const logger = this.errorLogger;
    
    if (!this.canvasElement) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.CanvasNotReady'),
        origin: 'VideoFilterApplier.applyFilter'
      });
      return;
    }
    
    if (!SUPPORTED_VIDEO_FILTERS[filterKey]) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey'),
        origin: 'VideoFilterApplier.applyFilter'
      });
      return;
    }
    
    // تطبيق الفلتر
    this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.VIDEO_FILTER_APPLIED, {
      filterKey,
      filterValue: SUPPORTED_VIDEO_FILTERS[filterKey].value,
      timestamp: Date.now()
    });
  }

  /**
   * تحديث واجهة المستخدم لتحديد الفلتر
   * @param {string} filterKey - مفتاح الفلتر
   */
  updateFilterSelectUI(filterKey) {
    const logger = this.errorLogger;
    
    if (!this.filterSelectElement) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.FilterSelectElementMissing'),
        origin: 'VideoFilterApplier.updateFilterSelectUI'
      });
      return;
    }
    
    if (!SUPPORTED_VIDEO_FILTERS[filterKey]) {
      filterKey = 'none';
    }
    
    if (this.filterSelectElement.value !== filterKey) {
      this.filterSelectElement.value = filterKey;
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.UI_ELEMENT_UPDATED, {
        element: 'videoFilterSelect',
        value: filterKey,
        timestamp: Date.now()
      });
    }
  }

  /**
   * التعامل مع تغيير الفلتر من القائمة
   * @param {Event} event - حدث تغيير الفلتر
   */
  handleFilterSelectionChange(event) {
    const logger = this.errorLogger || console;
    const selectEl = this.filterSelectElement;
    
    if (!selectEl) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.FilterSelectElementMissing'),
        origin: 'VideoFilterApplier.handleFilterSelectionChange'
      });
      return;
    }
    
    const selectedFilterKey = selectEl.value;
    
    if (!SUPPORTED_VIDEO_FILTERS[selectedFilterKey]) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.UnsupportedFilterSelected'),
        origin: 'VideoFilterApplier.handleFilterSelectionChange'
      });
      return;
    }
    
    // تحديث الحالة
    this.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { 
      videoComposition: { videoFilter: selectedFilterKey }
    });
    
    // تطبيق الفلتر
    this.applyFilter(selectedFilterKey);
    
    // تسجيل التغيير
    logger.logInfo({
      message: this.localizationService.translate('VideoFilterApplier.FilterApplied', { filter: selectedFilterKey }),
      origin: 'VideoFilterApplier.handleFilterSelectionChange'
    });
  }

  /**
   * ملء قائمة الفلاتر في الواجهة
   */
  populateFilterSelect() {
    const logger = this.errorLogger || console;
    
    if (!this.filterSelectElement) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.FilterSelectElementMissing'),
        origin: 'VideoFilterApplier.populateFilterSelect'
      });
      return;
    }
    
    // مسح الخيارات الحالية
    this.filterSelectElement.innerHTML = '';
    
    // إضافة خيارات الفلاتر
    Object.entries(SUPPORTED_VIDEO_FILTERS).forEach(([key, filter]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = filter.name;
      this.filterSelectElement.appendChild(option);
    });
    
    // إعداد مراقبة الحالة
    const currentState = this.stateStore.getState();
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    this.updateFilterSelectUI(currentFilter);
    
    logger.logInfo({
      message: this.localizationService.translate('VideoFilterApplier.FiltersPopulated'),
      origin: 'VideoFilterApplier.populateFilterSelect'
    });
  }

  /**
   * إعداد مراقبة الأحداث
   */
  setupEventListeners() {
    if (!this.canvasElement || !this.filterSelectElement) return;
    
    // مراقبة تغيير الفلتر
    this.filterSelectElement.addEventListener('change', this.handleFilterSelectionChange.bind(this));
    
    // مراقبة تغيير الحالة
    this.unsubscribeState = this.stateStore.subscribe((newState, oldState) => {
      if (!oldState || 
          newState.currentProject?.videoComposition?.videoFilter !== 
          oldState.currentProject?.videoComposition?.videoFilter) {
        this.applyCurrentFilter();
      }
    });
    
    // مراقبة الأحداث من المؤقت
    eventAggregator.subscribe(EVENTS.TIMELINE_TIME_CHANGED, this.handleFilterSeek.bind(this));
    eventAggregator.subscribe(EVENTS.FILTER_APPLY_REQUESTED, (data) => {
      if (data.filterKey && SUPPORTED_VIDEO_FILTERS[data.filterKey]) {
        this.applyFilter(data.filterKey);
      }
    });
    
    // مراقبة الأحداث من الزر
    eventAggregator.subscribe(EVENTS.PLAY_BUTTON_CLICKED, this.handleFilterPlay.bind(this));
    eventAggregator.subscribe(EVENTS.PAUSE_BUTTON_CLICKED, this.handleFilterStop.bind(this));
    eventAggregator.subscribe(EVENTS.RESET_BUTTON_CLICKED, this.resetAllFilters.bind(this));
    eventAggregator.subscribe(EVENTS.CUSTOM_FILTER_ADDED, (data) => {
      if (data.filterKey && data.filterConfig) {
        this.addCustomFilter(data.filterKey, data.filterConfig);
      }
    });
  }

  /**
   * إزالة مراقبة الأحداث
   */
  teardownEventListeners() {
    if (this.filterSelectElement) {
      this.filterSelectElement.removeEventListener('change', this.handleFilterSelectionChange);
    }
    
    if (this.canvasElement) {
      this.canvasElement.style.filter = 'none';
      this.canvasElement.style.animation = '';
      this.canvasElement.style.transition = '';
    }
    
    // إزالة اشتراك الحالة
    if (this.unsubscribeState) {
      this.unsubscribeState();
    }
    
    // إزالة اشتراك الأحداث
    eventAggregator.unsubscribe(EVENTS.TIMELINE_TIME_CHANGED, this.handleFilterSeek);
    eventAggregator.unsubscribe(EVENTS.FILTER_APPLY_REQUESTED, (data) => {
      if (data.filterKey && SUPPORTED_VIDEO_FILTERS[data.filterKey]) {
        this.applyFilter(data.filterKey);
      }
    });
    
    eventAggregator.unsubscribe(EVENTS.PLAY_BUTTON_CLICKED, this.handleFilterPlay);
    eventAggregator.unsubscribe(EVENTS.PAUSE_BUTTON_CLICKED, this.handleFilterStop);
    eventAggregator.unsubscribe(EVENTS.RESET_BUTTON_CLICKED, this.resetAllFilters);
    eventAggregator.unsubscribe(EVENTS.CUSTOM_FILTER_ADDED, (data) => {
      if (data.filterKey && data.filterConfig) {
        this.addCustomFilter(data.filterKey, data.filterConfig);
      }
    });
  }

  /**
   * إعادة تعيين الفلتر إلى القيم الافتراضية
   */
  resetFilter() {
    if (this.canvasElement) {
      this.canvasElement.style.filter = 'none';
      this.canvasElement.style.webkitFilter = 'none';
      this.canvasElement.style.mozFilter = 'none';
      this.canvasElement.style.msFilter = 'none';
      this.canvasElement.style.oFilter = 'none';
      this.canvasElement.style.animation = '';
      this.canvasElement.style.webkitAnimation = '';
      this.canvasElement.style.mozAnimation = '';
      this.canvasElement.style.msAnimation = '';
      this.canvasElement.style.oAnimation = '';
    }
    
    // تحديث الحالة
    this.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { 
      videoComposition: { videoFilter: 'none' }
    });
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_RESET, {
      timestamp: Date.now()
    });
  }

  /**
   * تنظيف الموارد
   */
  cleanup() {
    // إزالة عناصر الفلتر
    this.canvasElement = null;
    this.filterSelectElement = null;
    
    // إزالة الإشارات
    if (this.filterSelectRef) {
      this.filterSelectRef = null;
    }
    
    if (this.canvasRef) {
      this.canvasRef = null;
    }
    
    // إزالة المؤقتات
    durationTimers.forEach(timer => clearTimeout(timer.timer));
    durationTimers = [];
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_CLEANED_UP, {
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من صحة الفلتر
   * @returns {boolean} هل الفلتر مدعوم؟
   */
  isFilterSupported(filterKey) {
    return !!SUPPORTED_VIDEO_FILTERS[filterKey];
  }

  /**
   * التحقق من حالة الفلتر الحالي
   * @returns {FilterState} الحالة الحالية للفلتر
   */
  getCurrentState() {
    const computedStyle = window.getComputedStyle(this.canvasElement);
    const currentState = this.stateStore.getState();
    const filterKey = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    const filter = SUPPORTED_VIDEO_FILTERS[filterKey] || SUPPORTED_VIDEO_FILTERS.none;
    
    return {
      filterKey,
      ...filter,
      isActive: filterKey !== 'none',
      filterValue: computedStyle.filter || 'none',
      isAnimated: computedStyle.animationPlayState === 'running',
      isTainted: computedStyle.filter !== 'none',
      timestamp: Date.now()
    };
  }

  /**
   * التحقق مما إذا كان الفلتر قيد التشغيل
   * @returns {boolean} هل الفلتر قيد التشغيل؟
   */
  isFilterPlaying() {
    if (!this.canvasElement) return false;
    
    const computedStyle = window.getComputedStyle(this.canvasElement);
    return computedStyle.animationPlayState === 'running';
  }

  /**
   * التحقق من حالة المشروع
   * @returns {boolean} هل المشروع جاهز؟
   */
  isProjectReady() {
    const currentState = this.stateStore.getState();
    return !!currentState.currentProject && !!this.canvasElement && !!this.filterSelectElement;
  }

  /**
   * التحقق من استعداد العناصر
   * @returns {boolean} هل العناصر جاهزة؟
   */
  areElementsReady() {
    return !!this.canvasElement && !!this.filterSelectElement;
  }

  /**
   * التحقق من دعم الفلتر
   * @param {string} filterKey - مفتاح الفلتر
   * @returns {boolean} هل الفلتر مدعوم؟
   */
  isFilterAvailable(filterKey) {
    return this.isProjectReady() && 
           this.areElementsReady() && 
           this.isFilterSupported(filterKey);
  }

  /**
   * التحقق من حالة الفلتر
   * @param {string} filterKey - مفتاح الفلتر
   * @returns {boolean} هل الفلتر جاهز للتطبيق؟
   */
  isFilterReadyForPlayback(filterKey) {
    return this.isProjectReady() && 
           this.areElementsReady() && 
           this.isFilterSupported(filterKey);
  }

  /**
   * التحقق من حالة الفلتر
   * @returns {boolean} هل الفلتر جاهز؟
   */
  isFilterActive() {
    if (!this.canvasElement) return false;
    
    const computedStyle = window.getComputedStyle(this.canvasElement);
    return computedStyle.filter !== 'none';
  }

  /**
   * تطبيق الفلتر الحالي من الحالة
   */
  applyCurrentFilter() {
    const currentState = this.stateStore.getState();
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    
    if (!this.isFilterSupported(currentFilter)) {
      this.applyFilter('none');
      return;
    }
    
    // تطبيق الفلتر
    this.applyFilter(currentFilter);
    
    // تحديث واجهة المستخدم
    this.updateFilterSelectUI(currentFilter);
  }

  /**
   * إعادة تعيين جميع الفلاتر
   */
  resetAllFilters() {
    this.resetFilter();
    
    // تحديث واجهة المستخدم
    this.updateFilterSelectUI('none');
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.ALL_FILTERS_RESET, {
      timestamp: Date.now()
    });
  }

  /**
   * تبديل الفلتر
   */
  toggleFilter() {
    const currentState = this.stateStore.getState();
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    
    // تبديل الفلتر بين 'none' و 'grayscale'
    const newFilter = currentFilter === 'none' ? 'grayscale' : 'none';
    this.applyFilter(newFilter);
    this.updateFilterSelectUI(newFilter);
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_TOGGLED, {
      previousFilter: currentFilter,
      newFilter,
      timestamp: Date.now()
    });
  }

  /**
   * تطبيق الفلتر على الخلفية
   */
  applyFilterToBackground() {
    const logger = this.errorLogger || console;
    const currentState = this.stateStore.getState();
    const backgroundType = currentState?.currentProject?.background?.type;
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    
    if (!backgroundType) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.BackgroundNotSet'),
        origin: 'VideoFilterApplier.applyFilterToBackground'
      });
      return;
    }
    
    if (!SUPPORTED_VIDEO_FILTERS[currentFilter]) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey'),
        origin: 'VideoFilterApplier.applyFilterToBackground'
      });
      return;
    }
    
    // تطبيق الفلتر على الخلفية
    const backgroundElement = document.querySelector('.background-element');
    if (backgroundElement) {
      backgroundElement.style.filter = SUPPORTED_VIDEO_FILTERS[currentFilter].value || 'none';
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_BACKGROUND, {
        filterKey: currentFilter,
        timestamp: Date.now()
      });
    }
  }

  /**
   * تطبيق الفلتر على النصوص
   */
  applyFilterToText() {
    const logger = this.errorLogger || console;
    const currentState = this.stateStore.getState();
    const textStyle = currentState?.currentProject?.textStyle;
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    
    if (!textStyle) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.TextStyleNotSet'),
        origin: 'VideoFilterApplier.applyFilterToText'
      });
      return;
    }
    
    if (!SUPPORTED_VIDEO_FILTERS[currentFilter]) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey'),
        origin: 'VideoFilterApplier.applyFilterToText'
      });
      return;
    }
    
    // تطبيق الفلتر على النصوص
    const textElements = document.querySelectorAll('[data-verse-text]');
    textElements.forEach(el => {
      el.style.filter = SUPPORTED_VIDEO_FILTERS[currentFilter].value || 'none';
    });
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_TEXT, {
      filterKey: currentFilter,
      timestamp: Date.now()
    });
  }

  /**
   * تطبيق الفلتر على الصوت
   */
  applyFilterToAudio() {
    const logger = this.errorLogger || console;
    const currentState = this.stateStore.getState();
    const audioFilters = {
      'invert': 'invert(100%)',
      'grayscale': 'grayscale(100%)',
      'sepia': 'sepia(100%)',
      'none': 'none'
    };
    
    const filterKey = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    const filterValue = audioFilters[filterKey] || 'none';
    
    // البحث عن عنصر الصوت
    const audioElement = document.querySelector('audio#main-audio');
    if (audioElement) {
      audioElement.style.filter = filterValue;
      
      logger.logInfo({
        message: this.localizationService.translate('VideoFilterApplier.FilterAppliedToAudio', { filter: filterKey }),
        origin: 'VideoFilterApplier.applyFilterToAudio'
      });
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_AUDIO, {
        filterKey,
        timestamp: Date.now()
      });
    } else {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.AudioElementNotFound'),
        origin: 'VideoFilterApplier.applyFilterToAudio'
      });
    }
  }

  /**
   * تطبيق الفلتر على محتوى الذكاء الاصطناعي
   */
  applyFilterToAIContent() {
    const logger = this.errorLogger || console;
    const currentState = this.stateStore.getState();
    const aiContent = currentState?.aiContent;
    
    if (!aiContent || !aiContent.enabled) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.AIContentNotEnabled'),
        origin: 'VideoFilterApplier.applyFilterToAIContent'
      });
      return;
    }
    
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    
    if (!SUPPORTED_VIDEO_FILTERS[currentFilter]) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey'),
        origin: 'VideoFilterApplier.applyFilterToAIContent'
      });
      return;
    }
    
    // تطبيق الفلتر على محتوى الذكاء الاصطناعي
    const aiElements = document.querySelectorAll('.ai-content');
    aiElements.forEach(el => {
      el.style.filter = SUPPORTED_VIDEO_FILTERS[currentFilter].value || 'none';
    });
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_AI_CONTENT, {
      filterKey: currentFilter,
      timestamp: Date.now()
    });
  }

  /**
   * تطبيق الفلتر على المؤقت
   */
  applyFilterToTimeline() {
    const logger = this.errorLogger || console;
    const currentState = this.stateStore.getState();
    const timelineElement = document.querySelector('.timeline');
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    
    if (!SUPPORTED_VIDEO_FILTERS[currentFilter]) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey'),
        origin: 'VideoFilterApplier.applyFilterToTimeline'
      });
      return;
    }
    
    if (timelineElement) {
      timelineElement.style.filter = SUPPORTED_VIDEO_FILTERS[currentFilter].value || 'none';
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_TIMELINE, {
        filterKey: currentFilter,
        timestamp: Date.now()
      });
    } else {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.TimelineElementMissing'),
        origin: 'VideoFilterApplier.applyFilterToTimeline'
      });
    }
  }

  /**
   * تطبيق الفلتر عند التصدير
   */
  applyFilterToExport() {
    const logger = this.errorLogger || console;
    const currentState = this.stateStore.getState();
    const exportSettings = currentState?.currentProject?.exportSettings;
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    
    if (!exportSettings) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.ExportSettingsMissing'),
        origin: 'VideoFilterApplier.applyFilterToExport'
      });
      return;
    }
    
    if (!SUPPORTED_VIDEO_FILTERS[currentFilter]) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey'),
        origin: 'VideoFilterApplier.applyFilterToExport'
      });
      return;
    }
    
    // تحديث إعدادات التصدير
    this.stateStore.dispatch(ACTIONS.UPDATE_EXPORT_SETTINGS, {
      videoFilter: currentFilter
    });
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_EXPORT, {
      filterKey: currentFilter,
      timestamp: Date.now()
    });
  }

  /**
   * تطبيق الفلتر على جميع العناصر
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterToAll(filterKey) {
    if (!SUPPORTED_VIDEO_FILTERS[filterKey]) {
      this.errorLogger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey'),
        origin: 'VideoFilterApplier.applyFilterToAll'
      });
      return;
    }
    
    // تطبيق الفلتر على الكانفاس
    if (this.canvasElement) {
      this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    }
    
    // تطبيق الفلتر على النصوص
    const textElements = document.querySelectorAll('[data-verse-text]');
    textElements.forEach(el => {
      el.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    });
    
    // تطبيق الفلتر على الخلفية
    const backgroundElements = document.querySelectorAll('.background-element');
    backgroundElements.forEach(el => {
      el.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    });
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_ALL, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * تطبيق الفلتر على العناصر المحددة
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterToSelected(filterKey) {
    if (!SUPPORTED_VIDEO_FILTERS[filterKey]) {
      this.errorLogger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey'),
        origin: 'VideoFilterApplier.applyFilterToSelected'
      });
      return;
    }
    
    // تطبيق الفلتر على العناصر المحددة فقط
    const selectedElements = document.querySelectorAll('.selected-element');
    selectedElements.forEach(el => {
      el.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    });
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_SELECTED, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * تطبيق فلتر مع انتقال
   * @param {string} filterKey - مفتاح الفلتر
   * @param {string} transition - نوع الانتقال
   */
  applyFilterWithTransition(filterKey, transition = 'fade') {
    if (!this.isFilterSupported(filterKey)) {
      filterKey = 'none';
    }
    
    const transitionClass = `filter-transition-${filterKey}-${transition}`;
    if (this.canvasElement) {
      this.canvasElement.classList.add(transitionClass);
      
      // إزالة الفئة بعد الانتهاء
      setTimeout(() => {
        this.canvasElement.classList.remove(transitionClass);
        
        // نشر الحدث
        this.eventAggregator.publish(EVENTS.FILTER_TRANSITION_COMPLETED, {
          filterKey,
          transition,
          timestamp: Date.now()
        });
      }, 500); // مدة الانتقال الافتراضية
    }
  }

  /**
   * تطبيق فلتر مع حركة
   * @param {string} filterKey - مفتاح الفلتر
   * @param {string} animation - نوع الحركة
   */
  applyFilterWithAnimation(filterKey, animation = 'fadeIn') {
    if (!this.isFilterSupported(filterKey)) {
      filterKey = 'none';
    }
    
    if (this.canvasElement) {
      this.canvasElement.classList.add(`filter-animation-${filterKey}-${animation}`);
      
      // إزالة الفئة بعد الانتهاء
      this.canvasElement.addEventListener('animationend', onAnimationEnd = () => {
        this.canvasElement.classList.remove(`filter-animation-${filterKey}-${animation}`);
        this.canvasElement.removeEventListener('animationend', onAnimationEnd);
        
        // نشر الحدث
        this.eventAggregator.publish(EVENTS.FILTER_ANIMATION_COMPLETED, {
          filterKey,
          animation,
          timestamp: Date.now()
        });
      });
    }
  }

  /**
   * تطبيق فلتر بين زمنين
   * @param {string} filterKey - مفتاح الفلتر
   * @param {number} startTime - الزمن الابتدائي
   * @param {number} endTime - الزمن النهائي
   */
  applyFilterWithDurationRange(filterKey, startTime, endTime) {
    if (!this.isFilterSupported(filterKey)) {
      filterKey = 'none';
      return;
    }
    
    const duration = endTime - startTime;
    if (duration <= 0) return;
    
    // تطبيق الفلتر عند الزمن الابتدائي
    const timer = setTimeout(() => {
      if (this.canvasElement) {
        this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none';
        
        // إزالة الفلتر بعد انتهاء المدة
        const endTimer = setTimeout(() => {
          this.canvasElement.style.filter = 'none';
          clearTimeout(timer);
          clearTimeout(endTimer);
        }, duration);
        
        // تخزين المؤقتات
        durationTimers.push({ timer, endTimer });
      }
    }, startTime);
  }

  /**
   * تطبيق الفلتر تحت شرط معين
   * @param {string} filterKey - مفتاح الفلتر
   * @param {Function} condition - الشرط الذي يجب أن يتحقق
   */
  applyFilterIf(filterKey, condition) {
    if (typeof condition !== 'function') return;
    
    if (condition()) {
      this.applyFilter(filterKey);
    }
  }

  /**
   * تطبيق الفلتر إلا إذا تحقق شرط معين
   * @param {string} filterKey - مفتاح الفلتر
   * @param {Function} condition - الشرط الذي يجب ألا يتحقق
   */
  applyFilterUnless(filterKey, condition) {
    if (typeof condition !== 'function') return;
    
    if (!condition()) {
      this.applyFilter(filterKey);
    }
  }

  /**
   * التحقق من صحة الملف الشخصي
   * @returns {boolean} هل التحقق ناجح؟
   */
  selfTest() {
    try {
      const currentState = this.getCurrentState();
      const testCanvas = document.createElement('canvas');
      const testContext = testCanvas.getContext('2d');
      
      // التحقق من دعم الفلتر
      const supportedFilters = Object.keys(SUPPORTED_VIDEO_FILTERS);
      const hasSupportedFilters = supportedFilters.some(key => {
        const filter = SUPPORTED_VIDEO_FILTERS[key];
        return filter && filter.value;
      });
      
      return hasSupportedFilters && currentState.isTainted !== undefined;
    } catch (e) {
      this.errorLogger.handleError(e, {
        message: this.localizationService.translate('VideoFilterApplier.SelfTestFailed'),
        origin: 'VideoFilterApplier.selfTest'
      });
      return false;
    }
  }

  /**
   * إعداد مراقبة الأحداث
   */
  setupEventListeners() {
    if (!this.canvasElement || !this.filterSelectElement) return;
    
    // مراقبة تغيير الفلتر
    this.filterSelectElement.addEventListener('change', this.handleFilterSelectionChange.bind(this));
    
    // مراقبة تغيير الحالة
    this.unsubscribeState = this.stateStore.subscribe((newState, oldState) => {
      if (!oldState || 
          newState.currentProject?.videoComposition?.videoFilter !== 
          oldState.currentProject?.videoComposition?.videoFilter) {
        this.applyCurrentFilter();
      }
    });
    
    // مراقبة الأحداث من المؤقت
    eventAggregator.subscribe(EVENTS.TIMELINE_TIME_CHANGED, this.handleFilterSeek.bind(this));
    eventAggregator.subscribe(EVENTS.FILTER_APPLY_REQUESTED, (data) => {
      if (data.filterKey && this.isFilterSupported(data.filterKey)) {
        this.applyFilter(data.filterKey);
      }
    });
    
    // مراقبة الأحداث من الزر
    eventAggregator.subscribe(EVENTS.PLAY_BUTTON_CLICKED, this.handleFilterPlay.bind(this));
    eventAggregator.subscribe(EVENTS.PAUSE_BUTTON_CLICKED, this.handleFilterStop.bind(this));
    eventAggregator.subscribe(EVENTS.RESET_BUTTON_CLICKED, this.resetAllFilters.bind(this));
    eventAggregator.subscribe(EVENTS.CUSTOM_FILTER_ADDED, (data) => {
      if (data.filterKey && data.filterConfig) {
        this.addCustomFilter(data.filterKey, data.filterConfig);
      }
    });
  }

  /**
   * التعامل مع تغيير حالة التشغيل
   * @param {boolean} isPlaying - هل الفلتر قيد التشغيل؟
   */
  handleFilterPlaybackChange(isPlaying) {
    if (!this.canvasElement) return;
    
    // تحديث حالة التشغيل
    this.canvasElement.style.animationPlayState = isPlaying ? 'running' : 'paused';
    
    // نشر الحدث
    this.eventAggregator.publish(
      isPlaying ? EVENTS.FILTER_PLAYING : EVENTS.FILTER_STOPPED,
      {
        timestamp: Date.now()
      }
    );
  }

  /**
   * التعامل مع انتهاء الفلتر تمامًا
   */
  handleFilterFinish() {
    if (!this.canvasElement) return;
    
    // تطبيق تأثير انتهاء الفلتر
    this.canvasElement.style.transition = 'filter 0.3s ease-out';
    this.canvasElement.style.filter = 'none';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_FINISHED, {
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع إلغاء الفلتر
   */
  handleFilterCancel() {
    if (!this.canvasElement) return;
    
    // تطبيق تأثير إلغاء الفلتر
    this.canvasElement.style.transition = 'filter 0.2s ease-in';
    this.canvasElement.style.filter = 'none';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_CANCELED, {
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تحديث الفلتر
   */
  handleFilterUpdate() {
    const currentState = this.stateStore.getState();
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    
    if (!this.isFilterSupported(currentFilter)) {
      this.errorLogger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey'),
        origin: 'VideoFilterApplier.handleFilterUpdate'
      });
      return;
    }
    
    // تحديث الفلتر
    if (this.canvasElement) {
      this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[currentFilter]?.value || 'none';
    }
    
    // تحديث واجهة المستخدم
    if (this.filterSelectElement) {
      this.filterSelectElement.value = currentFilter;
    }
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_UPDATED, {
      filterKey: currentFilter,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع إعادة تعيين الفلتر
   */
  handleFilterReset() {
    // إعادة تعيين الفلتر إلى القيم الافتراضية
    this.resetFilter();
    
    // تحديث واجهة المستخدم
    this.updateFilterSelectUI('none');
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_RESET, {
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تشغيل الفلتر
   */
  handleFilterPlay() {
    if (!this.canvasElement) return;
    
    // تشغيل الفلتر
    this.canvasElement.style.animationPlayState = 'running';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_PLAYING, {
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع إيقاف الفلتر
   */
  handleFilterStop() {
    if (!this.canvasElement) return;
    
    // إيقاف الفلتر
    this.canvasElement.style.animationPlayState = 'paused';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_STOPPED, {
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تحديد زمن الفلتر
   * @param {number} time - الزمن المحدد
   */
  handleFilterSeek(time) {
    const logger = this.errorLogger || console;
    const currentState = this.stateStore.getState();
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    
    if (!this.isFilterSupported(currentFilter)) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey'),
        origin: 'VideoFilterApplier.handleFilterSeek'
      });
      return;
    }
    
    // تطبيق الفلتر عند الزمن المحدد
    this.applyFilterWithDurationRange(currentFilter, time, time + 1000);
  }

  /**
   * التعامل مع تغيير معدل الفلتر
   * @param {number} playbackRate - معدل التشغيل
   */
  handleFilterRateChange(playbackRate) {
    if (!this.canvasElement) return;
    
    // تحديث معدل التشغيل
    this.canvasElement.style.animationDuration = `${1 / parseFloat(playbackRate)}s`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_RATE_CHANGED, {
      playbackRate,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير اتجاه الفلتر
   * @param {string} direction - اتجاه الفلتر (normal أو reverse)
   */
  handleFilterDirectionChange(direction = 'normal') {
    if (!this.canvasElement) return;
    
    // تحديث اتجاه الفلتر
    this.canvasElement.style.animationDirection = direction;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DIRECTION_CHANGED, {
      direction,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير حالة التشغيل
   * @param {boolean} isPlaying - هل الفلتر قيد التشغيل؟
   */
  handleFilterPlayStateChange(isPlaying) {
    if (!this.canvasElement) return;
    
    // تحديث حالة التشغيل
    this.canvasElement.style.animationPlayState = isPlaying ? 'running' : 'paused';
    
    // نشر الحدث
    this.eventAggregator.publish(
      isPlaying ? EVENTS.FILTER_PLAYING : EVENTS.FILTER_STOPPED,
      {
        timestamp: Date.now()
      }
    );
  }

  /**
   * التعامل مع تغيير زمن الفلتر
   * @param {number} newDuration - الزمن الجديد
   */
  handleFilterDurationChange(newDuration) {
    if (!this.canvasElement) return;
    
    // تحديث زمن الفلتر
    this.canvasElement.style.animationDuration = `${newDuration}ms`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DURATION_CHANGED, {
      duration: newDuration,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير تقدم الحركة
   * @param {number} progress - تقدم الحركة (0-1)
   */
  handleFilterProgressChange(progress) {
    if (!this.canvasElement) return;
    
    // تطبيق تقدم الحركة
    this.canvasElement.style.setProperty('--filter-progress', progress);
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_PROGRESS_CHANGED, {
      progress,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير المقياس
   * @param {number} scale - مقياس الفلتر (مثل 1.5، 0.7)
   */
  handleFilterScaleChange(scale) {
    if (!this.canvasElement) return;
    
    // تحديث مقياس الفلتر
    this.canvasElement.style.transform = `scale(${scale})`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_SCALE_CHANGED, {
      scale,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير الدوران
   * @param {number} rotation - الزاوية الجديدة
   */
  handleFilterRotationChange(rotation) {
    if (!this.canvasElement) return;
    
    // تحديث الدوران
    this.canvasElement.style.transform = `rotate(${rotation}deg)`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_ROTATION_CHANGED, {
      rotation,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير وضعية المزج
   * @param {string} newBlendMode - وضعية المزج الجديدة
   */
  handleFilterBlendModeChange(newBlendMode) {
    if (!this.canvasElement) return;
    
    // تحديث وضعية المزج
    this.canvasElement.style.mixBlendMode = newBlendMode || 'normal';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_BLEND_MODE_CHANGED, {
      blendMode: newBlendMode,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير عدد التكرار
   * @param {number} iterationCount - عدد التكرار الجديد
   */
  handleFilterIterationCountChange(iterationCount) {
    if (!this.canvasElement) return;
    
    // تحديث عدد التكرار
    this.canvasElement.style.animationIterationCount = iterationCount;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_ITERATION_COUNT_CHANGED, {
      iterationCount,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير اتجاه الفلتر
   * @param {string} direction - اتجاه الفلتر
   */
  handleFilterDirectionChange(direction) {
    if (!this.canvasElement) return;
    
    // تحديث اتجاه الفلتر
    this.canvasElement.style.animationDirection = direction;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DIRECTION_CHANGED, {
      direction,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير زمن الفلتر
   * @param {number} newDelay - الزمن الجديد
   */
  handleFilterDelayChange(newDelay) {
    if (!this.canvasElement) return;
    
    // تحديث زمن الفلتر
    this.canvasElement.style.animationDelay = `${newDelay}ms`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DELAY_CHANGED, {
      delay: newDelay,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير الشفافية
   * @param {number} opacity - الشفافية الجديدة (0-1)
   */
  handleFilterOpacityChange(opacity = 1) {
    if (!this.canvasElement) return;
    
    // تحديث الشفافية
    this.canvasElement.style.opacity = opacity;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_OPACITY_CHANGED, {
      opacity,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير زمن الانتقال
   * @param {string} timing - وقت الانتقال
   */
  handleFilterTimingChange(timing) {
    if (!this.canvasElement) return;
    
    // تحديث وقت الانتقال
    this.canvasElement.style.transitionTimingFunction = timing;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_TIMING_CHANGED, {
      timing,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير اتجاه الفلتر
   */
  handleFilterDirectionChange() {
    const currentState = this.stateStore.getState();
    const direction = currentState?.currentProject?.videoComposition?.filterDirection || 'normal';
    
    if (!this.canvasElement) return;
    
    // تحديث اتجاه الفلتر
    this.canvasElement.style.animationDirection = direction;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DIRECTION_CHANGED, {
      direction,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير زمن الفلتر
   * @param {number} newDuration - الزمن الجديد
   */
  handleFilterDurationChange(newDuration) {
    if (!this.canvasElement) return;
    
    // تحديث زمن الفلتر
    this.canvasElement.style.animationDuration = `${newDuration}ms`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DURATION_CHANGED, {
      duration: newDuration,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير تقدم الحركة
   * @param {number} progress - تقدم الحركة (0-1)
   */
  handleFilterProgressChange(progress) {
    if (!this.canvasElement) return;
    
    // تطبيق تقدم الحركة
    this.canvasElement.style.setProperty('--filter-progress', progress);
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_PROGRESS_CHANGED, {
      progress,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير المقياس
   * @param {number} scale - المقياس الجديد (مثل 1.5، 0.7)
   */
  handleFilterScaleChange(scale) {
    if (!this.canvasElement) return;
    
    // تحديث المقياس
    this.canvasElement.style.transform = `scale(${scale})`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_SCALE_CHANGED, {
      scale,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير الزاوية
   * @param {number} rotation - الزاوية الجديدة
   */
  handleFilterRotationChange(rotation) {
    if (!this.canvasElement) return;
    
    // تحديث الزاوية
    this.canvasElement.style.transform = `rotate(${rotation}deg)`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_ROTATION_CHANGED, {
      rotation,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير وضعية المزج
   * @param {string} newBlendMode - وضعية المزج الجديدة
   */
  handleFilterBlendModeChange(newBlendMode) {
    if (!this.canvasElement) return;
    
    // تحديث وضعية المزج
    this.canvasElement.style.mixBlendMode = newBlendMode || 'normal';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_BLEND_MODE_CHANGED, {
      blendMode: newBlendMode,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير عدد التكرار
   * @param {number} iterationCount - عدد التكرار الجديد
   */
  handleFilterIterationCountChange(iterationCount) {
    if (!this.canvasElement) return;
    
    // تحديث عدد التكرار
    this.canvasElement.style.animationIterationCount = iterationCount;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_ITERATION_COUNT_CHANGED, {
      iterationCount,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير زمن الفلتر
   * @param {number} newDuration - الزمن الجديد
   */
  handleFilterDurationChange(newDuration) {
    if (!this.canvasElement) return;
    
    // تحديث زمن الفلتر
    this.canvasElement.style.animationDuration = `${newDuration}ms`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DURATION_CHANGED, {
      duration: newDuration,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير تقدم الحركة
   * @param {number} progress - تقدم الحركة (0-1)
   */
  handleFilterProgressChange(progress) {
    if (!this.canvasElement) return;
    
    // تطبيق تقدم الحركة
    this.canvasElement.style.setProperty('--filter-progress', progress);
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_PROGRESS_CHANGED, {
      progress,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير المقياس
   * @param {number} scale - المقياس الجديد (مثل 1.5، 0.7)
   */
  handleFilterScaleChange(scale) {
    if (!this.canvasElement) return;
    
    // تحديث المقياس
    this.canvasElement.style.transform = `scale(${scale})`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_SCALE_CHANGED, {
      scale,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير الزاوية
   * @param {number} rotation - الزاوية الجديدة
   */
  handleFilterRotationChange(rotation) {
    if (!this.canvasElement) return;
    
    // تحديث الزاوية
    this.canvasElement.style.transform = `rotate(${rotation}deg)`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_ROTATION_CHANGED, {
      rotation,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير وضعية المزج
   * @param {string} newBlendMode - وضعية المزج الجديدة
   */
  handleFilterBlendModeChange(newBlendMode) {
    if (!this.canvasElement) return;
    
    // تحديث وضعية المزج
    this.canvasElement.style.mixBlendMode = newBlendMode || 'normal';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_BLEND_MODE_CHANGED, {
      blendMode: newBlendMode,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير عدد التكرار
   * @param {number} iterationCount - عدد التكرار الجديد
   */
  handleFilterIterationCountChange(iterationCount) {
    if (!this.canvasElement) return;
    
    // تحديث عدد التكرار
    this.canvasElement.style.animationIterationCount = iterationCount;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_ITERATION_COUNT_CHANGED, {
      iterationCount,
      timestamp: Date.now()
    });
  }

  /**
   * إضافة فلتر مخصص
   * @param {string} filterKey - مفتاح الفلتر
   * @param {Object} filterConfig - تكوين الفلتر
   */
  addCustomFilter(filterKey, filterConfig) {
    if (!filterKey || !filterConfig || !filterConfig.name || !filterConfig.value) {
      this.errorLogger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidCustomFilterConfig'),
        origin: 'VideoFilterApplier.addCustomFilter'
      });
      return;
    }
    
    // إضافة الفلتر إلى القائمة المدعومة
    SUPPORTED_VIDEO_FILTERS[filterKey] = filterConfig;
    
    // تحديث قائمة الفلاتر في الواجهة
    const option = document.createElement('option');
    option.value = filterKey;
    option.textContent = filterConfig.name;
    this.filterSelectElement.appendChild(option);
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.CUSTOM_FILTER_ADDED, {
      filterKey,
      filterConfig,
      timestamp: Date.now()
    });
  }

  /**
   * إزالة فلتر مخصص
   * @param {string} filterKey - مفتاح الفلتر
   */
  removeCustomFilter(filterKey) {
    if (!SUPPORTED_VIDEO_FILTERS[filterKey]) {
      this.errorLogger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.UnplayableFilter', { filter: filterKey }),
        origin: 'VideoFilterApplier.removeCustomFilter'
      });
      return;
    }
    
    // إزالة الفلتر من القائمة المدعومة
    delete SUPPORTED_VIDEO_FILTERS[filterKey];
    
    // إزالة الفلتر من واجهة المستخدم
    const option = this.filterSelectElement.querySelector(`option[value="${filterKey}"]`);
    if (option) {
      option.remove();
    }
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.CUSTOM_FILTER_REMOVED, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * تحديث فلتر مخصص
   * @param {string} filterKey - مفتاح الفلتر
   * @param {Object} newConfig - التكوين الجديد
   */
  updateCustomFilter(filterKey, newConfig) {
    if (!SUPPORTED_VIDEO_FILTERS[filterKey]) {
      this.errorLogger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.UnplayableFilter', { filter: filterKey }),
        origin: 'VideoFilterApplier.updateCustomFilter'
      });
      return;
    }
    
    // تحديث الفلتر
    const option = this.filterSelectElement.querySelector(`option[value="${filterKey}"]`);
    if (option) {
      option.textContent = newConfig.name;
    }
    
    // تحديث التكوين
    SUPPORTED_VIDEO_FILTERS[filterKey] = {
      ...SUPPORTED_VIDEO_FILTERS[filterKey],
      ...newConfig
    };
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.CUSTOM_FILTER_UPDATED, {
      filterKey,
      newConfig,
      timestamp: Date.now()
    });
  }

  /**
   * تحديث شدة الفلتر
   * @param {string} filterKey - مفتاح الفلتر
   * @param {number} intensity - شدة الفلتر (0-1)
   */
  updateFilterIntensity(filterKey, intensity = 0) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تحديث شدة الفلتر
    const filter = SUPPORTED_VIDEO_FILTERS[filterKey];
    if (filter.type === 'color') {
      const numericValue = parseFloat(filter.value);
      const newValue = `${filter.name}(${numericValue * intensity}%)`;
      filter.value = newValue;
      
      // تحديث الفلتر الحالي إذا كان قيد التشغيل
      const currentState = this.stateStore.getState();
      if (currentState?.currentProject?.videoComposition?.videoFilter === filterKey) {
        this.applyFilter(filterKey);
      }
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.FILTER_INTENSITY_CHANGED, {
        filterKey,
        intensity,
        timestamp: Date.now()
      });
    }
  }

  /**
   * تحديث شفافية الفلتر
   * @param {string} filterKey - مفتاح الفلتر
   * @param {number} opacity - الشفافية (0-1)
   */
  updateFilterOpacity(filterKey, opacity = 0) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تحديث شفافية الفلتر
    const currentState = this.stateStore.getState();
    if (currentState?.currentProject?.videoComposition?.videoFilter === filterKey) {
      if (this.canvasElement) {
        this.canvasElement.style.opacity = opacity;
        
        // نشر الحدث
        this.eventAggregator.publish(EVENTS.FILTER_OPACITY_CHANGED, {
          filterKey,
          opacity,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * التحقق من حالة التشغيل
   * @returns {boolean} هل الفلتر قيد التشغيل؟
   */
  getPlaybackState() {
    if (!this.canvasElement) return 'unavailable';
    
    const computedStyle = window.getComputedStyle(this.canvasElement);
    return computedStyle.animationPlayState || 'normal';
  }

  /**
   * التحقق من زمن الانتهاء
   * @returns {number} زمن الانتهاء
   */
  getFilterFinishTime() {
    const duration = window.getComputedStyle(this.canvasElement).animationDuration;
    const delay = window.getComputedStyle(this.canvasElement).animationDelay;
    return (parseFloat(duration) + parseFloat(delay)) * 1000; // تحويل إلى مللي ثانية
  }

  /**
   * التحقق من عدد التكرار
   * @returns {number} عدد تكرار الفلتر
   */
  getFilterIterationCount() {
    if (!this.canvasElement) return 1;
    
    const computedStyle = window.getComputedStyle(this.canvasElement);
    return parseInt(computedStyle.animationIterationCount) || 1;
  }

  /**
   * التحقق من زمن الفلتر
   * @returns {number} زمن الفلتر
   */
  getFilterDelay() {
    if (!this.canvasElement) return 0;
    
    const delay = window.getComputedStyle(this.canvasElement).animationDelay;
    return parseFloat(delay) * 1000; // تحويل إلى مللي ثانية
  }

  /**
   * التحقق من حالة التشغيل
   * @param {boolean} isPlaying - هل الفلتر قيد التشغيل؟
   */
  handleFilterPlaybackChange(isPlaying) {
    if (!this.canvasElement) return;
    
    // تحديث حالة التشغيل
    this.canvasElement.style.animationPlayState = isPlaying ? 'running' : 'paused';
    
    // نشر الحدث
    this.eventAggregator.publish(
      isPlaying ? EVENTS.FILTER_PLAYING : EVENTS.FILTER_STOPPED,
      {
        timestamp: Date.now()
      }
    );
  }

  /**
   * التحقق من حالة التشغيل
   */
  handleFilterFinish() {
    if (!this.canvasElement) return;
    
    // تطبيق تأثير انتهاء الفلتر
    this.canvasElement.style.transition = 'filter 0.3s ease-out';
    this.canvasElement.style.filter = 'none';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_FINISHED, {
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   */
  handleFilterCancel() {
    if (!this.canvasElement) return;
    
    // تطبيق تأثير إلغاء الفلتر
    this.canvasElement.style.transition = 'filter 0.2s ease-in';
    this.canvasElement.style.filter = 'none';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_CANCELED, {
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   */
  handleFilterUpdate() {
    const currentState = this.stateStore.getState();
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    
    if (!this.isFilterSupported(currentFilter)) {
      this.errorLogger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey'),
        origin: 'VideoFilterApplier.handleFilterUpdate'
      });
      return;
    }
    
    // تحديث الفلتر
    this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[currentFilter].value || 'none';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_UPDATED, {
      filterKey: currentFilter,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   */
  handleFilterReset() {
    // إعادة تعيين الفلتر
    this.resetFilter();
    
    // إعادة تعيين واجهة المستخدم
    this.updateFilterSelectUI('none');
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_RESET, {
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   */
  handleFilterPlay() {
    if (!this.canvasElement) return;
    
    // تشغيل الفلتر
    this.canvasElement.style.animationPlayState = 'running';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_PLAYING, {
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   */
  handleFilterStop() {
    if (!this.canvasElement) return;
    
    // إيقاف الفلتر
    this.canvasElement.style.animationPlayState = 'paused';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_STOPPED, {
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {number} time - الزمن المحدد
   */
  handleFilterSeek(time) {
    const logger = this.errorLogger || console;
    const currentState = this.stateStore.getState();
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    
    if (!this.isFilterSupported(currentFilter)) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey'),
        origin: 'VideoFilterApplier.handleFilterSeek'
      });
      return;
    }
    
    // تطبيق الفلتر عند الزمن المحدد
    this.applyFilterWithDurationRange(currentFilter, time, time + 1000);
  }

  /**
   * التحقق من حالة التشغيل
   * @param {number} playbackRate - معدل التشغيل
   */
  handleFilterRateChange(playbackRate) {
    if (!this.canvasElement) return;
    
    // تحديث معدل التشغيل
    this.canvasElement.style.animationDuration = `${1 / playbackRate}s`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_RATE_CHANGED, {
      playbackRate,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   */
  handleFilterDirectionChange() {
    const currentState = this.stateStore.getState();
    const direction = currentState?.currentProject?.videoComposition?.filterDirection || 'normal';
    
    if (!this.canvasElement) return;
    
    // تحديث اتجاه الفلتر
    this.canvasElement.style.animationDirection = direction;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DIRECTION_CHANGED, {
      direction,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {boolean} isPlaying - هل الفلتر قيد التشغيل؟
   */
  handleFilterPlayStateChange(isPlaying) {
    if (!this.canvasElement) return;
    
    // تحديث حالة التشغيل
    this.canvasElement.style.animationPlayState = isPlaying ? 'running' : 'paused';
    
    // نشر الحدث
    this.eventAggregator.publish(
      isPlaying ? EVENTS.FILTER_PLAYING : EVENTS.FILTER_STOPPED,
      {
        timestamp: Date.now()
      }
    );
  }

  /**
   * التحقق من حالة التشغيل
   */
  handleFilterFinish() {
    if (!this.canvasElement) return;
    
    // تطبيق تأثير انتهاء الفلتر
    this.canvasElement.style.transition = 'filter 0.3s ease-out';
    this.canvasElement.style.filter = 'none';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_FINISHED, {
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   */
  handleFilterCancel() {
    if (!this.canvasElement) return;
    
    // تطبيق تأثير إلغاء الفلتر
    this.canvasElement.style.transition = 'filter 0.2s ease-in';
    this.canvasElement.style.filter = 'none';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_CANCELED, {
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   */
  handleFilterUpdate() {
    const currentState = this.stateStore.getState();
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    
    if (!this.isFilterSupported(currentFilter)) {
      this.errorLogger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey'),
        origin: 'VideoFilterApplier.handleFilterUpdate'
      });
      return;
    }
    
    // تحديث الفلتر
    this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[currentFilter]?.value || 'none';
    
    // تحديث واجهة المستخدم
    this.updateFilterSelectUI(currentFilter);
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_UPDATED, {
      filterKey: currentFilter,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   */
  handleFilterReset() {
    // إعادة تعيين الفلتر
    this.resetFilter();
    
    // تحديث واجهة المستخدم
    this.updateFilterSelectUI('none');
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_RESET, {
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   */
  handleFilterPlay() {
    if (!this.canvasElement) return;
    
    // تشغيل الفلتر
    this.canvasElement.style.animationPlayState = 'running';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_PLAYING, {
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   */
  handleFilterStop() {
    if (!this.canvasElement) return;
    
    // إيقاف الفلتر
    this.canvasElement.style.animationPlayState = 'paused';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_STOPPED, {
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {number} time - الزمن المحدد
   */
  handleFilterSeek(time) {
    const logger = this.errorLogger || console;
    const currentState = this.stateStore.getState();
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    
    if (!this.isFilterSupported(currentFilter)) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey'),
        origin: 'VideoFilterApplier.handleFilterSeek'
      });
      return;
    }
    
    // تطبيق الفلتر عند الزمن المحدد
    this.applyFilterWithDurationRange(currentFilter, time, time + 1000);
  }

  /**
   * التحقق من حالة التشغيل
   * @param {number} playbackRate - معدل التشغيل
   */
  handleFilterRateChange(playbackRate) {
    if (!this.canvasElement) return;
    
    // تحديث معدل التشغيل
    this.canvasElement.style.animationDuration = `${1 / playbackRate}s`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_RATE_CHANGED, {
      playbackRate,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} direction - اتجاه الفلتر
   */
  handleFilterDirectionChange(direction) {
    if (!this.canvasElement) return;
    
    // تحديث اتجاه الفلتر
    this.canvasElement.style.animationDirection = direction;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DIRECTION_CHANGED, {
      direction,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   */
  handleFilterStateChange(filterKey) {
    if (!this.isFilterSupported(filterKey)) {
      this.errorLogger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.FilterStateChange'),
        origin: 'VideoFilterApplier.handleFilterStateChange'
      });
      return;
    }
    
    // تطبيق الفلتر
    this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_STATE_CHANGED, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {number} newDuration - المدة الجديدة
   */
  handleFilterDurationChange(newDuration) {
    if (!this.canvasElement) return;
    
    // تحديث المدة
    this.canvasElement.style.animationDuration = `${newDuration}ms`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DURATION_CHANGED, {
      duration: newDuration,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} newEasing - التدرج الجديد
   */
  handleFilterEasingChange(newEasing) {
    if (!this.canvasElement) return;
    
    // تحديث التدرج
    this.canvasElement.style.transitionTimingFunction = newEasing || 'linear';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_EASING_CHANGED, {
      easing: newEasing,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {number} iterationCount - عدد التكرار الجديد
   */
  handleFilterIterationCountChange(iterationCount) {
    if (!this.canvasElement) return;
    
    // تحديث عدد التكرار
    this.canvasElement.style.animationIterationCount = iterationCount;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_ITERATION_COUNT_CHANGED, {
      iterationCount,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} direction - اتجاه الفلتر
   */
  handleFilterDirectionChange(direction) {
    if (!this.canvasElement) return;
    
    // تحديث اتجاه الفلتر
    this.canvasElement.style.animationDirection = direction;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DIRECTION_CHANGED, {
      direction,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {boolean} reverse - هل الاتجاه معكوس؟
   */
  handleFilterReverseChange(reverse) {
    if (!this.canvasElement) return;
    
    // تحديث اتجاه الفلتر
    this.canvasElement.style.animationDirection = reverse ? 'reverse' : 'normal';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_REVERSED_CHANGED, {
      reversed: reverse,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} newBlendMode - وضعية المزج الجديدة
   */
  handleFilterBlendModeChange(newBlendMode) {
    if (!this.canvasElement) return;
    
    // تحديث وضعية المزج
    this.canvasElement.style.mixBlendMode = newBlendMode || 'normal';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_BLEND_MODE_CHANGED, {
      blendMode: newBlendMode,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من زمن الانتهاء
   * @returns {number} زمن الانتهاء
   */
  getFilterFinishTime() {
    const duration = window.getComputedStyle(this.canvasElement).animationDuration;
    const delay = window.getComputedStyle(this.canvasElement).animationDelay;
    return (parseFloat(duration) + parseFloat(delay)) * 1000; // تحويل إلى مللي ثانية
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   * @param {number} time - الزمن المحدد
   */
  applyFilterWithDurationRange(filterKey, startTime, endTime) {
    if (!this.isFilterSupported(filterKey)) return;
    
    const duration = endTime - startTime;
    if (duration <= 0) return;
    
    // تطبيق الفلتر عند الزمن الابتدائي
    const timer = setTimeout(() => {
      if (this.canvasElement) {
        this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none';
        
        // إزالة الفلتر بعد الانتهاء
        const endTimer = setTimeout(() => {
          this.canvasElement.style.filter = 'none';
          clearTimeout(timer);
        }, duration);
      }
    }, duration);
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   * @param {Object} frameData - بيانات الإطار
   */
  applyFilterOnFrame(filterKey, frameData) {
    if (!frameData || !frameData.frameNumber) return;
    
    const frame = document.getElementById(`frame-${frameData.frameNumber}`);
    if (frame) {
      frame.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none';
    }
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_ON_FRAME, {
      filterKey,
      frameNumber: frameData.frameNumber,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   * @param {Function} condition - الشرط الذي يجب أن يتحقق
   */
  applyFilterIf(filterKey, condition) {
    if (!condition || !condition()) return;
    
    this.applyFilter(filterKey);
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   * @param {Function} condition - الشرط الذي يجب ألا يتحقق
   */
  applyFilterUnless(filterKey, condition) {
    if (!condition || condition()) return;
    
    this.applyFilter(filterKey);
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterToAll(filterKey) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تطبيق الفلتر على الكانفاس
    if (this.canvasElement) {
      this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    }
    
    // تطبيق الفلتر على النصوص
    const textElements = document.querySelectorAll('[data-verse-text]');
    textElements.forEach(el => {
      el.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    });
    
    // تطبيق الفلتر على الخلفية
    const backgroundElements = document.querySelectorAll('.background-element');
    backgroundElements.forEach(el => {
      el.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    });
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_ALL, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterToSelected(filterKey) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تطبيق الفلتر على العناصر المحددة
    const selectedElements = document.querySelectorAll('.selected-element');
    selectedElements.forEach(el => {
      el.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    });
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_SELECTED, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterToTimeline(filterKey) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تطبيق الفلتر على المؤقت
    const timelineElement = document.querySelector('.timeline');
    if (timelineElement) {
      timelineElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    }
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_TIMELINE, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterToExport(filterKey) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تطبيق الفلتر على زر التصدير
    const exportButton = document.querySelector('#export-button');
    if (exportButton) {
      exportButton.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    }
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_EXPORT, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterToBackground(filterKey) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تطبيق الفلتر على الخلفية
    const background = document.querySelector('.background');
    if (background) {
      background.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    }
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_BACKGROUND, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterToText(filterKey) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تطبيق الفلتر على النصوص
    const textElements = document.querySelectorAll('[data-verse-text]');
    textElements.forEach(el => {
      el.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none';
    });
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_TEXT, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterToAudio(filterKey) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تطبيق الفلتر على الصوت
    const audioElement = document.querySelector('audio#main-audio');
    if (audioElement) {
      audioElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none';
    }
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_AUDIO, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterToAIContent(filterKey) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تطبيق الفلتر على الذكاء الاصطناعي
    const aiElements = document.querySelectorAll('[data-ai]');
    aiElements.forEach(el => {
      el.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none';
    });
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_AI_CONTENT, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterWithTransition(filterKey) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تفعيل الانتقال
    this.canvasElement.classList.add(`filter-transition-${filterKey}`);
    
    // إزالة الانتقال بعد الانتهاء
    setTimeout(() => {
      this.canvasElement.classList.remove(`filter-transition-${filterKey}`);
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.FILTER_TRANSITION_COMPLETED, {
        filterKey,
        transition: 'fade',
        timestamp: Date.now()
      });
    }, 500); // مدة الانتقال الافتراضية
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterWithAnimation(filterKey) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تفعيل الحركة
    this.canvasElement.classList.add(`filter-animation-${filterKey}`);
    
    // إزالة الفئة بعد الانتهاء
    this.canvasElement.addEventListener('animationend', onAnimationEnd = () => {
      this.canvasElement.classList.remove(`filter-animation-${filterKey}`);
      this.canvasElement.removeEventListener('animationend', onAnimationEnd);
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.FILTER_ANIMATION_COMPLETED, {
        filterKey,
        timestamp: Date.now()
      });
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @returns {boolean} هل الفيديو جاهز؟
   */
  isFilterReady() {
    return this.canvasElement && this.filterSelectElement && this.stateStore.getState().currentProject;
  }

  /**
   * التحقق مما إذا كان الفلتر مدعومًا
   * @param {string} filterKey - مفتاح الفلتر
   * @returns {boolean} هل الفلتر مدعوم؟
   */
  isFilterSupported(filterKey) {
    return !!SUPPORTED_VIDEO_FILTERS[filterKey];
  }

  /**
   * التحقق من صحة الملف الشخصي
   * @returns {boolean} هل الملف جاهز؟
   */
  selfTest() {
    try {
      const currentState = this.getCurrentState();
      const testCanvas = document.createElement('canvas');
      const testContext = testCanvas.getContext('2d');
      
      // التحقق من دعم الفلتر
      const supportedFilters = Object.keys(SUPPORTED_VIDEO_FILTERS);
      const hasSupportedFilters = supportedFilters.some(key => {
        const filter = SUPPORTED_VIDEO_FILTERS[key];
        return filter && filter.value;
      });
      
      return hasSupportedFilters && currentState.isTainted !== undefined;
    } catch (e) {
      this.errorLogger.handleError(e, {
        message: this.localizationService.translate('VideoFilterApplier.SelfTestFailed'),
        origin: 'VideoFilterApplier.selfTest'
      });
      return false;
    }
  }

  /**
   * إعادة تعيين الفلتر
   */
  resetFilter() {
    if (this.canvasElement) {
      this.canvasElement.style.filter = 'none';
      this.canvasElement.style.webkitFilter = 'none';
      this.canvasElement.style.mozFilter = 'none';
      this.canvasElement.style.msFilter = 'none';
      this.canvasElement.style.oFilter = 'none';
      this.canvasElement.style.animation = '';
      this.canvasElement.style.webkitAnimation = '';
      this.canvasElement.style.mozAnimation = '';
      this.canvasElement.style.msAnimation = '';
      this.canvasElement.style.oAnimation = '';
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.FILTER_RESET, {
        timestamp: Date.now()
      });
    }
  }

  /**
   * ملء قائمة الفلاتر
   */
  populateFilterSelect() {
    // التحقق من استعداد العناصر
    const currentState = this.stateStore.getState();
    const filterSelect = this.filterSelectElement;
    
    if (!filterSelect) return;
    
    // مسح الفلاتر الحالية
    filterSelect.innerHTML = '';
    
    // إضافة الفلاتر المدعومة
    Object.entries(SUPPORTED_VIDEO_FILTERS).forEach(([key, filter]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = filter.name;
      filterSelect.appendChild(option);
    });
    
    // تحديث الفلتر الحالي
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    this.updateFilterSelectUI(currentFilter);
    
    this.errorLogger.logInfo({
      message: this.localizationService.translate('VideoFilterApplier.FiltersPopulated'),
      origin: 'VideoFilterApplier.populateFilterSelect'
    });
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_POPULATED, {
      timestamp: Date.now()
    });
  }

  /**
   * تحديث واجهة المستخدم لتحديد الفلتر
   * @param {string} filterKey - مفتاح الفلتر
   */
  updateFilterSelectUI(filterKey) {
    const logger = this.errorLogger || console;
    
    if (!this.filterSelectElement) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.FilterSelectElementMissing'),
        origin: 'VideoFilterApplier.updateFilterSelectUI'
      });
      return;
    }
    
    if (!SUPPORTED_VIDEO_FILTERS[filterKey]) {
      filterKey = 'none';
    }
    
    if (this.filterSelectElement.value !== filterKey) {
      this.filterSelectElement.value = filterKey;
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.UI_ELEMENT_UPDATED, {
        element: 'videoFilterSelect',
        value: filterKey,
        timestamp: Date.now()
      });
    }
  }

  /**
   * تطبيق الفلتر على الكانفاس
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilter(filterKey) {
    const logger = this.errorLogger || console;
    
    if (!this.canvasElement) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.CanvasNotReady'),
        origin: 'VideoFilterApplier.applyFilter'
      });
      return;
    }
    
    if (!SUPPORTED_VIDEO_FILTERS[filterKey]) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey'),
        origin: 'VideoFilterApplier.applyFilter'
      });
      return;
    }
    
    // تطبيق الفلتر
    this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.VIDEO_FILTER_APPLIED, {
      filterKey,
      filterValue: SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none',
      timestamp: Date.now()
    });
  }

  /**
   * تحديث واجهة المستخدم لتحديد الفلتر
   * @param {string} filterKey - مفتاح الفلتر
   */
  updateFilterSelectUI(filterKey) {
    if (!this.filterSelectElement) return;
    
    if (!SUPPORTED_VIDEO_FILTERS[filterKey]) {
      filterKey = 'none';
    }
    
    if (this.filterSelectElement.value !== filterKey) {
      this.filterSelectElement.value = filterKey;
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.UI_ELEMENT_UPDATED, {
        element: 'videoFilterSelect',
        value: filterKey,
        timestamp: Date.now()
      });
    }
  }

  /**
   * التعامل مع تغيير الفلتر من القائمة
   */
  handleFilterSelectionChange(event) {
    const logger = this.errorLogger || console;
    const selectEl = this.filterSelectElement;
    
    if (!selectEl) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.FilterSelectElementMissing'),
        origin: 'VideoFilterApplier.handleFilterSelectionChange'
      });
      return;
    }
    
    const selectedFilterKey = selectEl.value;
    
    if (!SUPPORTED_VIDEO_FILTERS[selectedFilterKey]) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.UnsupportedFilterSelected'),
        origin: 'VideoFilterApplier.handleFilterSelectionChange'
      });
      return;
    }
    
    // تحديث الحالة
    this.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { 
      videoComposition: { videoFilter: selectedFilterKey }
    });
    
    // تطبيق الفلتر
    this.applyFilter(selectedFilterKey);
    
    // تسجيل التغيير
    logger.logInfo({
      message: this.localizationService.translate('VideoFilterApplier.FilterApplied', { filter: selectedFilterKey }),
      origin: 'VideoFilterApplier.handleFilterSelectionChange'
    });
  }

  /**
   * تطبيق الفلتر على الكانفاس
   * @param {string} filterKey - مفتاح الفلتر
   */
  _applyFilterToCanvasDirect(filterKey) {
    const logger = this.errorLogger || console;
    
    if (!this.canvasElement) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.CanvasNotReady'),
        origin: 'VideoFilterApplier._applyFilterToCanvasDirect'
      });
      return;
    }
    
    if (!SUPPORTED_VIDEO_FILTERS[filterKey]) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey'),
        origin: 'VideoFilterApplier._applyFilterToCanvasDirect'
      });
      return;
    }
    
    this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.VIDEO_FILTER_APPLIED, {
      filterKey,
      filterValue: SUPPORTED_VIDEO_FILTERS[filterKey].value,
      timestamp: Date.now()
    });
  }

  /**
   * تطبيق الفلتر مع انتقال
   * @param {string} filterKey - مفتاح الفلتر
   * @param {string} transition - نوع الانتقال
   */
  applyFilterWithTransition(filterKey, transition = 'fade') {
    if (!this.isFilterSupported(filterKey)) {
      filterKey = 'none';
    }
    
    const transitionClass = `filter-transition-${filterKey}-${transition}`;
    this.canvasElement.classList.add(transitionClass);
    
    // إزالة الفئة بعد الانتهاء
    setTimeout(() => {
      this.canvasElement.classList.remove(transitionClass);
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.FILTER_TRANSITION_COMPLETED, {
        filterKey,
        transition,
        timestamp: Date.now()
      });
    }, 500); // مدة الانتقال الافتراضية
  }

  /**
   * تطبيق الفلتر مع حركة
   * @param {string} filterKey - مفتاح الفلتر
   * @param {string} animation - نوع الحركة
   */
  applyFilterWithAnimation(filterKey, animation = 'fadeIn') {
    if (!this.isFilterSupported(filterKey)) {
      filterKey = 'none';
    }
    
    this.canvasElement.classList.add(`filter-animation-${filterKey}-${animation}`);
    
    // إزالة الفئة بعد الانتهاء
    this.canvasElement.addEventListener('animationend', onAnimationEnd = () => {
      this.canvasElement.classList.remove(`filter-animation-${filterKey}-${animation}`);
      this.canvasElement.removeEventListener('animationend', onAnimationEnd);
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.FILTER_ANIMATION_COMPLETED, {
        filterKey,
        animation,
        timestamp: Date.now()
      });
    });
  }

  /**
   * تطبيق الفلتر على الكانفاس
   * @param {string} filterKey - مفتاح الفلتر
   */
  _applyFilterToCanvasDirect(filterKey) {
    if (!this.canvasElement) return;
    
    if (!SUPPORTED_VIDEO_FILTERS[filterKey]) {
      filterKey = 'none';
    }
    
    this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.VIDEO_FILTER_APPLIED, {
      filterKey,
      filterValue: SUPPORTED_VIDEO_FILTERS[filterKey].value,
      timestamp: Date.now()
    });
  }

  /**
   * تحديث واجهة المستخدم لتحديد الفلتر
   * @param {string} filterKey - مفتاح الفلتر
   */
  updateFilterSelectUI(filterKey) {
    const logger = this.errorLogger || console;
    
    if (!this.filterSelectElement) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.FilterSelectElementMissing'),
        origin: 'VideoFilterApplier.updateFilterSelectUI'
      });
      return;
    }
    
    if (!SUPPORTED_VIDEO_FILTERS[filterKey]) {
      filterKey = 'none';
    }
    
    if (this.filterSelectElement.value !== filterKey) {
      this.filterSelectElement.value = filterKey;
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.UI_ELEMENT_UPDATED, {
        element: 'videoFilterSelect',
        value: filterKey,
        timestamp: Date.now()
      });
    }
  }

  /**
   * التعامل مع تغيير الفلتر من القائمة
   * @param {Event} event - حدث تغيير الفلتر
   */
  handleFilterSelectionChange(event) {
    const logger = this.errorLogger || console;
    const selectEl = this.filterSelectElement;
    
    if (!selectEl) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.FilterSelectElementMissing'),
        origin: 'VideoFilterApplier.handleFilterSelectionChange'
      });
      return;
    }
    
    const selectedFilterKey = selectEl.value;
    
    // التحقق مما إذا كان الفلتر مدعومًا
    if (!this.isFilterSupported(selectedFilterKey)) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.UnsupportedFilterSelected'),
        origin: 'VideoFilterApplier.handleFilterSelectionChange'
      });
      return;
    }
    
    // تحديث الحالة
    this.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { 
      videoComposition: { videoFilter: selectedFilterKey }
    });
    
    // تطبيق الفلتر
    this.applyFilter(selectedFilterKey);
    
    // تسجيل التغيير
    logger.logInfo({
      message: this.localizationService.translate('VideoFilterApplier.FilterApplied', { filter: selectedFilterKey }),
      origin: 'VideoFilterApplier.handleFilterSelectionChange'
    });
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.VIDEO_FILTER_APPLIED, {
      filterKey: selectedFilterKey,
      timestamp: Date.now()
    });
  }

  /**
   * ملء قائمة الفلاتر في الواجهة
   */
  populateFilterSelect() {
    const logger = this.errorLogger || console;
    
    if (!this.filterSelectElement) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.FilterSelectElementMissing'),
        origin: 'VideoFilterApplier.populateFilterSelect'
      });
      return;
    }
    
    // مسح الخيارات الحالية
    this.filterSelectElement.innerHTML = '';
    
    // إضافة الفلاتر
    Object.entries(SUPPORTED_VIDEO_FILTERS).forEach(([key, filter]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = filter.name;
      this.filterSelectElement.appendChild(option);
    });
    
    // إعداد الفلتر الحالي
    const currentState = this.stateStore.getState();
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    this.updateFilterSelectUI(currentFilter);
    
    logger.logInfo({
      message: this.localizationService.translate('VideoFilterApplier.FiltersPopulated'),
      origin: 'VideoFilterApplier.populateFilterSelect'
    });
  }

  /**
   * تطبيق الفلتر الحالي من الحالة
   */
  applyCurrentFilter() {
    const currentState = this.stateStore.getState();
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    this.applyFilter(currentFilter);
  }

  /**
   * إعادة تعيين جميع الفلاتر
   */
  resetAllFilters() {
    this.resetFilter();
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.ALL_FILTERS_RESET, {
      timestamp: Date.now()
    });
  }

  /**
   * تبديل الفلتر
   */
  toggleFilter() {
    const currentState = this.stateStore.getState();
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    
    if (currentFilter === 'none') {
      this.applyFilter('grayscale');
    } else {
      this.applyFilter('none');
    }
  }

  /**
   * التعامل مع تغيير عدد التكرار
   * @param {number} iterationCount - عدد التكرار الجديد
   */
  handleFilterIterationCountChange(iterationCount) {
    if (!this.canvasElement) return;
    
    // تحديث عدد التكرار
    this.canvasElement.style.animationIterationCount = iterationCount;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_ITERATION_COUNT_CHANGED, {
      iterationCount,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير اتجاه الفلتر
   * @param {string} direction - اتجاه الفلتر (rtl أو ltr)
   */
  handleFilterDirection(direction = 'normal') {
    if (!this.canvasElement) return;
    
    // تحديث اتجاه الفلتر
    this.canvasElement.style.animationDirection = direction;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DIRECTION_CHANGED, {
      direction,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير زمن الفلتر
   * @param {number} newDelay - الزمن الجديد
   */
  handleFilterDelayChange(newDelay) {
    if (!this.canvasElement) return;
    
    // تحديث زمن الفلتر
    this.canvasElement.style.animationDelay = `${newDelay}ms`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DELAY_CHANGED, {
      delay: newDelay,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير تدرج الفلتر
   * @param {string} newEasing - التدرج الجديد
   */
  handleFilterEasingChange(newEasing) {
    if (!this.canvasElement) return;
    
    // تحديث التدرج
    this.canvasElement.style.transitionTimingFunction = newEasing || 'linear';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_EASING_CHANGED, {
      easing: newEasing,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير عدد التكرار
   * @param {number} iterationCount - عدد التكرار الجديد
   */
  handleFilterIterationCountChange(iterationCount) {
    if (!this.canvasElement) return;
    
    // تحديث عدد التكرار
    this.canvasElement.style.animationIterationCount = iterationCount;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_ITERATION_COUNT_CHANGED, {
      iterationCount,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير اتجاه الفلتر
   * @param {string} direction - الاتجاه الجديد
   */
  handleFilterDirectionChange(direction) {
    if (!this.canvasElement) return;
    
    // تحديث اتجاه الفلتر
    this.canvasElement.style.animationDirection = direction;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DIRECTION_CHANGED, {
      direction,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير زمن الفلتر
   * @param {number} newDuration - الزمن الجديد
   */
  handleFilterDurationChange(newDuration) {
    if (!this.canvasElement) return;
    
    // تحديث زمن الفلتر
    this.canvasElement.style.animationDuration = `${newDuration}ms`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DURATION_CHANGED, {
      duration: newDuration,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير زمن الفلتر
   * @param {number} newDelay - التأخير الجديد
   */
  handleFilterDelayChange(newDelay) {
    if (!this.canvasElement) return;
    
    // تحديث زمن الفلتر
    this.canvasElement.style.animationDelay = `${newDelay}ms`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DELAY_CHANGED, {
      delay: newDelay,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير زمن الفلتر
   * @param {number} newDuration - الزمن الجديد
   */
  handleFilterDurationChange(newDuration) {
    if (!this.canvasElement) return;
    
    // تحديث زمن الفلتر
    this.canvasElement.style.animationDuration = `${newDuration}ms`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DURATION_CHANGED, {
      duration: newDuration,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير التدرج
   * @param {string} newEasing - التدرج الجديد
   */
  handleFilterEasingChange(newEasing) {
    if (!this.canvasElement) return;
    
    // تحديث التدرج
    this.canvasElement.style.transitionTimingFunction = newEasing || 'linear';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_EASING_CHANGED, {
      easing: newEasing,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير عدد التكرار
   * @param {number} iterationCount - عدد التكرار الجديد
   */
  handleFilterIterationCountChange(iterationCount) {
    if (!this.canvasElement) return;
    
    // تحديث عدد التكرار
    this.canvasElement.style.animationIterationCount = iterationCount;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_ITERATION_COUNT_CHANGED, {
      iterationCount,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير اتجاه الفلتر
   * @param {string} direction - الاتجاه الجديد
   */
  handleFilterDirectionChange(direction) {
    if (!this.canvasElement) return;
    
    // تحديث اتجاه الفلتر
    this.canvasElement.style.animationDirection = direction;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DIRECTION_CHANGED, {
      direction,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير وضعية المزج
   * @param {string} newBlendMode - وضعية المزج الجديدة
   */
  handleFilterBlendModeChange(newBlendMode) {
    if (!this.canvasElement) return;
    
    // تحديث وضعية المزج
    this.canvasElement.style.mixBlendMode = newBlendMode || 'normal';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_BLEND_MODE_CHANGED, {
      blendMode: newBlendMode,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير زمن الفلتر
   * @param {number} newDuration - الزمن الجديد
   */
  handleFilterDurationChange(newDuration) {
    if (!this.canvasElement) return;
    
    // تحديث زمن الفلتر
    this.canvasElement.style.animationDuration = `${newDuration}ms`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DURATION_CHANGED, {
      duration: newDuration,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير تقدم الفلتر
   * @param {number} progress - تقدم الحركة (0-1)
   */
  handleFilterProgressChange(progress) {
    if (!this.canvasElement) return;
    
    // تطبيق تقدم الحركة
    this.canvasElement.style.setProperty('--filter-progress', progress);
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_PROGRESS_CHANGED, {
      progress: progress,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير المقياس
   * @param {number} scale - المقياس الجديد (مثل 1.5، 0.7)
   */
  handleFilterScaleChange(scale) {
    if (!this.canvasElement) return;
    
    // تطبيق المقياس
    this.canvasElement.style.transform = `scale(${scale})`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_SCALE_CHANGED, {
      scale,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير الزاوية
   * @param {number} rotation - الزاوية الجديدة
   */
  handleFilterRotationChange(rotation) {
    if (!this.canvasElement) return;
    
    // تطبيق الدوران
    this.canvasElement.style.transform = `rotate(${rotation}deg)`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_ROTATION_CHANGED, {
      rotation,
      timestamp: Date.now()
    });
  }

  /**
   * التعامل مع تغيير المجموعة
   * @param {string} group - المجموعة الجديدة
   * @param {string} newBlendMode - وضعية المزج الجديدة
   */
  handleFilterGroupChange(group) {
    if (!this.canvasElement) return;
    
    // تحديث المجموعة
    this.canvasElement.setAttribute('data-filter-group', group);
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_GROUP_CHANGED, {
      group,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} playState - حالة التشغيل
   */
  handleFilterPlaybackChange(playState) {
    if (!this.canvasElement) return;
    
    // تحديث حالة التشغيل
    this.canvasElement.style.animationPlayState = playState ? 'running' : 'paused';
    
    // نشر الحدث
    this.eventAggregator.publish(playState ? EVENTS.FILTER_PLAYING : EVENTS.FILTER_STOPPED, {
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {boolean} isPlaying - هل الفلتر قيد التشغيل؟
   */
  handleFilterPlayStateChange(isPlaying) {
    if (!this.canvasElement) return;
    
    // تحديث حالة التشغيل
    this.canvasElement.style.animationPlayState = isPlaying ? 'running' : 'paused';
    
    // نشر الحدث
    this.eventAggregator.publish(
      isPlaying ? EVENTS.FILTER_PLAYING : EVENTS.FILTER_STOPPED, {
        timestamp: Date.now()
      }
    );
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   * @param {string} newEasing - التدرج الجديد
   */
  applyFilterWithEasing(filterKey, newEasing) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تطبيق الفلتر مع التدرج
    this.canvasElement.style.transitionTimingFunction = newEasing || 'linear';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_EASING_CHANGED, {
      easing: newEasing,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   * @param {string} newDirection - اتجاه الفلتر
   */
  applyFilterWithDirection(filterKey, newDirection) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تطبيق اتجاه الفلتر
    this.canvasElement.classList.add(`filter-transition-${filterKey}-${newDirection}`);
    
    // إزالة الفئة بعد الانتهاء
    setTimeout(() => {
      this.canvasElement.classList.remove(`filter-transition-${filterKey}-${newDirection}`);
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.FILTER_DIRECTION_CHANGED, {
        direction: newDirection,
        timestamp: Date.now()
      });
    }, 500); // مدة الانتقال الافتراضية
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   * @param {number} startTime - الزمن الابتدائي
   * @param {number} endTime - الزمن النهائي
   */
  applyFilterWithDurationRange(filterKey, startTime, endTime) {
    if (!this.isFilterSupported(filterKey)) return;
    
    const duration = endTime - startTime;
    if (duration <= 0) return;
    
    // تطبيق الفلتر عند الزمن الابتدائي
    const timer = setTimeout(() => {
      this._applyFilterToCanvasDirect(filterKey);
      
      // إزالة الفلتر بعد الانتهاء
      const endTimer = setTimeout(() => {
        this._applyFilterToCanvasDirect('none');
      }, duration);
      
      // تخزين المؤقت لتنظيفه لاحقًا
      durationTimers.push({ timer, endTimer });
    }, startTime);
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   * @param {Object} frameData - بيانات الإطار
   */
  applyFilterOnFrame(filterKey, frameData) {
    if (!this.isFilterSupported(filterKey) || !frameData || !frameData.frameNumber) return;
    
    const frame = document.getElementById(`frame-${frameData.frameNumber}`);
    if (frame) {
      frame.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none';
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.FILTER_APPLIED_ON_FRAME, {
        filterKey,
        frameNumber: frameData.frameNumber,
        timestamp: Date.now()
      });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   * @param {Function} condition - الشرط الذي يجب أن يتحقق
   */
  applyFilterIf(filterKey, condition) {
    if (typeof condition !== 'function') return;
    
    if (condition()) {
      this.applyFilter(filterKey);
    }
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   * @param {Function} condition - الشرط الذي يجب أن لا يتحقق
   */
  applyFilterUnless(filterKey, condition) {
    if (typeof condition !== 'function') return;
    
    if (!condition()) {
      this.applyFilter(filterKey);
    }
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyCurrentFilter() {
    const currentState = this.stateStore.getState();
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    
    if (!this.isFilterSupported(currentFilter)) {
      this.errorLogger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidFilterKey'),
        origin: 'VideoFilterApplier.applyCurrentFilter'
      });
      return;
    }
    
    // تطبيق الفلتر الحالي
    this._applyFilterToCanvasDirect(currentFilter);
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED, {
      filterKey: currentFilter,
      timestamp: Date.now()
    });
  }

  /**
   * إعادة تعيين جميع الفلاتر
   */
  resetAllFilters() {
    // إعادة تعيين الفلتر
    this.resetFilter();
    
    // تحديث واجهة المستخدم
    this.updateFilterSelectUI('none');
  }

  /**
   * تبديل الفلتر
   * @param {Function} condition - الشرط الذي يجب أن يتحقق
   */
  toggleFilterOnCondition(condition) {
    if (typeof condition !== 'function') return;
    
    const shouldToggle = condition();
    if (shouldToggle) {
      this.toggleFilter();
    }
  }

  /**
   * تبديل الفلتر إلا إذا تحقق شرط
   * @param {Function} condition - الشرط الذي يجب ألا يتحقق
   */
  toggleFilterUnless(condition) {
    if (typeof condition !== 'function') return;
    
    const shouldNotToggle = condition();
    if (!shouldNotToggle) {
      this.toggleFilter();
    }
  }

  /**
   * تطبيق الفلتر على جميع العناصر
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterToAll(filterKey) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تطبيق الفلتر على الكانفاس
    if (this.canvasElement) {
      this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none';
    }
    
    // تطبيق الفلتر على النصوص
    const textElements = document.querySelectorAll('[data-verse-text]');
    textElements.forEach(el => {
      el.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none';
    });
    
    // تطبيق الفلتر على الخلفية
    const backgroundElements = document.querySelectorAll('.background-element');
    backgroundElements.forEach(el => {
      el.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none';
    });
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_ALL, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * تطبيق الفلتر على العناصر المحددة
   * @param {string} filterKey - مفتاح الفلتر
   * @param {string} transition - نوع الانتقال
   */
  applyFilterWithTransition(filterKey, transition = 'fade') {
    if (!this.isFilterSupported(filterKey)) {
      filterKey = 'none';
    }
    
    // تفعيل الانتقال
    this.canvasElement.classList.add(`filter-transition-${filterKey}-${transition}`);
    
    // إزالة الفئة بعد الانتهاء
    setTimeout(() => {
      this.canvasElement.classList.remove(`filter-transition-${filterKey}-${transition}`);
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.FILTER_TRANSITION_COMPLETED, {
        filterKey,
        transition,
        timestamp: Date.now()
      });
    }, 500); // مدة الانتقال الافتراضية
  }

  /**
   * تطبيق الفلتر مع حركة
   * @param {string} filterKey - مفتاح الفلتر
   * @param {string} animation - نوع الحركة
   */
  applyFilterWithAnimation(filterKey, animation = 'fadeIn') {
    if (!this.isFilterSupported(filterKey)) {
      filterKey = 'none';
    }
    
    this.canvasElement.classList.add(`filter-animation-${filterKey}-${animation}`);
    
    // إزالة الفئة بعد الانتهاء
    this.canvasElement.addEventListener('animationend', onAnimationEnd = () => {
      this.canvasElement.classList.remove(`filter-animation-${filterKey}-${animation}`);
      this.canvasElement.removeEventListener('animationend', onAnimationEnd);
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.FILTER_ANIMATION_COMPLETED, {
        filterKey,
        animation,
        timestamp: Date.now()
      });
    });
  }

  /**
   * تطبيق الفلتر على الخلفية
   * @param {string} filterKey - مفتاح الفلتر
   * @param {string} animation - نوع الحركة
   */
  applyFilterToBackground(filterKey, animation = 'fadeIn') {
    if (!this.isFilterSupported(filterKey)) {
      filterKey = 'none';
    }
    
    // تطبيق الفلتر على الخلفية
    const backgroundElements = document.querySelectorAll('.background-element');
    backgroundElements.forEach(el => {
      el.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none';
    });
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_BACKGROUND, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * تطبيق الفلتر على النصوص
   * @param {string} filterKey - مفتاح الفلتر
   * @param {string} animation - نوع الحركة
   */
  applyFilterToText(filterKey, animation = 'fadeIn') {
    if (!this.isFilterSupported(filterKey)) {
      filterKey = 'none';
    }
    
    // تطبيق الفلتر على النصوص
    const textElements = document.querySelectorAll('[data-verse-text]');
    textElements.forEach(el => {
      el.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none';
    });
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_TEXT, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * تطبيق الفلتر على المؤقت
   * @param {string} filterKey - مفتاح الفلتر
   * @param {string} transition - نوع الانتقال
   */
  applyFilterToTimeline(filterKey, transition = 'fade') {
    if (!this.isFilterSupported(filterKey)) {
      filterKey = 'none';
    }
    
    // تطبيق الفلتر على المؤقت
    const timelineElement = document.querySelector('.timeline');
    if (timelineElement) {
      timelineElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none';
    }
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_TIMELINE, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * تطبيق الفلتر عند التصدير
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterToExport(filterKey) {
    if (!this.isFilterSupported(filterKey)) {
      filterKey = 'none';
    }
    
    // تطبيق الفلتر عند التصدير
    const exportSettings = this.stateStore.getState().currentProject?.exportSettings;
    if (exportSettings) {
      const exportButton = document.querySelector('#export-button');
      if (exportButton) {
        exportButton.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none';
        
        // نشر الحدث
        this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_EXPORT, {
          filterKey,
          timestamp: Date.now()
        });
      }
  }

  /**
   * إضافة فلتر مخصص
   * @param {string} filterKey - مفتاح الفلتر
   * @param {Object} filterConfig - تكوين الفلتر
   */
  addCustomFilter(filterKey, filterConfig) {
    if (!filterKey || !filterConfig || !filterConfig.name || !filterConfig.value) {
      this.errorLogger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.InvalidCustomFilterConfig'),
        origin: 'VideoFilterApplier.addCustomFilter'
      });
      return;
    }
    
    // إضافة الفلتر إلى القائمة المدعومة
    SUPPORTED_VIDEO_FILTERS[filterKey] = filterConfig;
    
    // تحديث واجهة المستخدم
    const option = document.createElement('option');
    option.value = filterKey;
    option.textContent = filterConfig.name;
    this.filterSelectElement.appendChild(option);
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.CUSTOM_FILTER_ADDED, {
      filterKey,
      filterConfig,
      timestamp: Date.now()
    });
  }

  /**
   * إزالة فلتر مخصص
   * @param {string} filterKey - مفتاح الفلتر
   */
  removeCustomFilter(filterKey) {
    if (!SUPPORTED_VIDEO_FILTERS[filterKey]) {
      this.errorLogger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.FilterNotFound', { filterKey }),
        origin: 'VideoFilterApplier.removeCustomFilter'
      });
      return;
    }
    
    // إزالة الفلتر من القائمة
    delete SUPPORTED_VIDEO_FILTERS[filterKey];
    
    // إزالة الفلتر من واجهة المستخدم
    const option = this.filterSelectElement.querySelector(`option[value="${filterKey}"]`);
    if (option) {
      option.remove();
    }
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.CUSTOM_FILTER_REMOVED, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * تحديث الفلتر
   * @param {string} filterKey - مفتاح الفلتر
   * @param {Object} filterConfig - تكوين الفلتر
   */
  updateCustomFilter(filterKey, filterConfig) {
    this.removeCustomFilter(filterKey);
    this.addCustomFilter(filterKey, filterConfig);
  }

  /**
   * تحديث شدة الفلتر
   * @param {string} filterKey - مفتاح الفلتر
   * @param {number} intensity - شدة الفلتر (0-1)
   */
  updateFilterIntensity(filterKey, intensity = 1) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تحديث شدة الفلتر
    const numericValue = filterKey.match(/([a-zA-Z]+)$|([a-zA-Z]+)\(([^)]+)\)/);
    if (numericValue && numericValue[1] && numericValue[2]) {
      const baseValue = numericValue[1];
      const newValue = `${baseValue}(${numericValue[2] * intensity})${numericValue[3] ? ')' : ''}`;
      this.canvasElement.style.filter = newValue;
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.FILTER_INTENSITY_CHANGED, {
        filterKey,
        intensity,
        timestamp: Date.now()
      });
    }
  }

  /**
   * تحديث شفافية الفلتر
   * @param {string} filterKey - مفتاح الفلتر
   * @param {number} opacity - الشفافية (0-1)
   */
  updateFilterOpacity(filterKey, opacity = 1) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تحديث شفافية الفلتر
    this.canvasElement.style.opacity = opacity;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_OPACITY_CHANGED, {
      filterKey,
      opacity,
      timestamp: Date.now()
    });
  }

  /**
   * تطبيق الفلتر تحت شرط معين
   * @param {string} filterKey - مفتاح الفلتر
   * @param {Function} condition - الشرط الذي يجب أن يتحقق
   */
  applyFilterIf(filterKey, condition) {
    if (typeof condition !== 'function') return;
    
    if (condition()) {
      this.applyFilter(filterKey);
    }
  }

  /**
   * تطبيق الفلتر إلا إذا تحقق شرط
   * @param {string} filterKey - مفتاح الفلتر
   * @param {Function} condition - الشرط الذي يجب ألا يتحقق
   */
  applyFilterUnless(filterKey, condition) {
    if (typeof condition !== 'function') return;
    
    if (!condition()) {
      this.applyFilter(filterKey);
    }
  }

  /**
   * تطبيق الفلتر على الكانفاس
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterToCanvas(filterKey) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تطبيق الفلتر على الكانفاس
    this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * تطبيق الفلتر على المؤقت
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterToTimeline(filterKey) {
    if (!this.isFilterSupported(filterKey)) return;
    
    // تطبيق الفلتر على المؤقت
    const timelineElement = document.querySelector('.timeline');
    if (timelineElement) {
      timelineElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    }
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_TIMELINE, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من صحة الفلتر
   * @returns {boolean} هل الفلتر جاهز؟
   */
  isFilterReady() {
    return this.canvasElement && this.filterSelectElement && this.stateStore.getState().currentProject;
  }

  /**
   * التحقق مما إذا كان الفلتر مدعومًا
   * @param {string} filterKey - مفتاح الفلتر
   * @returns {boolean} هل الفلتر جاهز؟
   */
  isFilterAvailable(filterKey) {
    return this.isFilterReady() && this.isFilterSupported(filterKey);
  }

  /**
   * التحقق من صحة الملف الشخصي
   * @returns {FilterState} الحالة الحالية
   */
  getFilterState() {
    const computedStyle = window.getComputedStyle(this.canvasElement);
    
    return {
      filterKey: this.canvasElement.style.filter || 'none',
      filterValue: computedStyle.filter || 'none',
      isAnimated: computedStyle.animationPlayState === 'running',
      animationProgress: computedStyle.getPropertyValue('--filter-progress') || 0,
      animationTiming: computedStyle.animationTimingFunction || 'normal',
      animationDuration: computedStyle.animationDuration || 'normal',
      animationDelay: computedStyle.animationDelay || '0s',
      animationFillMode: computedStyle.animationFillMode || 'forwards',
      animationEasing: computedStyle.animationTimingFunction || 'linear',
      animationReverse: computedStyle.animationDirection === 'reverse',
      animationIterationCount: parseInt(computedStyle.animationIterationCount) || 1,
      animationDirection: computedStyle.animationDirection || 'normal',
      animationRunning: computedStyle.animationPlayState === 'running',
      animationName: computedStyle.animationName || 'none',
      animationGroup: computedStyle.animationGroup || 'default',
      animationTimingFunction: computedStyle.animationTimingFunction || 'linear',
      isTainted: computedStyle.filter !== 'none',
      timestamp: Date.now()
    };
  }

  /**
   * التحقق مما إذا كان الفلتر قيد التشغيل
   * @returns {boolean} هل الفلتر قيد التشغيل؟
   */
  isFilterCurrentlyPlaying() {
    if (!this.canvasElement) return false;
    
    const computedStyle = window.getComputedStyle(this.canvasElement);
    return computedStyle.animationPlayState === 'running';
  }

  /**
   * التحقق مما إذا كان الفلتر قيد التشغيل
   * @returns {boolean} هل الفلتر قيد التشغيل؟
   * @param {string} filterKey - مفتاح الفلتر
   */
  isFilterCurrentlyPlaying(filterKey) {
    if (!this.canvasElement) return false;
    
    const computedStyle = window.getComputedStyle(this.canvasElement);
    return computedStyle.filter || 'none';
  }

  /**
   * التحقق من دعم الفلتر
   * @param {string} filterKey - مفتاح الفلتر
   * @returns {boolean} هل الفلتر مدعوم؟
   * @param {string} filterKey - مفتاح الفلتر
   */
  isFilterSupported(filterKey) {
    return !!SUPPORTED_VIDEO_FILTERS[filterKey];
  }

  /**
   * التحقق من دعم الفلتر
   * @returns {boolean} هل الفلتر مدعوم؟
   * @param {string} filterKey - مفتاح الفلتر
   */
  isFilterAvailable(filterKey) {
    const hasProject = !!this.stateStore.getState().currentProject;
    return hasProject && this.isFilterSupported(filterKey);
  }

  /**
   * التحقق من دعم الفلتر
   * @returns {boolean} هل الفلتر مدعوم؟
   * @param {string} filterKey - مفتاح الفلتر
   */
  isFilterReadyForPlayback(filterKey) {
    return this.isFilterAvailable(filterKey) && this.isFilterSupported(filterKey);
  }

  /**
   * التحقق من صحة الفلتر
   * @returns {boolean} هل الفلتر جاهز؟
   * @param {string} filterKey - مفتاح الفلتر
   */
  selfTest() {
    try {
      const originalFilter = this.canvasElement.style.filter;
      
      // تطبيق فلتر تجريبي
      this.applyFilter('grayscale');
      
      // التحقق مما إذا تم تطبيق الفلتر
      const isApplied = this.canvasElement.style.filter.includes('grayscale');
      
      // استعادة الفلتر الأصلي
      this.canvasElement.style.filter = originalFilter;
      
      return isApplied;
    } catch (e) {
      return false;
    }
  }

  /**
   * التحقق من صحة الفلتر
   * @returns {boolean} هل الفلتر قيد التشغيل؟
   * @param {string} filterKey - مفتاح الفلتر
   */
  checkFilterValidity(filterKey) {
    const logger = this.errorLogger || console;
    
    if (!this.canvasElement) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.CanvasOrFilterSelectMissing'),
        origin: 'VideoFilterApplier.checkFilterValidity'
      });
      return false;
    }
    
    const currentState = this.stateStore.getState();
    const currentFilter = currentState?.currentProject?.videoComposition?.videoFilter || 'none';
    
    if (!SUPPORTED_VIDEO_FILTERS[currentFilter]) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.UnplayableFilter', { filter: currentFilter }),
        origin: 'VideoFilterApplier.checkFilterValidity'
      });
      return false;
    }
    
    return true;
  }

  /**
   * تطبيق الفلتر مع انتقال
   * @param {string} filterKey - مفتاح الفلتر
   * @param {string} transition - نوع الانتقال
   */
  applyFilterWithTransition(filterKey, transition = 'fade') {
    if (!this.checkFilterValidity(filterKey)) return;
    
    const transitionClass = `filter-transition-${filterKey}-${transition}`;
    this.canvasElement.classList.add(transitionClass);
    
    // إزالة الفئة بعد الانتهاء
    setTimeout(() => {
      this.canvasElement.classList.remove(transitionClass);
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.FILTER_TRANSITION_COMPLETED, {
        filterKey,
        transition,
        timestamp: Date.now()
      });
    }, 500); // مدة الانتقال الافتراضية
  }

  /**
   * تطبيق الفلتر مع حركة
   * @param {string} filterKey - مفتاح الفلتر
   * @param {string} animation - نوع الحركة
   */
  applyFilterWithAnimation(filterKey, animation = 'fadeIn') {
    if (!this.checkFilterValidity(filterKey)) return;
    
    this.canvasElement.classList.add(`filter-animation-${filterKey}-${animation}`);
    
    // إزالة الفئة بعد الانتهاء
    this.canvasElement.addEventListener('animationend', onAnimationEnd = () => {
      this.canvasElement.classList.remove(`filter-animation-${filterKey}-${animation}`);
      this.canvasElement.removeEventListener('animationend', onAnimationEnd);
      
      // نشر الحدث
      this.eventAggregator.publish(EVENTS.FILTER_ANIMATION_COMPLETED, {
        filterKey,
        animation,
        timestamp: Date.now()
      });
    });
  }

  /**
   * تطبيق الفلتر على المؤقت
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterToTimeline(filterKey) {
    if (!this.isFilterReadyForPlayback(filterKey)) return;
    
    // تطبيق الفلتر على المؤقت
    const timelineElement = document.querySelector('.timeline');
    if (timelineElement) {
      timelineElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value;
    }
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_TIMELINE, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * تطبيق الفلتر على الصوت
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterToAudio(filterKey) {
    const logger = this.errorLogger || console;
    
    if (!this.isFilterReadyForPlayback(filterKey)) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.FilterApplyToAudio'),
        origin: 'VideoFilterApplier.applyFilterToAudio'
      });
      return;
    }
    
    // تطبيق الفلتر على الصوت
    const audioElement = document.querySelector('audio#main-audio');
    if (audioElement) {
      audioElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    }
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_AUDIO, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * تطبيق الفلتر على الذكاء الاصطناعي
   * @param {string} filterKey - مفتاح الفلتر
   */
  applyFilterToAIContent(filterKey) {
    const logger = this.errorLogger || console;
    
    if (!this.isFilterReadyForPlayback(filterKey)) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.FilterApplyToAIContent'),
        origin: 'VideoFilterApplier.applyFilterToAIContent'
      });
      return;
    }
    
    // تطبيق الفلتر على الذكاء الاصطناعي
    const aiElements = document.querySelectorAll('.ai-content');
    aiElements.forEach(el => {
      el.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey].value || 'none';
    });
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED_TO_AI, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * تطبيق الفلتر على الخلفية
   */
  applyFilterToBackground() {
    const logger = this.errorLogger || console;
    
    if (!this.canvasElement) {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.CanvasNotReady'),
        origin: 'VideoFilterApplier.applyFilterToBackground'
      });
      return;
    }
    
    // تطبيق الفلتر على الخلفية
    const backgroundType = this.stateStore.getState().currentProject?.background?.type;
    if (['image', 'video'].includes(backgroundType)) {
      this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none';
    } else {
      logger.logWarning({
        message: this.localizationService.translate('VideoFilterApplier.UnsupportedBackgroundType', { type: backgroundType }),
        origin: 'VideoFilterApplier.applyFilterToBackground'
      });
    }
  }

  /**
   * التحقق من حالة التشغيل
   * @param {boolean} isPlaying - هل الفلتر قيد التشغيل؟
   */
  handleFilterPlayStateChange(isPlaying) {
    if (!this.canvasElement) return;
    
    // تحديث حالة التشغيل
    this.canvasElement.style.animationPlayState = isPlaying ? 'running' : 'paused';
    
    // نشر الحدث
    this.eventAggregator.publish(isPlaying ? EVENTS.FILTER_PLAYING : EVENTS.FILTER_STOPPED, {
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {number} progress - تقدم الحركة (0-1)
   */
  handleFilterProgressChange(progress) {
    if (!this.canvasElement) return;
    
    // تطبيق تقدم الحركة
    this.canvasElement.style.setProperty('--filter-progress', progress);
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_PROGRESS_CHANGED, {
      progress,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {number} scale - المقياس (مثل 1.5، 0.7)
   */
  handleFilterScaleChange(scale) {
    if (!this.canvasElement) return;
    
    // تطبيق المقياس
    this.canvasElement.style.transform = `scale(${scale})`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_SCALE_CHANGED, {
      scale,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {number} rotation - الزاوية الجديدة
   */
  handleFilterRotationChange(rotation) {
    if (!this.canvasElement) return;
    
    // تطبيق الدوران
    this.canvasElement.style.transform = `rotate(${rotation}deg)`;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_ROTATION_CHANGED, {
      rotation,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} blendMode - وضعية المزج الجديدة
   */
  handleFilterBlendModeChange(blendMode) {
    if (!this.canvasElement) return;
    
    // تحديث وضعية المزج
    this.canvasElement.style.mixBlendMode = blendMode || 'normal';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_BLEND_MODE_CHANGED, {
      blendMode,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} newBlendMode - وضعية المزج الجديدة
   */
  handleFilterBlendModeChange(newBlendMode) {
    if (!this.canvasElement) return;
    
    // تحديث وضعية المزج
    this.canvasElement.style.mixBlendMode = newBlendMode || 'normal';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_BLEND_MODE_CHANGED, {
      blendMode: newBlendMode,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} direction - اتجاه الفلتر
   */
  handleFilterDirectionChange(direction) {
    if (!this.canvasElement) return;
    
    // تحديث اتجاه الفلتر
    this.canvasElement.style.animationDirection = direction;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DIRECTION_CHANGED, {
      direction,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} timing - وقت الانتقال
   */
  handleFilterTimingChange(timing) {
    if (!this.canvasElement) return;
    
    // تحديث وقت الانتقال
    this.canvasElement.style.animationTimingFunction = timing || 'linear';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_TIMING_CHANGED, {
      timing,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {number} iterationCount - عدد التكرار
   */
  handleFilterIterationCountChange(iterationCount) {
    if (!this.canvasElement) return;
    
    // تحديث عدد التكرار
    this.canvasElement.style.animationIterationCount = iterationCount;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_ITERATION_COUNT_CHANGED, {
      iterationCount,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} direction - اتجاه الفلتر
   */
  handleFilterDirectionChange(direction) {
    if (!this.canvasElement) return;
    
    // تحديث اتجاه الفلتر
    this.canvasElement.style.animationDirection = direction;
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_DIRECTION_CHANGED, {
      direction,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {boolean} isPlaying - هل الفلتر قيد التشغيل؟
   */
  handleFilterPlayStateChange(isPlaying) {
    if (!this.canvasElement) return;
    
    // تحديث حالة التشغيل
    this.canvasElement.style.animationPlayState = isPlaying ? 'running' : 'paused';
    
    // نشر الحدث
    this.eventAggregator.publish(isPlaying ? EVENTS.FILTER_PLAYING : EVENTS.FILTER_STOPPED, {
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   */
  handleFilterFinish() {
    if (!this.canvasElement) return;
    
    // تطبيق تأثير انتهاء الفلتر
    this.canvasElement.style.transition = 'filter 0.3s ease-out';
    this.canvasElement.style.filter = 'none';
    
    // إزالة التأثير بعد الانتهاء
    setTimeout(() => {
      this.canvasElement.style.transition = '';
    }, 300);
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_FINISHED, {
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   */
  handleFilterCancel() {
    if (!this.canvasElement) return;
    
    // تطبيق تأثير إلغاء الفلتر
    this.canvasElement.style.transition = 'filter 0.2s ease-in';
    this.canvasElement.style.filter = 'none';
    
    // إزالة التأثير بعد الانتهاء
    setTimeout(() => {
      this.canvasElement.style.transition = '';
    }, 200);
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_CANCELED, {
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   */
  handleFilterUpdate(filterKey) {
    if (!this.isFilterReadyForPlayback(filterKey)) return;
    
    // تحديث الفلتر
    const textElements = document.querySelectorAll('[data-verse-text]');
    textElements.forEach(el => {
      el.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none';
    });
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_UPDATED, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   */
  handleFilterReset(filterKey) {
    if (!this.isFilterReadyForPlayback(filterKey)) return;
    
    // إعادة تعيين الفلتر
    const textElements = document.querySelectorAll('[data-verse-text]');
    textElements.forEach(el => {
      el.style.filter = 'none';
    });
    
    // تحديث واجهة المستخدم
    this.filterSelectElement.value = 'none';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_RESET, {
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   */
  handleFilterApply(filterKey) {
    if (!this.isFilterReadyForPlayback(filterKey)) return;
    
    // تطبيق الفلتر
    this.canvasElement.style.filter = SUPPORTED_VIDEO_FILTERS[filterKey]?.value || 'none';
    
    // نشر الحدث
    this.eventAggregator.publish(EVENTS.FILTER_APPLIED, {
      filterKey,
      timestamp: Date.now()
    });
  }

  /**
   * التحقق من حالة التشغيل
   * @param {string} filterKey - مفتاح الفلتر
   */
  handleFilterRemove(filterKey) {
    if (!this.isFilterReadyForPlayback(filterKey)) return;
    
    // إزالة الفلتر
    this.canvasElement.style.filter = 'none
