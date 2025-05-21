// js/features/video-exporter/ccapture.recorder.js

// --- إزالة الاستيرادات المباشرة للاعتماديات التي سيتم حقنها ---
// import ImportedDOMElements from '../../core/dom-elements.js'; 
// import { DEFAULT_PROJECT_SCHEMA as ImportedDEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';
// import fileIOUtils from '../../utils/file.io.utils.js'; // هذا قد يبقى إذا كان file.io.utils لا يتم حقنه

// استيراد الثوابت فقط إذا كانت ضرورية هنا
import { ACTIONS, EVENTS } from '../../config/app.constants.js';


const ccaptureRecorderInternal = (() => { // تم تغيير الاسم لـ Internal للإشارة إلى IIFE
  let capturer = null;
  let isRecording = false;
  let recordedFrames = 0;
  let totalFramesToRecord = 0;
  let lastFrameTime = 0;
  let animationFrameId = null;
  
  const WORKER_PATHS = {
    gif: 'https://cdn.jsdelivr.net/npm/ccapture.js@1.1.0/build/',
    default: 'https://cdn.jsdelivr.net/npm/ccapture.js@1.1.0/build/'
  };

  // كائن لتخزين الاعتماديات المحقونة
  let deps = {
    DOMElements: null,
    DEFAULT_PROJECT_SCHEMA: null,
    stateStore: null,
    errorLogger: console, // قيمة افتراضية
    notificationServiceAPI: { showInfo: console.info, showSuccess: console.info, showError: console.error },
    mainRendererAPI: { renderFrame: async () => {} },
    eventAggregator: { publish: console.log },
    fileIOUtils: null // سيتم حقنه
  };

  function _handleCriticalError(message, error = null) {
    const errorObj = { message, origin: 'CcaptureRecorder', severity: 'error', ...(error && { error }) };
    if (deps.errorLogger && typeof deps.errorLogger.handleError === 'function') {
      deps.errorLogger.handleError(errorObj);
    } else if (deps.errorLogger && typeof deps.errorLogger.error === 'function') {
      deps.errorLogger.error(errorObj);
    } else {
      console.error(errorObj.message, errorObj.error || '');
    }
    deps.notificationServiceAPI?.showError?.(`خطأ في التسجيل: ${message}`);
  }

  function _loadCCaptureLibrary() {
    return new Promise((resolve, reject) => {
      if (typeof window.CCapture === 'function') {
        deps.errorLogger.info?.({message:'CCapture.js already loaded.', origin: 'CcaptureRecorder'});
        return resolve();
      }
      deps.errorLogger.info?.({message:'Attempting to load CCapture.js from CDN...', origin: 'CcaptureRecorder'});
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/ccapture.js@1.1.0/build/CCapture.all.min.js';
      script.onload = () => {
        deps.errorLogger.info?.({message:'CCapture.js loaded successfully from CDN.', origin: 'CcaptureRecorder'});
        resolve();
      };
      script.onerror = (err) => {
        const errorMsg = 'Failed to load CCapture.js from CDN';
        deps.errorLogger.error?.({message: errorMsg, error: err, origin: 'CcaptureRecorder'});
        reject(new Error(errorMsg));
      };
      document.head.appendChild(script);
    });
  }
  
  function _calculateQuality(format, userQuality) {
    if (userQuality === undefined || userQuality === null) {
      return format === 'gif' ? 10 : 70;
    }
    const numQuality = Math.round(Number(userQuality));
    return format === 'gif' ? Math.max(1, Math.min(30, numQuality)) : Math.max(1, Math.min(100, numQuality));
  }

  function _buildCapturerSettings(exportSettings) {
    const format = ['gif', 'webm', 'png', 'jpg'].includes(exportSettings.format) 
      ? exportSettings.format 
      : 'webm';

    // ---!!! بداية التعديل الحاسم !!!---
    if (!deps.DOMElements || !deps.DOMElements.previews?.canvas || !(deps.DOMElements.previews.canvas instanceof HTMLCanvasElement)) {
        const errorMsg = "DOMElements.previews.canvas is not a valid canvas element or DOMElements not (properly) injected/initialized.";
        // لا تستدعي _handleCriticalError مباشرة هنا، بل ارمي الخطأ ليتم التعامل معه في _initializeCapturer
        throw new Error(errorMsg); 
    }
    const canvasElement = deps.DOMElements.previews.canvas;
    // ---!!! نهاية التعديل الحاسم !!!---

    if (!deps.DEFAULT_PROJECT_SCHEMA?.exportSettings?.fps) {
        throw new Error("DEFAULT_PROJECT_SCHEMA or its exportSettings.fps is not available via dependencies.");
    }

    const settings = {
      format,
      framerate: Math.max(1, Math.min(60, exportSettings.fps || deps.DEFAULT_PROJECT_SCHEMA.exportSettings.fps)),
      verbose: true, 
      display: false,
      name: exportSettings.name || `quran_video_${Date.now()}`,
      workersPath: WORKER_PATHS[format === 'gif' ? 'gif' : 'default'],
      quality: _calculateQuality(format, exportSettings.quality)
    };
    
    if (exportSettings.resolution?.includes('x')) {
      const [width, height] = exportSettings.resolution.split('x').map(Number);
      if (width > 0 && height > 0) {
        // ---!!! بداية التعديل الحاسم !!!---
        canvasElement.width = width;
        canvasElement.height = height;
        // ---!!! نهاية التعديل الحاسم !!!---
        deps.errorLogger.info?.({message: `Canvas dimensions set by exportSettings to: ${canvasElement.width}x${canvasElement.height}`, origin: 'CcaptureRecorder'});
      }
    } else {
        deps.errorLogger.warn?.({message:`Export resolution not specified. Using current canvas dimensions: ${canvasElement.width}x${canvasElement.height}`, origin: 'CcaptureRecorder'});
    }
    return settings;
  }

  async function _initializeCapturer(exportSettings) {
    if (typeof window.CCapture === 'undefined') {
      try {
        await _loadCCaptureLibrary();
      } catch (e) {
        _handleCriticalError(e.message || 'CCapture.js library failed to load.', e);
        return false;
      }
    }

    if (typeof window.CCapture === 'undefined') {
      _handleCriticalError('CCapture.js library still not available after load attempt.');
      return false;
    }

    try {
      deps.errorLogger.info?.({message: "Attempting to initialize CCapture with project export settings", context: exportSettings, origin: 'CcaptureRecorder'});
      const settings = _buildCapturerSettings(exportSettings); 
      deps.errorLogger.info?.({message: "Built CCapture settings for new CCapture()", context: settings, origin: 'CcaptureRecorder'});
      
      capturer = new window.CCapture(settings);
      
      if (!capturer || typeof capturer.start !== 'function') {
        const errorMsg = "CCapture initialization failed or returned an invalid object.";
        _handleCriticalError(errorMsg, { capturerObject: capturer }); // تمرير الكائن للفحص
        capturer = null;
        return false;
      }
      
      deps.errorLogger.info?.({message: "CCapture instance created successfully.", context: capturer, origin: 'CcaptureRecorder'});
      deps.eventAggregator?.publish(EVENTS.EXPORT_PROGRESS, 0);
      return true;
    } catch (error) {
      _handleCriticalError(error.message || 'CCapture initialization threw an error', error);
      capturer = null;
      return false;
    }
  }

  function _validateRecordingState() {
    if (!isRecording || !capturer || !deps.DOMElements?.previews?.canvas) {
      deps.errorLogger.warn?.({message:"Validation failed for recording state.", 
                   context: {isRecording, capturerExists: !!capturer, canvasExists: !!deps.DOMElements?.previews?.canvas }, origin: 'CcaptureRecorder' });
      _cleanup(); 
      return false;
    }
    return true;
  }

  function _updateProgress(percentage) {
    const message = `تسجيل الإطار ${recordedFrames} من ${totalFramesToRecord} (${percentage}%)`;
    deps.stateStore?.dispatch(ACTIONS.SET_EXPORT_PROGRESS, { percentage, statusMessage: message });
    deps.eventAggregator?.publish(EVENTS.EXPORT_PROGRESS, percentage);
  }

  async function _recordLoop() {
    if (!_validateRecordingState()) return;

    const projectState = deps.stateStore?.getState?.().currentProject;
    if (!projectState?.exportSettings?.fps) {
        _handleCriticalError("Project state or export settings (FPS) are invalid in _recordLoop.");
        _cleanup();
        return;
    }
    const fps = projectState.exportSettings.fps;
    const frameInterval = 1000 / fps;
    const currentTime = performance.now();
    
    if (currentTime - lastFrameTime >= frameInterval) {
      try {
        if (!deps.mainRendererAPI || typeof deps.mainRendererAPI.renderFrame !== 'function') {
            throw new Error("mainRendererAPI.renderFrame is not available.");
        }
        await deps.mainRendererAPI.renderFrame({
          reason: 'exportFrame',
          frameNumber: recordedFrames,
          timestamp: currentTime
        });
        
        // ---!!! بداية التعديل الحاسم !!!---
        const canvasToCapture = deps.DOMElements.previews.canvas; // يفترض أنه تم التحقق منه في _validateRecordingState
        // لكن تحقق سريع هنا أيضًا
        if (!canvasToCapture) {
             _handleCriticalError("DOMElements.previews.canvas became unavailable during _recordLoop.");
             _cleanup();
             return;
        }
        capturer.capture(canvasToCapture);
        // ---!!! نهاية التعديل الحاسم !!!---
        recordedFrames++;
        
        const progress = Math.min(100, Math.floor((recordedFrames / totalFramesToRecord) * 100));
        _updateProgress(progress);
        
        lastFrameTime = currentTime;
      } catch (error) {
        _handleCriticalError('Frame rendering or capture failed in _recordLoop', error);
        stopRecordingInternal(false); // استخدم النسخة الداخلية من stopRecording
        return; 
      }
    }

    if (recordedFrames < totalFramesToRecord) {
      animationFrameId = requestAnimationFrame(_recordLoop);
    } else {
      _finalizeRecording();
    }
  }

  function _generateFilename(project) {
    if (!project || !deps.DEFAULT_PROJECT_SCHEMA?.title) { // تحقق من وجود project و DEFAULT_PROJECT_SCHEMA
        _handleCriticalError("Cannot generate filename: project or DEFAULT_PROJECT_SCHEMA is missing.");
        return `fallback_video_${Date.now()}.webm`; // اسم احتياطي
    }
    const base = (project.title || deps.DEFAULT_PROJECT_SCHEMA.title)
      .replace(/[^a-z0-9أ-ي\s_-]/gi, '')
      .replace(/\s+/g, '_');
    
    // تأكد أن project.exportSettings.format موجود
    const format = project.exportSettings?.format === 'gif' ? 'gif' : 
                   (project.exportSettings?.format === 'png' ? 'tar' : 
                   (project.exportSettings?.format === 'jpg' ? 'tar' : project.exportSettings?.format || 'webm'));

    const extension = format === 'tar' ? 'tar' : format;
    return `${base}_${Date.now()}.${extension}`;
  }

  function _finalizeRecording() {
    if (!capturer) {
      deps.errorLogger.warn?.({message:"_finalizeRecording called but capturer is null.", origin: 'CcaptureRecorder'});
      _cleanup();
      return;
    }
    isRecording = false; 
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    capturer.stop(); 
    
    deps.stateStore?.dispatch(ACTIONS.SET_EXPORT_PROGRESS, { percentage: 100, statusMessage: 'جاري إنهاء وحفظ الملف...'});
    deps.notificationServiceAPI?.showInfo('جاري تجهيز الملف للتنزيل...');
    
    capturer.save((blob) => {
      if (!blob) {
        _handleCriticalError("Failed to save: blob is null.");
        _cleanup();
        deps.eventAggregator?.publish(EVENTS.EXPORT_COMPLETED, { success: false, error: "Blob is null" });
        return;
      }
      const project = deps.stateStore?.getState?.().currentProject;
      if (!project) {
          _handleCriticalError("Cannot get project state to generate filename after saving blob.");
          // حاول حفظ الملف باسم عام إذا فشلت كل المحاولات
          const fallbackFilename = `recorded_video_${Date.now()}.webm`; // افترض webm إذا لم يعرف format
          if (typeof saveAs === 'function') { saveAs(blob, fallbackFilename); }
          _cleanup();
          return;
      }
      const filename = _generateFilename(project);
      
      if (deps.fileIOUtils && typeof deps.fileIOUtils.downloadFile === 'function') {
        deps.fileIOUtils.downloadFile(blob, filename, blob.type);
      } else if (typeof saveAs === 'function') { // مكتبة FileSaver.js كـ fallback (إذا كانت محملة عالميًا)
        saveAs(blob, filename);
      } else {
        _handleCriticalError("No file download mechanism available (FileSaver.js or fileIOUtils.downloadFile)");
      }
      
      deps.notificationServiceAPI?.showSuccess(`تم تصدير الفيديو "${filename}" بنجاح!`);
      deps.stateStore?.dispatch(ACTIONS.SET_EXPORT_PROGRESS, null); 
      deps.eventAggregator?.publish(EVENTS.EXPORT_COMPLETED, { success: true, filename });
      _cleanup(); 
      capturer = null; // الآن يمكننا التخلص منه بأمان
    });
  }

  function _cleanup() {
    deps.errorLogger.info?.({message:"CcaptureRecorder: Cleaning up resources.", origin: 'CcaptureRecorder'});
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    isRecording = false; 
    recordedFrames = 0;
    totalFramesToRecord = 0;
    // capturer يتم تعيينه لـ null بعد انتهاء الحفظ أو عند فشل التهيئة
  }
  
  async function startRecordingInternal(duration) { // تم تغيير الاسم إلى Internal
    deps.errorLogger.info?.({message:"ccaptureRecorder.startRecording called", context: { duration }, origin: 'CcaptureRecorder'});
    if (isRecording) {
      deps.errorLogger.warn?.({message:"Attempted to start recording while already recording.", origin: 'CcaptureRecorder'});
      return false;
    }
    
    const project = deps.stateStore?.getState?.().currentProject;
    if (!project || !project.exportSettings) {
      _handleCriticalError('إعدادات المشروع أو التصدير غير صالحة.');
      return false;
    }
    if (!deps.DOMElements?.previews?.canvas) {
      _handleCriticalError('عنصر Canvas غير موجود أو غير مهيأ للتسجيل.');
      return false;
    }

    const fps = project.exportSettings.fps || deps.DEFAULT_PROJECT_SCHEMA?.exportSettings?.fps;
    if (!fps || typeof duration !== 'number' || duration <= 0) {
        _handleCriticalError('بيانات مدة الفيديو أو FPS غير صالحة.');
        return false;
    }
    totalFramesToRecord = Math.ceil(duration * fps);
    if (totalFramesToRecord <= 0) {
      _handleCriticalError(`عدد الإطارات غير صالح (${totalFramesToRecord}).`);
      return false;
    }

    capturer = null; 
    const initializedSuccessfully = await _initializeCapturer(project.exportSettings);

    if (!initializedSuccessfully || !capturer) { 
      _handleCriticalError('فشل تهيئة مسجل الفيديو. لا يمكن بدء التسجيل.');
      _cleanup();
      return false;
    }

    isRecording = true;
    recordedFrames = 0; 
    lastFrameTime = performance.now();

    deps.stateStore?.dispatch(ACTIONS.SET_EXPORT_PROGRESS, { percentage: 0, statusMessage: 'بدء التسجيل...'});
    deps.eventAggregator?.publish(EVENTS.EXPORT_STARTED);
    deps.notificationServiceAPI?.showInfo(`بدء تصدير الفيديو (${totalFramesToRecord} إطار)...`);

    try {
      deps.errorLogger.info?.({message: "Attempting to call capturer.start()", context: capturer, origin: 'CcaptureRecorder'});
      capturer.start();
      deps.errorLogger.info?.({message: "capturer.start() called successfully.", origin: 'CcaptureRecorder'});
      animationFrameId = requestAnimationFrame(_recordLoop); 
    } catch (e) {
      _handleCriticalError('فشل استدعاء (capturer.start).', e);
      _cleanup();
      capturer = null; // تأكد من أنه null في حالة الفشل
      return false;
    }
    return true;
  }

  function stopRecordingInternal(saveFile = true) { // تم تغيير الاسم إلى Internal
    deps.errorLogger.info?.({message:`CcaptureRecorder: stopRecording called. Save file: ${saveFile}`, origin: 'CcaptureRecorder'});
    isRecording = false; 
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    if (!capturer) {
      deps.errorLogger.warn?.({message:"stopRecording called but capturer is already null.", origin: 'CcaptureRecorder'});
      _cleanup();
      return;
    }
    
    if (saveFile) {
        _finalizeRecording(); 
    } else {
      if (typeof capturer.stop === 'function') capturer.stop(); 
      deps.notificationServiceAPI?.showInfo('تم إيقاف تصدير الفيديو.');
      deps.eventAggregator?.publish(EVENTS.EXPORT_COMPLETED, { success: false, cancelled: true });
      _cleanup(); 
      capturer = null; 
    }
  }
  
  // دالة لتحديث الاعتماديات المحقونة
  function _setInjectedDependencies(injectedDeps) {
    if (injectedDeps) {
      deps.DOMElements = injectedDeps.DOMElements || deps.DOMElements;
      deps.DEFAULT_PROJECT_SCHEMA = injectedDeps.DEFAULT_PROJECT_SCHEMA || deps.DEFAULT_PROJECT_SCHEMA;
      deps.stateStore = injectedDeps.stateStore || deps.stateStore;
      deps.errorLogger = injectedDeps.errorLogger || deps.errorLogger;
      deps.notificationServiceAPI = injectedDeps.notificationServiceAPI || deps.notificationServiceAPI;
      deps.mainRendererAPI = injectedDeps.mainRendererAPI || deps.mainRendererAPI;
      deps.eventAggregator = injectedDeps.eventAggregator || deps.eventAggregator;
      deps.fileIOUtils = injectedDeps.fileIOUtils || deps.fileIOUtils; // تأكد من حقنه
    }
    deps.errorLogger.info?.({message: "CcaptureRecorder dependencies set/updated.", context: deps, origin: 'CcaptureRecorder'});
  }

  return {
    _setDependencies: _setInjectedDependencies, // لتستقبل الاعتماديات من الخارج
    startRecording: startRecordingInternal,
    stopRecording: stopRecordingInternal,
    isRecording: () => isRecording
  };
})(); // نهاية IIFE


/**
 * دالة التهيئة التي سيستدعيها moduleBootstrap
 * @param {Object} injectedDeps - الاعتماديات المحقونة (مثل DOMElements, stateStore, إلخ)
 * @returns {Object} - واجهة برمجة تطبيقات ccaptureRecorder
 */
export function initializeCcaptureRecorder(injectedDeps) {
  // `injectedDeps` هو الكائن الذي يمرره moduleBootstrap
  // ويجب أن يحتوي على DOMElements, DEFAULT_PROJECT_SCHEMA, stateStore, errorLogger, إلخ.
  if (injectedDeps && typeof ccaptureRecorderInternal._setDependencies === 'function') {
    ccaptureRecorderInternal._setDependencies(injectedDeps);
  } else {
    // حاول استخدام console مباشرة لأن errorLogger قد لا يكون متاحًا
    console.warn("initializeCcaptureRecorder called without dependencies or _setDependencies is missing from ccaptureRecorderInternal. Using fallback/default dependencies.");
    // قد ترغب في إلقاء خطأ هنا إذا كانت الاعتماديات ضرورية للغاية
  }
  return {
    startRecording: ccaptureRecorderInternal.startRecording,
    stopRecording: ccaptureRecorderInternal.stopRecording,
    isRecording: ccaptureRecorderInternal.isRecording
  };
}
