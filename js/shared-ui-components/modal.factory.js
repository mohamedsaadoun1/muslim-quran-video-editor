// js/shared-ui-components/modal.factory.js

/**
 * @typedef {Object} ModalOptions
 * @property {boolean} [closeOnEscape=true] - هل يُمكن إغلاق المودال بالزر Esc
 * @property {boolean} [closeOnOverlayClick=true] - هل يُمكن إغلاق المودال بالنقر على الخلفية
 * @property {string} [confirmTextKey='button.confirm'] - مفتاح ترجمة زر التأكيد
 * @property {string} [cancelTextKey='button.cancel'] - مفتاح ترجمة زر الإلغاء
 * @property {string} [alertOkTextKey='button.ok'] - مفتاح ترجمة زر OK في التنبيهات
 * @property {string} [theme='default'] - سمة التصميم (default, success, danger)
 * @property {number} [autoCloseDelay] - تأخير الإغلاق التلقائي بالمللي ثانية
 * @property {boolean} [allowBackgroundScroll=false] - هل يُسمح بالتمرير في الخلفية
 */

/**
 * @typedef {Object} ModalConfig
 * @property {string} title - عنوان المودال
 * @property {string} message - رسالة المودال
 * @property {string} [confirmText] - نص زر التأكيد (يُستخدم إن وُجد)
 * @property {string} [cancelText] - نص زر الإلغاء (يُستخدم إن وُجد)
 * @property {string} [okText] - نص زر OK (يُستخدم إن وُجد)
 * @property {string} [inputType='text'] - نوع حقل الإدخال (في حالة المودالات التي تحتوي على حقول إدخال)
 * @property {string} [defaultValue] - القيمة الافتراضية (في حالة المودالات التي تحتوي على حقول إدخال)
 * @property {string} [placeholder] - نص التلميح في حقل الإدخال
 * @property {Object} [options] - خيارات إضافية
 * @property {string} [customClass] - فئة CSS مخصصة
 * @property {boolean} [showCancelButton=true] - هل يتم عرض زر الإلغاء
 * @property {boolean} [showConfirmButton=true] - هل يتم عرض زر التأكيد
 * @property {boolean} [showOkButton=true] - هل يتم عرض زر OK
 * @property {string} [inputId] - معرف حقل الإدخال (في حالة وجوده)
 * @property {Array<{text: string, action: function, className?: string}>} [customButtons] - أزرار مخصصة
 * @property {function(string): boolean} [validationFunction] - وظيفة التحقق من صحة الإدخال
 * @property {string} [validationMessage] - رسالة التحقق من صحة الإدخال
 * @property {function(): void} [onOpen] - وظيفة عند فتح المودال
 * @property {function(): void} [onClose] - وظيفة عند إغلاق المودال
 */

/**
 * @typedef {Object} ModalInstance
 * @property {HTMLElement} overlayElement - عنصر الخلفية
 * @property {function} resolvePromise - وظيفة حل الوعد
 * @property {function} escapeKeyListener - مراقب أحداث الزر Esc
 * @property {ModalOptions} options - خيارات المودال
 * @property {Object} [inputField] - حقل الإدخال (في حالة وجوده)
 * @property {HTMLElement} inputField.element - عنصر الإدخال
 * @property {string} inputField.id - معرف حقل الإدخال
 * @property {function} inputField.validationFunction - وظيفة التحقق من صحة الإدخال
 * @property {string} inputField.validationMessage - رسالة التحقق من صحة الإدخال
 */

/**
 * @typedef {Object} ModalDependencies
 * @property {Object} errorLogger - مسجل الأخطاء
 * @property {Object} localizationService - خدمة الترجمة
 */

/**
 * مصنع إنشاء النوافذ المنبثقة
 * @type {{}}
 */
const modalFactory = (() => {
  let activeModal = null; // تتبع المودال الحالي
  let dependencies = {
    errorLogger: console,
    localizationService: {
      translate: (key) => key
    }
  }; // التبعيات
  
  /**
   * إنشاء هيكل المودال الأساسي
   * @private
   * @returns {{overlay: HTMLElement, modalContent: HTMLElement}} العناصر المُنشأة
   */
  function _createModalShell() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const modalWrapper = document.createElement('div');
    modalWrapper.className = 'modal-wrapper';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    modalWrapper.appendChild(modalContent);
    overlay.appendChild(modalWrapper);
    
    // إغلاق المودال بالنقر على الخلفية
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay && activeModal && activeModal.options?.closeOnOverlayClick) {
        _closeActiveModal(false);
      }
    });
    
    return { overlay, modalContent };
  }

  /**
   * إغلاق المودال النشط
   * @private
   * @param {*} resolutionValue - القيمة التي يتم حل الوعد بها
   */
  function _closeActiveModal(resolutionValue) {
    if (!activeModal) return;
    
    try {
      // إزالة المودال من DOM
      if (activeModal.overlayElement && activeModal.overlayElement.parentNode) {
        document.body.removeChild(activeModal.overlayElement);
      }
      
      // إزالة مراقب الأحداث للزر Esc
      if (activeModal.escapeKeyListener) {
        document.removeEventListener('keydown', activeModal.escapeKeyListener);
      }
      
      // حل الوعد
      if (activeModal.resolvePromise) {
        activeModal.resolvePromise(resolutionValue);
      }
      
      // إزالة المودال النشط
      activeModal = null;
      
      // إزالة الفئة من الجسم
      document.body.classList.remove('modal-open');
    } catch (error) {
      console.error('[ModalFactory] خطأ في إغلاق المودال:', error);
    }
  }

  /**
   * إنشاء مودال جديد
   * @private
   * @param {ModalConfig} config - تكوين المودال
   * @param {function(HTMLElement): void} contentHandler - وظيفة لمعالجة محتوى المودال
   * @param {function(): void} [resolveHandler] - وظيفة حل الوعد
   * @returns {Promise<*>} وعد بنتيجة تفاعل المستخدم
   */
  function _createModal(config, contentHandler, resolveHandler) {
    // التحقق من وجود مودال آخر نشط
    if (activeModal) {
      const err = new Error('مودال آخر نشط. لا يمكن عرض مودال جديد.');
      (dependencies.errorLogger.logWarning || console.warn)?.call(dependencies.errorLogger, {
        message: err.message, origin: 'ModalFactory._createModal'
      });
      return Promise.reject(err);
    }
    
    // دمج الخيارات الافتراضية مع خيارات المستخدم
    const currentOptions = {
      ...defaultModalOptions,
      ...(config.options || {})
    };
    
    // إنشاء هيكل المودال
    const { overlay, modalContent } = _createModalShell();
    
    // إنشاء عنصر العنوان
    const titleElement = document.createElement('h3');
    titleElement.className = 'modal-title';
    titleElement.textContent = config.title || '';
    modalContent.appendChild(titleElement);
    
    // معالج المحتوى
    contentHandler(modalContent);
    
    // إنشاء أزرار التفاعل
    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'modal-actions';
    
    // مصفوفة الأزرار
    const buttons = [];
    
    // معالج الأحداث للزر Esc
    const escapeKeyListener = (event) => {
      if (event.key === 'Escape' && currentOptions.closeOnEscape) {
        _closeActiveModal(false);
      }
    };
    
    // إعداد مثيل المودال
    activeModal = {
      overlayElement: overlay,
      resolvePromise: resolveHandler ? resolveHandler(actionsWrapper) : null,
      escapeKeyListener,
      options: currentOptions
    };
    
    // إضافة مراقب الأحداث للزر Esc
    document.addEventListener('keydown', escapeKeyListener);
    
    // إضافة المودال إلى DOM
    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');
    
    // التركيز على أول زر تفاعلي
    setTimeout(() => {
      const firstButton = actionsWrapper.querySelector('button');
      if (firstButton) {
        firstButton.focus();
      }
    }, 100);
    
    // إرجاع الوعد
    return new Promise((resolve, reject) => {
      activeModal.resolvePromise = (value) => {
        try {
          // إزالة المودال من DOM
          if (overlay && overlay.parentNode) {
            document.body.removeChild(overlay);
          }
          
          // إزالة مراقب الأحداث للزر Esc
          if (escapeKeyListener) {
            document.removeEventListener('keydown', escapeKeyListener);
          }
          
          // تحديث الحالة
          activeModal = null;
          document.body.classList.remove('modal-open');
          
          // حل الوعد
          resolve(value);
        } catch (error) {
          reject(error);
        }
      };
    });
  }

  /**
   * إنشاء مودال تأكيد
   * @param {ModalConfig} config - تكوين المودال
   * @returns {Promise<boolean>} وعد بتفاعل المستخدم
   */
  function showConfirm(config) {
    return _createModal(
      config,
      (modalContent) => {
        // إنشاء عنصر الرسالة
        const messageElement = document.createElement('p');
        messageElement.className = 'modal-message';
        messageElement.innerHTML = config.message || '';
        modalContent.appendChild(messageElement);
        
        // إنشاء عناصر الأزرار
        const actionsWrapper = document.createElement('div');
        actionsWrapper.className = 'modal-actions';
        
        // زر التأكيد
        const confirmButton = document.createElement('button');
        confirmButton.className = `modal-button confirm-button button-primary ${config.theme || 'button-primary-action'}`;
        confirmButton.textContent = config.confirmText || dependencies.localizationService.translate(defaultModalOptions.confirmTextKey);
        confirmButton.onclick = () => _closeActiveModal(true);
        actionsWrapper.appendChild(confirmButton);
        
        // زر الإلغاء
        if (config.showCancelButton !== false) {
          const cancelButton = document.createElement('button');
          cancelButton.className = `modal-button cancel-button button-secondary`;
          cancelButton.textContent = config.cancelText || dependencies.localizationService.translate(defaultModalOptions.cancelTextKey);
          cancelButton.onclick = () => _closeActiveModal(false);
          actionsWrapper.appendChild(cancelButton);
        }
        
        modalContent.appendChild(actionsWrapper);
      },
      (actionsWrapper) => (resolutionValue) => {
        if (config.onClose) {
          try {
            config.onClose(resolutionValue);
          } catch (e) {
            console.warn('[ModalFactory] تحذير في استدعاء onClose:', e);
          }
        }
        return resolutionValue;
      }
    );
  }

  /**
   * إنشاء مودال تنبيه
   * @param {ModalConfig} config - تكوين المودال
   * @returns {Promise<void>} وعد بإغلاق المودال
   */
  function showAlert(config) {
    return _createModal(
      config,
      (modalContent) => {
        // إنشاء عنصر الرسالة
        const messageElement = document.createElement('p');
        messageElement.className = 'modal-message';
        messageElement.innerHTML = config.message || '';
        modalContent.appendChild(messageElement);
        
        // إنشاء زر OK
        const actionsWrapper = document.createElement('div');
        actionsWrapper.className = 'modal-actions single-action';
        
        const okButton = document.createElement('button');
        okButton.className = `modal-button ok-button button-primary ${config.theme || 'button-primary-action'}`;
        okButton.textContent = config.okText || dependencies.localizationService.translate(defaultModalOptions.alertOkTextKey);
        okButton.onclick = () => _closeActiveModal(undefined);
        
        actionsWrapper.appendChild(okButton);
        modalContent.appendChild(actionsWrapper);
      },
      () => (resolutionValue) => {
        if (config.onClose) {
          try {
            config.onClose(resolutionValue);
          } catch (e) {
            console.warn('[ModalFactory] تحذير في استدعاء onClose:', e);
          }
        }
        return resolutionValue;
      }
    );
  }

  /**
   * إنشاء مودال إدخال
   * @param {ModalConfig} config - تكوين المودال
   * @returns {Promise<string | null>} وعد بالقيمة المدخلة أو null في حالة الإلغاء
   */
  function showPrompt(config) {
    return _createModal(
      config,
      (modalContent) => {
        // إنشاء عنصر الرسالة
        const messageElement = document.createElement('p');
        messageElement.className = 'modal-message';
        messageElement.innerHTML = config.message || '';
        modalContent.appendChild(messageElement);
        
        // إنشاء حقل الإدخال
        const inputElement = document.createElement('input');
        inputElement.type = config.inputType || 'text';
        inputElement.className = 'modal-input';
        inputElement.placeholder = config.placeholder || '';
        inputElement.value = config.defaultValue || '';
        
        if (config.inputId) {
          inputElement.id = config.inputId;
        }
        
        modalContent.appendChild(inputElement);
        
        // إنشاء عناصر الأزرار
        const actionsWrapper = document.createElement('div');
        actionsWrapper.className = 'modal-actions';
        
        // زر التأكيد
        const confirmButton = document.createElement('button');
        confirmButton.className = `modal-button confirm-button button-primary ${config.theme || 'button-primary-action'}`;
        confirmButton.textContent = config.confirmText || dependencies.localizationService.translate(defaultModalOptions.confirmTextKey);
        confirmButton.onclick = () => {
          const value = inputElement.value.trim();
          
          // التحقق من صحة الإدخال إن وجدت
          if (config.validationFunction && !config.validationFunction(value)) {
            if (config.validationMessage) {
              dependencies.errorLogger.logWarning(config.validationMessage, 'Validation failed');
            }
            return;
          }
          
          _closeActiveModal(value || null);
        };
        actionsWrapper.appendChild(confirmButton);
        
        // زر الإلغاء
        if (config.showCancelButton !== false) {
          const cancelButton = document.createElement('button');
          cancelButton.className = 'modal-button cancel-button button-secondary';
          cancelButton.textContent = config.cancelText || dependencies.localizationService.translate(defaultModalOptions.cancelTextKey);
          cancelButton.onclick = () => _closeActiveModal(null);
          actionsWrapper.appendChild(cancelButton);
        }
        
        modalContent.appendChild(actionsWrapper);
      },
      (actionsWrapper) => (resolutionValue) => {
        if (config.onClose) {
          try {
            config.onClose(resolutionValue);
          } catch (e) {
            console.warn('[ModalFactory] تحذير في استدعاء onClose:', e);
          }
        }
        return resolutionValue;
      }
    );
  }

  /**
   * إنشاء مودال تفاعل مع أزرار مخصصة
   * @param {ModalConfig} config - تكوين المودال
   * @returns {Promise<*>} وعد بتفاعل المستخدم مع أحد الأزرار
   */
  function showCustomModal(config) {
    return _createModal(
      config,
      (modalContent) => {
        // إنشاء عنصر الرسالة
        const messageElement = document.createElement('p');
        messageElement.className = 'modal-message';
        messageElement.innerHTML = config.message || '';
        modalContent.appendChild(messageElement);
        
        // إنشاء عناصر الأزرار
        const actionsWrapper = document.createElement('div');
        actionsWrapper.className = 'modal-actions';
        
        // إنشاء الأزرار المخصصة
        if (Array.isArray(config.customButtons)) {
          config.customButtons.forEach(buttonConfig => {
            const button = document.createElement('button');
            button.className = `modal-button ${buttonConfig.className || ''}`;
            button.textContent = buttonConfig.text;
            button.onclick = () => {
              try {
                if (buttonConfig.action) {
                  const result = buttonConfig.action();
                  _closeActiveModal(result !== undefined ? result : true);
                } else {
                  _closeActiveModal(true);
                }
              } catch (e) {
                _closeActiveModal(false);
              }
            };
            actionsWrapper.appendChild(button);
          });
        }
        
        modalContent.appendChild(actionsWrapper);
      },
      (actionsWrapper) => (resolutionValue) => {
        if (config.onClose) {
          try {
            config.onClose(resolutionValue);
          } catch (e) {
            console.warn('[ModalFactory] تحذير في استدعاء onClose:', e);
          }
        }
        return resolutionValue;
      }
    );
  }

  /**
   * إنشاء مودال تحميل
   * @param {ModalConfig} config - تكوين المودال
   * @returns {Promise<void>} وعد بإغلاق المودال
   */
  function showLoading(config) {
    return _createModal(
      config,
      (modalContent) => {
        // عنصر الرسالة
        const messageElement = document.createElement('p');
        messageElement.className = 'modal-message';
        messageElement.innerHTML = config.message || 'جار التحميل...';
        modalContent.appendChild(messageElement);
        
        // عنصر التحميل
        const spinner = document.createElement('div');
        spinner.className = 'modal-spinner';
        spinner.innerHTML = '<div class="spinner"></div>';
        modalContent.appendChild(spinner);
      },
      () => (resolutionValue) => resolutionValue
    );
  }

  /**
   * إنشاء مودال نجاح
   * @param {ModalConfig} config - تكوين المودال
   * @returns {Promise<void>} وعد بإغلاق المودال
   */
  function showSuccess(config) {
    config.theme = 'button-success';
    return showCustomModal({
      ...config,
      customButtons: [
        {
          text: config.okText || dependencies.localizationService.translate('button.ok'),
          className: 'button-success',
          action: () => true
        }
      ]
    });
  }

  /**
   * إنشاء مودال خطأ
   * @param {ModalConfig} config - تكوين المودال
   * @returns {Promise<void>} وعد بإغلاق المودال
   */
  function showErrorMessage(config) {
    config.theme = 'button-danger';
    return showCustomModal({
      ...config,
      customButtons: [
        {
          text: config.okText || dependencies.localizationService.translate('button.ok'),
          className: 'button-danger',
          action: () => true
        }
      ]
    });
  }

  /**
   * إنشاء مودال تأكيد مع تحقق من صحة الإدخال
   * @param {ModalConfig} config - تكوين المودال
   * @returns {Promise<string | null>} وعد بالقيمة المدخلة أو null في حالة الإلغاء
   */
  function showValidatedPrompt(config) {
    return _createModal(
      config,
      (modalContent) => {
        // عنصر الرسالة
        const messageElement = document.createElement('p');
        messageElement.className = 'modal-message';
        messageElement.innerHTML = config.message || '';
        modalContent.appendChild(messageElement);
        
        // حقل الإدخال
        const inputElement = document.createElement('input');
        inputElement.type = config.inputType || 'text';
        inputElement.className = 'modal-input';
        inputElement.placeholder = config.placeholder || '';
        inputElement.value = config.defaultValue || '';
        
        if (config.inputId) {
          inputElement.id = config.inputId;
        }
        
        modalContent.appendChild(inputElement);
        
        // رسالة التحقق من صحة الإدخال
        const validationMessage = document.createElement('div');
        validationMessage.className = 'modal-validation-message';
        validationMessage.style.display = 'none';
        validationMessage.textContent = config.validationMessage || 'القيمة المدخلة غير صالحة.';
        modalContent.appendChild(validationMessage);
        
        // عناصر الأزرار
        const actionsWrapper = document.createElement('div');
        actionsWrapper.className = 'modal-actions';
        
        // زر التأكيد
        const confirmButton = document.createElement('button');
        confirmButton.className = `modal-button confirm-button button-primary ${config.theme || 'button-primary-action'}`;
        confirmButton.textContent = config.confirmText || dependencies.localizationService.translate('button.confirm');
        confirmButton.onclick = () => {
          const value = inputElement.value.trim();
          
          // التحقق من صحة الإدخال
          if (config.validationFunction && !config.validationFunction(value)) {
            validationMessage.style.display = 'block';
            inputElement.focus();
            return;
          }
          
          _closeActiveModal(value || null);
        };
        actionsWrapper.appendChild(confirmButton);
        
        // زر الإلغاء
        if (config.showCancelButton !== false) {
          const cancelButton = document.createElement('button');
          cancelButton.className = 'modal-button cancel-button button-secondary';
          cancelButton.textContent = config.cancelText || dependencies.localizationService.translate('button.cancel');
          cancelButton.onclick = () => _closeActiveModal(null);
          actionsWrapper.appendChild(cancelButton);
        }
        
        modalContent.appendChild(actionsWrapper);
      },
      (actionsWrapper) => (resolutionValue) => {
        if (config.onClose) {
          try {
            config.onClose(resolutionValue);
          } catch (e) {
            console.warn('[ModalFactory] تحذير في استدعاء onClose:', e);
          }
        }
        return resolutionValue;
      }
    );
  }

  /**
   * إنشاء مودال مع محتوى مخصص
   * @param {ModalConfig} config - تكوين المودال
   * @param {function(HTMLElement): void} customContentHandler - وظيفة لتعديل محتوى المودال
   * @returns {Promise<*>} وعد بتفاعل المستخدم
   */
  function showCustom(config, customContentHandler) {
    return _createModal(
      config,
      (modalContent) => {
        // معالج محتوى مخصص
        if (typeof customContentHandler === 'function') {
          customContentHandler(modalContent);
        }
      },
      (actionsWrapper) => (resolutionValue) => {
        if (config.onClose) {
          try {
            config.onClose(resolutionValue);
          } catch (e) {
            console.warn('[ModalFactory] تحذير في استدعاء onClose:', e);
          }
        }
        return resolutionValue;
      }
    );
  }

  /**
   * إنشاء مودال مع رابط
   * @param {ModalConfig} config - تكوين المودال
   * @param {string} linkText - نص الرابط
   * @param {string} linkUrl - رابط المودال
   * @param {string} [linkTarget='_blank'] - هدف الرابط
   * @returns {Promise<boolean>} وعد بتفاعل المستخدم
   */
  function showLinkModal(config, linkText, linkUrl, linkTarget = '_blank') {
    return showCustom(config, (modalContent) => {
      // إنشاء عنصر الرابط
      const linkElement = document.createElement('a');
      linkElement.href = linkUrl;
      linkElement.target = linkTarget;
      linkElement.textContent = linkText;
      linkElement.className = 'modal-link';
      
      // إنشاء عنصر الرسالة
      const messageElement = document.createElement('p');
      messageElement.className = 'modal-message';
      messageElement.innerHTML = config.message || '';
      modalContent.appendChild(messageElement);
      
      // إضافة الرابط
      modalContent.appendChild(linkElement);
    });
  }

  /**
   * إنشاء مودال مع صورة
   * @param {ModalConfig} config - تكوين المودال
   * @param {string} imageUrl - رابط الصورة
   * @param {string} [altText='مودال صورة'] - نص البديل للصورة
   * @param {number} [width] - عرض الصورة
   * @param {number} [height] - ارتفاع الصورة
   * @returns {Promise<void>} وعد بإغلاق المودال
   */
  function showImageModal(config, imageUrl, altText = 'مودال صورة', width, height) {
    return showCustom(config, (modalContent) => {
      // إنشاء عنصر الصورة
      const imageElement = document.createElement('img');
      imageElement.src = imageUrl;
      imageElement.alt = altText;
      imageElement.className = 'modal-image';
      
      if (width) imageElement.width = width;
      if (height) imageElement.height = height;
      
      // إنشاء عنصر الرسالة
      const messageElement = document.createElement('p');
      messageElement.className = 'modal-message';
      messageElement.innerHTML = config.message || '';
      modalContent.appendChild(messageElement);
      
      // إضافة الصورة
      modalContent.appendChild(imageElement);
    });
  }

  /**
   * إنشاء مودال مع فيديو
   * @param {ModalConfig} config - تكوين المودال
   * @param {string} videoUrl - رابط الفيديو
   * @param {string} [videoType='video/mp4'] - نوع الفيديو
   * @param {number} [width] - عرض الفيديو
   * @param {number} [height] - ارتفاع الفيديو
   * @returns {Promise<void>} وعد بإغلاق المودال
   */
  function showVideoModal(config, videoUrl, videoType = 'video/mp4', width, height) {
    return showCustom(config, (modalContent) => {
      // إنشاء عنصر الفيديو
      const videoElement = document.createElement('video');
      videoElement.src = videoUrl;
      videoElement.type = videoType;
      videoElement.controls = true;
      videoElement.className = 'modal-video';
      
      if (width) videoElement.width = width;
      if (height) videoElement.height = height;
      
      // إنشاء عنصر الرسالة
      const messageElement = document.createElement('p');
      messageElement.className = 'modal-message';
      messageElement.innerHTML = config.message || '';
      modalContent.appendChild(messageElement);
      
      // إضافة الفيديو
      modalContent.appendChild(videoElement);
    });
  }

  /**
   * إنشاء مودال مع نموذج
   * @param {ModalConfig} config - تكوين المودال
   * @param {function(HTMLElement): void} formHandler - وظيفة لإنشاء النموذج
   * @param {function(Object): boolean} validationHandler - وظيفة التحقق من صحة النموذج
   * @param {string} [validationMessage='الرجاء ملء الحقول المطلوبة.'] - رسالة التحقق من صحة النموذج
   * @returns {Promise<Object | null>} وعد بنتائج النموذج أو null في حالة الإلغاء
   */
  function showFormModal(config, formHandler, validationHandler, validationMessage = 'الرجاء ملء الحقول المطلوبة.') {
    return _createModal(
      config,
      (modalContent) => {
        // معالج النموذج
        if (typeof formHandler === 'function') {
          formHandler(modalContent);
        }
        
        // رسالة التحقق من صحة النموذج
        const validationMessageElement = document.createElement('div');
        validationMessageElement.className = 'modal-validation-message';
        validationMessageElement.style.display = 'none';
        validationMessageElement.textContent = validationMessage;
        modalContent.appendChild(validationMessageElement);
        
        // إنشاء عناصر الأزرار
        const actionsWrapper = document.createElement('div');
        actionsWrapper.className = 'modal-actions';
        
        // زر التأكيد
        const confirmButton = document.createElement('button');
        confirmButton.className = `modal-button confirm-button button-primary ${config.theme || 'button-primary-action'}`;
        confirmButton.textContent = config.confirmText || dependencies.localizationService.translate('button.confirm');
        confirmButton.onclick = () => {
          // التحقق من صحة النموذج
          if (typeof validationHandler === 'function') {
            const formData = {};
            const inputs = modalContent.querySelectorAll('input, select, textarea');
            
            inputs.forEach(input => {
              formData[input.name] = input.value;
            });
            
            if (!validationHandler(formData)) {
              validationMessageElement.style.display = 'block';
              return;
            }
          }
          
          _closeActiveModal(formData);
        };
        actionsWrapper.appendChild(confirmButton);
        
        // زر الإلغاء
        if (config.showCancelButton !== false) {
          const cancelButton = document.createElement('button');
          cancelButton.className = 'modal-button cancel-button button-secondary';
          cancelButton.textContent = config.cancelText || dependencies.localizationService.translate('button.cancel');
          cancelButton.onclick = () => _closeActiveModal(null);
          actionsWrapper.appendChild(cancelButton);
        }
        
        modalContent.appendChild(actionsWrapper);
      },
      (actionsWrapper) => (resolutionValue) => {
        if (config.onClose) {
          try {
            config.onClose(resolutionValue);
          } catch (e) {
            console.warn('[ModalFactory] تحذير في استدعاء onClose:', e);
          }
        }
        return resolutionValue;
      }
    );
  }

  /**
   * إنشاء مودال مع تحقق من صحة الإدخال التلقائي
   * @param {ModalConfig} config - تكوين المودال
   * @param {string} inputId - معرف حقل الإدخال
   * @param {function(string): boolean} validationFunction - وظيفة التحقق من صحة الإدخال
   * @param {string} validationMessage - رسالة التحقق من صحة الإدخال
   * @returns {Promise<string | null>} وعد بالقيمة المدخلة أو null في حالة الإلغاء
   */
  function showAutoValidatePrompt(config, inputId, validationFunction, validationMessage) {
    return _createModal(
      config,
      (modalContent) => {
        // عنصر الرسالة
        const messageElement = document.createElement('p');
        messageElement.className = 'modal-message';
        messageElement.innerHTML = config.message || '';
        modalContent.appendChild(messageElement);
        
        // حقل الإدخال
        const inputElement = document.createElement('input');
        inputElement.type = config.inputType || 'text';
        inputElement.className = 'modal-input';
        inputElement.placeholder = config.placeholder || '';
        inputElement.value = config.defaultValue || '';
        inputElement.id = inputId;
        
        modalContent.appendChild(inputElement);
        
        // رسالة التحقق من صحة الإدخال
        const validationMessageElement = document.createElement('div');
        validationMessageElement.className = 'modal-validation-message';
        validationMessageElement.style.display = 'none';
        validationMessageElement.textContent = validationMessage || 'القيمة المدخلة غير صالحة.';
        modalContent.appendChild(validationMessageElement);
        
        // معالج الإدخال
        inputElement.addEventListener('input', () => {
          const value = inputElement.value.trim();
          
          if (validationFunction(value)) {
            validationMessageElement.style.display = 'none';
          } else {
            validationMessageElement.style.display = 'block';
          }
        });
        
        // عناصر الأزرار
        const actionsWrapper = document.createElement('div');
        actionsWrapper.className = 'modal-actions';
        
        // زر التأكيد
        const confirmButton = document.createElement('button');
        confirmButton.className = `modal-button confirm-button button-primary ${config.theme || 'button-primary-action'}`;
        confirmButton.textContent = config.confirmText || dependencies.localizationService.translate('button.confirm');
        confirmButton.onclick = () => {
          const value = inputElement.value.trim();
          
          // التحقق من صحة الإدخال
          if (!validationFunction(value)) {
            validationMessageElement.style.display = 'block';
            inputElement.focus();
            return;
          }
          
          _closeActiveModal(value || null);
        };
        actionsWrapper.appendChild(confirmButton);
        
        // زر الإلغاء
        if (config.showCancelButton !== false) {
          const cancelButton = document.createElement('button');
          cancelButton.className = 'modal-button cancel-button button-secondary';
          cancelButton.textContent = config.cancelText || dependencies.localizationService.translate('button.cancel');
          cancelButton.onclick = () => _closeActiveModal(null);
          actionsWrapper.appendChild(cancelButton);
        }
        
        modalContent.appendChild(actionsWrapper);
      },
      (actionsWrapper) => (resolutionValue) => {
        if (config.onClose) {
          try {
            config.onClose(resolutionValue);
          } catch (e) {
            console.warn('[ModalFactory] تحذير في استدعاء onClose:', e);
          }
        }
        return resolutionValue;
      }
    );
  }

  /**
   * إنشاء مودال مع رابط تفاعلي
   * @param {ModalConfig} config - تكوين المودال
   * @param {string} linkText - نص الرابط
   * @param {string} linkUrl - رابط المودال
   * @param {string} [linkTarget='_blank'] - هدف الرابط
   * @returns {Promise<void>} وعد بإغلاق المودال
   */
  function showActionLinkModal(config, linkText, linkUrl, linkTarget = '_blank') {
    return showCustom(config, (modalContent) => {
      // إنشاء عنصر الرابط
      const linkElement = document.createElement('a');
      linkElement.href = linkUrl;
      linkElement.target = linkTarget;
      linkElement.textContent = linkText;
      linkElement.className = 'modal-link';
      
      // إنشاء عنصر الرسالة
      const messageElement = document.createElement('p');
      messageElement.className = 'modal-message';
      messageElement.innerHTML = config.message || '';
      modalContent.appendChild(messageElement);
      
      // إضافة الرابط
      modalContent.appendChild(linkElement);
    });
  }

  /**
   * إنشاء مودال مع زر إغلاق فقط
   * @param {ModalConfig} config - تكوين المودال
   * @returns {Promise<void>} وعد بإغلاق المودال
   */
  function showCloseableModal(config) {
    return showCustom(config, (modalContent) => {
      // إنشاء عنصر الرسالة
      const messageElement = document.createElement('p');
      messageElement.className = 'modal-message';
      messageElement.innerHTML = config.message || '';
      modalContent.appendChild(messageElement);
      
      // زر الإغلاق
      const closeButton = document.createElement('button');
      closeButton.className = 'modal-button close-button button-secondary';
      closeButton.textContent = config.closeText || dependencies.localizationService.translate('button.close');
      closeButton.onclick = () => _closeActiveModal(undefined);
      modalContent.appendChild(closeButton);
    });
  }

  /**
   * إنشاء مودال مع زر مشار إليه
   * @param {ModalConfig} config - تكوين المودال
   * @param {string} buttonText - نص الزر
   * @param {function(): void} buttonAction - وظيفة الزر
   * @param {string} [buttonClass='button-primary-action'] - فئة الزر
   * @returns {Promise<*>} وعد بتفاعل المستخدم
   */
  function showActionButtonModal(config, buttonText, buttonAction, buttonClass = 'button-primary-action') {
    return showCustom(config, (modalContent) => {
      // إنشاء عنصر الرسالة
      const messageElement = document.createElement('p');
      messageElement.className = 'modal-message';
      messageElement.innerHTML = config.message || '';
      modalContent.appendChild(messageElement);
      
      // زر التفاعل
      const actionButton = document.createElement('button');
      actionButton.className = `modal-button action-button ${buttonClass}`;
      actionButton.textContent = buttonText;
      actionButton.onclick = () => {
        try {
          const result = buttonAction();
          _closeActiveModal(result !== undefined ? result : true);
        } catch (e) {
          _closeActiveModal(false);
        }
      };
      modalContent.appendChild(actionButton);
    });
  }

  /**
   * إنشاء مودال مع زرين تفاعليين
   * @param {ModalConfig} config - تكوين المودال
   * @param {string} primaryButtonText - نص الزر الأول
   * @param {function(): void} primaryButtonAction - وظيفة الزر الأول
   * @param {string} secondaryButtonText - نص الزر الثاني
   * @param {function(): void} secondaryButtonAction - وظيفة الزر الثاني
   * @param {string} [primaryButtonClass='button-primary-action'] - فئة الزر الأول
   * @param {string} [secondaryButtonClass='button-secondary-action'] - فئة الزر الثاني
   * @returns {Promise<*>} وعد بتفاعل المستخدم
   */
  function showTwoActionButtonsModal(config, primaryButtonText, primaryButtonAction, secondaryButtonText, secondaryButtonAction, primaryButtonClass = 'button-primary-action', secondaryButtonClass = 'button-secondary-action') {
    return showCustom(config, (modalContent) => {
      // إنشاء عنصر الرسالة
      const messageElement = document.createElement('p');
      messageElement.className = 'modal-message';
      messageElement.innerHTML = config.message || '';
      modalContent.appendChild(messageElement);
      
      // عناصر الأزرار
      const actionsWrapper = document.createElement('div');
      actionsWrapper.className = 'modal-actions';
      
      // زر التفاعل الأول
      const primaryButton = document.createElement('button');
      primaryButton.className = `modal-button primary-button ${primaryButtonClass}`;
      primaryButton.textContent = primaryButtonText;
      primaryButton.onclick = () => {
        try {
          const result = primaryButtonAction();
          _closeActiveModal(result !== undefined ? result : true);
        } catch (e) {
          _closeActiveModal(false);
        }
      };
      actionsWrapper.appendChild(primaryButton);
      
      // زر التفاعل الثاني
      const secondaryButton = document.createElement('button');
      secondaryButton.className = `modal-button secondary-button ${secondaryButtonClass}`;
      secondaryButton.textContent = secondaryButtonText;
      secondaryButton.onclick = () => {
        try {
          const result = secondaryButtonAction();
          _closeActiveModal(result !== undefined ? result : false);
        } catch (e) {
          _closeActiveModal(false);
        }
      };
      actionsWrapper.appendChild(secondaryButton);
      
      modalContent.appendChild(actionsWrapper);
    });
  }

  /**
   * إنشاء مودال مع زر إغلاق فقط
   * @param {ModalConfig} config - تكوين المودال
   * @returns {Promise<void>} وعد بإغلاق المودال
   */
  function showCloseableModal(config) {
    return showCustom(config, (modalContent) => {
      // إنشاء عنصر الرسالة
      const messageElement = document.createElement('p');
      messageElement.className = 'modal-message';
      messageElement.innerHTML = config.message || '';
      modalContent.appendChild(messageElement);
      
      // زر الإغلاق
      const closeButton = document.createElement('button');
      closeButton.className = 'modal-button close-button button-secondary';
      closeButton.textContent = config.closeText || dependencies.localizationService.translate('button.close');
      closeButton.onclick = () => _closeActiveModal(undefined);
      modalContent.appendChild(closeButton);
    });
  }

  /**
   * إنشاء مودال مع زر إغلاق فقط
   * @param {ModalConfig} config - تكوين المودال
   * @param {string} buttonText - نص الزر
   * @param {function(): void} buttonAction - وظيفة الزر
   * @param {string} [buttonClass='button-primary-action'] - فئة الزر
   * @returns {Promise<*>} وعد بتفاعل المستخدم
   */
  function showActionCloseableModal(config, buttonText, buttonAction, buttonClass = 'button-primary-action') {
    return showCustom(config, (modalContent) => {
      // إنشاء عنصر الرسالة
      const messageElement = document.createElement('p');
      messageElement.className = 'modal-message';
      messageElement.innerHTML = config.message || '';
      modalContent.appendChild(messageElement);
      
      // زر التفاعل
      const actionButton = document.createElement('button');
      actionButton.className = `modal-button action-button ${buttonClass}`;
      actionButton.textContent = buttonText;
      actionButton.onclick = () => {
        try {
          const result = buttonAction();
          _closeActiveModal(result !== undefined ? result : true);
        } catch (e) {
          _closeActiveModal(false);
        }
      };
      modalContent.appendChild(actionButton);
      
      // زر الإغلاق
      const closeButton = document.createElement('button');
      closeButton.className = 'modal-button close-button button-secondary';
      closeButton.textContent = config.closeText || dependencies.localizationService.translate('button.close');
      closeButton.onclick = () => _closeActiveModal(undefined);
      modalContent.appendChild(closeButton);
    });
  }

  /**
   * إنشاء مودال مع زر إغلاق فقط
   * @param {ModalConfig} config - تكوين المودال
   * @returns {Promise<void>} وعد بإغلاق المودال
   */
  function showInfoModal(config) {
    return showCustom(config, (modalContent) => {
      // إنشاء عنصر الرسالة
      const messageElement = document.createElement('p');
      messageElement.className = 'modal-message';
      messageElement.innerHTML = config.message || '';
      modalContent.appendChild(messageElement);
      
      // زر الإغلاق
      const closeButton = document.createElement('button');
      closeButton.className = 'modal-button close-button button-secondary';
      closeButton.textContent = config.closeText || dependencies.localizationService.translate('button.close');
      closeButton.onclick = () => _closeActiveModal(undefined);
      modalContent.appendChild(closeButton);
    });
  }

  /**
   * إنشاء مودال مع زر إغلاق فقط
   * @param {ModalConfig} config - تكوين المودال
   * @param {string} primaryButtonText - نص الزر الأول
   * @param {function(): void} primaryButtonAction - وظيفة الزر الأول
   * @param {string} secondaryButtonText - نص الزر الثاني
   * @param {function(): void} secondaryButtonAction - وظيفة الزر الثاني
   * @param {string} [primaryButtonClass='button-primary-action'] - فئة الزر الأول
   * @param {string} [secondaryButtonClass='button-secondary-action'] - فئة الزر الثاني
   * @returns {Promise<*>} وعد بتفاعل المستخدم
   */
  function showTwoActionButtonsModal(config, primaryButtonText, primaryButtonAction, secondaryButtonText, secondaryButtonAction, primaryButtonClass = 'button-primary-action', secondaryButtonClass = 'button-secondary-action') {
    return showCustom(config, (modalContent) => {
      // إنشاء عنصر الرسالة
      const messageElement = document.createElement('p');
      messageElement.className = 'modal-message';
      messageElement.innerHTML = config.message || '';
      modalContent.appendChild(messageElement);
      
      // عناصر الأزرار
      const actionsWrapper = document.createElement('div');
      actionsWrapper.className = 'modal-actions';
      
      // زر التفاعل الأول
      const primaryButton = document.createElement('button');
      primaryButton.className = `modal-button primary-button ${primaryButtonClass}`;
      primaryButton.textContent = primaryButtonText;
      primaryButton.onclick = () => {
        try {
          const result = primaryButtonAction();
          _closeActiveModal(result !== undefined ? result : true);
        } catch (e) {
          _closeActiveModal(false);
        }
      };
      actionsWrapper.appendChild(primaryButton);
      
      // زر التفاعل الثاني
      const secondaryButton = document.createElement('button');
      secondaryButton.className = `modal-button secondary-button ${secondaryButtonClass}`;
      secondaryButton.textContent = secondaryButtonText;
      secondaryButton.onclick = () => {
        try {
          const result = secondaryButtonAction();
          _closeActiveModal(result !== undefined ? result : false);
        } catch (e) {
          _closeActiveModal(false);
        }
      };
      actionsWrapper.appendChild(secondaryButton);
      
      modalContent.appendChild(actionsWrapper);
    });
  }

  /**
   * إنشاء مودال مع رابط تفاعلي
   * @param {ModalConfig} config - تكوين المودال
   * @param {string} linkText - نص الرابط
   * @param {string} linkUrl - رابط المودال
   * @param {string} [linkTarget='_blank'] - هدف الرابط
   * @returns {Promise<void>} وعد بإغلاق المودال
   */
  function showActionLinkModal(config, linkText, linkUrl, linkTarget = '_blank') {
    return showCustom(config, (modalContent) => {
      // إنشاء عنصر الرابط
      const linkElement = document.createElement('a');
      linkElement.href = linkUrl;
      linkElement.target = linkTarget;
      linkElement.textContent = linkText;
      linkElement.className = 'modal-link';
      
      // إنشاء عنصر الرسالة
      const messageElement = document.createElement('p');
      messageElement.className = 'modal-message';
      messageElement.innerHTML = config.message || '';
      modalContent.appendChild(messageElement);
      
      // إضافة الرابط
      modalContent.appendChild(linkElement);
    });
  }

  /**
   * إنشاء مودال مع زر إغلاق فقط
   * @param {ModalConfig} config - تكوين المودال
   * @returns {Promise<void>} وعد بإغلاق المودال
   */
  function showCloseableModal(config) {
    return showCustom(config, (modalContent) => {
      // إنشاء عنصر الرسالة
      const messageElement = document.createElement('p');
      messageElement.className = 'modal-message';
      messageElement.innerHTML = config.message || '';
      modalContent.appendChild(messageElement);
      
      // زر الإغلاق
      const closeButton = document.createElement('button');
      closeButton.className = 'modal-button close-button button-secondary';
      closeButton.textContent = config.closeText || dependencies.localizationService.translate('button.close');
      closeButton.onclick = () => _closeActiveModal(undefined);
      modalContent.appendChild(closeButton);
    });
  }

  /**
   * إنشاء مودال مع زر مخصص
   * @param {ModalConfig} config - تكوين المودال
   * @param {string} buttonText - نص الزر
   * @param {function(): void} buttonAction - وظيفة الزر
   * @param {string} [buttonClass='button-primary-action'] - فئة الزر
   * @returns {Promise<*>} وعد بتفاعل المستخدم
   */
  function showActionModal(config, buttonText, buttonAction, buttonClass = 'button-primary-action') {
    return showCustom(config, (modalContent) => {
      // إنشاء عنصر الرسالة
      const messageElement = document.createElement('p');
      messageElement.className = 'modal-message';
      messageElement.innerHTML = config.message || '';
      modalContent.appendChild(messageElement);
      
      // زر التفاعل
      const actionButton = document.createElement('button');
      actionButton.className = `modal-button action-button ${buttonClass}`;
      actionButton.textContent = buttonText;
      actionButton.onclick = () => {
        try {
          const result = buttonAction();
          _closeActiveModal(result !== undefined ? result : true);
        } catch (e) {
          _closeActiveModal(false);
        }
      };
      modalContent.appendChild(actionButton);
    });
  }

  /**
   * إنشاء مودال مع زر مخصص
   * @param {ModalConfig} config - تكوين المودال
   * @param {string} buttonText - نص الزر
   * @param {function(): void} buttonAction - وظيفة الزر
   * @param {string} [buttonClass='button-primary-action'] - فئة الزر
   * @returns {Promise<*>} وعد بتفاعل المستخدم
   */
  function showActionModal(config, buttonText, buttonAction, buttonClass = 'button-primary-action') {
    return showCustom(config, (modalContent) => {
      // إنشاء عنصر الرسالة
      const messageElement = document.createElement('p');
      messageElement.className = 'modal-message';
      messageElement.innerHTML = config.message || '';
      modalContent.appendChild(messageElement);
      
      // زر التفاعل
      const actionButton = document.createElement('button');
      actionButton.className = `modal-button action-button ${buttonClass}`;
      actionButton.textContent = buttonText;
      actionButton.onclick = () => {
        try {
          const result = buttonAction();
          _closeActiveModal(result !== undefined ? result : true);
        } catch (e) {
          _closeActiveModal(false);
        }
      };
      modalContent.appendChild(actionButton);
    });
  }

  /**
   * إنشاء مودال مع زر إغلاق فقط
   * @param {ModalConfig} config - تكوين المودال
   * @returns {Promise<void>} وعد بإغلاق المودال
   */
  function showCloseableModal(config) {
    return showCustom(config, (modalContent) => {
      // إنشاء عنصر الرسالة
      const messageElement = document.createElement('p');
      messageElement.className = 'modal-message';
      messageElement.innerHTML = config.message || '';
      modalContent.appendChild(messageElement);
      
      // زر الإغلاق
      const closeButton = document.createElement('button');
      closeButton.className = 'modal-button close-button button-secondary';
      closeButton.textContent = config.closeText || dependencies.localizationService.translate('button.close');
      closeButton.onclick = () => _closeActiveModal(undefined);
      modalContent.appendChild(closeButton);
    });
  }

  /**
   * تعيين التبعيات
   * @private
   * @param {ModalDependencies} injectedDeps - التبعيات المُدخلة
   */
  function _setDependencies(injectedDeps) {
    if (injectedDeps.errorLogger) dependencies.errorLogger = injectedDeps.errorLogger;
    if (injectedDeps.localizationService) dependencies.localizationService = injectedDeps.localizationService;
  }

  /**
   * التحقق مما إذا كان هناك مودال نشط
   * @returns {boolean} true إذا كان هناك مودال نشط
   */
  function isModalActive() {
    return !!activeModal;
  }

  /**
   * إغلاق المودال النشط ببرمجة
   * @param {*} resolveValue - القيمة التي يتم حل الوعد بها
   * @returns {boolean} true إذا تمت العملية بنجاح
   */
  function closeActiveModal(resolveValue) {
    if (isModalActive()) {
      _closeActiveModal(resolveValue);
      return true;
    }
    return false;
  }

  /**
   * الخيارات الافتراضية للمودال
   * @type {ModalOptions}
   */
  const defaultModalOptions = {
    closeOnEscape: true,
    closeOnOverlayClick: true,
    confirmTextKey: 'button.confirm',
    cancelTextKey: 'button.cancel',
    alertOkTextKey: 'button.ok'
  };

  return {
    _setDependencies,
    showConfirm,
    showAlert,
    showPrompt,
    showCustom,
    showLoading,
    showSuccess,
    showErrorMessage,
    showValidatedPrompt,
    showTwoActionButtonsModal,
    showActionLinkModal,
    showCloseableModal,
    showActionModal,
    isModalActive,
    closeActiveModal
  };
})();

/**
 * تهيئة مصنع المودال
 * @param {Object} dependencies - التبعيات (errorLogger, localizationService)
 */
export function initializeModalFactory(dependencies = {}) {
  try {
    console.info('[ModalFactory] تم تهيئته بنجاح');
    
    // جعل المودالات متاحة عالميًا لتسهيل التصحيح
    if (typeof window !== 'undefined' && 
        (typeof process === 'undefined' || process.env.NODE_ENV === 'development')) {
      window.modalFactory = {
        ...modalFactory
      };
    }
    
    // تعيين التبعيات
    if (dependencies.errorLogger || dependencies.localizationService) {
      modalFactory._setDependencies({
        errorLogger: dependencies.errorLogger || console,
        localizationService: dependencies.localizationService || { translate: (key) => key }
      });
    }
    
    return {
      ...modalFactory
    };
  } catch (error) {
    console.error('[ModalFactory] فشل في التهيئة:', error);
    return {};
  }
}

export default modalFactory;
