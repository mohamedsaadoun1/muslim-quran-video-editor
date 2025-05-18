// js/core/module-bootstrap.js

// Note: The actual initializer functions (e.g., initializeThemeController, initializeProjectManager)
// will be imported in main.js and passed as part of the moduleConfigs array.
// This module itself does not need to import them directly, making it more generic.

const moduleBootstrap = {
  /**
   * Initializes all registered modules based on the provided configurations.
   * @param {Object} coreServices - An object containing core, app-wide services.
   * @param {import('./state-store.js').default} coreServices.stateStore - The central state store.
   * @param {import('./event-aggregator.js').default} coreServices.eventAggregator - The event aggregator.
   * @param {import('./error-logger.js').default} coreServices.errorLogger - The error logging service.
   * @param {import('./resource-manager.js').default} [coreServices.resourceManager] - Optional, resource manager.
   * @param {import('./localization.service.js').default} [coreServices.localizationService] - Optional, localization service.
   * // Add other core services as they are developed and needed by modules.
   *
   * @param {Array<ModuleConfig>} moduleConfigs - An array of module configurations.
   * Each configuration object should have:
   *   - {string} name: A descriptive name for the module (for logging).
   *   - {Function} initFn: The initialization function for the module. This function will receive an object of its dependencies.
   *   - {Array<string>} [dependencies]: An optional array of strings listing the names of services/instances this module depends on.
   *                                      These names must match keys in `coreServices` or `provides` from previously initialized modules.
   *   - {string} [provides]: Optional. If this module's initFn returns an instance/API that other modules might need,
   *                           this string is the key under which it will be made available to subsequent modules.
   */
  async initializeAllModules(coreServices, moduleConfigs = []) {
    const { errorLogger = console } = coreServices; // Fallback errorLogger if not provided

    // console.info('[ModuleBootstrap] Starting module initialization process...');

    const availableServicesAndInstances = { ...coreServices };

    for (const moduleConfig of moduleConfigs) {
      if (!moduleConfig || typeof moduleConfig.name !== 'string' || typeof moduleConfig.initFn !== 'function') {
        errorLogger.logWarning({
          message: `Invalid module configuration object. Skipping.`,
          origin: 'moduleBootstrap.initializeAllModules',
          context: { config: moduleConfig }
        });
        continue;
      }

      const { name, initFn, dependencies = [], provides } = moduleConfig;

      try {
        // Prepare dependencies for the current module
        const moduleDependencies = {};
        let allDepsAvailable = true;

        for (const depName of dependencies) {
          if (Object.prototype.hasOwnProperty.call(availableServicesAndInstances, depName)) {
            moduleDependencies[depName] = availableServicesAndInstances[depName];
          } else {
            errorLogger.logWarning({
              message: `Dependency "${depName}" not found for module "${name}". Module might not function correctly.`,
              origin: 'moduleBootstrap.initializeAllModules',
              context: { moduleName: name, missingDependency: depName }
            });
            allDepsAvailable = false; // Or decide to throw/halt if a critical dependency is missing
            // For now, we'll let it initialize with potentially missing dependencies and log a warning.
          }
        }

        // Optional: If you want to be stricter and halt if a dependency is missing, uncomment below.
        // if (!allDepsAvailable) {
        //   throw new Error(`Critical dependency missing for module "${name}". Halting its initialization.`);
        // }

        // console.debug(`[ModuleBootstrap] Initializing module: ${name} with deps:`, Object.keys(moduleDependencies));
        const moduleInstanceOrApi = await initFn(moduleDependencies); // Call the module's init function

        // If the module's initFn returns an instance/API and a 'provides' key is specified,
        // make it available for subsequent modules.
        if (provides && typeof provides === 'string') {
          if (moduleInstanceOrApi !== undefined) {
            availableServicesAndInstances[provides] = moduleInstanceOrApi;
            // console.info(`[ModuleBootstrap] Module "${name}" provided "${provides}".`);
          } else {
            errorLogger.logWarning({
              message: `Module "${name}" was configured to provide "${provides}" but its initFn returned undefined.`,
              origin: 'moduleBootstrap.initializeAllModules',
              context: { moduleName: name, providesKey: provides }
            });
          }
        }
        // console.info(`[ModuleBootstrap] Module "${name}" initialized successfully.`);

      } catch (error) {
        errorLogger.handleError({
          error,
          message: `Failed to initialize module: "${name}". Subsequent dependent modules might also fail or be affected.`,
          origin: 'moduleBootstrap.initializeAllModules -> ' + name,
          severity: 'error',
          context: { moduleName: name }
        });
        // Depending on the criticality, you might want to re-throw the error
        // to halt the entire application bootstrapping process.
        // For now, it logs the error and continues with other modules.
        // throw error; // Uncomment to make module initialization failure fatal to app load
      }
    }
    // console.info('[ModuleBootstrap] All configured modules have been processed.');
  }
};

/**
 * @typedef {Object} ModuleConfig
 * @property {string} name - Descriptive name of the module.
 * @property {Function} initFn - The initialization function (async or sync) that takes a dependencies object.
 * @property {string[]} [dependencies] - Array of dependency names (keys in coreServices or from other modules' 'provides').
 * @property {string} [provides] - If the initFn returns a service/API, this is the key it will be registered under for other modules.
 */

export default moduleBootstrap;
