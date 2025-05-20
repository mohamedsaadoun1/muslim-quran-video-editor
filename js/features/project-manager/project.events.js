// js/features/project-manager/project.events.js

/**
 * @file وحدة تحدد الأحداث المتعلقة بإدارة المشاريع
 * @description هذا الملف يحتوي على قائمة شاملة بالأحداث المستخدمة في النظام لإدارة حالة المشاريع
 *              مثل إنشاء المشروع، حفظه، حذفه، أو تحميله.
 *              الأحداث تُستخدم من قبل eventAggregator لربط الوحدات المختلفة في النظام.
 */

export const PROJECT_EVENTS = {
  // أحداث إنشاء المشروع
  PROJECT_CREATED: 'project.created',
  PROJECT_CREATED_SUCCESS: 'project.created.success',
  PROJECT_CREATED_FAILED: 'project.created.failed',
  
  // أحداث تحميل المشروع
  PROJECT_LOADED: 'project.loaded',
  PROJECT_LOADED_FROM_STORAGE: 'project.loaded.fromStorage',
  PROJECT_LOADED_DEFAULT: 'project.loaded.default',
  PROJECT_LOADED_EMPTY: 'project.loaded.empty',
  PROJECT_LOADED_ERROR: 'project.loaded.error',
  
  // أحداث حفظ المشروع
  PROJECT_SAVED: 'project.saved',
  PROJECT_SAVED_SUCCESS: 'project.saved.success',
  PROJECT_SAVED_FAILED: 'project.saved.failed',
  PROJECT_SAVED_AUTOMATIC: 'project.saved.automatic',
  PROJECT_SAVED_MANUAL: 'project.saved.manual',
  
  // أحداث حذف المشروع
  PROJECT_DELETED: 'project.deleted',
  PROJECT_DELETED_SUCCESS: 'project.deleted.success',
  PROJECT_DELETED_FAILED: 'project.deleted.failed',
  
  // أحداث تحديث المشروع
  PROJECT_UPDATED: 'project.updated',
  PROJECT_UPDATED_SETTINGS: 'project.updated.settings',
  PROJECT_UPDATED_QURAN_SELECTION: 'project.updated.quran.selection',
  PROJECT_UPDATED_TEXT_STYLE: 'project.updated.text.style',
  PROJECT_UPDATED_BACKGROUND: 'project.updated.background',
  PROJECT_UPDATED_VIDEO_COMPOSITION: 'project.updated.video.composition',
  PROJECT_UPDATED_EXPORT_SETTINGS: 'project.updated.export.settings',
  
  // أحداث التنقل بين الشاشات
  NAVIGATE_TO_EDITOR: 'navigate.to.editor',
  NAVIGATE_TO_EDITOR_NEW_PROJECT: 'navigate.to.editor.newProject',
  NAVIGATE_TO_PROJECT_LIST: 'navigate.to.projectList',
  NAVIGATE_TO_EXPORT: 'navigate.to.export',
  NAVIGATE_TO_SETTINGS: 'navigate.to.settings',
  
  // أحداث طلب الإجراءات
  REQUEST_PROJECT_SAVE: 'request.project.save',
  REQUEST_PROJECT_DELETE: 'request.project.delete',
  REQUEST_PROJECT_DUPLICATE: 'request.project.duplicate',
  REQUEST_PROJECT_SHARE: 'request.project.share',
  
  // أحداث تفاعل المستخدم
  PROJECT_INTERACTION: 'project.interaction',
  PROJECT_INTERACTION_CLICK: 'project.interaction.click',
  PROJECT_INTERACTION_KEYBOARD: 'project.interaction.keyboard',
  PROJECT_INTERACTION_DRAG: 'project.interaction.drag',
  PROJECT_INTERACTION_DROP: 'project.interaction.drop',
  
  // أحداث تغيير الحالة
  PROJECT_STATE_CHANGED: 'project.state.changed',
  PROJECT_ACTIVE_SCREEN_CHANGED: 'project.activeScreen.changed',
  PROJECT_SELECTION_CHANGED: 'project.selection.changed',
  PROJECT_BACKGROUND_CHANGED: 'project.background.changed',
  PROJECT_TEXT_STYLE_CHANGED: 'project.textStyle.changed',
  PROJECT_VIDEO_COMPOSITION_CHANGED: 'project.videoComposition.changed',
  PROJECT_EXPORT_SETTINGS_CHANGED: 'project.exportSettings.changed',
  
  // أحداث مزامنة البيانات
  PROJECT_DATA_SYNC_STARTED: 'project.data.sync.started',
  PROJECT_DATA_SYNC_PROGRESS: 'project.data.sync.progress',
  PROJECT_DATA_SYNC_COMPLETED: 'project.data.sync.completed',
  PROJECT_DATA_SYNC_FAILED: 'project.data.sync.failed',
  
  // أحداث المزامنة مع التخزين المحلي
  LOCAL_STORAGE_PROJECT_SAVE_STARTED: 'localStorage.project.save.started',
  LOCAL_STORAGE_PROJECT_SAVE_COMPLETED: 'localStorage.project.save.completed',
  LOCAL_STORAGE_PROJECT_SAVE_FAILED: 'localStorage.project.save.failed',
  LOCAL_STORAGE_PROJECT_DELETE_STARTED: 'localStorage.project.delete.started',
  LOCAL_STORAGE_PROJECT_DELETE_COMPLETED: 'localStorage.project.delete.completed',
  LOCAL_STORAGE_PROJECT_DELETE_FAILED: 'localStorage.project.delete.failed',
  LOCAL_STORAGE_PROJECTS_LOADED: 'localStorage.projects.loaded',
  LOCAL_STORAGE_PROJECTS_LOAD_FAILED: 'localStorage.projects.load.failed',
  
  // أحداث البحث الصوتي (في حال التكامل مع quran-voice-input.handler.js)
  VOICE_SEARCH_PROJECT_STARTED: 'voiceSearch.project.started',
  VOICE_SEARCH_PROJECT_MATCH: 'voiceSearch.project.match',
  VOICE_SEARCH_PROJECT_NO_MATCH: 'voiceSearch.project.noMatch',
  VOICE_SEARCH_PROJECT_ERROR: 'voiceSearch.project.error',
  
  // أحداث تفاعل المستخدم مع القائمة
  PROJECT_LIST_RENDERED: 'project.list.rendered',
  PROJECT_LIST_EMPTY: 'project.list.empty',
  PROJECT_LIST_LOADING: 'project.list.loading',
  PROJECT_LIST_LOAD_FAILED: 'project.list.loadFailed',
  
  // أحداث تفاعل المستخدم مع البطاقات
  PROJECT_CARD_CLICKED: 'project.card.clicked',
  PROJECT_CARD_DELETED: 'project.card.deleted',
  PROJECT_CARD_DUPLICATED: 'project.card.duplicated',
  PROJECT_CARD_SHARED: 'project.card.shared',
  PROJECT_CARD_EDIT_TITLE: 'project.card.edit.title',
  PROJECT_CARD_EDIT_DESCRIPTION: 'project.card.edit.description',
  
  // أحداث تفاعل المستخدم مع الإشعارات
  PROJECT_NOTIFICATION_SHOW: 'project.notification.show',
  PROJECT_NOTIFICATION_HIDE: 'project.notification.hide',
  PROJECT_NOTIFICATION_DISMISSED: 'project.notification.dismissed',
  PROJECT_NOTIFICATION_ACTION: 'project.notification.action',
  
  // أحداث تفاعل المستخدم مع النوافذ المنبثقة
  MODAL_PROJECT_SHOW: 'modal.project.show',
  MODAL_PROJECT_HIDE: 'modal.project.hide',
  MODAL_PROJECT_CONFIRM: 'modal.project.confirm',
  MODAL_PROJECT_CANCEL: 'modal.project.cancel',
  MODAL_PROJECT_DELETE_CONFIRM: 'modal.project.delete.confirm',
  MODAL_PROJECT_DUPLICATE_CONFIRM: 'modal.project.duplicate.confirm',
  
  // أحداث تفاعل المستخدم مع شاشة المحرر
  EDITOR_SCREEN_OPENED: 'editor.screen.opened',
  EDITOR_SCREEN_CLOSED: 'editor.screen.closed',
  EDITOR_SCREEN_SAVED: 'editor.screen.saved',
  EDITOR_SCREEN_CANCELLED: 'editor.screen.cancelled',
  EDITOR_SCREEN_RESET: 'editor.screen.reset',
  EDITOR_SCREEN_PREVIEW: 'editor.screen.preview',
  EDITOR_SCREEN_EXPORT: 'editor.screen.export',
  
  // أحداث تفاعل المستخدم مع شاشة التصدير
  EXPORT_SCREEN_OPENED: 'export.screen.opened',
  EXPORT_SCREEN_CLOSED: 'export.screen.closed',
  EXPORT_SCREEN_START: 'export.screen.start',
  EXPORT_SCREEN_PROGRESS: 'export.screen.progress',
  EXPORT_SCREEN_COMPLETED: 'export.screen.completed',
  EXPORT_SCREEN_FAILED: 'export.screen.failed',
  EXPORT_SCREEN_CANCELLED: 'export.screen.cancelled',
  
  // أحداث تفاعل المستخدم مع شاشة الإعدادات
  SETTINGS_SCREEN_OPENED: 'settings.screen.opened',
  SETTINGS_SCREEN_CLOSED: 'settings.screen.closed',
  SETTINGS_SCREEN_UPDATED: 'settings.screen.updated',
  SETTINGS_SCREEN_RESET: 'settings.screen.reset',
  SETTINGS_SCREEN_APPLIED: 'settings.screen.applied'
};

/**
 * أحداث إضافية لدعم التفاعل الديناميكي
 * @type {Object<string, string>}
 */
export const DYNAMIC_PROJECT_EVENTS = {
  PROJECT_UPDATED_FIELD: (field) => `project.updated.${field}`,
  PROJECT_SAVED_FIELD: (field) => `project.saved.${field}`,
  PROJECT_DELETED_FIELD: (field) => `project.deleted.${field}`
};

/**
 * دمج الأحداث الأساسية مع الأحداث الديناميكية
 * @param {string} field - الحقل الذي تم تحديثه
 * @returns {Object<string, string>} - الأحداث المدمجة
 */
export function getProjectEvents(field) {
  if (!field || typeof field !== 'string') {
    return {
      ...PROJECT_EVENTS
    };
  }
  
  return {
    ...PROJECT_EVENTS,
    PROJECT_UPDATED_FIELD: `project.updated.${field}`,
    PROJECT_SAVED_FIELD: `project.saved.${field}`,
    PROJECT_DELETED_FIELD: `project.deleted.${field}`
  };
}

/**
 * التحقق من صحة الحدث
 * @param {string} event - الحدث المراد التحقق منه
 * @returns {boolean} هل الحدث موجود؟
 */
export function validateProjectEvent(event) {
  return Object.values(PROJECT_EVENTS).includes(event) || 
         Object.values(DYNAMIC_PROJECT_EVENTS).some(e => typeof e === 'function' ? e('test') === event : e === event);
}

/**
 * إنشاء حدث ديناميكي
 * @param {string} baseEvent - الحدث الأساسي
 * @param {string} suffix - اللاحقة
 * @returns {string} - الحدث الديناميكي
 */
export function createDynamicProjectEvent(baseEvent, suffix) {
  if (!baseEvent || !suffix) return null;
  
  if (!Object.values(PROJECT_EVENTS).includes(baseEvent)) {
    console.warn('الحدث الأساسي غير موجود:', baseEvent);
    return null;
  }
  
  return `${baseEvent}.${suffix}`;
}

/**
 * إرسال حدث
 * @param {string} event - الحدث المراد إرساله
 * @param {Object} [payload] - البيانات المرفقة مع الحدث
 */
export function dispatchProjectEvent(event, payload = {}) {
  if (!validateProjectEvent(event)) {
    console.warn('الحدث غير معتمد:', event);
    return false;
  }
  
  try {
    // استخدام eventAggregator لنقل الحدث
    const aggregator = window.eventAggregator || window.dependencies?.eventAggregator;
    
    if (!aggregator || typeof aggregator.publish !== 'function') {
      console.warn('eventAggregator غير متوفر. لا يمكن إرسال الحدث:', event);
      return false;
    }
    
    aggregator.publish(event, payload);
    return true;
  } catch (error) {
    console.error('فشل في إرسال الحدث:', event, error);
    return false;
  }
}

/**
 * الاشتراك في حدث معين
 * @param {string} event - الحدث المراد الاشتراك فيه
 * @param {Function} callback - الوظيفة التي سيتم استدعاؤها عند حدوث الحدث
 * @returns {Object} - كائن يحتوي على وظيفة إلغاء الاشتراك
 */
export function subscribeToProjectEvent(event, callback) {
  if (!validateProjectEvent(event)) {
    console.warn('الحدث غير معتمد:', event);
    return { unsubscribe: () => false };
  }
  
  try {
    const aggregator = window.eventAggregator || window.dependencies?.eventAggregator;
    
    if (!aggregator || typeof aggregator.subscribe !== 'function') {
      console.warn('eventAggregator غير متوفر. لا يمكن الاشتراك في الحدث:', event);
      return { unsubscribe: () => false };
    }
    
    const subscription = aggregator.subscribe(event, callback);
    return subscription;
  } catch (error) {
    console.error('فشل في الاشتراك في الحدث:', event, error);
    return { unsubscribe: () => false };
  }
}

/**
 * إلغاء الاشتراك في حدث معين
 * @param {string} event - الحدث المراد إلغاء الاشتراك فيه
 * @param {Function} callback - الوظيفة التي سيتم إلغاء الاشتراك بها
 * @returns {boolean} هل تم إلغاء الاشتراك؟
 */
export function unsubscribeFromProjectEvent(event, callback) {
  if (!validateProjectEvent(event)) {
    console.warn('الحدث غير معتمد:', event);
    return false;
  }
  
  try {
    const aggregator = window.eventAggregator || window.dependencies?.eventAggregator;
    
    if (!aggregator || typeof aggregator.unsubscribe !== 'function') {
      console.warn('eventAggregator غير متوفر. لا يمكن إلغاء الاشتراك في الحدث:', event);
      return false;
    }
    
    return aggregator.unsubscribe(event, callback);
  } catch (error) {
    console.error('فشل في إلغاء الاشتراك في الحدث:', event, error);
    return false;
  }
}

/**
 * إرسال حدث مشروع جديد
 * @param {string} event - الحدث المراد إرساله
 * @param {Object} [payload] - البيانات المرفقة مع الحدث
 * @param {Function} [dispatchFn] - وظيفة إرسال الحدث
 * @returns {boolean} هل تم إرسال الحدث؟
 */
export function sendProjectEvent(event, payload = {}, dispatchFn = dispatchProjectEvent) {
  if (!event || typeof event !== 'string') {
    console.warn('اسم الحدث غير صحيح');
    return false;
  }
  
  try {
    // التحقق من صحة الحدث
    if (!validateProjectEvent(event)) {
      console.warn('الحدث غير معتمد:', event);
      return false;
    }
    
    // إرسال الحدث عبر وظيفة التوصيل
    return dispatchFn(event, payload);
  } catch (error) {
    console.error('فشل في إرسال الحدث:', event, error);
    return false;
  }
}

/**
 * التحقق من صحة الحدث الديناميكي
 * @param {string} baseEvent - الحدث الأساسي
 * @param {string} suffix - اللاحقة
 * @returns {string | null} - الحدث الديناميكي أو null إذا لم يكن صالحًا
 */
export function getDynamicEvent(baseEvent, suffix) {
  const dynamicEvent = createDynamicProjectEvent(baseEvent, suffix);
  
  if (!dynamicEvent) {
    console.warn('فشل في إنشاء الحدث الديناميكي');
    return null;
  }
  
  return dynamicEvent;
}

// تصدير الأحداث كأحداث ثابتة
export default {
  ...PROJECT_EVENTS,
  DYNAMIC_PROJECT_EVENTS: DYNAMIC_PROJECT_EVENTS,
  getProjectEvents,
  validateProjectEvent,
  dispatchProjectEvent,
  subscribeToProjectEvent,
  unsubscribeFromProjectEvent,
  sendProjectEvent,
  getDynamicEvent
};
