
// js/services/quran.api.client.js

// Base URL for Alquran.cloud API
const QURAN_API_BASE_URL = 'https://api.alquran.cloud/v1';

// This client primarily makes GET requests and processes JSON responses.
// errorLogger can be passed to methods or configured if this becomes a class/instantiated object.

const quranApiClient = {
  /**
   * Performs a request to the Alquran.cloud API.
   * @private
   * @param {string} endpoint - The API endpoint (e.g., '/surah', '/ayah/1:1/en.asad').
   * @param {Record<string, string | number>} [params] - Optional query parameters.
   * @param {import('../core/error-logger.js').default | Console} [errorLogger=console] - Error logger instance.
   * @returns {Promise<Object>} The JSON response from the API.
   * @throws {Error} If the request fails or the API returns an error status.
   */
  async _request(endpoint, params, errorLogger = console) {
    const url = new URL(`${QURAN_API_BASE_URL}${endpoint}`);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const responseData = await response.json(); // Alquran.cloud always returns JSON

      if (!response.ok || responseData.status === 'error' || responseData.code !== 200) {
        // API specific error structure: responseData.data might contain the error message
        const errorMessage = typeof responseData.data === 'string' ? responseData.data :
                             (responseData.message || `API request failed with status ${response.status} and code ${responseData.code}`);
        throw new Error(errorMessage);
      }
      
      // The actual data is usually in responseData.data
      return responseData.data;

    } catch (error) {
      const isNetworkError = !(error.message && error.message.startsWith('API request failed')); // Crude check
      (errorLogger.handleError || errorLogger.error)?.call(errorLogger, {
        error: error instanceof Error ? error : new Error(String(error)),
        message: `Error during Alquran.cloud API request to "${endpoint}". ${ isNetworkError ? 'Likely a network issue. ' : ''}${error.message}`,
        origin: 'quranApiClient._request',
        context: { endpoint, params: params ? params : {}, fullUrl: url.toString() }
      });
      throw error instanceof Error ? error : new Error(String(error));
    }
  },

  /**
   * Fetches a list of all Surahs (chapters) of the Quran.
   * @param {import('../core/error-logger.js').default | Console} [errorLogger=console] - Error logger.
   * @returns {Promise<Array<Object>>} A promise that resolves with an array of Surah objects.
   * Each Surah object typically contains: number, name, englishName, englishNameTranslation, revelationType, numberOfAyahs.
   * Example: { "number": 1, "name": "سُورَةُ ٱلْفَاتِحَةِ", "englishName": "Al-Faatiha", "englishNameTranslation": "The Opening", "numberOfAyahs": 7, "revelationType": "Meccan" }
   */
  async getAllSurahs(errorLogger = console) {
    return this._request('/meta', undefined, errorLogger)
      .then(metaData => {
        if (metaData && metaData.surahs && metaData.surahs.references) {
            return metaData.surahs.references; // The array of surah objects
        }
        throw new Error('Surah list not found in /meta response structure.');
      });
  },

  /**
   * Fetches a specific Surah by its number, including all its Ayahs (verses).
   * @param {number} surahNumber - The number of the Surah (1-114).
   * @param {string} [editionIdentifier='quran-uthmani'] - Optional: Quran edition (e.g., 'quran-uthmani', 'en.sahih').
   * @param {import('../core/error-logger.js').default | Console} [errorLogger=console] - Error logger.
   * @returns {Promise<Object>} A promise that resolves with the Surah object containing ayahs.
   * Structure includes: number, name, englishName, ..., ayahs: [{number, text, numberInSurah, juz, manzil, page, ruku, hizbQuarter, sajda}]
   */
  async getSurahWithAyahs(surahNumber, editionIdentifier = 'quran-uthmani', errorLogger = console) {
    if (typeof surahNumber !== 'number' || surahNumber < 1 || surahNumber > 114) {
      const err = new Error('Invalid Surah number. Must be between 1 and 114.');
       (errorLogger.logWarning || errorLogger.warn)?.call(errorLogger, {
        message: err.message, origin: 'quranApiClient.getSurahWithAyahs', context: { surahNumber }
      });
      return Promise.reject(err);
    }
    return this._request(`/surah/${surahNumber}/${editionIdentifier}`, undefined, errorLogger);
  },

  /**
   * Fetches a specific Ayah by its number in the Quran (e.g., "1:1" or 1 for first ayah, "2:255" or 282 for Ayat al-Kursi).
   * Can fetch multiple ayahs if the 'ayahs' parameter is an array of ayah references or a range like "1:1-1:7".
   * @param {string | number} ayahReference - Ayah reference (e.g., "2:255", 282). Or range "1:1-1:7".
   * @param {string} [editionIdentifier='quran-uthmani'] - Quran edition (e.g., 'quran-uthmani' for Arabic text).
   * @param {import('../core/error-logger.js').default | Console} [errorLogger=console] - Error logger.
   * @returns {Promise<Object|Array<Object>>} A promise that resolves with the Ayah object or an array of Ayah objects if a range/list.
   * Ayah object contains: number, text, edition, surah, numberInSurah, juz, etc.
   */
  async getAyah(ayahReference, editionIdentifier = 'quran-uthmani', errorLogger = console) {
    if (!ayahReference) {
       const err = new Error('Ayah reference is required.');
       (errorLogger.logWarning || errorLogger.warn)?.call(errorLogger, {
        message: err.message, origin: 'quranApiClient.getAyah', context: { ayahReference }
      });
      return Promise.reject(err);
    }
    // The API endpoint expects the edition identifier as part of the path after the Ayah reference.
    return this._request(`/ayah/${ayahReference}/${editionIdentifier}`, undefined, errorLogger);
  },

  /**
   * Fetches a specific Ayah's audio. Note: The API provides segment timings if edition supports it.
   * This method is more for fetching the Ayah text alongside its audio reference from a *specific audio edition*.
   * The actual audio files are usually at a different URL pattern or retrieved segment by segment.
   * @param {string | number} ayahReference - Ayah reference (e.g., "1:1", 1).
   * @param {string} audioEditionIdentifier - Audio edition identifier (e.g., 'ar.alafasy', 'ar.minshawi').
   * @param {import('../core/error-logger.js').default | Console} [errorLogger=console] - Error logger.
   * @returns {Promise<Object|Array<Object>>} A promise that resolves with Ayah data which includes audio segments.
   * Example Ayah object for audio: { ..., audio: "...", audioSecondary: ["..."] }
   * The `audio` field here is a direct link to an audio file for the whole ayah for that edition.
   */
  async getAyahAudioData(ayahReference, audioEditionIdentifier, errorLogger = console) {
    if (!ayahReference || !audioEditionIdentifier) {
      const err = new Error('Ayah reference and audio edition identifier are required.');
      (errorLogger.logWarning || errorLogger.warn)?.call(errorLogger, {
        message: err.message, origin: 'quranApiClient.getAyahAudioData', context: { ayahReference, audioEditionIdentifier }
      });
      return Promise.reject(err);
    }
    // The request is similar to getAyah, but with an audio edition.
    return this._request(`/ayah/${ayahReference}/${audioEditionIdentifier}`, undefined, errorLogger);
  },


  /**
   * Fetches a translation or tafsir for a specific Ayah.
   * @param {string | number} ayahReference - Ayah reference (e.g., "1:1", 1).
   * @param {string} translationEditionIdentifier - Translation/Tafsir edition identifier (e.g., 'en.sahih', 'ar.muyassar').
   * @param {import('../core/error-logger.js').default | Console} [errorLogger=console] - Error logger.
   * @returns {Promise<Object|Array<Object>>} A promise that resolves with the Ayah object containing the translation.
   * The `text` field in the response will be the translated text.
   */
  async getAyahTranslation(ayahReference, translationEditionIdentifier, errorLogger = console) {
     if (!ayahReference || !translationEditionIdentifier) {
      const err = new Error('Ayah reference and translation edition identifier are required.');
       (errorLogger.logWarning || errorLogger.warn)?.call(errorLogger, {
        message: err.message, origin: 'quranApiClient.getAyahTranslation', context: { ayahReference, translationEditionIdentifier }
      });
      return Promise.reject(err);
    }
    // The request is similar to getAyah, but with a translation edition.
    return this._request(`/ayah/${ayahReference}/${translationEditionIdentifier}`, undefined, errorLogger);
  },

  /**
   * Fetches a list of available Quran editions (text, translation, audio).
   * @param {Object} [options] - Optional filters.
   * @param {string} [options.format] - Filter by format (e.g., 'text', 'audio').
   * @param {string} [options.type] - Filter by type (e.g., 'translation', 'tafsir', 'quran').
   * @param {string} [options.language] - Filter by language code (e.g., 'en', 'ar').
   * @param {import('../core/error-logger.js').default | Console} [errorLogger=console] - Error logger.
   * @returns {Promise<Array<Object>>} A promise that resolves with an array of edition objects.
   * Edition object: { identifier, language, name, englishName, format, type, direction }
   */
  async getEditions(options = {}, errorLogger = console) {
    // The endpoint is '/edition' with optional query parameters.
    return this._request('/edition', options, errorLogger);
  },

  /**
   * Fetches word-by-word audio timing information for an Ayah, if available for the edition.
   * Example: /ayah/1:1/ar.husarymujawwad/offsets=true&timing=word
   * This usually returns the Ayah text and within it, a "words" array or similar with timings.
   * THIS IS A MORE ADVANCED USE CASE and might not be directly supported by all editions or a simple endpoint.
   * Alquran.cloud API provides word timestamps through certain audio editions that specify word timings.
   * You'd typically fetch an audio edition and look for segmentation data.
   * The standard /ayah/{ref}/{audio_edition} might return segment info directly if available.
   * The `https://everyayah.com/data/Frankahili_WoW_Audio_Timings_זו世ليفےFrankWords.txt` provides external word timings.
   * Alquran.cloud can return audio segments within the ayah object for some audio editions.
   * E.g., if an audio edition is specified with `? включаетСегменты=true` (this is hypothetical, check API docs).
   * For Alquran.cloud, check if an audio edition has "type": "versebyverse" or similar and see if segment data is returned.
   */
  // async getAyahWordTimings(ayahReference, audioEditionIdentifier, errorLogger = console) {
  //   // This requires a specific edition that supports word timings or segments.
  //   // The structure might be within the standard getAyahAudioData response
  //   // if the edition supports it, or it might be a different endpoint or parameter.
  //   // For simplicity, assuming segment data is part of the standard audio data fetch for now.
  //   return this.getAyahAudioData(ayahReference, audioEditionIdentifier, errorLogger);
  // }
};

// This service typically doesn't need an `initialize...` function from moduleBootstrap
// unless it needs to be configured with a base URL or default errorLogger during app startup.
// Usually, its methods are imported and called directly.

export default quranApiClient;
