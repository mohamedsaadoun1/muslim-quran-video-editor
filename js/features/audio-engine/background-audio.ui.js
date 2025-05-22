// js/features/audio-engine/background-audio.ui.js

import { ACTIONS, EVENTS } from '../../config/app.constants.js';
import timeFormatter from '../../utils/time.formatter.js'; // For formatting duration

const backgroundAudioUI = (() => {
  let dependencies = {
    backgroundAudioMixerAPI: null,
    stateStore: null,
    // DOMElements are queried directly for now
    errorLogger: console,
    eventAggregator: null, // Optional, if needed for broader app events
  };

  let uiElements = {
    container: null,
    fileInput: null,
    fileNameSpan: null,
    durationSpan: null,
    playPauseBtn: null,
    volumeSlider: null,
    loopToggle: null,
  };
  
  let currentBgAudioState = null; // To compare for selective UI updates

  /**
   * Creates the HTML structure for the background audio controls.
   * @private
   */
  function _createHTMLStructure() {
    const container = document.createElement('div');
    container.id = 'background-audio-controls-container';
    container.innerHTML = `
      <h4>Background Audio</h4>
      <div class="file-info">
        <span id="bg-audio-file-name" class="file-name-display">No file selected.</span>
        <span id="bg-audio-duration" class="duration-display"></span>
      </div>
      <input type="file" id="bg-audio-file-input" accept="audio/*" class="file-input">
      <div class="controls">
        <button id="bg-audio-play-pause-btn" aria-label="Play Background Audio" class="control-button">Play</button>
        <div class="volume-control">
          <label for="bg-audio-volume-slider">Volume:</label>
          <input type="range" id="bg-audio-volume-slider" min="0" max="1" step="0.01" class="volume-slider">
        </div>
        <label class="loop-control">
          <input type="checkbox" id="bg-audio-loop-toggle" class="loop-checkbox"> Loop
        </label>
      </div>
    `;
    return container;
  }

  /**
   * Updates all UI elements based on the provided background audio state.
   * @private
   * @param {import('../project-manager/project.model.js').BackgroundAudioState | null} bgAudioState
   */
  function _updateUI(bgAudioState) {
    if (!bgAudioState) {
      bgAudioState = { // Default empty state for UI reset
        fileObjectURL: null,
        fileName: 'No file selected.',
        volume: 0.3,
        loop: true,
        isPlaying: false,
        duration: null,
      };
    }
    
    currentBgAudioState = bgAudioState; // Store the state used for this update

    if (uiElements.fileNameSpan) {
      uiElements.fileNameSpan.textContent = bgAudioState.fileName || 'No file selected.';
    }
    if (uiElements.durationSpan) {
      uiElements.durationSpan.textContent = bgAudioState.duration
        ? `(${timeFormatter.formatSecondsToMMSS(bgAudioState.duration)})`
        : '';
    }
    if (uiElements.playPauseBtn) {
      uiElements.playPauseBtn.textContent = bgAudioState.isPlaying ? 'Pause' : 'Play';
      uiElements.playPauseBtn.setAttribute('aria-label', bgAudioState.isPlaying ? 'Pause Background Audio' : 'Play Background Audio');
      // Disable play/pause if no audio is loaded
      uiElements.playPauseBtn.disabled = !bgAudioState.fileObjectURL;
    }
    if (uiElements.volumeSlider) {
      uiElements.volumeSlider.value = bgAudioState.volume;
       // Disable volume if no audio is loaded
      uiElements.volumeSlider.disabled = !bgAudioState.fileObjectURL;
    }
    if (uiElements.loopToggle) {
      uiElements.loopToggle.checked = bgAudioState.loop;
       // Disable loop if no audio is loaded
      uiElements.loopToggle.disabled = !bgAudioState.fileObjectURL;
    }
  }
  
  /**
   * Attaches event listeners to the UI elements.
   * @private
   */
  function _attachEventListeners() {
    if (uiElements.fileInput) {
      uiElements.fileInput.addEventListener('change', _handleFileSelected);
    }
    if (uiElements.playPauseBtn) {
      uiElements.playPauseBtn.addEventListener('click', _handlePlayPause);
    }
    if (uiElements.volumeSlider) {
      uiElements.volumeSlider.addEventListener('input', _handleVolumeChange);
    }
    if (uiElements.loopToggle) {
      uiElements.loopToggle.addEventListener('change', _handleLoopToggle);
    }
  }

  async function _handleFileSelected(event) {
    const file = event.target.files[0];
    if (file && dependencies.backgroundAudioMixerAPI) {
      try {
        await dependencies.backgroundAudioMixerAPI.loadBackgroundAudio(file);
        // The state subscription should handle UI updates via _updateUI
        // Clearing the file input value allows selecting the same file again if needed
        if(uiElements.fileInput) uiElements.fileInput.value = ''; 
      } catch (error) {
        dependencies.errorLogger.error({
          error,
          message: 'Failed to load background audio file.',
          origin: 'backgroundAudioUI._handleFileSelected'
        });
        // Optionally display an error to the user
      }
    }
  }

  function _handlePlayPause() {
    if (!dependencies.backgroundAudioMixerAPI) return;
    const mixerState = dependencies.backgroundAudioMixerAPI.getCurrentState(); // Get fresh state from mixer
    if (mixerState.isPlaying) {
      dependencies.backgroundAudioMixerAPI.pause();
    } else {
      dependencies.backgroundAudioMixerAPI.play();
    }
    // UI update will be handled by state subscription
  }

  function _handleVolumeChange(event) {
    if (!dependencies.backgroundAudioMixerAPI) return;
    const volume = parseFloat(event.target.value);
    dependencies.backgroundAudioMixerAPI.setVolume(volume);
    // Mixer should update state, which then updates UI
  }

  function _handleLoopToggle(event) {
    if (!dependencies.backgroundAudioMixerAPI) return;
    const loop = event.target.checked;
    dependencies.backgroundAudioMixerAPI.setLoop(loop);
    // Mixer should update state, which then updates UI
  }
  
  /**
   * Renders the background audio controls into the given container element.
   * @param {HTMLElement} containerElement - The parent element to render into.
   */
  function render(containerElement) {
    if (!containerElement) {
      dependencies.errorLogger.error({
        message: 'Background Audio UI: Container element not provided for rendering.',
        origin: 'backgroundAudioUI.render'
      });
      return;
    }

    containerElement.innerHTML = ''; // Clear previous content
    const structure = _createHTMLStructure();
    containerElement.appendChild(structure);

    // Assign DOM elements
    uiElements.container = containerElement;
    uiElements.fileInput = containerElement.querySelector('#bg-audio-file-input');
    uiElements.fileNameSpan = containerElement.querySelector('#bg-audio-file-name');
    uiElements.durationSpan = containerElement.querySelector('#bg-audio-duration');
    uiElements.playPauseBtn = containerElement.querySelector('#bg-audio-play-pause-btn');
    uiElements.volumeSlider = containerElement.querySelector('#bg-audio-volume-slider');
    uiElements.loopToggle = containerElement.querySelector('#bg-audio-loop-toggle');

    _attachEventListeners();
    
    // Initialize UI from current project state
    if (dependencies.stateStore) {
        const project = dependencies.stateStore.getState().currentProject;
        _updateUI(project ? project.backgroundAudio : null);
    } else {
         _updateUI(null); // Reset to default if no state store
    }
  }

  /**
   * Initializes the Background Audio UI component.
   * @param {object} injectedDeps - Dependencies for the module.
   * @param {object} injectedDeps.backgroundAudioMixerAPI - The API of the background audio mixer.
   * @param {object} injectedDeps.stateStore - The application's state store.
   * @param {object} [injectedDeps.errorLogger=console] - Error logging utility.
   * @param {object} [injectedDeps.eventAggregator] - Application event aggregator.
   */
  function init(injectedDeps) {
    dependencies.backgroundAudioMixerAPI = injectedDeps.backgroundAudioMixerAPI || dependencies.backgroundAudioMixerAPI;
    dependencies.stateStore = injectedDeps.stateStore || dependencies.stateStore;
    dependencies.errorLogger = injectedDeps.errorLogger || console;
    dependencies.eventAggregator = injectedDeps.eventAggregator || dependencies.eventAggregator;

    if (!dependencies.backgroundAudioMixerAPI) {
        (dependencies.errorLogger.warn || console.warn)("BackgroundAudioUI: backgroundAudioMixerAPI dependency is missing during init.");
    }
    if (!dependencies.stateStore) {
        (dependencies.errorLogger.warn || console.warn)("BackgroundAudioUI: stateStore dependency is missing during init.");
    } else {
      // Subscribe to state changes for currentProject.backgroundAudio
      // Store the unsubscribe function if needed for cleanup
      let previousStateJson = JSON.stringify(dependencies.stateStore.getState().currentProject?.backgroundAudio);

      dependencies.stateStore.subscribe((newState) => {
        const newBgAudioState = newState.currentProject ? newState.currentProject.backgroundAudio : null;
        const newStateJson = JSON.stringify(newBgAudioState);

        // Only update UI if the relevant part of the state has actually changed
        if (newStateJson !== previousStateJson) {
          // console.log('BackgroundAudioUI: Detected change in backgroundAudio state, updating UI.', newBgAudioState);
          _updateUI(newBgAudioState);
          previousStateJson = newStateJson;
        }
      });
    }
    // console.log("Background Audio UI Initialized.");
  }
  
  function refresh() {
      if (uiElements.container && dependencies.stateStore) {
          const project = dependencies.stateStore.getState().currentProject;
          _updateUI(project ? project.backgroundAudio : null);
      }
  }

  return {
    init,
    render,
    refresh, // Expose refresh for external calls if needed
  };
})();

export default backgroundAudioUI;
