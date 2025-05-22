/**
 * @fileoverview وحدة إدارة الحالة العالمية للتطبيق مع دعم متقدم للتعديلات والإعادة
 * @module state-store
 */

/**
 * وحدة إدارة الحالة العالمية للتطبيق
 */
const stateStore = (() => {
  // --- تعريفات JSDoc للحالة ---
  /**
   * @typedef {Object} QuranSelectionState
   * @property {number | null} surahId
   * @property {number | null} startAyah
   * @property {number | null} endAyah
   * @property {string | null} reciterId
   * @property {string | null} translationId
   * @property {number} delayBetweenAyahs
   * @property {Object.<number, {start: number, end: number, text?: string, translationText?: string}>} [ayahTimings] // المفتاح هو رقم الآية العالمي
   * @property {Array<PlaylistItemFromState>} [currentPlaylistForDisplay] // إذا كان يتم إدارة القائمة مباشرة في الحالة
   */

  /**
   * @typedef {Object} BackgroundState
   * @property {'color' | 'image' | 'video'} type
   * @property {string} source - URL أو لون سداسي
   * @property {string | null} [fileName]
   * @property {import('../features/background-controller/background.state.js').AISuggestionsState} [aiSuggestions]
   */

  /**
   * @typedef {Object} TextStyleState
   * @property {string} fontFamily
   * @property {number} fontSize
   * @property {string} fontColor
   * @property {string} textBgColor
   * @property {string} textAnimation
   */

  /**
   * @typedef {Object} VideoCompositionState
   * @property {string} aspectRatio
   * @property {string} videoFilter
   */

  /**
   * @typedef {Object} ExportSettingsState
   * @property {string} resolution
   * @property {string} format
   * @property {number} fps
   * @property {number} [quality]
   */

  /**
   * @typedef {Object} BackgroundAudioPlayerState // إذا كانت حالة المشغل هنا
   * @property {string | null} fileObjectURL
   * @property {string | null} fileName
   * @property {number} volume
   * @property {boolean} loop
   * @property {boolean} isPlaying
   * @property {number | null} duration
   */

  /**
   * @typedef {Object} ProjectState // هذه هي بنية `currentProject`
   * @property {string | null} id
   * @property {string} title
   * @property {number | null} createdAt
   * @property {number | null} updatedAt
   * @property {QuranSelectionState} quranSelection
   * @property {BackgroundState} background
   * @property {TextStyleState} textStyle
   * @property {VideoCompositionState} videoComposition
   * @property {ExportSettingsState} exportSettings
   * @property {BackgroundAudioPlayerState} [backgroundAudio] // حالة الصوت الخلفي داخل المشروع
   * @property {boolean} [isDirty] - علم اختياري لتغييرات غير محفوظة
   */

  /**
   * @typedef {Object} MainPlaybackState
   * @property {boolean} isPlaying
   * @property {number | null} currentAyahGlobalNumber - رقم الآية العالمية التي يتم تشغيلها أو تجهيزها
   * @property {number} currentTime - الوقت الحالي للآية المشغلة
   * @property {number | null} currentAyahDuration - مدة الآية الصوتية
   * @property {Array<import('../features/audio-engine/main-playback.controller.js').PlaylistItem>} [activePlaylist] // تعكس ما يستخدمه مشغل الآيات
   * @property {number} currentPlaylistIndex
   */

  /**
   * @typedef {Object} UndoRedoState
   * @property {boolean} canUndo
   * @property {boolean} canRedo
   */

  /**
   * @typedef {Object} AppSettings
   * @property {string} preferredLanguage
   * @property {'light' | 'dark'} preferredTheme
   * @property {ExportSettingsState} defaultExportSettings // للProjects الجديدة
   * @property {string} defaultReciterId
   * // ... إعدادات أخرى للمستخدم من app.settings.schema.js
   */

  /**
   * @typedef {Object} AppState // الحالة الكاملة للتطبيق
   * @property {string} currentTheme - السمة النشطة (ليست بالضرورة المفضلة، ولكن ما يتم عرضه)
   * @property {ProjectState | null} currentProject
   * @property {Array<ProjectState>} savedProjects
   * @property {string} activeScreen - 'initial' | 'editor'
   * @property {string | null} activePanelId - معرف اللوحة المفتوحة حاليًا في المحرر
   * @property {boolean} isLoading - مؤشر تحميل عالمي للعمليات الشاملة
   * @property {string | null} loadingMessage - الرسالة المعروضة مع مؤشر التحميل
   * @property {{percentage: number, statusMessage: string} | null} exportProgress
   * @property {MainPlaybackState} mainPlaybackState
   * @property {UndoRedoState} undoRedoState
   * @property {AppSettings} appSettings // إعدادات المستخدم القابلة للتخصيص
   * @property {{ message: string, type: 'error' | 'warning' | 'info', details?: any } | null} globalError - لعرض الأخطاء العامة
   */

  // --- المتغيرات الداخلية ---
  // مسجل الأخطاء سيتم تعيينه لاحقًا عبر setErrorLogger
  let localErrorLoggerRef = console; // القيمة الافتراضية حتى يتم التعيين الصحيح
  
  // المتغير الداخلي لتخزين الحالة
  let state = {
    currentTheme: 'light',
    currentProject: null,
    savedProjects: [],
    activeScreen: 'initial',
    activePanelId: null, // لا توجد لوحة مفتوحة افتراضيًا
    isLoading: false,
    loadingMessage: null,
    exportProgress: null,
    mainPlaybackState: {
      isPlaying: false,
      currentAyahGlobalNumber: null,
      currentTime: 0,
      currentAyahDuration: null,
      activePlaylist: [],
      currentPlaylistIndex: -1,
    },
    undoRedoState: {
      canUndo: false,
      canRedo: false,
    },
    appSettings: {
      preferredLanguage: 'ar',
      preferredTheme: 'light',
      defaultExportSettings: {
        resolution: '1080x1920',
        format: 'mp4',
        fps: 30
      },
      defaultReciterId: 'ar.alafasy'
    },
    globalError: null,
  };
  
  // قائمة المستمعين لتغييرات الحالة
  const listeners = new Set();
  
  // تاريخ التعديلات لدعم Undo/Redo
  const history = [];
  let historyIndex = -1;
  const MAX_HISTORY_LENGTH = 50; // زيادة الحد الأقصى للتاريخ
  
  // --- الوظائف المساعدة ---
  /**
   * إخطار جميع المستمعين بتغيير الحالة
   * @private
   */
  const _notifyListeners = () => {
    try {
      const currentStateForListeners = getState(); // الحصول على نسخة من الحالة الحالية
      
      // إرسال إشعار لكل مستمع
      [...listeners].forEach(listener => {
        try {
          listener(currentStateForListeners);
        } catch (error) {
          // تسجيل الأخطاء في المستمعين
          _handleError({
            error: error instanceof Error ? error : new Error(String(error)),
            message: 'خطأ في وظيفة استماع الحالة',
            origin: 'stateStore._notifyListeners',
            context: { 
              actionType: 'NOTIFY_LISTENER',
              listener: listener.toString().substring(0, 50) + '...' 
            }
          });
        }
      });
    } catch (error) {
      _handleError({
        error: error instanceof Error ? error : new Error(String(error)),
        message: 'فشل في إرسال إشعار للمستمعين',
        origin: 'stateStore._notifyListeners',
        context: { error }
      });
    }
  };
  
  /**
   * إضافة حالة المشروع إلى التاريخ
   * @param {ProjectState} projectStateToSave - الحالة التي سيتم إضافتها
   * @private
   */
  const _addToHistory = (projectStateToSave) => {
    if (!projectStateToSave) return; // لا تُحفظ القيم الفارغة
    
    try {
      // إذا لم يكن المؤشر في نهاية التاريخ، مسح الإصدار القادم
      if (historyIndex < history.length - 1) {
        history.splice(historyIndex + 1);
      }
      
      // تخزين نسخة عميقة من حالة المشروع
      history.push(JSON.parse(JSON.stringify(projectStateToSave)));
      
      // إذا تجاوز التاريخ الحد الأقصى، مسح الأقدم
      if (history.length > MAX_HISTORY_LENGTH) {
        history.shift();
      }
      
      historyIndex = history.length - 1;
      _updateUndoRedoAvailability();
    } catch (error) {
      _handleError({
        error: error instanceof Error ? error : new Error(String(error)),
        message: 'فشل في إضافة الحالة إلى التاريخ',
        origin: 'stateStore._addToHistory',
        context: { projectStateToSave }
      });
    }
  };
  
  /**
   * تحديث إمكانية استخدام وظائف إعادة الخطوات
   * @private
   */
  const _updateUndoRedoAvailability = () => {
    try {
      const canUndo = historyIndex > 0; // هل يمكن العودة إلى الوراء
      const canRedo = historyIndex < history.length - 1; // هل يمكن العودة إلى الأمام
      
      // فقط تحديث الحالة إذا كانت هناك تغييرات
      if (state.undoRedoState.canUndo !== canUndo || state.undoRedoState.canRedo !== canRedo) {
        state = { ...state, undoRedoState: { canUndo, canRedo } };
      }
    } catch (error) {
      _handleError({
        error: error instanceof Error ? error : new Error(String(error)),
        message: 'فشل في تحديث إمكانية استخدام وظائف إعادة الخطوات',
        origin: 'stateStore._updateUndoRedoAvailability',
        context: { historyIndex, historyLength: history.length }
      });
    }
  };
  
  /**
   * مقارنة عميقة بين كائنين
   * @param {any} obj1 - الكائن الأول
   * @param {any} obj2 - الكائن الثاني
   * @returns {boolean} هل الكائنين متماثلين؟
   * @private
   */
  const _deepEqual = (obj1, obj2) => {
    try {
      return JSON.stringify(obj1) === JSON.stringify(obj2);
    } catch (error) {
      _handleError({
        error: error instanceof Error ? error : new Error(String(error)),
        message: 'فشل في المقارنة العميقة',
        origin: 'stateStore._deepEqual',
        context: { obj1, obj2 }
      });
      return false;
    }
  };
  
  /**
   * معالجة الخطأ
   * @param {Object} errorData - بيانات الخطأ
   * @param {Error} errorData.error - كائن الخطأ
   * @param {string} errorData.message - الرسالة
   * @param {string} errorData.origin - مصدر الخطأ
   * @param {Object} [errorData.context] - السياق
   * @private
   */
  const _handleError = ({ error, message, origin, context = {} }) => {
    try {
      const finalError = error instanceof Error ? error : new Error(message);
      
      if (localErrorLoggerRef && typeof localErrorLoggerRef.handleError === 'function') {
        localErrorLoggerRef.handleError({
          error: finalError,
          message,
          origin,
          severity: 'error',
          context
        });
      } else if (localErrorLoggerRef && typeof localErrorLoggerRef.error === 'function') {
        localErrorLoggerRef.error({
          error: finalError,
          message,
          origin,
          context
        });
      } else {
        console.error(`[ERROR] ${origin}: ${message}`, context);
      }
    } catch (fallbackError) {
      console.error('[FATAL] Failed to handle error:', fallbackError);
      console.error('Original error:', error, 'Message:', message, 'Origin:', origin, 'Context:', context);
    }
  };
  
  /**
   * تسجيل تحذير
   * @param {Object} warningData - بيانات التحذير
   * @param {string} warningData.message - الرسالة
   * @param {string} warningData.origin - مصدر التحذير
   * @param {Object} [warningData.context] - السياق
   * @private
   */
  const _handleWarning = ({ message, origin, context = {} }) => {
    try {
      if (localErrorLoggerRef && typeof localErrorLoggerRef.logWarning === 'function') {
        localErrorLoggerRef.logWarning({
          message,
          origin,
          context
        });
      } else if (localErrorLoggerRef && typeof localErrorLoggerRef.warn === 'function') {
        localErrorLoggerRef.warn({
          message,
          origin,
          context
        });
      } else {
        console.warn(`[WARNING] ${origin}: ${message}`, context);
      }
    } catch (error) {
      console.warn(`[WARNING] Failed to log warning from ${origin}: ${message}`);
    }
  };
  
  /**
   * تسجيل معلومات تفصيلية
   * @param {string} message - الرسالة
   * @private
   */
  const _logDebug = (message) => {
    if (typeof localErrorLoggerRef.debug === 'function') {
      localErrorLoggerRef.debug(message);
    } else if (typeof localErrorLoggerRef.log === 'function') {
      localErrorLoggerRef.log(message);
    } else if (console.debug) {
      console.debug(message);
    }
  };
  
  /**
   * تسجيل معلومات عادية
   * @param {string} message - الرسالة
   * @private
   */
  const _logInfo = (message) => {
    if (typeof localErrorLoggerRef.info === 'function') {
      localErrorLoggerRef.info(message);
    } else if (typeof localErrorLoggerRef.log === 'function') {
      localErrorLoggerRef.log(message);
    } else if (console.info) {
      console.info(message);
    } else {
      console.log(message);
    }
  };

  // --- الواجهة العامة ---
  /**
   * الحصول على الحالة الحالية
   * @returns {AppState} الحالة الحالية للتطبيق
   */
  const getState = () => {
    try {
      // إرجاع نسخة سطحية من الحالة
      return { ...state };
    } catch (error) {
      _handleError({
        error: error instanceof Error ? error : new Error(String(error)),
        message: 'فشل في الحصول على الحالة',
        origin: 'stateStore.getState'
      });
      return null;
    }
  };

  /**
   * الاشتراك في تغييرات الحالة
   * @param {Function} listener - وظيفة الاستماع للتغييرات
   * @returns {Function} وظيفة لإلغاء الاشتراك
   */
  const subscribe = (listener) => {
    try {
      if (typeof listener !== 'function') {
        throw new Error('الاستماع يجب أن يكون وظيفة');
      }
      
      listeners.add(listener);
      
      // إرجاع وظيفة لإلغاء الاشتراك
      return () => listeners.delete(listener);
    } catch (error) {
      _handleError({
        error: error instanceof Error ? error : new Error(String(error)),
        message: 'فشل في الاشتراك في تغييرات الحالة',
        origin: 'stateStore.subscribe'
      });
      return () => {};
    }
  };

  /**
   * إرسال حدث لتحديث الحالة
   * @param {string} actionType - نوع الحدث
   * @param {*} payload - البيانات المرسلة مع الحدث
   * @param {Object} [options={}] - خيارات الحدث
   * @param {boolean} [options.skipHistory=false] - تجاوز إضافة الحدث إلى التاريخ
   * @returns {void}
   */
  const dispatch = (actionType, payload, options = {}) => {
    const oldFullState = JSON.parse(JSON.stringify(state));
    let stateChangedOverall = false;
    
    try {
      // الحصول على أحداث التطبيق
      const _ACTIONS = (typeof window !== 'undefined' && window.ACTIONS) || 
                        (typeof ACTIONS !== 'undefined' ? ACTIONS : {});
      
      // حفظ حالة المشروع قبل التحديث
      let projectStateForHistory = oldFullState.currentProject;
      
      // --- معالجة الأحداث ---
      switch (actionType) {
        // إدارة التحميل
        case _ACTIONS.SET_APP_LOADING:
          if (typeof payload === 'boolean' && state.isLoading !== payload) {
            state = { 
              ...state, 
              isLoading: payload, 
              loadingMessage: payload ? (options.message || null) : null 
            };
            stateChangedOverall = true;
          }
          break;
          
        // إدارة الأخطاء
        case _ACTIONS.SET_APP_ERROR:
          state = { ...state, globalError: payload };
          stateChangedOverall = true;
          break;
          
        // تحديث إعدادات التطبيق
        case _ACTIONS.SET_APP_SETTINGS:
          if (payload && typeof payload === 'object') {
            state = { 
              ...state, 
              appSettings: { ...state.appSettings, ...payload }
            };
            
            // تغييرات جانبية عند تغيير السمة أو اللغة
            if (payload.preferredTheme && state.currentTheme !== payload.preferredTheme) {
              state.currentTheme = payload.preferredTheme;
            }
            
            if (payload.preferredLanguage && 
                state.appSettings.preferredLanguage !== payload.preferredLanguage) {
              // هذا سيؤدي إلى تحديث اللغة في خدمة الترجمة
            }
            
            stateChangedOverall = true;
          }
          break;
          
        // تغيير السمة
        case _ACTIONS.SET_THEME:
          if (typeof payload === 'string' && state.currentTheme !== payload) {
            state = { 
              ...state, 
              currentTheme: payload, 
              appSettings: { ...state.appSettings, preferredTheme: payload } 
            };
            stateChangedOverall = true;
          }
          break;
          
        // تغيير الشاشة النشطة
        case _ACTIONS.SET_ACTIVE_SCREEN:
          if (typeof payload === 'string' && state.activeScreen !== payload) {
            state = { 
              ...state, 
              activeScreen: payload, 
              activePanelId: null 
            };
            stateChangedOverall = true;
          }
          break;
          
        // تعيين اللوحة النشطة
        case 'SET_ACTIVE_PANEL_ID':
          if ((payload === null || typeof payload === 'string') && state.activePanelId !== payload) {
            state = { ...state, activePanelId: payload };
            stateChangedOverall = true;
          }
          break;
          
        // تحميل مشروع
        case _ACTIONS.LOAD_PROJECT:
          state = { 
            ...state, 
            currentProject: payload, 
            activeScreen: payload ? 'editor' : 'initial', 
            activePanelId: payload ? 'quran-selection-panel' : null 
          };
          
          // إعادة تعيين التاريخ
          history.length = 0;
          historyIndex = -1;
          
          if (payload) {
            history.push(JSON.parse(JSON.stringify(payload)));
            historyIndex = 0;
          }
          
          _updateUndoRedoAvailability();
          stateChangedOverall = true;
          break;
          
        // إنشاء مشروع جديد
        case _ACTIONS.CREATE_NEW_PROJECT_AND_NAVIGATE:
          const _defaultProjectCreator = (typeof window !== 'undefined' && window.createNewProjectObject) ||
                                    (typeof createNewProjectObject !== 'undefined' ? createNewProjectObject : (overrides) => ({
                                      ..._DEFAULT_PROJECT_SCHEMA, 
                                      id: _generateId(), 
                                      title: 'مشروع جديد', 
                                      createdAt: Date.now(), 
                                      updatedAt: Date.now(), 
                                      ...overrides
                                    }));
          
          const newProjectInstance = _defaultProjectCreator({
            title: state.appSettings?.newProjectDefaultTitle || 'مشروع جديد'
          });
          
          // تعيين المشروع الجديد
          state = { 
            ...state, 
            currentProject: newProjectInstance, 
            activeScreen: 'editor', 
            activePanelId: 'quran-selection-panel' 
          };
          
          // إعادة تعيين التاريخ
          history.length = 0;
          history.push(JSON.parse(JSON.stringify(newProjectInstance)));
          historyIndex = 0;
          
          _updateUndoRedoAvailability();
          stateChangedOverall = true;
          break;
          
        // تحديث إعدادات المشروع
        case _ACTIONS.UPDATE_PROJECT_SETTINGS:
          if (state.currentProject && typeof payload === 'object' && payload !== null) {
            projectStateForHistory = JSON.parse(JSON.stringify(state.currentProject));
            let updatedProject = { ...state.currentProject };
            
            // دمج عميق للهياكل المتداخلة
            for (const key in payload) {
              if (Object.prototype.hasOwnProperty.call(payload, key)) {
                if (payload[key] !== null && 
                    typeof payload[key] === 'object' && 
                    !Array.isArray(payload[key]) && 
                    state.currentProject[key] !== null && 
                    typeof state.currentProject[key] === 'object') {
                  updatedProject[key] = { ...state.currentProject[key], ...payload[key] };
                } else {
                  updatedProject[key] = payload[key];
                }
              }
            }
            
            // تحديث وقت التحديث
            updatedProject.updatedAt = Date.now();
            
            // تحديث المشروع في الحالة
            state = { ...state, currentProject: updatedProject };
            stateChangedOverall = true;
          }
          break;
          
        // تعيين عنوان المشروع
        case _ACTIONS.SET_PROJECT_TITLE:
          if (state.currentProject && typeof payload === 'string' && state.currentProject.title !== payload) {
            projectStateForHistory = JSON.parse(JSON.stringify(state.currentProject));
            state = {
              ...state, 
              currentProject: {
                ...state.currentProject, 
                title: payload, 
                updatedAt: Date.now()
              }
            };
            stateChangedOverall = true;
          }
          break;
          
        // تحديث قائمة المشاريع المحفوظة
        case _ACTIONS.UPDATE_SAVED_PROJECTS_LIST:
          if (Array.isArray(payload)) {
            state = { 
              ...state, 
              savedProjects: payload.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
            };
            stateChangedOverall = true;
          }
          break;
          
        // تحديث حالة التشغيل
        case _ACTIONS.SET_MAIN_PLAYBACK_STATE:
          if (payload && typeof payload === 'object') {
            state = { ...state, mainPlaybackState: { ...state.mainPlaybackState, ...payload }};
            stateChangedOverall = true;
          }
          break;
          
        // تحديث تقدم التصدير
        case _ACTIONS.SET_EXPORT_PROGRESS:
          state = { ...state, exportProgress: payload };
          stateChangedOverall = true;
          break;
          
        // العودة إلى الخلف
        case _ACTIONS.UNDO_STATE:
          if (historyIndex > 0) {
            historyIndex--;
            state = { 
              ...state, 
              currentProject: JSON.parse(JSON.stringify(history[historyIndex])) 
            };
            _updateUndoRedoAvailability();
            stateChangedOverall = true;
            options.skipHistory = true; // لا تُضاف العودة إلى التاريخ
          }
          break;
          
        // العودة إلى الأمام
        case _ACTIONS.REDO_STATE:
          if (historyIndex < history.length - 1) {
            historyIndex++;
            state = { 
              ...state, 
              currentProject: JSON.parse(JSON.stringify(history[historyIndex])) 
            };
            _updateUndoRedoAvailability();
            stateChangedOverall = true;
            options.skipHistory = true; // لا تُضاف العودة إلى التاريخ
          }
          break;
          
        // مسح التاريخ
        case _ACTIONS.CLEAR_HISTORY:
          history.length = 0;
          historyIndex = state.currentProject ? 0 : -1;
          
          if (state.currentProject) {
            history.push(JSON.parse(JSON.stringify(state.currentProject)));
          }
          
          _updateUndoRedoAvailability();
          stateChangedOverall = true;
          options.skipHistory = true;
          break;
          
        // حالة غير معروفة
        default:
          _handleWarning({
            message: `الحدث غير معروف في stateStore: ${actionType}`,
            origin: 'stateStore.dispatch',
            context: { actionType, payload }
          });
          return; // لا تغيير
      }
      
      // إذا تغيرت الحالة
      if (stateChangedOverall) {
        // إضافة إلى التاريخ إذا لزم الأمر
        if (state.currentProject && !options.skipHistory && 
            projectStateForHistory && state.currentProject && 
            !(_deepEqual(projectStateForHistory, state.currentProject))) {
          _addToHistory(projectStateForHistory);
        }
        
        _updateUndoRedoAvailability(); // إعادة حساب إمكانية العودة
        _notifyListeners(); // إرسال إشعار بالتغيير
      }
    } catch (error) {
      _handleError({
        error: error instanceof Error ? error : new Error(String(error)),
        message: `فشل في تحديث الحالة (${actionType}): ${error.message}`,
        origin: 'stateStore.dispatch',
        context: { actionType, payload, oldState: oldFullState }
      });
      
      // العودة إلى الحالة السابقة في حالة وجود خطأ
      state = oldFullState;
      _notifyListeners(); // إرسال إشعار بالحالة المعادة
    }
  };
  
  /**
   * تهيئة مخزن الحالة
   * @param {AppSettings} persistedAppSettings - إعدادات التطبيق المحفوظة
   * @param {Array<ProjectState>} persistedSavedProjects - المشاريع المحفوظة
   */
  const initializeWithState = (persistedAppSettings, persistedSavedProjects) => {
    try {
      const initialSettings = {
        ..._DEFAULT_APP_SETTINGS,
        ...(persistedAppSettings || {})
      };
      
      // تحديث الحالة
      state = {
        ...state,
        appSettings: initialSettings,
        currentTheme: initialSettings.preferredTheme || state.appSettings.preferredTheme,
        savedProjects: Array.isArray(persistedSavedProjects) ? 
                      persistedSavedProjects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)) : 
                      []
      };
      
      // إضافة حالة ابتدائية إلى التاريخ
      _addToHistory(null);
      
      _notifyListeners(); // إرسال إشعار
    } catch (error) {
      _handleError({
        error: error instanceof Error ? error : new Error(String(error)),
        message: 'فشل في تهيئة الحالة',
        origin: 'stateStore.initializeWithState'
      });
    }
  };
  
  /**
   * تعيين مسجل الأخطاء
   * @param {Object} logger - مسجل الأخطاء
   */
  const setErrorLogger = (logger) => {
    try {
      if (logger && typeof logger.handleError === 'function') {
        localErrorLoggerRef = logger;
      } else {
        _handleWarning({
          message: 'مسجل الأخطاء غير صالح تم تمريره إلى setErrorLogger',
          origin: 'stateStore.setErrorLogger'
        });
      }
    } catch (error) {
      _handleError({
        error: error instanceof Error ? error : new Error(String(error)),
        message: 'فشل في تعيين مسجل الأخطاء',
        origin: 'stateStore.setErrorLogger'
      });
    }
  };
  
  /**
   * إنشاء معرف فريد
   * @returns {string} معرف فريد
   * @private
   */
  const _generateId = () => {
    return 'project-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  };

  // --- إرجاع الواجهة ---
  return {
    getState,
    subscribe,
    dispatch,
    initializeWithState,
    setErrorLogger,
    // وظائف تجريبية للتصحيح
    _getHistory: () => [...history],
    _getHistoryIndex: () => historyIndex,
    _getHistorySize: () => history.length,
    _getHistoryEntry: (index) => index >= 0 && index < history.length ? JSON.parse(JSON.stringify(history[index])) : null,
    _canUndo: () => historyIndex > 0,
    _canRedo: () => historyIndex < history.length - 1
  };
})();

export default stateStore;
