// js/services/pexels.api.client.js

// Attempt to import PEXELS_API_KEY.
// In a real build process, this would work seamlessly.
// For standalone or simpler setups, handle its potential absence gracefully.
let PEXELS_API_KEY_VALUE = null;
try {
  // This assumes api-keys.config.js is correctly structured and PEXELS_API_KEY is exported.
  // Ensure api-keys.config.js is added to .gitignore if it contains real keys.
  const apiKeysConfig = await import('../config/api-keys.config.js'); // Use dynamic import
  if (apiKeysConfig && apiKeysConfig.PEXELS_API_KEY) {
    PEXELS_API_KEY_VALUE = apiKeysConfig.PEXELS_API_KEY;
  } else {
    console.warn('[PexelsApiClient] PEXELS_API_KEY not found in api-keys.config.js. Pexels functionality will be disabled.');
  }
} catch (e) {
  console.warn('[PexelsApiClient] Could not load api-keys.config.js. Pexels functionality will be disabled. Error:', e);
  // This can happen if the file doesn't exist or there's an error in it.
}

// Base URL for Pexels API
const PEXELS_API_BASE_URL = 'https://api.pexels.com/v1';
const PEXELS_VIDEO_API_BASE_URL = 'https://api.pexels.com/videos'; // Note: different base for videos

// Default parameters for search
const DEFAULT_PER_PAGE = 15;
const DEFAULT_ORIENTATION = 'landscape'; // or 'portrait', 'square'
const DEFAULT_SIZE = 'medium'; // 'small', 'medium', 'large' or specific px values via custom

const pexelsApiClient = {
  /**
   * Checks if the Pexels API client is configured and ready to use.
   * @returns {boolean} True if API key is available, false otherwise.
   */
  isConfigured() {
    return !!PEXELS_API_KEY_VALUE;
  },

  /**
   * Performs a request to the Pexels API.
   * @private
   * @param {string} endpoint - The API endpoint (e.g., '/search', '/videos/search').
   * @param {Record<string, string | number>} params - Query parameters for the request.
   * @param {import('../core/error-logger.js').default | Console} [errorLogger=console] - Error logger instance.
   * @param {string} [baseUrl=PEXELS_API_BASE_URL] - The base URL for the API.
   * @returns {Promise<Object>} The JSON response from Pexels API.
   * @throws {Error} If the request fails or API key is missing.
   */
  async _request(endpoint, params, errorLogger = console, baseUrl = PEXELS_API_BASE_URL) {
    if (!this.isConfigured()) {
      const err = new Error('Pexels API key is not configured. Cannot make requests.');
      (errorLogger.logWarning || errorLogger.warn)?.call(errorLogger, {
        message: err.message,
        origin: 'PexelsApiClient._request'
      });
      throw err;
    }

    const queryString = new URLSearchParams(params).toString();
    const url = `${baseUrl}${endpoint}?${queryString}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': PEXELS_API_KEY_VALUE,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json(); // Pexels usually returns JSON errors
        } catch (e) {
            errorData = { error: await response.text().catch(() => 'Unknown error format') };
        }
        const errMessage = `Pexels API request failed with status ${response.status}: ${errorData.error || JSON.stringify(errorData)}`;
        throw new Error(errMessage);
      }
      return await response.json();
    } catch (error) {
      (errorLogger.handleError || errorLogger.error)?.call(errorLogger, {
        error: error instanceof Error ? error : new Error(String(error)),
        message: `Error during Pexels API request to "${endpoint}". ${error.message}`,
        origin: 'PexelsApiClient._request',
        context: { endpoint, params, url }
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  },

  /**
   * Searches for photos on Pexels.
   * @param {string} query - The search term.
   * @param {Object} [options={}] - Additional search options.
   * @param {number} [options.per_page=DEFAULT_PER_PAGE] - Number of results per page.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {'landscape' | 'portrait' | 'square'} [options.orientation=DEFAULT_ORIENTATION] - Photo orientation.
   * @param {'large' | 'medium' | 'small' | 'large2x' | 'original' | 'tiny'} [options.size] - Size of photos. (Note: Pexels uses src object for sizes)
   * @param {import('../core/error-logger.js').default | Console} [errorLogger=console] - Error logger.
   * @returns {Promise<Object>} Pexels API response for photos.
   * Sample response: { photos: [{ id, width, height, url, photographer, src: { original, large2x, large, medium, small, portrait, landscape, tiny } }], page, per_page, total_results, next_page }
   */
  async searchPhotos(query, options = {}, errorLogger = console) {
    if (!query || typeof query !== 'string' || !query.trim()) {
        const errMsg = "Search query is required for Pexels photo search.";
        (errorLogger.logWarning || errorLogger.warn)?.call(errorLogger, {
            message: errMsg, origin: 'PexelsApiClient.searchPhotos'
        });
        throw new Error(errMsg);
    }
    const params = {
      query,
      per_page: options.per_page || DEFAULT_PER_PAGE,
      page: options.page || 1,
      orientation: options.orientation || DEFAULT_ORIENTATION,
      ...(options.size && { size: options.size }), // Size for curation/featured. For search, rely on `src` object.
    };
    return this._request('/search', params, errorLogger, PEXELS_API_BASE_URL);
  },

  /**
   * Searches for videos on Pexels.
   * @param {string} query - The search term.
   * @param {Object} [options={}] - Additional search options.
   * @param {number} [options.per_page=5] - Number of results per page (Pexels video default might be lower).
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {'landscape' | 'portrait' | 'square'} [options.orientation] - Video orientation.
   * @param {'small' | 'medium' | 'large'} [options.size] - Min width: small (960px), medium (1920px), large (4k).
   * @param {import('../core/error-logger.js').default | Console} [errorLogger=console] - Error logger.
   * @returns {Promise<Object>} Pexels API response for videos.
   * Sample response: { videos: [{ id, width, height, url, image (poster), duration, user: { id, name, url }, video_files: [{ id, quality ('hd', 'sd'), file_type, width, height, link }], video_pictures: [{ id, picture, nr }] }], page, per_page, total_results, next_page }
   */
  async searchVideos(query, options = {}, errorLogger = console) {
    if (!query || typeof query !== 'string' || !query.trim()) {
        const errMsg = "Search query is required for Pexels video search.";
        (errorLogger.logWarning || errorLogger.warn)?.call(errorLogger, {
            message: errMsg, origin: 'PexelsApiClient.searchVideos'
        });
        throw new Error(errMsg);
    }
    const params = {
      query,
      per_page: options.per_page || 5, // Videos often have fewer results
      page: options.page || 1,
      ...(options.orientation && { orientation: options.orientation }),
      ...(options.size && { size: options.size }),
    };
    return this._request('/search', params, errorLogger, PEXELS_VIDEO_API_BASE_URL);
  },

  /**
   * Gets curated photos.
   * @param {Object} [options={}] - Options like per_page, page.
   * @param {import('../core/error-logger.js').default | Console} [errorLogger=console] - Error logger.
   * @returns {Promise<Object>} Pexels API response for curated photos.
   */
  async getCuratedPhotos(options = {}, errorLogger = console) {
    const params = {
      per_page: options.per_page || DEFAULT_PER_PAGE,
      page: options.page || 1,
    };
    return this._request('/curated', params, errorLogger, PEXELS_API_BASE_URL);
  },

  /**
   * Gets popular videos.
   * @param {Object} [options={}] - Options like per_page, page, min_width, min_height, min_duration, max_duration.
   * @param {import('../core/error-logger.js').default | Console} [errorLogger=console] - Error logger.
   * @returns {Promise<Object>} Pexels API response for popular videos.
   */
  async getPopularVideos(options = {}, errorLogger = console) {
    const params = {
      per_page: options.per_page || 5,
      page: options.page || 1,
      // Add other specific popular video params if needed
      // min_width, min_height, min_duration, max_duration
      ...(options.min_width && {min_width: options.min_width}),
      ...(options.min_duration && {min_duration: options.min_duration}),
    };
    return this._request('/popular', params, errorLogger, PEXELS_VIDEO_API_BASE_URL);
  },

  /**
   * Retrieves a specific photo by its ID.
   * @param {number | string} photoId - The ID of the photo.
   * @param {import('../core/error-logger.js').default | Console} [errorLogger=console] - Error logger.
   * @returns {Promise<Object>} Pexels API response for a single photo.
   */
  async getPhotoById(photoId, errorLogger = console) {
    if (!photoId) {
        const errMsg = "Photo ID is required.";
        (errorLogger.logWarning || errorLogger.warn)?.call(errorLogger, {
            message: errMsg, origin: 'PexelsApiClient.getPhotoById'
        });
        throw new Error(errMsg);
    }
    return this._request(`/photos/${photoId}`, {}, errorLogger, PEXELS_API_BASE_URL);
  },

  /**
   * Retrieves a specific video by its ID.
   * @param {number | string} videoId - The ID of the video.
   * @param {import('../core/error-logger.js').default | Console} [errorLogger=console] - Error logger.
   * @returns {Promise<Object>} Pexels API response for a single video.
   */
  async getVideoById(videoId, errorLogger = console) {
    if (!videoId) {
        const errMsg = "Video ID is required.";
        (errorLogger.logWarning || errorLogger.warn)?.call(errorLogger, {
            message: errMsg, origin: 'PexelsApiClient.getVideoById'
        });
        throw new Error(errMsg);
    }
    return this._request(`/videos/${videoId}`, {}, errorLogger, PEXELS_VIDEO_API_BASE_URL);
  }

  // You can add more specific Pexels API methods as needed (e.g., featured collections)
};

// How this client is typically initialized or used:
// 1. In moduleBootstrap.js, you might "provide" this instance if it's configured.
//    This would involve `main.js` awaiting the dynamic import of api-keys.config.js
//    before calling moduleBootstrap.
// 2. Or, features that use Pexels import pexelsApiClient directly and always call `isConfigured()`
//    before attempting to use its methods, and handle the case where it's not configured.

// Example for moduleBootstrap:
// (This would require pexelsApiClient to be an instance potentially initialized asynchronously
// if the API key loading itself is async within this file)
//
// export async function initializePexelsApiClient(dependencies) {
//   const { errorLogger } = dependencies;
//   // The API key is already attempted to load at the top of this file.
//   if (pexelsApiClient.isConfigured()) {
//     // console.info('[PexelsApiClientWrapper] Initialized and configured.');
//     // Inject errorLogger into the client if its methods need it directly and aren't already passed
//     // pexelsApiClient.setErrorLogger(errorLogger); // If such method exists
//     return pexelsApiClient;
//   } else {
//     // console.warn('[PexelsApiClientWrapper] Pexels API not configured (missing API key).');
//     return null; // Or an object with a no-op interface
//   }
// }

// If PEXELS_API_KEY_VALUE remains null, methods will throw error due to isConfigured() check.
export default pexelsApiClient;
