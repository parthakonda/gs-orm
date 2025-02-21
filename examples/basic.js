/**
 * Basic usage example for Google Sheets ORM
 */
const { GoogleSheetsORM } = require('../lib');
const fs = require('fs');

async function basicExample() {
  try {
    // Initialize the ORM with your credentials
    const orm = new GoogleSheetsORM({
      spreadsheetId: 'YOUR_SPREADSHEET_ID', // Replace with your spreadsheet ID
      credentials: JSON.parse(fs.readFileSync('./credentials.json', 'utf8')),
      // Alternative: use API key instead of credentials
      // apiKey: 'YOUR_API_KEY'
    });
    
    // Connect to the spreadsheet
    await orm.connect();
    console.log('Connected to spreadsheet');
    
    // Define a User model
    const userModel = orm.defineModel('User', {
      schema: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        email: { type: 'string', required: true },
        age: { type: 'number', defaultValue: 0 },
        active: { type: 'boolean', defaultValue: true }
      }
    });
    
    // Initialize the model (creates sheet if it doesn't exist)
    await userModel.init();
    console.log('User model initialized');
    
    // Create a new user
    let newUser;
    try {
      newUser = await userModel.create({
        name: 'John Doe',
        email: 'john@example.com'
      });
      console.log('Created user:', newUser);
    } catch (error) {
      console.error('Failed to create user:', error.message);
    }
    // sleep for 3 seconds
    
    // await new Promise(resolve => setTimeout(resolve, 6000));

    // Find user by ID
    const user = await userModel.findById(newUser.id);
    console.log('Found user by ID:', user);
    
    // Find all active users
    const activeUsers = await userModel.find({ active: true });
    console.log(`Found ${activeUsers.length} active users`);
    
    // Update a user
    const updatedUser = await userModel.update(newUser.id, {
      name: 'John Smith',
      age: 33
    });
    console.log('Updated user:', updatedUser);
    
    // Complex query with filtering, sorting and pagination
    const results = await userModel.findAll({
      where: {
        age: { $gte: 18 },
        active: true
      },
      orderBy: { name: 'asc' },
      limit: 10,
      offset: 0
    });
    console.log(`Found ${results.length} users matching criteria`);
    
    // Count users
    const userCount = await userModel.count();
    console.log(`Total users: ${userCount}`);
    
    // // Delete the user we created
    // await userModel.delete(newUser.id);
    // console.log(`Deleted user with ID: ${newUser.id}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the example
basicExample();