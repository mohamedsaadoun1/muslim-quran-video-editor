// js/core/dom-elements.js

import errorLogger from './error-logger.js';
// import { DOM_IDS } from '../config/app.constants.js'; // يمكن استخدامها إذا تم تعريف IDs هناك

// هذا الكائن سيحتوي على مراجع عناصر DOM
const DOMElements = {};

/**
 * Finds an element by its ID and logs an error if not found.
 * @param {string} id - The ID of the element to find.
 * @param {string} elementName - A descriptive name for the element (for error messages).
 * @returns {HTMLElement | null} The found element or null.
 */
function getElementOrLog(id, elementName) {
  const element = document.getElementById(id);
  if (!element) {
    errorLogger.logWarning({
      message: `DOM Element not found: ${elementName} (ID: ${id}). Some UI features might not work.`,
      origin: 'dom-elements.initializeCoreDomElements',
    });
  }
  return element;
}

/**
 * Initializes and caches core DOM elements that are expected to always be present.
 * This should be called once when the application starts, after DOMContentLoaded.
 * @throws {Error} If a critical element is not found, it might throw to halt app initialization.
 */
export function initializeCoreDomElements() {
  // Main application container and screens
  DOMElements.appContainer = getElementOrLog('app-container', 'App Container');
  DOMElements.initialScreen = getElementOrLog('initial-screen', 'Initial Screen');
  DOMElements.editorScreen = getElementOrLog('editor-screen', 'Editor Screen');

  if (!DOMElements.appContainer) {
    // This is a critical failure, app cannot function
    const fatalError = new Error('Core DOM element "app-container" not found. Application cannot start.');
    errorLogger.handleError({
        error: fatalError,
        message: fatalError.message,
        origin: 'dom-elements.initializeCoreDomElements',
        severity: 'error'
    });
    throw fatalError; // Propagate to stop further execution in main.js
  }

  // Theme toggle buttons
  DOMElements.themeToggleInitial = getElementOrLog('theme-toggle-initial', 'Theme Toggle (Initial)');
  DOMElements.themeToggleEditor = getElementOrLog('theme-toggle-editor', 'Theme Toggle (Editor)');

  // Initial Screen Elements
  DOMElements.projectsListContainer = getElementOrLog('projects-list-container', 'Projects List Container');
  DOMElements.noProjectsMessage = getElementOrLog('no-projects-message', 'No Projects Message');
  DOMElements.goToEditorBtn = getElementOrLog('go-to-editor-btn', 'Go To Editor Button');

  // Editor Screen Top Bar
  DOMElements.backToInitialScreenBtn = getElementOrLog('back-to-initial-screen-btn', 'Back To Initial Screen Button');
  DOMElements.currentProjectTitleEditor = getElementOrLog('current-project-title-editor', 'Current Project Title (Editor)');
  DOMElements.saveProjectBtnEditor = getElementOrLog('save-project-btn-editor', 'Save Project Button (Editor)');

  // Editor Main Area (Video Preview)
  DOMElements.editorMainArea = getElementOrLog('editor-main-area-new', 'Editor Main Area');
  DOMElements.videoPreviewBackgroundBlur = getElementOrLog('video-preview-background-blur', 'Video Preview Background Blur');
  DOMElements.videoPreviewCardContainer = getElementOrLog('video-preview-card-container', 'Video Preview Card Container');
  DOMElements.videoPreviewContainer = getElementOrLog('video-preview-container', 'Video Preview Container');
  DOMElements.videoPreviewCanvas = getElementOrLog('video-preview-canvas', 'Video Preview Canvas');
  DOMElements.previewOverlayContent = getElementOrLog('preview-overlay-content', 'Preview Overlay Content');
  DOMElements.previewSurahTitleOverlay = getElementOrLog('preview-surah-title-overlay', 'Preview Surah Title Overlay');
  DOMElements.previewAyahTextOverlay = getElementOrLog('preview-ayah-text-overlay', 'Preview Ayah Text Overlay');
  DOMElements.previewTranslationTextOverlay = getElementOrLog('preview-translation-text-overlay', 'Preview Translation Text Overlay');
  DOMElements.mainAudioPlayer = getElementOrLog('main-audio-player', 'Main Audio Player');

  // Editor Controls Area (Footer)
  DOMElements.editorControlsArea = getElementOrLog('editor-controls-area', 'Editor Controls Area');
  DOMElements.timelineContainer = getElementOrLog('timeline-container', 'Timeline Container');
  DOMElements.currentTimeDisplay = getElementOrLog('current-time-display', 'Current Time Display');
  DOMElements.timelineSlider = getElementOrLog('timeline-slider', 'Timeline Slider');
  DOMElements.totalTimeDisplay = getElementOrLog('total-time-display', 'Total Time Display');
  DOMElements.mainPlaybackControls = getElementOrLog('main-playback-controls', 'Main Playback Controls');
  DOMElements.undoBtn = getElementOrLog('undo-btn', 'Undo Button');
  DOMElements.prevAyahBtn = getElementOrLog('prev-ayah-btn', 'Previous Ayah Button');
  DOMElements.playPauseMainBtn = getElementOrLog('play-pause-main-btn', 'Play/Pause Main Button');
  DOMElements.nextAyahBtn = getElementOrLog('next-ayah-btn', 'Next Ayah Button');
  DOMElements.redoBtn = getElementOrLog('redo-btn', 'Redo Button');
  DOMElements.mainBottomTabBar = getElementOrLog('main-bottom-tab-bar', 'Main Bottom Tab Bar');

  // Control Panels Container
  DOMElements.activeControlPanelsContainer = getElementOrLog('active-control-panels-container', 'Active Control Panels Container');

  // Individual Control Panels (IDs from HTML)
  DOMElements.quranSelectionPanel = getElementOrLog('quran-selection-panel', 'Quran Selection Panel');
  DOMElements.backgroundSettingsPanel = getElementOrLog('background-settings-panel', 'Background Settings Panel');
  DOMElements.effectsTextSettingsPanel = getElementOrLog('effects-text-settings-panel', 'Effects & Text Settings Panel');
  DOMElements.audioSettingsPanel = getElementOrLog('audio-settings-panel', 'Audio Settings Panel');
  DOMElements.exportSettingsPanel = getElementOrLog('export-settings-panel', 'Export Settings Panel');

  // Elements inside Quran Selection Panel (example for inputs/selects)
  DOMElements.surahSelect = getElementOrLog('surah-select', 'Surah Select');
  DOMElements.ayahStartSelect = getElementOrLog('ayah-start-select', 'Ayah Start Select');
  DOMElements.ayahEndSelect = getElementOrLog('ayah-end-select', 'Ayah End Select');
  DOMElements.reciterSelect = getElementOrLog('reciter-select', 'Reciter Select');
  DOMElements.voiceSearchQuranBtn = getElementOrLog('voice-search-quran-btn', 'Voice Search Quran Button');
  DOMElements.translationSelect = getElementOrLog('translation-select', 'Translation Select');

  // Add more elements from other panels as needed by their respective UI modules...
  // Example for Background Panel
  DOMElements.importBackgroundInput = getElementOrLog('import-background-input', 'Import Background Input');
  DOMElements.aiSuggestBgBtn = getElementOrLog('ai-suggest-bg-btn', 'AI Suggest Background Button');
  DOMElements.aiBgSuggestionsContainer = getElementOrLog('ai-bg-suggestions-container', 'AI Background Suggestions Container');
  DOMElements.backgroundColorPicker = getElementOrLog('background-color-picker', 'Background Color Picker');

  // Example for Text & Effects Panel
  DOMElements.aspectRatioSelect = getElementOrLog('aspect-ratio-select', 'Aspect Ratio Select');
  DOMElements.videoFilterSelect = getElementOrLog('video-filter-select', 'Video Filter Select');
  DOMElements.fontFamilySelect = getElementOrLog('font-family-select', 'Font Family Select');
  DOMElements.fontSizeSlider = getElementOrLog('font-size-slider', 'Font Size Slider');
  DOMElements.fontSizeValueDisplay = getElementOrLog('font-size-value-display', 'Font Size Value Display');
  DOMElements.fontColorPicker = getElementOrLog('font-color-picker', 'Font Color Picker');
  DOMElements.ayahTextBgColorPicker = getElementOrLog('ayah-text-bg-color-picker', 'Ayah Text Background Color Picker');
  DOMElements.textAnimationSelect = getElementOrLog('text-animation-select', 'Text Animation Select');

  // Example for Audio Panel
  DOMElements.delayBetweenAyahsInput = getElementOrLog('delay-between-ayahs-input', 'Delay Between Ayahs Input');
  
  // Example for Export Panel
  DOMElements.exportResolutionSelect = getElementOrLog('export-resolution-select', 'Export Resolution Select');
  DOMElements.exportFormatSelect = getElementOrLog('export-format-select', 'Export Format Select');
  DOMElements.exportFpsSelect = getElementOrLog('export-fps-select', 'Export FPS Select');
  DOMElements.exportVideoBtn = getElementOrLog('export-video-btn', 'Export Video Button');
  DOMElements.exportProgressBarContainer = getElementOrLog('export-progress-bar-container', 'Export Progress Bar Container');
  DOMElements.exportProgressBar = getElementOrLog('export-progress-bar', 'Export Progress Bar');
  DOMElements.exportProgressText = getElementOrLog('export-progress-text', 'Export Progress Text');

  // Global Loading Spinner
  DOMElements.globalLoadingSpinner = getElementOrLog('global-loading-spinner', 'Global Loading Spinner');

  // Any other critical elements that the app cannot function without
}

/**
 * Returns the cached DOMElements object.
 * It's preferable for modules to import this directly rather than calling a getter function.
 * Modules should NOT modify this object.
 */
export default DOMElements; // Export the object directly for read-only access
