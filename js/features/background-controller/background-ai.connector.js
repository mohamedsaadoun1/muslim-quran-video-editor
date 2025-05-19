// js/features/background-controller/background-ai.connector.js

import { ACTIONS, EVENTS } from '../config/app.constants.js';
// (assume pexelsApiClient is available globally if not injected, or needs specific import/injection setup)
// import pexelsApiClient from '../../services/pexels.api.client.js';

const backgroundAIConnector = (() => {
  let dependencies = {
    stateStore: {
        getState: () => ({ currentProject: { background: { aiSuggestions: [] } } }), // Path to AI suggestions in state
        dispatch: () => {}
    },
    eventAggregator: { publish: () => {} },
    errorLogger: console,
    pexelsAPI: { // This will be the pexels.api.client.js instance/API
        isConfigured: () => false,
        searchPhotos: async () => ({ photos: [], total_results: 0 }),
        searchVideos: async () => ({ videos: [], total_results: 0 }),
    },
    // localizationService: { translate: key => key }
  };

  const MAX_SUGGESTIONS_PHOTOS = 8;
  const MAX_SUGGESTIONS_VIDEOS = 4;

  /**
   * Fetches image and video suggestions from Pexels based on a query.
   * Updates the state store with the suggestions and publishes an event.
   * @param {string} query - The search query (e.g., "nature peaceful", "islamic art").
   * @param {'image' | 'video' | 'both'} [searchType='both'] - Type of media to search for.
   * @returns {Promise<{photos: Array<object>, videos: Array<object>}>} Object containing arrays of photos and videos.
   */
  async function fetchSuggestions(query, searchType = 'both') {
    if (!dependencies.pexelsAPI || !dependencies.pexelsAPI.isConfigured()) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'Pexels API client is not configured. Cannot fetch AI background suggestions.',
        origin: 'BackgroundAIConnector.fetchSuggestions'
      });
      // Dispatch empty suggestions or error state
      dependencies.stateStore.dispatch(ACTIONS.SET_AI_SUGGESTIONS, { photos: [], videos: [], query, error: 'Pexels API not configured' });
      dependencies.eventAggregator.publish(EVENTS.AI_SUGGESTIONS_FAILED, 'Pexels API not configured');
      return { photos: [], videos: [] };
    }

    if (!query || typeof query !== 'string' || !query.trim()) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'A valid query is required to fetch AI background suggestions.',
        origin: 'BackgroundAIConnector.fetchSuggestions'
      });
      dependencies.stateStore.dispatch(ACTIONS.SET_AI_SUGGESTIONS, { photos: [], videos: [], query, error: 'Invalid query' });
      dependencies.eventAggregator.publish(EVENTS.AI_SUGGESTIONS_FAILED, 'Invalid query');
      return { photos: [], videos: [] };
    }

    // Dispatch an action to indicate loading started
    // dependencies.stateStore.dispatch(ACTIONS.SET_LOADING_AI_SUGGESTIONS, true); // Define this action
    dependencies.stateStore.dispatch(ACTIONS.SET_AI_SUGGESTIONS, { photos: [], videos: [], query, isLoading: true });
    dependencies.eventAggregator.publish(EVENTS.AI_SUGGESTIONS_LOADING, { query }); // Define this event


    let photoResults = { photos: [], total_results: 0 };
    let videoResults = { videos: [], total_results: 0 };
    let fetchError = null;

    try {
      const commonOptions = {
        per_page: searchType === 'both' ? Math.max(MAX_SUGGESTIONS_PHOTOS, MAX_SUGGESTIONS_VIDEOS) :
                    (searchType === 'image' ? MAX_SUGGESTIONS_PHOTOS : MAX_SUGGESTIONS_VIDEOS),
        page: 1,
        orientation: 'landscape', // Default for general backgrounds
      };

      const promises = [];
      if (searchType === 'image' || searchType === 'both') {
        promises.push(
          dependencies.pexelsAPI.searchPhotos(query, { ...commonOptions, per_page: MAX_SUGGESTIONS_PHOTOS }, dependencies.errorLogger)
            .then(res => photoResults = res)
            .catch(err => {
                (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
                    error: err, message: `Failed to fetch photo suggestions from Pexels for query: ${query}`,
                    origin: 'BackgroundAIConnector.fetchSuggestions.photos'
                });
                // photoResults remains empty, error will be handled globally below
            })
        );
      }
      if (searchType === 'video' || searchType === 'both') {
        promises.push(
          dependencies.pexelsAPI.searchVideos(query, { ...commonOptions, per_page: MAX_SUGGESTIONS_VIDEOS, size: 'medium' }, dependencies.errorLogger)
            .then(res => videoResults = res)
            .catch(err => {
                (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
                    error: err, message: `Failed to fetch video suggestions from Pexels for query: ${query}`,
                    origin: 'BackgroundAIConnector.fetchSuggestions.videos'
                });
                // videoResults remains empty
            })
        );
      }

      await Promise.allSettled(promises); // Wait for all searches to complete or fail

      // Process and limit results
      const finalPhotos = (photoResults.photos || []).slice(0, MAX_SUGGESTIONS_PHOTOS).map(p => ({
        id: p.id,
        type: 'image',
        url: p.src?.landscape || p.src?.large || p.src?.original, // Prefer landscape or large sizes
        thumbnailUrl: p.src?.small || p.src?.tiny,
        photographer: p.photographer,
        photographerUrl: p.photographer_url,
        alt: p.alt || query, // Pexels API now requires alt for photos
      }));

      const finalVideos = (videoResults.videos || []).slice(0, MAX_SUGGESTIONS_VIDEOS).map(v => ({
        id: v.id,
        type: 'video',
        // Find a suitable video file link (e.g., HD or medium quality mp4)
        url: (v.video_files.find(f => f.quality === 'hd' && f.file_type === 'video/mp4')?.link) ||
             (v.video_files.find(f => f.quality === 'sd' && f.file_type === 'video/mp4')?.link) ||
             (v.video_files.find(f => f.file_type === 'video/mp4')?.link) || // Any mp4
             v.video_files[0]?.link, // Fallback to first available
        thumbnailUrl: v.image || v.video_pictures?.[0]?.picture, // Poster image
        duration: v.duration,
        photographer: v.user?.name,
        photographerUrl: v.user?.url,
      }));

      if (finalPhotos.length === 0 && finalVideos.length === 0 && (promises.length > 0)) {
          // This means searches were attempted but yielded no results or all failed.
          fetchError = 'No suggestions found or an error occurred during fetch.';
          // Let errorLogger handle individual promise rejections. This is a summary.
      }

      const suggestionsPayload = {
        photos: finalPhotos,
        videos: finalVideos,
        query,
        isLoading: false,
        error: fetchError,
        timestamp: Date.now()
      };
      
      dependencies.stateStore.dispatch(ACTIONS.SET_AI_SUGGESTIONS, suggestionsPayload);
      dependencies.eventAggregator.publish(EVENTS.AI_SUGGESTIONS_UPDATED, suggestionsPayload);
      // console.debug(`[BackgroundAIConnector] Suggestions fetched for query "${query}":`, suggestionsPayload);
      return { photos: finalPhotos, videos: finalVideos };

    } catch (error) { // Catch errors not caught by individual promises (e.g., if _request itself throws early)
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error,
        message: `Overall error fetching AI background suggestions for query: ${query}. ${error.message}`,
        origin: 'BackgroundAIConnector.fetchSuggestions'
      });
      const errorPayload = { photos: [], videos: [], query, isLoading: false, error: error.message || 'Unknown fetch error' };
      dependencies.stateStore.dispatch(ACTIONS.SET_AI_SUGGESTIONS, errorPayload);
      dependencies.eventAggregator.publish(EVENTS.AI_SUGGESTIONS_FAILED, errorPayload.error);
      return { photos: [], videos: [] };
    }
  }
  
  /**
   * Clears the current AI suggestions from the state.
   */
  function clearSuggestions() {
    const clearPayload = { photos: [], videos: [], query: null, isLoading: false, error: null };
    dependencies.stateStore.dispatch(ACTIONS.SET_AI_SUGGESTIONS, clearPayload);
    dependencies.eventAggregator.publish(EVENTS.AI_SUGGESTIONS_UPDATED, clearPayload);
    // console.debug('[BackgroundAIConnector] AI suggestions cleared.');
  }


  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.pexelsAPI) dependencies.pexelsAPI = injectedDeps.pexelsAPI;
    // if (injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService;
  }

  return {
    _setDependencies,
    fetchSuggestions,
    clearSuggestions,
    isPexelsConfigured: () => dependencies.pexelsAPI ? dependencies.pexelsAPI.isConfigured() : false,
  };

})(); // IIFE removed.

/**
 * Initialization function for the BackgroundAIConnector.
 * @param {object} deps
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../core/event-aggregator.js').default} deps.eventAggregator
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * @param {import('../../services/pexels.api.client.js').default} deps.pexelsAPI - The initialized Pexels API client.
 * // @param {import('../../core/localization.service.js').default} [deps.localizationService]
 */
export function initializeBackgroundAIConnector(deps) {
  backgroundAIConnector._setDependencies(deps); // Set internal dependencies

  // This module doesn't typically manage its own DOM elements or subscribe to general UI events directly.
  // It's a service called by other UI modules (e.g., background-ai-suggest.ui.js).

  // console.info('[BackgroundAIConnector] Initialized.');
  return { // Expose the public API
    fetchSuggestions: backgroundAIConnector.fetchSuggestions,
    clearSuggestions: backgroundAIConnector.clearSuggestions,
    isPexelsConfigured: backgroundAIConnector.isPexelsConfigured,
  };
}

export default backgroundAIConnector; // Export the main object for potential direct use
