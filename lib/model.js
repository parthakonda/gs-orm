/**
 * Enhanced Model class for Google Sheets ORM with optimized data fetching
 */
const { validateData, applyDefaults } = require('./utils');

class Model {
  constructor(connection, options = {}) {
    this.connection = connection;
    this.sheetName = options.sheetName || this.constructor.name;
    this.primaryKey = options.primaryKey || 'id';
    this.schema = options.schema || {};
    this.timestamps = options.timestamps !== false;

    this._sheet = null;
    this._initialized = false;
    this._headerRow = null;
    this._columnMap = null;
  }

  async init() {
    if (this._initialized) return this;

    try {
      const doc = await this.connection.getDoc();
      let sheet = doc.sheetsByTitle[this.sheetName];

      if (!sheet) {
        sheet = await doc.addSheet({
          title: this.sheetName,
          headerValues: this._getHeaderValues()
        });
      }

      this._sheet = sheet;
      await this._loadHeaderRow();
      this._initialized = true;
      return this;
    } catch (error) {
      throw new Error(`Failed to initialize model ${this.sheetName}: ${error.message}`);
    }
  }

  async _loadHeaderRow() {
    const headerRows = await this._sheet.getRows({ offset: 0, limit: 1 });
    this._headerRow = headerRows[0];
    this._columnMap = this._createColumnMap(this._headerRow);
  }

  _createColumnMap(headerRow) {
    const map = {};
    Object.keys(headerRow).forEach((key, index) => {
      if (!key.startsWith('_')) {
        map[key] = index;
      }
    });
    return map;
  }

  _getHeaderValues() {
    const headers = Object.keys(this.schema);
    if (this.timestamps) {
      if (!headers.includes('createdAt')) headers.push('createdAt');
      if (!headers.includes('updatedAt')) headers.push('updatedAt');
    }
    return headers;
  }

  _rowToObject(row) {
    const obj = {};

    Object.entries(row).forEach(([key, value]) => {
      if (!key.startsWith('_')) {
        obj[key] = this._convertValueType(key, value);
      }
    });

    Object.defineProperty(obj, '_row', {
      value: row,
      enumerable: false,
      writable: true
    });

    return obj;
  }

  _convertValueType(field, value) {
    const schema = this.schema[field];
    if (!schema || !schema.type || value === null || value === undefined) {
      return value;
    }

    switch (schema.type.toLowerCase()) {
    case 'number':
      return value === '' ? null : parseFloat(value);
    case 'boolean':
      return value === true || value === 'true' || value === '1';
    case 'date':
      return value ? new Date(value) : null;
    case 'json':
      try {
        return value ? JSON.parse(value) : null;
      } catch(error) {
        return value;
      }
    default:
      return value;
    }
  }

  async _getTotalRowCount() {
    await this.init();
    try {
      const rows = await this._sheet.getRows();
      console.log('rows', rows);
      return rows.length;
    } catch (error) {
      throw new Error(`Error getting total row count: ${error.message}`);
    }
  }

  async _getFilteredRows(options = {}) {
    const { offset = 0, limit, search = {} } = options;

    try {
      // Get all rows for the current page plus one extra
      const rows = await this._sheet.getRows({
        offset: offset,
        limit: limit ? limit + 1 : undefined
      });

      // Apply filters if any search criteria exists
      const filteredRows = this._filterRows(rows, search);

      return filteredRows;
    } catch (error) {
      throw new Error(`Error getting filtered rows: ${error.message}`);
    }
  }

  _filterRows(rows, search) {
    if (!Object.keys(search).length) return rows;

    return rows.filter(row => {
      return Object.entries(search).every(([field, condition]) => {
        const value = row[field];

        if (condition === null) {
          return value === null || value === '';
        }

        if (Array.isArray(condition)) {
          return condition.includes(value);
        }

        if (typeof condition === 'object') {
          return Object.entries(condition).every(([operator, target]) => {
            switch(operator) {
            case 'eq': return value === target;
            case 'ne': return value !== target;
            case 'gt': return value > target;
            case 'gte': return value >= target;
            case 'lt': return value < target;
            case 'lte': return value <= target;
            case 'contains': return String(value).includes(String(target));
            case 'startsWith': return String(value).startsWith(String(target));
            case 'endsWith': return String(value).endsWith(String(target));
            case 'in': return Array.isArray(target) && target.includes(value);
            case 'nin': return Array.isArray(target) && !target.includes(value);
            case 'exists': return target ? value !== null && value !== undefined : value === null || value === undefined;
            default: return false;
            }
          });
        }

        return value === condition;
      });
    });
  }

  _sortRows(rows, orderBy) {
    const [field, direction = 'asc'] = orderBy.split(':');
    const isDesc = direction.toLowerCase() === 'desc';

    return [...rows].sort((a, b) => {
      const aVal = this._convertValueType(field, a[field]);
      const bVal = this._convertValueType(field, b[field]);

      if (aVal === bVal) return 0;
      if (aVal === null) return isDesc ? -1 : 1;
      if (bVal === null) return isDesc ? 1 : -1;

      const comparison = aVal < bVal ? -1 : 1;
      return isDesc ? -comparison : comparison;
    });
  }

  _selectFields(obj, fields) {
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return obj;
    }

    const selected = {};
    fields.forEach(field => {
      if (obj[field] !== undefined) {
        selected[field] = obj[field];
      }
    });
    return selected;
  }

  async findAll(options = {}) {
    await this.init();

    const {
      page = 1,
      limit = 50,
      search = {},
      orderBy,
      select
    } = options;

    try {
      // Calculate offset
      const offset = (page - 1) * limit;

      // Get filtered rows
      const rows = await this._getFilteredRows({ offset, limit, search });

      // Get total count
      const totalCount = Object.keys(search).length > 0
        ? (await this._getFilteredRows({ search })).length
        : await this._getTotalRowCount();

      // Apply sorting if specified
      const sortedRows = orderBy ? this._sortRows(rows, orderBy) : rows;

      // Apply limit and convert to objects
      let results = sortedRows
        .slice(0, limit)
        .map(row => this._rowToObject(row));

      // Apply field selection if specified
      console.log('select', select);
      if (select && Array.isArray(select) && select.length > 0) {
        results = results.map(obj => this._selectFields(obj, select));
      }

      return {
        data: results,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: rows.length > limit
        }
      };
    } catch (error) {
      throw new Error(`Error finding records in ${this.sheetName}: ${error.message}`);
    }
  }

  async findById(id) {
    if (!id) return null;

    await this.init();

    try {
      const rows = await this._sheet.getRows();
      const row = rows.find(r => r[this.primaryKey] === id);
      return row ? this._rowToObject(row) : null;
    } catch (error) {
      throw new Error(`Error finding record by ID: ${error.message}`);
    }
  }

  async create(data) {
    await this.init();

    try {
      if (this.primaryKey === 'id' && !data.id) {
        data.id = Date.now().toString();
      }

      const record = applyDefaults(data, this.schema);

      if (this.timestamps) {
        const now = new Date().toISOString();
        record.createdAt = now;
        record.updatedAt = now;
      }

      validateData(record, this.schema);
      await this._sheet.addRow(record);

      return this.findById(record[this.primaryKey]);
    } catch (error) {
      throw new Error(`Error creating record in ${this.sheetName}: ${error.message}`);
    }
  }

  async update(id, data) {
    await this.init();

    try {
      const record = await this.findById(id);
      if (!record) return null;

      validateData(data, this.schema, { partial: true });
      const row = record._row;

      Object.entries(data).forEach(([key, value]) => {
        row[key] = value;
      });

      if (this.timestamps) {
        row.updatedAt = new Date().toISOString();
      }

      await row.save();
      return this.findById(id);
    } catch (error) {
      throw new Error(`Error updating record in ${this.sheetName}: ${error.message}`);
    }
  }

  async delete(id) {
    await this.init();

    try {
      const record = await this.findById(id);
      if (!record) return false;

      await record._row.delete();
      return true;
    } catch (error) {
      throw new Error(`Error deleting record in ${this.sheetName}: ${error.message}`);
    }
  }

  async count(search = {}) {
    await this.init();

    try {
      if (Object.keys(search).length === 0) {
        return this._getTotalRowCount();
      }

      const rows = await this._getFilteredRows({ search });
      return rows.length;
    } catch (error) {
      throw new Error(`Error counting records: ${error.message}`);
    }
  }

  async exists(criteria) {
    const count = await this.count(criteria);
    return count > 0;
  }

  async distinct(field) {
    const { data } = await this.findAll();
    return [...new Set(data.map(item => item[field]))];
  }

  async truncate() {
    await this.init();
    const rows = await this._sheet.getRows();
    await Promise.all(rows.map(row => row.delete()));
    return true;
  }

  async getSheet() {
    await this.init();
    return this._sheet;
  }
}

module.exports = Model;
