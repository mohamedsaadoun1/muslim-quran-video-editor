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

  // Cache for fetched audio durations to avoid re-processing
  // Key: `${ayahGlobalNumber}-${audioEditionIdentifier}`
  // Value: { url: string, duration: number }
  const audioInfoCache = new Map();


  /**
   * Fetches the audio URL for a given Ayah and audio edition.
   * This typically comes directly from the quranApiClient.
   * @private
   * @param {number} ayahGlobalNumber - The global number of the Ayah in the Quran (1 to 6236).
   * @param {string} audioEditionIdentifier - e.g., 'ar.alafasy'.
   * @returns {Promise<string | null>} The direct audio URL or null.
   */
  async function _fetchAyahAudioURL(ayahGlobalNumber, audioEditionIdentifier) {
    if (!ayahGlobalNumber || !audioEditionIdentifier) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'Ayah number and audio edition are required to fetch audio URL.',
        origin: 'AyahAudioRetriever._fetchAyahAudioURL',
        context: { ayahGlobalNumber, audioEditionIdentifier }
      });
      return null;
    }

    try {
      // The `getAyahAudioData` function is expected to return an object (or array of one object)
      // where each object represents an Ayah and contains an 'audio' property with the URL.
      const ayahData = await quranApiClient.getAyahAudioData(
        ayahGlobalNumber, // Use global Ayah number for the API endpoint
        audioEditionIdentifier,
        dependencies.errorLogger
      );

      // Response might be an array if multiple ayahs were requested, or a single object.
      // Assuming single ayah request for now, or taking the first if array.
      const targetAyah = Array.isArray(ayahData) ? ayahData[0] : ayahData;

      if (targetAyah && targetAyah.audio && typeof targetAyah.audio === 'string') {
        return targetAyah.audio; // This is the direct MP3/audio link
      } else {
        (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
          message: `No direct audio URL found in API response for Ayah ${ayahGlobalNumber}, edition ${audioEditionIdentifier}.`,
          origin: 'AyahAudioRetriever._fetchAyahAudioURL',
          context: { ayahGlobalNumber, audioEditionIdentifier, responseData: targetAyah }
        });
        return null;
      }
    } catch (error) {
      // error already logged by quranApiClient typically
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
          error,
          message: `Failed to fetch audio URL for Ayah ${ayahGlobalNumber}, edition ${audioEditionIdentifier}.`,
          origin: 'AyahAudioRetriever._fetchAyahAudioURL'
      });
      return null;
    }
  }


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
   * Retrieves and prepares audio information (URL and duration) for a specific Ayah.
   * Uses caching to avoid re-fetching or re-processing.
   * Publishes an event (AYAH_AUDIO_READY) when data is available.
   * @param {number} ayahGlobalNumber - The global number of the Ayah (1-6236).
   * @param {string} audioEditionIdentifier - The identifier of the audio edition (e.g., 'ar.alafasy').
   * @param {boolean} [forceRefetch=false] - If true, bypasses cache and refetches data.
   * @returns {Promise<{url: string, duration: number, ayahGlobalNumber: number} | null>}
   *          Audio info or null if an error occurs.
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
      const audioUrl = await _fetchAyahAudioURL(ayahGlobalNumber, audioEditionIdentifier);
      if (!audioUrl) {
        // _fetchAyahAudioURL would have logged the specific error.
        throw new Error(`Audio URL could not be retrieved for Ayah ${ayahGlobalNumber}.`);
      }

      // Now, get the duration.
      const duration = await _getAudioDuration(audioUrl);
      if (duration === null || isNaN(duration) || duration <= 0) {
        // _getAudioDuration would have logged the specific error.
        (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
            message: `Failed to determine valid audio duration for Ayah ${ayahGlobalNumber}, URL: ${audioUrl}. Using placeholder or skipping.`,
            origin: "AyahAudioRetriever.getAyahAudioInfo",
            context: { ayahGlobalNumber, audioUrl, obtainedDuration: duration }
        });
        // Fallback: Maybe try to play it and get duration at runtime, or use a default placeholder duration
        // For now, if duration is not determined, we might fail this Ayah's audio.
        // Or you can decide to proceed with a default duration (e.g. 5 seconds) but that's risky for sync.
        // throw new Error(`Audio duration could not be determined for Ayah ${ayahGlobalNumber}.`);
        // For now, let's publish with a potentially problematic duration to see, but real app would handle better.
        const infoWithProblematicDuration = { url: audioUrl, duration: duration || 5, ayahGlobalNumber }; // 5s default if null
        audioInfoCache.set(cacheKey, { url: audioUrl, duration: duration || 5 });
        dependencies.eventAggregator.publish(EVENTS.AYAH_AUDIO_READY, infoWithProblematicDuration);
        return infoWithProblematicDuration;
      }

      const audioInfo = { url: audioUrl, duration, ayahGlobalNumber };
      audioInfoCache.set(cacheKey, { url: audioUrl, duration }); // Cache without ayahGlobalNumber

      dependencies.eventAggregator.publish(EVENTS.AYAH_AUDIO_READY, audioInfo);
      // console.debug(`[AyahAudioRetriever] Audio info ready for Ayah ${ayahGlobalNumber}`, audioInfo);
      return audioInfo;

    } catch (error) {
      // No need to re-log if it's already from _fetchAyahAudioURL or _getAudioDuration unless adding more context.
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error,
        message: `Failed to get full audio info for Ayah ${ayahGlobalNumber}, edition ${audioEditionIdentifier}. Error: ${error.message}`,
        origin: 'AyahAudioRetriever.getAyahAudioInfo',
      });
      return null;
    } finally {
      // dependencies.stateStore?.dispatch(ACTIONS.SET_LOADING, false);
    }
  }

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
