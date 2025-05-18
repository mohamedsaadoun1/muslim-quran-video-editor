
// js/shared-ui-components/dynamic-select.builder.js

// This module does not typically need errorLogger directly unless something
// very unexpected happens during DOM manipulation. Errors from data fetching
// should be handled by the calling code.

const dynamicSelectBuilder = {
  /**
   * Clears all existing options from a select element.
   * @param {HTMLSelectElement} selectElement - The <select> DOM element.
   */
  clearOptions(selectElement) {
    if (selectElement && typeof selectElement.options !== 'undefined') {
      // More efficient way to clear options for most browsers
      selectElement.innerHTML = '';
      // Older way, might be slightly slower but very compatible:
      // while (selectElement.options.length > 0) {
      //   selectElement.remove(0);
      // }
    } else if (selectElement) {
      console.warn('[DynamicSelectBuilder] Provided element is not a valid select element for clearing.', selectElement);
    }
  },

  /**
   * Populates a select element with options from an array of data.
   * @param {object} config - Configuration object for populating the select.
   * @param {HTMLSelectElement} config.selectElement - The <select> DOM element to populate.
   * @param {Array<object>} config.data - Array of data objects to create options from.
   * @param {string} config.valueField - The property name in data objects to use for option value.
   * @param {string | function(object):string} config.textField - The property name for option text,
   *                                                             or a function that takes a data item and returns the text.
   * @param {string | number} [config.selectedValue] - Optional. The value to pre-select.
   * @param {string} [config.placeholderText] - Optional. Text for a disabled, selected placeholder option (e.g., "Select an option...").
   * @param {string | number} [config.placeholderValue=''] - Optional. Value for the placeholder option.
   * @param {boolean} [config.clearExisting=true] - Optional. Whether to clear existing options before populating.
   * @param {function(HTMLOptionElement, object):void} [config.optionCreatedCallback] - Optional. A callback function
   *                                                                                 that is called for each created option element
   *                                                                                 allowing further customization (e.g., adding data attributes).
   *                                                                                 Receives (optionElement, dataItem).
   * @returns {boolean} True if population was attempted, false if selectElement or data was invalid.
   */
  populateSelect(config) {
    const {
      selectElement,
      data,
      valueField,
      textField,
      selectedValue,
      placeholderText,
      placeholderValue = '',
      clearExisting = true,
      optionCreatedCallback
    } = config;

    if (!selectElement || typeof selectElement.appendChild !== 'function') {
      console.error('[DynamicSelectBuilder] Invalid selectElement provided.', selectElement);
      return false;
    }
    if (!Array.isArray(data)) {
      console.error('[DynamicSelectBuilder] Invalid data provided. Expected an array.', data);
      // Populate with placeholder only if provided, even if data is invalid
      if (clearExisting) {
        this.clearOptions(selectElement);
      }
      if (placeholderText) {
        const placeholderOption = document.createElement('option');
        placeholderOption.value = placeholderValue;
        placeholderOption.textContent = placeholderText;
        placeholderOption.disabled = true;
        placeholderOption.selected = true; // Pre-select the placeholder
        selectElement.appendChild(placeholderOption);
      }
      return false;
    }
    if (!valueField || !textField) {
        console.error('[DynamicSelectBuilder] valueField and textField are required.', {valueField, textField});
        return false;
    }

    if (clearExisting) {
      this.clearOptions(selectElement);
    }

    let hasSelectedPlaceholder = false;
    if (placeholderText) {
      const placeholderOption = document.createElement('option');
      placeholderOption.value = placeholderValue;
      placeholderOption.textContent = placeholderText;
      placeholderOption.disabled = true; // Placeholder is typically not selectable
      // Select placeholder only if no other selectedValue is specified or if selectedValue matches placeholderValue
      if (selectedValue === undefined || selectedValue === null || String(selectedValue) === String(placeholderValue)) {
          placeholderOption.selected = true;
          hasSelectedPlaceholder = true;
      }
      selectElement.appendChild(placeholderOption);
    }

    data.forEach(item => {
      if (typeof item !== 'object' || item === null) {
        console.warn('[DynamicSelectBuilder] Skipping invalid item in data array:', item);
        return;
      }

      const option = document.createElement('option');
      
      const itemValue = item[valueField];
      if (itemValue === undefined || itemValue === null) {
          console.warn(`[DynamicSelectBuilder] valueField "${valueField}" not found or null/undefined in item:`, item);
          // Decide: skip this option or use a default value? For now, skip.
          return;
      }
      option.value = itemValue;

      let itemText;
      if (typeof textField === 'function') {
        itemText = textField(item);
      } else if (typeof textField === 'string' && (item[textField] !== undefined && item[textField] !== null)) {
        itemText = item[textField];
      } else {
         console.warn(`[DynamicSelectBuilder] textField "${textField}" not found or null/undefined in item, or textField is not a function. Using value as text for item:`, item);
         itemText = itemValue; // Fallback to value if text is problematic
      }
      option.textContent = itemText;

      // Pre-select the option if its value matches selectedValue
      // and if a placeholder wasn't already marked as selected with the same value.
      if (selectedValue !== undefined && selectedValue !== null && String(item.value) === String(selectedValue)) {
         if (placeholderText && String(placeholderValue) === String(selectedValue) && hasSelectedPlaceholder) {
            // Placeholder is already selected with this value, do nothing more for this option.
         } else {
            option.selected = true;
            // If a real option is selected, ensure placeholder (if any) is not.
            if (placeholderText && selectElement.options[0] && selectElement.options[0].value === String(placeholderValue)) {
                selectElement.options[0].selected = false;
            }
         }
      }
      
      if (typeof optionCreatedCallback === 'function') {
        optionCreatedCallback(option, item);
      }

      selectElement.appendChild(option);
    });

    // If no selectedValue was provided, and no placeholder was selected,
    // and there are options, select the first actual option (if placeholder not desired as default selection)
    // This behavior might be optional based on needs.
    if (selectedValue === undefined && selectedValue === null && !hasSelectedPlaceholder && selectElement.options.length > (placeholderText ? 1:0)) {
        if (placeholderText) {
            // If there's a placeholder, the first actual item is at index 1
            if(selectElement.options[1]) selectElement.options[1].selected = true;
        } else {
             // No placeholder, select the very first item
            if(selectElement.options[0]) selectElement.options[0].selected = true;
        }
    }


    return true;
  },

  /**
   * Sets the selected value of a select element.
   * @param {HTMLSelectElement} selectElement - The <select> DOM element.
   * @param {string | number} valueToSelect - The value to be selected.
   * @returns {boolean} True if the value was found and selected, false otherwise.
   */
  setSelectedValue(selectElement, valueToSelect) {
    if (!selectElement || typeof selectElement.options === 'undefined') {
      console.warn('[DynamicSelectBuilder] Invalid selectElement for setSelectedValue.');
      return false;
    }

    const valueStr = String(valueToSelect); // Compare as strings
    for (let i = 0; i < selectElement.options.length; i++) {
      if (String(selectElement.options[i].value) === valueStr) {
        selectElement.selectedIndex = i;
        // Trigger change event programmatically if needed by other parts of the app
        // const event = new Event('change', { bubbles: true });
        // selectElement.dispatchEvent(event);
        return true;
      }
    }
    // console.warn(`[DynamicSelectBuilder] Value "${valueToSelect}" not found in select options of`, selectElement.id || selectElement);
    return false; // Value not found
  },

  /**
   * Gets the selected value from a select element.
   * @param {HTMLSelectElement} selectElement - The <select> DOM element.
   * @returns {string | null} The value of the selected option, or null if no selection or invalid element.
   */
  getSelectedValue(selectElement) {
    if (selectElement && selectElement.selectedIndex !== -1 && selectElement.options && selectElement.options[selectElement.selectedIndex]) {
      return selectElement.options[selectElement.selectedIndex].value;
    }
    return null;
  },

   /**
   * Gets the text of the selected option from a select element.
   * @param {HTMLSelectElement} selectElement - The <select> DOM element.
   * @returns {string | null} The text of the selected option, or null if no selection or invalid element.
   */
  getSelectedText(selectElement) {
    if (selectElement && selectElement.selectedIndex !== -1 && selectElement.options && selectElement.options[selectElement.selectedIndex]) {
      return selectElement.options[selectElement.selectedIndex].textContent;
    }
    return null;
  }
};

// This service typically doesn't need an `initialize...` function from moduleBootstrap
// as its methods are pure utilities. Modules import it directly when needed.

export default dynamicSelectBuilder;
