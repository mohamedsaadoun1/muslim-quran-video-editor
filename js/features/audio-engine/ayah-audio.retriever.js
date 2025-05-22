// js/features/audio-engine/ayah-audio.retriever.js

import quranApiClient from '../../services/quran.api.client.js'; // To fetch Ayah data with audio URLs
// import resourceManager from '../../core/resource-manager.js'; // Could be used for advanced audio metadata fetching
import { EVENTS, ACTIONS } from '../../config/app.constants.js';

const ayahAudioRetriever = (() => {
  let dependencies = {
    stateStore: {
        getState: () => ({ currentProject: null }),
        dispatch: () => {}, // Not typically used directly by retriever for changing state
    }, // Fallback
    eventAggregator: { publish: () => {} }, // Fallback
    errorLogger: console, // Fallback
    // resourceManager will be used directly from its import for now
  };

  // Cache for fetched audio details (URL, duration, word timings)
  // Key: `${ayahGlobalNumber}-${audioEditionIdentifier}`
  // Value: { url: string, duration: number (seconds), words: Array<{text: string, startTime: number, endTime: number}> (ms) }
  const audioInfoCache = new Map();

  /**
   * Gets the duration of an audio file by loading its metadata into an <audio> element.
   * @private
   * @param {string} audioUrl - The URL of the audio file.
   * @returns {Promise<number | null>} The duration in seconds, or null if it cannot be determined.
   */
  function _getAudioDuration(audioUrl) {
    return new Promise((resolve) => {
      if (!audioUrl) {
        resolve(null);
        return;
      }
      const audioElement = document.createElement('audio');
      audioElement.preload = 'metadata'; // Only load metadata to get duration

      audioElement.onloadedmetadata = () => {
        resolve(audioElement.duration);
        // Clean up: remove event listeners and set src to empty to release resources.
        audioElement.onloadedmetadata = null;
        audioElement.onerror = null;
        audioElement.onabort = null;
        audioElement.src = ''; // Helps in some browsers
      };

      audioElement.onerror = (e) => {
        (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
          message: `Error loading metadata for audio URL: ${audioUrl}. Cannot get duration.`,
          origin: 'AyahAudioRetriever._getAudioDuration',
          context: { errorEvent: e, audioUrl }
        });
        resolve(null);
         audioElement.onloadedmetadata = null;
        audioElement.onerror = null;
        audioElement.onabort = null;
        audioElement.src = '';
      };
      
      audioElement.onabort = () => {
         (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
          message: `Audio metadata loading aborted for URL: ${audioUrl}.`,
          origin: 'AyahAudioRetriever._getAudioDuration',
          context: { audioUrl }
        });
        resolve(null);
      };

      audioElement.src = audioUrl;
      // Note: Some browsers might require the audio element to be in the DOM for 'loadedmetadata' to fire reliably.
      // If issues, try appending to a hidden div and then removing it.
      // document.body.appendChild(audioElement); // Temporary append
      // ... then remove it in onload/onerror
    });
  }


  /**
   * Retrieves and prepares audio information (URL, duration, and word timings) for a specific Ayah.
   * Uses caching to avoid re-fetching or re-processing.
   * Publishes an event (EVENTS.AYAH_AUDIO_READY) when data is available.
   * @param {number} ayahGlobalNumber - The global number of the Ayah (1-6236).
   * @param {string} audioEditionIdentifier - The identifier of the audio edition (e.g., 'ar.alafasy').
   * @param {boolean} [forceRefetch=false] - If true, bypasses cache and refetches data.
   * @returns {Promise<{url: string, duration: number, words: Array<{text: string, startTime: number, endTime: number}>, ayahGlobalNumber: number} | null>}
   *          Audio details or null if an error occurs.
   */
  async function getAyahAudioInfo(ayahGlobalNumber, audioEditionIdentifier, forceRefetch = false) {
    if (!ayahGlobalNumber || !audioEditionIdentifier) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
          message: "Ayah number and audio edition are required for getAyahAudioInfo.",
          origin: "AyahAudioRetriever.getAyahAudioInfo",
          context: { ayahGlobalNumber, audioEditionIdentifier }
      });
      return null;
    }

    const cacheKey = `${ayahGlobalNumber}-${audioEditionIdentifier}`;
    if (!forceRefetch && audioInfoCache.has(cacheKey)) {
      const cachedInfo = audioInfoCache.get(cacheKey);
      // console.debug(`[AyahAudioRetriever] Returning cached audio info for Ayah ${ayahGlobalNumber}, edition ${audioEditionIdentifier}`);
      dependencies.eventAggregator.publish(EVENTS.AYAH_AUDIO_READY, { ...cachedInfo, ayahGlobalNumber });
      return { ...cachedInfo, ayahGlobalNumber };
    }

    // dependencies.stateStore?.dispatch(ACTIONS.SET_LOADING, true); // Optionally show global spinner

    try {
      const ayahDataWithTimings = await quranApiClient.getAyahWordTimings(
        ayahGlobalNumber,
        audioEditionIdentifier,
        dependencies.errorLogger
      );

      if (!ayahDataWithTimings || !ayahDataWithTimings.audio) {
        (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
          message: `Audio data or URL not found in API response for Ayah ${ayahGlobalNumber}, edition ${audioEditionIdentifier}.`,
          origin: 'AyahAudioRetriever.getAyahAudioInfo',
          context: { ayahGlobalNumber, audioEditionIdentifier, responseData: ayahDataWithTimings }
        });
        throw new Error(`Audio data or URL not found for Ayah ${ayahGlobalNumber}.`);
      }
      
      const audioUrl = ayahDataWithTimings.audio; // API response includes audio URL

      // Process segments into WordTiming structure
      let wordTimings = [];
      if (ayahDataWithTimings.segments && Array.isArray(ayahDataWithTimings.segments)) {
        wordTimings = ayahDataWithTimings.segments.map(segment => ({
          text: segment[0],       // word_text
          startTime: segment[1],  // start_time_ms
          endTime: segment[2]     // end_time_ms
        }));
      } else {
         (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
          message: `No segments (word timings) found in API response for Ayah ${ayahGlobalNumber}, edition ${audioEditionIdentifier}. Word-level sync will not be available.`,
          origin: 'AyahAudioRetriever.getAyahAudioInfo',
          context: { ayahGlobalNumber, audioEditionIdentifier, responseData: ayahDataWithTimings }
        });
      }

      // Get total duration. API might provide it, or we might need to calculate it or use _getAudioDuration.
      // For now, assume API doesn't provide total duration directly in this response, or it's unreliable.
      // So, we'll fetch it using _getAudioDuration.
      // In a future optimization, if `ayahDataWithTimings.duration` exists and is reliable, use it.
      let duration = await _getAudioDuration(audioUrl); // duration in seconds

      if (duration === null || isNaN(duration) || duration <= 0) {
         (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
            message: `Failed to determine valid audio duration for Ayah ${ayahGlobalNumber}, URL: ${audioUrl}. Using placeholder.`,
            origin: "AyahAudioRetriever.getAyahAudioInfo",
            context: { ayahGlobalNumber, audioUrl, obtainedDuration: duration }
        });
        duration = wordTimings.length > 0 ? (wordTimings[wordTimings.length -1].endTime / 1000) + 0.5 : 5; // Fallback: last word end time + buffer, or 5s
      }

      const ayahAudioDetails = {
        url: audioUrl,
        duration: duration, // seconds
        words: wordTimings, // ms
        ayahGlobalNumber: ayahGlobalNumber
      };
      
      // Cache the processed details (excluding ayahGlobalNumber for generic cache value)
      audioInfoCache.set(cacheKey, {
        url: audioUrl,
        duration: duration,
        words: wordTimings
      });

      dependencies.eventAggregator.publish(EVENTS.AYAH_AUDIO_READY, ayahAudioDetails);
      // console.debug(`[AyahAudioRetriever] Audio details ready for Ayah ${ayahGlobalNumber}`, ayahAudioDetails);
      return ayahAudioDetails;

    } catch (error) {
      // Error logging is handled by quranApiClient or within this try-catch for specific issues.
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error, // This might be the original error from quranApiClient or a new one thrown here
        message: `Failed to get full audio info (with timings) for Ayah ${ayahGlobalNumber}, edition ${audioEditionIdentifier}. Error: ${error.message}`,
        origin: 'AyahAudioRetriever.getAyahAudioInfo' // Keep origin specific
      });
      return null;
    } finally {
      // dependencies.stateStore?.dispatch(ACTIONS.SET_LOADING, false);
    }
  }

  // _fetchAyahAudioURL is no longer directly used by getAyahAudioInfo but might be useful for other specific tasks
  // or if getAyahWordTimings fails and we want a simpler fallback. For now, it's unused.
  // Consider removing if it's confirmed to be fully replaced by getAyahWordTimings logic.
  // For this task, we'll leave it as it might be part of other flows or future fallbacks.

  /**
   * Pre-fetches audio info for a list of Ayahs.
   * @param {Array<number>} ayahGlobalNumbers - Array of global Ayah numbers.
   * @param {string} audioEditionIdentifier - The audio edition.
   */
  async function preloadAyahAudioInfos(ayahGlobalNumbers, audioEditionIdentifier) {
    if (!Array.isArray(ayahGlobalNumbers) || !audioEditionIdentifier) return;

    // console.debug(`[AyahAudioRetriever] Preloading audio info for ${ayahGlobalNumbers.length} Ayahs, edition ${audioEditionIdentifier}`);
    const promises = ayahGlobalNumbers.map(num =>
      getAyahAudioInfo(num, audioEditionIdentifier).catch(e => null) // Catch individual errors so one doesn't stop all
    );
    // We don't strictly need to await all here if they publish events,
    // but it might be useful if a calling function needs to know when all preloading attempts are done.
    await Promise.allSettled(promises);
    // console.debug(`[AyahAudioRetriever] Preloading attempts finished for ${ayahGlobalNumbers.length} Ayahs.`);
  }

  /**
   * Clears the internal audio info cache.
   */
  function clearCache() {
    audioInfoCache.clear();
    // console.info('[AyahAudioRetriever] Audio info cache cleared.');
  }
  
  function _setDependencies(injectedDeps) {
      if(injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
      if(injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
      if(injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
  }

  return {
    _setDependencies,
    getAyahAudioInfo,
    preloadAyahAudioInfos,
    clearCache,
  };

})(); // IIFE removed


/**
 * Initialization function for the AyahAudioRetriever.
 * @param {object} dependencies
 * @param {import('../../core/state-store.js').default} dependencies.stateStore
 * @param {import('../../core/event-aggregator.js').default} dependencies.eventAggregator
 * @param {import('../../core/error-logger.js').default} dependencies.errorLogger
 */
export function initializeAyahAudioRetriever(dependencies) {
  ayahAudioRetriever._setDependencies(dependencies); // Set internal dependencies
  // console.info('[AyahAudioRetriever] Initialized.');

  // This module primarily provides utility functions.
  // It doesn't have ongoing subscriptions or UI elements to manage here directly usually.
  // The event aggregator subscription for project/selection changes would happen in a
  // higher-level "controller" or "engine" that uses this retriever.

  // Return the public API.
  return {
    getAyahAudioInfo: ayahAudioRetriever.getAyahAudioInfo,
    preloadAyahAudioInfos: ayahAudioRetriever.preloadAyahAudioInfos,
    clearCache: ayahAudioRetriever.clearCache,
  };
}

export default ayahAudioRetriever;
