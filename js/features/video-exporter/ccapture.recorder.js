// js/features/video-exporter/ccapture.recorder.js
// افترض أن هذه الـ imports موجودة أو يتم حقنها عبر dependencies
import ImportedDOMElements from '../../core/dom-elements.js'; // سميته ImportedDOMElements للوضوح هنا
import { ACTIONS, EVENTS, DEFAULT_PROJECT_SCHEMA as ImportedDEFAULT_PROJECT_SCHEMA } from '../../config/app.constants.js';
import fileIOUtils from '../../utils/file.io.utils.js'; // افترض وجوده


const ccaptureRecorder = (() => {
  let capturer = null;
  let isRecording = false;
  let recordedFrames = 0;
  let totalFramesToRecord = 0;
  let lastFrameTime = 0;
  let animationFrameId = null;
  
  const WORKER_PATHS = {
    gif: 'https://cdn.jsdelivr.net/npm/ccapture.js@1.1.0/build/', // تم تحديثه لـ 1.1.0 كما في index.html
    default: 'https://cdn.jsdelivr.net/npm/ccapture.js@1.1.0/build/'
  };

  // Dependency injection container (سنفترض أن هذه هي الطريقة التي يتم بها تمرير الاعتماديات)
  // أو أنها ستكون imports مباشرة في أعلى الملف
  const dependencies = {
    DOMElements: ImportedDOMElements, // افترض أنه يتم حقنه هكذا، أو استخدم ImportedDOMElements مباشرة
    DEFAULT_PROJECT_SCHEMA: ImportedDEFAULT_PROJECT_SCHEMA,
    stateStore: { 
      getState: () => ({ currentProject: { exportSettings: { fps: 30, resolution: "1280x720", format: "webm" }, title: "Test Project" } }), // بيانات افتراضية للتشغيل
      dispatch: (action, payload) => console.log('StateStore Dispatch:', action, payload) 
    },
    errorLogger: { 
        handleError: (errObj) => console.error("Logged Error:", errObj.message, errObj.error || '', errObj),
        error: (errObj) => console.error("Logged Error (Direct):", errObj.message, errObj.error || '', errObj), // للاستخدام المباشر
        warn: (warnObj) => console.warn("Logged Warning:", warnObj.message, warnObj)
    },
    notificationServiceAPI: { 
      showInfo: (msg) => console.info('Notification (Info):', msg), 
      showSuccess: (msg) => console.info('Notification (Success):', msg), 
      showError: (msg) => console.error('Notification (Error):', msg) 
    },
    mainRendererAPI: { 
      renderFrame: async (opts) => { /* console.log('Simulating renderFrame:', opts); */ } 
    },
    eventAggregator: { 
      publish: (event, payload) => console.log('Event Aggregator Publish:', event, payload) 
    }
  };

  function _handleCriticalError(message, error = null) {
    const errorObj = {
      message,
      origin: 'CcaptureRecorder',
      severity: 'error',
      ...(error && { error })
    };
    
    (dependencies.errorLogger.handleError || dependencies.errorLogger.error || console.error).call(dependencies.errorLogger, errorObj);
    dependencies.notificationServiceAPI.showError(`حدث خطأ في التسجيل: ${message}`);
    
    if (error) {
      // console.error('CCapture Error Details:', error); // مكرر إذا كان errorLogger يعرضه
    }
  }

  function _loadCCaptureLibrary() {
    return new Promise((resolve, reject) => {
      if (typeof window.CCapture === 'function') {
        console.log('CCapture.js already loaded.');
        return resolve();
      }
      console.log('Attempting to load CCapture.js from CDN...');
      const script = document.createElement('script');
      // script.src = 'https://cdn.jsdelivr.net/npm/ccapture.js @1.0.0/build/ccapture.min.js'; // الرابط القديم
      script.src = 'https://cdn.jsdelivr.net/npm/ccapture.js@1.1.0/build/CCapture.all.min.js'; // الرابط من index.html
      script.onload = () => {
        console.log('CCapture.js loaded successfully from CDN.');
        resolve();
      };
      script.onerror = () => {
        const errorMsg = 'Failed to load CCapture.js from CDN';
        console.error(errorMsg);
        // لا تستدعي _handleCriticalError هنا مباشرة لأنها قد لا تكون مهيئة بالكامل
        reject(new Error(errorMsg));
      };
      document.head.appendChild(script);
    });
  }
  
  function _calculateQuality(format, userQuality) {
    if (userQuality === undefined || userQuality === null) { // تحقق أدق
      return format === 'gif' ? 10 : 70;
    }
    
    const numQuality = Math.round(Number(userQuality));
    if (format === 'gif') {
      return Math.max(1, Math.min(30, numQuality));
    }
    return Math.max(1, Math.min(100, numQuality));
  }

  function _buildCapturerSettings(exportSettings) {
    const format = ['gif', 'webm', 'png', 'jpg'].includes(exportSettings.format) 
      ? exportSettings.format 
      : 'webm';

    // --- بداية التعديل الهام ---
    // الوصول إلى DOMElements من خلال dependencies أو الاستيراد المباشر
    const DOMElems = dependencies.DOMElements || ImportedDOMElements; 
    if (!DOMElems || !DOMElems.previews?.canvas || !(DOMElems.previews.canvas instanceof HTMLCanvasElement)) {
        const errorMsg = "DOMElements.previews.canvas is not a valid canvas element or DOMElements not initialized correctly.";
        console.error(errorMsg);
        // لا تستدعي _handleCriticalError هنا إذا كانت هي نفسها تعتمد على dependencies قد لا تكون مهيئة
        // ارمي الخطأ ليتم التقاطه في _initializeCapturer
        throw new Error(errorMsg); 
    }
    const canvasElement = DOMElems.previews.canvas;
    // --- نهاية التعديل الهام ---

    const settings = {
      format,
      framerate: Math.max(1, Math.min(60, exportSettings.fps || dependencies.DEFAULT_PROJECT_SCHEMA.exportSettings.fps)),
      verbose: true, 
      display: false,
      name: exportSettings.name || `quran_video_${Date.now()}`,
      workersPath: WORKER_PATHS[format === 'gif' ? 'gif' : 'default'],
      quality: _calculateQuality(format, exportSettings.quality)
    };
    
    if (exportSettings.resolution?.includes('x')) {
      const [width, height] = exportSettings.resolution.split('x').map(Number);
      if (width > 0 && height > 0) {
        // --- بداية التعديل الهام ---
        canvasElement.width = width;
        canvasElement.height = height;
        // --- نهاية التعديل الهام ---
        console.log(`Canvas dimensions set by exportSettings to: ${canvasElement.width}x${canvasElement.height}`);
      }
    } else {
        // إذا لم تحدد دقة التصدير، استخدم أبعاد الـ canvas الحالية
        // أو يمكنك إجبارها على قيمة افتراضية من DOMElements إن لم تكن قد تم تغييرها بعد
        console.warn(`Export resolution not specified. Using current canvas dimensions: ${canvasElement.width}x${canvasElement.height}`);
    }
    return settings;
  }

  async function _initializeCapturer(exportSettings) {
    if (typeof window.CCapture === 'undefined') {
      try {
        await _loadCCaptureLibrary();
      } catch (e) {
        _handleCriticalError(e.message || 'CCapture.js library failed to load. Video export unavailable.');
        return false;
      }
    }

    if (typeof window.CCapture === 'undefined') { // تحقق مرة أخرى
      _handleCriticalError('CCapture.js library still not available after load attempt.');
      return false;
    }

    try {
      console.log("Attempting to initialize CCapture with project export settings:", exportSettings);
      const settings = _buildCapturerSettings(exportSettings); // استدعاء دالة بناء الإعدادات
      console.log("Built CCapture settings for new CCapture():", settings);
      
      capturer = new window.CCapture(settings);
      
      if (!capturer || typeof capturer.start !== 'function') {
        const errorMsg = "CCapture initialization failed or returned an invalid object.";
        console.error(errorMsg, "Capturer object:", capturer);
        _handleCriticalError(errorMsg);
        capturer = null;
        return false;
      }
      
      console.log("CCapture instance created successfully:", capturer);
      dependencies.eventAggregator.publish(EVENTS.EXPORT_PROGRESS, 0);
      return true;
    } catch (error) {
      // _buildCapturerSettings قد ترمي خطأ إذا كان الـ canvas غير صالح
      console.error("Error during CCapture initialization (new CCapture() or _buildCapturerSettings):", error);
      _handleCriticalError(error.message || 'CCapture initialization threw an error', error);
      capturer = null;
      return false;
    }
  }

  function _validateRecordingState() {
    // --- بداية التعديل الهام ---
    const DOMElems = dependencies.DOMElements || ImportedDOMElements;
    if (!isRecording || !capturer || !DOMElems.previews?.canvas) {
      console.warn("Validation failed: Not recording, or no capturer, or no canvas.", 
                   {isRecording, capturerExists: !!capturer, canvasExists: !!DOMElems.previews?.canvas });
    // --- نهاية التعديل الهام ---
      // stopRecording(false); // استدعاء stopRecording هنا قد يسبب حلقة إذا كان هو السبب
      _cleanup(); // تنظيف مباشر
      return false;
    }
    return true;
  }

  function _updateProgress(percentage) {
    const message = `تسجيل الإطار ${recordedFrames} من ${totalFramesToRecord} (${percentage}%)`;
    dependencies.stateStore.dispatch(ACTIONS.SET_EXPORT_PROGRESS, {
      percentage,
      statusMessage: message
    });
    dependencies.eventAggregator.publish(EVENTS.EXPORT_PROGRESS, percentage);
  }

  async function _recordLoop() {
    if (!_validateRecordingState()) return;

    const projectState = dependencies.stateStore.getState().currentProject;
    // افترض أن exportSettings دائمًا موجودة إذا بدأ التسجيل
    const fps = projectState.exportSettings.fps;
    const frameInterval = 1000 / fps;
    const currentTime = performance.now();
    
    if (currentTime - lastFrameTime >= frameInterval) {
      try {
        await dependencies.mainRendererAPI.renderFrame({
          reason: 'exportFrame',
          frameNumber: recordedFrames,
          timestamp: currentTime
        });
        
        // --- بداية التعديل الهام ---
        const DOMElems = dependencies.DOMElements || ImportedDOMElements;
        const canvasToCapture = DOMElems.previews.canvas;
        if (!canvasToCapture) { // تحقق إضافي هنا رغم وجوده في _validateRecordingState
            _handleCriticalError("Canvas element became null during _recordLoop.");
            _cleanup(); // أو stopRecording(false)
            return;
        }
        capturer.capture(canvasToCapture);
        // --- نهاية التعديل الهام ---
        recordedFrames++;
        
        const progress = Math.min(100, Math.floor((recordedFrames / totalFramesToRecord) * 100));
        _updateProgress(progress);
        
        lastFrameTime = currentTime;
      } catch (error) {
        _handleCriticalError('Frame rendering or capture failed in _recordLoop', error);
        stopRecording(false); // هذا سينظف animationFrameId
        return; // توقف عن الحلقة
      }
    }

    if (recordedFrames < totalFramesToRecord) {
      animationFrameId = requestAnimationFrame(_recordLoop);
    } else {
      _finalizeRecording();
    }
  }

  function _generateFilename(project) {
    const base = (project.title || dependencies.DEFAULT_PROJECT_SCHEMA.title)
      .replace(/[^a-z0-9أ-ي\s_-]/gi, '')
      .replace(/\s+/g, '_');
    
    const format = project.exportSettings.format === 'gif' ? 'gif' : (project.exportSettings.format === 'png' ? 'tar' : project.exportSettings.format);
    // CCapture يحفظ PNGs كـ tar
    const extension = format === 'tar' ? 'tar' : (format === 'jpg' ? 'tar' : format); // و JPG كـ tar
    return `${base}_${Date.now()}.${extension}`;
  }

  function _finalizeRecording() {
    if (!capturer) {
      console.warn("_finalizeRecording called but capturer is null.");
      _cleanup(); // تأكد من التنظيف
      return;
    }
    isRecording = false; // يجب أن يتم قبل capturer.stop() في بعض الحالات لتجنب استدعاءات إضافية
    if (animationFrameId) { // ضمان إيقاف الحلقة قبل استدعاء stop
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    capturer.stop(); // يجب أن يكون قبل save لتجهيز الملف
    
    dependencies.stateStore.dispatch(ACTIONS.SET_EXPORT_PROGRESS, {
      percentage: 100,
      statusMessage: 'جاري إنهاء وحفظ الملف...'
    });
    dependencies.notificationServiceAPI.showInfo('جاري تجهيز الملف للتنزيل...');
    
    capturer.save((blob) => {
      if (!blob) {
        _handleCriticalError("Failed to save: blob is null. Recording might have failed silently.");
        _cleanup();
        dependencies.eventAggregator.publish(EVENTS.EXPORT_COMPLETED, { success: false, error: "Blob is null" });
        return;
      }
      const project = dependencies.stateStore.getState().currentProject;
      const filename = _generateFilename(project);
      
      // fileIOUtils.downloadFile(blob, filename, blob.type); // افترض أن هذه الدالة موجودة
      // كحل بديل لـ fileIOUtils إذا لم يكن معرفًا، استخدم FileSaver.js إذا كانت متوفرة
      if (typeof saveAs === 'function') { // مكتبة FileSaver.js
        saveAs(blob, filename);
      } else if (fileIOUtils && typeof fileIOUtils.downloadFile === 'function') {
        fileIOUtils.downloadFile(blob, filename, blob.type);
      } else {
        console.error("No file download mechanism available (FileSaver.js or fileIOUtils.downloadFile)");
        _handleCriticalError("لا يمكن تنزيل الملف، لا توجد آلية متاحة.");
      }
      
      dependencies.notificationServiceAPI.showSuccess(`تم تصدير الفيديو "${filename}" بنجاح!`);
      dependencies.stateStore.dispatch(ACTIONS.SET_EXPORT_PROGRESS, null); // أو reset
      dependencies.eventAggregator.publish(EVENTS.EXPORT_COMPLETED, { 
        success: true, 
        filename 
      });
      _cleanup(); // تنظيف بعد الحفظ
    });
  }

  function _cleanup() {
    console.log("CcaptureRecorder: Cleaning up resources.");
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    // لا تقم بـ capturer = null; هنا إذا كانت عملية الحفظ لا تزال تعمل بشكل غير متزامن
    // يتم تعيينه لـ null في _initializeCapturer عند الفشل أو في stopRecording إذا لم يتم الحفظ
    // أو بعد اكتمال الحفظ في _finalizeRecording
    if (!isRecording && capturer && typeof capturer.save !== 'function') { // للتأكد أنه ليس مثيلاً صالحاً قيد العمل
         // Capturer قد يصبح غير صالح إذا فشلت التهيئة أو بعد استدعاء save
    }
    isRecording = false; // تأكيد إضافي
    recordedFrames = 0;
    totalFramesToRecord = 0;
    // من الأفضل أن يتم تعيين capturer إلى null فقط عند انتهاء جميع عملياته أو عند التهيئة الفاشلة
  }
  
  async function startRecording(duration) {
    console.log("ccaptureRecorder.startRecording called with duration:", duration);
    if (isRecording) {
      console.warn("Attempted to start recording while already recording.");
      return false;
    }
    
    const state = dependencies.stateStore.getState();
    const project = state.currentProject;
    
    if (!project || !project.exportSettings) {
      _handleCriticalError('لا توجد إعدادات مشروع أو تصدير صالحة.');
      return false;
    }
    
    const DOMElems = dependencies.DOMElements || ImportedDOMElements;
    if (!DOMElems.previews?.canvas) { // تأكد من Canvas مرة أخرى
      _handleCriticalError('لا يمكن العثور على عنصر Canvas للتسجيل.');
      return false;
    }

    const fps = project.exportSettings.fps || dependencies.DEFAULT_PROJECT_SCHEMA.exportSettings.fps;
    if (typeof duration !== 'number' || duration <= 0) {
        _handleCriticalError('مدة الفيديو غير صالحة أو غير محددة.');
        return false;
    }
    totalFramesToRecord = Math.ceil(duration * fps);
    
    if (totalFramesToRecord <= 0) {
      _handleCriticalError(`عدد الإطارات غير صالح (${totalFramesToRecord})، المدة: ${duration}, FPS: ${fps}.`);
      return false;
    }

    // Reset capturer to ensure clean state if a previous attempt failed midway
    capturer = null; 
    console.log("Calling _initializeCapturer...");
    const initializedSuccessfully = await _initializeCapturer(project.exportSettings);
    console.log("_initializeCapturer result:", initializedSuccessfully, "Current capturer after init:", capturer);

    if (!initializedSuccessfully || !capturer) { 
      _handleCriticalError('فشل تهيئة مسجل الفيديو بشكل كامل. لا يمكن بدء التسجيل.');
      _cleanup(); // تأكد من التنظيف
      return false;
    }

    isRecording = true;
    recordedFrames = 0; // إعادة تعيين عدد الإطارات
    lastFrameTime = performance.now();

    dependencies.stateStore.dispatch(ACTIONS.SET_EXPORT_PROGRESS, {
      percentage: 0,
      statusMessage: 'بدء التسجيل...'
    });
    dependencies.eventAggregator.publish(EVENTS.EXPORT_STARTED);
    dependencies.notificationServiceAPI.showInfo(`بدء تصدير الفيديو (${totalFramesToRecord} إطار)...`);

    try {
      console.log("Attempting to call capturer.start(). Capturer object is:", capturer);
      capturer.start();
      console.log("capturer.start() called successfully.");
      animationFrameId = requestAnimationFrame(_recordLoop); // ابدأ الحلقة بعد start()
    } catch (e) {
      console.error("Error directly from capturer.start():", e, "Capturer was:", capturer);
      _handleCriticalError('فشل استدعاء دالة بدء التسجيل (capturer.start).', e);
      _cleanup();
      return false;
    }
    return true;
  }

  function stopRecording(saveFile = true) {
    console.log(`CcaptureRecorder: stopRecording called. Save file: ${saveFile}`);
    isRecording = false; // مهم جدًا إيقاف الحلقة
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    if (!capturer) {
      console.warn("stopRecording called but capturer is already null.");
      _cleanup(); // للتأكيد
      return;
    }
    
    // إذا كان capturer لا يزال قيد الاستخدام (مثل استدعاء save)،
    // فإن استدعاء stop مرة أخرى قد يسبب مشاكل أو قد يكون لا فائدة منه
    // عادة، stop() ثم save(). إذا أردت الإلغاء، فقط قم بالتنظيف.
    if (saveFile) {
        // _finalizeRecording بالفعل يستدعي capturer.stop() و save()
        // لذا، إذا أردنا الحفظ، قد يكون من الأفضل أن ننتظر حتى تنتهي الحلقة من تلقاء نفسها وتستدعي _finalizeRecording
        // أو إذا كان هذا إيقافًا قسريًا ولكن مع حفظ، فيجب أن نضمن أن capturer.stop ثم capturer.save
        // ولكن هذا سيتداخل مع _finalizeRecording الطبيعي
        // هذا المنطق يحتاج إلى مراجعة بناءً على كيفية استخدام stopRecording
        console.warn("stopRecording(true) is complex as _finalizeRecording handles saving. Assuming an immediate stop and save if explicitly called.");
         _finalizeRecording(); // هذا قد يكون صحيحًا إذا أردت إيقافًا فوريًا وحفظًا
    } else {
      // إذا لم نرغب في الحفظ، فقط أوقف كل شيء
      capturer.stop(); // أوقف أي عملية تسجيل قائمة
      dependencies.notificationServiceAPI.showInfo('تم إيقاف تصدير الفيديو.');
      dependencies.eventAggregator.publish(EVENTS.EXPORT_COMPLETED, { 
        success: false, 
        cancelled: true 
      });
      _cleanup(); // نظف
      capturer = null; // بعد الإيقاف الكامل وبدون حفظ، يمكننا التخلص منه
    }
  }
  
  function _setDependencies(injectedDeps) {
    // دمج الاعتماديات المحقونة مع الافتراضية أو استبدالها
    if (injectedDeps) {
        for (const key in dependencies) {
            if (injectedDeps.hasOwnProperty(key)) {
                dependencies[key] = injectedDeps[key];
            }
        }
    }
    console.log("CcaptureRecorder dependencies set/updated:", dependencies);
  }


  // الواجهة العامة للوحدة
  return {
    // أضفت _setDependencies لكي يتمكن الكود الخارجي من حقن الاعتماديات الحقيقية
    // هذا ضروري إذا لم تكن الـ imports في الأعلى تعمل بالشكل المتوقع لكل شيء
    _setDependencies, 
    startRecording,
    stopRecording,
    isRecording: () => isRecording
  };
})();


export function initializeCcaptureRecorder(deps) {
  // استدعاء _setDependencies هنا لتمرير الاعتماديات الحقيقية من module-bootstrap.js أو main.js
  if (deps) {
    ccaptureRecorder._setDependencies(deps);
  } else {
    console.warn("initializeCcaptureRecorder called without dependencies. Using default/mocked dependencies.");
  }
  return {
    startRecording: ccaptureRecorder.startRecording,
    stopRecording: ccaptureRecorder.stopRecording,
    isRecording: ccaptureRecorder.isRecording
  };
}

// يمكن تصدير الكائن ccaptureRecorder مباشرة إذا كنت تستخدمه كـ singleton
// وتستدعي _setDependencies مرة واحدة عند بدء التطبيق.
// export default ccaptureRecorder; // هذا يعتمد على نمط الاستخدام
