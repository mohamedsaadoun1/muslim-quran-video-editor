// js/features/editor-shell/playback-control-strip.ui.js

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, EVENTS } from '../../config/app.constants.js';
// import localizationService from '../../core/localization.service.js'; // If titles are heavily localized

const playbackControlStripUI = (() => {
  // DOM Element references (will be cached in init)
  let playPauseBtn, nextBtn, prevBtn, undoBtn, redoBtn;

  let dependencies = {
    stateStore: {
        getState: () => ({ mainPlaybackState: { isPlaying: false }, undoRedoState: { canUndo: false, canRedo: false } }),
        dispatch: () => {},
        subscribe: () => (() => {}),
    },
    eventAggregator: { publish: () => {}, subscribe: () => ({unsubscribe: ()=>{}}) },
    errorLogger: console,
    mainPlaybackAPI: { // From initializeMainPlaybackController
        play: () => {}, pause: () => {},
        next: () => {}, previous: () => {},
        getIsPlaying: () => false, // Might be useful
    },
    localizationService: { translate: (key, fallback) => fallback || key }
    // undoRedoAPI: { undo: () => {}, redo: () => {}, canUndo: () => false, canRedo: () => false } // If separate API
  };
  
  /** Updates the Play/Pause button icon and title based on playback state. @private */
  function _updatePlayPauseButton(isPlaying) {
    if (playPauseBtn) {
      const l10n = dependencies.localizationService;
      if (isPlaying) {
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        playPauseBtn.title = l10n.translate('playback.pause.title', 'إيقاف مؤقت');
        playPauseBtn.setAttribute('aria-label', l10n.translate('playback.pause.ariaLabel', 'Pause'));
      } else {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        playPauseBtn.title = l10n.translate('playback.play.title', 'تشغيل');
        playPauseBtn.setAttribute('aria-label', l10n.translate('playback.play.ariaLabel', 'Play'));
      }
    }
  }

  /** Updates the enabled/disabled state of Undo/Redo buttons. @private */
  function _updateUndoRedoButtons(canUndo, canRedo) {
    if (undoBtn) {
      undoBtn.disabled = !canUndo;
      undoBtn.setAttribute('aria-disabled', String(!canUndo));
    }
    if (redoBtn) {
      redoBtn.disabled = !canRedo;
      redoBtn.setAttribute('aria-disabled', String(!canRedo));
    }
  }


  /** Handles Play/Pause button click. @private */
  function _handlePlayPauseClick() {
    // const isCurrentlyPlaying = dependencies.mainPlaybackAPI.getIsPlaying(); // Get fresh state
    // Preferring state store as single source of truth for UI-affecting state like this.
    const isCurrentlyPlaying = dependencies.stateStore.getState().mainPlaybackState?.isPlaying || false;
    
    if (isCurrentlyPlaying) {
      dependencies.mainPlaybackAPI.pause();
    } else {
      dependencies.mainPlaybackAPI.play();
    }
  }

  /** Handles Next Ayah button click. @private */
  function _handleNextClick() {
    dependencies.mainPlaybackAPI.next();
  }

  /** Handles Previous Ayah button click. @private */
  function _handlePreviousClick() {
    dependencies.mainPlaybackAPI.previous();
  }

  /** Handles Undo button click. @private */
  function _handleUndoClick() {
    // Option 1: Dispatch to stateStore if it handles undo/redo logic
    dependencies.stateStore.dispatch(ACTIONS.UNDO_STATE);

    // Option 2: Call a dedicated undoRedoAPI if it exists
    // dependencies.undoRedoAPI?.undo();
    
    // console.debug('[PlaybackControls] Undo requested.');
  }

  /** Handles Redo button click. @private */
  function _handleRedoClick() {
    dependencies.stateStore.dispatch(ACTIONS.REDO_STATE);
    // dependencies.undoRedoAPI?.redo();
    // console.debug('[PlaybackControls] Redo requested.');
  }
  
  function _setDependencies(injectedDeps) {
      Object.assign(dependencies, injectedDeps);
  }

  return {
    _setDependencies,
    // No public API functions from the object itself, init function sets everything up.
  };
})();


/**
 * Initialization function for the PlaybackControlStripUI.
 * @param {object} deps
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../core/event-aggregator.js').default} deps.eventAggregator
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * @param {ReturnType<import('../audio-engine/main-playback.controller.js').initializeMainPlaybackController>} deps.mainPlaybackAPI
 * @param {import('../../core/localization.service.js').default} deps.localizationService
 * // @param {object} [deps.undoRedoAPI] // If you have a dedicated undo/redo service
 */
export function initializePlaybackControlStrip(deps) {
  playbackControlStripUI._setDependencies(deps);
  const { stateStore, errorLogger, mainPlaybackAPI, eventAggregator, localizationService } = deps;

  // Cache DOM elements used by this module's handlers
  const playPause = DOMElements.playPauseMainBtn;
  const next = DOMElements.nextAyahBtn;
  const prev = DOMElements.prevAyahBtn;
  const undo = DOMElements.undoBtn;
  const redo = DOMElements.redoBtn;

  // Check if all critical elements are present
  if (!playPause || !next || !prev || !undo || !redo) {
    (errorLogger.logWarning || console.warn).call(errorLogger, {
        message: 'One or more playback control buttons not found in DOMElements. Playback strip UI may not function fully.',
        origin: 'initializePlaybackControlStrip'
    });
    // Depending on how critical, you might return a no-op API.
  }

  // --- Local scoped handlers to correctly capture `deps` ---
  const _updatePlayPauseButtonLocal = (isPlaying) => {
    if (playPause) {
      if (isPlaying) {
        playPause.innerHTML = '<i class="fas fa-pause"></i>'; playPause.title = localizationService.translate('playback.pause.title', 'إيقاف مؤقت');
      } else {
        playPause.innerHTML = '<i class="fas fa-play"></i>'; playPause.title = localizationService.translate('playback.play.title', 'تشغيل');
      }
    }
  };

  const _updateUndoRedoButtonsLocal = (canUndo, canRedo) => {
    if(undo) undo.disabled = !canUndo;
    if(redo) redo.disabled = !canRedo;
  };

  const _handlePlayPauseLocal = () => {
      const isPlayingNow = stateStore.getState().mainPlaybackState?.isPlaying; // From centralized state
      if (isPlayingNow) mainPlaybackAPI.pause(); else mainPlaybackAPI.play();
  };

  // Attach event listeners
  if (playPause) playPause.addEventListener('click', _handlePlayPauseLocal);
  if (next) next.addEventListener('click', () => mainPlaybackAPI.next());
  if (prev) prev.addEventListener('click', () => mainPlaybackAPI.previous());
  if (undo) undo.addEventListener('click', () => stateStore.dispatch(ACTIONS.UNDO_STATE));
  if (redo) redo.addEventListener('click', () => stateStore.dispatch(ACTIONS.REDO_STATE));


  // Subscribe to state changes for UI updates
  const unsubscribeState = stateStore.subscribe((newState) => {
    const mainPlaybackState = newState.mainPlaybackState || { isPlaying: false };
    const undoRedoState = newState.undoRedoState || { canUndo: false, canRedo: false }; // Assume this structure in state for undo/redo buttons

    _updatePlayPauseButtonLocal(mainPlaybackState.isPlaying);
    _updateUndoRedoButtonsLocal(undoRedoState.canUndo, undoRedoState.canRedo);
    
    // Enable/disable next/prev based on playlist state (from mainPlaybackState or a new playlist state slice)
    const playlist = newState.currentProject?.quranSelection && mainPlaybackState.currentPlaylist; // Example: need currentPlaylist
    const currentIdx = mainPlaybackState.currentPlaylistIndex;
    if(prev) prev.disabled = !(playlist && playlist.length > 0 && currentIdx > 0);
    if(next) next.disabled = !(playlist && playlist.length > 0 && currentIdx < playlist.length - 1 && currentIdx !== -1);

  });

  // Initial UI state based on current state
  const initialMainPlaybackState = stateStore.getState().mainPlaybackState || { isPlaying: false };
  const initialUndoRedoState = stateStore.getState().undoRedoState || { canUndo: false, canRedo: false };
  _updatePlayPauseButtonLocal(initialMainPlaybackState.isPlaying);
  _updateUndoRedoButtonsLocal(initialUndoRedoState.canUndo, initialUndoRedoState.canRedo);
  // Also initialize next/prev button states based on initial playlist


  // console.info('[PlaybackControlStripUI] Initialized.');

  return {
    cleanup: () => {
      unsubscribeState();
      if (playPause) playPause.removeEventListener('click', _handlePlayPauseLocal);
      if (next) next.removeEventListener('click', () => mainPlaybackAPI.next()); // Be careful with removing anonymous functions
      if (prev) prev.removeEventListener('click', () => mainPlaybackAPI.previous());
      if (undo) undo.removeEventListener('click', () => stateStore.dispatch(ACTIONS.UNDO_STATE));
      if (redo) redo.removeEventListener('click', () => stateStore.dispatch(ACTIONS.REDO_STATE));
      // console.info('[PlaybackControlStripUI] Cleaned up.');
    }
    // Public API for this module (e.g., programmatically disable all buttons)
    // disableControls: () => { [playPause, next, prev, undo, redo].forEach(btn => btn && (btn.disabled = true)); },
    // enableControls: () => { /* ... logic to re-enable based on state ... */ }
  };
}

export default playbackControlStripUI;
