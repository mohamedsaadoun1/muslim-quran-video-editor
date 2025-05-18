// js/features/video-exporter/ccapture.recorder.js

import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, EVENTS, DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';
import fileIOUtils from '../../utils/file.io.utils.js'; // For download

// Assume CCapture is loaded globally from CDN
// const CCapture = window.CCapture;

const ccaptureRecorder = (() => {
  let capturer = null;
  let isRecording = false;
  let recordedFrames = 0;
  let totalFramesToRecord = 0;
  let lastFrameTime = 0;
  let animationFrameId = null;

  // To store injected dependencies
  let dependencies = {
    stateStore: { getState: () => ({ currentProject: null }), dispatch: () => {} },
    errorLogger: console,
    notificationServiceAPI: { showInfo: () => {}, showSuccess: () => {}, showError: () => {} },
    mainRendererAPI: { renderFrame: () => {} }, // From initializeMainRenderer
    eventAggregator: { publish: () => {} }
  };


  /**
   * Initializes a new CCapture instance based on export settings.
   * @private
   * @param {object} exportSettings - From stateStore.currentProject.exportSettings
   * @param {string} exportSettings.format - 'webm', 'gif', 'png', 'jpg', etc.
   * @param {number} exportSettings.fps - Frames per second.
   * @param {string} exportSettings.resolution - e.g., "1920x1080" (used for naming, canvas actual size should be set)
   * @param {string} [exportSettings.quality] - For GIF or WebM quality.
   * @param {string} [exportSettings.name] - Optional filename base.
   * @returns {boolean} True if capturer was initialized, false otherwise.
   */
  function _initializeCapturer(exportSettings) {
    if (typeof window.CCapture === 'undefined') {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        message: 'CCapture.js library is not loaded. Video export will not work.',
        origin: 'CcaptureRecorder._initializeCapturer',
        severity: 'error'
      });
      dependencies.notificationServiceAPI.showError('مكتبة تصدير الفيديو غير مُحملة.');
      return false;
    }

    const format = exportSettings.format === 'gif' ? 'gif' : 'webm'; // CCapture supports webm, gif, png, jpg sequence
    let capturerSettings = {
      format: format,
      framerate: exportSettings.fps || DEFAULT_PROJECT_SCHEMA.exportSettings.fps,
      verbose: false, // Set to true for CCapture logs in console
      display: false, // Shows a UI with progress, set to true if desired.
      // name: exportSettings.name || `quran_video_${Date.now()}`, // Name for the CCapture instance / download
      // quality: exportSettings.quality, // 1-100 for webm/jpg, 1-10 for gif
      // workersPath: 'path/to/ccapture_workers/' // Only needed for GIF worker mode if not using default CDN path
    };
    
    if (format === 'gif') {
      capturerSettings.workersPath = 'js/vendor/ccapture-libs/'; // Adjust path if you self-host gif.worker.js etc.
      // Or let CCapture try to load from its default CDN if path is not set or invalid.
      // Ensure gif.worker.js and NeuQuant.js are accessible if using GIF.
      if (exportSettings.quality) capturerSettings.quality = parseInt(exportSettings.quality) || 10; // 1-30, lower is better. Default 10.
    } else if (format === 'webm') {
      if (exportSettings.quality) capturerSettings.quality = parseInt(exportSettings.quality) || 70; // 0-100, higher is better. Default ~70-80.
    }


    try {
      capturer = new CCapture(capturerSettings);
      // console.debug('[CcaptureRecorder] CCapture initialized with settings:', capturerSettings);
      return true;
    } catch (error) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error,
        message: 'Failed to initialize CCapture.js.',
        origin: 'CcaptureRecorder._initializeCapturer',
        context: { settings: capturerSettings }
      });
      dependencies.notificationServiceAPI.showError('فشل في تهيئة أداة تصدير الفيديو.');
      capturer = null;
      return false;
    }
  }

  /**
   * The main recording loop. Called by requestAnimationFrame.
   * Renders a frame, captures it, and requests the next frame.
   * @private
   */
  async function _recordLoop() {
    if (!isRecording || !capturer || !DOMElements.videoPreviewCanvas) {
      stopRecording(false); // Stop if conditions are not met
      return;
    }

    // Ensure frame timing according to FPS
    // This is a simplified way to attempt to match FPS.
    // CCapture itself handles some timing but requestAnimationFrame is variable.
    const projectState = dependencies.stateStore.getState().currentProject;
    const targetFps = projectState?.exportSettings?.fps || DEFAULT_PROJECT_SCHEMA.exportSettings.fps;
    const frameInterval = 1000 / targetFps;
    const currentTime = performance.now();
    const elapsed = currentTime - lastFrameTime;

    if (elapsed >= frameInterval) {
        lastFrameTime = currentTime - (elapsed % frameInterval); // Adjust for a smoother interval

        // 1. Update application state to the current export time/frame
        // This is CRITICAL. The mainPlaybackController (or a dedicated export sequencer)
        // needs to advance its state (current Ayah, text effects, etc.)
        // to what should be rendered at this specific frame/time.
        // For now, we assume `mainRendererAPI.renderFrame()` can be called
        // and it renders based on a global "current time" for export if that state exists.
        // This needs a more robust "export timeline" manager.
        
        // Let's simulate advancing time in the project's playback for each frame.
        // This part is highly dependent on how mainPlaybackController manages its internal timeline.
        // For now, we'll just re-render the current state from mainRendererAPI.
        // A proper export needs to tell mainPlaybackController "render the frame for time T".
        
        await dependencies.mainRendererAPI.renderFrame({ reason: 'exportFrame', frameNumber: recordedFrames });
        // We need a small delay or a promise/event from renderFrame to ensure canvas is drawn
        // before capturing. For now, assume renderFrame is synchronous for drawing.
        // await new Promise(r => setTimeout(r, 10)); // Small delay if needed, but undesirable

        // 2. Capture the canvas
        capturer.capture(DOMElements.videoPreviewCanvas);
        recordedFrames++;

        // 3. Update progress
        const progressPercent = Math.min(100, Math.floor((recordedFrames / totalFramesToRecord) * 100));
        dependencies.stateStore.dispatch(ACTIONS.SET_EXPORT_PROGRESS, {
            percentage: progressPercent,
            statusMessage: `تسجيل الإطار ${recordedFrames} من ${totalFramesToRecord} (${progressPercent}%)` // Needs localization
        });
        dependencies.eventAggregator.publish(EVENTS.EXPORT_PROGRESS, progressPercent);
    }


    if (recordedFrames < totalFramesToRecord) {
      animationFrameId = requestAnimationFrame(_recordLoop);
    } else {
      // All frames recorded, finalize and save.
      isRecording = false; // Set before calling stopRecording to avoid race conditions
      stopRecording(true); // true for save
    }
  }

  /**
   * Starts the video recording process.
   * @param {number} estimatedTotalDurationSeconds - The total estimated duration of the video to be recorded.
   *                                                 This is used to calculate totalFramesToRecord.
   */
  async function startRecording(estimatedTotalDurationSeconds) {
    if (isRecording) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'Recording is already in progress.',
        origin: 'CcaptureRecorder.startRecording'
      });
      return false;
    }

    const project = dependencies.stateStore.getState().currentProject;
    if (!project || !project.exportSettings) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'Cannot start recording: No project or export settings found.',
        origin: 'CcaptureRecorder.startRecording'
      });
      dependencies.notificationServiceAPI.showError('لا توجد إعدادات مشروع أو تصدير.');
      return false;
    }
    if (!DOMElements.videoPreviewCanvas) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
          message: "Canvas element not found for recording.", origin: "CcaptureRecorder.startRecording", severity: "error"
      });
      return false;
    }
    // Ensure canvas has correct dimensions based on export resolution or aspect ratio
    // This should be handled by canvas.dimension.handler reacting to state.
    // For export, canvas *drawing buffer* size must match target resolution.
    // const [exportWidth, exportHeight] = project.exportSettings.resolution.split('x').map(Number);
    // DOMElements.videoPreviewCanvas.width = exportWidth;
    // DOMElements.videoPreviewCanvas.height = exportHeight;
    // dependencies.eventAggregator.publish(EVENTS.REQUEST_CANVAS_RENDER, {reason: "preExportResize"}); // Re-render at new size
    // await new Promise(r => setTimeout(r, 100)); // Wait for render (not ideal)


    if (!_initializeCapturer(project.exportSettings)) {
      return false; // Initialization failed
    }

    totalFramesToRecord = Math.ceil(estimatedTotalDurationSeconds * project.exportSettings.fps);
    if (totalFramesToRecord <= 0) {
        (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
            message: `Calculated total frames is zero or negative (${totalFramesToRecord}). Cannot start recording. Duration: ${estimatedTotalDurationSeconds}, FPS: ${project.exportSettings.fps}`,
            origin: 'CcaptureRecorder.startRecording'
        });
        dependencies.notificationServiceAPI.showError('لا يمكن بدء التسجيل، مدة الفيديو أو الإطارات غير صالحة.');
        return false;
    }

    isRecording = true;
    recordedFrames = 0;
    lastFrameTime = performance.now();

    // Reset and prepare mainPlaybackController to start from beginning FOR EXPORT
    // This is a complex step. The playback controller needs a mode for "export rendering"
    // where it advances frame by frame instead of real-time.
    // For now, assume `mainRendererAPI.renderFrame` can render based on some external time state
    // that we'd manage here for export (e.g., incrementing time by 1/fps each frame).
    // OR: A dedicated "export sequencer" module would be better.
    
    // Dispatch start event and initial progress
    dependencies.stateStore.dispatch(ACTIONS.SET_EXPORT_PROGRESS, { percentage: 0, statusMessage: 'بدء التسجيل...' });
    dependencies.eventAggregator.publish(EVENTS.EXPORT_STARTED);
    dependencies.notificationServiceAPI.showInfo(`بدء تصدير الفيديو (${totalFramesToRecord} إطار)...`);

    capturer.start();
    animationFrameId = requestAnimationFrame(_recordLoop);
    return true;
  }

  /**
   * Stops the recording and optionally saves the file.
   * @param {boolean} [saveFile=true] - Whether to save the recorded file.
   */
  function stopRecording(saveFile = true) {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    if (!isRecording && !capturer) return; // Not recording or no capturer (already stopped/failed)
    if (!capturer) return;


    isRecording = false; // Set flag first

    dependencies.stateStore.dispatch(ACTIONS.SET_EXPORT_PROGRESS, {
        percentage: 100,
        statusMessage: saveFile ? 'جاري إنهاء وحفظ الملف...' : 'تم إيقاف التسجيل.'
    });

    capturer.stop(); // Stop CCapture instance

    if (saveFile) {
      dependencies.notificationServiceAPI.showInfo('جاري تجهيز الملف للتنزيل...');
      capturer.save((blob) => {
        const project = dependencies.stateStore.getState().currentProject;
        const filenameBase = project?.title || DEFAULT_PROJECT_SCHEMA.title;
        const exportFormat = project?.exportSettings?.format || DEFAULT_PROJECT_SCHEMA.exportSettings.format;
        const safeFilename = filenameBase.replace(/[^a-z0-9أ-ي\s_-]/gi, '').replace(/\s+/g, '_');
        const downloadFilename = `${safeFilename}_${Date.now()}.${exportFormat === 'gif' ? 'gif' : 'webm'}`;

        fileIOUtils.downloadFile(blob, downloadFilename, blob.type);
        dependencies.notificationServiceAPI.showSuccess(`تم تصدير الفيديو "${downloadFilename}" بنجاح!`);
        dependencies.stateStore.dispatch(ACTIONS.SET_EXPORT_PROGRESS, null); // Clear progress
        dependencies.eventAggregator.publish(EVENTS.EXPORT_COMPLETED, { success: true, filename: downloadFilename });
        capturer = null; // Release capturer instance
      });
    } else {
      dependencies.notificationServiceAPI.showInfo('تم إيقاف تصدير الفيديو.');
      dependencies.stateStore.dispatch(ACTIONS.SET_EXPORT_PROGRESS, null);
      dependencies.eventAggregator.publish(EVENTS.EXPORT_COMPLETED, { success: false, cancelled: true });
      capturer = null; // Release capturer instance
    }
  }
  
  function _setDependencies(injectedDeps) {
    if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.notificationServiceAPI) dependencies.notificationServiceAPI = injectedDeps.notificationServiceAPI;
    if (injectedDeps.mainRendererAPI) dependencies.mainRendererAPI = injectedDeps.mainRendererAPI;
    if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
  }


  return {
    _setDependencies,
    startRecording,
    stopRecording, // Allow manual stop (e.g., cancel button)
    isRecording: () => isRecording,
  };
})();


/**
 * Initialization function for the CcaptureRecorder.
 * @param {object} deps
 * @param {import('../../core/state-store.js').default} deps.stateStore
 * @param {import('../../core/error-logger.js').default} deps.errorLogger
 * @param {import('../../shared-ui-components/notification.presenter.js').ReturnType<initializeNotificationPresenter>} deps.notificationServiceAPI
 * @param {{renderFrame: Function}} deps.mainRendererAPI - API from initializeMainRenderer
 * @param {import('../../core/event-aggregator.js').default} deps.eventAggregator
 */
export function initializeCcaptureRecorder(deps) {
  ccaptureRecorder._setDependencies(deps);

  // This module's primary interaction is via its `startRecording` method.
  // It doesn't usually have persistent UI elements it manages directly other than responding to a "start export" button.

  // console.info('[CcaptureRecorder] Initialized.');
  return {
    startRecording: ccaptureRecorder.startRecording,
    stopRecording: ccaptureRecorder.stopRecording, // Expose for a cancel button
    isRecording: ccaptureRecorder.isRecording,
  };
}

export default ccaptureRecorder;
