// js/features/audio-engine/main-playback.controller.js

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, EVENTS, DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';
import timeFormatter from '../../utils/time.formatter.js'; // Assuming you have formatSecondsToMMSS

const mainPlaybackController = (() => {
  /**
   * @typedef {Object} PlaylistItem
   * @property {number} ayahGlobalNumber - Global Quran Ayah number.
   * @property {string | null} audioUrl - URL for the audio of this Ayah.
   * @property {number | null} duration - Duration of this Ayah's audio in seconds.
   * @property {boolean} isReady - True if audioUrl and duration are known.
   * @property {string} text - Ayah text (for display or logging, optional here).
   * @property {string} surahName - Name of the Surah this Ayah belongs to (optional).
   * @property {number} numberInSurah - Ayah number within its Surah (optional).
   */

  let mainAudioPlayer = null; // DOMElements.mainAudioPlayer
  let playlist = []; // Array of PlaylistItem
  let currentPlaylistIndex = -1;
  let isPlaying = false;
  let isSeeking = false; // Flag to indicate if user is currently dragging the timeline slider
  let interAyahDelayTimer = null; // Timer for delay between Ayahs

  // To store injected dependencies
  let dependencies = {
    stateStore: { getState: () => ({ currentProject: null }), dispatch: () => {}, subscribe: () => (() => {}) },
    eventAggregator: { publish: () => {}, subscribe: () => ({ unsubscribe: () => {} }) },
    errorLogger: console,
    ayahAudioServiceAPI: { getAyahAudioInfo: async () => null, preloadAyahAudioInfos: async () => {} },
    // backgroundAudioAPI: { play: () => {}, pause: () => {} } // Optional
  };

  /** Sets up the main audio player element and its event listeners. @private */
  function _setupAudioPlayer() {
    mainAudioPlayer = DOMElements.mainAudioPlayer;
    if (!mainAudioPlayer) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        message: 'Main audio player element not found in DOMElements. Playback will not function.',
        origin: 'MainPlaybackController._setupAudioPlayer',
        severity: 'error'
      });
      return;
    }

    mainAudioPlayer.onplay = () => _handlePlaybackStateChange(true);
    mainAudioPlayer.onpause = () => _handlePlaybackStateChange(false);
    mainAudioPlayer.onended = _handleAyahEnded;
    mainAudioPlayer.ontimeupdate = _handleTimeUpdate;
    mainAudioPlayer.onloadedmetadata = _handleLoadedMetadata;
    mainAudioPlayer.onerror = _handleAudioError;
    mainAudioPlayer.onwaiting = () => dependencies.stateStore.dispatch(ACTIONS.SET_LOADING, true);
    mainAudioPlayer.oncanplay = () => dependencies.stateStore.dispatch(ACTIONS.SET_LOADING, false);
    mainAudioPlayer.onstalled = () => { /* May indicate network issue, log warning */
        (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
            message: "Audio stalled, possibly due to network issues.",
            origin: 'MainPlaybackController.audio.onstalled',
            context: { src: mainAudioPlayer.src }
        });
        dependencies.stateStore.dispatch(ACTIONS.SET_LOADING, true); // Show spinner as it tries to buffer
    };

    // Also listen for Ayah audio data being ready
    dependencies.eventAggregator.subscribe(EVENTS.AYAH_AUDIO_READY, _handleAyahAudioReady);
  }

  /** Handles state changes for play/pause and notifies system. @private */
  function _handlePlaybackStateChange(playing) {
    if (isPlaying === playing) return; // No actual change
    isPlaying = playing;
    dependencies.stateStore.dispatch(ACTIONS.SET_MAIN_PLAYBACK_STATE, isPlaying); // Define this ACTION
    dependencies.eventAggregator.publish(EVENTS.PLAYBACK_STATE_CHANGED, isPlaying ? 'playing' : 'paused');

    // Update Play/Pause button UI (this should be in editor-shell/playback-control-strip.ui.js listening to state/event)
    if (DOMElements.playPauseMainBtn) {
        DOMElements.playPauseMainBtn.innerHTML = isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        DOMElements.playPauseMainBtn.title = isPlaying ? 'إيقاف مؤقت' : 'تشغيل'; // Needs localization
    }
    
    // Optionally control background audio
    // if (isPlaying) dependencies.backgroundAudioAPI?.play();
    // else dependencies.backgroundAudioAPI?.pause();
  }

  /** Called when an Ayah's audio finishes playing. @private */
  function _handleAyahEnded() {
    // dependencies.eventAggregator.publish(EVENTS.AYAH_PLAYBACK_ENDED, { ayahGlobalNumber: playlist[currentPlaylistIndex]?.ayahGlobalNumber });
    if (isPlaying) { // Only proceed if it was intentionally playing (not ended due to pause/stop)
        playNextAyahWithDelay();
    }
  }

  /** Updates the timeline UI during playback. @private */
  function _handleTimeUpdate() {
    if (!mainAudioPlayer || isSeeking || !isPlaying) return; // Don't update if user is dragging slider or not playing
    const currentTime = mainAudioPlayer.currentTime;
    const duration = mainAudioPlayer.duration;

    if (!isNaN(duration) && duration > 0) {
        const progressPercent = (currentTime / duration) * 100;
        if (DOMElements.timelineSlider) DOMElements.timelineSlider.value = progressPercent;
        if (DOMElements.currentTimeDisplay) DOMElements.currentTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(currentTime);
        // Also publish event for other listeners (e.g., canvas renderer for active word highlighting)
        dependencies.eventAggregator.publish(EVENTS.TIMELINE_UPDATED, { currentTime, duration, progressPercent });
    }
  }

  /** Updates total time display when new audio metadata is loaded. @private */
  function _handleLoadedMetadata() {
    if (!mainAudioPlayer) return;
    const duration = mainAudioPlayer.duration;
    if (!isNaN(duration) && duration > 0) {
        if (DOMElements.totalTimeDisplay) DOMElements.totalTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(duration);
        if (DOMElements.timelineSlider) DOMElements.timelineSlider.max = 100; // Value is percentage

        // Update duration in current playlist item if it was initially null
        if (currentPlaylistIndex >= 0 && currentPlaylistIndex < playlist.length) {
            const item = playlist[currentPlaylistIndex];
            if (item && item.isReady && item.duration === null && mainAudioPlayer.src === item.audioUrl) {
                item.duration = duration;
                // Optionally, re-cache this with ayahAudioRetriever if it allows updating cache
            }
        }
    }
     dependencies.stateStore.dispatch(ACTIONS.SET_LOADING, false); // Hide spinner after metadata loaded
  }

  /** Handles errors from the audio element. @private */
  function _handleAudioError() {
    _handlePlaybackStateChange(false); // Ensure UI updates to paused
    if (mainAudioPlayer && mainAudioPlayer.error) {
      dependencies.errorLogger.handleError({
        error: mainAudioPlayer.error, // Pass the MediaError object
        message: `Main audio player error: Code ${mainAudioPlayer.error.code}. Message: ${mainAudioPlayer.error.message}`,
        origin: 'MainPlaybackController._handleAudioError',
        context: { src: mainAudioPlayer.src, currentAyah: playlist[currentPlaylistIndex]?.ayahGlobalNumber }
      });
    }
    // Optionally, try to play the next Ayah or stop entirely.
    // For now, just stop and log.
    stopPlayback();
  }

  /** Called when AYAH_AUDIO_READY event is published by ayahAudioRetriever. @private */
  function _handleAyahAudioReady(audioInfo) {
    if (!audioInfo || audioInfo.url === null || audioInfo.duration === null) {
        // (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        //     message: `Received AYAH_AUDIO_READY event with incomplete data for Ayah ${audioInfo?.ayahGlobalNumber}. Cannot prepare for playback.`,
        //     origin: "MainPlaybackController._handleAyahAudioReady",
        //     context: { audioInfo }
        // });
        return;
    }

    const itemIndex = playlist.findIndex(item => item.ayahGlobalNumber === audioInfo.ayahGlobalNumber);
    if (itemIndex > -1) {
      playlist[itemIndex].audioUrl = audioInfo.url;
      playlist[itemIndex].duration = audioInfo.duration;
      playlist[itemIndex].isReady = true;
      // console.debug(`[MainPlaybackController] Audio ready for playlist Ayah: ${audioInfo.ayahGlobalNumber}`, playlist[itemIndex]);

      // If this is the current Ayah and we were waiting for it, and play was requested, start playing.
      if (itemIndex === currentPlaylistIndex && !isPlaying && mainAudioPlayer && !mainAudioPlayer.src) {
          // This logic needs to be tied to a "pendingPlay" state if user hits play before audio is ready.
          // For now, assume playAyahAtIndex will be called.
      }
    }
  }
  
  /** Prepares the playlist based on current project's Quran selection. @private */
  async function _buildPlaylist() {
    playlist = [];
    currentPlaylistIndex = -1;
    if (mainAudioPlayer) mainAudioPlayer.src = ''; // Clear current audio source

    const project = dependencies.stateStore.getState().currentProject;
    if (!project || !project.quranSelection || !project.quranSelection.surahId) {
      // console.debug('[MainPlaybackController] No project or Quran selection, playlist is empty.');
      dependencies.eventAggregator.publish(EVENTS.PLAYLIST_UPDATED, []); // Publish empty playlist
      _updateTimelineForNoAudio();
      return;
    }

    const { surahId, startAyah, endAyah, reciterId } = project.quranSelection;
    // quran-verse-analyzer.js should provide a function to get global ayah numbers
    // For now, let's assume a simple direct mapping (needs refinement based on Quran structure data)
    // This requires knowledge of how many ayahs are in surahs before the current one.
    // Or, the ayahAudioServiceAPI can take surahId and numberInSurah.
    // Let's assume quran.data.cache can give global numbers.

    const ayahNumbersToLoad = []; // Array of { globalAyahNumber, text, surahName, numberInSurah }
    // This part needs `quran-data.cache.js` or similar to get the actual Ayah texts and construct global numbers correctly.
    // For demonstration, a placeholder:
    try {
        // const quranDataProvider = dependencies.quranDataCacheAPI; // If injected
        // const ayahsDetails = await quranDataProvider.getAyahsDetailsForRange(surahId, startAyah, endAyah);
        // For now, a loop for placeholder global numbers:
        for (let i = startAyah; i <= endAyah; i++) {
            // Placeholder: This calculation of globalAyahNumber is incorrect and needs proper Quran metadata.
            // Let's assume for now `i` itself is a temporary reference, and we pass Surah + AyahInSurah.
            // OR `ayahAudioServiceAPI` can handle `surahId:numberInSurah` references.
            // The AlQuran.cloud API uses global Ayah number in `/ayah/{number}`.
            // This part (mapping surah/ayahInSurah to global number) is CRITICAL and often complex.
            // We'll assume `quran-verse-analyzer.js` would provide `getGlobalAyahNumber(surahId, ayahNumInSurah)`.
            // For this example, let's just simulate some numbers if start/end are global.
            
            // If ayahAudioServiceAPI is smart enough to take "S:A" like "2:255":
             const ayahRef = `${surahId}:${i}`; // Use this format if getAyahAudioInfo supports it

            ayahNumbersToLoad.push({
                // For API calls needing global num, this ref needs to be resolved.
                // The `ayahAudioRetriever` might need to be smarter, or we use a separate function for this mapping.
                ayahGlobalNumber: ayahRef, // Placeholder - API will need correct format for `ayahRef`
                audioUrl: null,
                duration: null,
                isReady: false,
                text: `آية ${i} من سورة ${surahId}`, // Placeholder
                surahName: `سورة ${surahId}`, // Placeholder
                numberInSurah: i
            });
        }
    } catch(e) {
        (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
            error: e, message: 'Failed to build ayahs list for playlist.', origin: 'MainPlaybackController._buildPlaylist'
        });
        return;
    }


    playlist = ayahNumbersToLoad;
    // console.debug(`[MainPlaybackController] Playlist built with ${playlist.length} items. Fetching audio info...`);
    dependencies.eventAggregator.publish(EVENTS.PLAYLIST_UPDATED, playlist); // Publish playlist structure
    _updateTimelineForNoAudio(); // Reset timeline

    if (playlist.length > 0 && reciterId) {
      // Preload audio info for all items in the playlist
      const refsToLoad = playlist.map(item => item.ayahGlobalNumber);
      dependencies.ayahAudioServiceAPI.preloadAyahAudioInfos(refsToLoad, reciterId);
    }
  }
  
  function _updateTimelineForNoAudio() {
    if (DOMElements.timelineSlider) DOMElements.timelineSlider.value = 0;
    if (DOMElements.currentTimeDisplay) DOMElements.currentTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(0);
    if (DOMElements.totalTimeDisplay) DOMElements.totalTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(0);
  }

  /** Plays the Ayah at the given playlist index. @private */
  async function _playAyahAtIndex(index) {
    if (index < 0 || index >= playlist.length) {
      // console.debug('[MainPlaybackController] Playlist ended or invalid index.');
      stopPlayback(); // Playlist finished
      dependencies.eventAggregator.publish(EVENTS.PLAYLIST_ENDED); // Define this event
      return;
    }
    
    currentPlaylistIndex = index;
    const item = playlist[currentPlaylistIndex];
    
    dependencies.eventAggregator.publish(EVENTS.CURRENT_AYAH_CHANGED, item); // For UI to highlight current ayah

    if (!item.isReady || !item.audioUrl) {
      // console.debug(`[MainPlaybackController] Audio for Ayah ${item.ayahGlobalNumber} not ready, requesting...`);
      // Request it if not already done by preloader, then wait for AYAH_AUDIO_READY or timeout.
      // The AYAH_AUDIO_READY handler might trigger play if this was a pending play.
      // For simplicity here, we assume `getAyahAudioInfo` will fetch if needed.
      const project = dependencies.stateStore.getState().currentProject;
      if (project && project.quranSelection && project.quranSelection.reciterId) {
         await dependencies.ayahAudioServiceAPI.getAyahAudioInfo(item.ayahGlobalNumber, project.quranSelection.reciterId);
         // The _handleAyahAudioReady will update the item, re-check readiness:
         if (!playlist[currentPlaylistIndex].isReady || !playlist[currentPlaylistIndex].audioUrl) {
            (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
                message: `Audio still not ready for Ayah ${item.ayahGlobalNumber} after explicit request. Skipping.`,
                origin: "MainPlaybackController._playAyahAtIndex"
            });
            playNextAyahWithDelay(); // Skip this Ayah
            return;
         }
      } else {
          // No reciter selected, cannot play
          stopPlayback();
          return;
      }
    }

    // Now item should be ready after await or from cache
    const readyItem = playlist[currentPlaylistIndex];
    if (mainAudioPlayer && readyItem.audioUrl) {
      // console.debug(`[MainPlaybackController] Playing Ayah ${readyItem.ayahGlobalNumber}: ${readyItem.audioUrl}`);
      mainAudioPlayer.src = readyItem.audioUrl;
      mainAudioPlayer.load(); // Ensure new src is loaded
      mainAudioPlayer.play().catch(e => _handleAudioError()); // Handle potential play error
      // onplay event will set isPlaying = true
    } else {
       (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
            message: `Cannot play Ayah ${readyItem.ayahGlobalNumber}: No audio URL or player not ready.`,
            origin: "MainPlaybackController._playAyahAtIndex"
       });
       playNextAyahWithDelay(); // Try next
    }
  }

  // --- Public Methods ---
  function playCurrentOrNext() {
    if (interAyahDelayTimer) clearTimeout(interAyahDelayTimer);
    if (isPlaying && mainAudioPlayer && !mainAudioPlayer.paused) {
      // Already playing, do nothing or maybe restart current? For now, do nothing.
      return;
    }
    if (playlist.length === 0) {
        // console.debug('[MainPlaybackController] Attempted to play but playlist is empty.');
        _buildPlaylist().then(() => { // Build playlist if empty
            if (playlist.length > 0) _playAyahAtIndex(0);
        });
        return;
    }
    if (mainAudioPlayer && mainAudioPlayer.paused && mainAudioPlayer.src && currentPlaylistIndex !== -1) {
      // Resume paused audio
      mainAudioPlayer.play().catch(e => _handleAudioError());
    } else {
      // Start from current index or beginning
      _playAyahAtIndex(currentPlaylistIndex >= 0 ? currentPlaylistIndex : 0);
    }
  }

  function pausePlayback() {
    if (interAyahDelayTimer) clearTimeout(interAyahDelayTimer);
    if (mainAudioPlayer && !mainAudioPlayer.paused) {
      mainAudioPlayer.pause();
      // onpause event will set isPlaying = false
    }
  }
  
  function stopPlayback() {
    if (interAyahDelayTimer) clearTimeout(interAyahDelayTimer);
    if (mainAudioPlayer) {
        mainAudioPlayer.pause();
        mainAudioPlayer.currentTime = 0; // Reset time
        mainAudioPlayer.src = ''; // Release audio resource
    }
    _updateTimelineForNoAudio();
    _handlePlaybackStateChange(false); // Explicitly set playing state to false
    currentPlaylistIndex = -1; // Reset playlist position
    // Playlist itself is not cleared here, only on _buildPlaylist or selection change.
  }

  function playNextAyahWithDelay() {
    if (interAyahDelayTimer) clearTimeout(interAyahDelayTimer);
    const project = dependencies.stateStore.getState().currentProject;
    const delaySeconds = project?.quranSelection?.delayBetweenAyahs ?? DEFAULT_PROJECT_SCHEMA.quranSelection.delayBetweenAyahs;
    
    if (currentPlaylistIndex >= playlist.length - 1) { // Last Ayah just finished
        stopPlayback();
        dependencies.eventAggregator.publish(EVENTS.PLAYLIST_ENDED);
        return;
    }

    // dependencies.eventAggregator.publish(EVENTS.INTER_AYAH_DELAY_STARTED, { duration: delaySeconds });
    interAyahDelayTimer = setTimeout(() => {
      _playAyahAtIndex(currentPlaylistIndex + 1);
    }, delaySeconds * 1000);
  }

  function playPreviousAyah() {
    if (interAyahDelayTimer) clearTimeout(interAyahDelayTimer);
    if (currentPlaylistIndex > 0) {
      _playAyahAtIndex(currentPlaylistIndex - 1);
    } else if (playlist.length > 0) {
      _playAyahAtIndex(0); // Replay first if already on first or no valid index
    }
  }

  function seekTimeline(percentage) {
    if (mainAudioPlayer && mainAudioPlayer.duration && !isNaN(mainAudioPlayer.duration)) {
      const newTime = (percentage / 100) * mainAudioPlayer.duration;
      mainAudioPlayer.currentTime = newTime;
      // console.debug(`[MainPlaybackController] Seeked to ${percentage}% (${timeFormatter.formatSecondsToMMSS(newTime)})`);
    }
  }
  
  function _setDependencies(injectedDeps) {
      if(injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
      if(injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
      if(injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
      if(injectedDeps.ayahAudioServiceAPI) dependencies.ayahAudioServiceAPI = injectedDeps.ayahAudioServiceAPI;
      // if(injectedDeps.backgroundAudioAPI) dependencies.backgroundAudioAPI = injectedDeps.backgroundAudioAPI;
  }

  return {
    _setDependencies,
    // _buildPlaylist, // Exposed for init logic or direct control
    play: playCurrentOrNext,
    pause: pausePlayback,
    stop: stopPlayback,
    next: playNextAyahWithDelay, // This one applies delay. For immediate next, call _playAyahAtIndex(current + 1)
    previous: playPreviousAyah,
    seek: seekTimeline,
    // rebuildPlaylistAndPlay: () => _buildPlaylist().then(() => playCurrentOrNext()),
    getIsPlaying: () => isPlaying,
    getCurrentPlaylist: () => [...playlist], // Return a copy
    getCurrentPlaylistItem: () => (currentPlaylistIndex >= 0 && currentPlaylistIndex < playlist.length) ? { ...playlist[currentPlaylistIndex] } : null,
  };

})(); // IIFE removed

/**
 * Initialization function for the MainPlaybackController.
 * @param {object} deps
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../core/event-aggregator.js').default} deps.eventAggregator
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * @param {ReturnType<import('./ayah-audio.retriever.js').initializeAyahAudioRetriever>} deps.ayahAudioServiceAPI
 * // @param {ReturnType<import('./background-audio.mixer.js').initializeBackgroundAudioMixer>} [deps.backgroundAudioAPI]
 */
export function initializeMainPlaybackController(deps) {
  mainPlaybackController._setDependencies(deps);

  // Access _setupAudioPlayer from mainPlaybackController. It must be exposed on the object
  // if the IIFE is removed and we're not using classes.
  // Let's make _setupAudioPlayer a method of the returned object for this pattern.
  mainPlaybackController._setupAudioPlayer = _setupAudioPlayer; // A bit hacky, for current pattern
  mainPlaybackController._buildPlaylist = _buildPlaylist; // Expose for init too
  
  mainPlaybackController._setupAudioPlayer();
  
  // Initial playlist build based on current state
  mainPlaybackController._buildPlaylist();

  // Subscribe to changes in Quran selection to rebuild playlist
  const unsubscribeState = deps.stateStore.subscribe((newState, oldState) => {
    const newSelection = newState.currentProject?.quranSelection;
    const oldSelection = oldState?.currentProject?.quranSelection; // Requires stateStore to provide oldState

    // Simple check: if any core selection param changes, rebuild.
    // A more granular check is better to avoid unnecessary rebuilds if only e.g. delay changes.
    if (newSelection && oldSelection && (
        newSelection.surahId !== oldSelection.surahId ||
        newSelection.startAyah !== oldSelection.startAyah ||
        newSelection.endAyah !== oldSelection.endAyah ||
        newSelection.reciterId !== oldSelection.reciterId
        // Not rebuilding for delayBetweenAyahs change as it's used dynamically
    )) {
        // console.debug('[MainPlaybackController] Quran selection changed, rebuilding playlist.');
        if (mainPlaybackController.getIsPlaying()) {
            mainPlaybackController.stop();
        }
        mainPlaybackController._buildPlaylist();
    } else if (newSelection && !oldSelection && newState.currentProject) { // Project just loaded
        mainPlaybackController._buildPlaylist();
    } else if (!newSelection && oldSelection) { // Project unloaded
        mainPlaybackController.stop();
        mainPlaybackController._buildPlaylist(); // Will build an empty playlist
    }
  });
  
  // (errorLogger would be from deps for these two)
  function _setupAudioPlayer() { /* As defined above in mainPlaybackController closure */ }
  function _buildPlaylist() { /* As defined above in mainPlaybackController closure */ }


  // console.info('[MainPlaybackController] Initialized.');
  return {
    play: mainPlaybackController.play,
    pause: mainPlaybackController.pause,
    stop: mainPlaybackController.stop,
    next: mainPlaybackController.next,
    previous: mainPlaybackController.previous,
    seek: mainPlaybackController.seek,
    getIsPlaying: mainPlaybackController.getIsPlaying,
    getCurrentPlaylistItem: mainPlaybackController.getCurrentPlaylistItem,
    rebuildPlaylist: mainPlaybackController._buildPlaylist, // Expose if needed
    cleanup: () => {
      unsubscribeState();
      mainPlaybackController.stop(); // Stop playback and release resources
      // console.info('[MainPlaybackController] Cleaned up.');
    }
  };
}

export default mainPlaybackController;
