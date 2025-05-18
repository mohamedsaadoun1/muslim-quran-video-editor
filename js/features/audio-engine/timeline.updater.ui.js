// js/features/audio-engine/timeline.updater.ui.js

import DOMElements from '../../core/dom-elements.js';
import { EVENTS } from '../../config/app.constants.js';
import timeFormatter from '../../utils/time.formatter.js'; // Ensure this path is correct

const timelineUpdaterUI = (() => {
  let timelineSlider = null;
  let currentTimeDisplay = null;
  let totalTimeDisplay = null;
  let isUserSeeking = false; // Flag to prevent UI updates while user is dragging

  let dependencies = {
    eventAggregator: { publish: () => {}, subscribe: () => ({ unsubscribe: () => {} }) },
    errorLogger: console,
    // mainPlaybackAPI will be used to notify about seek events if not using eventAggregator for it.
    mainPlaybackAPI: { seek: (percentage) => {} } // Fallback/Placeholder
  };

  /**
   * Updates the timeline UI elements.
   * @private
   * @param {object} timelineData
   * @param {number} timelineData.currentTime - Current playback time in seconds.
   * @param {number} timelineData.duration - Total duration of the current audio in seconds.
   * @param {number} timelineData.progressPercent - Current progress as a percentage (0-100).
   */
  function _updateTimelineDisplay({ currentTime, duration, progressPercent }) {
    if (isUserSeeking) return; // Don't update if user is actively seeking

    if (timelineSlider && !isNaN(progressPercent)) {
      timelineSlider.value = progressPercent;
    }
    if (currentTimeDisplay && !isNaN(currentTime)) {
      currentTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(currentTime);
    }
    // totalTimeDisplay is often updated once when metadata loads,
    // but if it's part of the event, update it too.
    if (totalTimeDisplay && !isNaN(duration)) {
      // Only update if it's different to avoid flicker, or if it's the first time
      if (totalTimeDisplay.dataset.currentDuration !== String(duration)) {
          totalTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(duration);
          totalTimeDisplay.dataset.currentDuration = String(duration); // Store to prevent flicker
      }
    }
  }

  /**
   * Handles the 'input' event on the timeline slider (when user is dragging).
   * @private
   */
  function _handleTimelineSliderInput() {
    isUserSeeking = true;
    if (timelineSlider && currentTimeDisplay) {
      // Optionally, update currentTimeDisplay while seeking for immediate feedback
      // This requires knowing the total duration.
      // const duration = parseFloat(totalTimeDisplay.dataset.currentDuration); // Get stored duration
      // if (!isNaN(duration) && duration > 0) {
      //   const seekTime = (parseFloat(timelineSlider.value) / 100) * duration;
      //   currentTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(seekTime);
      // }
    }
  }

  /**
   * Handles the 'change' event on the timeline slider (when user releases the mouse).
   * Notifies the main playback controller to seek to the new position.
   * @private
   */
  function _handleTimelineSliderChange() {
    if (timelineSlider) {
      const seekPercentage = parseFloat(timelineSlider.value);
      if (!isNaN(seekPercentage)) {
        // Option 1: Use a method from mainPlaybackAPI (if provided as dependency)
        dependencies.mainPlaybackAPI.seek(seekPercentage);

        // Option 2: Publish an event (if mainPlaybackController listens for it)
        // dependencies.eventAggregator.publish(EVENTS.TIMELINE_SEEK_REQUESTED, seekPercentage); // Define this event
        
        // console.debug(`[TimelineUpdaterUI] User seeked to ${seekPercentage}%`);
      }
    }
    // A short delay before re-enabling UI updates from timeupdate,
    // allows the player to catch up and fire its own timeupdate.
    setTimeout(() => {
        isUserSeeking = false;
    }, 50); // Small delay
  }

  /**
   * Resets the timeline display to its initial state (0:00 / 0:00, slider at 0).
   * Usually called when playback stops or no audio is loaded.
   */
  function resetTimelineDisplay() {
    if (timelineSlider) timelineSlider.value = 0;
    if (currentTimeDisplay) currentTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(0);
    if (totalTimeDisplay) {
        totalTimeDisplay.textContent = timeFormatter.formatSecondsToMMSS(0);
        totalTimeDisplay.dataset.currentDuration = "0";
    }
    isUserSeeking = false;
  }

  function _setDependencies(injectedDeps) {
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.mainPlaybackAPI) dependencies.mainPlaybackAPI = injectedDeps.mainPlaybackAPI;
  }

  // Public API (not much exposed, as it's mostly event-driven and UI manipulation)
  return {
    _setDependencies,
    // resetTimelineDisplay, // Expose if needed to be called externally
  };

})();


/**
 * Initialization function for the TimelineUpdaterUI.
 * @param {object} deps
 * @param {import('../../core/event-aggregator.js').default} deps.eventAggregator
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * @param {object} deps.mainPlaybackAPI - The API returned by initializeMainPlaybackController,
 *                                        specifically needing a `seek(percentage)` method.
 */
export function initializeTimelineUpdaterUI(deps) {
  timelineUpdaterUI._setDependencies(deps); // Set internal dependencies

  const { eventAggregator, errorLogger } = deps;

  timelineUpdaterUI.timelineSliderRef = DOMElements.timelineSlider; // Cache for direct access by event handlers
  timelineUpdaterUI.currentTimeDisplayRef = DOMElements.currentTimeDisplay;
  timelineUpdaterUI.totalTimeDisplayRef = DOMElements.totalTimeDisplay;
  
  if (!timelineUpdaterUI.timelineSliderRef || !timelineUpdaterUI.currentTimeDisplayRef || !timelineUpdaterUI.totalTimeDisplayRef) {
    (errorLogger.logWarning || console.warn).call(errorLogger, {
      message: 'One or more timeline UI elements not found in DOMElements. Timeline UI will not function.',
      origin: 'initializeTimelineUpdaterUI'
    });
    return { cleanup: () => {} }; // Return no-op API
  }
  
  // Use local references to avoid `this` issues if internal functions are called directly
  const slider = timelineUpdaterUI.timelineSliderRef;
  const currentTimeEl = timelineUpdaterUI.currentTimeDisplayRef;
  const totalTimeEl = timelineUpdaterUI.totalTimeDisplayRef;
  let localIsUserSeeking = false; // Local scope for event handlers


  const updateDisplay = ({ currentTime, duration, progressPercent }) => {
    if (localIsUserSeeking) return;
    if (slider && !isNaN(progressPercent)) slider.value = progressPercent;
    if (currentTimeEl && !isNaN(currentTime)) currentTimeEl.textContent = timeFormatter.formatSecondsToMMSS(currentTime);
    if (totalTimeEl && !isNaN(duration)) {
      if (totalTimeEl.dataset.currentDuration !== String(duration)) {
        totalTimeEl.textContent = timeFormatter.formatSecondsToMMSS(duration);
        totalTimeEl.dataset.currentDuration = String(duration);
      }
    }
  };

  const handleSliderInput = () => { localIsUserSeeking = true; };
  const handleSliderChange = () => {
    if (slider) {
      const seekPercentage = parseFloat(slider.value);
      if (!isNaN(seekPercentage)) {
        deps.mainPlaybackAPI.seek(seekPercentage);
      }
    }
    setTimeout(() => { localIsUserSeeking = false; }, 50);
  };

  const resetDisplay = () => {
    if (slider) slider.value = 0;
    if (currentTimeEl) currentTimeEl.textContent = timeFormatter.formatSecondsToMMSS(0);
    if (totalTimeEl) {
        totalTimeEl.textContent = timeFormatter.formatSecondsToMMSS(0);
        totalTimeEl.dataset.currentDuration = "0";
    }
    localIsUserSeeking = false;
  };


  // Subscribe to timeline updates from the playback controller
  const unsubscribeTimelineUpdate = eventAggregator.subscribe(EVENTS.TIMELINE_UPDATED, updateDisplay);
  
  // Subscribe to playlist end or stop events to reset the timeline
  const unsubscribePlaylistEnded = eventAggregator.subscribe(EVENTS.PLAYLIST_ENDED, resetDisplay);
  const unsubscribePlaybackStopped = eventAggregator.subscribe(EVENTS.PLAYBACK_STATE_CHANGED, (isPlaying) => {
      if (!isPlaying) {
          // Only reset if current time is near zero and duration known, otherwise it's just a pause
          const currentProject = deps.stateStore?.getState().currentProject; // Need stateStore for this logic
          const mainAudioPlayer = DOMElements.mainAudioPlayer;
          if (mainAudioPlayer && mainAudioPlayer.currentTime < 0.5 && !currentProject) { // Crude check for 'stop' vs 'pause'
            resetDisplay();
          } else if (!currentProject) { // No project, so reset
            resetDisplay();
          }
      }
  });


  // Attach event listeners to the timeline slider
  slider.addEventListener('input', handleSliderInput);   // User is dragging
  slider.addEventListener('change', handleSliderChange); // User released mouse

  // Set initial state
  resetDisplay();

  // console.info('[TimelineUpdaterUI] Initialized and event listeners attached.');

  return {
    reset: resetDisplay, // Expose reset if needed by other modules
    cleanup: () => {
      unsubscribeTimelineUpdate.unsubscribe();
      unsubscribePlaylistEnded.unsubscribe();
      unsubscribePlaybackStopped.unsubscribe();
      if (slider) {
        slider.removeEventListener('input', handleSliderInput);
        slider.removeEventListener('change', handleSliderChange);
      }
      // console.info('[TimelineUpdaterUI] Cleaned up event listeners and subscriptions.');
    }
  };
}

// Exporting the raw object is less useful here as setup is key.
export default timelineUpdaterUI;
