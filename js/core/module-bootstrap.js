// js/core/module-bootstrap.js

// Note: This module does NOT import the actual initialize functions from features/shared-ui.
// Those imports happen in `main.js`, and an array of module configurations (moduleConfigs)
// is passed to `initializeAllModules`. This makes module-bootstrap.js more generic.

const moduleBootstrap = {
  /**
   * Initializes all registered modules based on the provided configurations.
   * Iterates through the moduleConfigs array, resolves dependencies, and calls
   * the initFn for each module. If an initFn returns a value and the config
   * specifies a 'provides' key, that returned value is added to the pool of
   * available services for subsequent modules.
   *
   * @param {Object} coreServices - An object containing core, app-wide services.
   * @param {import('./state-store.js').default} coreServices.stateStore
   * @param {import('./event-aggregator.js').default} coreServices.eventAggregator
   * @param {import('./error-logger.js').default} coreServices.errorLogger
   * @param {import('./resource-manager.js').default} [coreServices.resourceManager]
   * @param {import('./localization.service.js').default | ReturnType<import('./localization.service.js').initializeLocalizationService>} [coreServices.localizationService] // Could be instance or the raw module
   * @param {import('../services/local-storage.adapter.js').default} [coreServices.localStorageAdapter]
   * @param {import('../services/quran.api.client.js').default} [coreServices.quranApiClient]
   * @param {import('../services/pexels.api.client.js').default} [coreServices.pexelsAPI] // Note the key change for consistency
   * @param {import('../services/speech.recognition.wrapper.js').default} [coreServices.speechRecognitionWrapper]
   * @param {import('../services/file.io.utils.js').default} [coreServices.fileIOUtils]
   * // Add other globally available core services or utility instances here
   *
   * @param {Array<ModuleConfig>} moduleConfigs - An array of module configurations from main.js.
   *
   * @typedef {Object} ModuleConfig
   * @property {string} name - Descriptive name of the module (for logging).
   * @property {Function} initFn - The initialization function (async or sync) that takes a dependencies object.
   * @property {string[]} [dependencies] - Array of dependency names (keys in coreServices or from other modules' 'provides').
   * @property {string} [provides] - If the initFn returns a service/API, this is the key it will be registered under for other modules.
   *
   * @returns {Promise<void>}
   */
  async initializeAllModules(coreServices, moduleConfigs = []) {
    // Use the errorLogger from coreServices, or fallback to console if not provided (should always be provided)
    const errorLogger = coreServices.errorLogger || console;

    // console.info('[ModuleBootstrap] Starting initialization of all configured modules...');

    // `availableServicesAndInstances` will hold core services and any APIs/instances
    // returned by modules that have a 'provides' key in their config.
    const availableServicesAndInstances = { ...coreServices };

    for (const moduleConfig of moduleConfigs) {
      if (!moduleConfig || typeof moduleConfig.name !== 'string' || typeof moduleConfig.initFn !== 'function') {
        (errorLogger.logWarning || errorLogger.warn).call(errorLogger, {
          message: `Invalid module configuration object encountered. Skipping.`,
          origin: 'moduleBootstrap.initializeAllModules',
          context: { receivedConfig: moduleConfig }
        });
        continue;
      }

      const { name, initFn, dependencies = [], provides } = moduleConfig;
      // console.debug(`[ModuleBootstrap] Preparing to initialize module: "${name}"`);

      try {
        const moduleDependencies = {};
        let allDepsMet = true;

        // Resolve dependencies for the current module
        for (const depName of dependencies) {
          if (Object.prototype.hasOwnProperty.call(availableServicesAndInstances, depName)) {
            moduleDependencies[depName] = availableServicesAndInstances[depName];
          } else {
            (errorLogger.logWarning || errorLogger.warn).call(errorLogger, {
              message: `Dependency "${depName}" NOT FOUND for module "${name}". This module might not function correctly or at all.`,
              origin: 'moduleBootstrap.resolveDependencies',
              context: { module: name, missingDependency: depName, available: Object.keys(availableServicesAndInstances) }
            });
            allDepsMet = false;
            // Decide on behavior: continue with missing deps, or throw to halt?
            // For robustness, we might continue, but log a severe warning.
            // If a critical dependency like 'stateStore' is missing and listed, it's likely a config error.
          }
        }

        // If critical dependencies are missing, you might choose to not initialize the module
        // if (!allDepsMet && name !== 'ErrorLoggerModule') { // Example: allow error logger to init even if others fail
        //   throw new Error(`Cannot initialize module "${name}" due to missing critical dependencies.`);
        // }

        // Call the module's initialization function
        // console.debug(`[ModuleBootstrap] Initializing "${name}" with dependencies:`, Object.keys(moduleDependencies));
        const moduleAPIOrInstance = await initFn(moduleDependencies); // Await in case initFn is async

        // If the module's initFn returns an API/instance and `provides` key is set,
        // add it to `availableServicesAndInstances` for subsequent modules.
        if (provides && typeof provides === 'string') {
          if (moduleAPIOrInstance !== undefined) { // Allow null to be a valid "provided" value
            availableServicesAndInstances[provides] = moduleAPIOrInstance;
            // console.info(`[ModuleBootstrap] Module "${name}" initialized and provided: "${provides}"`);
          } else {
            (errorLogger.logWarning || errorLogger.warn).call(errorLogger, {
              message: `Module "${name}" was configured with 'provides: "${provides}"' but its initFn returned undefined.`,
              origin: 'moduleBootstrap.initializeAllModules',
              context: { module: name }
            });
          }
        } else if (moduleAPIOrInstance !== undefined) {
          // console.info(`[ModuleBootstrap] Module "${name}" initialized (initFn returned a value but no 'provides' key).`);
        } else {
          // console.info(`[ModuleBootstrap] Module "${name}" initialized (initFn did not return a value).`);
        }

      } catch (error) {
        (errorLogger.handleError || errorLogger.error).call(errorLogger, {
          error: error instanceof Error ? error : new Error(String(error)),
          message: `CRITICAL: Failed to initialize module "${name}". This may affect application stability or functionality of dependent modules.`,
          origin: `moduleBootstrap.init(${name})`,
          severity: 'error', // Elevate severity for module init failures
          context: { moduleName: name }
        });
        // Option: Re-throw to halt all bootstrapping if a critical module fails
        // throw error; 
      }
    }
    // console.info('[ModuleBootstrap] All configured modules have been processed.');
  }
};

export default moduleBootstrap;
