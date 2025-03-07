# Google Sheets ORM

A comprehensive ORM (Object-Relational Mapping) library that transforms Google Sheets into a powerful, flexible database with rich features and intuitive API.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![npm version](https://img.shields.io/badge/npm-v1.1.0-blue.svg)

## 🌟 Key Features

- 🗃️ Full ORM Capabilities
  - Complete CRUD Operations
  - Dynamic Schema Validation
  - Advanced Querying
  - Relationship Support
- 🔍 Powerful Query Capabilities
  - Complex Filtering
  - Sorting and Pagination
  - Rich Comparison Operators
- 🔒 Built-in Data Validation
- 📊 Spreadsheet Management
- 🚀 Batch Operations
- 🕰️ Automatic Timestamps
- 🆔 Automatic ID Generation

## Installation

```bash
npm install gs-orm
```

## Comprehensive ORM Features

### 1. Model Definition and Schema Validation

```javascript
const userModel = orm.defineModel('User', {
  // Detailed schema with comprehensive validation
  schema: {
    id: { 
      type: 'string', 
      required: true 
    },
    name: { 
      type: 'string', 
      required: true, 
      minLength: 2, 
      maxLength: 100 
    },
    email: { 
      type: 'string', 
      required: true,
      // Custom validation can be added
      validate: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      }
    },
    age: { 
      type: 'number', 
      min: 0, 
      max: 120,
      defaultValue: 0 
    },
    status: {
      type: 'string',
      defaultValue: 'active',
      // Enum-like validation
      validate: (status) => ['active', 'inactive', 'suspended'].includes(status)
    }
  },
  // Optional configuration
  primaryKey: 'id',      // Custom primary key
  timestamps: true       // Automatically manage createdAt/updatedAt
});
```

### 2. Relationship Management

```javascript
// One-to-Many Relationship: Authors and Books
const authorModel = orm.defineModel('Author', {
  schema: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true },
    country: { type: 'string' }
  }
});

const bookModel = orm.defineModel('Book', {
  schema: {
    id: { type: 'string', required: true },
    title: { type: 'string', required: true },
    authorId: { type: 'string', required: true }, // Foreign Key
    publishYear: { type: 'number' },
    genre: { type: 'string' }
  }
});

// Many-to-Many: Books and Tags
const tagModel = orm.defineModel('Tag', {
  schema: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true }
  }
});

const bookTagModel = orm.defineModel('BookTag', {
  schema: {
    id: { type: 'string', required: true },
    bookId: { type: 'string', required: true },
    tagId: { type: 'string', required: true }
  }
});

// Example of using relationships
async function relationshipExample() {
  // Create an author
  const author = await authorModel.create({
    name: 'George Orwell',
    country: 'United Kingdom'
  });

  // Create a book for the author
  const book = await bookModel.create({
    title: '1984',
    authorId: author.id,
    publishYear: 1949,
    genre: 'Dystopian'
  });

  // Find books by an author
  const authorBooks = await bookModel.find({ 
    authorId: author.id 
  });
}
```

### 3. Advanced Querying

```javascript
// Complex Querying with Multiple Operators
const results = await userModel.findAll({
  // Complex filtering
  where: {
    age: { 
      $gte: 18,     // Greater than or equal to 18
      $lte: 65      // Less than or equal to 65
    },
    status: { 
      $in: ['active', 'pending']  // In these statuses
    },
    name: { 
      $like: 'J%'   // Names starting with J
    }
  },
  // Sorting
  orderBy: { 
    age: 'desc',    // Sort by age descending
    name: 'asc'     // Then by name ascending
  },
  // Pagination
  limit: 10,        // Limit to 10 records
  offset: 20        // Skip first 20 records
});
```

### 4. Batch Operations

```javascript
// Create multiple records in a single operation
const users = await userModel.createMany([
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' },
  { name: 'Charlie', email: 'charlie@example.com' }
]);

// Bulk update
const updatedUsers = await userModel.find({ status: 'inactive' });
const bulkUpdates = updatedUsers.map(user => ({
  ...user,
  status: 'archived'
}));
await userModel.createMany(bulkUpdates);
```

### 5. Sheets Management

```javascript
const { SheetsManager } = require('gs-orm');

async function manageSpreadsheets() {
  const manager = new SheetsManager({ 
    credentials: require('./credentials.json') 
  });
  await manager.initialize();

  // Create a new spreadsheet
  const newSheet = await manager.createSheet(
    'Company Database', 
    ['Employees', 'Departments', 'Projects'],
    ['collaborator@company.com']
  );

  // List sheets in the spreadsheet
  const sheets = await manager.listSheets(newSheet.id);

  // Add a new sheet
  const budgetSheet = await manager.addSheet(newSheet.id, 'Budget');
}
```

## Performance Considerations

- Optimal for small to medium-sized datasets
- Cached operations recommended
- Batch processing for large datasets
- Mindful of Google Sheets API limits

## Error Handling and Validation

- Comprehensive schema validation
- Detailed error messages
- Type coercion
- Custom validation support

## Setting Up

1. Create a Google Cloud Project
2. Enable Google Sheets and Drive APIs
3. Create a Service Account
4. Download credentials
5. Share your spreadsheet with the service account email

## Examples and More

Explore full examples in the `examples/` directory:
- `basic.js`: Basic CRUD operations
- `advanced.js`: Complex querying
- `relationships.js`: Data relationships
- `sheets.js`: Spreadsheet management

## Contributing

Contributions welcome! Please submit pull requests or open issues.

## License

MIT License - See LICENSE file for details.

## Support

- Star the repository
- Open issues for bugs/features
- Spread the word!

Happy Spreadsheeting! 📊🚀