/**
 * @fileoverview وحدة تهيئة الوحدات الأساسية للتطبيق مع إدارة متقدمة للتبعيات
 * @module module-bootstrap
 */

/**
 * وحدة تهيئة الوحدات الأساسية للتطبيق مع إدارة التبعيات
 */
const moduleBootstrap = {
  /**
   * يُهيئ جميع الوحدات المسجلة استنادًا إلى التكوينات المقدمة
   * @param {Object} coreServices - كائن يحتوي على الخدمات الأساسية للتطبيق
   * @param {ModuleConfig[]} moduleConfigs - مصفوفة من تكوينات الوحدات
   * @returns {Promise<void>}
   */
  async initializeAllModules(coreServices, moduleConfigs = []) {
    // التأكد من توفر خدمة تسجيل الأخطاء
    const errorLogger = coreServices.errorLogger || console;
    
    // التأكد من صحة المدخلات
    if (!coreServices || typeof coreServices !== 'object') {
      this._logError(errorLogger, {
        message: 'الخدمات الأساسية غير معرفة أو غير صحيحة',
        origin: 'moduleBootstrap.initializeAllModules',
        severity: 'critical'
      });
      return;
    }

    if (!Array.isArray(moduleConfigs)) {
      this._logError(errorLogger, {
        message: 'تكوينات الوحدات يجب أن تكون مصفوفة',
        origin: 'moduleBootstrap.initializeAllModules',
        severity: 'critical'
      });
      return;
    }

    // إعداد الخدمات المتوفرة
    const availableServicesAndInstances = { ...coreServices };
    
    // تسجيل بدء تهيئة الوحدات
    this._logDebug(errorLogger, '[ModuleBootstrap] Starting initialization of all configured modules...');

    // معالجة كل وحدة على حدة
    for (const moduleConfig of moduleConfigs) {
      try {
        // التحقق من صحة تكوين الوحدة
        if (!this._isValidModuleConfig(moduleConfig)) {
          this._logWarning(errorLogger, {
            message: `تكوين الوحدة غير صالح، سيتم تجاوزه`,
            origin: 'moduleBootstrap.validateModuleConfig',
            context: { receivedConfig: moduleConfig }
          });
          continue;
        }

        const { name, initFn, dependencies = [], provides } = moduleConfig;
        
        this._logDebug(errorLogger, `[ModuleBootstrap] Preparing to initialize module: "${name}"`);

        // حل التبعيات
        const moduleDependencies = await this._resolveDependencies(
          errorLogger, 
          availableServicesAndInstances, 
          name, 
          dependencies
        );

        // تهيئة الوحدة
        const moduleAPIOrInstance = await initFn(moduleDependencies);

        // تسجيل الخدمة إذا كانت متوفرة
        await this._registerProvidedService(
          errorLogger,
          availableServicesAndInstances,
          name,
          provides,
          moduleAPIOrInstance
        );

      } catch (error) {
        this._handleModuleInitError(errorLogger, error, moduleConfig.name);
      }
    }

    this._logInfo(errorLogger, '[ModuleBootstrap] All configured modules have been processed.');
  },

  /**
   * التحقق من صحة تكوين الوحدة
   * @param {ModuleConfig} moduleConfig - تكوين الوحدة
   * @returns {boolean} - هل التكوين صالح؟
   * @private
   */
  _isValidModuleConfig(moduleConfig) {
    return moduleConfig && 
           typeof moduleConfig.name === 'string' && 
           typeof moduleConfig.initFn === 'function';
  },

  /**
   * حل تبعيات الوحدة
   * @param {Object} errorLogger - خدمة تسجيل الأخطاء
   * @param {Object} availableServices - الخدمات المتوفرة
   * @param {string} moduleName - اسم الوحدة
   * @param {string[]} dependencies - قائمة التبعيات المطلوبة
   * @returns {Object} - الكائن الذي يحتوي على التبعيات المحللة
   * @private
   */
  _resolveDependencies(errorLogger, availableServices, moduleName, dependencies) {
    const moduleDependencies = {};
    let allDepsMet = true;

    for (const depName of dependencies) {
      if (availableServices.hasOwnProperty(depName)) {
        moduleDependencies[depName] = availableServices[depName];
      } else {
        this._logWarning(errorLogger, {
          message: `التبعية "${depName}" غير موجودة للوحدة "${moduleName}"`,
          origin: 'moduleBootstrap.resolveDependencies',
          context: { 
            module: moduleName, 
            missingDependency: depName, 
            available: Object.keys(availableServices) 
          }
        });
        allDepsMet = false;
      }
    }

    if (!allDepsMet) {
      this._logWarning(errorLogger, {
        message: `بعض التبعيات مفقودة للوحدة "${moduleName}"`,
        origin: 'moduleBootstrap.resolveDependencies',
        context: { module: moduleName }
      });
    }

    return moduleDependencies;
  },

  /**
   * تسجيل الخدمة المقدمة من الوحدة
   * @param {Object} errorLogger - خدمة تسجيل الأخطاء
   * @param {Object} availableServices - الخدمات المتوفرة
   * @param {string} moduleName - اسم الوحدة
   * @param {string} provides - اسم الخدمة المقدمة
   * @param {*} serviceInstance - نسخة الخدمة
   * @private
   */
  _registerProvidedService(errorLogger, availableServices, moduleName, provides, serviceInstance) {
    if (provides && typeof provides === 'string') {
      if (serviceInstance !== undefined) {
        availableServices[provides] = serviceInstance;
        this._logInfo(errorLogger, `[ModuleBootstrap] Module "${moduleName}" initialized and provided: "${provides}"`);
      } else {
        this._logWarning(errorLogger, {
          message: `الوحدة "${moduleName}" مُكوَّنة لتوفير "${provides}" ولكنها لم تُرجع قيمة`,
          origin: 'moduleBootstrap.registerProvidedService',
          context: { module: moduleName }
        });
      }
    } else if (serviceInstance !== undefined) {
      this._logDebug(errorLogger, `[ModuleBootstrap] Module "${moduleName}" initialized (initFn returned a value but no 'provides' key).`);
    } else {
      this._logDebug(errorLogger, `[ModuleBootstrap] Module "${moduleName}" initialized (initFn did not return a value).`);
    }
  },

  /**
   * التعامل مع أخطاء تهيئة الوحدة
   * @param {Object} errorLogger - خدمة تسجيل الأخطاء
   * @param {Error} error - الكائن الخاص بالخطأ
   * @param {string} moduleName - اسم الوحدة
   * @private
   */
  _handleModuleInitError(errorLogger, error, moduleName) {
    this._logError(errorLogger, {
      error: error instanceof Error ? error : new Error(String(error)),
      message: `فشل في تهيئة الوحدة "${moduleName}"`,
      origin: `moduleBootstrap.init(${moduleName})`,
      severity: 'error',
      context: { moduleName }
    });
  },

  /**
   * تسجيل معلومات تفصيلية
   * @param {Object} logger - خدمة التسجيل
   * @param {string|Object} message - الرسالة للتسجيل
   * @private
   */
  _logDebug(logger, message) {
    if (typeof logger.debug === 'function') {
      logger.debug(message);
    }
  },

  /**
   * تسجيل معلومات عادية
   * @param {Object} logger - خدمة التسجيل
   * @param {string|Object} message - الرسالة للتسجيل
   * @private
   */
  _logInfo(logger, message) {
    if (typeof logger.info === 'function') {
      logger.info(message);
    } else if (typeof logger.log === 'function') {
      logger.log(message);
    }
  },

  /**
   * تسجيل تحذير
   * @param {Object} logger - خدمة التسجيل
   * @param {Object} warning - كائن يحتوي على تفاصيل التحذير
   * @private
   */
  _logWarning(logger, warning) {
    if (typeof logger.warn === 'function') {
      logger.warn(warning);
    } else if (typeof logger.warning === 'function') {
      logger.warning(warning);
    } else if (typeof logger.log === 'function') {
      logger.log({ level: 'warning', ...warning });
    }
  },

  /**
   * تسجيل خطأ
   * @param {Object} logger - خدمة التسجيل
   * @param {Object} error - كائن يحتوي على تفاصيل الخطأ
   * @private
   */
  _logError(logger, error) {
    if (typeof logger.error === 'function') {
      logger.error(error);
    } else if (typeof logger.log === 'function') {
      logger.log({ level: 'error', ...error });
    } else {
      console.error(error);
    }
  }
};

export default moduleBootstrap;
