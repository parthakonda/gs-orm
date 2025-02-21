# Google Sheets ORM

A simple yet powerful ORM library that turns Google Sheets into a functional database with familiar ORM features. Ideal for prototypes, small projects, or situations where a traditional database is overkill.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![npm version](https://img.shields.io/badge/npm-v1.0.0-blue.svg)

## Features

- ✅ Complete CRUD operations (Create, Read, Update, Delete)
- ✅ Schema definitions with built-in validation
- ✅ Advanced queries with filtering, sorting, and pagination
- ✅ Support for relationships (one-to-many, many-to-many)
- ✅ Automatic timestamps and ID generation
- ✅ Transaction-like operations (with appropriate caveats)
- ✅ Batch operations for better performance

## Installation

```bash
npm install gs-orm
```

## Quick Start

Here's how to get started:

```javascript
const { GoogleSheetsORM } = require('gs-orm');

async function demo() {
  // Initialize the ORM with your credentials
  const orm = new GoogleSheetsORM({
    spreadsheetId: 'YOUR_SPREADSHEET_ID', // Find this in your spreadsheet URL
    credentials: require('./credentials.json')
  });

  // Connect to the spreadsheet
  await orm.connect();
  console.log('Connected to spreadsheet!');

  // Define a model
  const userModel = orm.defineModel('User', {
    schema: {
      id: { type: 'string', required: true },
      name: { type: 'string', required: true },
      email: { type: 'string', required: true },
      age: { type: 'number', defaultValue: 0 }
    }
  });

  // Initialize the model (creates sheet if needed)
  await userModel.init();
  console.log('User model initialized');

  // Create a new user
  const user = await userModel.create({
    name: 'Jane Doe',
    email: 'jane@example.com',
    age: 28
  });
  console.log('Created user:', user);

  // Find all users
  const allUsers = await userModel.findAll();
  console.log(`Found ${allUsers.length} users`);
}

demo().catch(console.error);
```

## Setting Up Google Sheets Access

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API for your project

### Step 2: Create Service Account Credentials
1. In your Google Cloud Project, go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" and select "Service Account"
3. Fill in the service account details and grant it appropriate roles
4. Create a key for this service account (JSON format)
5. Download and save the JSON file securely

### Step 3: Share Your Spreadsheet
1. Create a new Google Sheet or use an existing one
2. Click the "Share" button in the top-right corner
3. Add the service account email (found in your credentials.json) with "Editor" permissions
4. Note your spreadsheet ID (found in the URL between /d/ and /edit)

⚠️ **Important**: Make sure to share your spreadsheet with the service account email address. The library won't work without proper permissions!

## API Documentation

### GoogleSheetsORM

Main class for establishing the connection.

```javascript
const orm = new GoogleSheetsORM({
  spreadsheetId: 'YOUR_SPREADSHEET_ID',
  credentials: require('./credentials.json'), // Service account credentials
  // Alternatively, use an API key (read-only)
  // apiKey: 'YOUR_API_KEY'
});

// Connect before using
await orm.connect();
```

### Defining Models

```javascript
const userModel = orm.defineModel('User', {
  sheetName: 'Users',           // Optional (defaults to model name)
  primaryKey: 'id',             // Optional (defaults to 'id')
  timestamps: true,             // Optional (adds createdAt & updatedAt)
  schema: {
    id: { type: 'string', required: true },
    name: { type: 'string', required: true, maxLength: 100 },
    email: { type: 'string', required: true },
    age: { type: 'number', min: 0, max: 120, defaultValue: 0 },
    active: { type: 'boolean', defaultValue: true }
  }
});

// Initialize the model (creates sheet if needed)
await userModel.init();
```

### CRUD Operations

```javascript
// Create a record
const user = await userModel.create({
  name: 'Jane Smith',
  email: 'jane@example.com',
  age: 32
});

// Read operations
const allUsers = await userModel.findAll();
const user = await userModel.findById('user_id');
const activeUsers = await userModel.find({ active: true });

// Update a record
const updated = await userModel.update('user_id', {
  name: 'Jane Johnson',
  age: 33
});

// Delete a record
const deleted = await userModel.delete('user_id');
```

### Advanced Queries

```javascript
const users = await userModel.findAll({
  where: {
    age: { $gte: 18, $lte: 65 },  // Age between 18 and 65
    active: true,                  // Only active users
    name: { $like: '%smith%' }     // Name contains 'smith'
  },
  orderBy: { 
    age: 'desc',                   // Sort by age (descending)
    name: 'asc'                    // Then by name (ascending)
  },
  limit: 10,                       // Limit to 10 records
  offset: 20                       // Skip first 20 records
});
```

### Query Operators

| Operator | Description                   | Example                            |
|----------|-------------------------------|-----------------------------------|
| $eq      | Equals                        | `{ age: { $eq: 30 } }`            |
| $ne      | Not Equals                    | `{ status: { $ne: 'pending' } }`  |
| $gt      | Greater Than                  | `{ age: { $gt: 21 } }`            |
| $gte     | Greater Than or Equal         | `{ age: { $gte: 18 } }`           |
| $lt      | Less Than                     | `{ price: { $lt: 100 } }`         |
| $lte     | Less Than or Equal            | `{ stock: { $lte: 5 } }`          |
| $in      | In Array                      | `{ status: { $in: ['active', 'pending'] } }` |
| $nin     | Not In Array                  | `{ category: { $nin: ['archived'] } }` |
| $like    | Pattern Matching (like SQL %) | `{ name: { $like: 'J%' } }`       |

## Relationships

While Google Sheets doesn't natively support relationships, this library provides patterns for implementing:

- **One-to-Many**: Use a foreign key in the "many" side pointing to the "one" side's ID
- **Many-to-Many**: Use a junction table to link two entities

See the `/examples/relationships.js` file for a complete implementation.

## Performance Considerations

- Google Sheets has API limits (100 requests per 100 seconds per user)
- For bulk operations, use `createMany()` instead of multiple `create()` calls
- Enable caching when appropriate with `{ cacheEnabled: true }`
- Use `batchUpdates: true` for improved write performance

## Debugging Tips

If you're having issues:

1. Check spreadsheet permissions - make sure service account has Editor access
2. Verify your credentials.json file is valid and properly loaded
3. Confirm your schema validation isn't silently failing
4. Enable more verbose logging in your app

## Examples

Check the `examples` folder for complete, working examples:

- `basic.js` - Basic CRUD operations
- `advanced.js` - Advanced queries and optimizations
- `relationships.js` - Implementing relationships

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.