// js/features/video-exporter/export-settings.ui.js

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, DEFAULT_PROJECT_SCHEMA, EVENTS } from '../../config/app.constants.js';
import dynamicSelectBuilder from '../../shared-ui-components/dynamic-select.builder.js';
// import timeFormatter from '../../utils/time.formatter.js'; // If displaying estimated duration

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
  'webm': { name: 'WebM (فيديو - بدون صوت مبدئيًا)', extension: 'webm', noteKey: 'exportPanel.note.webm', needsAudioMerge: true },
  'gif': { name: 'GIF (صورة متحركة - بدون صوت)', extension: 'gif', noteKey: 'exportPanel.note.gif', needsAudioMerge: false },
  // 'mp4': { name: 'MP4 (قيد التطوير - FFmpeg)', extension: 'mp4', noteKey: 'exportPanel.note.mp4', needsAudioMerge: false }, // Requires FFmpeg
  // 'png_sequence': { name: 'PNG Sequence (صور)', extension: 'zip' }, // If CCapture supports zipping
};

export const SUPPORTED_FRAMERATES = {
  15: { name: '15 إطار/ث (منخفض جداً)' },
  24: { name: '24 إطار/ث (سينمائي)' },
  25: { name: '25 إطار/ث (PAL قياسي)' },
  30: { name: '30 إطار/ث (NTSC قياسي)' },
  // 50: { name: '50 إطار/ث (PAL عالي)' },
  // 60: { name: '60 إطار/ث (سلس جدًا)' }, // Higher FPS = larger files, longer processing
};
// --- End Configuration ---


const exportSettingsUI = (() => {
  // DOM element references
  let resolutionSelect, formatSelect, fpsSelect, exportButton,
      exportNoteElement, progressBarContainer, progressBar, progressText;

  let dependencies = {
    stateStore: {
        getState: () => ({ currentProject: { exportSettings: { ...DEFAULT_PROJECT_SCHEMA.exportSettings }, quranSelection: {}, mainPlaybackState: { currentPlaylist: [] } } }),
        dispatch: () => {},
        subscribe: () => (() => {})
    },
    errorLogger: console,
    notificationServiceAPI: { showInfo: () => {}, showError: () => {} },
    exportRecorderAPI: { startRecording: async () => false, isRecording: () => false }, // from ccapture.recorder.js
    // For calculating total duration, we might need access to current playlist with durations.
    // This might come from stateStore if mainPlaybackController updates it there, or via mainPlaybackAPI.
    mainPlaybackAPI: { getCurrentPlaylist: () => [] }, // from main-playback.controller.js
    localizationService: { translate: key => key } // For notes
  };

  /** Updates UI controls based on the exportSettings from state. @private */
  function _updateUIFromState(exportSettingsState, isRecording = false) {
    const es = exportSettingsState || DEFAULT_PROJECT_SCHEMA.exportSettings;

    if (resolutionSelect && resolutionSelect.value !== es.resolution) dynamicSelectBuilder.setSelectedValue(resolutionSelect, es.resolution);
    if (formatSelect && formatSelect.value !== es.format) dynamicSelectBuilder.setSelectedValue(formatSelect, es.format);
    if (fpsSelect && fpsSelect.value !== String(es.fps)) dynamicSelectBuilder.setSelectedValue(fpsSelect, String(es.fps));

    if (exportButton) {
      exportButton.disabled = isRecording;
      exportButton.textContent = isRecording ? 
        (dependencies.localizationService?.translate('exportPanel.button.recording') || 'جاري التسجيل...') :
        (dependencies.localizationService?.translate('exportPanel.button') || 'تصدير الفيديو');
    }
    
    _updateExportNote(es.format);
  }
  
  /** Updates the export note based on the selected format. @private */
  function _updateExportNote(selectedFormatKey) {
    if (exportNoteElement && SUPPORTED_FORMATS[selectedFormatKey] && SUPPORTED_FORMATS[selectedFormatKey].noteKey) {
        exportNoteElement.textContent = dependencies.localizationService.translate(SUPPORTED_FORMATS[selectedFormatKey].noteKey) || '';
    } else if (exportNoteElement) {
        exportNoteElement.textContent = ''; // Clear note if no specific one
    }
  }

  /** Handles changes from export settings select dropdowns. @private */
  function _handleSettingsChange(event) {
    const projectExportSettings = dependencies.stateStore.getState().currentProject?.exportSettings || { ...DEFAULT_PROJECT_SCHEMA.exportSettings };
    let updatedSettings = { ...projectExportSettings };

    switch (event.target) {
      case resolutionSelect:
        updatedSettings.resolution = resolutionSelect.value;
        break;
      case formatSelect:
        updatedSettings.format = formatSelect.value;
        _updateExportNote(updatedSettings.format); // Update note immediately
        break;
      case fpsSelect:
        updatedSettings.fps = parseInt(fpsSelect.value, 10);
        break;
      default:
        return;
    }
    dependencies.stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { exportSettings: updatedSettings });
  }

  /** Populates select elements with their options. @private */
  function _populateSelects() {
    if (resolutionSelect) {
      dynamicSelectBuilder.populateSelect({
        selectElement: resolutionSelect,
        data: Object.entries(SUPPORTED_RESOLUTIONS).map(([value, { name }]) => ({ value, name })),
        valueField: 'value', textField: 'name',
      });
    }
    if (formatSelect) {
      dynamicSelectBuilder.populateSelect({
        selectElement: formatSelect,
        data: Object.entries(SUPPORTED_FORMATS).map(([value, { name }]) => ({ value, name })),
        valueField: 'value', textField: 'name',
      });
    }
    if (fpsSelect) {
      dynamicSelectBuilder.populateSelect({
        selectElement: fpsSelect,
        data: Object.entries(SUPPORTED_FRAMERATES).map(([value, { name }]) => ({ value, name })),
        valueField: 'value', textField: 'name',
      });
    }
  }
  
  /** Estimates the total video duration based on the current playlist and settings. @private */
  function _estimateTotalDuration() {
      const project = dependencies.stateStore.getState().currentProject;
      const playlist = dependencies.mainPlaybackAPI.getCurrentPlaylist(); // Get from main playback controller
      
      if (!project || !playlist || playlist.length === 0) return 0;

      const delayBetweenAyahs = project.quranSelection?.delayBetweenAyahs ?? DEFAULT_PROJECT_SCHEMA.quranSelection.delayBetweenAyahs;
      let totalDuration = 0;

      playlist.forEach((item, index) => {
          totalDuration += item.duration || 5; // Use actual duration, or fallback (5s is placeholder if not loaded)
          if (index < playlist.length - 1) {
              totalDuration += delayBetweenAyahs;
          }
      });
      return totalDuration;
  }

  /** Handles the export button click. @private */
  async function _handleExportButtonClick() {
    if (dependencies.exportRecorderAPI.isRecording()) {
      // Optionally implement a "Cancel Export" functionality
      // dependencies.exportRecorderAPI.stopRecording(false); // false means don't save
      // dependencies.notificationServiceAPI.showInfo('تم إلغاء التصدير.');
      return;
    }

    const project = dependencies.stateStore.getState().currentProject;
    if (!project) {
      dependencies.notificationServiceAPI.showError('لا يوجد مشروع لتحميله للتصدير.');
      return;
    }

    // Ensure all audio for playlist items is ready (has duration) for accurate total time
    const playlist = dependencies.mainPlaybackAPI.getCurrentPlaylist();
    const anyAyahNotReady = playlist.some(item => !item.isReady || item.duration === null || item.duration <= 0);
    if (anyAyahNotReady) {
        // dependencies.notificationServiceAPI.showWarning('بعض الآيات لم يتم تحميل بيانات الصوت لها بالكامل. قد تكون مدة الفيديو غير دقيقة. يتم محاولة جلب البيانات...');
        // A more robust solution would be to ensure all audio data (especially durations) is preloaded
        // by the `mainPlaybackController` or `ayahAudioRetriever` when the playlist is built
        // or before export is allowed.
        // For now, we proceed, and _estimateTotalDuration uses fallback.
    }

    const estimatedDuration = _estimateTotalDuration();
    if (estimatedDuration <= 0) {
      dependencies.notificationServiceAPI.showError('لا يمكن تقدير مدة الفيديو أو المدة صفر. يرجى تحديد آيات.');
      return;
    }

    // console.debug(`[ExportSettingsUI] Starting export. Estimated duration: ${estimatedDuration}s`);
    // The canvas dimensions should match the export resolution.
    // canvas.dimension.handler is responsible for setting canvas.width/height when aspect ratio/resolution changes.
    // For export, it might be good to ensure the *current* selected resolution from export settings
    // is applied to the canvas drawing buffer before starting.
    // This synchronization needs careful handling.

    dependencies.exportRecorderAPI.startRecording(estimatedDuration);
  }

  /** Updates the progress bar UI. @private */
  function _updateProgressBar({ percentage, statusMessage }) {
    if (progressBarContainer) {
      progressBarContainer.style.display = (percentage !== null && percentage >= 0) ? 'block' : 'none';
    }
    if (progressBar && percentage !== null) {
      progressBar.value = Math.max(0, Math.min(100, percentage));
    }
    if (progressText && statusMessage !== undefined) {
      progressText.textContent = statusMessage !== null ? statusMessage : '';
    }
  }

  function _setDependencies(injectedDeps) {
    Object.assign(dependencies, injectedDeps);
  }

  return {
    _setDependencies,
    // setupUI, // Might be called from initialize
  };
})();


/**
 * Initialization function for the ExportSettingsUI.
 * @param {object} deps
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * @param {import('../../shared-ui-components/notification.presenter.js').ReturnType<initializeNotificationPresenter>} deps.notificationServiceAPI
 * @param {ReturnType<import('./ccapture.recorder.js').initializeCcaptureRecorder>} deps.exportRecorderAPI
 * @param {ReturnType<import('../audio-engine/main-playback.controller.js').initializeMainPlaybackController>} deps.mainPlaybackAPI
 * @param {import('../../core/localization.service.js').default} deps.localizationService
 * @param {import('../../core/event-aggregator.js').default} deps.eventAggregator
 */
export function initializeExportSettingsUI(deps) {
  exportSettingsUI._setDependencies(deps);
  const { stateStore, errorLogger, exportRecorderAPI, eventAggregator } = deps;

  // Cache DOM elements locally for the handlers
  exportSettingsUI.resolutionSelectRef = DOMElements.exportResolutionSelect;
  exportSettingsUI.formatSelectRef = DOMElements.exportFormatSelect;
  exportSettingsUI.fpsSelectRef = DOMElements.exportFpsSelect;
  exportSettingsUI.exportButtonRef = DOMElements.exportVideoBtn;
  exportSettingsUI.exportNoteElRef = DOMElements.exportProcessNote; // Check ID in your HTML
  exportSettingsUI.progressBarContRef = DOMElements.exportProgressBarContainer;
  exportSettingsUI.progressBarRef = DOMElements.exportProgressBar;
  exportSettingsUI.progressTextRef = DOMElements.exportProgressText;

  // --- Direct handlers using deps from closure ---
  const _updateUIFromStateDirect = (exportSettings, isRec) => {
    const es = exportSettings || DEFAULT_PROJECT_SCHEMA.exportSettings;
    if(exportSettingsUI.resolutionSelectRef) dynamicSelectBuilder.setSelectedValue(exportSettingsUI.resolutionSelectRef, es.resolution);
    if(exportSettingsUI.formatSelectRef) dynamicSelectBuilder.setSelectedValue(exportSettingsUI.formatSelectRef, es.format);
    if(exportSettingsUI.fpsSelectRef) dynamicSelectBuilder.setSelectedValue(exportSettingsUI.fpsSelectRef, String(es.fps));
    if(exportSettingsUI.exportButtonRef) {
        exportSettingsUI.exportButtonRef.disabled = isRec;
        exportSettingsUI.exportButtonRef.innerHTML = isRec ? // InnerHTML to allow icons
            `<i class="fas fa-spinner fa-spin"></i> ${deps.localizationService.translate('exportPanel.button.recording') || 'جاري التسجيل...'}` :
            `<i class="fas fa-video"></i> ${deps.localizationService.translate('exportPanel.button') || 'تصدير الفيديو'}`;
    }
    if (exportSettingsUI.exportNoteElRef && SUPPORTED_FORMATS[es.format]?.noteKey) {
        exportSettingsUI.exportNoteElRef.textContent = deps.localizationService.translate(SUPPORTED_FORMATS[es.format].noteKey) || '';
    } else if (exportSettingsUI.exportNoteElRef) {
        exportSettingsUI.exportNoteElRef.textContent = '';
    }
  };
  
  const _updateProgressBarDirect = ({ percentage, statusMessage }) => {
    if (exportSettingsUI.progressBarContRef) exportSettingsUI.progressBarContRef.style.display = (percentage !== null && percentage >= 0) ? 'block' : 'none';
    if (exportSettingsUI.progressBarRef && percentage !== null) exportSettingsUI.progressBarRef.value = Math.max(0, Math.min(100, percentage));
    if (exportSettingsUI.progressTextRef && statusMessage !== undefined) exportSettingsUI.progressTextRef.textContent = statusMessage !== null ? statusMessage : '';
  };

  const _populateSelectsDirect = () => {
      if(exportSettingsUI.resolutionSelectRef) dynamicSelectBuilder.populateSelect({ selectElement: exportSettingsUI.resolutionSelectRef, data: Object.entries(SUPPORTED_RESOLUTIONS).map(([v,{n}])=>({value:v, name:n})), valueField:'value', textField:'name'});
      if(exportSettingsUI.formatSelectRef) dynamicSelectBuilder.populateSelect({ selectElement: exportSettingsUI.formatSelectRef, data: Object.entries(SUPPORTED_FORMATS).map(([v,{n}])=>({value:v, name:n})), valueField:'value', textField:'name'});
      if(exportSettingsUI.fpsSelectRef) dynamicSelectBuilder.populateSelect({ selectElement: exportSettingsUI.fpsSelectRef, data: Object.entries(SUPPORTED_FRAMERATES).map(([v,{n}])=>({value:v, name:n})), valueField:'value', textField:'name'});
  };
  _populateSelectsDirect();


  const _handleSettingsChangeEvent = (event) => {
    const currentSettings = stateStore.getState().currentProject?.exportSettings || { ...DEFAULT_PROJECT_SCHEMA.exportSettings };
    let updatedSettings = { ...currentSettings };
    const target = event.target;
    if (target === exportSettingsUI.resolutionSelectRef) updatedSettings.resolution = target.value;
    else if (target === exportSettingsUI.formatSelectRef) updatedSettings.format = target.value;
    else if (target === exportSettingsUI.fpsSelectRef) updatedSettings.fps = parseInt(target.value, 10);
    else return;
    stateStore.dispatch(ACTIONS.UPDATE_PROJECT_SETTINGS, { exportSettings: updatedSettings });
  };
  [exportSettingsUI.resolutionSelectRef, exportSettingsUI.formatSelectRef, exportSettingsUI.fpsSelectRef].forEach(el => {
      if (el) el.addEventListener('change', _handleSettingsChangeEvent);
  });
  
  
  const _estimateTotalDurationDirect = () => {
    const project = deps.stateStore.getState().currentProject;
    const playlist = deps.mainPlaybackAPI.getCurrentPlaylist();
    if (!project || !playlist || playlist.length === 0) return 0;
    const delay = project.quranSelection?.delayBetweenAyahs ?? DEFAULT_PROJECT_SCHEMA.quranSelection.delayBetweenAyahs;
    let total = 0;
    playlist.forEach((item, i) => { total += (item.duration || 5) + (i < playlist.length - 1 ? delay : 0); });
    return total;
  };


  const _handleExportButtonClickDirect = async () => {
      if (exportRecorderAPI.isRecording()) return;
      const estimatedDur = _estimateTotalDurationDirect();
      if (estimatedDur <= 0) {
          deps.notificationServiceAPI.showError('لا يمكن تقدير مدة الفيديو. يرجى تحديد الآيات وتجهيز الصوتيات.');
          return;
      }
      // TODO: Add logic to ensure canvas is set to export resolution *before* starting recording.
      // This might involve dispatching an action that canvas.dimension.handler listens to,
      // then waiting for a CANVAS_RESIZED event, then starting recording.
      // For now, assumes canvas is already at the correct *drawing buffer* size.
      exportRecorderAPI.startRecording(estimatedDur);
  };
  if(exportSettingsUI.exportButtonRef) exportSettingsUI.exportButtonRef.addEventListener('click', _handleExportButtonClickDirect);


  // Subscribe to state changes for export settings and progress
  const unsubscribeState = stateStore.subscribe((newState) => {
    _updateUIFromStateDirect(newState.currentProject?.exportSettings, newState.exportProgress !== null);
    if (newState.exportProgress) {
        _updateProgressBarDirect(newState.exportProgress);
    } else {
        _updateProgressBarDirect({percentage: null, statusMessage: null}); // Hide progress
    }
  });

  // Initial UI sync
  const initialState = stateStore.getState();
  _updateUIFromStateDirect(initialState.currentProject?.exportSettings, initialState.exportProgress !== null);
  if(initialState.exportProgress) _updateProgressBarDirect(initialState.exportProgress);
  else _updateProgressBarDirect({percentage: null, statusMessage: null});


  // console.info('[ExportSettingsUI] Initialized.');
  return {
    cleanup: () => {
      unsubscribeState();
      [exportSettingsUI.resolutionSelectRef, exportSettingsUI.formatSelectRef, exportSettingsUI.fpsSelectRef].forEach(el => {
          if(el) el.removeEventListener('change', _handleSettingsChangeEvent);
      });
      if(exportSettingsUI.exportButtonRef) exportSettingsUI.exportButtonRef.removeEventListener('click', _handleExportButtonClickDirect);
      // console.info('[ExportSettingsUI] Cleaned up.');
    }
  };
}

export default exportSettingsUI;
