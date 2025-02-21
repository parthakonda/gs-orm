/**
 * Advanced usage example for Google Sheets ORM
 * Shows complex queries, transaction-like operations, and performance optimizations
 */
const { GoogleSheetsORM } = require('../lib');
const fs = require('fs');

async function advancedExample() {
  try {
    // Initialize the ORM with your credentials
    const orm = new GoogleSheetsORM({
      spreadsheetId: 'YOUR_SPREADSHEET_ID', // Replace with your spreadsheet ID
      credentials: JSON.parse(fs.readFileSync('./credentials.json', 'utf8')),
      // Additional options for advanced usage
      cacheEnabled: true,
      batchUpdates: true
    });
    
    // Connect to the spreadsheet
    await orm.connect();
    console.log('Connected to spreadsheet');
    
    // Define a Product model with validation
    const productModel = orm.defineModel('Product', {
      schema: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true, maxLength: 100 },
        description: { type: 'string' },
        price: { type: 'number', required: true, min: 0 },
        stock: { type: 'number', required: true, min: 0, defaultValue: 0 },
        categories: { type: 'string' }, // Comma-separated list of category IDs
        active: { type: 'boolean', defaultValue: true }
      }
    });
    
    // Define an Order model for relationships
    const orderModel = orm.defineModel('Order', {
      schema: {
        id: { type: 'string', required: true },
        customerId: { type: 'string', required: true },
        products: { type: 'string', required: true }, // JSON string of product IDs and quantities
        totalAmount: { type: 'number', required: true },
        status: { type: 'string', defaultValue: 'pending' },
        paymentMethod: { type: 'string' },
        shippingAddress: { type: 'string' }
      }
    });
    
    // Initialize all models
    await orm.initModels();
    console.log('Models initialized');
    
    // Batch operation - create multiple products at once
    console.log('Creating products batch...');
    const products = await productModel.createMany([
      { name: 'Laptop', price: 999.99, stock: 10, categories: 'electronics,computers' },
      { name: 'Smartphone', price: 699.99, stock: 20, categories: 'electronics,phones' },
      { name: 'Headphones', price: 149.99, stock: 30, categories: 'electronics,audio' },
      { name: 'Mouse', price: 29.99, stock: 50, categories: 'electronics,computers' },
      { name: 'Keyboard', price: 59.99, stock: 40, categories: 'electronics,computers' }
    ]);
    
    console.log(`Created ${products.length} products`);
    
    // Complex query with multiple conditions
    console.log('Running complex query...');
    const electronicProducts = await productModel.findAll({
      where: {
        price: { $gte: 50, $lte: 1000 },
        categories: { $like: '%electronics%' },
        stock: { $gt: 0 },
        active: true
      },
      orderBy: { price: 'desc' },
      limit: 10
    });
    
    console.log(`Found ${electronicProducts.length} matching products`);
    
    // Transaction-like operation
    // (Note: This is not a true transaction as Google Sheets doesn't support them, 
    // but we can simulate them with careful error handling)
    console.log('Performing transaction-like operation...');
    try {
      // 1. Create a new order
      const order = await orderModel.create({
        customerId: 'cust123',
        products: JSON.stringify([
          { id: products[0].id, quantity: 1 },
          { id: products[2].id, quantity: 2 }
        ]),
        totalAmount: products[0].price + (products[2].price * 2),
        status: 'pending',
        paymentMethod: 'credit_card',
        shippingAddress: '123 Main St, Anytown, US'
      });
      
      console.log('Created order:', order.id);
      
      // 2. Update product inventory
      await productModel.update(products[0].id, { 
        stock: products[0].stock - 1 
      });
      
      await productModel.update(products[2].id, { 
        stock: products[2].stock - 2 
      });
      
      console.log('Updated product inventory');
      
      // 3. Update order status
      await orderModel.update(order.id, { status: 'processed' });
      console.log('Updated order status to processed');
      
    } catch (error) {
      // If any part of the transaction fails, we'd ideally roll back
      // But since Google Sheets doesn't support true transactions, 
      // we'd have to implement our own rollback logic manually
      console.error('Transaction failed:', error.message);
    }
    
    // Performance optimization: Bulk read and process
    console.log('Demonstrating bulk operations...');
    const allProducts = await productModel.findAll();
    
    // Calculate total inventory value
    const totalValue = allProducts.reduce((sum, product) => {
      return sum + (product.price * product.stock);
    }, 0);
    
    console.log(`Total inventory value: $${totalValue.toFixed(2)}`);
    
    // Custom operation: Using the raw sheet access for maximum flexibility
    console.log('Performing custom sheet operation...');
    const sheet = await productModel.getSheet();
    console.log(`The product sheet has ${sheet.rowCount} rows`);
    
    // Clean up: Delete the products we created
    console.log('Cleaning up...');
    for (const product of products) {
      await productModel.delete(product.id);
    }
    console.log('Deleted products');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the example
advancedExample();