/**
 * Tests for the Model class
 */
const { Model } = require('../lib');

// Mock connection object
const mockConnection = {
  getDoc: jest.fn().mockResolvedValue({
    sheetsByTitle: {},
    addSheet: jest.fn().mockImplementation((options) => {
      return {
        title: options.title,
        headerValues: options.headerValues,
        getRows: jest.fn().mockResolvedValue([]),
        addRow: jest.fn().mockImplementation((row) => Promise.resolve(row))
      };
    })
  })
};

// Sample schema to use in tests
const sampleSchema = {
  id: { type: 'string', required: true },
  name: { type: 'string', required: true },
  age: { type: 'number', defaultValue: 0 },
  active: { type: 'boolean', defaultValue: true }
};

describe('Model', () => {
  let model;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a fresh model instance
    model = new Model(mockConnection, {
      sheetName: 'TestModel',
      schema: sampleSchema
    });
  });

  describe('init()', () => {
    it('should initialize and create sheet if not exists', async () => {
      await model.init();
      
      expect(mockConnection.getDoc).toHaveBeenCalled();
      expect(model._initialized).toBe(true);
    });
    
    it('should only initialize once', async () => {
      await model.init();
      await model.init();
      
      expect(mockConnection.getDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('_getHeaderValues()', () => {
    it('should return schema keys + timestamp fields', () => {
      const headers = model._getHeaderValues();
      
      expect(headers).toContain('id');
      expect(headers).toContain('name');
      expect(headers).toContain('age');
      expect(headers).toContain('active');
      expect(headers).toContain('createdAt');
      expect(headers).toContain('updatedAt');
    });
    
    it('should not include timestamps if disabled', () => {
      const noTimestampsModel = new Model(mockConnection, {
        sheetName: 'NoTimestamps',
        schema: sampleSchema,
        timestamps: false
      });
      
      const headers = noTimestampsModel._getHeaderValues();
      
      expect(headers).not.toContain('createdAt');
      expect(headers).not.toContain('updatedAt');
    });
  });

  describe('_rowToObject()', () => {
    it('should convert row to object and apply type conversions', () => {
      const row = {
        id: '123',
        name: 'Test User',
        age: '25',
        active: 'true',
        _sheet: {}
      };
      
      const obj = model._rowToObject(row);
      
      expect(obj.id).toBe('123');
      expect(obj.name).toBe('Test User');
      expect(obj.age).toBe(25); // Converted to number
      expect(obj.active).toBe(true); // Converted to boolean
      expect(obj._row).toBe(row); // Internal reference
    });
  });

  describe('create()', () => {
    it('should create a record with validation and defaults', async () => {
      // Mock implementation for findById to return the created object
      model.findById = jest.fn().mockImplementation((id) => {
        return Promise.resolve({
          id,
          name: 'Test User',
          age: 25,
          active: true
        });
      });
      
      // Create with minimal required fields
      const result = await model.create({ name: 'Test User', age: 25 });
      
      // Check model was initialized
      expect(model._initialized).toBe(true);
      
      // Verify record was created with defaults
      expect(result).toHaveProperty('id');
      expect(result.name).toBe('Test User');
      expect(result.age).toBe(25);
      expect(result.active).toBe(true);
      
      // Verify findById was called to retrieve the created record
      expect(model.findById).toHaveBeenCalled();
    });
    
    it('should throw error if required fields are missing', async () => {
      await expect(model.create({ age: 30 }))
        .rejects
        .toThrow("Validation failed: Field 'name' is required");
    });
  });

  describe('findAll()', () => {
    it('should return all records with query options applied', async () => {
      // Setup
      const rows = [
        { id: '1', name: 'Alice', age: '30', active: 'true' },
        { id: '2', name: 'Bob', age: '25', active: 'true' },
        { id: '3', name: 'Charlie', age: '40', active: 'false' }
      ];
      
      // Mock sheet with rows
      model._sheet = {
        getRows: jest.fn().mockResolvedValue(rows)
      };
      
      model._initialized = true;
      
      // Execute
      const results = await model.findAll({
        where: { active: true }
      });
      
      // Verify
      expect(results.length).toBe(2); // Should filter out inactive record
      expect(results[0].name).toBe('Alice');
      expect(results[1].name).toBe('Bob');
    });
  });

  describe('update()', () => {
    it('should update a record and return updated version', async () => {
      // Mock row save function
      const mockRow = {
        id: '123',
        name: 'Original Name',
        age: 30,
        active: true,
        save: jest.fn().mockResolvedValue(true)
      };
      
      // Mock findById to first return existing record, then updated one
      model.findById = jest.fn()
        .mockImplementationOnce(() => {
          return Promise.resolve({
            id: '123',
            name: 'Original Name',
            age: 30,
            active: true,
            _row: mockRow
          });
        })
        .mockImplementationOnce(() => {
          return Promise.resolve({
            id: '123',
            name: 'Updated Name',
            age: 31,
            active: true
          });
        });
      
      // Execute update
      const result = await model.update('123', {
        name: 'Updated Name',
        age: 31
      });
      
      // Verify
      expect(mockRow.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated Name');
      expect(result.age).toBe(31);
    });
    
    it('should return null if record not found', async () => {
      // Mock findById to return null (record not found)
      model.findById = jest.fn().mockResolvedValue(null);
      
      // Execute update
      const result = await model.update('nonexistent', {
        name: 'Updated Name'
      });
      
      // Verify
      expect(result).toBeNull();
    });
  });

  describe('delete()', () => {
    it('should delete a record and return true', async () => {
      // Mock row delete function
      const mockRow = {
        delete: jest.fn().mockResolvedValue(true)
      };
      
      // Mock findById to return a record
      model.findById = jest.fn().mockResolvedValue({
        id: '123',
        _row: mockRow
      });
      
      // Execute
      const result = await model.delete('123');
      
      // Verify
      expect(mockRow.delete).toHaveBeenCalled();
      expect(result).toBe(true);
    });
    
    it('should return false if record not found', async () => {
      // Mock findById to return null
      model.findById = jest.fn().mockResolvedValue(null);
      
      // Execute
      const result = await model.delete('nonexistent');
      
      // Verify
      expect(result).toBe(false);
    });
  });
});