/**
 * Utility functions for Google Sheets ORM
 */

/**
 * Apply default values from schema
 * @param {Object} data - The data object
 * @param {Object} schema - The schema definition
 * @returns {Object} Data with defaults applied
 */
function applyDefaults(data, schema) {
  const result = { ...data };

  Object.entries(schema).forEach(([field, settings]) => {
    // Skip if value already exists
    if (result[field] !== undefined) return;

    // Apply default if field is missing
    if (settings.defaultValue !== undefined) {
      const defaultValue = typeof settings.defaultValue === 'function'
        ? settings.defaultValue()
        : settings.defaultValue;

      result[field] = defaultValue;
    }
  });

  return result;
}

/**
 * Validate data against schema
 * @param {Object} data - The data to validate
 * @param {Object} schema - The schema definition
 * @param {Object} options - Validation options
 * @param {boolean} options.partial - Whether this is a partial update
 * @returns {boolean} True if valid
 */
function validateData(data, schema, options = {}) {
  const errors = [];
  const { partial = false } = options;

  Object.entries(schema).forEach(([field, settings]) => {
    // Skip validation for missing fields in partial update
    if (partial && data[field] === undefined) return;

    // Check required fields (only for full objects or if field is present)
    if (!partial && settings.required && (data[field] === undefined || data[field] === null || data[field] === '')) {
      errors.push(`Field '${field}' is required`);
    }

    // Skip further validation if field is not present
    if (data[field] === undefined) return;

    // Validate type
    if (settings.type) {
      let valid = true;
      const value = data[field];

      switch (settings.type.toLowerCase()) {
      case 'string':
        valid = typeof value === 'string' || value instanceof String;
        break;
      case 'number':
        valid = typeof value === 'number' || !isNaN(Number(value));
        break;
      case 'boolean':
        valid = typeof value === 'boolean' || value === 'true' || value === 'false' || value === '1' || value === '0';
        break;
      case 'date':
        valid = value instanceof Date || !isNaN(Date.parse(value));
        break;
      }

      if (!valid) {
        errors.push(`Field '${field}' should be of type ${settings.type}`);
      }
    }

    // Validate min/max for numbers
    if (settings.type === 'number') {
      const numValue = Number(data[field]);
      if (settings.min !== undefined && numValue < settings.min) {
        errors.push(`Field '${field}' must be at least ${settings.min}`);
      }
      if (settings.max !== undefined && numValue > settings.max) {
        errors.push(`Field '${field}' must be at most ${settings.max}`);
      }
    }

    // Validate min/max length for strings
    if (settings.type === 'string') {
      const strValue = String(data[field]);
      if (settings.minLength !== undefined && strValue.length < settings.minLength) {
        errors.push(`Field '${field}' must be at least ${settings.minLength} characters`);
      }
      if (settings.maxLength !== undefined && strValue.length > settings.maxLength) {
        errors.push(`Field '${field}' must be at most ${settings.maxLength} characters`);
      }
    }
  });

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
}

/**
 * Filter records by criteria
 * @param {Array} records - Array of records
 * @param {Object} criteria - Filter criteria
 * @returns {Array} Filtered records
 */
function filterRecords(records, criteria) {
  return records.filter(record => {
    return Object.entries(criteria).every(([key, value]) => {
      // Handle complex conditions
      if (typeof value === 'object' && value !== null) {
        if (value.$eq !== undefined) return record[key] == value.$eq;
        if (value.$ne !== undefined) return record[key] != value.$ne;
        if (value.$gt !== undefined) return parseFloat(record[key]) > value.$gt;
        if (value.$gte !== undefined) return parseFloat(record[key]) >= value.$gte;
        if (value.$lt !== undefined) return parseFloat(record[key]) < value.$lt;
        if (value.$lte !== undefined) return parseFloat(record[key]) <= value.$lte;
        if (value.$in !== undefined) return value.$in.includes(record[key]);
        if (value.$nin !== undefined) return !value.$nin.includes(record[key]);
        if (value.$like !== undefined) {
          const regex = new RegExp(value.$like.replace(/%/g, '.*'), 'i');
          return regex.test(record[key]);
        }
      }

      // Simple equality
      return record[key] == value;
    });
  });
}

/**
 * Sort records by field(s)
 * @param {Array} records - Array of records
 * @param {Object} orderBy - Sort criteria
 * @returns {Array} Sorted records
 */
function sortRecords(records, orderBy) {
  const orderEntries = Object.entries(orderBy);

  return [...records].sort((a, b) => {
    for (const [field, direction] of orderEntries) {
      const multiplier = direction.toLowerCase() === 'desc' ? -1 : 1;

      // Handle numeric sorting
      if (!isNaN(parseFloat(a[field])) && !isNaN(parseFloat(b[field]))) {
        const diff = parseFloat(a[field]) - parseFloat(b[field]);
        if (diff !== 0) return diff * multiplier;
      } else {
        // Handle string sorting
        const diff = String(a[field] || '').localeCompare(String(b[field] || ''));
        if (diff !== 0) return diff * multiplier;
      }
    }

    return 0;
  });
}

/**
 * Apply query options (filtering, sorting, pagination)
 * @param {Array} records - Array of records
 * @param {Object} options - Query options
 * @returns {Array} Processed records
 */
function applyQueryOptions(records, options, _schema) {
  let results = [...records];

  // Apply filtering
  if (options.where) {
    results = filterRecords(results, options.where);
  }

  // Apply sorting
  if (options.orderBy) {
    results = sortRecords(results, options.orderBy);
  }

  // Apply pagination
  if (options.limit !== undefined) {
    const offset = options.offset || 0;
    results = results.slice(offset, offset + options.limit);
  }

  return results;
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

module.exports = {
  applyDefaults,
  validateData,
  filterRecords,
  sortRecords,
  applyQueryOptions,
  generateId
};
