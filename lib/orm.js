/**
 * Connection manager for Google Sheets ORM
 */
const { GoogleSpreadsheet } = require('google-spreadsheet');
const Model = require('./model');

class GoogleSheetsORM {
  /**
   * @param {Object} config - Configuration options
   * @param {string} config.spreadsheetId - Google Spreadsheet ID
   * @param {Object} [config.credentials] - Service account credentials
   * @param {string} [config.apiKey] - Google API key
   */
  constructor(config) {
    if (!config.spreadsheetId) {
      throw new Error('spreadsheetId is required');
    }

    this.config = config;
    this.models = {};
    this.doc = null;
    this._initialized = false;
  }

  /**
   * Initialize the connection
   */
  async connect() {
    if (this._initialized) return this;

    try {
      this.doc = new GoogleSpreadsheet(this.config.spreadsheetId);

      // Handle authentication
      if (this.config.credentials) {
        await this.doc.useServiceAccountAuth(this.config.credentials);
      } else if (this.config.apiKey) {
        this.doc.useApiKey(this.config.apiKey);
      } else {
        throw new Error('No authentication provided for Google Sheets (credentials or apiKey)');
      }

      // Load spreadsheet info
      await this.doc.loadInfo();
      this._initialized = true;

      return this;
    } catch (error) {
      throw new Error(`Failed to connect to spreadsheet: ${error.message}`);
    }
  }

  /**
   * Get the spreadsheet document
   */
  async getDoc() {
    if (!this._initialized) {
      await this.connect();
    }
    return this.doc;
  }

  /**
   * Define a model
   * @param {string} modelName - Name of the model
   * @param {Object} options - Model configuration options
   * @returns {Model} The created model instance
   */
  defineModel(modelName, options) {
    if (this.models[modelName]) {
      throw new Error(`Model '${modelName}' already defined`);
    }

    // Set up model
    this.models[modelName] = new Model(this, {
      sheetName: options.sheetName || modelName,
      primaryKey: options.primaryKey || 'id',
      schema: options.schema || {},
      timestamps: options.timestamps !== false
    });

    return this.models[modelName];
  }

  /**
   * Get a model by name
   * @param {string} name - Model name
   * @returns {Model} The model instance
   */
  model(name) {
    if (!this.models[name]) {
      throw new Error(`Model '${name}' not found`);
    }

    return this.models[name];
  }

  /**
   * Initialize all models
   */
  async initModels() {
    await this.connect();

    const initPromises = Object.values(this.models).map(model => model.init());
    await Promise.all(initPromises);

    return this;
  }
}

module.exports = GoogleSheetsORM;
