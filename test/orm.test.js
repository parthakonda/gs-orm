/**
 * Tests for the GoogleSheetsORM class
 */
const { GoogleSheetsORM } = require('../lib');

// Mock GoogleSpreadsheet
jest.mock('google-spreadsheet', () => {
  return {
    GoogleSpreadsheet: jest.fn().mockImplementation(() => {
      return {
        useServiceAccountAuth: jest.fn().mockResolvedValue(true),
        useApiKey: jest.fn(),
        loadInfo: jest.fn().mockResolvedValue(true)
      };
    })
  };
});

describe('GoogleSheetsORM', () => {
  describe('constructor', () => {
    it('should throw error if spreadsheetId is missing', () => {
      expect(() => {
        new GoogleSheetsORM({});
      }).toThrow('spreadsheetId is required');
    });
    
    it('should initialize with valid options', () => {
      const orm = new GoogleSheetsORM({
        spreadsheetId: 'test-spreadsheet-id',
        credentials: { client_email: 'test@example.com', private_key: 'key' }
      });
      
      expect(orm.config.spreadsheetId).toBe('test-spreadsheet-id');
      expect(orm._initialized).toBe(false);
    });
  });

  describe('connect()', () => {
    it('should connect with service account credentials', async () => {
      const orm = new GoogleSheetsORM({
        spreadsheetId: 'test-spreadsheet-id',
        credentials: { client_email: 'test@example.com', private_key: 'key' }
      });
      
      await orm.connect();
      
      expect(orm._initialized).toBe(true);
      expect(orm.doc.useServiceAccountAuth).toHaveBeenCalledWith(orm.config.credentials);
      expect(orm.doc.loadInfo).toHaveBeenCalled();
    });
    
    it('should connect with API key', async () => {
      const orm = new GoogleSheetsORM({
        spreadsheetId: 'test-spreadsheet-id',
        apiKey: 'test-api-key'
      });
      
      await orm.connect();
      
      expect(orm._initialized).toBe(true);
      expect(orm.doc.useApiKey).toHaveBeenCalledWith(orm.config.apiKey);
      expect(orm.doc.loadInfo).toHaveBeenCalled();
    });
    
    it('should throw error if no authentication provided', async () => {
      const orm = new GoogleSheetsORM({
        spreadsheetId: 'test-spreadsheet-id'
      });
      
      await expect(orm.connect())
        .rejects
        .toThrow('No authentication provided for Google Sheets (credentials or apiKey)');
    });
    
    it('should only connect once', async () => {
      const orm = new GoogleSheetsORM({
        spreadsheetId: 'test-spreadsheet-id',
        apiKey: 'test-api-key'
      });
      
      await orm.connect();
      await orm.connect();
      
      expect(orm.doc.loadInfo).toHaveBeenCalledTimes(1);
    });
  });

  describe('defineModel()', () => {
    let orm;
    
    beforeEach(() => {
      orm = new GoogleSheetsORM({
        spreadsheetId: 'test-spreadsheet-id',
        credentials: { client_email: 'test@example.com', private_key: 'key' }
      });
    });
    
    it('should define a model with default options', () => {
      const model = orm.defineModel('User', {
        schema: {
          id: { type: 'string', required: true },
          name: { type: 'string', required: true }
        }
      });
      
      expect(orm.models.User).toBe(model);
      expect(model.sheetName).toBe('User');
      expect(model.primaryKey).toBe('id');
    });
    
    it('should define a model with custom options', () => {
      const model = orm.defineModel('Product', {
        sheetName: 'Products',
        primaryKey: 'productId',
        schema: {
          productId: { type: 'string', required: true },
          name: { type: 'string', required: true }
        },
        timestamps: false
      });
      
      expect(orm.models.Product).toBe(model);
      expect(model.sheetName).toBe('Products');
      expect(model.primaryKey).toBe('productId');
      expect(model.timestamps).toBe(false);
    });
    
    it('should throw error if model already defined', () => {
      orm.defineModel('User', {
        schema: { id: { type: 'string', required: true } }
      });
      
      expect(() => {
        orm.defineModel('User', {
          schema: { id: { type: 'string', required: true } }
        });
      }).toThrow("Model 'User' already defined");
    });
  });

  describe('model()', () => {
    let orm;
    
    beforeEach(() => {
      orm = new GoogleSheetsORM({
        spreadsheetId: 'test-spreadsheet-id',
        credentials: { client_email: 'test@example.com', private_key: 'key' }
      });
      
      orm.defineModel('User', {
        schema: {
          id: { type: 'string', required: true },
          name: { type: 'string', required: true }
        }
      });
    });
    
    it('should return a defined model', () => {
      const model = orm.model('User');
      expect(model).toBe(orm.models.User);
    });
    
    it('should throw error if model not found', () => {
      expect(() => {
        orm.model('NonexistentModel');
      }).toThrow("Model 'NonexistentModel' not found");
    });
  });

  describe('initModels()', () => {
    it('should initialize all defined models', async () => {
      // Setup
      const orm = new GoogleSheetsORM({
        spreadsheetId: 'test-spreadsheet-id',
        credentials: { client_email: 'test@example.com', private_key: 'key' }
      });
      
      // Define two models
      const userModel = orm.defineModel('User', {
        schema: { id: { type: 'string', required: true } }
      });
      
      const productModel = orm.defineModel('Product', {
        schema: { id: { type: 'string', required: true } }
      });
      
      // Mock init functions
      userModel.init = jest.fn().mockResolvedValue(userModel);
      productModel.init = jest.fn().mockResolvedValue(productModel);
      
      // Initialize all models
      await orm.initModels();
      
      // Verify both models were initialized
      expect(userModel.init).toHaveBeenCalled();
      expect(productModel.init).toHaveBeenCalled();
    });
  });
});