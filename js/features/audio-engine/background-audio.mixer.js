// js/features/audio-engine/background-audio.mixer.js

import DOMElements from '../../core/dom-elements.js'; // If UI elements are needed for this
import fileIOUtils from '../../services/file.io.utils.js'; // To read uploaded file
import { ACTIONS, EVENTS } from '../../config/app.constants.js';

const backgroundAudioMixer = (() => {
  /**
   * @typedef {Object} BackgroundAudioState
   * @property {string | null} fileObjectURL - Object URL for the uploaded background audio file.
   * @property {string | null} fileName - Name of the uploaded file.
   * @property {number} volume - Volume from 0.0 to 1.0.
   * @property {boolean} loop - Whether the audio should loop.
   * @property {boolean} isPlaying - Current playback state.
   * @property {number | null} duration - Duration of the background audio track.
   */

  /** @type {BackgroundAudioState} */
  const defaultBgAudioState = {
    fileObjectURL: null,
    fileName: null,
    volume: 0.3, // Default to a lower volume for background
    loop: true,
    isPlaying: false,
    duration: null,
  };

  let audioElement = null; // The <audio> element for background audio
  let currentBgAudioState = { ...defaultBgAudioState };
  let objectUrlToRevoke = null; // Keep track of object URLs to revoke

  let dependencies = {
    stateStore: {
        getState: () => ({ currentProject: { backgroundAudio: { ...defaultBgAudioState } } }), // Mock or provide real path
        dispatch: () => {},
    },
    errorLogger: console,
    eventAggregator: { publish: () => {}, subscribe: () => ({ unsubscribe: () => {} }) },
  };

  /**
   * Creates or reuses the audio element for background music.
   * @private
   */
  function _ensureAudioElement() {
    if (!audioElement || !document.body.contains(audioElement)) {
      audioElement = document.createElement('audio');
      audioElement.id = 'background-audio-player'; // For debugging
      // audioElement.style.display = 'none'; // Not strictly necessary, but good practice
      // Append to body or a specific container to ensure it's part of the DOM
      // though for simple playback it might not need to be in the DOM,
      // but some browsers/features behave better if it is.
      // document.body.appendChild(audioElement); // Can be problematic if init runs many times

      audioElement.onended = () => {
        if (currentBgAudioState.loop && currentBgAudioState.fileObjectURL) {
          // console.debug('[BackgroundAudioMixer] Background audio ended, looping...');
          audioElement.currentTime = 0;
          audioElement.play().catch(e => (dependencies.errorLogger.logWarning || console.warn)('Error re-playing looped audio:', e));
        } else {
          _updatePlaybackState(false);
        }
      };
      audioElement.onplay = () => _updatePlaybackState(true);
      audioElement.onpause = () => _updatePlaybackState(false); // Also covers stop due to external reasons
      audioElement.onloadedmetadata = () => {
        if (audioElement) {
            currentBgAudioState.duration = audioElement.duration;
            // Optional: dispatch update to state if duration is stored globally
            // dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
            //     backgroundAudio: { duration: audioElement.duration }
            // });
        }
      };
      audioElement.onerror = (e) => {
        (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
          error: audioElement.error || new Error('Background audio element error'),
          message: `Error with background audio: ${currentBgAudioState.fileName || 'Unknown file'}`,
          origin: 'BackgroundAudioMixer.audioElement.onerror',
          context: { src: audioElement.src }
        });
        _updatePlaybackState(false);
      };
    }
  }
  
  /**
   * Updates the playback state and notifies listeners or updates global state.
   * @private
   * @param {boolean} isPlaying
   */
  function _updatePlaybackState(isPlaying) {
      if (currentBgAudioState.isPlaying !== isPlaying) {
        currentBgAudioState.isPlaying = isPlaying;
        // dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { // Or a specific action
        //     backgroundAudio: { isPlaying }
        // });
        dependencies.eventAggregator.publish(EVENTS.BACKGROUND_AUDIO_STATE_CHANGED, { // Define this event
            isPlaying,
            file: currentBgAudioState.fileName,
            // volume: currentBgAudioState.volume // if needed by subscribers
        });
        // console.debug(`[BackgroundAudioMixer] Playback state changed: ${isPlaying ? 'Playing' : 'Paused/Stopped'}`);
      }
  }


  /**
   * Loads a new background audio file.
   * @param {File} audioFile - The audio file object.
   * @returns {Promise<boolean>} True if loading was successful, false otherwise.
   */
  async function loadBackgroundAudio(audioFile) {
    if (!(audioFile instanceof File)) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'Invalid audioFile provided for background audio.',
        origin: 'BackgroundAudioMixer.loadBackgroundAudio'
      });
      return false;
    }

    _ensureAudioElement();
    if (audioElement.isPlaying) { // Or currentBgAudioState.isPlaying
      audioElement.pause();
    }

    // Revoke previous object URL if one exists
    if (objectUrlToRevoke) {
      fileIOUtils.revokeObjectURL(objectUrlToRevoke);
      objectUrlToRevoke = null;
    }
    currentBgAudioState.duration = null; // Reset duration

    try {
      objectUrlToRevoke = fileIOUtils.createObjectURL(audioFile);
      if (!objectUrlToRevoke) {
        throw new Error('Failed to create object URL for background audio file.');
      }

      audioElement.src = objectUrlToRevoke;
      audioElement.load(); // Important to load new source

      currentBgAudioState.fileObjectURL = objectUrlToRevoke;
      currentBgAudioState.fileName = audioFile.name;
      // Volume and loop are preserved from previous state or defaults
      audioElement.volume = currentBgAudioState.volume;
      audioElement.loop = currentBgAudioState.loop; // HTML5 audio loop attribute

      // Update global state with new file info (duration will update on 'loadedmetadata')
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { // Define appropriate ACTION
          backgroundAudio: { // This assumes project state has `backgroundAudio` object
              fileObjectURL: currentBgAudioState.fileObjectURL, // For internal use or persistence if needed
              fileName: currentBgAudioState.fileName,
              duration: null // Will be updated
          }
      });
      (dependencies.errorLogger.logInfo || console.info).call(dependencies.errorLogger, {
          message: `Background audio "${audioFile.name}" loaded.`,
          origin: 'BackgroundAudioMixer.loadBackgroundAudio'
      });
      return true;
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error,
        message: `Failed to load background audio file: ${audioFile.name}`,
        origin: 'BackgroundAudioMixer.loadBackgroundAudio'
      });
      // Reset state on failure
      if (objectUrlToRevoke) fileIOUtils.revokeObjectURL(objectUrlToRevoke);
      currentBgAudioState = { ...defaultBgAudioState, volume: currentBgAudioState.volume, loop: currentBgAudioState.loop }; // Keep current settings
      audioElement.src = '';
      objectUrlToRevoke = null;
      // Update global state to reflect no background audio
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { backgroundAudio: defaultBgAudioState });
      return false;
    }
  }

  function play() {
    _ensureAudioElement();
    if (currentBgAudioState.fileObjectURL && audioElement && audioElement.src && !currentBgAudioState.isPlaying) {
      audioElement.play().catch(e => {
        (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
            error: e,
            message: 'Error trying to play background audio.',
            origin: 'BackgroundAudioMixer.play',
            context: {fileName: currentBgAudioState.fileName}
        });
         _updatePlaybackState(false); // Ensure state is correct
      });
      // onplay event will call _updatePlaybackState(true)
    } else if (!currentBgAudioState.fileObjectURL) {
        (dependencies.errorLogger.logInfo || console.info).call(dependencies.errorLogger, {
            message: 'No background audio loaded to play.', origin: 'BackgroundAudioMixer.play'
        });
    }
  }

  function pause() {
    _ensureAudioElement();
    if (currentBgAudioState.isPlaying && audioElement) {
      audioElement.pause();
      // onpause event will call _updatePlaybackState(false)
    }
  }

  function stop() { // Pause and reset time
    _ensureAudioElement();
    if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        // onpause event will update isPlaying to false.
    }
  }

  function setVolume(volumeLevel) {
    _ensureAudioElement();
    const newVolume = Math.max(0, Math.min(1, parseFloat(volumeLevel))); // Clamp between 0 and 1
    if (!isNaN(newVolume) && audioElement) {
      audioElement.volume = newVolume;
      if (currentBgAudioState.volume !== newVolume) {
          currentBgAudioState.volume = newVolume;
          dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
              backgroundAudio: { volume: newVolume }
          });
      }
    }
  }

  function setLoop(shouldLoop) {
    _ensureAudioElement();
    const newLoopState = !!shouldLoop;
    if (audioElement) {
      audioElement.loop = newLoopState; // Set on the HTMLMediaElement
      if (currentBgAudioState.loop !== newLoopState) {
          currentBgAudioState.loop = newLoopState;
          dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, {
              backgroundAudio: { loop: newLoopState }
          });
      }
    }
  }
  
  function _syncWithProjectState(projectBgAudioState) {
    if (!projectBgAudioState) {
        projectBgAudioState = defaultBgAudioState; // Reset if project has no bg audio settings
    }
    
    _ensureAudioElement();

    // If file source changes (e.g., loading a project with a different bg audio)
    // This is tricky because fileObjectURL from a saved project state might not be valid
    // if it was from a File object. Persisting background audio requires a different strategy
    // (e.g., storing file content in IndexedDB or requiring re-upload).
    // For now, assume if fileObjectURL exists in project state, it's meant for display/info,
    // and actual loading happens via `loadBackgroundAudio`.
    // We primarily sync settable properties like volume and loop.
    
    if (audioElement.volume !== projectBgAudioState.volume) {
        setVolume(projectBgAudioState.volume); // This also updates currentBgAudioState.volume
    }
    if (audioElement.loop !== projectBgAudioState.loop) {
        setLoop(projectBgAudioState.loop); // This also updates currentBgAudioState.loop
    }
    
    // If the project state has a file and we don't have it loaded, or it's different
    if (projectBgAudioState.fileName && projectBgAudioState.fileName !== currentBgAudioState.fileName) {
        // This indicates a new file should be loaded for this project.
        // However, we don't have the File object here, only its name/persisted URL.
        // This highlights a challenge: how to reload the actual file when loading a project.
        // For now, we clear current if names mismatch and UI must prompt re-upload for that project's audio.
        // console.warn(`[BackgroundAudioMixer] Project state indicates bg audio "${projectBgAudioState.fileName}" but it's not loaded. User must re-select.`);
        if (currentBgAudioState.fileObjectURL) { // If something else is loaded, stop it
            stop();
            if (objectUrlToRevoke) fileIOUtils.revokeObjectURL(objectUrlToRevoke);
            audioElement.src = '';
            currentBgAudioState = {...defaultBgAudioState, volume: projectBgAudioState.volume, loop: projectBgAudioState.loop };
            objectUrlToRevoke = null;
        }
    } else if (!projectBgAudioState.fileName && currentBgAudioState.fileName) {
        // Project state has no bg audio, but something is loaded locally. Stop and clear.
        stop();
        if (objectUrlToRevoke) fileIOUtils.revokeObjectURL(objectUrlToRevoke);
        audioElement.src = '';
        currentBgAudioState = {...defaultBgAudioState, volume: projectBgAudioState.volume, loop: projectBgAudioState.loop };
        objectUrlToRevoke = null;
    }
  }

  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
  }


  return {
    _setDependencies,
    loadBackgroundAudio,
    play,
    pause,
    stop,
    setVolume,
    setLoop,
    getCurrentState: () => ({ ...currentBgAudioState }), // Return a copy
    // _syncWithProjectState, // Potentially exposed for init logic to call
  };

})();


/**
 * Initialization function for the BackgroundAudioMixer.
 * @param {object} dependencies
 * @param {import('../../core/state-store.js').default} dependencies.stateStore
 * @param {import('../../core/error-logger.js').default} dependencies.errorLogger
 * @param {import('../../core/event-aggregator.js').default} dependencies.eventAggregator
 */
export function initializeBackgroundAudioMixer(dependencies) {
  backgroundAudioMixer._setDependencies(dependencies);
  const { stateStore /*, eventAggregator, errorLogger*/ } = dependencies;

  // Sync with current project's background audio settings when a project loads or changes.
  // This requires `currentProject` in stateStore to have a `backgroundAudio` object.
  // Make sure your DEFAULT_PROJECT_SCHEMA and project model include `backgroundAudio: defaultBgAudioState`.
  const unsubscribeState = stateStore.subscribe(newState => {
    const projectBgAudioSettings = newState.currentProject?.backgroundAudio;
    // Call a method within backgroundAudioMixer to handle the state update internally
    // For now, direct call for simplicity; a dedicated internal sync method is better.
    if(projectBgAudioSettings) {
        // This part is tricky. The 'backgroundAudioMixer' manages the *actual player state*
        // The project state stores the *desired settings*.
        // We need to carefully sync: e.g., if project state's volume changes, update player volume.
        // The loadBackgroundAudio should be the primary way to set the actual audio source.
        
        const mixerState = backgroundAudioMixer.getCurrentState();
        if(mixerState.volume !== projectBgAudioSettings.volume) {
            backgroundAudioMixer.setVolume(projectBgAudioSettings.volume);
        }
        if(mixerState.loop !== projectBgAudioSettings.loop) {
            backgroundAudioMixer.setLoop(projectBgAudioSettings.loop);
        }
        
        // If project has a fileName but mixer doesn't or has different one, it means user needs to re-upload
        // or we need a way to re-obtain the File object if persisted (e.g. via IndexedDB)
        if (projectBgAudioSettings.fileName && projectBgAudioSettings.fileName !== mixerState.fileName) {
            if (mixerState.isPlaying) backgroundAudioMixer.stop();
            // The UI part for file input should be re-enabled or show indication to re-upload.
        } else if (!projectBgAudioSettings.fileName && mixerState.fileName) {
             if (mixerState.isPlaying) backgroundAudioMixer.stop(); // Clear if project has no bg audio
        }

    } else if (!newState.currentProject && backgroundAudioMixer.getCurrentState().isPlaying) {
        backgroundAudioMixer.stop(); // Stop if no project loaded
    }
  });
  
  // Initialize from current state
  const initialProject = stateStore.getState().currentProject;
  if (initialProject && initialProject.backgroundAudio) {
    backgroundAudioMixer.setVolume(initialProject.backgroundAudio.volume);
    backgroundAudioMixer.setLoop(initialProject.backgroundAudio.loop);
    // Don't attempt to play initial file automatically, user action should trigger this via `loadBackgroundAudio`
  }


  // Listen to main playback events to auto-pause/resume background audio (optional)
  // dependencies.eventAggregator.subscribe(EVENTS.PLAYBACK_STATE_CHANGED, (mainPlaybackState) => {
  //   if (mainPlaybackState === 'playing' && !backgroundAudioMixer.getCurrentState().isPlaying && backgroundAudioMixer.getCurrentState().fileObjectURL) {
  //     backgroundAudioMixer.play();
  //   } else if ((mainPlaybackState === 'paused' || mainPlaybackState === 'ended') && backgroundAudioMixer.getCurrentState().isPlaying) {
  //     backgroundAudioMixer.pause();
  //   }
  // });


  // console.info('[BackgroundAudioMixer] Initialized.');
  return {
    loadBackgroundAudio: backgroundAudioMixer.loadBackgroundAudio,
    play: backgroundAudioMixer.play,
    pause: backgroundAudioMixer.pause,
    stop: backgroundAudioMixer.stop,
    setVolume: backgroundAudioMixer.setVolume,
    setLoop: backgroundAudioMixer.setLoop,
    getCurrentState: backgroundAudioMixer.getCurrentState,
    // Expose a way to hook up the file input:
    handleFileUpload: async (file) => { // Assumes this will be called by UI
        if(file) return await backgroundAudioMixer.loadBackgroundAudio(file);
        return false;
    }
  };
}

// Export the core object as well if direct, uninitialized access might be useful (less common).
export default backgroundAudioMixer;
