// js/services/speech.recognition.wrapper.js

// errorLogger يمكن تمريره أو استيراده. للتبسيط، نفترض أنه سيتم تمريره عند الحاجة
// أو أن الوحدات المستدعية ستسجل الأخطاء.

const speechRecognitionWrapper = (() => {
  // Attempt to get the SpeechRecognition object based on browser prefix
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  // const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList; // If using grammars
  // const SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent; // For event types

  let recognitionInstance = null;
  let isRecognizing = false;
  let currentLanguage = 'ar-SA'; // Default language for Quranic context

  // Callbacks to be set by the consumer
  let onResultCallback = (transcript, isFinal) => {};
  let onErrorCallback = (errorType, errorMessage) => {};
  let onStartCallback = () => {};
  let onEndCallback = () => {};
  let onNoMatchCallback = () => {}; // When speech is detected but not recognized

  /**
   * Checks if the Web Speech API (SpeechRecognition) is supported by the browser.
   * @returns {boolean} True if supported, false otherwise.
   */
  const isSupported = () => {
    return !!SpeechRecognition;
  };

  /**
   * Initializes the SpeechRecognition instance if not already initialized.
   * Sets up event listeners for the recognition process.
   * @param {string} [lang=currentLanguage] - The language code for recognition (e.g., 'ar-SA', 'en-US').
   * @param {import('../core/error-logger.js').default | Console} [errorLogger=console] - Error logger.
   * @returns {boolean} True if initialization was successful or already initialized, false if not supported.
   */
  const initialize = (lang = currentLanguage, errorLogger = console) => {
    if (!isSupported()) {
      (errorLogger.logWarning || errorLogger.warn)?.call(errorLogger, {
        message: 'SpeechRecognition API is not supported in this browser.',
        origin: 'SpeechRecognitionWrapper.initialize'
      });
      return false;
    }

    if (recognitionInstance) {
      // If language changed, we might need to re-create or update
      if (recognitionInstance.lang !== lang) {
        try {
            if (isRecognizing) recognitionInstance.stop(); // Stop if running
        } catch (e) { /* ignore */ }
        recognitionInstance.lang = lang;
        currentLanguage = lang;
        // console.debug(`[SpeechRecognitionWrapper] Language updated to: ${lang}`);
      }
      return true;
    }

    try {
      recognitionInstance = new SpeechRecognition();
      recognitionInstance.lang = lang;
      currentLanguage = lang;
      recognitionInstance.continuous = false; // True for dictation, false for single commands/phrases
      recognitionInstance.interimResults = true; // Get interim results as user speaks
      recognitionInstance.maxAlternatives = 1; // Number of alternative transcriptions

      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript.trim()) {
          onResultCallback(finalTranscript.trim(), true);
        } else if (interimTranscript.trim()) {
          onResultCallback(interimTranscript.trim(), false);
        }
        // console.debug('[SpeechRecognitionWrapper] Result:', { final: finalTranscript, interim: interimTranscript });
      };

      recognitionInstance.onerror = (event) => {
        isRecognizing = false;
        let message = `Speech recognition error: ${event.error}`;
        if (event.error === 'no-speech') {
          message = 'No speech was detected.';
          onNoMatchCallback(); // Specific callback for no speech
        } else if (event.error === 'audio-capture') {
          message = 'Audio capture failed. Microphone issue?';
        } else if (event.error === 'not-allowed') {
          message = 'Permission to use microphone was denied or not granted.';
        } else if (event.error === 'network') {
            message = 'A network error occurred during speech recognition.';
        }
        
        (errorLogger.logWarning || errorLogger.warn)?.call(errorLogger, {
          message: message,
          origin: 'SpeechRecognitionWrapper.onerror',
          context: { errorEvent: event.error, messageFromEvent: event.message }
        });
        onErrorCallback(event.error, message);
        if (onEndCallback) onEndCallback(); // Ensure onEnd is called
      };

      recognitionInstance.onstart = () => {
        isRecognizing = true;
        // console.debug('[SpeechRecognitionWrapper] Recognition started.');
        onStartCallback();
      };

      recognitionInstance.onend = () => {
        isRecognizing = false;
        // console.debug('[SpeechRecognitionWrapper] Recognition ended.');
        onEndCallback();
      };
      
      recognitionInstance.onnomatch = () => {
        // console.debug('[SpeechRecognitionWrapper] Speech not recognized (no match).');
        onNoMatchCallback();
      };
      
      // Other events: onaudiostart, onaudiend, onsoundstart, onsoundend, onspeechstart, onspeechend
      // recognitionInstance.onspeechstart = () => console.debug('[SpeechRecognition] Speech detected.');
      // recognitionInstance.onspeechend = () => console.debug('[SpeechRecognition] Speech ended.');

      return true;
    } catch (error) {
      (errorLogger.handleError || errorLogger.error)?.call(errorLogger, {
        error,
        message: 'Failed to create SpeechRecognition instance.',
        origin: 'SpeechRecognitionWrapper.initialize'
      });
      recognitionInstance = null;
      return false;
    }
  };

  /**
   * Starts the speech recognition process.
   * @param {object} [callbacks] - Optional callbacks for this specific start.
   * @param {function} [callbacks.onResult] - (transcript: string, isFinal: boolean) => void
   * @param {function} [callbacks.onError] - (errorType: string, errorMessage: string) => void
   * @param {function} [callbacks.onStart]
   * @param {function} [callbacks.onEnd]
   * @param {function} [callbacks.onNoMatch]
   * @param {import('../core/error-logger.js').default | Console} [errorLogger=console] - Error logger.
   * @returns {boolean} True if recognition was started, false otherwise (e.g., not supported, already recognizing, or init failed).
   */
  const start = (callbacks = {}, errorLogger = console) => {
    if (!isSupported() || !recognitionInstance) {
      (errorLogger.logWarning || errorLogger.warn)?.call(errorLogger, {
        message: 'Cannot start speech recognition: not supported or not initialized.',
        origin: 'SpeechRecognitionWrapper.start',
        context: { isSupported: isSupported(), hasInstance: !!recognitionInstance }
      });
      // Try to initialize if not already, but only if supported
      if(isSupported() && !recognitionInstance){
          if(!initialize(currentLanguage, errorLogger)){
              onErrorCallback('init-failed', 'Speech recognition could not be initialized.');
              return false;
          }
      } else if (!isSupported()) {
        onErrorCallback('not-supported', 'Speech recognition is not supported in this browser.');
        return false;
      }
    }
    
    if (isRecognizing) {
      // console.debug('[SpeechRecognitionWrapper] Recognition is already active.');
      // Optionally, stop the current one and start a new one, or just return false.
      // For single command scenarios, returning false or stopping and restarting is common.
      // recognitionInstance.stop(); // Uncomment to force restart
      return false; // Indicate it's already running
    }

    // Update callbacks if provided for this specific session
    if (callbacks.onResult) onResultCallback = callbacks.onResult;
    if (callbacks.onError) onErrorCallback = callbacks.onError;
    if (callbacks.onStart) onStartCallback = callbacks.onStart;
    if (callbacks.onEnd) onEndCallback = callbacks.onEnd;
    if (callbacks.onNoMatch) onNoMatchCallback = callbacks.onNoMatch;
    
    try {
      recognitionInstance.start();
      return true;
    } catch (error) {
      // This can happen if, for example, called too frequently or other state issues
      isRecognizing = false;
      (errorLogger.handleError || errorLogger.error)?.call(errorLogger, {
        error,
        message: 'Error attempting to start speech recognition.',
        origin: 'SpeechRecognitionWrapper.start'
      });
      onErrorCallback('start-failed', error.message || 'Failed to start recognition.');
      if (onEndCallback) onEndCallback(); // Ensure onEnd is called
      return false;
    }
  };

  /**
   * Stops the speech recognition process, if active.
   */
  const stop = () => {
    if (isRecognizing && recognitionInstance) {
      try {
        recognitionInstance.stop();
        // isRecognizing will be set to false by the 'onend' event
      } catch(error){
        // Error logger usage depends on how errorLogger is made available here.
        console.error('[SpeechRecognitionWrapper] Error attempting to stop speech recognition:', error);
        isRecognizing = false; // Force state update
        if (onEndCallback) onEndCallback();
      }
    }
  };

  /**
   * Aborts the speech recognition process immediately, if active.
   * Does not trigger the 'onresult' event.
   */
  const abort = () => {
    if (isRecognizing && recognitionInstance) {
       try {
        recognitionInstance.abort();
        // isRecognizing will be set to false by the 'onend' event
      } catch(error){
        console.error('[SpeechRecognitionWrapper] Error attempting to abort speech recognition:', error);
        isRecognizing = false;
        if (onEndCallback) onEndCallback();
      }
    }
  };

  /**
   * Sets default callbacks for the recognition events.
   * @param {object} callbacks - Object with callback functions.
   * @param {function} [callbacks.onResult] - (transcript: string, isFinal: boolean) => void
   * @param {function} [callbacks.onError] - (errorType: string, errorMessage: string) => void
   * @param {function} [callbacks.onStart]
   * @param {function} [callbacks.onEnd]
   * @param {function} [callbacks.onNoMatch]
   */
  const setDefaultCallbacks = (callbacks) => {
    if (callbacks.onResult) onResultCallback = callbacks.onResult;
    if (callbacks.onError) onErrorCallback = callbacks.onError;
    if (callbacks.onStart) onStartCallback = callbacks.onStart;
    if (callbacks.onEnd) onEndCallback = callbacks.onEnd;
    if (callbacks.onNoMatch) onNoMatchCallback = callbacks.onNoMatch;
  };
  
  /**
   * Gets the current recognition language.
   * @returns {string}
   */
  const getCurrentLang = () => currentLanguage;

  /**
   * Gets whether recognition is currently active.
   * @returns {boolean}
   */
  const isCurrentlyRecognizing = () => isRecognizing;


  return {
    isSupported,
    initialize, // Call this once, or it will be called by start() if needed
    start,
    stop,
    abort,
    setDefaultCallbacks, // Set these before starting, or pass to start()
    getCurrentLang,
    isCurrentlyRecognizing,
  };
})();

// This service typically doesn't need an `initialize...` in moduleBootstrap
// unless you want to pre-initialize it with a default language and check support globally.
// Features using it would call `initialize()` or `start()` which internally initializes.

// Example initialization if pre-initializing from moduleBootstrap:
// export function initializeSpeechRecognitionService(dependencies) {
//   const { errorLogger } = dependencies; // Assume errorLogger is passed
//   if (speechRecognitionWrapper.isSupported()) {
//     speechRecognitionWrapper.initialize('ar-SA', errorLogger); // Initialize with default lang
//     console.info('[SpeechRecognitionWrapper] Pre-initialized via moduleBootstrap.');
//   } else {
//     console.warn('[SpeechRecognitionWrapper] Not pre-initialized: Not supported by browser.');
//   }
//   return speechRecognitionWrapper; // Return the wrapper API
// }


export default speechRecognitionWrapper;
