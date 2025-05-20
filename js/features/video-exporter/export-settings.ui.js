// js/features/video-exporter/export-settings.ui.js
import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, DEFAULT_PROJECT_SCHEMA, EVENTS } from '../../config/app.constants.js';
import fileIOUtils from '../../utils/file.io.utils.js'; // For download
import dynamicSelectBuilder from '../../shared-ui-components/dynamic-select.builder.js';

// --- Configuration for Export Options ---
export const SUPPORTED_RESOLUTIONS = {
  '640x360': { name: '360p (SD صغير)', width: 640, height: 360 },
  '854x480': { name: '480p (SD قياسي)', width: 854, height: 480 },
  '1280x720': { name: '720p (HD)', width: 1280, height: 720 },
  '1920x1080': { name: '1080p (Full HD)', width: 1920, height: 1080 },
  '2560x1440': { name: '1440p (2K)', width: 2560, height: 1440 },
  '3840x2160': { name: '2160p (4K UHD)', width: 3840, height: 2160 },
};

export const SUPPORTED_FORMATS = {
  'webm': { 
    name: 'WebM (فيديو - بدون صوت مبدئيًا)', 
    extension: 'webm', 
    noteKey: 'exportPanel.note.webm', 
    needsAudioMerge: true 
  },
  'gif': { 
    name: 'GIF (صورة متحركة - بدون صوت)', 
    extension: 'gif', 
    noteKey: 'exportPanel.note.gif', 
    needsAudioMerge: false 
  }
};

export const SUPPORTED_FRAMERATES = {
  15: { name: '15 إطار/ث (منخفض جداً)' },
  24: { name: '24 إطار/ث (سينمائي)' },
  25: { name: '25 إطار/ث (PAL قياسي)' },
  30: { name: '30 إطار/ث (NTSC قياسي)' }
};
// --- End Configuration ---

const exportSettingsUI = (() => {
  // DOM element references
  let resolutionSelect, formatSelect, fpsSelect, exportButton,
      exportNoteElement, progressBarContainer, progressBar, progressText;
  
  // Dependency injection container
  const dependencies = {
    stateStore: {
      getState: () => ({ 
        currentProject: { 
          exportSettings: { ...DEFAULT_PROJECT_SCHEMA.exportSettings }, 
          quranSelection: {} 
        },
        exportProgress: null
      }),
      dispatch: () => {},
      subscribe: () => (() => {})
    },
    errorLogger: console,
    notificationServiceAPI: { 
      showInfo: () => {}, 
      showError: () => {}, 
      showSuccess: () => {},
      showWarning: () => {}
    },
    exportRecorderAPI: { 
      startRecording: async () => false, 
      isRecording: () => false 
    },
    mainPlaybackAPI: { 
      getCurrentPlaylist: () => [] 
    },
    localizationService: { 
      translate: key => key 
    },
    eventAggregator: {
      publish: () => {}
    }
  };

  // Private state
  let unsubscribeState = () => {};
  let eventListeners = [];

  /**
   * Initializes the UI with current state
   * @private
   */
  function _initializeUI() {
    _populateSelects();
    _setupEventListeners();
    _updateUIFromState();
  }

  /**
   * Updates UI controls based on the exportSettings from state.
   * @private
   * @param {Object} [exportSettings] - Export settings from state
   * @param {boolean} [isRecording=false] - Whether recording is in progress
   */
  function _updateUIFromState(exportSettingsState, isRecording = false) {
    try {
      const es = exportSettingsState || DEFAULT_PROJECT_SCHEMA.exportSettings;
      
      if (resolutionSelect) {
        dynamicSelectBuilder.setSelectedValue(resolutionSelect, es.resolution);
      }
      
      if (formatSelect) {
        dynamicSelectBuilder.setSelectedValue(formatSelect, es.format);
        _updateExportNote(es.format);
      }
      
      if (fpsSelect) {
        dynamicSelectBuilder.setSelectedValue(fpsSelect, String(es.fps));
      }
      
      if (exportButton) {
        exportButton.disabled = isRecording;
        exportButton.innerHTML = isRecording 
          ? `<i class="fas fa-spinner fa-spin"></i> ${dependencies.localizationService.translate('exportPanel.button.recording') || 'جاري التسجيل...'}` 
          : `<i class="fas fa-video"></i> ${dependencies.localizationService.translate('exportPanel.button') || 'تصدير الفيديو'}`;
      }
    } catch (error) {
      _handleError('Failed to update UI from state', error);
    }
  }

  /**
   * Updates the export note based on the selected format.
   * @private
   * @param {string} selectedFormatKey - The selected export format
   */
  function _updateExportNote(selectedFormatKey) {
    try {
      if (exportNoteElement) {
        if (SUPPORTED_FORMATS[selectedFormatKey] && SUPPORTED_FORMATS[selectedFormatKey].noteKey) {
          exportNoteElement.textContent = dependencies.localizationService.translate(SUPPORTED_FORMATS[selectedFormatKey].noteKey) || '';
        } else {
          exportNoteElement.textContent = '';
        }
      }
    } catch (error) {
      _handleError('Failed to update export note', error);
    }
  }

  /**
   * Handles changes from export settings select dropdowns.
   * @private
   * @param {Event} event - The change event
   */
  function _handleSettingsChange(event) {
    try {
      const projectExportSettings = dependencies.stateStore.getState().currentProject?.exportSettings || { ...DEFAULT_PROJECT_SCHEMA.exportSettings };
      let updatedSettings = { ...projectExportSettings };
      
      switch (event.target) {
        case resolutionSelect:
          updatedSettings.resolution = resolutionSelect.value;
          break;
        case formatSelect:
          updatedSettings.format = formatSelect.value;
          _updateExportNote(updatedSettings.format);
          break;
        case fpsSelect:
          updatedSettings.fps = parseInt(fpsSelect.value, 10);
          break;
        default:
          return;
      }
      
      dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { exportSettings: updatedSettings });
    } catch (error) {
      _handleError('Failed to handle settings change', error);
    }
  }

  /**
   * Populates select elements with their options.
   * @private
   */
  function _populateSelects() {
    try {
      if (resolutionSelect) {
        dynamicSelectBuilder.populateSelect({
          selectElement: resolutionSelect,
          data: Object.entries(SUPPORTED_RESOLUTIONS).map(([value, { name }]) => ({ value, name })),
          valueField: 'value', 
          textField: 'name',
        });
      }
      
      if (formatSelect) {
        dynamicSelectBuilder.populateSelect({
          selectElement: formatSelect,
          data: Object.entries(SUPPORTED_FORMATS).map(([value, { name }]) => ({ value, name })),
          valueField: 'value', 
          textField: 'name',
        });
      }
      
      if (fpsSelect) {
        dynamicSelectBuilder.populateSelect({
          selectElement: fpsSelect,
          data: Object.entries(SUPPORTED_FRAMERATES).map(([value, { name }]) => ({ value, name })),
          valueField: 'value', 
          textField: 'name',
        });
      }
    } catch (error) {
      _handleError('Failed to populate selects', error);
    }
  }

  /**
   * Estimates the total video duration based on the current playlist and settings.
   * @private
   * @returns {number} Estimated duration in seconds
   */
  function _estimateTotalDuration() {
    try {
      const project = dependencies.stateStore.getState().currentProject;
      const playlist = dependencies.mainPlaybackAPI.getCurrentPlaylist();
      
      if (!project || !playlist || playlist.length === 0) return 0;
      
      const delayBetweenAyahs = project.quranSelection?.delayBetweenAyahs ?? DEFAULT_PROJECT_SCHEMA.quranSelection.delayBetweenAyahs;
      let totalDuration = 0;
      
      playlist.forEach((item, index) => {
        totalDuration += item.duration || 5;
        if (index < playlist.length - 1) {
          totalDuration += delayBetweenAyahs;
        }
      });
      
      return totalDuration;
    } catch (error) {
      _handleError('Failed to estimate total duration', error);
      return 0;
    }
  }

  /**
   * Handles the export button click.
   * @private
   */
  async function _handleExportButtonClick() {
    try {
      if (dependencies.exportRecorderAPI.isRecording()) {
        return;
      }

      const project = dependencies.stateStore.getState().currentProject;
      if (!project) {
        dependencies.notificationServiceAPI.showError('لا يوجد مشروع لتحميله للتصدير.');
        return;
      }

      const playlist = dependencies.mainPlaybackAPI.getCurrentPlaylist();
      const anyAyahNotReady = playlist.some(item => 
        !item.isReady || item.duration === null || item.duration <= 0
      );

      if (anyAyahNotReady) {
        dependencies.notificationServiceAPI.showWarning('بعض الآيات لم يتم تحميل بيانات الصوت لها بالكامل. قد تكون مدة الفيديو غير دقيقة.');
      }

      const estimatedDuration = _estimateTotalDuration();
      
      if (estimatedDuration <= 0) {
        dependencies.notificationServiceAPI.showError('لا يمكن تقدير مدة الفيديو أو المدة صفر. يرجى تحديد آيات.');
        return;
      }

      // Dispatch start event
      dependencies.eventAggregator.publish(EVENTS.EXPORT_START_REQUESTED, { duration: estimatedDuration });
      
      // Start recording
      const started = await dependencies.exportRecorderAPI.startRecording(estimatedDuration);
      
      if (!started) {
        dependencies.notificationServiceAPI.showError('فشل في بدء التسجيل. يرجى التحقق من إعدادات التصدير.');
      }
    } catch (error) {
      _handleError('Failed to handle export button click', error);
    }
  }

  /**
   * Updates the progress bar UI.
   * @private
   * @param {Object} progress - Progress information
   * @param {number} [progress.percentage] - Percentage completed
   * @param {string} [progress.statusMessage] - Status message to display
   */
  function _updateProgressBar({ percentage, statusMessage }) {
    try {
      if (progressBarContainer) {
        progressBarContainer.style.display = (percentage !== null && percentage >= 0) ? 'block' : 'none';
      }
      
      if (progressBar && percentage !== null) {
        progressBar.value = Math.max(0, Math.min(100, percentage));
      }
      
      if (progressText && statusMessage !== undefined) {
        progressText.textContent = statusMessage !== null ? statusMessage : '';
      }
    } catch (error) {
      _handleError('Failed to update progress bar', error);
    }
  }

  /**
   * Sets up event listeners for UI elements.
   * @private
   */
  function _setupEventListeners() {
    try {
      // Clean up existing listeners
      _removeEventListeners();
      
      // Add new listeners
      [resolutionSelect, formatSelect, fpsSelect].forEach(el => {
        if (el) {
          const handler = _handleSettingsChange;
          el.addEventListener('change', handler);
          eventListeners.push({ element: el, handler });
        }
      });
      
      if (exportButton) {
        const handler = _handleExportButtonClick;
        exportButton.addEventListener('click', handler);
        eventListeners.push({ element: exportButton, handler });
      }
    } catch (error) {
      _handleError('Failed to set up event listeners', error);
    }
  }

  /**
   * Removes all event listeners.
   * @private
   */
  function _removeEventListeners() {
    try {
      eventListeners.forEach(({ element, handler }) => {
        if (element && handler) {
          element.removeEventListener('change', handler);
        }
      });
      eventListeners = [];
    } catch (error) {
      _handleError('Failed to remove event listeners', error);
    }
  }

  /**
   * Handles errors gracefully.
   * @private
   * @param {string} message - Error message
   * @param {Error} [error] - Error object
   */
  function _handleError(message, error = null) {
    const errorObj = {
      message,
      origin: 'ExportSettingsUI',
      severity: 'error',
      ...(error && { error })
    };
    
    (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, errorObj);
    dependencies.notificationServiceAPI.showError(`حدث خطأ: ${message}`);
    
    if (error) {
      console.error('Export Settings UI Error Details:', error);
    }
  }

  /**
   * Injects dependencies into the module.
   * @private
   * @param {Object} injectedDeps - Dependencies to inject
   */
  function _setDependencies(injectedDeps) {
    try {
      Object.keys(dependencies).forEach(key => {
        if (injectedDeps[key]) dependencies[key] = injectedDeps[key];
      });
    } catch (error) {
      _handleError('Failed to set dependencies', error);
    }
  }

  return {
    _setDependencies,
    
    /**
     * Initializes the UI with the provided dependencies.
     * @param {Object} injectedDeps - Dependencies to inject
     */
    setupUI(injectedDeps) {
      try {
        // Set dependencies
        _setDependencies(injectedDeps);
        
        // Cache DOM elements
        resolutionSelect = DOMElements.exportResolutionSelect;
        formatSelect = DOMElements.exportFormatSelect;
        fpsSelect = DOMElements.exportFpsSelect;
        exportButton = DOMElements.exportVideoBtn;
        exportNoteElement = DOMElements.exportProcessNote;
        progressBarContainer = DOMElements.exportProgressBarContainer;
        progressBar = DOMElements.exportProgressBar;
        progressText = DOMElements.exportProgressText;
        
        // Initialize UI
        _initializeUI();
        
        // Subscribe to state changes
        unsubscribeState = dependencies.stateStore.subscribe((newState) => {
          try {
            _updateUIFromState(
              newState.currentProject?.exportSettings, 
              newState.exportProgress !== null
            );
            
            if (newState.exportProgress) {
              _updateProgressBar(newState.exportProgress);
            } else {
              _updateProgressBar({ percentage: null, statusMessage: null });
            }
          } catch (error) {
            _handleError('State subscription handler failed', error);
          }
        });
        
        // Initial UI sync
        const initialState = dependencies.stateStore.getState();
        _updateUIFromState(
          initialState.currentProject?.exportSettings, 
          initialState.exportProgress !== null
        );
        
        if (initialState.exportProgress) {
          _updateProgressBar(initialState.exportProgress);
        } else {
          _updateProgressBar({ percentage: null, statusMessage: null });
        }
      } catch (error) {
        _handleError('UI setup failed', error);
      }
    }
  };
})();

/**
 * Initializes the ExportSettingsUI module.
 * @param {Object} deps - Dependencies
 * @param {Object} deps.stateStore - State store
 * @param {Object} deps.errorLogger - Error logger
 * @param {Object} deps.notificationServiceAPI - Notification service API
 * @param {Object} deps.exportRecorderAPI - Export recorder API
 * @param {Object} deps.mainPlaybackAPI - Main playback API
 * @param {Object} deps.localizationService - Localization service
 * @param {Object} deps.eventAggregator - Event aggregator
 * @returns {Object} - Initialized module
 */
export function initializeExportSettingsUI(deps) {
  try {
    exportSettingsUI._setDependencies(deps);
    
    // Set up UI
    exportSettingsUI.setupUI(deps);
    
    return {
      cleanup: () => {
        try {
          // Unsubscribe from state changes
          if (typeof exportSettingsUI._unsubscribeState === 'function') {
            exportSettingsUI._unsubscribeState();
          }
          
          // Remove event listeners
          exportSettingsUI._removeEventListeners();
        } catch (error) {
          console.error('ExportSettingsUI cleanup failed:', error);
        }
      }
    };
  } catch (error) {
    console.error('ExportSettingsUI initialization failed:', error);
    return {
      cleanup: () => {}
    };
  }
}

export default exportSettingsUI;
