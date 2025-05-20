// js/shared-ui-components/panel.manager.js

import DOMElements from '../core/dom-elements.js';
import { EVENTS, ACTIONS } from '../config/app.constants.js';
import { validateId, isElement } from '../utils/dom.manipulator.js';

/**
 * @typedef {Object} PanelManagerDependencies
 * @property {Object} eventAggregator - محرك الأحداث (Event Aggregator)
 * @property {Object} errorLogger - مسجل الأخطاء
 * @property {Object} [stateStore] - مخزن الحالة
 * @property {Function} [stateStore.dispatch] - إرسال تغييرات الحالة
 * @property {Function} [stateStore.getState] - الحصول على الحالة الحالية
 */

/**
 * @typedef {Object} PanelManagerState
 * @property {string | null} activePanelId - معرف اللوحة النشطة
 * @property {Object<string, boolean>} panelVisibility - حالة ظهور كل لوحة
 * @property {boolean} isInitialized - هل تم تهيئة المدير
 * @property {boolean} isEventListenersAttached - هل تم ربط مراقبي الأحداث
 * @property {Array<string>} registeredPanels - قائمة اللوحات المسجلة
 * @property {Array<string>} hiddenPanels - قائمة اللوحات المخفية
 * @property {Array<string>} lockedPanels - قائمة اللوحات المؤمنة
 * @property {Object<string, Function>} customHandlers - معالجات مخصصة لكل لوحة
 */

/**
 * @typedef {Object} PanelManagerConfig
 * @property {string} [defaultPanelId] - معرف اللوحة الافتراضية
 * @property {boolean} [autoInitialize=true] - هل يتم تهيئة المدير تلقائيًا
 * @property {boolean} [useGlobalState=true] - هل يستخدم `stateStore` لتتبع الحالة
 * @property {boolean} [allowMultiplePanels=false] - هل يُسمح بظهور أكثر من لوحة في نفس الوقت
 * @property {boolean} [lockOnLoad=false] - هل تُقفل اللوحات عند التحميل
 * @property {boolean} [animate=true] - هل يتم استخدام التحريك عند تغيير اللوحة
 * @property {number} [animationDuration=300] - مدة التحريك بالمللي ثانية
 * @property {boolean} [trackUsage=false] - هل يتم تتبع استخدام اللوحات
 * @property {Function} [usageTracker] - وظيفة تتبع الاستخدام
 */

/**
 * مدير اللوحات
 * @type {{}}
 */
const panelManager = (() => {
  // المتغيرات الداخلية
  let currentVisiblePanelId = null;
  let dependencies = {
    eventAggregator: { publish: () => {} },
    errorLogger: console,
    stateStore: { dispatch: () => {}, getState: () => ({ activePanelId: null }) }
  };
  let config = {
    allowMultiplePanels: false,
    animate: true,
    animationDuration: 300,
    trackUsage: false,
    usageTracker: null
  };
  let registeredPanels = new Set();
  let lockedPanels = new Set();
  let panelVisibility = {};
  let customHandlers = {};
  
  /**
   * إخفاء كل اللوحات
   * @private
   */
  function _hideAllPanels() {
    const panels = DOMElements.activeControlPanelsContainer?.querySelectorAll('.control-panel');
    
    if (panels) {
      panels.forEach(panel => {
        if (!lockedPanels.has(panel.id)) {
          panel.classList.remove('visible');
          panelVisibility[panel.id] = false;
          
          if (typeof customHandlers[panel.id]?.onHide === 'function') {
            try {
              customHandlers[panel.id].onHide(panel);
            } catch (e) {
              console.error(`[PanelManager] خطأ في استدعاء onHide للوحة ${panel.id}:`, e);
            }
          }
        }
      });
    }
    
    currentVisiblePanelId = null;
  }

  /**
   * عرض لوحة معينة حسب معرفها
   * @param {string} panelId - معرف اللوحة
   */
  function showPanel(panelId) {
    // التحقق من صحة المدخلات
    if (!panelId || typeof panelId !== 'string' || !validateId(panelId)) {
      const errMsg = `معرف اللوحة غير صالح: ${panelId}`;
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: errMsg, origin: 'PanelManager.showPanel'
      });
      return;
    }

    // التحقق مما إذا كانت اللوحة مسجلة
    if (!registeredPanels.has(panelId)) {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: `اللوحة ${panelId} لم يتم تسجيلها.`,
        origin: 'PanelManager.showPanel'
      });
      return;
    }

    // التحقق مما إذا كانت اللوحة مقيدة
    if (lockedPanels.has(panelId)) {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: `اللوحة ${panelId} مقيدة ولا يمكن عرضها.`,
        origin: 'PanelManager.showPanel'
      });
      return;
    }

    // إذا كانت اللوحة هي نفسها، قم بإخفائها
    if (currentVisiblePanelId === panelId) {
      hideCurrentPanel();
      return;
    }

    // إخفاء اللوحات الأخرى إن لم يكن مسموحًا بعرض متعدد
    if (!config.allowMultiplePanels) {
      _hideAllPanels();
    }

    // البحث عن اللوحة وعرضها
    const panelToShow = document.getElementById(panelId);
    
    if (panelToShow && panelToShow.classList.contains('control-panel')) {
      panelToShow.classList.add('visible');
      
      if (config.animate) {
        panelToShow.style.transition = `opacity ${config.animationDuration}ms ease-in-out`;
        panelToShow.style.opacity = '0';
        
        requestAnimationFrame(() => {
          panelToShow.style.opacity = '1';
        });
      }
      
      currentVisiblePanelId = panelId;
      panelVisibility[panelId] = true;
      
      // تحديث الحالة
      if (dependencies.stateStore && dependencies.stateStore.dispatch) {
        dependencies.stateStore.dispatch(ACTIONS.SET_ACTIVE_PANEL_ID, panelId);
      }
      
      // تتبع الاستخدام
      if (config.trackUsage && typeof config.usageTracker === 'function') {
        try {
          config.usageTracker({
            panelId,
            action: 'show',
            timestamp: Date.now()
          });
        } catch (e) {
          dependencies.errorLogger.warn?.call(dependencies.errorLogger, {
            message: `فشل في تتبع استخدام اللوحة ${panelId}`,
            origin: 'PanelManager.showPanel'
          });
        }
      }
      
      // نشر الحدث
      dependencies.eventAggregator.publish(EVENTS.PANEL_VISIBILITY_CHANGED, {
        panelId,
        visible: true
      });
      
    } else {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: `اللوحة ${panelId} غير موجودة أو ليست لوحة تحكم.`,
        origin: 'PanelManager.showPanel'
      });
    }

    // تحديث أزرار التبويب
    _updateTabButtonsState(panelId);
  }

  /**
   * إخفاء اللوحة النشطة
   */
  function hideCurrentPanel() {
    if (!currentVisiblePanelId) {
      return;
    }

    // إخفاء اللوحة
    const panelToHide = document.getElementById(currentVisiblePanelId);
    
    if (panelToHide && panelToHide.classList.contains('control-panel')) {
      if (config.animate) {
        panelToHide.style.opacity = '0';
        
        setTimeout(() => {
          panelToHide.classList.remove('visible');
          panelVisibility[currentVisiblePanelId] = false;
          _updateTabButtonsState(null);
          
          // نشر الحدث
          dependencies.eventAggregator.publish(EVENTS.PANEL_VISIBILITY_CHANGED, {
            panelId: currentVisiblePanelId,
            visible: false
          });
          
          // تحديث الحالة
          if (dependencies.stateStore && dependencies.stateStore.dispatch) {
            dependencies.stateStore.dispatch(ACTIONS.SET_ACTIVE_PANEL_ID, null);
          }
          
          // استدعاء وظيفة onHide إن وجدت
          if (typeof customHandlers[currentVisiblePanelId]?.onHide === 'function') {
            try {
              customHandlers[currentVisiblePanelId].onHide(panelToHide);
            } catch (e) {
              dependencies.errorLogger.warn?.call(dependencies.errorLogger, {
                message: `فشل في استدعاء onHide للوحة ${currentVisiblePanelId}: ${e.message}`,
                origin: 'PanelManager.hideCurrentPanel'
              });
            }
          }
          
          currentVisiblePanelId = null;
          
        }, config.animationDuration);
      } else {
        panelToHide.classList.remove('visible');
        panelVisibility[currentVisiblePanelId] = false;
        currentVisiblePanelId = null;
        
        _updateTabButtonsState(null);
        
        // نشر الحدث
        dependencies.eventAggregator.publish(EVENTS.PANEL_VISIBILITY_CHANGED, {
          panelId: currentVisiblePanelId,
          visible: false
        });
        
        // تحديث الحالة
        if (dependencies.stateStore && dependencies.stateStore.dispatch) {
          dependencies.stateStore.dispatch(ACTIONS.SET_ACTIVE_PANEL_ID, null);
        }
      }
    }
  }

  /**
   * تحديث حالة أزرار التبويب
   * @private
   * @param {string | null} activePanelId - معرف اللوحة النشطة
   */
  function _updateTabButtonsState(activePanelId) {
    if (!DOMElements.mainBottomTabBar) {
      return;
    }

    const tabButtons = DOMElements.mainBottomTabBar.querySelectorAll('.main-tab-button');
    
    if (!tabButtons || !tabButtons.length) {
      return;
    }

    tabButtons.forEach(button => {
      const panelId = button.dataset.panelId;
      
      if (!panelId) {
        return;
      }
      
      if (panelId === activePanelId) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
      
      // إضافة خاصية غير قابلة للنقر إن لزم الأمر
      if (lockedPanels.has(panelId)) {
        button.disabled = true;
        button.classList.add('locked');
      } else {
        button.disabled = false;
        button.classList.remove('locked');
      }
    });
  }

  /**
   * معالجة النقر على أزرار التبويب
   * @private
   * @param {Event} event - حدث النقر
   */
  function _handleTabButtonClick(event) {
    const button = event.target.closest('.main-tab-button');
    
    if (button && button.dataset.panelId) {
      showPanel(button.dataset.panelId);
    }
  }

  /**
   * معالجة النقر على أزرار إغلاق اللوحة
   * @private
   * @param {Event} event - حدث النقر
   */
  function _handlePanelCloseButtonClick(event) {
    const button = event.target.closest('.close-panel-btn');
    
    if (button && button.dataset.panelId) {
      if (currentVisiblePanelId === button.dataset.panelId) {
        hideCurrentPanel();
      } else {
        dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
          message: `تم النقر على زر إغلاق لوحة غير نشطة: ${button.dataset.panelId}`,
          origin: 'PanelManager._handlePanelCloseButtonClick',
          context: { currentVisiblePanelId }
        });
      }
    }
  }

  /**
   * تعيين التبعيات الداخلية
   * @param {PanelManagerDependencies} injectedDeps - التبعيات المُدخلة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
  }

  /**
   * تعيين إعدادات المدير
   * @param {PanelManagerConfig} injectedConfig - الإعدادات المُدخلة
   */
  function setConfig(injectedConfig) {
    if (!injectedConfig || typeof injectedConfig !== 'object') {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: 'إعدادات المدير غير صالحة.',
        origin: 'PanelManager.setConfig'
      });
      return;
    }
    
    config = {
      ...config,
      ...injectedConfig,
      animationDuration: Math.max(100, Math.min(1000, injectedConfig.animationDuration || config.animationDuration))
    };
  }

  /**
   * التحقق من وجود لوحة معينة
   * @param {string} panelId - معرف اللوحة
   * @returns {boolean} true إذا وُجدت اللوحة
   */
  function isPanelRegistered(panelId) {
    return typeof panelId === 'string' && registeredPanels.has(panelId);
  }

  /**
   * التحقق من ظهور لوحة معينة
   * @param {string} panelId - معرف اللوحة
   * @returns {boolean} true إذا كانت اللوحة مرئية
   */
  function isPanelVisible(panelId) {
    return typeof panelId === 'string' && !!panelVisibility[panelId];
  }

  /**
   * التحقق من قفل لوحة معينة
   * @param {string} panelId - معرف اللوحة
   * @returns {boolean} true إذا كانت اللوحة مقفولة
   */
  function isPanelLocked(panelId) {
    return typeof panelId === 'string' && lockedPanels.has(panelId);
  }

  /**
   * التحقق من وجود لوحة مرئية
   * @returns {boolean} true إذا كان هناك لوحة مرئية
   */
  function hasVisiblePanel() {
    return currentVisiblePanelId !== null && currentVisiblePanelId !== undefined;
  }

  /**
   * التحقق من حالة اللوحة
   * @returns {PanelManagerState} الحالة الحالية للمدير
   */
  function getManagerState() {
    return {
      activePanelId: currentVisiblePanelId,
      panelVisibility: { ...panelVisibility },
      isInitialized: true,
      isEventListenersAttached: !!DOMElements.mainBottomTabBar,
      registeredPanels: Array.from(registeredPanels),
      hiddenPanels: Object.keys(panelVisibility).filter(id => !panelVisibility[id]),
      lockedPanels: Array.from(lockedPanels),
      customHandlers: Object.keys(customHandlers)
    };
  }

  /**
   * تسجيل لوحة جديدة
   * @param {string} panelId - معرف اللوحة
   * @param {Object} [handler] - معالجات مخصصة للوحة
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function registerCustomPanel(panelId, handler) {
    if (!panelId || typeof panelId !== 'string' || !validateId(panelId)) {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: 'معرف اللوحة غير صالح.',
        origin: 'PanelManager.registerCustomPanel'
      });
      return false;
    }

    if (document.getElementById(panelId) === null) {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: `اللوحة ${panelId} غير موجودة في DOM.`,
        origin: 'PanelManager.registerCustomPanel'
      });
      return false;
    }

    registeredPanels.add(panelId);
    panelVisibility[panelId] = false;
    
    if (handler && typeof handler === 'object') {
      customHandlers[panelId] = handler;
    }

    // التحقق من حالة اللوحة المُسجلة
    const panelElement = document.getElementById(panelId);
    
    if (panelElement && panelElement.classList.contains('visible')) {
      currentVisiblePanelId = panelId;
      panelVisibility[panelId] = true;
      
      if (dependencies.stateStore && dependencies.stateStore.dispatch) {
        dependencies.stateStore.dispatch(ACTIONS.SET_ACTIVE_PANEL_ID, panelId);
      }
    }

    return true;
  }

  /**
   * إلغاء تسجيل لوحة
   * @param {string} panelId - معرف اللوحة
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function unregisterCustomPanel(panelId) {
    if (!isPanelRegistered(panelId)) {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: `اللوحة ${panelId} غير مسجلة.`,
        origin: 'PanelManager.unregisterCustomPanel'
      });
      return false;
    }

    // إخفاء اللوحة إن كانت مرئية
    if (isPanelVisible(panelId) && !isPanelLocked(panelId)) {
      const panelElement = document.getElementById(panelId);
      
      if (panelElement) {
        panelElement.classList.remove('visible');
        panelVisibility[panelId] = false;
      }
      
      if (currentVisiblePanelId === panelId) {
        currentVisiblePanelId = null;
        
        if (dependencies.stateStore && dependencies.stateStore.dispatch) {
          dependencies.stateStore.dispatch(ACTIONS.SET_ACTIVE_PANEL_ID, null);
        }
      }
    }

    // إزالة المعالجات المخصصة
    if (customHandlers[panelId]) {
      delete customHandlers[panelId];
    }

    // إزالة اللوحة من المسجل
    registeredPanels.delete(panelId);
    
    return true;
  }

  /**
   * قفل لوحة معينة
   * @param {string} panelId - معرف اللوحة
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function lockPanel(panelId) {
    if (!isPanelRegistered(panelId)) {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: `اللوحة ${panelId} غير مسجلة ولا يمكن قفلها.`,
        origin: 'PanelManager.lockPanel'
      });
      return false;
    }

    if (!lockedPanels.has(panelId)) {
      lockedPanels.add(panelId);
      
      // تحديث زر التبويب المقابل
      const tabButton = DOMElements.mainBottomTabBar?.querySelector(`[data-panel-id="${panelId}"]`);
      
      if (tabButton) {
        tabButton.disabled = true;
        tabButton.classList.add('locked');
      }
      
      // إخفاء اللوحة المقفولة
      if (isPanelVisible(panelId)) {
        const panelElement = document.getElementById(panelId);
        
        if (panelElement) {
          panelElement.classList.remove('visible');
          panelVisibility[panelId] = false;
          
          if (currentVisiblePanelId === panelId) {
            currentVisiblePanelId = null;
            
            if (dependencies.stateStore && dependencies.stateStore.dispatch) {
              dependencies.stateStore.dispatch(ACTIONS.SET_ACTIVE_PANEL_ID, null);
            }
          }
          
          // نشر الحدث
          dependencies.eventAggregator.publish(EVENTS.PANEL_LOCKED, {
            panelId,
            locked: true
          });
        }
      }
    }
    
    return true;
  }

  /**
   * فك قفل لوحة معينة
   * @param {string} panelId - معرف اللوحة
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function unlockPanel(panelId) {
    if (!isPanelRegistered(panelId)) {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: `اللوحة ${panelId} غير مسجلة ولا يمكن فك قفلها.`,
        origin: 'PanelManager.unlockPanel'
      });
      return false;
    }

    if (lockedPanels.has(panelId)) {
      lockedPanels.delete(panelId);
      
      // تحديث زر التبويب المقابل
      const tabButton = DOMElements.mainBottomTabBar?.querySelector(`[data-panel-id="${panelId}"]`);
      
      if (tabButton) {
        tabButton.disabled = false;
        tabButton.classList.remove('locked');
      }
      
      // نشر الحدث
      dependencies.eventAggregator.publish(EVENTS.PANEL_UNLOCKED, {
        panelId,
        locked: false
      });
    }
    
    return true;
  }

  /**
   * عرض أو إخفاء لوحة حسب حالتها الحالية
   * @param {string} panelId - معرف اللوحة
   * @returns {boolean} true إذا تمت العملية
   */
  function togglePanel(panelId) {
    if (!isPanelRegistered(panelId)) {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: `اللوحة ${panelId} غير مسجلة ولا يمكن تبديلها.`,
        origin: 'PanelManager.togglePanel'
      });
      return false;
    }

    if (isPanelLocked(panelId)) {
      dependencies.errorLogger.warn?.call(dependencies.errorLogger, {
        message: `اللوحة ${panelId} مقفولة ولا يمكن تبديلها.`,
        origin: 'PanelManager.togglePanel'
      });
      return false;
    }

    if (isPanelVisible(panelId)) {
      hideCurrentPanel();
    } else {
      showPanel(panelId);
    }
    
    return true;
  }

  /**
   * الحصول على اللوحة النشطة
   * @returns {HTMLElement | null} اللوحة النشطة أو null
   */
  function getActivePanel() {
    return currentVisiblePanelId ? document.getElementById(currentVisiblePanelId) : null;
  }

  /**
   * الحصول على كل اللوحات المسجلة
   * @returns {Array<string>} قائمة معرفات اللوحات
   */
  function getAllRegisteredPanels() {
    return Array.from(registeredPanels);
  }

  /**
   * الحصول على كل اللوحات المرئية
   * @returns {Array<string>} قائمة معرفات اللوحات المرئية
   */
  function getAllVisiblePanels() {
    return Object.keys(panelVisibility).filter(id => panelVisibility[id]);
  }

  /**
   * الحصول على كل اللوحات المقفولة
   * @returns {Array<string>} قائمة معرفات اللوحات المقفولة
   */
  function getAllLockedPanels() {
    return Array.from(lockedPanels);
  }

  /**
   * تعيين معالجات مخصصة للوحة
   * @param {string} panelId - معرف اللوحة
   * @param {Object} handler - المعالجات المطلوبة
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function setCustomHandler(panelId, handler) {
    if (!isPanelRegistered(panelId)) {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: `اللوحة ${panelId} غير مسجلة.`,
        origin: 'PanelManager.setCustomHandler'
      });
      return false;
    }

    if (!handler || typeof handler !== 'object') {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: `معالج اللوحة ${panelId} غير صالح.`,
        origin: 'PanelManager.setCustomHandler'
      });
      return false;
    }

    customHandlers[panelId] = handler;
    return true;
  }

  /**
   * إضافة مراقب الأحداث للوحة
   * @private
   * @param {HTMLElement} panelElement - عنصر اللوحة
   * @param {string} panelId - معرف اللوحة
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function _attachPanelEventListeners(panelElement, panelId) {
    if (!isElement(panelElement)) {
      return false;
    }

    // إضافة مراقب للحدث على الزر الداخلي لإغلاق اللوحة
    const internalCloseButton = panelElement.querySelector('.internal-close-btn');
    
    if (internalCloseButton) {
      internalCloseButton.addEventListener('click', () => {
        if (!isPanelLocked(panelId)) {
          hideCurrentPanel();
        }
      });
    }

    // إضافة مراقب للزر Esc لإغلاق اللوحة
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && currentVisiblePanelId === panelId && !isPanelLocked(panelId)) {
        hideCurrentPanel();
      }
    });

    return true;
  }

  /**
   * إضافة مراقبي الأحداث للوحة
   */
  function initializeEventListeners() {
    if (!DOMElements.mainBottomTabBar) {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: 'حاوية أزرار التبويب غير موجودة.',
        origin: 'PanelManager.initializeEventListeners'
      });
      return false;
    }

    // إضافة مراقب أحداث لزر التبويب
    DOMElements.mainBottomTabBar.addEventListener('click', _handleTabButtonClick);
    
    // إضافة مراقب أحداث لزر الإغلاق
    if (DOMElements.activeControlPanelsContainer) {
      DOMElements.activeControlPanelsContainer.addEventListener('click', _handlePanelCloseButtonClick);
    }
    
    return true;
  }

  /**
   * التحقق من إعدادات المدير
   * @private
   * @param {PanelManagerConfig} injectedConfig - الإعدادات المُدخلة
   * @returns {boolean} true إذا كانت الإعدادات صحيحة
   */
  function _validateConfig(injectedConfig) {
    if (!injectedConfig || typeof injectedConfig !== 'object') {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: 'إعدادات المدير غير صالحة.',
        origin: 'PanelManager._validateConfig'
      });
      return false;
    }

    // التحقق من معرف اللوحة الافتراضي
    if (injectedConfig.defaultPanelId && !isPanelRegistered(injectedConfig.defaultPanelId)) {
      dependencies.errorLogger.warn?.call(dependencies.errorLogger, {
        message: `اللوحة الافتراضية غير مسجلة: ${injectedConfig.defaultPanelId}`,
        origin: 'PanelManager._validateConfig'
      });
      return false;
    }

    // التحقق من مدة التحريك
    if (typeof injectedConfig.animationDuration !== 'number' || injectedConfig.animationDuration < 100 || injectedConfig.animationDuration > 1000) {
      dependencies.errorLogger.warn?.call(dependencies.errorLogger, {
        message: `مدة التحريك غير صالحة: ${injectedConfig.animationDuration}. يجب أن تكون بين 100 و1000 مللي ثانية.`,
        origin: 'PanelManager._validateConfig'
      });
      return false;
    }

    return true;
  }

  /**
   * تهيئة المدير
   * @param {PanelManagerDependencies} dependencies - التبعيات
   * @param {PanelManagerConfig} [injectedConfig] - الإعدادات المُدخلة
   * @returns {Object} واجهة برمجية للمدير
   */
  function initializePanelManager(dependencies, injectedConfig) {
    try {
      // تعيين التبعيات
      _setDependencies(dependencies);
      
      // التحقق من الإعدادات
      if (injectedConfig && typeof injectedConfig === 'object') {
        if (_validateConfig(injectedConfig)) {
          setConfig(injectedConfig);
        } else {
          dependencies.errorLogger.warn?.call(dependencies.errorLogger, {
            message: 'إعدادات المدير غير صالحة.',
            origin: 'PanelManager.initializePanelManager'
          });
        }
      }
      
      // تسجيل اللوحات الافتراضية
      if (DOMElements.activeControlPanelsContainer) {
        const panels = DOMElements.activeControlPanelsContainer.querySelectorAll('.control-panel');
        
        panels.forEach(panel => {
          if (panel.id) {
            registerCustomPanel(panel.id);
          }
        });
      }
      
      // تهيئة أحداث اللوحات
      initializeEventListeners();
      
      // عرض اللوحة الافتراضية
      if (config.defaultPanelId && isPanelRegistered(config.defaultPanelId) && !isPanelLocked(config.defaultPanelId)) {
        showPanel(config.defaultPanelId);
      }
      
      // إرجاع واجهة برمجية نظيفة
      return {
        showPanel,
        hideCurrentPanel,
        togglePanel,
        registerCustomPanel,
        unregisterCustomPanel,
        lockPanel,
        unlockPanel,
        isPanelVisible,
        isPanelLocked,
        getActivePanel,
        getAllRegisteredPanels,
        getAllVisiblePanels,
        getAllLockedPanels,
        setCustomHandler,
        getManagerState
      };
    } catch (error) {
      dependencies.errorLogger.handleError?.call(dependencies.errorLogger, {
        error,
        message: 'فشل في تهيئة مدير اللوحات.',
        origin: 'PanelManager.initializePanelManager'
      });
      return {
        showPanel: (panelId) => {
          dependencies.errorLogger.warn?.call(dependencies.errorLogger, {
            message: 'مدير اللوحات غير جاهز.',
            origin: 'PanelManager.showPanel'
          });
        },
        hideCurrentPanel: () => {},
        togglePanel: () => false,
        registerCustomPanel: () => false,
        unregisterCustomPanel: () => false,
        lockPanel: () => false,
        unlockPanel: () => false,
        isPanelVisible: () => false,
        isPanelLocked: () => false,
        getActivePanel: () => null,
        getAllRegisteredPanels: () => [],
        getAllVisiblePanels: () => [],
        getAllLockedPanels: () => [],
        setCustomHandler: () => false,
        getManagerState: () => ({
          activePanelId: null,
          panelVisibility: {},
          isInitialized: false,
          isEventListenersAttached: false,
          registeredPanels: [],
          hiddenPanels: [],
          lockedPanels: [],
          customHandlers: {}
        })
      };
    }
  }

  /**
   * تعيين التبعيات الداخلية
   * @param {PanelManagerDependencies} injectedDeps - التبعيات المُدخلة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
  }

  /**
   * إضافة لوحة إلى التسجيل
   * @param {string} panelId - معرف اللوحة
   * @param {Object} [handler] - معالجات مخصصة للوحة
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function registerCustomPanel(panelId, handler) {
    if (!panelId || typeof panelId !== 'string' || !validateId(panelId)) {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: 'معرف اللوحة غير صالح.',
        origin: 'PanelManager.registerCustomPanel'
      });
      return false;
    }

    const panelElement = document.getElementById(panelId);
    
    if (!panelElement || !panelElement.classList.contains('control-panel')) {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: `اللوحة ${panelId} غير موجودة أو ليست لوحة تحكم.`,
        origin: 'PanelManager.registerCustomPanel'
      });
      return false;
    }

    if (registeredPanels.has(panelId)) {
      dependencies.errorLogger.warn?.call(dependencies.errorLogger, {
        message: `اللوحة ${panelId} مسجلة بالفعل.`,
        origin: 'PanelManager.registerCustomPanel'
      });
      return false;
    }

    // تسجيل اللوحة
    registeredPanels.add(panelId);
    panelVisibility[panelId] = panelElement.classList.contains('visible');
    
    // إضافة مراقب الأحداث للوحة
    _attachPanelEventListeners(panelElement, panelId);
    
    // إضافة المعالجات المخصصة إن وُجدت
    if (handler && typeof handler === 'object') {
      customHandlers[panelId] = handler;
    }
    
    return true;
  }

  /**
   * إزالة لوحة من التسجيل
   * @param {string} panelId - معرف اللوحة
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function unregisterCustomPanel(panelId) {
    if (!isPanelRegistered(panelId)) {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: `اللوحة ${panelId} غير مسجلة.`,
        origin: 'PanelManager.unregisterCustomPanel'
      });
      return false;
    }

    // إزالة اللوحة من التسجيل
    const panelElement = document.getElementById(panelId);
    
    if (panelElement) {
      // إزالة مراقب الأحداث
      panelElement.removeEventListener('click', _handlePanelCloseButtonClick);
      
      // إزالة الحالة
      if (currentVisiblePanelId === panelId) {
        currentVisiblePanelId = null;
        
        if (dependencies.stateStore && dependencies.stateStore.dispatch) {
          dependencies.stateStore.dispatch(ACTIONS.SET_ACTIVE_PANEL_ID, null);
        }
      }
      
      panelVisibility[panelId] = false;
    }
    
    registeredPanels.delete(panelId);
    delete customHandlers[panelId];
    
    return true;
  }

  /**
   * التحقق من حالة اللوحة
   * @param {string} panelId - معرف اللوحة
   * @param {Object} [context] - سياق التحقق
   * @returns {boolean} true إذا كانت اللوحة مسجلة وصالحة
   */
  function validatePanelId(panelId, context = {}) {
    if (!panelId || typeof panelId !== 'string' || !validateId(panelId)) {
      dependencies.errorLogger.logWarning?.call(dependencies.errorLogger, {
        message: `معرف اللوحة غير صالح: ${panelId}`,
        origin: 'PanelManager.validatePanelId',
        context
      });
      return false;
    }
    
    return true;
  }

  return {
    _setDependencies: _setDependencies,
    showPanel,
    hideCurrentPanel,
    togglePanel,
    registerCustomPanel,
    unregisterCustomPanel,
    lockPanel,
    unlockPanel,
    isPanelRegistered,
    isPanelVisible,
    isPanelLocked,
    getActivePanel,
    getAllRegisteredPanels,
    getAllVisiblePanels,
    getAllLockedPanels,
    setCustomHandler,
    getManagerState,
    initializeEventListeners
  };
})();

/**
 * تهيئة مدير اللوحات
 * @param {PanelManagerDependencies} dependencies - التبعيات
 * @param {PanelManagerConfig} [injectedConfig] - الإعدادات المُدخلة
 */
export function initializePanelManager(dependencies, injectedConfig) {
  try {
    console.info('[PanelManager] تم تهيئته بنجاح');
    
    // جعل المدير متاحًا عالميًا لتسهيل التصحيح
    if (typeof window !== 'undefined' && 
        (typeof process === 'undefined' || process.env.NODE_ENV === 'development')) {
      window.panelManager = {
        ...panelManager
      };
    }
    
    // تعيين التبعيات
    if (dependencies && typeof dependencies === 'object') {
      panelManager._setDependencies(dependencies);
    }
    
    // تعيين الإعدادات
    if (injectedConfig && typeof injectedConfig === 'object') {
      panelManager.setConfig(injectedConfig);
    }
    
    // تهيئة أحداث اللوحة
    panelManager.initializeEventListeners();
    
    return {
      ...panelManager,
      getManagerState: panelManager.getManagerState
    };
  } catch (error) {
    console.error('[PanelManager] فشل في التهيئة:', error);
    return {};
  }
}

export default panelManager;
