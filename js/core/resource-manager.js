// js/core/resource-manager.js

import errorLogger from './error-logger.js';

const loadedResources = new Map(); // Cache for loaded resources { url: resourceData }

const resourceManager = {
  /**
   * Loads an image resource.
   * @param {string} url - The URL of the image to load.
   * @returns {Promise<HTMLImageElement>} A promise that resolves with the loaded image element
   *                                     or rejects with an error.
   */
  loadImage(url) {
    if (loadedResources.has(url)) {
      // console.debug(`[ResourceManager] Returning cached image: ${url}`);
      return Promise.resolve(loadedResources.get(url));
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        loadedResources.set(url, img);
        // console.debug(`[ResourceManager] Image loaded and cached: ${url}`);
        resolve(img);
      };
      img.onerror = (errorEvent) => {
        const error = new Error(`Failed to load image: ${url}`);
        errorLogger.handleError({
          error: error, // Pass a new Error object
          message: `Failed to load image: ${url}`,
          origin: 'resourceManager.loadImage',
          context: { url, errorEvent },
        });
        reject(error);
      };
      img.onabort = () => {
        const error = new Error(`Image loading aborted: ${url}`);
         errorLogger.logWarning({
          message: `Image loading aborted: ${url}`,
          origin: 'resourceManager.loadImage',
          context: { url },
        });
        reject(error);
      }
      img.src = url;
    });
  },

  /**
   * Loads a JSON resource.
   * @param {string} url - The URL of the JSON file to load.
   * @returns {Promise<Object>} A promise that resolves with the parsed JSON object
   *                            or rejects with an error.
   */
  async loadJSON(url) {
    if (loadedResources.has(url)) {
      // console.debug(`[ResourceManager] Returning cached JSON: ${url}`);
      return Promise.resolve(loadedResources.get(url));
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} for ${url}`);
      }
      const jsonData = await response.json();
      loadedResources.set(url, jsonData);
      // console.debug(`[ResourceManager] JSON loaded and cached: ${url}`);
      return jsonData;
    } catch (error) {
      errorLogger.handleError({
        error,
        message: `Failed to load or parse JSON from: ${url}`,
        origin: 'resourceManager.loadJSON',
        context: { url },
      });
      throw error; // Re-throw to allow calling code to handle it
    }
  },

  /**
   * Loads an audio resource (metadata for now, not preloading the entire file typically).
   * This might just return the URL if we are relying on the <audio> element's src.
   * Or, it could fetch and cache ArrayBuffer if full preloading is needed.
   * For now, let's assume it just validates the URL path or similar.
   *
   * @param {string} url - The URL of the audio file.
   * @returns {Promise<string>} A promise that resolves with the audio URL (or loaded data if implemented).
   */
  async loadAudio(url) {
    // For now, this is a placeholder. Real audio loading might involve Web Audio API
    // or simply returning the URL for an <audio> tag.
    // If we were to preload the audio data:
    /*
    if (loadedResources.has(url)) {
      return Promise.resolve(loadedResources.get(url));
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} for ${url}`);
      }
      const audioBlob = await response.blob(); // or arrayBuffer()
      loadedResources.set(url, audioBlob); // Store Blob or ArrayBuffer
      return audioBlob; // Or a URL.createObjectURL(audioBlob)
    } catch (error) {
      errorLogger.handleError({
        error,
        message: `Failed to load audio from: ${url}`,
        origin: 'resourceManager.loadAudio',
        context: { url },
      });
      throw error;
    }
    */
    // For simplicity, just returning the URL validated or passing through.
    if (typeof url === 'string' && url.length > 0) {
      // console.debug(`[ResourceManager] Audio resource URL prepared: ${url}`);
      return Promise.resolve(url);
    } else {
      const error = new Error(`Invalid audio URL provided: ${url}`);
      errorLogger.logWarning({
        message: `Invalid audio URL provided: ${url}`,
        origin: 'resourceManager.loadAudio',
        context: { url }
      });
      return Promise.reject(error);
    }
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
   * Clears a specific resource from the cache.
   * @param {string} url - The URL of the resource to clear.
   */
  clearCachedResource(url) {
    loadedResources.delete(url);
    // console.debug(`[ResourceManager] Cleared cached resource: ${url}`);
  },

  /**
   * Clears all cached resources.
   */
  clearAllCache() {
    loadedResources.clear();
    // console.info('[ResourceManager] All cached resources cleared.');
  }
};

// This module doesn't typically need an initFn called by moduleBootstrap
// unless it needs to preload specific global resources on app start.
// Its methods are called directly by other modules when they need a resource.

export default resourceManager;
