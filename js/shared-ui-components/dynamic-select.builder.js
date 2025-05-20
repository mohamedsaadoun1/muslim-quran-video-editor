// js/shared-ui-components/dynamic-select.builder.js

/**
 * @typedef {Object} DynamicSelectConfig
 * @property {HTMLSelectElement} selectElement - عنصر القائمة المنسدلة
 * @property {Array<Object>} data - بيانات مصدر الخيارات
 * @property {string} valueField - اسم الحقل الذي يحتوي على القيمة
 * @property {string | function(Object): string} textField - اسم الحقل أو وظيفة لاستخراج النص
 * @property {string | number} [selectedValue] - القيمة المحددة افتراضيًا
 * @property {string} [placeholderText] - نص الخيار الافتراضي (غير قابل للتحديد)
 * @property {string | number} [placeholderValue=''] - قيمة الخيار الافتراضي
 * @property {boolean} [clearExisting=true] - هل يجب مسح الخيارات الموجودة
 * @property {function(HTMLOptionElement, Object): void} [optionCreatedCallback] - وظيفة لتعديل الخيار بعد إنشائه
 * @property {boolean} [searchable=false] - هل القائمة قابلة للبحث
 * @property {string} [searchPlaceholder='ابحث...'] - نص البحث الافتراضي
 * @property {'auto'|'manual'} [searchMode='auto'] - وضع البحث
 * @property {number} [minSearchLength=2] - الحد الأدنى لطول البحث
 * @property {boolean} [allowCustomValues=false] - هل يسمح بإدخال قيم مخصصة
 * @property {function(string): void} [onCustomValueAdded] - وظيفة عند إضافة قيمة مخصصة
 * @property {boolean} [multiple=false] - هل القائمة تسمح بالاختيار المتعدد
 * @property {number} [maxSelections] - الحد الأقصى لعدد الاختيارات
 * @property {boolean} [grouped=false] - هل البيانات مجموعات
 * @property {string} [groupField] - اسم الحقل الذي يحتوي على اسم المجموعة
 * @property {function(Object): string} [groupKeyFunction] - وظيفة لاستخراج مفتاح المجموعة
 * @property {function(Object): string} [groupLabelFunction] - وظيفة لاستخراج تسمية المجموعة
 * @property {boolean} [sortGroups=true] - هل يجب فرز المجموعات
 * @property {boolean} [sortOptions=true] - هل يجب فرز الخيارات داخل المجموعات
 * @property {function(Object, Object): number} [groupSortFunction] - وظيفة فرز المجموعات
 * @property {function(Object, Object): number} [optionSortFunction] - وظيفة فرز الخيارات
 */

/**
 * @typedef {Object} DynamicSelectState
 * @property {HTMLSelectElement} selectElement - عنصر القائمة المنسدلة
 * @property {Array<HTMLOptionElement>} options - خيارات القائمة
 * @property {Array<HTMLOptionElement>} filteredOptions - خيارات مرشحة
 * @property {Array<string>} selectedValues - القيم المحددة
 * @property {Object} config - إعدادات القائمة
 * @property {HTMLDivElement} [searchContainer] - حاوية البحث (إن وجدت)
 * @property {HTMLInputElement} [searchInput] - حقل البحث (إن وجد)
 * @property {boolean} isSearchable - هل القائمة قابلة للبحث
 * @property {boolean} isInitialized - هل القائمة تم تهيئتها
 * @property {boolean} isGrouped - هل القائمة تحتوي على مجموعات
 * @property {Map<string, HTMLOptGroupElement>} groups - المجموعات (إن وجدت)
 */

/**
 * @typedef {Object} DynamicSelectEvent
 * @property {string} type - نوع الحدث ('change', 'search', 'select', 'deselect')
 * @property {Array<string>} values - القيم المتأثرة
 * @property {string} [searchTerm] - مصطلح البحث (في حالة الحدث 'search')
 * @property {Array<HTMLOptionElement>} [options] - الخيارات المتأثرة
 */

const dynamicSelectBuilder = {
  /**
   * مسح كل الخيارات من عنصر القائمة المنسدلة
   * @param {HTMLSelectElement} selectElement - عنصر القائمة المنسدلة
   */
  clearOptions(selectElement) {
    if (!selectElement || !('options' in selectElement)) {
      console.warn('[DynamicSelectBuilder] عنصر القائمة غير صالح للمسح.', selectElement);
      return;
    }
    
    selectElement.innerHTML = '';
  },

  /**
   * ملء عنصر القائمة المنسدلة بالخيارات
   * @param {DynamicSelectConfig} config - إعدادات ملء القائمة
   * @returns {boolean} true إذا تمت العملية بنجاح
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
      optionCreatedCallback,
      searchable = false,
      searchPlaceholder = 'ابحث...',
      searchMode = 'auto',
      minSearchLength = 2,
      allowCustomValues = false,
      onCustomValueAdded,
      multiple = false,
      maxSelections,
      grouped = false,
      groupField,
      groupKeyFunction,
      groupLabelFunction,
      sortGroups = true,
      sortOptions = true,
      groupSortFunction,
      optionSortFunction
    } = config;

    // التحقق من صحة المدخلات
    if (!selectElement || typeof selectElement.appendChild !== 'function') {
      console.error('[DynamicSelectBuilder] عنصر القائمة غير صالح.', selectElement);
      return false;
    }

    if (!Array.isArray(data)) {
      console.error('[DynamicSelectBuilder] البيانات غير صالحة. يجب أن تكون مصفوفة.', data);
      return false;
    }

    if (!valueField || !textField) {
      console.error('[DynamicSelectBuilder] الحقول valueField وtextField مطلوبة.', { valueField, textField });
      return false;
    }

    // مسح الخيارات الحالية إن لزم الأمر
    if (clearExisting) {
      this.clearOptions(selectElement);
    }

    // إعداد الحالة الأولية
    const state = {
      selectElement,
      options: [],
      filteredOptions: [],
      selectedValues: [],
      config: { ...config },
      isSearchable: searchable,
      isInitialized: false,
      isGrouped: grouped
    };

    // إضافة خاصية البيانات إلى العنصر
    if (!selectElement._dynamicSelectState) {
      selectElement._dynamicSelectState = {};
    }
    
    selectElement._dynamicSelectState.builder = state;

    // إضافة الخيار الافتراضي (إن وجد)
    if (placeholderText) {
      const placeholderOption = document.createElement('option');
      placeholderOption.value = placeholderValue;
      placeholderOption.textContent = placeholderText;
      placeholderOption.disabled = true;
      
      if (selectedValue === undefined || selectedValue === null || String(selectedValue) === String(placeholderValue)) {
        placeholderOption.selected = true;
      }
      
      selectElement.appendChild(placeholderOption);
      
      if (typeof optionCreatedCallback === 'function') {
        optionCreatedCallback(placeholderOption, null);
      }
    }

    // إعداد المجموعات (إن وجدت)
    const groups = new Map();
    const groupKey = groupKeyFunction || ((item) => item[groupField]);
    const groupLabel = groupLabelFunction || ((item) => item[groupField]);
    
    if (grouped && !groupField && !groupKeyFunction) {
      console.warn('[DynamicSelectBuilder] groupField أو groupKeyFunction مطلوبة للمجموعات.');
      grouped = false;
    }

    // فرز البيانات (إن لزم الأمر)
    let sortedData = [...data];
    
    if (sortOptions && optionSortFunction) {
      sortedData.sort(optionSortFunction);
    } else if (sortOptions && textField && typeof textField === 'string') {
      sortedData.sort((a, b) => {
        const textA = typeof textField === 'function' ? textField(a) : a[textField] || '';
        const textB = typeof textField === 'function' ? textField(b) : b[textField] || '';
        return textA.localeCompare(textB);
      });
    }

    // إضافة الخيارات
    const options = [];
    const optionValues = new Set();
    
    for (const item of sortedData) {
      if (typeof item !== 'object' || item === null) {
        console.warn('[DynamicSelectBuilder] عنصر غير صالح في البيانات:', item);
        continue;
      }

      const itemValue = item[valueField];
      
      if (itemValue === undefined || itemValue === null) {
        console.warn(`[DynamicSelectBuilder] الحقل "${valueField}" غير موجود أو فارغ في العنصر:`, item);
        continue;
      }

      if (optionValues.has(String(itemValue))) {
        console.warn(`[DynamicSelectBuilder] القيمة "${itemValue}" متكررة. سيتم تجاهلها.`);
        continue;
      }

      optionValues.add(String(itemValue));
      
      let itemText;
      if (typeof textField === 'function') {
        itemText = textField(item);
      } else if (typeof textField === 'string' && (item[textField] !== undefined && item[textField] !== null)) {
        itemText = item[textField];
      } else {
        console.warn(`[DynamicSelectBuilder] الحقل "${textField}" غير موجود أو فارغ في العنصر، أو الحقل ليس وظيفة. سيتم استخدام القيمة كنص.`);
        itemText = itemValue;
      }

      const option = document.createElement('option');
      option.value = itemValue;
      option.textContent = itemText;
      
      if (selectedValue !== undefined && selectedValue !== null && String(itemValue) === String(selectedValue)) {
        option.selected = true;
        state.selectedValues.push(String(itemValue));
      }
      
      if (typeof optionCreatedCallback === 'function') {
        optionCreatedCallback(option, item);
      }
      
      if (grouped) {
        const key = groupKey(item);
        
        if (!groups.has(key)) {
          const group = document.createElement('optgroup');
          group.label = groupLabel(item);
          
          if (sortGroups && groupSortFunction) {
            const sortedGroups = Array.from(groups.entries()).sort((a, b) => 
              groupSortFunction({ [groupField]: a[0], ...a[1] }, { [groupField]: b[0], ...b[1] })
            );
            
            const sortedGroupsMap = new Map();
            for (const [key, group] of sortedGroups) {
              sortedGroupsMap.set(key, group);
            }
            
            groups.clear();
            for (const [key, group] of sortedGroupsMap) {
              groups.set(key, group);
            }
          }
          
          groups.set(key, group);
          selectElement.appendChild(group);
        }
        
        groups.get(key).appendChild(option);
      } else {
        selectElement.appendChild(option);
      }
      
      options.push(option);
    }

    // إعداد البحث (إن لزم الأمر)
    if (searchable) {
      this._setupSearch(state, searchPlaceholder, minSearchLength, allowCustomValues, onCustomValueAdded);
    }

    // إعداد اختيار متعدد (إن لزم الأمر)
    if (multiple) {
      selectElement.multiple = true;
      
      if (maxSelections > 1) {
        selectElement.setAttribute('data-max-selections', maxSelections);
      }
    }

    state.options = options;
    state.filteredOptions = [...options]; // في البداية كل الخيارات مرئية
    state.isInitialized = true;
    
    // إضافة مراقب أحداث للقائمة
    this._setupEventListeners(state);

    return true;
  },

  /**
   * تعيين القيمة المحددة لعنصر القائمة
   * @param {HTMLSelectElement} selectElement - عنصر القائمة
   * @param {string | number | Array<string | number>} valueToSelect - القيم التي يجب تحديدها
   * @param {boolean} [triggerChangeEvent=true] - هل يجب تشغيل حدث التغيير
   * @returns {boolean} true إذا تم العثور على القيمة وتحديدها
   */
  setSelectedValue(selectElement, valueToSelect, triggerChangeEvent = true) {
    if (!selectElement || !('options' in selectElement)) {
      console.warn('[DynamicSelectBuilder] عنصر القائمة غير صالح لتعيين القيمة المحددة.');
      return false;
    }

    // التحقق من حالة اختيار متعدد
    const isMultiple = selectElement.multiple || selectElement.hasAttribute('multiple');
    
    // مسح الاختيارات الحالية
    for (let i = 0; i < selectElement.options.length; i++) {
      selectElement.options[i].selected = false;
    }

    // معالجة القيم
    const values = Array.isArray(valueToSelect) ? valueToSelect : [valueToSelect];
    let foundMatch = false;
    const maxSelections = selectElement.getAttribute('data-max-selections') ? parseInt(selectElement.getAttribute('data-max-selections'), 10) : 1;
    let selections = 0;

    // تحديد القيم
    for (let i = 0; i < selectElement.options.length; i++) {
      const option = selectElement.options[i];
      
      if (values.some(val => String(val) === String(option.value))) {
        if (isMultiple && maxSelections && selections >= maxSelections) {
          console.warn(`[DynamicSelectBuilder] تم تجاوز الحد الأقصى لعدد الاختيارات (${maxSelections}).`);
          break;
        }
        
        option.selected = true;
        foundMatch = true;
        selections++;
      }
    }

    // تشغيل حدث التغيير (إن لزم الأمر)
    if (triggerChangeEvent && foundMatch) {
      const event = new Event('change', { bubbles: true, cancelable: true });
      selectElement.dispatchEvent(event);
    }

    return foundMatch;
  },

  /**
   * الحصول على القيمة المحددة من عنصر القائمة
   * @param {HTMLSelectElement} selectElement - عنصر القائمة
   * @returns {string | Array<string> | null} القيمة أو قائمة القيم المحددة
   */
  getSelectedValue(selectElement) {
    if (!selectElement || selectElement.selectedIndex === -1 || !selectElement.options || selectElement.options.length === 0) {
      return null;
    }
    
    if (selectElement.multiple || selectElement.hasAttribute('multiple')) {
      const values = [];
      
      for (let i = 0; i < selectElement.options.length; i++) {
        if (selectElement.options[i].selected) {
          values.push(selectElement.options[i].value);
        }
      }
      
      return values.length > 0 ? values : null;
    }
    
    return selectElement.options[selectElement.selectedIndex].value;
  },

  /**
   * الحصول على نص الخيار المحدد من عنصر القائمة
   * @param {HTMLSelectElement} selectElement - عنصر القائمة
   * @returns {string | Array<string> | null} النص أو قائمة النصوص المحددة
   */
  getSelectedText(selectElement) {
    if (!selectElement || selectElement.selectedIndex === -1 || !selectElement.options || selectElement.options.length === 0) {
      return null;
    }
    
    if (selectElement.multiple || selectElement.hasAttribute('multiple')) {
      const texts = [];
      
      for (let i = 0; i < selectElement.options.length; i++) {
        if (selectElement.options[i].selected) {
          texts.push(selectElement.options[i].textContent);
        }
      }
      
      return texts.length > 0 ? texts : null;
    }
    
    return selectElement.options[selectElement.selectedIndex].textContent;
  },

  /**
   * إضافة خيار جديد إلى القائمة
   * @param {HTMLSelectElement} selectElement - عنصر القائمة
   * @param {Object} item - الكائن الذي يحتوي على بيانات الخيار
   * @param {string | number} value - القيمة المطلوبة
   * @param {string | function(Object): string} text - نص الخيار أو وظيفة لتوليد النص
   * @param {boolean} [selected=false] - هل يتم تحديد الخيار تلقائيًا
   * @param {function(HTMLOptionElement, Object): void} [optionCreatedCallback] - وظيفة لتعديل الخيار بعد إنشائه
   * @param {boolean} [triggerChangeEvent=true] - هل يتم تشغيل حدث التغيير
   * @returns {HTMLOptionElement | null} الخيار المُضاف أو null في حالة الفشل
   */
  addOption(selectElement, item, value, text, selected = false, optionCreatedCallback, triggerChangeEvent = true) {
    if (!selectElement || typeof selectElement.appendChild !== 'function') {
      console.error('[DynamicSelectBuilder] عنصر القائمة غير صالح.', selectElement);
      return null;
    }

    // التحقق من صحة القيمة
    if (value === undefined || value === null) {
      console.warn('[DynamicSelectBuilder] القيمة غير صالحة لإضافة خيار.', value);
      return null;
    }

    // إنشاء الخيار
    const option = document.createElement('option');
    option.value = value;
    
    if (typeof text === 'function') {
      option.textContent = text(item);
    } else {
      option.textContent = text || value;
    }
    
    option.selected = selected;

    // استدعاء وظيفة التعديل (إن وجدت)
    if (typeof optionCreatedCallback === 'function') {
      optionCreatedCallback(option, item);
    }

    // إضافة الخيار
    selectElement.appendChild(option);

    // تحديث الحالة
    const state = selectElement._dynamicSelectState?.builder;
    
    if (state) {
      state.options.push(option);
      
      if (selected) {
        if (selectElement.multiple || selectElement.hasAttribute('multiple')) {
          if (state.selectedValues) {
            state.selectedValues.push(String(value));
          } else {
            state.selectedValues = [String(value)];
          }
        } else {
          state.selectedValues = [String(value)];
        }
      }
    }

    // تشغيل حدث التغيير (إن لزم الأمر)
    if (triggerChangeEvent) {
      const event = new Event('change', { bubbles: true, cancelable: true });
      selectElement.dispatchEvent(event);
    }

    return option;
  },

  /**
   * إزالة خيار من القائمة
   * @param {HTMLSelectElement} selectElement - عنصر القائمة
   * @param {string | number} value - القيمة التي يجب إزالتها
   * @param {boolean} [triggerChangeEvent=true] - هل يتم تشغيل حدث التغيير
   * @returns {boolean} true إذا تم العثور على الخيار وإزالته
   */
  removeOption(selectElement, value, triggerChangeEvent = true) {
    if (!selectElement || !('options' in selectElement)) {
      console.warn('[DynamicSelectBuilder] عنصر القائمة غير صالح.', selectElement);
      return false;
    }

    let removed = false;
    
    // البحث عن الخيار وإزالته
    for (let i = 0; i < selectElement.options.length; i++) {
      if (String(selectElement.options[i].value) === String(value)) {
        const selected = selectElement.options[i].selected;
        selectElement.removeChild(selectElement.options[i]);
        removed = true;
        
        // تحديث الحالة
        const state = selectElement._dynamicSelectState?.builder;
        
        if (state) {
          state.options = state.options.filter(opt => opt.value !== String(value));
          
          if (selected && state.selectedValues) {
            state.selectedValues = state.selectedValues.filter(val => val !== String(value));
          }
        }
        
        break;
      }
    }

    // تشغيل حدث التغيير (إن لزم الأمر)
    if (triggerChangeEvent && removed) {
      const event = new Event('change', { bubbles: true, cancelable: true });
      selectElement.dispatchEvent(event);
    }

    return removed;
  },

  /**
   * مسح كل الخيارات المحددة
   * @param {HTMLSelectElement} selectElement - عنصر القائمة
   * @param {boolean} [triggerChangeEvent=true] - هل يتم تشغيل حدث التغيير
   * @returns {boolean} true إذا تم مسح الاختيارات
   */
  clearSelection(selectElement, triggerChangeEvent = true) {
    if (!selectElement || !('options' in selectElement)) {
      console.warn('[DynamicSelectBuilder] عنصر القائمة غير صالح.', selectElement);
      return false;
    }

    // مسح الاختيارات
    for (let i = 0; i < selectElement.options.length; i++) {
      selectElement.options[i].selected = false;
    }

    // تحديث الحالة
    const state = selectElement._dynamicSelectState?.builder;
    
    if (state) {
      state.selectedValues = [];
    }

    // تشغيل حدث التغيير (إن لزم الأمر)
    if (triggerChangeEvent) {
      const event = new Event('change', { bubbles: true, cancelable: true });
      selectElement.dispatchEvent(event);
    }

    return true;
  },

  /**
   * الحصول على الخيار المحدد
   * @param {HTMLSelectElement} selectElement - عنصر القائمة
   * @returns {HTMLOptionElement | Array<HTMLOptionElement> | null} الخيار أو قائمة الخيارات المحددة
   */
  getSelectedOption(selectElement) {
    if (!selectElement || selectElement.selectedIndex === -1 || !selectElement.options || selectElement.options.length === 0) {
      return null;
    }
    
    if (selectElement.multiple || selectElement.hasAttribute('multiple')) {
      const selectedOptions = [];
      
      for (let i = 0; i < selectElement.options.length; i++) {
        if (selectElement.options[i].selected) {
          selectedOptions.push(selectElement.options[i]);
        }
      }
      
      return selectedOptions.length > 0 ? selectedOptions : null;
    }
    
    return selectElement.options[selectElement.selectedIndex];
  },

  /**
   * الحصول على كل الخيارات في القائمة
   * @param {HTMLSelectElement} selectElement - عنصر القائمة
   * @returns {Array<HTMLOptionElement> | null} قائمة الخيارات
   */
  getAllOptions(selectElement) {
    if (!selectElement || !('options' in selectElement)) {
      console.warn('[DynamicSelectBuilder] عنصر القائمة غير صالح.', selectElement);
      return null;
    }

    return Array.from(selectElement.options);
  },

  /**
   * تصفية الخيارات في القائمة
   * @param {HTMLSelectElement} selectElement - عنصر القائمة
   * @param {string} searchTerm - مصطلح البحث
   * @param {string | function(HTMLOptionElement, string): boolean} [filterFunction] - وظيفة تصفية مخصصة
   * @param {boolean} [triggerChangeEvent=true] - هل يتم تشغيل حدث التغيير
   * @returns {Array<HTMLOptionElement>} قائمة الخيارات المرشحة
   */
  filterOptions(selectElement, searchTerm, filterFunction, triggerChangeEvent = true) {
    if (!selectElement || !('options' in selectElement)) {
      console.warn('[DynamicSelectBuilder] عنصر القائمة غير صالح.', selectElement);
      return null;
    }

    // التحقق من حالة القائمة
    const state = selectElement._dynamicSelectState?.builder;
    
    if (!state) {
      console.warn('[DynamicSelectBuilder] القائمة لم يتم تهيئتها.', selectElement);
      return null;
    }

    // التحقق من وجود مصطلح البحث
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
      // إظهار كل الخيارات
      for (const option of state.options) {
        option.style.display = '';
      }
      
      state.filteredOptions = [...state.options];
      
      if (triggerChangeEvent) {
        const event = new Event('filter', { bubbles: true, cancelable: true });
        event.filteredOptions = [...state.options];
        selectElement.dispatchEvent(event);
      }
      
      return [...state.options];
    }

    // تصفية الخيارات
    const filtered = [];
    
    for (const option of state.options) {
      let showOption = false;
      
      if (typeof filterFunction === 'function') {
        showOption = filterFunction(option, searchTerm);
      } else {
        const optionText = option.textContent.toLowerCase();
        showOption = optionText.includes(searchTerm.toLowerCase());
      }
      
      option.style.display = showOption ? '' : 'none';
      
      if (showOption) {
        filtered.push(option);
      }
    }
    
    state.filteredOptions = filtered;
    
    // تشغيل حدث التصفية (إن لزم الأمر)
    if (triggerChangeEvent) {
      const event = new Event('filter', { bubbles: true, cancelable: true });
      event.filteredOptions = filtered;
      selectElement.dispatchEvent(event);
    }
    
    return filtered;
  },

  /**
   * إعداد البحث في القائمة
   * @private
   * @param {DynamicSelectState} state - حالة القائمة
   * @param {string} searchPlaceholder - نص البحث الافتراضي
   * @param {number} minSearchLength - الحد الأدنى لطول البحث
   * @param {boolean} allowCustomValues - هل يسمح بإدخال قيم مخصصة
   * @param {function(string): void} onCustomValueAdded - وظيفة عند إضافة قيمة مخصصة
   */
  _setupSearch(state, searchPlaceholder, minSearchLength, allowCustomValues, onCustomValueAdded) {
    const { selectElement } = state;
    
    // إنشاء حاوية البحث
    const container = document.createElement('div');
    container.className = 'dynamic-select-container';
    
    // إنشاء حقل البحث
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = searchPlaceholder;
    searchInput.className = 'dynamic-select-search';
    
    // إضافة حقل البحث قبل القائمة
    selectElement.parentNode.insertBefore(container, selectElement);
    container.appendChild(searchInput);
    container.appendChild(selectElement);
    
    // حفظ إشارة إلى العناصر المنشأة
    state.searchContainer = container;
    state.searchInput = searchInput;
    
    // وظيفة الفلاتر
    const filterFunction = () => {
      const term = searchInput.value.trim();
      
      if (term.length === 0) {
        this.filterOptions(selectElement, '');
      } else if (term.length >= minSearchLength) {
        this.filterOptions(selectElement, term);
      }
    };
    
    // إضافة مراقب الأحداث للبحث
    searchInput.addEventListener('input', filterFunction);
    
    // دعم البحث بالفأرة
    if (selectElement.multiple || selectElement.hasAttribute('multiple')) {
      selectElement.addEventListener('mousedown', () => {
        selectElement.size = 5;
      });
      
      selectElement.addEventListener('mouseup', () => {
        selectElement.size = 1;
      });
    }
    
    // دعم القيم المخصصة
    if (allowCustomValues) {
      const customValues = new Set();
      
      state.customValues = customValues;
      
      selectElement.addEventListener('change', () => {
        const currentValues = new Set(this.getSelectedValue(selectElement) || []);
        
        for (const value of customValues) {
          if (!currentValues.has(value)) {
            customValues.delete(value);
          }
        }
      });
      
      // وظيفة إضافة قيمة مخصصة
      const handleCustomValue = () => {
        const term = searchInput.value.trim();
        
        if (term.length >= minSearchLength) {
          const existingOption = Array.from(selectElement.options).some(
            option => option.textContent.toLowerCase() === term.toLowerCase()
          );
          
          if (!existingOption) {
            const option = this.addOption(
              selectElement,
              { [state.config.valueField]: term },
              term,
              typeof state.config.textField === 'function' ? state.config.textField({ [state.config.valueField]: term }) : term,
              false,
              state.config.optionCreatedCallback
            );
            
            if (option) {
              option.selected = true;
              customValues.add(term);
              
              if (typeof onCustomValueAdded === 'function') {
                onCustomValueAdded(term);
              }
              
              // تشغيل حدث التغيير
              const event = new Event('change', { bubbles: true, cancelable: true });
              selectElement.dispatchEvent(event);
            }
          }
        }
      };
      
      // إضافة مراقب الأحداث لإضافة القيم المخصصة
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && allowCustomValues) {
          e.preventDefault();
          handleCustomValue();
        }
      });
      
      // إضافة زر لتحديد القيم المخصصة
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'dynamic-select-add-button';
      addButton.textContent = '+';
      addButton.title = 'إضافة خيار جديد';
      
      container.appendChild(addButton);
      
      addButton.addEventListener('click', handleCustomValue);
      state.addButton = addButton;
    }
    
    // حفظ الحالة في العنصر
    if (!selectElement._dynamicSelectState) {
      selectElement._dynamicSelectState = {};
    }
    
    selectElement._dynamicSelectState.searchInput = searchInput;
    selectElement._dynamicSelectState.container = container;
    
    return state;
  },

  /**
   * إعداد مراقبي الأحداث للقائمة
   * @private
   * @param {DynamicSelectState} state - حالة القائمة
   */
  _setupEventListeners(state) {
    const { selectElement } = state;
    
    // إضافة مراقب الأحداث للتغيير
    if (!selectElement._dynamicSelectState || !selectElement._dynamicSelectState.changeHandler) {
      const changeHandler = () => {
        const state = selectElement._dynamicSelectState?.builder;
        
        if (state) {
          const selectedValues = [];
          
          for (let i = 0; i < selectElement.options.length; i++) {
            if (selectElement.options[i].selected) {
              selectedValues.push(selectElement.options[i].value);
            }
          }
          
          state.selectedValues = selectedValues;
          
          // تشغيل حدث مخصص
          const event = new Event('select', { bubbles: true, cancelable: true });
          event.selectedValues = selectedValues;
          selectElement.dispatchEvent(event);
        }
      };
      
      selectElement.addEventListener('change', changeHandler);
      
      if (!selectElement._dynamicSelectState) {
        selectElement._dynamicSelectState = {};
      }
      
      selectElement._dynamicSelectState.changeHandler = changeHandler;
    }
    
    // إضافة مراقب الأحداث للتخصيص
    if (state.config.allowCustomValues && state.config.onCustomValueAdded) {
      const customValueHandler = (event) => {
        if (event.type === 'select' && event.selectedValues) {
          // التحقق من الحد الأقصى لعدد الاختيارات
          const maxSelections = selectElement.getAttribute('data-max-selections');
          
          if (maxSelections && event.selectedValues.length > parseInt(maxSelections, 10)) {
            const newValues = event.selectedValues.slice(0, parseInt(maxSelections, 10));
            this.setSelectedValue(selectElement, newValues);
          }
        }
      };
      
      selectElement.addEventListener('select', customValueHandler);
      
      if (!selectElement._dynamicSelectState) {
        selectElement._dynamicSelectState = {};
      }
      
      selectElement._dynamicSelectState.customValueHandler = customValueHandler;
    }
  },

  /**
   * إضافة خيار جديد إلى القائمة
   * @param {HTMLSelectElement} selectElement - عنصر القائمة
   * @param {Object} item - الكائن الذي يحتوي على بيانات الخيار
   * @param {string | number} value - القيمة المطلوبة
   * @param {string | function(Object): string} text - نص الخيار أو وظيفة لتوليد النص
   * @param {boolean} [selected=false] - هل يتم تحديد الخيار تلقائيًا
   * @param {function(HTMLOptionElement, Object): void} [optionCreatedCallback] - وظيفة لتعديل الخيار بعد إنشائه
   * @param {boolean} [triggerChangeEvent=true] - هل يتم تشغيل حدث التغيير
   * @returns {HTMLOptionElement | null} الخيار المُضاف أو null في حالة الفشل
   */
  addOption(selectElement, item, value, text, selected = false, optionCreatedCallback, triggerChangeEvent = true) {
    if (!selectElement || typeof selectElement.appendChild !== 'function') {
      console.error('[DynamicSelectBuilder] عنصر القائمة غير صالح.', selectElement);
      return null;
    }

    // التحقق من صحة القيمة
    if (value === undefined || value === null) {
      console.warn('[DynamicSelectBuilder] القيمة غير صالحة لإضافة خيار.', value);
      return null;
    }

    // إنشاء الخيار
    const option = document.createElement('option');
    option.value = value;
    
    if (typeof text === 'function') {
      option.textContent = text(item);
    } else {
      option.textContent = text || value;
    }
    
    option.selected = selected;

    // استدعاء وظيفة التعديل (إن وجدت)
    if (typeof optionCreatedCallback === 'function') {
      optionCreatedCallback(option, item);
    }

    // إضافة الخيار
    selectElement.appendChild(option);

    // تحديث الحالة
    const state = selectElement._dynamicSelectState?.builder;
    
    if (state) {
      state.options.push(option);
      
      if (selected) {
        if (selectElement.multiple || selectElement.hasAttribute('multiple')) {
          if (state.selectedValues) {
            state.selectedValues.push(String(value));
          } else {
            state.selectedValues = [String(value)];
          }
        } else {
          state.selectedValues = [String(value)];
        }
      }
    }

    // تشغيل حدث التغيير (إن لزم الأمر)
    if (triggerChangeEvent) {
      const event = new Event('change', { bubbles: true, cancelable: true });
      selectElement.dispatchEvent(event);
    }

    return option;
  },

  /**
   * تهيئة القائمة المنسدلة الديناميكية
   * @param {HTMLSelectElement} selectElement - عنصر القائمة
   * @param {DynamicSelectConfig} config - إعدادات القائمة
   * @param {Object} [errorLogger=console] - مسجل الأخطاء
   * @returns {boolean} true إذا تمت التهيئة بنجاح
   */
  initializeDynamicSelect(selectElement, config, errorLogger = console) {
    if (!selectElement || !config || !config.data || !Array.isArray(config.data)) {
      const err = new Error('عنصر القائمة أو الإعدادات غير صالحة.');
      this._logWarning(errorLogger, err.message, 'DynamicSelectBuilder.initializeDynamicSelect');
      return false;
    }

    // إعداد الحالة
    const state = {
      selectElement,
      options: [],
      filteredOptions: [],
      selectedValues: [],
      config: { ...config },
      isSearchable: config.searchable || false,
      isInitialized: true,
      isGrouped: config.grouped || false
    };
    
    // حفظ الحالة في العنصر
    if (!selectElement._dynamicSelectState) {
      selectElement._dynamicSelectState = {};
    }
    
    selectElement._dynamicSelectState.builder = state;

    // ملء القائمة بالبيانات
    const success = this.populateSelect(config);
    
    if (!success) {
      const err = new Error('فشل في ملء القائمة بالبيانات.');
      this._logError(errorLogger, err, 'فشل في تهيئة القائمة المنسدلة الديناميكية', { selectElement, config });
      return false;
    }

    return true;
  },

  /**
   * تسجيل خطأ
   * @private
   * @param {Object} logger - مسجل الأخطاء
   * @param {Error} error - كائن الخطأ
   * @param {string} message - رسالة الخطأ
   * @param {Object} context - سياق الخطأ
   */
  _logError(logger, error, message, context) {
    if (logger.handleError) {
      logger.handleError(error, message, 'DynamicSelectBuilder', context);
    } else if (logger.error) {
      logger.error(message, error, context);
    } else {
      console.error(message, error, context);
    }
  },

  /**
   * تسجيل تحذير
   * @private
   * @param {Object} logger - مسجل الأخطاء
   * @param {string} message - رسالة التحذير
   * @param {string} origin - مصدر التحذير
   */
  _logWarning(logger, message, origin) {
    if (logger.logWarning) {
      logger.logWarning({ message, origin });
    } else if (logger.warn) {
      logger.warn(message);
    } else {
      console.warn(message);
    }
  }
};

/**
 * تهيئة القائمة المنسدلة الديناميكية
 * @param {Object} [dependencies] - التبعيات الاختيارية
 */
export function initializeDynamicSelectBuilder(dependencies = {}) {
  const { errorLogger } = dependencies;
  
  try {
    console.info('[DynamicSelectBuilder] تم تهيئته بنجاح');
    
    // جعل الوظائف متاحة عالميًا لتسهيل التصحيح
    if (typeof window !== 'undefined' && 
        (typeof process === 'undefined' || process.env.NODE_ENV === 'development')) {
      window.dynamicSelect = {
        ...dynamicSelectBuilder
      };
    }
    
    return {
      ...dynamicSelectBuilder
    };
  } catch (error) {
    if (errorLogger) {
      errorLogger.logError(error, 'فشل في تهيئة DynamicSelectBuilder');
    } else {
      console.error('[DynamicSelectBuilder] فشل في التهيئة:', error);
    }
    
    return {};
  }
}

export default dynamicSelectBuilder;
