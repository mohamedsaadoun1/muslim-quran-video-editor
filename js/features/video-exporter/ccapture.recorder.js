// js/features/video-exporter/ccapture.recorder.js
import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, EVENTS, DEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';
import fileIOUtils from '../../utils/file.io.utils.js';

/**
 * @typedef {Object} ExportSettings
 * @property {string} format - 'webm'|'gif'|'png'|'jpg'
 * @property {number} fps - Frames per second
 * @property {string} resolution - e.g., "1920x1080"
 * @property {number} [quality] - 1-100 for webm/jpg, 1-30 for gif
 * @property {string} [name] - Optional filename base
 */

const ccaptureRecorder = (() => {
  /** @type {CCapture|null} */
  let capturer = null;
  let isRecording = false;
  let recordedFrames = 0;
  let totalFramesToRecord = 0;
  let lastFrameTime = 0;
  let animationFrameId = null;
  
  // Worker paths for self-hosting
  const WORKER_PATHS = {
    gif: 'js/vendor/ccapture-libs/',
    default: 'https://cdn.jsdelivr.net/npm/ccapture.js @1.0.0/build/'
  };

  // Dependency injection container
  const dependencies = {
    stateStore: { 
      getState: () => ({ currentProject: null }), 
      dispatch: () => {} 
    },
    errorLogger: console,
    notificationServiceAPI: { 
      showInfo: () => {}, 
      showSuccess: () => {}, 
      showError: () => {} 
    },
    mainRendererAPI: { 
      renderFrame: async () => {} // Async now
    },
    eventAggregator: { 
      publish: () => {} 
    }
  };

  /**
   * Initializes CCapture instance with error handling and fallbacks
   * @param {ExportSettings} exportSettings 
   * @returns {Promise<boolean>}
   */
  async function _initializeCapturer(exportSettings) {
    // Auto-load CCapture if not available
    if (typeof window.CCapture === 'undefined') {
      await _loadCCaptureLibrary();
    }

    if (typeof window.CCapture === 'undefined') {
      _handleCriticalError('CCapture.js library failed to load. Video export unavailable.');
      return false;
    }

    try {
      const settings = _buildCapturerSettings(exportSettings);
      capturer = new window.CCapture(settings);
      dependencies.eventAggregator.publish(EVENTS.EXPORT_PROGRESS, 0);
      return true;
    } catch (error) {
      _handleCriticalError('CCapture initialization failed', error);
      return false;
    }
  }

  /**
   * Builds CCapture settings object with format-specific optimizations
   * @param {ExportSettings} exportSettings 
   * @returns {Object}
   */
  function _buildCapturerSettings(exportSettings) {
    const format = ['gif', 'webm', 'png', 'jpg'].includes(exportSettings.format) 
      ? exportSettings.format 
      : 'webm';

    const settings = {
      format,
      framerate: Math.max(1, Math.min(60, exportSettings.fps || DEFAULT_PROJECT_SCHEMA.exportSettings.fps)),
      verbose: false,
      display: false,
      name: exportSettings.name || `quran_video_${Date.now()}`,
      workersPath: WORKER_PATHS.gif,
      fallbackWorkerPath: WORKER_PATHS.default,
      quality: _calculateQuality(format, exportSettings.quality)
    };

    // Canvas size adjustment
    if (exportSettings.resolution?.includes('x')) {
      const [width, height] = exportSettings.resolution.split('x').map(Number);
      if (width > 0 && height > 0) {
        DOMElements.videoPreviewCanvas.width = width;
        DOMElements.videoPreviewCanvas.height = height;
      }
    }

    return settings;
  }

  /**
   * Calculates optimal quality based on format
   * @param {'gif'|'webm'} format 
   * @param {number} [userQuality]
   * @returns {number}
   */
  function _calculateQuality(format, userQuality) {
    if (!userQuality) {
      return format === 'gif' ? 10 : 70;
    }
    
    const numQuality = Math.round(Number(userQuality));
    if (format === 'gif') {
      return Math.max(1, Math.min(30, numQuality)); // GIF range: 1-30
    }
    return Math.max(1, Math.min(100, numQuality)); // WebM range: 1-100
  }

  /**
   * Loads CCapture library dynamically with fallback
   * @returns {Promise<void>}
   */
  function _loadCCaptureLibrary() {
    return new Promise((resolve, reject) => {
      if (typeof window.CCapture === 'function') {
        return resolve();
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/ccapture.js @1.0.0/build/ccapture.min.js';
      script.onload = resolve;
      script.onerror = () => {
        _handleCriticalError('Failed to load CCapture.js from CDN');
        reject(new Error('CCapture.js load failed'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Main recording loop with async frame rendering
   */
  async function _recordLoop() {
    if (!_validateRecordingState()) return;

    const projectState = dependencies.stateStore.getState().currentProject;
    const fps = projectState.exportSettings.fps;
    const frameInterval = 1000 / fps;
    const currentTime = performance.now();
    
    if (currentTime - lastFrameTime >= frameInterval) {
      try {
        // Render frame with async/await
        await dependencies.mainRendererAPI.renderFrame({
          reason: 'exportFrame',
          frameNumber: recordedFrames,
          timestamp: currentTime
        });

        // Capture frame
        capturer.capture(DOMElements.videoPreviewCanvas);
        recordedFrames++;
        
        // Update progress
        const progress = Math.min(100, Math.floor((recordedFrames / totalFramesToRecord) * 100));
        _updateProgress(progress);
        
        lastFrameTime = currentTime;
      } catch (error) {
        _handleCriticalError('Frame rendering failed', error);
        stopRecording(false);
        return;
      }
    }

    if (recordedFrames < totalFramesToRecord) {
      animationFrameId = requestAnimationFrame(_recordLoop);
    } else {
      _finalizeRecording();
    }
  }

  /**
   * Validates recording state before proceeding
   * @returns {boolean}
   */
  function _validateRecordingState() {
    if (!isRecording || !capturer || !DOMElements.videoPreviewCanvas) {
      stopRecording(false);
      return false;
    }
    return true;
  }

  /**
   * Updates export progress in state and UI
   * @param {number} percentage 
   */
  function _updateProgress(percentage) {
    const message = `تسجيل الإطار ${recordedFrames} من ${totalFramesToRecord} (${percentage}%)`;
    dependencies.stateStore.dispatch(ACTIONS.SET_EXPORT_PROGRESS, {
      percentage,
      statusMessage: message
    });
    dependencies.eventAggregator.publish(EVENTS.EXPORT_PROGRESS, percentage);
  }

  /**
   * Finalizes recording and handles file save
   */
  function _finalizeRecording() {
    isRecording = false;
    capturer.stop();
    
    dependencies.stateStore.dispatch(ACTIONS.SET_EXPORT_PROGRESS, {
      percentage: 100,
      statusMessage: 'جاري إنهاء وحفظ الملف...'
    });

    dependencies.notificationServiceAPI.showInfo('جاري تجهيز الملف للتنزيل...');
    
    capturer.save((blob) => {
      const project = dependencies.stateStore.getState().currentProject;
      const filename = _generateFilename(project);
      
      fileIOUtils.downloadFile(blob, filename, blob.type);
      
      dependencies.notificationServiceAPI.showSuccess(`تم تصدير الفيديو "${filename}" بنجاح!`);
      dependencies.stateStore.dispatch(ACTIONS.SET_EXPORT_PROGRESS, null);
      dependencies.eventAggregator.publish(EVENTS.EXPORT_COMPLETED, { 
        success: true, 
        filename 
      });
      
      _cleanup();
    });
  }

  /**
   * Generates a safe filename for export
   * @param {Object} project 
   * @returns {string}
   */
  function _generateFilename(project) {
    const base = (project.title || DEFAULT_PROJECT_SCHEMA.title)
      .replace(/[^a-z0-9أ-ي\s_-]/gi, '')
      .replace(/\s+/g, '_');
    
    const format = project.exportSettings.format === 'gif' ? 'gif' : 'webm';
    return `${base}_${Date.now()}.${format}`;
  }

  /**
   * Handles critical errors with logging and user notifications
   * @param {string} message 
   * @param {Error} [error]
   */
  function _handleCriticalError(message, error = null) {
    const errorObj = {
      message,
      origin: 'CcaptureRecorder',
      severity: 'error',
      ...(error && { error })
    };
    
    (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, errorObj);
    dependencies.notificationServiceAPI.showError(`حدث خطأ في التسجيل: ${message}`);
    
    if (error) {
      console.error('CCapture Error Details:', error);
    }
  }

  /**
   * Cleans up resources after recording
   */
  function _cleanup() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    capturer = null;
  }

  /**
   * Starts recording process
   * @param {number} duration - Estimated duration in seconds
   * @returns {Promise<boolean>}
   */
  async function startRecording(duration) {
    if (isRecording) return false;
    
    const state = dependencies.stateStore.getState();
    const project = state.currentProject;
    
    // Validate prerequisites
    if (!project || !project.exportSettings) {
      _handleCriticalError('لا توجد إعدادات مشروع أو تصدير.');
      return false;
    }
    
    if (!DOMElements.videoPreviewCanvas) {
      _handleCriticalError('لا يمكن العثور على عنصر Canvas للتسجيل.');
      return false;
    }

    // Calculate frames
    const fps = project.exportSettings.fps;
    totalFramesToRecord = Math.ceil(duration * fps);
    
    if (totalFramesToRecord <= 0) {
      _handleCriticalError('عدد الإطارات غير صالح.');
      return false;
    }

    // Initialize capturer
    if (!(await _initializeCapturer(project.exportSettings))) {
      return false;
    }

    // Setup state
    isRecording = true;
    recordedFrames = 0;
    lastFrameTime = performance.now();

    // Dispatch events
    dependencies.stateStore.dispatch(ACTIONS.SET_EXPORT_PROGRESS, {
      percentage: 0,
      statusMessage: 'بدء التسجيل...'
    });
    
    dependencies.eventAggregator.publish(EVENTS.EXPORT_STARTED);
    dependencies.notificationServiceAPI.showInfo(`بدء تصدير الفيديو (${totalFramesToRecord} إطار)...`);

    // Start capture
    capturer.start();
    animationFrameId = requestAnimationFrame(_recordLoop);
    
    return true;
  }

  /**
   * Stops recording process
   * @param {boolean} [saveFile=true]
   */
  function stopRecording(saveFile = true) {
    _cleanup();
    
    if (!capturer) return;
    
    isRecording = false;
    
    dependencies.stateStore.dispatch(ACTIONS.SET_EXPORT_PROGRESS, {
      percentage: 100,
      statusMessage: saveFile ? 'جاري إنهاء وحفظ الملف...' : 'تم إيقاف التسجيل.'
    });
    
    capturer.stop();
    
    if (!saveFile) {
      dependencies.notificationServiceAPI.showInfo('تم إيقاف تصدير الفيديو.');
      dependencies.eventAggregator.publish(EVENTS.EXPORT_COMPLETED, { 
        success: false, 
        cancelled: true 
      });
      capturer = null;
    }
  }

  /**
   * Injects dependencies into the module
   * @param {Object} injectedDeps 
   */
  function _setDependencies(injectedDeps) {
    Object.keys(dependencies).forEach(key => {
      if (injectedDeps[key]) dependencies[key] = injectedDeps[key];
    });
  }

  return {
    _setDependencies,
    startRecording,
    stopRecording,
    isRecording: () => isRecording
  };
})();

/**
 * Initializes the CCapture recorder module
 * @param {Object} deps 
 * @returns {Object}
 */
export function initializeCcaptureRecorder(deps) {
  ccaptureRecorder._setDependencies(deps);
  return {
    startRecording: ccaptureRecorder.startRecording,
    stopRecording: ccaptureRecorder.stopRecording,
    isRecording: ccaptureRecorder.isRecording
  };
}

export default ccaptureRecorder;
