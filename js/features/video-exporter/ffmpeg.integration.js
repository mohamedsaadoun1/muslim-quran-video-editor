// js/features/video-exporter/ffmpeg.integration.js
import DOMElements from '../../core/dom-elements.js';
import { ACTIONS, EVENTS } from '../../config/app.constants.js';
import fileIOUtils from '../../utils/file.io.utils.js'; // For creating Blobs or download

/**
 * @typedef {Object} FFmpegProgress
 * @property {number} ratio - Progress ratio between 0 and 1
 * @property {string} [time] - Time information
 * @property {string} [percent] - Formatted percentage string
 */

/**
 * @typedef {Object} FFmpegMergeResult
 * @property {Blob|null} blob - The merged video blob or null if failed
 * @property {boolean} success - Whether the merge was successful
 * @property {string|null} filename - The output filename
 * @property {Error|null} error - Error object if any occurred
 */

const ffmpegIntegration = (() => {
  let ffmpeg = null; // Holds the FFmpeg.wasm instance
  let ffmpegCoreLoaded = false;
  let isProcessing = false; // To prevent multiple FFmpeg operations concurrently
  
  // Dependency injection container
  const dependencies = {
    errorLogger: console, // Fallback
    stateStore: { 
      dispatch: () => {} 
    }, // For SET_LOADING or progress
    notificationServiceAPI: { 
      showInfo: () => {}, 
      showError: () => {}, 
      showSuccess: () => {} 
    },
    localizationService: {
      translate: key => key
    }
  };
  
  // CDN paths configuration
  const FFMPEG_CONFIG = {
    CORE_CDN_URL: 'https://unpkg.com/ @ffmpeg/core@0.12.2/dist/ffmpeg-core.js',
    LOADING_STEPS: {
      INIT: 0,
      LOADING_CORE: 10,
      CORE_LOADED: 90,
      FINALIZING: 95,
      COMPLETED: 100
    }
  };

  /**
   * Updates the progress UI during FFmpeg operations
   * @private
   * @param {number} percentage - Progress percentage (0-100)
   * @param {string} messageKey - Key for localized message
   * @param {Array<string>} [messageParams] - Parameters for message formatting
   */
  function _updateProgress(percentage, messageKey, messageParams = []) {
    try {
      const message = dependencies.localizationService.translate(messageKey, ...messageParams);
      
      dependencies.stateStore.dispatch(ACTIONS.SET_EXPORT_PROGRESS, {
        percentage: Math.max(0, Math.min(100, percentage)),
        statusMessage: message
      });
      
      if (percentage === 100) {
        dependencies.stateStore.dispatch(ACTIONS.SET_LOADING, false);
      } else {
        dependencies.stateStore.dispatch(ACTIONS.SET_LOADING, true);
      }
    } catch (error) {
      _handleError('Failed to update progress', error);
    }
  }

  /**
   * Handles errors gracefully with logging and user notifications
   * @private
   * @param {string} message - Error message
   * @param {Error} [error] - Error object
   */
  function _handleError(message, error = null) {
    const errorObj = {
      message,
      origin: 'FFmpegIntegration',
      severity: 'error',
      ...(error && { error })
    };
    
    (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, errorObj);
    
    const userMessage = dependencies.localizationService.translate('ffmpeg.error.general') || 'حدث خطأ في معالجة الفيديو';
    dependencies.notificationServiceAPI.showError(`${userMessage}: ${message}`);
    
    if (error) {
      console.error('FFmpeg Integration Error Details:', error);
    }
  }

  /**
   * Ensures FFmpeg.wasm is ready for use
   * @private
   * @returns {Promise<boolean>} True if FFmpeg is ready, false otherwise
   */
  async function _ensureFFmpegIsReady() {
    try {
      if (ffmpeg && ffmpegCoreLoaded) {
        return true;
      }
      
      if (isProcessing) {
        _handleError('FFmpeg is already being loaded or is processing');
        return false;
      }
      
      if (typeof window.FFmpeg === 'undefined' || 
          typeof window.FFmpeg.createFFmpeg === 'undefined') {
        _handleError('FFmpeg.wasm main library not found. Ensure it is loaded via <script> tag.');
        return false;
      }

      isProcessing = true;
      _updateProgress(
        FFMPEG_CONFIG.LOADING_STEPS.INIT,
        'ffmpeg.loading.initializing'
      );

      try {
        ffmpeg = window.FFmpeg.createFFmpeg({
          log: false, // Disable FFmpeg's own logging to console
          corePath: FFMPEG_CONFIG.CORE_CDN_URL,
          progress: (progressData) => {
            if (progressData.ratio !== undefined) {
              const calculatedPercentage = Math.round(progressData.ratio * 100);
              const clampedPercentage = Math.min(
                FFMPEG_CONFIG.LOADING_STEPS.CORE_LOADED, 
                calculatedPercentage
              );
              _updateProgress(
                clampedPercentage,
                'ffmpeg.loading.core',
                [clampedPercentage]
              );
            }
          },
        });

        _updateProgress(
          FFMPEG_CONFIG.LOADING_STEPS.LOADING_CORE,
          'ffmpeg.loading.core',
          [0]
        );

        await ffmpeg.load();
        
        _updateProgress(
          FFMPEG_CONFIG.LOADING_STEPS.CORE_LOADED,
          'ffmpeg.loading.core',
          [100]
        );

        ffmpegCoreLoaded = true;
        
        await new Promise(resolve => setTimeout(resolve, 300)); // Brief moment to show success
        
        const successMessage = dependencies.localizationService.translate('ffmpeg.ready') || 'محرك الفيديو (FFmpeg) جاهز.';
        dependencies.notificationServiceAPI.showSuccess(successMessage);
        
        return true;
      } catch (error) {
        _handleError('Failed to load FFmpeg.wasm', error);
        return false;
      } finally {
        _updateProgress(
          FFMPEG_CONFIG.LOADING_STEPS.COMPLETED,
          'ffmpeg.loading.completed'
        );
        isProcessing = false;
      }
    } catch (error) {
      _handleError('Unexpected error in FFmpeg initialization', error);
      return false;
    }
  }

  /**
   * Validates input parameters for merging operations
   * @private
   * @param {Blob} videoBlob - Video data blob
   * @param {Blob} audioBlob - Audio data blob
   * @returns {boolean} True if inputs are valid
   */
  function _validateMergeInputs(videoBlob, audioBlob) {
    if (!videoBlob || !(videoBlob instanceof Blob)) {
      _handleError('Invalid video blob provided');
      return false;
    }
    
    if (!audioBlob || !(audioBlob instanceof Blob)) {
      _handleError('Invalid audio blob provided');
      return false;
    }
    
    return true;
  }

  /**
   * Generates a safe filename for output files
   * @private
   * @param {string} baseName - Base name for the file
   * @param {string} extension - File extension
   * @returns {string} Safe filename
   */
  function _generateSafeFilename(baseName, extension) {
    const safeBase = baseName
      .replace(/[^a-z0-9أ-ي\s_-]/gi, '')
      .replace(/\s+/g, '_');
    
    return `${safeBase}_${Date.now()}.${extension}`;
  }

  /**
   * Merges a video file (as Blob) with an audio file (as Blob) into an MP4 file
   * @param {Blob} videoBlob - The video data (e.g., WebM from CCapture)
   * @param {string} videoInputFilename - Suggested filename for videoBlob (e.g., 'video.webm')
   * @param {Blob} audioBlob - The audio data (e.g., MP3 or AAC)
   * @param {string} audioInputFilename - Suggested filename for audioBlob (e.g., 'audio.mp3')
   * @param {string} [outputFilename='output.mp4'] - Desired output filename
   * @returns {Promise<FFmpegMergeResult>} A promise that resolves with merge result
   */
  async function mergeVideoAndAudio(videoBlob, videoInputFilename, audioBlob, audioInputFilename, outputFilename = 'output.mp4') {
    try {
      if (!_validateMergeInputs(videoBlob, audioBlob)) {
        return {
          blob: null,
          success: false,
          filename: null,
          error: new Error('Invalid input blobs')
        };
      }
      
      if (!await _ensureFFmpegIsReady()) {
        _handleError('FFmpeg is not ready for merging audio and video');
        return {
          blob: null,
          success: false,
          filename: null,
          error: new Error('FFmpeg not ready')
        };
      }
      
      if (!ffmpeg || isProcessing) {
        return {
          blob: null,
          success: false,
          filename: null,
          error: new Error('FFmpeg not available')
        };
      }
      
      isProcessing = true;
      _updateProgress(
        FFMPEG_CONFIG.LOADING_STEPS.INIT,
        'ffmpeg.merging.preparing'
      );
      
      try {
        // Write files to FFmpeg's virtual file system
        ffmpeg.FS('writeFile', videoInputFilename, new Uint8Array(await videoBlob.arrayBuffer()));
        ffmpeg.FS('writeFile', audioInputFilename, new Uint8Array(await audioBlob.arrayBuffer()));
        
        _updateProgress(
          FFMPEG_CONFIG.LOADING_STEPS.LOADING_CORE,
          'ffmpeg.merging.processing'
        );
        
        // FFmpeg command: 
        // -i video.webm -i audio.mp3 -c:v copy -c:a aac -b:a 192k -shortest output.mp4
        await ffmpeg.run(
          '-i', videoInputFilename,
          '-i', audioInputFilename,
          '-c:v', 'copy',      // Copy video stream without re-encoding
          '-c:a', 'aac',       // Re-encode audio to AAC for compatibility
          '-b:a', '192k',      // Audio bitrate
          '-shortest',         // Finish when the shortest input ends
          outputFilename
        );
        
        _updateProgress(
          FFMPEG_CONFIG.LOADING_STEPS.FINALIZING,
          'ffmpeg.merging.finalizing'
        );
        
        // Read the output file
        const outputData = ffmpeg.FS('readFile', outputFilename);
        const mergedBlob = new Blob([outputData.buffer], { type: 'video/mp4' });
        
        // Log success
        (dependencies.errorLogger.logInfo || console.info).call(dependencies.errorLogger, {
          message: `Video and audio merged successfully into "${outputFilename}". Size: ${(mergedBlob.size / 1024 / 1024).toFixed(2)} MB`,
          origin: 'FFmpegIntegration.mergeVideoAndAudio'
        });
        
        dependencies.notificationServiceAPI.showSuccess(
          dependencies.localizationService.translate('ffmpeg.merging.success', outputFilename) || 
          `تم دمج الصوت والفيديو بنجاح في ${outputFilename}!`
        );
        
        return {
          blob: mergedBlob,
          success: true,
          filename: outputFilename,
          error: null
        };
      } catch (error) {
        _handleError('FFmpeg failed to merge video and audio', error);
        return {
          blob: null,
          success: false,
          filename: null,
          error
        };
      } finally {
        // Clean up files from FFmpeg's virtual file system
        try {
          if (ffmpeg && ffmpeg.FS) {
            [videoInputFilename, audioInputFilename, outputFilename].forEach(filename => {
              try {
                if (ffmpeg.FS('exists', filename)) {
                  ffmpeg.FS('unlink', filename);
                }
              } catch (cleanupError) {
                console.warn(`Failed to clean up file: ${filename}`, cleanupError);
              }
            });
          }
        } catch (finalCleanupError) {
          console.warn('Final cleanup failed', finalCleanupError);
        }
        
        _updateProgress(
          FFMPEG_CONFIG.LOADING_STEPS.COMPLETED,
          'ffmpeg.process.completed'
        );
        isProcessing = false;
      }
    } catch (error) {
      _handleError('Unexpected error during video-audio merge', error);
      return {
        blob: null,
        success: false,
        filename: null,
        error
      };
    }
  }

  /**
   * Transcodes a video file from one format to another
   * @param {Blob} inputFileBlob - The input video Blob
   * @param {string} inputFilename - e.g., 'input.webm'
   * @param {string} outputFormat - e.g., 'mp4'
   * @param {string} [outputFilename] - Optional output filename
   * @param {Array<string>} [ffmpegOptions=[]] - Additional FFmpeg command options
   * @returns {Promise<FFmpegMergeResult>} The transcoded video result
   */
  async function transcodeVideo(inputFileBlob, inputFilename, outputFormat, outputFilename, ffmpegOptions = []) {
    try {
      if (!(inputFileBlob instanceof Blob)) {
        _handleError('Invalid input blob for transcoding');
        return {
          blob: null,
          success: false,
          filename: null,
          error: new Error('Invalid input blob')
        };
      }
      
      if (!await _ensureFFmpegIsReady()) {
        _handleError('FFmpeg is not ready for video transcoding');
        return {
          blob: null,
          success: false,
          filename: null,
          error: new Error('FFmpeg not ready')
        };
      }
      
      if (!ffmpeg || isProcessing) {
        return {
          blob: null,
          success: false,
          filename: null,
          error: new Error('FFmpeg not available')
        };
      }
      
      isProcessing = true;
      outputFilename = outputFilename || `transcoded.${outputFormat}`;
      
      _updateProgress(
        FFMPEG_CONFIG.LOADING_STEPS.INIT,
        'ffmpeg.transcoding.preparing'
      );
      
      try {
        // Write input file to FFmpeg's virtual file system
        ffmpeg.FS('writeFile', inputFilename, new Uint8Array(await inputFileBlob.arrayBuffer()));
        
        _updateProgress(
          FFMPEG_CONFIG.LOADING_STEPS.LOADING_CORE,
          'ffmpeg.transcoding.processing'
        );
        
        // Build FFmpeg command
        const command = [
          '-i', inputFilename,
          ...ffmpegOptions,
          outputFilename
        ];
        
        // Execute FFmpeg command
        await ffmpeg.run(...command);
        
        _updateProgress(
          FFMPEG_CONFIG.LOADING_STEPS.FINALIZING,
          'ffmpeg.transcoding.finalizing'
        );
        
        // Read the output file
        const outputData = ffmpeg.FS('readFile', outputFilename);
        const transcodedBlob = new Blob([outputData.buffer], { type: `video/${outputFormat}` });
        
        // Log success
        (dependencies.errorLogger.logInfo || console.info).call(dependencies.errorLogger, {
          message: `Video transcoded successfully to "${outputFilename}". Size: ${(transcodedBlob.size / 1024 / 1024).toFixed(2)} MB`,
          origin: 'FFmpegIntegration.transcodeVideo'
        });
        
        dependencies.notificationServiceAPI.showSuccess(
          dependencies.localizationService.translate('ffmpeg.transcoding.success', outputFilename) || 
          `تم تحويل الفيديو بنجاح إلى ${outputFilename}!`
        );
        
        return {
          blob: transcodedBlob,
          success: true,
          filename: outputFilename,
          error: null
        };
      } catch (error) {
        _handleError('FFmpeg failed to transcode video', error);
        return {
          blob: null,
          success: false,
          filename: null,
          error
        };
      } finally {
        // Clean up files from FFmpeg's virtual file system
        try {
          if (ffmpeg && ffmpeg.FS) {
            [inputFilename, outputFilename].forEach(filename => {
              try {
                if (ffmpeg.FS('exists', filename)) {
                  ffmpeg.FS('unlink', filename);
                }
              } catch (cleanupError) {
                console.warn(`Failed to clean up file: ${filename}`, cleanupError);
              }
            });
          }
        } catch (finalCleanupError) {
          console.warn('Final cleanup failed', finalCleanupError);
        }
        
        _updateProgress(
          FFMPEG_CONFIG.LOADING_STEPS.COMPLETED,
          'ffmpeg.process.completed'
        );
        isProcessing = false;
      }
    } catch (error) {
      _handleError('Unexpected error during video transcoding', error);
      return {
        blob: null,
        success: false,
        filename: null,
        error
      };
    }
  }

  /**
   * Injects dependencies into the module
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
     * Loads and initializes FFmpeg
     * @returns {Promise<boolean>} True if FFmpeg was loaded successfully
     */
    loadFFmpeg: async () => {
      return await _ensureFFmpegIsReady();
    },
    
    /**
     * Checks if FFmpeg is ready for use
     * @returns {boolean} True if FFmpeg is ready
     */
    isReady: () => ffmpegCoreLoaded && !!ffmpeg,
    
    /**
     * Checks if FFmpeg is currently processing
     * @returns {boolean} True if FFmpeg is processing
     */
    isProcessing: () => isProcessing,
    
    /**
     * Merges video and audio files
     * @returns {Promise<FFmpegMergeResult>} Result of the merge operation
     */
    mergeVideoAndAudio,
    
    /**
     * Transcodes video files
     * @returns {Promise<FFmpegMergeResult>} Result of the transcoding operation
     */
    transcodeVideo
  };
})();

/**
 * Initializes the FFmpegIntegration module
 * @param {Object} deps - Dependencies to inject
 * @returns {Object} Initialized module with public API
 */
export function initializeFFmpegIntegration(deps) {
  try {
    ffmpegIntegration._setDependencies(deps);
    
    // Check for global FFmpeg library
    if (typeof window.FFmpeg === 'undefined' || 
        typeof window.FFmpeg.createFFmpeg === 'undefined') {
      (deps.errorLogger.logWarning || console.warn).call(deps.errorLogger, {
        message: "Global FFmpeg library (createFFmpeg) is not available on window. FFmpeg features will require it to be loaded first.",
        origin: 'initializeFFmpegIntegration'
      });
    }
    
    return {
      loadFFmpeg: ffmpegIntegration.loadFFmpeg,
      isReady: ffmpegIntegration.isReady,
      isProcessing: ffmpegIntegration.isProcessing,
      mergeVideoAndAudio: ffmpegIntegration.mergeVideoAndAudio,
      transcodeVideo: ffmpegIntegration.transcodeVideo
    };
  } catch (error) {
    console.error('FFmpegIntegration initialization failed:', error);
    return {
      loadFFmpeg: async () => false,
      isReady: () => false,
      isProcessing: () => false,
      mergeVideoAndAudio: async () => ({ 
        blob: null, 
        success: false, 
        filename: null, 
        error: new Error('Initialization failed') 
      }),
      transcodeVideo: async () => ({ 
        blob: null, 
        success: false, 
        filename: null, 
        error: new Error('Initialization failed') 
      })
    };
  }
}

export default ffmpegIntegration;
