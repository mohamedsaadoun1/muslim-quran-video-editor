// js/services/local-storage.adapter.js

/**
 * @typedef {'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'undefined' | 'unknown'} StorageItemType
 * أنواع البيانات الممكنة في localStorage
 */

/**
 * @typedef {Object} StorageItemMetadata
 * @property {string} key - اسم العنصر
 * @property {StorageItemType} type - نوع العنصر
 * @property {number} size - حجم العنصر بالبايت
 * @property {number} timestamp - وقت إنشاء أو تحديث العنصر
 */

/**
 * مكتبة المساعدات للتعامل مع localStorage
 * @type {{}}
 */
const localStorageAdapter = {
  /**
   * التحقق من توفر localStorage
   * @returns {boolean} true إذا كان متاحًا
   */
  isAvailable() {
    try {
      const testKey = '__localStorageTest__';
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(testKey, testKey);
        localStorage.removeItem(testKey);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  /**
   * الحصول على عنصر من localStorage
   * @param {string} key - مفتاح العنصر
   * @param {*} [defaultValue=null] - القيمة الافتراضية في حالة عدم وجود العنصر
   * @returns {*} العنصر أو القيمة الافتراضية
   */
  getItem(key, defaultValue = null) {
    if (!this.isAvailable()) {
      console.warn(`[LocalStorageAdapter] localStorage غير متاح. لا يمكن الحصول على العنصر: "${key}".`);
      return defaultValue;
    }

    try {
      const itemString = localStorage.getItem(key);
      
      if (itemString === null) {
        return defaultValue;
      }

      try {
        return JSON.parse(itemString);
      } catch (e) {
        return itemString;
      }
    } catch (error) {
      console.error(`[LocalStorageAdapter] خطأ في استرجاع العنصر "${key}" من localStorage:`, error);
      return defaultValue;
    }
  },

  /**
   * تخزين عنصر في localStorage
   * @param {string} key - مفتاح العنصر
   * @param {*} value - القيمة المراد تخزينها
   * @returns {boolean} true إذا تم التخزين بنجاح
   */
  setItem(key, value) {
    if (!this.isAvailable()) {
      console.warn(`[LocalStorageAdapter] localStorage غير متاح. لا يمكن تخزين العنصر: "${key}".`);
      return false;
    }

    try {
      if (value === undefined) {
        this.removeItem(key);
        return true;
      }

      const stringifiedValue = JSON.stringify(value);
      localStorage.setItem(key, stringifiedValue);
      return true;
    } catch (error) {
      console.error(`[LocalStorageAdapter] خطأ في تخزين العنصر "${key}" في localStorage:`, error);
      return false;
    }
  },

  /**
   * إزالة عنصر من localStorage
   * @param {string} key - مفتاح العنصر
   * @returns {boolean} true إذا تمت الإزالة بنجاح
   */
  removeItem(key) {
    if (!this.isAvailable()) {
      console.warn(`[LocalStorageAdapter] localStorage غير متاح. لا يمكن إزالة العنصر: "${key}".`);
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`[LocalStorageAdapter] خطأ في إزالة العنصر "${key}" من localStorage:`, error);
      return false;
    }
  },

  /**
   * مسح كل العناصر من localStorage
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  clearAll() {
    if (!this.isAvailable()) {
      console.warn('[LocalStorageAdapter] localStorage غير متاح. لا يمكن مسح العناصر.');
      return false;
    }

    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('[LocalStorageAdapter] خطأ في مسح localStorage:', error);
      return false;
    }
  },

  /**
   * الحصول على جميع المفاتيح التي تحتوي على بادئة معينة
   * @param {string} prefix - البادئة المراد البحث عنها
   * @returns {Array<string>} قائمة المفاتيح التي تحتوي على البادئة
   */
  getKeysWithPrefix(prefix) {
    if (!this.isAvailable() || typeof prefix !== 'string') {
      return [];
    }

    try {
      return Object.keys(localStorage).filter(key => key.startsWith(prefix));
    } catch (error) {
      console.error(`[LocalStorageAdapter] خطأ في الحصول على المفاتيح التي تبدأ بـ "${prefix}":`, error);
      return [];
    }
  },

  /**
   * مسح العناصر الخاصة بالتطبيق فقط
   * @param {string} appPrefix - بادئة التطبيق
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  clearAppSpecificItems(appPrefix) {
    if (!this.isAvailable() || !appPrefix) {
      return false;
    }

    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(appPrefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('[LocalStorageAdapter] خطأ في مسح عناصر التطبيق من localStorage:', error);
      return false;
    }
  },

  /**
   * تخزين عدة عناصر دفعة واحدة
   * @param {Object} items - كائن يحتوي على العناصر المراد تخزينها { key: value }
   * @returns {Object<string, boolean>} نتائج تخزين كل عنصر
   */
  batchSetItems(items) {
    if (!this.isAvailable() || typeof items !== 'object' || items === null) {
      return {};
    }

    const results = {};
    
    for (const key in items) {
      if (items.hasOwnProperty(key)) {
        results[key] = this.setItem(key, items[key]);
      }
    }
    
    return results;
  },

  /**
   * الحصول على عدة عناصر دفعة واحدة
   * @param {Array<string>} keys - قائمة المفاتيح المراد الحصول عليها
   * @param {*} [defaultValue=null] - القيمة الافتراضية
   * @returns {Object<string, *>} كائن يحتوي على النتائج
   */
  batchGetItems(keys, defaultValue = null) {
    if (!this.isAvailable() || !Array.isArray(keys)) {
      return {};
    }

    const results = {};
    
    for (const key of keys) {
      results[key] = this.getItem(key, defaultValue);
    }
    
    return results;
  },

  /**
   * الحصول على نوع العنصر المخزن
   * @param {string} key - مفتاح العنصر
   * @returns {StorageItemType} نوع العنصر
   */
  getItemType(key) {
    const value = this.getItem(key);
    
    if (value === null) {
      return 'null';
    }
    
    if (Array.isArray(value)) {
      return 'array';
    }
    
    switch (typeof value) {
      case 'string':
        return 'string';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'object':
        return 'object';
      case 'undefined':
        return 'undefined';
      default:
        return 'unknown';
    }
  },

  /**
   * التحقق من خطأ امتلاء مساحة التخزين
   * @param {*} error - الكائن الخاص بالخطأ
   * @returns {boolean} true إذا كان الخطأ هو امتلاء المساحة
   */
  isQuotaExceededError(error) {
    return error && (
      error.code === 22 ||
      error.name === 'QuotaExceededError' ||
      error.message.includes('exceeded') ||
      error.message.includes('quota')
    );
  }
};

/**
 * تهيئة مكون localStorage
 * @param {Object} [dependencies] - التبعيات الاختيارية
 */
export function initializeLocalStorageAdapter(dependencies = {}) {
  const { errorLogger } = dependencies;
  
  try {
    console.info('[LocalStorageAdapter] تم تهيئته بنجاح');
    
    // جعل الوظائف متاحة عالميًا لتسهيل التصحيح
    if (typeof window !== 'undefined' && 
        (typeof process === 'undefined' || process.env.NODE_ENV === 'development')) {
      window.localStorageAdapter = {
        ...localStorageAdapter
      };
    }
    
    return {
      ...localStorageAdapter
    };
  } catch (error) {
    if (errorLogger) {
      errorLogger.logError(error, 'فشل في تهيئة LocalStorageAdapter');
    } else {
      console.error('[LocalStorageAdapter] فشل في التهيئة:', error);
    }
    
    return {};
  }
}

export default localStorageAdapter;
