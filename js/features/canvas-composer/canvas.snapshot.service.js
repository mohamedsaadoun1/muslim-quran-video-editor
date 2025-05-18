// js/features/canvas-composer/canvas.snapshot.service.js

import DOMElements from '../../core/dom-elements.js';
// errorLogger يمكن تمريره أو استيراده إذا لزم الأمر

const canvasSnapshotService = (() => {
  let canvasElement = null;
  let dependencies = {
    errorLogger: console, // Fallback
  };

  /**
   * Takes a snapshot of the current main canvas content and returns it as a Data URL.
   * @param {string} [format='image/png'] - The desired image format (e.g., 'image/png', 'image/jpeg').
   * @param {number} [quality] - For 'image/jpeg' or 'image/webp', a number between 0 and 1 indicating image quality.
   * @returns {Promise<string | null>} A promise that resolves with the Data URL string of the snapshot,
   *                                  or null if an error occurs or canvas is not found.
   */
  async function getCanvasAsDataURL(format = 'image/png', quality) {
    canvasElement = DOMElements.videoPreviewCanvas; // Ensure it's fetched each time in case DOM changes

    if (!canvasElement) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'Canvas element not found. Cannot take snapshot as Data URL.',
        origin: 'CanvasSnapshotService.getCanvasAsDataURL'
      });
      return null;
    }

    try {
      // Ensure the canvas has been rendered (content drawn on it) before taking a snapshot.
      // This function itself doesn't trigger a render; it assumes the canvas is up-to-date.
      if (canvasElement.width === 0 || canvasElement.height === 0) {
         (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
            message: 'Canvas has zero width or height. Snapshot will be empty or invalid.',
            origin: 'CanvasSnapshotService.getCanvasAsDataURL',
            context: { width: canvasElement.width, height: canvasElement.height }
        });
        // Depending on expected behavior, you might return null or an empty data URL.
        // For now, let's proceed and let toDataURL handle it, it might produce 'data:,'
      }

      let dataURL;
      if ((format === 'image/jpeg' || format === 'image/webp') && quality !== undefined) {
        dataURL = canvasElement.toDataURL(format, quality);
      } else {
        dataURL = canvasElement.toDataURL(format);
      }
      return dataURL;
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error,
        message: `Error taking canvas snapshot as Data URL (format: ${format}).`,
        origin: 'CanvasSnapshotService.getCanvasAsDataURL',
        context: { format, quality }
      });
      return null;
    }
  }

  /**
   * Takes a snapshot of the current main canvas content and returns it as a Blob.
   * Blobs are often more efficient for transferring data or saving to files.
   * @param {string} [format='image/png'] - The desired image format.
   * @param {number} [quality] - For 'image/jpeg' or 'image/webp', quality (0-1).
   * @returns {Promise<Blob | null>} A promise that resolves with the Blob object,
   *                                 or null if an error occurs.
   */
  async function getCanvasAsBlob(format = 'image/png', quality) {
    canvasElement = DOMElements.videoPreviewCanvas; // Re-fetch

    if (!canvasElement) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'Canvas element not found. Cannot take snapshot as Blob.',
        origin: 'CanvasSnapshotService.getCanvasAsBlob'
      });
      return null;
    }
    if (typeof canvasElement.toBlob !== 'function') {
        (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
            message: 'canvas.toBlob() is not supported in this browser/context. Cannot create Blob snapshot.',
            origin: 'CanvasSnapshotService.getCanvasAsBlob'
        });
        // Fallback: could create Blob from DataURL, but it's less efficient.
        // const dataUrl = await getCanvasAsDataURL(format, quality);
        // if (dataUrl) return await (await fetch(dataUrl)).blob();
        return null;
    }

    return new Promise((resolve) => {
      try {
        if (canvasElement.width === 0 || canvasElement.height === 0) {
            (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
                message: 'Canvas has zero width or height. Blob snapshot will be empty or invalid.',
                origin: 'CanvasSnapshotService.getCanvasAsBlob',
                context: { width: canvasElement.width, height: canvasElement.height }
            });
             // Resolve with null as the blob would be useless
            resolve(null);
            return;
        }

        canvasElement.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              // This case should ideally not happen if toBlob succeeded without error,
              // but browser implementations can vary.
              (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
                  message: 'Canvas.toBlob() callback received a null blob without an error.',
                  origin: 'CanvasSnapshotService.getCanvasAsBlob',
                  context: { format, quality }
              });
              resolve(null);
            }
          },
          format,
          quality
        );
      } catch (error) {
        // Catch synchronous errors from calling toBlob (e.g., security errors if canvas is tainted)
        (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
          error,
          message: `Error taking canvas snapshot as Blob (format: ${format}).`,
          origin: 'CanvasSnapshotService.getCanvasAsBlob',
          context: { format, quality }
        });
        resolve(null); // Resolve with null on error, as per Promise<Blob | null>
      }
    });
  }
  
  function _setDependencies(injectedDeps) {
    // This service is simple and might not need many dependencies other than potentially a logger.
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
  }

  return {
    _setDependencies, // For initialization (primarily to set errorLogger)
    getCanvasAsDataURL,
    getCanvasAsBlob,
  };
})(); // IIFE removed.

/**
 * Initialization function for the CanvasSnapshotService.
 * @param {object} dependencies
 * @param {import('../../core/error-logger.js').default} [dependencies.errorLogger] - Optional.
 */
export function initializeCanvasSnapshotService(dependencies = {}) {
  canvasSnapshotService._setDependencies(dependencies);
  // console.info('[CanvasSnapshotService] Initialized.');

  // Return the public API of the service.
  return {
    getCanvasAsDataURL: canvasSnapshotService.getCanvasAsDataURL,
    getCanvasAsBlob: canvasSnapshotService.getCanvasAsBlob,
  };
}

export default canvasSnapshotService; // Export the main object.
