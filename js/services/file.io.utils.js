// js/services/file.io.utils.js

// errorLogger سيتم تمريره من الوحدة المستدعية أو يجب أن يكون متاحًا عالميًا (أقل مثالية)
// let localErrorLoggerRef = console; // Fallback
// if (typeof window !== 'undefined' && window.errorLogger) {
//     localErrorLoggerRef = window.errorLogger;
// }
// Alternative: Modules using fileIOUtils should inject an errorLogger instance if specific logging is needed by these utils.
// For now, these utils will primarily throw errors, and the caller handles logging.

const fileIOUtils = {
  /**
   * Reads a file object as a Data URL (Base64 encoded string).
   * Useful for displaying images or embedding small files directly.
   * @param {File} fileObject - The file object from an input element or Drag-and-Drop.
   * @returns {Promise<string>} A promise that resolves with the Data URL string
   *                            or rejects with an Error object.
   */
  readFileAsDataURL(fileObject) {
    return new Promise((resolve, reject) => {
      if (!(fileObject instanceof File)) {
        const error = new Error('Invalid argument: Expected a File object.');
        // (localErrorLoggerRef.logWarning || console.warn).call(localErrorLoggerRef, {
        //   message: error.message, origin: 'fileIOUtils.readFileAsDataURL', context: { fileObject }
        // });
        return reject(error);
      }

      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result); // reader.result contains the Data URL
      };

      reader.onerror = () => {
        const error = new Error(`Error reading file "${fileObject.name}" as Data URL.`);
        // (localErrorLoggerRef.handleError || console.error).call(localErrorLoggerRef, {
        //   error: reader.error, // The actual error from FileReader
        //   message: error.message, origin: 'fileIOUtils.readFileAsDataURL', context: { fileName: fileObject.name }
        // });
        reject(error); // Reject with our custom error, reader.error has more details
      };

      reader.onabort = () => {
        const error = new Error(`File reading aborted for "${fileObject.name}".`);
        // (localErrorLoggerRef.logWarning || console.warn).call(localErrorLoggerRef, {
        //   message: error.message, origin: 'fileIOUtils.readFileAsDataURL', context: { fileName: fileObject.name }
        // });
        reject(error);
      };

      try {
        reader.readAsDataURL(fileObject);
      } catch (e) {
         const error = new Error(`Exception during FileReader.readAsDataURL for "${fileObject.name}".`);
        // (localErrorLoggerRef.handleError || console.error).call(localErrorLoggerRef, {
        //   error: e, message: error.message, origin: 'fileIOUtils.readFileAsDataURL', context: { fileName: fileObject.name }
        // });
        reject(error);
      }
    });
  },

  /**
   * Reads a file object as an ArrayBuffer.
   * Useful for binary file processing, e.g., for Web Audio API or sending to a server.
   * @param {File} fileObject - The file object.
   * @returns {Promise<ArrayBuffer>} A promise that resolves with the ArrayBuffer
   *                                 or rejects with an Error object.
   */
  readFileAsArrayBuffer(fileObject) {
    return new Promise((resolve, reject) => {
      if (!(fileObject instanceof File)) {
        const error = new Error('Invalid argument: Expected a File object.');
        return reject(error);
      }

      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result); // reader.result contains the ArrayBuffer
      };

      reader.onerror = () => {
        const error = new Error(`Error reading file "${fileObject.name}" as ArrayBuffer.`);
        reject(error);
      };

      reader.onabort = () => {
        const error = new Error(`File reading aborted for "${fileObject.name}".`);
        reject(error);
      };
      
      try {
        reader.readAsArrayBuffer(fileObject);
      } catch (e) {
         const error = new Error(`Exception during FileReader.readAsArrayBuffer for "${fileObject.name}".`);
        reject(error);
      }
    });
  },

  /**
   * Reads a file object as plain text.
   * Useful for text files like SRT (subtitles), JSON (if not fetching), etc.
   * @param {File} fileObject - The file object.
   * @param {string} [encoding='UTF-8'] - The character encoding to use (default: UTF-8).
   * @returns {Promise<string>} A promise that resolves with the text content string
   *                            or rejects with an Error object.
   */
  readFileAsText(fileObject, encoding = 'UTF-8') {
    return new Promise((resolve, reject) => {
      if (!(fileObject instanceof File)) {
        const error = new Error('Invalid argument: Expected a File object.');
        return reject(error);
      }

      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result); // reader.result contains the text string
      };

      reader.onerror = () => {
        const error = new Error(`Error reading file "${fileObject.name}" as text (encoding: ${encoding}).`);
        reject(error);
      };

      reader.onabort = () => {
        const error = new Error(`File reading aborted for "${fileObject.name}".`);
        reject(error);
      };

      try {
        reader.readAsText(fileObject, encoding);
      } catch (e) {
        const error = new Error(`Exception during FileReader.readAsText for "${fileObject.name}".`);
        reject(error);
      }
    });
  },

  /**
   * Creates an Object URL from a File or Blob object.
   * This URL can be used as a `src` for images, videos, audio elements, or for downloads.
   * The caller is responsible for revoking the object URL using `revokeObjectURL()` when no longer needed.
   * @param {File | Blob} fileOrBlob - The File or Blob object.
   * @returns {string | null} The object URL string, or null if creation fails or input is invalid.
   */
  createObjectURL(fileOrBlob) {
    if (!(fileOrBlob instanceof File) && !(fileOrBlob instanceof Blob)) {
        // (localErrorLoggerRef.logWarning || console.warn).call(localErrorLoggerRef, {
        //   message: 'Invalid argument: Expected a File or Blob object.',
        //   origin: 'fileIOUtils.createObjectURL', context: { fileOrBlob }
        // });
      return null;
    }
    try {
      return URL.createObjectURL(fileOrBlob);
    } catch (e) {
        const error = new Error(`Failed to create Object URL.`);
        // (localErrorLoggerRef.handleError || console.error).call(localErrorLoggerRef, {
        //   error: e, message: error.message, origin: 'fileIOUtils.createObjectURL', context: { fileName: fileOrBlob.name }
        // });
      return null;
    }
  },

  /**
   * Revokes a previously created Object URL to free up resources.
   * @param {string} objectUrl - The object URL to revoke.
   */
  revokeObjectURL(objectUrl) {
    if (typeof objectUrl === 'string' && objectUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (e) {
        const error = new Error(`Failed to revoke Object URL: ${objectUrl}`);
        // (localErrorLoggerRef.handleError || console.error).call(localErrorLoggerRef, {
        //   error: e, message: error.message, origin: 'fileIOUtils.revokeObjectURL', context: { objectUrl }
        // });
      }
    } else {
        // (localErrorLoggerRef.logWarning || console.warn).call(localErrorLoggerRef, {
        //   message: 'Invalid object URL provided for revoking.',
        //   origin: 'fileIOUtils.revokeObjectURL', context: { objectUrl }
        // });
    }
  },

  /**
   * Gets basic file metadata.
   * @param {File} fileObject - The file object.
   * @returns {{name: string, size: number, type: string, lastModified: number} | null}
   *          An object with file metadata, or null if input is invalid.
   */
  getFileMetadata(fileObject) {
    if (!(fileObject instanceof File)) {
      return null;
    }
    return {
      name: fileObject.name,
      size: fileObject.size, // in bytes
      type: fileObject.type, // MIME type
      lastModified: fileObject.lastModified, // timestamp
    };
  },

  /**
   * Helper to simulate a file download from a Blob or data.
   * @param {Blob | string} data - The Blob object or string data to download.
   * @param {string} filename - The desired filename for the download.
   * @param {string} [mimeType] - The MIME type (e.g., 'text/plain', 'video/webm').
   *                              Required if `data` is a string, otherwise inferred from Blob.
   */
  downloadFile(data, filename, mimeType) {
    if (!data || !filename) {
        // (localErrorLoggerRef.logWarning || console.warn).call(localErrorLoggerRef, {
        //   message: 'Invalid arguments for downloadFile: data and filename are required.',
        //   origin: 'fileIOUtils.downloadFile'
        // });
        return;
    }

    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); // Required for Firefox
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // console.info(`[FileIOUtils] File download initiated: ${filename}`);
  }

};

// This service usually doesn't need an `initialize...` function
// to be called by moduleBootstrap, as its methods are utilities.
// Modules import it directly.

export default fileIOUtils;
