// js/shared-ui-components/modal.factory.js

// DOMElements يمكن استخدامه إذا كان هناك حاوية modal عامة في HTML،
// ولكن هنا سننشئ الـ modal بالكامل برمجيًا ونضيفه إلى body.
// import DOMElements from '../core/dom-elements.js';

// localizationService يمكن تمريره إذا كانت أزرار الـ modal (نعم، لا، إلغاء) تحتاج للترجمة
// import localizationService from '../core/localization.service.js';

// errorLogger يمكن تمريره لتسجيل أي أخطاء داخلية
// import errorLogger from '../core/error-logger.js';

const modalFactory = (() => {
  let activeModal = null; // To keep track of the currently displayed modal (if any)
  let dependencies = { errorLogger: console, localizationService: { translate: (key) => key } }; // Fallbacks

  /**
   * Creates the basic modal structure (overlay and content wrapper).
   * @private
   * @returns {{overlay: HTMLElement, modalContent: HTMLElement}}
   */
  function _createModalShell() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay'; // Add CSS for this class

    const modalWrapper = document.createElement('div');
    modalWrapper.className = 'modal-wrapper'; // Add CSS for this class

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content'; // Add CSS for this class

    modalWrapper.appendChild(modalContent);
    overlay.appendChild(modalWrapper);

    // Close modal if overlay is clicked (optional behavior)
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay && activeModal && activeModal.options.closeOnOverlayClick) {
        _closeActiveModal(false); // 'false' indicates resolved with cancellation or default
      }
    });

    return { overlay, modalContent };
  }

  /**
   * Closes the currently active modal and resolves/rejects its promise.
   * @private
   * @param {any} resolutionValue - The value to resolve the promise with.
   */
  function _closeActiveModal(resolutionValue) {
    if (activeModal) {
      document.body.removeChild(activeModal.overlayElement);
      document.removeEventListener('keydown', activeModal.escapeKeyListener);
      
      if (activeModal.resolvePromise) {
          activeModal.resolvePromise(resolutionValue);
      }
      activeModal = null;
      document.body.classList.remove('modal-open'); // For potential body scroll lock
    }
  }

  /**
   * Default options for modals.
   */
  const defaultModalOptions = {
    closeOnEscape: true,
    closeOnOverlayClick: true,
    confirmTextKey: 'button.confirm',
    cancelTextKey: 'button.cancel',
    alertOkTextKey: 'button.ok', // Typically 'OK'
  };

  /**
   * Displays a confirmation modal.
   * @param {object} config - Configuration for the confirmation modal.
   * @param {string} config.title - The title of the modal.
   * @param {string} config.message - The message/question to display.
   * @param {string} [config.confirmText] - Text for the confirm button (overrides default).
   * @param {string} [config.cancelText] - Text for the cancel button (overrides default).
   * @param {Partial<defaultModalOptions>} [config.options] - Override default modal behaviors.
   * @returns {Promise<boolean>} A promise that resolves with `true` if confirmed, `false` if cancelled.
   */
  async function showConfirm(config) {
    if (activeModal) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'Another modal is already active. Cannot show new confirm modal.',
        origin: 'ModalFactory.showConfirm'
      });
      return Promise.reject(new Error('Modal already active.'));
    }

    const currentOptions = { ...defaultModalOptions, ...(config.options || {}) };
    const { overlay, modalContent } = _createModalShell();

    // Title
    const titleElement = document.createElement('h3');
    titleElement.className = 'modal-title';
    titleElement.textContent = config.title || '';
    modalContent.appendChild(titleElement);

    // Message
    const messageElement = document.createElement('p');
    messageElement.className = 'modal-message';
    messageElement.innerHTML = config.message || ''; // Use innerHTML to allow simple HTML in message
    modalContent.appendChild(messageElement);

    // Actions
    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'modal-actions';

    return new Promise((resolve) => {
      const confirmButton = document.createElement('button');
      confirmButton.className = 'modal-button confirm-button button-primary-action'; // Add your button styles
      confirmButton.textContent = config.confirmText || dependencies.localizationService.translate(currentOptions.confirmTextKey);
      confirmButton.onclick = () => _closeActiveModal(true);

      const cancelButton = document.createElement('button');
      cancelButton.className = 'modal-button cancel-button button-secondary'; // Add your button styles
      cancelButton.textContent = config.cancelText || dependencies.localizationService.translate(currentOptions.cancelTextKey);
      cancelButton.onclick = () => _closeActiveModal(false);

      actionsWrapper.appendChild(cancelButton); // RTL: Cancel might be on left
      actionsWrapper.appendChild(confirmButton);
      modalContent.appendChild(actionsWrapper);

      const escapeKeyListener = (event) => {
        if (event.key === 'Escape' && currentOptions.closeOnEscape) {
          _closeActiveModal(false);
        }
      };

      activeModal = {
        overlayElement: overlay,
        resolvePromise: resolve,
        escapeKeyListener: escapeKeyListener,
        options: currentOptions
      };

      document.addEventListener('keydown', escapeKeyListener);
      document.body.appendChild(overlay);
      document.body.classList.add('modal-open'); // For scroll lock
      confirmButton.focus(); // Focus the confirm button by default
    });
  }


  /**
   * Displays an alert modal (simple message with an OK button).
   * @param {object} config - Configuration for the alert modal.
   * @param {string} config.title - The title of the modal.
   * @param {string} config.message - The message to display.
   * @param {string} [config.okText] - Text for the OK button (overrides default).
   * @param {Partial<defaultModalOptions>} [config.options] - Override default modal behaviors (e.g., closeOnEscape).
   * @returns {Promise<void>} A promise that resolves when the OK button is clicked.
   */
  async function showAlert(config) {
     if (activeModal) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'Another modal is already active. Cannot show new alert modal.',
        origin: 'ModalFactory.showAlert'
      });
      return Promise.reject(new Error('Modal already active.'));
    }
    const currentOptions = { ...defaultModalOptions, ...(config.options || {}) };
    const { overlay, modalContent } = _createModalShell();

    const titleElement = document.createElement('h3');
    titleElement.className = 'modal-title';
    titleElement.textContent = config.title || '';
    modalContent.appendChild(titleElement);

    const messageElement = document.createElement('p');
    messageElement.className = 'modal-message';
    messageElement.innerHTML = config.message || '';
    modalContent.appendChild(messageElement);

    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'modal-actions single-action'; // For styling single button

    return new Promise((resolve) => {
      const okButton = document.createElement('button');
      okButton.className = 'modal-button ok-button button-primary-action';
      okButton.textContent = config.okText || dependencies.localizationService.translate(currentOptions.alertOkTextKey);
      okButton.onclick = () => _closeActiveModal(undefined); // Resolve with undefined for alert

      actionsWrapper.appendChild(okButton);
      modalContent.appendChild(actionsWrapper);
      
      const escapeKeyListener = (event) => {
        if (event.key === 'Escape' && currentOptions.closeOnEscape) {
           _closeActiveModal(undefined);
        }
      };

      activeModal = {
        overlayElement: overlay,
        resolvePromise: resolve,
        escapeKeyListener: escapeKeyListener,
        options: currentOptions
      };
      document.addEventListener('keydown', escapeKeyListener);
      document.body.appendChild(overlay);
      document.body.classList.add('modal-open');
      okButton.focus();
    });
  }

  /**
   * (Future) Displays a prompt modal for user input.
   * @param {object} config - Configuration for the prompt.
   * @param {string} config.title - Modal title.
   * @param {string} config.message - Message/label for the input.
   * @param {string} [config.defaultValue=''] - Default value for the input field.
   * @param {string} [config.placeholder=''] - Placeholder for the input field.
   * @param {string} [config.inputType='text'] - Type of input (text, number, etc.).
   * @param {Partial<defaultModalOptions>} [config.options] - Override default modal behaviors.
   * @returns {Promise<string | null>} A promise that resolves with the input string or null if cancelled.
   */
  async function showPrompt(config) {
    if (activeModal) {
      (dependencies.errorLogger.logWarning || console.warn).call(dependencies.errorLogger, {
        message: 'Another modal is already active. Cannot show new prompt modal.',
        origin: 'ModalFactory.showPrompt'
      });
      return Promise.reject(new Error('Modal already active.'));
    }
    // ... Implementation similar to showConfirm but with an <input> field ...
    // The promise would resolve with input.value or null/undefined on cancel.
    (dependencies.errorLogger.logInfo || console.info).call(dependencies.errorLogger, {
      message: 'showPrompt is not fully implemented yet.',
      origin: 'ModalFactory.showPrompt'
    });
    return Promise.resolve(null); // Placeholder
  }
  
  /**
   * Sets the dependencies for the modal factory.
   * Called by initializeModalFactory.
   * @param {object} injectedDeps - { errorLogger, localizationService }
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService;
  }


  return {
    _setDependencies, // For initialization by moduleBootstrap wrapper
    showConfirm,
    showAlert,
    showPrompt,
    // Method to check if a modal is currently active
    isModalActive: () => !!activeModal,
    // Method to programmatically close the active modal (e.g., if an async operation finishes)
    // resolveValue determines what the modal's promise resolves to.
    closeActiveModal: (resolveValue) => _closeActiveModal(resolveValue)
  };
})();


/**
 * Initialization function for the ModalFactory, to be called by moduleBootstrap.
 * @param {object} dependencies
 * @param {import('../core/error-logger.js').default} dependencies.errorLogger
 * @param {import('../core/localization.service.js').default} dependencies.localizationService
 */
export function initializeModalFactory(dependencies) {
  modalFactory._setDependencies(dependencies);
  // console.info('[ModalFactory] Initialized with dependencies.');
  // The factory itself is the "API" or "instance" to be used.
  return modalFactory;
}

// Usually, other modules will import `modalFactory` directly if `initializeModalFactory`
// ensures dependencies are set early or if they pass dependencies per call.
// However, returning it from init allows moduleBootstrap to potentially provide it if configured with 'provides'.
export default modalFactory;
