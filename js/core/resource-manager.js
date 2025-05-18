// js/core/resource-manager.js

// errorLogger سيتم تمريره إلى دوال هذه الوحدة عند الحاجة من الكود المستدعي،
// أو يمكن للوحدة محاولة استيراده إذا كان الهيكل يسمح بذلك دون مشاكل ترتيب تحميل.
// في هذا الإصدار، سنجعل الدوال تقبل errorLoggerInstance كوسيط اختياري.

const loadedResources = new Map(); // Cache for loaded resources { url: resourceData }

const resourceManager = {
  /**
   * Loads an image resource.
   * @param {string} url - The URL of the image to load.
   * @param {import('./error-logger.js').default | Console} [errorLoggerInstance=console] - Optional error logger.
   * @returns {Promise<HTMLImageElement>} A promise that resolves with the loaded image element
   *                                     or rejects with an error object.
   */
  loadImage(url, errorLoggerInstance = console) {
    if (typeof url !== 'string' || !url.trim()) {
      const errMsg = 'Invalid URL provided for loadImage.';
      (errorLoggerInstance.logWarning || errorLoggerInstance.warn)?.call(errorLoggerInstance, {
        message: errMsg, origin: 'resourceManager.loadImage', context: { url }
      });
      return Promise.reject(new Error(errMsg));
    }

    if (loadedResources.has(url)) {
      // console.debug(`[ResourceManager] Returning cached image: ${url}`);
      return Promise.resolve(loadedResources.get(url));
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      // For cross-origin images, if the server supports CORS, this can help prevent tainting the canvas
      // if you intend to draw the image on it and then export it.
      // However, it requires the server to send appropriate CORS headers.
      // if (new URL(url).origin !== window.location.origin) {
      //   img.crossOrigin = "Anonymous";
      // }

      img.onload = () => {
        loadedResources.set(url, img);
        // console.debug(`[ResourceManager] Image loaded and cached: ${url}`);
        resolve(img);
      };

      img.onerror = (errorEvent) => { // errorEvent is an Event, not necessarily an Error object
        const error = new Error(`Failed to load image resource at: ${url}`);
        (errorLoggerInstance.handleError || errorLoggerInstance.error)?.call(errorLoggerInstance, {
          error: error, // Create a new Error object
          message: error.message, // Use message from the new Error
          origin: 'resourceManager.loadImage',
          context: { url, errorEventDetails: String(errorEvent) }, // Stringify errorEvent for context
        });
        reject(error); // Reject with the new Error object
      };

      img.onabort = () => {
        const error = new Error(`Image loading aborted by user or script: ${url}`);
         (errorLoggerInstance.logWarning || errorLoggerInstance.warn)?.call(errorLoggerInstance, {
          error: error, // Can pass error object to logWarning too
          message: error.message,
          origin: 'resourceManager.loadImage',
          context: { url },
        });
        reject(error);
      };
      img.src = url;
    });
  },

  /**
   * Loads a JSON resource using fetch.
   * @param {string} url - The URL of the JSON file to load.
   * @param {import('./error-logger.js').default | Console} [errorLoggerInstance=console] - Optional error logger.
   * @returns {Promise<Object>} A promise that resolves with the parsed JSON object
   *                            or rejects with an error object.
   */
  async loadJSON(url, errorLoggerInstance = console) {
    if (typeof url !== 'string' || !url.trim()) {
      const errMsg = 'Invalid URL provided for loadJSON.';
      (errorLoggerInstance.logWarning || errorLoggerInstance.warn)?.call(errorLoggerInstance, {
        message: errMsg, origin: 'resourceManager.loadJSON', context: { url }
      });
      return Promise.reject(new Error(errMsg));
    }

    if (loadedResources.has(url)) {
      // console.debug(`[ResourceManager] Returning cached JSON: ${url}`);
      return Promise.resolve(loadedResources.get(url));
    }

    try {
      const response = await fetch(url, {
          method: 'GET',
          headers: {
              'Accept': 'application/json', // Explicitly accept JSON
          },
          // cache: 'no-store', // Uncomment to bypass browser cache for this fetch, useful for dynamic JSON
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not retrieve error text.');
        throw new Error(`HTTP error! Status: ${response.status}. URL: ${url}. Response: ${errorText.substring(0, 200)}`);
      }

      const jsonData = await response.json();
      loadedResources.set(url, jsonData);
      // console.debug(`[ResourceManager] JSON loaded and cached: ${url}`);
      return jsonData;
    } catch (error) { // This will catch network errors and the error thrown above
      (errorLoggerInstance.handleError || errorLoggerInstance.error)?.call(errorLoggerInstance, {
        error: error instanceof Error ? error : new Error(String(error)), // Ensure it's an Error object
        message: `Failed to load or parse JSON from: ${url}. ${error.message}`,
        origin: 'resourceManager.loadJSON',
        context: { url },
      });
      throw error instanceof Error ? error : new Error(String(error)); // Re-throw an Error object
    }
  },

  /**
   * Placeholder for loading an audio resource.
   * Currently, it just resolves with the URL. Real implementation might involve
   * fetching ArrayBuffer for Web Audio API or verifying reachability.
   * @param {string} url - The URL of the audio file.
   * @param {import('./error-logger.js').default | Console} [errorLoggerInstance=console] - Optional error logger.
   * @returns {Promise<string>} A promise that resolves with the audio URL.
   */
  async loadAudio(url, errorLoggerInstance = console) {
    if (typeof url !== 'string' || !url.trim()) {
      const errMsg = `Invalid audio URL provided: ${url}`;
       (errorLoggerInstance.logWarning || errorLoggerInstance.warn)?.call(errorLoggerInstance, {
        message: errMsg,
        origin: 'resourceManager.loadAudio',
        context: { url }
      });
      return Promise.reject(new Error(errMsg));
    }

    // For true preloading, you'd fetch the ArrayBuffer or Blob:
    // if (loadedResources.has(url)) { return Promise.resolve(loadedResources.get(url)); }
    // try {
    //   const response = await fetch(url);
    //   if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for audio ${url}`);
    //   const audioData = await response.arrayBuffer(); // or .blob()
    //   loadedResources.set(url, audioData);
    //   console.debug(`[ResourceManager] Audio data loaded and cached: ${url}`);
    //   return audioData; // or URL.createObjectURL(new Blob([audioData])) for <audio> src
    // } catch (error) {
    //   (errorLoggerInstance.handleError || errorLoggerInstance.error)?.call(errorLoggerInstance, {
    //     error, message: `Failed to load audio data from: ${url}. ${error.message}`,
    //     origin: 'resourceManager.loadAudio', context: { url },
    //   });
    //   throw error;
    // }

    // Simplified version: just "validate" and return URL
    // console.debug(`[ResourceManager] Audio resource URL validated: ${url}`);
    return Promise.resolve(url); // Caller uses this URL for <audio src="...">
  },

  /**
   * Gets a previously loaded resource from the cache.
   * @param {string} url - The URL of the resource.
   * @returns {any | undefined} The cached resource or undefined if not found.
   */
  getCachedResource(url) {
    return loadedResources.get(url);
  },

  /**
   * Clears a specific resource from the cache by its URL.
   * @param {string} url - The URL of the resource to clear.
   */
  clearCachedResource(url) {
    if (loadedResources.has(url)) {
      loadedResources.delete(url);
      // console.debug(`[ResourceManager] Cleared cached resource: ${url}`);
    }
  },

  /**
   * Clears all cached resources from this manager's cache.
   */
  clearAllCache() {
    loadedResources.clear();
    // console.info('[ResourceManager] All in-memory cached resources cleared.');
  }
};

// This module typically does not need an `initialize...` function to be called
// by moduleBootstrap unless it's preloading global/critical resources at startup.
// Its methods are usually called on-demand by other modules.

export default resourceManager;
