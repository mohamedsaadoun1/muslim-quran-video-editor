// js/features/audio-engine/audio-track-extractor.js

// Dependencies that might be injected or imported
// import errorLogger from '../../core/error-logger.js';
// import { ACTIONS, EVENTS } from '../../config/app.constants.js';
// import { FFMPEG_LOADED_EVENT } // if FFmpeg.wasm loading is managed elsewhere

const audioTrackExtractor = (() => {
  let ffmpeg = null; // Will hold the FFmpeg.wasm instance once loaded
  let ffmpegCoreLoaded = false;
  let dependencies = {
    errorLogger: console, // Fallback
    // stateStore: null,
    // eventAggregator: null
  };

  const FFMPEG_CORE_CDN_URL = 'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js'; // Example CDN


  /**
   * Attempts to load FFmpeg.wasm core if not already loaded.
   * @private
   * @returns {Promise<boolean>} True if FFmpeg is loaded, false otherwise.
   */
  async function _ensureFFmpegLoaded() {
    if (ffmpeg && ffmpegCoreLoaded) {
      return true;
    }
    if (typeof window.FFmpeg === 'undefined' || typeof window.FFmpeg.createFFmpeg === 'undefined') {
        (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
            message: "FFmpeg.wasm (createFFmpeg) is not loaded/available globally. Cannot use FFmpeg for extraction.",
            origin: 'AudioTrackExtractor._ensureFFmpegLoaded'
        });
        // Attempt to load it if a CDN for the main library is known, though this is usually a larger setup step.
        // For now, assume the main FFmpeg library part of `createFFmpeg` is loaded via a <script> tag if used this way.
        return false;
    }

    if (!ffmpeg) {
        // dependencies.stateStore?.dispatch(ACTIONS.SET_LOADING, true); // Indicate loading
        (dependencies.errorLogger.logInfo || console.info).call(dependencies.errorLogger, {
            message: "Loading FFmpeg.wasm core... This might take a moment.",
            origin: 'AudioTrackExtractor._ensureFFmpegLoaded'
        });
        try {
            ffmpeg = window.FFmpeg.createFFmpeg({
                log: true, // Enable FFmpeg logging to console (can be verbose)
                corePath: FFMPEG_CORE_CDN_URL, // Path to ffmpeg-core.js
            });
            await ffmpeg.load();
            ffmpegCoreLoaded = true;
            // dependencies.eventAggregator?.publish(FFMPEG_LOADED_EVENT);
            (dependencies.errorLogger.logInfo || console.info).call(dependencies.errorLogger, {
                message: "FFmpeg.wasm core loaded successfully.",
                origin: 'AudioTrackExtractor._ensureFFmpegLoaded'
            });
            return true;
        } catch (error) {
            ffmpegCoreLoaded = false;
            ffmpeg = null; // Reset on failure
            (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
                error,
                message: "Failed to load FFmpeg.wasm core.",
                origin: 'AudioTrackExtractor._ensureFFmpegLoaded'
            });
            return false;
        } finally {
            // dependencies.stateStore?.dispatch(ACTIONS.SET_LOADING, false);
        }
    }
    return ffmpegCoreLoaded;
  }


  /**
   * Extracts audio from a video file using FFmpeg.wasm.
   * @param {File} videoFile - The video file object.
   * @param {string} [outputFormat='mp3'] - Desired output audio format (e.g., 'mp3', 'aac', 'wav').
   * @returns {Promise<Blob | null>} A promise that resolves with the extracted audio Blob, or null on failure.
   */
  async function extractWithFFmpeg(videoFile, outputFormat = 'mp3') {
    if (!await _ensureFFmpegLoaded()) {
      return null;
    }
    if (!ffmpeg || !ffmpegCoreLoaded) return null; // Double check after await

    const inputFileName = `input.${videoFile.name.split('.').pop() || 'mp4'}`;
    const outputFileName = `output.${outputFormat}`;
    let audioBlob = null;

    try {
    //   dependencies.stateStore?.dispatch(ACTIONS.SET_LOADING_MESSAGE, 'Preparing video for audio extraction...'); // If you have such an action
      (dependencies.errorLogger.logInfo || console.info).call(dependencies.errorLogger, {
          message: `Starting audio extraction for "${videoFile.name}" to ${outputFormat}...`,
          origin: 'AudioTrackExtractor.extractWithFFmpeg'
      });

      // 1. Write the video file to FFmpeg's virtual file system
      const data = new Uint8Array(await videoFile.arrayBuffer());
      ffmpeg.FS('writeFile', inputFileName, data);

    //   dependencies.stateStore?.dispatch(ACTIONS.SET_LOADING_MESSAGE, `Extracting audio (${outputFormat})...`);
      
      // 2. Run FFmpeg command
      // -vn: no video output
      // -acodec copy: copy audio codec if possible (faster, lossless for that stream), or specify one like 'libmp3lame'
      // For broader compatibility, you might need to re-encode:
      // e.g., await ffmpeg.run('-i', inputFileName, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', outputFileName); for MP3
      // e.g., await ffmpeg.run('-i', inputFileName, '-vn', '-acodec', 'aac', '-b:a', '192k', outputFileName); for AAC
      // '-c:a pcm_s16le' for WAV
      let command = ['-i', inputFileName, '-vn']; // Input file, no video

      switch(outputFormat.toLowerCase()) {
          case 'mp3':
              command.push('-c:a', 'libmp3lame', '-q:a', '2'); // VBR quality 2
              break;
          case 'aac':
              command.push('-c:a', 'aac', '-b:a', '128k'); // Bitrate 128k
              break;
          case 'wav':
              command.push('-c:a', 'pcm_s16le'); // Standard WAV
              break;
          case 'ogg': // Vorbis in Ogg container
              command.push('-c:a', 'libvorbis', '-q:a', '4');
              break;
          default:
              // Attempt to copy codec if format is just a container (like .m4a with aac)
              // or if it's a specific audio codec name FFmpeg understands for the container
              command.push('-acodec', 'copy'); // This might fail if format conversion needs re-encoding
              (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
                message: `Output format "${outputFormat}" not explicitly handled, attempting direct codec copy. This might fail.`,
                origin: 'AudioTrackExtractor.extractWithFFmpeg'
              });
      }
      command.push(outputFileName);
      
      await ffmpeg.run(...command);

      // 3. Read the output file from FFmpeg's virtual file system
      const outputData = ffmpeg.FS('readFile', outputFileName);
      audioBlob = new Blob([outputData.buffer], { type: `audio/${outputFormat === 'ogg' ? 'ogg' : outputFormat}` }); // Adjust MIME type as needed

      (dependencies.errorLogger.logInfo || console.info).call(dependencies.errorLogger, {
          message: `Audio extraction successful for "${videoFile.name}". Output size: ${(audioBlob.size / 1024 / 1024).toFixed(2)} MB`,
          origin: 'AudioTrackExtractor.extractWithFFmpeg'
      });

    } catch (error) {
      (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
        error,
        message: `FFmpeg audio extraction failed for "${videoFile.name}".`,
        origin: 'AudioTrackExtractor.extractWithFFmpeg'
      });
      audioBlob = null;
    } finally {
      // 4. Clean up files from FFmpeg's virtual file system
      try {
        if (ffmpeg && ffmpeg.FS) { // Check if ffmpeg and FS are available
            ffmpeg.FS('unlink', inputFileName);
            ffmpeg.FS('unlink', outputFileName);
        }
      } catch (e) { /* Silently ignore cleanup errors, main error is more important */ }
    //   dependencies.stateStore?.dispatch(ACTIONS.SET_LOADING, false);
    }
    return audioBlob;
  }


  /**
   * Attempts to extract audio using browser APIs (MediaStreamTrack).
   * This is very limited, usually only works for simple cases and might not
   * produce a downloadable/reusable Blob of the audio track itself easily.
   * It's more suited for live stream manipulation.
   * @param {File} videoFile - The video file object.
   * @returns {Promise<MediaStreamTrack | null>} A promise resolving with the first audio track, or null.
   */
  async function extractWithBrowserAPI(videoFile) {
    return new Promise((resolve) => {
      const videoElement = document.createElement('video');
      videoElement.src = URL.createObjectURL(videoFile);

      videoElement.onloadedmetadata = () => {
        let audioTrack = null;
        if (videoElement.captureStream) { // Standard
          const stream = videoElement.captureStream();
          const audioTracks = stream.getAudioTracks();
          if (audioTracks.length > 0) {
            audioTrack = audioTracks[0];
          }
        } else if (videoElement.mozCaptureStream) { // Firefox
          const stream = videoElement.mozCaptureStream();
          const audioTracks = stream.getAudioTracks();
          if (audioTracks.length > 0) {
            audioTrack = audioTracks[0];
          }
        }

        URL.revokeObjectURL(videoElement.src); // Clean up object URL

        if (audioTrack) {
          (dependencies.errorLogger.logInfo || console.info).call(dependencies.errorLogger, {
            message: `Audio track found via browser API for "${videoFile.name}". Label: ${audioTrack.label}`,
            origin: 'AudioTrackExtractor.extractWithBrowserAPI'
          });
          // Note: This track is part of a MediaStream. To get a Blob, you'd need MediaRecorder API.
          // This function is more for getting the track itself for potential real-time processing
          // or direct use in another MediaStream. For a downloadable Blob, FFmpeg is better.
          resolve(audioTrack);
        } else {
          (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
            message: `No audio tracks found or captureStream not supported for "${videoFile.name}" via browser API.`,
            origin: 'AudioTrackExtractor.extractWithBrowserAPI'
          });
          resolve(null);
        }
      };

      videoElement.onerror = (e) => {
        URL.revokeObjectURL(videoElement.src);
        (dependencies.errorLogger.handleError || console.error).call(dependencies.errorLogger, {
          error: videoElement.error || new Error('Video element error during audio track extraction attempt.'),
          message: `Error loading video metadata for audio track extraction of "${videoFile.name}".`,
          origin: 'AudioTrackExtractor.extractWithBrowserAPI'
        });
        resolve(null);
      };
    });
  }

  /**
   * Main function to attempt audio extraction.
   * It will try FFmpeg first if available, then potentially other methods.
   * @param {File} videoFile - The video file object.
   * @param {string} [preferredFormat='mp3'] - Desired output audio format if using FFmpeg.
   * @returns {Promise<Blob | MediaStreamTrack | null>} Audio Blob if FFmpeg succeeds, MediaStreamTrack if browser API succeeds (and returns track), or null.
   */
  async function extractAudio(videoFile, preferredFormat = 'mp3') {
    if (!(videoFile instanceof File)) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'Invalid videoFile provided for audio extraction.',
        origin: 'AudioTrackExtractor.extractAudio'
      });
      return null;
    }

    // Try FFmpeg first as it's more robust for creating a usable Blob
    if (typeof window.FFmpeg !== 'undefined' && typeof window.FFmpeg.createFFmpeg !== 'undefined') { // Check if FFmpeg library itself is loaded
        const ffmpegBlob = await extractWithFFmpeg(videoFile, preferredFormat);
        if (ffmpegBlob) {
            return ffmpegBlob;
        }
        // If FFmpeg failed but was attempted, we might not want to fall back,
        // or log that FFmpeg failed and now trying browser API.
        (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
          message: `FFmpeg extraction failed for "${videoFile.name}". Attempting browser API (limited).`,
          origin: 'AudioTrackExtractor.extractAudio'
        });
    } else {
        (dependencies.errorLogger.logInfo || console.info).call(dependencies.errorLogger, {
            message: "FFmpeg library (createFFmpeg) not found globally. Skipping FFmpeg extraction.",
            origin: 'AudioTrackExtractor.extractAudio'
        });
    }
    
    // Fallback or alternative: Browser API (less reliable for getting a downloadable Blob)
    // const browserAudioTrack = await extractWithBrowserAPI(videoFile);
    // return browserAudioTrack; // This returns a MediaStreamTrack, not a Blob easily

    (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: `Audio extraction for "${videoFile.name}" could not be completed with available methods. Browser API extraction currently yields MediaStreamTrack not Blob directly.`,
        origin: 'AudioTrackExtractor.extractAudio'
    });
    return null; // Default to null if all methods fail or aren't suitable for Blob
  }
  
  function _setDependencies(injectedDeps) {
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    // if (injectedDeps.stateStore) dependencies.stateStore = injectedDeps.stateStore;
    // if (injectedDeps.eventAggregator) dependencies.eventAggregator = injectedDeps.eventAggregator;
  }

  // Public API
  return {
    _setDependencies, // For initialization
    extractAudio, // Main public method
    isFFmpegCoreLoaded: () => ffmpegCoreLoaded,
    loadFFmpeg: _ensureFFmpegLoaded, // Allow explicit loading
    // extractWithBrowserAPI, // Expose if direct use of MediaStreamTrack is desired
    // extractWithFFmpeg, // Expose for more control if needed
  };

})();


/**
 * Initialization function for the AudioTrackExtractor, to be called by moduleBootstrap.
 * @param {object} dependencies
 * @param {import('../../core/error-logger.js').default} dependencies.errorLogger
 * @param {import('../../core/state-store.js').default} [dependencies.stateStore] - Optional
 * @param {import('../../core/event-aggregator.js').default} [dependencies.eventAggregator] - Optional
 */
export function initializeAudioTrackExtractor(dependencies) {
  audioTrackExtractor._setDependencies(dependencies);

  // Optionally, try to load FFmpeg core early if desired,
  // but it's a large download, so on-demand might be better.
  // audioTrackExtractor.loadFFmpeg();

  // console.info('[AudioTrackExtractor] Initialized.');
  return { // Expose the API that features will use
    extractAudio: audioTrackExtractor.extractAudio,
    isFFmpegCoreLoaded: audioTrackExtractor.isFFmpegCoreLoaded,
    loadFFmpeg: audioTrackExtractor.loadFFmpeg, // So UI can trigger pre-loading
  };
}

// Export the core object for potential direct use.
export default audioTrackExtractor;
