const fs = require('fs');
const { GoogleSheetsORM, SheetsManager } = require('../lib');

async function runExample() {
  try {
    // Load credentials from file
    const credentials = JSON.parse(fs.readFileSync('./credentials.json', 'utf8'));
    
    // Replace with your own email address
    const YOUR_EMAIL = ['YOUR_EMAIL_ADDRESS']; // TODO: Replace with your email
    
    // Initialize the Sheets Manager
    const manager = new SheetsManager({ credentials });
    await manager.initialize();
    console.log('Initialized Sheets Manager');
    
    // Step 1: Create a new spreadsheet and share it with your email
    console.log(`\nCreating and sharing a spreadsheet with ${YOUR_EMAIL}...`);
    const newSheet = await manager.createSheet(
      'Dynamic E-Commerce', 
      ['Categories', 'Products'], 
      YOUR_EMAIL
    );
    
    console.log(`Created and shared spreadsheet with ID: ${newSheet.id}`);
    console.log(`You can access it at: ${newSheet.url}`);
    
    // Step 2: Connect the ORM to the new spreadsheet
    const orm = new GoogleSheetsORM({
      spreadsheetId: newSheet.id,
      credentials
    });
    
    await orm.connect();
    console.log('\nConnected to spreadsheet with ORM');
    
    // Step 3: Define our models
    console.log('\nDefining models...');
    
    const categoryModel = orm.defineModel('Category', {
      sheetName: 'Categories',
      schema: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        description: { type: 'string' }
      }
    });
    
    const productModel = orm.defineModel('Product', {
      sheetName: 'Products',
      schema: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        categoryId: { type: 'string', required: true },
        price: { type: 'number', required: true },
        inStock: { type: 'boolean', defaultValue: true }
      }
    });
    
    // Step 4: Initialize all models at once & create header rows
    console.log('\nInitializing all models...');
    await orm.initModels();
    console.log('All models initialized successfully');
    const categoriesSheet = await categoryModel.getSheet();
    const productsSheet = await productModel.getSheet();
    await categoriesSheet.setHeaderRow(['id', 'name', 'description']);
    await productsSheet.setHeaderRow(['id', 'name', 'categoryId', 'price', 'inStock']);

    // Step 5: Add sample data
    console.log('\n=== Adding sample data ===');
    
    // Add categories
    console.log('Adding categories...');
    const categories = await categoryModel.createMany([
      {
        name: 'Electronics',
        description: 'Electronic devices and accessories'
      },
      {
        name: 'Books',
        description: 'Books and publications'
      }
    ]);
    
    console.log(`Added ${categories.length} categories`);
    
    // Add products
    console.log('Adding products...');
    const products = await productModel.createMany([
      {
        name: 'Laptop',
        categoryId: categories[0].id,
        price: 999.99
      },
      {
        name: 'Smartphone',
        categoryId: categories[0].id,
        price: 499.99
      },
      {
        name: 'JavaScript Guide',
        categoryId: categories[1].id,
        price: 39.99
      }
    ]);
    
    console.log(`Added ${products.length} products`);
    
    // Step 6: Verify by retrieving data
    console.log('\n=== Verifying data ===');
    
    const allCategories = await categoryModel.findAll();
    console.log(`Retrieved ${allCategories.length} categories:`);
    allCategories.forEach(cat => console.log(`- ${cat.name}: ${cat.description}`));
    
    const allProducts = await productModel.findAll();
    console.log(`\nRetrieved ${allProducts.length} products:`);
    
    for (const product of allProducts) {
      // Find the category name for each product
      const category = allCategories.find(c => c.id === product.categoryId);
      const categoryName = category ? category.name : 'Unknown';
      
      console.log(`- ${product.name} ($${product.price}) - Category: ${categoryName}`);
    }
    
    // Step 7: Demonstrate additional SheetsManager capabilities
    console.log('\n=== Demonstrating additional SheetsManager capabilities ===');
    
    // List all sheets in the spreadsheet
    console.log('Listing sheets in the spreadsheet:');
    const sheets = await manager.listSheets(newSheet.id);
    sheets.forEach(sheet => console.log(`- ${sheet.title} (ID: ${sheet.id})`));
    
    // Add a new sheet
    console.log('\nAdding a new "Orders" sheet:');
    const ordersSheet = await manager.addSheet(newSheet.id, 'Orders');
    console.log(`Added new sheet: ${ordersSheet.title} (ID: ${ordersSheet.id})`);
    
    console.log('\nExample completed successfully!');
    console.log(`Go check your spreadsheet at: ${newSheet.url}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// Run the example
runExample();