// js/services/file.io.utils.js

/**
 * @typedef {Object} FileMetadata
 * @property {string} name - اسم الملف
 * @property {number} size - حجم الملف بالبايت
 * @property {string} type - نوع MIME للملف
 * @property {number} lastModified - وقت آخر تعديل (بتوقيت ملي ثانية)
 */

/**
 * مكتبة المساعدات لمعالجة الملفات في المتصفح
 * @type {{}}
 */
const fileIOUtils = {
  /**
   * قراءة ملف كـ Data URL (Base64)
   * @param {File} fileObject - الكائن الخاص بالملف
   * @returns {Promise<string>} - الوعد الذي يحتوي على Data URL
   */
  readFileAsDataURL(fileObject) {
    return new Promise((resolve, reject) => {
      if (!(fileObject instanceof File)) {
        const error = new Error('Invalid argument: Expected a File object.');
        return reject(error);
      }

      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Error reading file "${fileObject.name}" as Data URL.`));
      reader.onabort = () => reject(new Error(`File reading aborted for "${fileObject.name}".`));

      try {
        reader.readAsDataURL(fileObject);
      } catch (e) {
        reject(new Error(`Exception during FileReader.readAsDataURL for "${fileObject.name}".`));
      }
    });
  },

  /**
   * قراءة ملف كـ ArrayBuffer
   * @param {File} fileObject - الكائن الخاص بالملف
   * @returns {Promise<ArrayBuffer>} - الوعد الذي يحتوي على ArrayBuffer
   */
  readFileAsArrayBuffer(fileObject) {
    return new Promise((resolve, reject) => {
      if (!(fileObject instanceof File)) {
        const error = new Error('Invalid argument: Expected a File object.');
        return reject(error);
      }

      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Error reading file "${fileObject.name}" as ArrayBuffer.`));
      reader.onabort = () => reject(new Error(`File reading aborted for "${fileObject.name}".`));

      try {
        reader.readAsArrayBuffer(fileObject);
      } catch (e) {
        reject(new Error(`Exception during FileReader.readAsArrayBuffer for "${fileObject.name}".`));
      }
    });
  },

  /**
   * قراءة ملف كـ نص
   * @param {File} fileObject - الكائن الخاص بالملف
   * @param {string} [encoding='UTF-8'] - ترميز النص
   * @returns {Promise<string>} - الوعد الذي يحتوي على النص
   */
  readFileAsText(fileObject, encoding = 'UTF-8') {
    return new Promise((resolve, reject) => {
      if (!(fileObject instanceof File)) {
        const error = new Error('Invalid argument: Expected a File object.');
        return reject(error);
      }

      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Error reading file "${fileObject.name}" as text (encoding: ${encoding}).`));
      reader.onabort = () => reject(new Error(`File reading aborted for "${fileObject.name}".`));

      try {
        reader.readAsText(fileObject, encoding);
      } catch (e) {
        reject(new Error(`Exception during FileReader.readAsText for "${fileObject.name}".`));
      }
    });
  },

  /**
   * إنشاء رابط كائن من ملف أو كائن بيانات
   * @param {File|Blob} fileOrBlob - الملف أو كائن البيانات
   * @returns {string|null} - الرابط أو null في حالة الفشل
   */
  createObjectURL(fileOrBlob) {
    if (!(fileOrBlob instanceof File || fileOrBlob instanceof Blob)) {
      return null;
    }

    try {
      return URL.createObjectURL(fileOrBlob);
    } catch (e) {
      return null;
    }
  },

  /**
   * إلغاء رابط الكائن بعد الانتهاء من استخدامه
   * @param {string} objectUrl - الرابط المراد إلغاؤه
   */
  revokeObjectURL(objectUrl) {
    if (typeof objectUrl === 'string' && objectUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (e) {
        // لا حاجة لإظهار خطأ هنا
      }
    }
  },

  /**
   * الحصول على بيانات الملف الأساسية
   * @param {File} fileObject - الكائن الخاص بالملف
   * @returns {FileMetadata|null} - بيانات الملف أو null في حالة الفشل
   */
  getFileMetadata(fileObject) {
    if (!(fileObject instanceof File)) {
      return null;
    }

    return {
      name: fileObject.name,
      size: fileObject.size,
      type: fileObject.type,
      lastModified: fileObject.lastModified
    };
  },

  /**
   * تنزيل ملف من البيانات المتوفرة
   * @param {Blob|string} data - بيانات الملف
   * @param {string} filename - اسم الملف
   * @param {string} [mimeType] - نوع MIME (اختياري)
   */
  downloadFile(data, filename, mimeType) {
    if (!data || !filename) {
      return;
    }

    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * تنزيل كائن Blob
   * @param {Blob} blob - كائن البيانات
   * @param {string} filename - اسم الملف
   * @param {string} [mimeType] - نوع MIME (اختياري)
   */
  downloadBlob(blob, filename, mimeType) {
    if (!(blob instanceof Blob)) {
      throw new Error('Invalid argument: Expected a Blob object.');
    }
    
    const downloadMimeType = mimeType || blob.type || 'application/octet-stream';
    const url = URL.createObjectURL(new Blob([blob], { type: downloadMimeType }));
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * تنزيل ملف نصي
   * @param {string} text - النص
   * @param {string} filename - اسم الملف
   * @param {string} [mimeType='text/plain'] - نوع MIME (اختياري)
   */
  downloadTextFile(text, filename, mimeType = 'text/plain') {
    if (typeof text !== 'string') {
      throw new Error('Invalid argument: Expected a string for text content.');
    }
    
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * تنزيل ملف JSON
   * @param {Object} data - بيانات JSON
   * @param {string} filename - اسم الملف
   */
  downloadJSON(data, filename) {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid argument: Expected a JSON object.');
    }
    
    const jsonString = JSON.stringify(data, null, 2);
    this.downloadTextFile(jsonString, filename, 'application/json');
  },

  /**
   * تنزيل صورة
   * @param {string|HTMLImageElement} imageUrl - مصدر الصورة
   * @param {string} filename - اسم الملف
   */
  async downloadImage(imageUrl, filename) {
    if (typeof imageUrl === 'string') {
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        
        const blob = await response.blob();
        this.downloadBlob(blob, filename, 'image/jpeg');
      } catch (error) {
        throw new Error(`Error downloading image: ${error.message}`);
      }
    } else if (imageUrl instanceof HTMLImageElement) {
      const canvas = document.createElement('canvas');
      canvas.width = imageUrl.width;
      canvas.height = imageUrl.height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageUrl, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          this.downloadBlob(blob, filename, 'image/png');
        }
      }, 'image/png');
    } else {
      throw new Error('Invalid argument: Expected a URL string or HTMLImageElement.');
    }
  },

  /**
   * تنزيل فيديو
   * @param {string|HTMLVideoElement} videoUrl - مصدر الفيديو
   * @param {string} filename - اسم الملف
   */
  async downloadVideo(videoUrl, filename) {
    if (typeof videoUrl === 'string') {
      try {
        const response = await fetch(videoUrl);
        if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
        
        const blob = await response.blob();
        this.downloadBlob(blob, filename, 'video/mp4');
      } catch (error) {
        throw new Error(`Error downloading video: ${error.message}`);
      }
    } else if (videoUrl instanceof HTMLVideoElement) {
      throw new Error('Downloading video from HTMLVideoElement is not supported.');
    } else {
      throw new Error('Invalid argument: Expected a URL string or HTMLVideoElement.');
    }
  },

  /**
   * تنزيل صوت
   * @param {string|HTMLAudioElement} audioUrl - مصدر الصوت
   * @param {string} filename - اسم الملف
   */
  async downloadAudio(audioUrl, filename) {
    if (typeof audioUrl === 'string') {
      try {
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
        
        const blob = await response.blob();
        this.downloadBlob(blob, filename, 'audio/mpeg');
      } catch (error) {
        throw new Error(`Error downloading audio: ${error.message}`);
      }
    } else if (audioUrl instanceof HTMLAudioElement) {
      throw new Error('Downloading audio from HTMLAudioElement is not supported.');
    } else {
      throw new Error('Invalid argument: Expected a URL string or HTMLAudioElement.');
    }
  }
};

/**
 * تهيئة مكون معالجة الملفات
 * @param {Object} [dependencies] - التبعيات الاختيارية
 */
export function initializeFileIOUtils(dependencies = {}) {
  const { errorLogger } = dependencies;
  
  try {
    console.info('[FileIOUtils] تم تهيئته بنجاح');
    
    // جعل الوظائف متاحة عالميًا لتسهيل التصحيح
    if (typeof window !== 'undefined' && 
        (typeof process === 'undefined' || process.env.NODE_ENV === 'development')) {
      window.fileIOUtils = {
        ...fileIOUtils
      };
    }
    
    return {
      ...fileIOUtils
    };
  } catch (error) {
    if (errorLogger) {
      errorLogger.logError(error, 'فشل في تهيئة FileIOUtils');
    } else {
      console.error('[FileIOUtils] فشل في التهيئة:', error);
    }
    
    return {};
  }
}

export default fileIOUtils;
