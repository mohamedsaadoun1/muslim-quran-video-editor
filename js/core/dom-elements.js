// js/core/dom-elements.js

// errorLogger سيتم تمريره إلى initializeCoreDomElements من main.js

const DOMElements = {};

/**
 * Finds an element by its ID and logs an error if not found.
 * @param {string} id - The ID of the element to find.
 * @param {string} elementName - A descriptive name for the element (for error messages).
 * @param {import('./error-logger.js').default | Console} errorLoggerInstance - Instance of errorLogger or console.
 * @returns {HTMLElement | null} The found element or null.
 */
function getElementOrLog(id, elementName, errorLoggerInstance) {
  const element = document.getElementById(id);
  if (!element) {
    const logger = errorLoggerInstance || console; // Fallback to console if logger not passed
    (logger.logWarning || logger.warn).call(logger, { // Ensure 'this' context if it's an object method
      message: `DOM Element not found: ${elementName} (ID: ${id}). UI features dependent on this might not work.`,
      origin: 'dom-elements.initializeCoreDomElements',
    });
  }
  return element;
}

/**
 * Initializes and caches core DOM elements that are expected to always be present.
 * This should be called once when the application starts, after DOMContentLoaded.
 * @param {import('./error-logger.js').default} errorLoggerInstance - Instance of errorLogger from core.
 * @throws {Error} If a critical element like 'app-container' is not found.
 */
export function initializeCoreDomElements(errorLoggerInstance) {
  const logger = errorLoggerInstance || console; // Fallback if not provided
  const get = (id, name) => getElementOrLog(id, name, logger);

  // Main application container and screens
  DOMElements.appContainer = get('app-container', 'App Container');
  DOMElements.initialScreen = get('initial-screen', 'Initial Screen');
  DOMElements.editorScreen = get('editor-screen', 'Editor Screen');

  if (!DOMElements.appContainer) {
    const fatalError = new Error('Core DOM element "app-container" not found. Application cannot start.');
    (logger.handleError || logger.error).call(logger, {
        error: fatalError,
        message: fatalError.message,
        origin: 'dom-elements.initializeCoreDomElements',
        severity: 'error'
    });
    throw fatalError; // Propagate to stop further execution in main.js
  }

  // Theme toggle buttons
  DOMElements.themeToggleInitial = get('theme-toggle-initial', 'Theme Toggle (Initial)');
  DOMElements.themeToggleEditor = get('theme-toggle-editor', 'Theme Toggle (Editor)');

  // Initial Screen Elements
  DOMElements.projectsListContainer = get('projects-list-container', 'Projects List Container');
  DOMElements.noProjectsMessage = get('no-projects-message', 'No Projects Message');
  DOMElements.goToEditorBtn = get('go-to-editor-btn', 'Go To Editor Button');
  DOMElements.currentYearSpan = get('current-year', 'Current Year Span');


  // Editor Screen Top Bar
  DOMElements.backToInitialScreenBtn = get('back-to-initial-screen-btn', 'Back To Initial Screen Button');
  DOMElements.currentProjectTitleEditor = get('current-project-title-editor', 'Current Project Title (Editor)');
  DOMElements.saveProjectBtnEditor = get('save-project-btn-editor', 'Save Project Button (Editor)');

  // Editor Main Area (Video Preview)
  DOMElements.editorMainArea = get('editor-main-area-new', 'Editor Main Area');
  DOMElements.videoPreviewBackgroundBlur = get('video-preview-background-blur', 'Video Preview Background Blur');
  DOMElements.videoPreviewCardContainer = get('video-preview-card-container', 'Video Preview Card Container');
  DOMElements.videoPreviewContainer = get('video-preview-container', 'Video Preview Container');
  DOMElements.videoPreviewCanvas = get('video-preview-canvas', 'Video Preview Canvas');
  DOMElements.previewOverlayContent = get('preview-overlay-content', 'Preview Overlay Content');
  DOMElements.previewSurahTitleOverlay = get('preview-surah-title-overlay', 'Preview Surah Title Overlay');
  DOMElements.previewAyahTextOverlay = get('preview-ayah-text-overlay', 'Preview Ayah Text Overlay');
  DOMElements.previewTranslationTextOverlay = get('preview-translation-text-overlay', 'Preview Translation Text Overlay');
  DOMElements.mainAudioPlayer = get('main-audio-player', 'Main Audio Player');
  // New in HTML: Background video player (if you intend to have a separate one for video backgrounds)
  // DOMElements.backgroundVideoPlayer = get('background-video-player-element-id', 'Background Video Player');


  // Editor Controls Area (Footer)
  DOMElements.editorControlsArea = get('editor-controls-area', 'Editor Controls Area');
  DOMElements.playbackTimelineSection = get('playback-timeline-section', 'Playback Timeline Section');
  DOMElements.timelineContainer = get('timeline-container', 'Timeline Container');
  DOMElements.currentTimeDisplay = get('current-time-display', 'Current Time Display');
  DOMElements.timelineSlider = get('timeline-slider', 'Timeline Slider');
  DOMElements.totalTimeDisplay = get('total-time-display', 'Total Time Display');
  DOMElements.mainPlaybackControls = get('main-playback-controls', 'Main Playback Controls');
  DOMElements.undoBtn = get('undo-btn', 'Undo Button');
  DOMElements.prevAyahBtn = get('prev-ayah-btn', 'Previous Ayah Button');
  DOMElements.playPauseMainBtn = get('play-pause-main-btn', 'Play/Pause Main Button');
  DOMElements.nextAyahBtn = get('next-ayah-btn', 'Next Ayah Button');
  DOMElements.redoBtn = get('redo-btn', 'Redo Button');
  DOMElements.mainBottomTabBar = get('main-bottom-tab-bar', 'Main Bottom Tab Bar');

  // Control Panels Container
  DOMElements.activeControlPanelsContainer = get('active-control-panels-container', 'Active Control Panels Container');

  // Individual Control Panels
  DOMElements.quranSelectionPanel = get('quran-selection-panel', 'Quran Selection Panel');
  DOMElements.backgroundSettingsPanel = get('background-settings-panel', 'Background Settings Panel');
  DOMElements.effectsTextSettingsPanel = get('effects-text-settings-panel', 'Effects & Text Settings Panel');
  DOMElements.audioSettingsPanel = get('audio-settings-panel', 'Audio Settings Panel');
  DOMElements.exportSettingsPanel = get('export-settings-panel', 'Export Settings Panel');

  // --- Elements inside Quran Selection Panel ---
  DOMElements.surahSelect = get('surah-select', 'Surah Select');
  DOMElements.ayahStartSelect = get('ayah-start-select', 'Ayah Start Select');
  DOMElements.ayahEndSelect = get('ayah-end-select', 'Ayah End Select');
  DOMElements.reciterSelect = get('reciter-select', 'Reciter Select');
  DOMElements.voiceSearchQuranBtn = get('voice-search-quran-btn', 'Voice Search Quran Button');
  DOMElements.voiceSearchStatus = get('voice-search-status', 'Voice Search Status Span');
  DOMElements.translationSelect = get('translation-select', 'Translation Select');

  // --- Elements inside Background Settings Panel ---
  DOMElements.importBackgroundInput = get('import-background-input', 'Import Background Input'); // ID was: import-background in original README
  DOMElements.aiSuggestBgBtn = get('ai-suggest-bg-btn', 'AI Suggest Background Button'); // ID was: apply-ai-bg
  DOMElements.aiBgSuggestionsLoader = get('ai-bg-suggestions-loader', 'AI Suggestions Loader');
  DOMElements.aiBgSuggestionsContainer = get('ai-bg-suggestions-container', 'AI Background Suggestions Container'); // ID was: ai-bg-suggestions
  DOMElements.backgroundColorPicker = get('background-color-picker', 'Background Color Picker');

  // --- Elements inside Text & Effects Settings Panel ---
  DOMElements.aspectRatioSelect = get('aspect-ratio-select', 'Aspect Ratio Select');
  DOMElements.videoFilterSelect = get('video-filter-select', 'Video Filter Select');
  DOMElements.fontFamilySelect = get('font-family-select', 'Font Family Select'); // ID was: font-select
  DOMElements.fontSizeSlider = get('font-size-slider', 'Font Size Slider');
  DOMElements.fontSizeValueDisplay = get('font-size-value-display', 'Font Size Value Display'); // ID was: font-size-value
  DOMElements.fontColorPicker = get('font-color-picker', 'Font Color Picker');
  DOMElements.ayahTextBgColorPicker = get('ayah-text-bg-color-picker', 'Ayah Text Background Color Picker'); // ID was: ayah-bg-color-picker
  DOMElements.textAnimationSelect = get('text-animation-select', 'Text Animation Select'); // ID was: text-effect-select

  // --- Elements inside Audio Settings Panel ---
  DOMElements.audioPreviewStatusText = get('audio-preview-status-text', 'Audio Preview Status Text');
  DOMElements.delayBetweenAyahsInput = get('delay-between-ayahs-input', 'Delay Between Ayahs Input'); // ID was: delay-between-ayahs
  DOMElements.addBgMusicBtn = get('add-bg-music-btn', 'Add Background Music Button'); // New based on your HTML
  // Extract audio button (if you have it)
  // DOMElements.extractAudioFromVideoBtn = get('extract-audio-btn', 'Extract Audio Button'); // From your HTML


  // --- Elements inside Export Settings Panel ---
  DOMElements.exportResolutionSelect = get('export-resolution-select', 'Export Resolution Select'); // ID was: resolution-select
  DOMElements.exportFormatSelect = get('export-format-select', 'Export Format Select');         // ID was: video-format-select
  DOMElements.exportFpsSelect = get('export-fps-select', 'Export FPS Select');                // ID was: framerate-select
  DOMElements.exportVideoBtn = get('export-video-btn', 'Export Video Button');                   // ID was: export-btn
  DOMElements.exportProcessNote = get('export-process-note', 'Export Process Note');       // ID was: export-note
  DOMElements.exportProgressBarContainer = get('export-progress-bar-container', 'Export Progress Bar Container'); // ID was part of export-progress
  DOMElements.exportProgressBar = get('export-progress-bar', 'Export Progress Bar');
  DOMElements.exportProgressText = get('export-progress-text', 'Export Progress Text');

  // Global Loading Spinner
  DOMElements.globalLoadingSpinner = get('global-loading-spinner', 'Global Loading Spinner'); // ID was: loading-spinner
}

/**
 * Returns the cached DOMElements object.
 * Modules should import this directly for read-only access after initialization.
 */
export default DOMElements;
