/**
 * Base Model class for Google Sheets ORM
 */
const { applyQueryOptions, validateData, applyDefaults } = require('./utils');

class Model {
  /**
   * @param {Object} connection - Connection settings for the spreadsheet
   * @param {Object} options - Model configuration options
   */
  constructor(connection, options = {}) {
    this.connection = connection;
    this.sheetName = options.sheetName || this.constructor.name;
    this.primaryKey = options.primaryKey || 'id';
    this.schema = options.schema || {};
    this.timestamps = options.timestamps !== false;

    // Cache for the sheet instance
    this._sheet = null;
    this._initialized = false;
  }

  /**
   * Initialize the spreadsheet connection and get/create sheet
   */
  async init() {
    if (this._initialized) return this;

    try {
      // Get doc from connection
      const doc = await this.connection.getDoc();

      // Try to get existing sheet
      let sheet = doc.sheetsByTitle[this.sheetName];

      // Create sheet if it doesn't exist
      if (!sheet) {
        sheet = await doc.addSheet({
          title: this.sheetName,
          headerValues: this._getHeaderValues()
        });
      }

      this._sheet = sheet;
      this._initialized = true;
      return this;
    } catch (error) {
      throw new Error(`Failed to initialize model ${this.sheetName}: ${error.message}`);
    }
  }

  /**
   * Get all header values based on schema
   */
  _getHeaderValues() {
    const headers = Object.keys(this.schema);

    // Add timestamp columns if enabled
    if (this.timestamps) {
      if (!headers.includes('createdAt')) headers.push('createdAt');
      if (!headers.includes('updatedAt')) headers.push('updatedAt');
    }

    return headers;
  }

  /**
   * Convert sheet row to plain object
   */
  _rowToObject(row) {
    const obj = {};

    // Copy data from row (excluding internal props)
    Object.entries(row).forEach(([key, value]) => {
      if (!key.startsWith('_')) {
        obj[key] = value;
      }
    });

    // Convert types based on schema
    Object.entries(this.schema).forEach(([field, settings]) => {
      if (obj[field] !== undefined && settings.type) {
        switch (settings.type.toLowerCase()) {
        case 'number':
          obj[field] = parseFloat(obj[field]);
          break;
        case 'boolean':
          if (typeof obj[field] !== 'boolean') {
            obj[field] = obj[field] === true || obj[field] === 'true' || obj[field] === '1';
          }
          break;
        case 'date':
          if (!(obj[field] instanceof Date)) {
            obj[field] = new Date(obj[field]);
          }
          break;
        }
      }
    });

    // Add row reference for internal use
    Object.defineProperty(obj, '_row', {
      value: row,
      enumerable: false,
      writable: true
    });

    return obj;
  }

  /**
   * Find all records
   */
  async findAll(options = {}) {
    await this.init();

    try {
      // Load rows
      const rows = await this._sheet.getRows();
      let results = rows.map(row => this._rowToObject(row));

      // Apply filtering, sorting, and pagination
      results = applyQueryOptions(results, options, this.schema);

      return results;
    } catch (error) {
      throw new Error(`Error finding records in ${this.sheetName}: ${error.message}`);
    }
  }

  /**
   * Find record by primary key
   */
  async findById(id) {
    await this.init();

    try {
      const results = await this.findAll({
        where: { [this.primaryKey]: id }
      });

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      throw new Error(`Error finding record by ID in ${this.sheetName}: ${error.message}`);
    }
  }

  /**
   * Find records matching criteria
   */
  async find(criteria) {
    return this.findAll({ where: criteria });
  }

  /**
   * Create a new record
   */
  async create(data) {
    await this.init();

    try {
      // Generate ID if it's missing and primary key is 'id'
      if (this.primaryKey === 'id' && !data.id) {
        data.id = Date.now().toString();
      }

      // Apply defaults
      const record = applyDefaults(data, this.schema);

      // Add timestamps
      if (this.timestamps) {
        const now = new Date().toISOString();
        record.createdAt = now;
        record.updatedAt = now;
      }

      // Validate data
      validateData(record, this.schema);

      // Add the row
      await this._sheet.addRow(record);

      // Return the created record
      return this.findById(record[this.primaryKey]);
    } catch (error) {
      throw new Error(`Error creating record in ${this.sheetName}: ${error.message}`);
    }
  }

  /**
   * Create multiple records
   */
  async createMany(records) {
    const results = [];

    for (const record of records) {
      results.push(await this.create(record));
    }

    return results;
  }

  /**
   * Update a record
   */
  async update(id, data) {
    await this.init();

    try {
      // Find the record
      const record = await this.findById(id);
      if (!record) {
        return null;
      }

      // Validate the update data
      validateData(data, this.schema, { partial: true });

      // Get the row reference
      const row = record._row;

      // Update fields
      Object.entries(data).forEach(([key, value]) => {
        row[key] = value;
      });

      // Update timestamp
      if (this.timestamps) {
        row.updatedAt = new Date().toISOString();
      }

      // Save changes
      await row.save();

      // Return the updated record
      return this.findById(id);
    } catch (error) {
      throw new Error(`Error updating record in ${this.sheetName}: ${error.message}`);
    }
  }

  /**
   * Delete a record
   */
  async delete(id) {
    await this.init();

    try {
      // Find the record
      const record = await this.findById(id);
      if (!record) {
        return false;
      }

      // Get the row reference
      const row = record._row;

      // Delete the row
      await row.delete();

      return true;
    } catch (error) {
      throw new Error(`Error deleting record in ${this.sheetName}: ${error.message}`);
    }
  }

  /**
   * Count records matching criteria
   */
  async count(criteria = {}) {
    const results = await this.find(criteria);
    return results.length;
  }

  /**
   * Get raw sheet access
   */
  async getSheet() {
    await this.init();
    return this._sheet;
  }
}

module.exports = Model;
