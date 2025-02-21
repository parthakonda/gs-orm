/**
 * Relationships example for Google Sheets ORM
 * Shows how to implement one-to-many and many-to-many relationships
 */
const { GoogleSheetsORM } = require('../lib');
const fs = require('fs');

async function relationshipsExample() {
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
    
    // Define models with relationships
    
    // Authors (One author has many books)
    const authorModel = orm.defineModel('Author', {
      schema: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        bio: { type: 'string' },
        birthYear: { type: 'number' }
      }
    });
    
    // Books (Many books belong to one author)
    const bookModel = orm.defineModel('Book', {
      schema: {
        id: { type: 'string', required: true },
        title: { type: 'string', required: true },
        authorId: { type: 'string', required: true }, // Foreign key to Author
        publishYear: { type: 'number' },
        genre: { type: 'string' }
      }
    });
    
    // Tags (For many-to-many relationship with books)
    const tagModel = orm.defineModel('Tag', {
      schema: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true }
      }
    });
    
    // BookTags (Junction table for many-to-many relationship)
    const bookTagModel = orm.defineModel('BookTag', {
      schema: {
        id: { type: 'string', required: true },
        bookId: { type: 'string', required: true }, // Foreign key to Book
        tagId: { type: 'string', required: true }   // Foreign key to Tag
      }
    });
    
    // Initialize all models
    await orm.initModels();
    console.log('Models initialized');
    
    // Create sample data
    
    // 1. Create authors
    const author1 = await authorModel.create({
      name: 'J.K. Rowling',
      bio: 'British author known for the Harry Potter series',
      birthYear: 1965
    });
    
    const author2 = await authorModel.create({
      name: 'George Orwell',
      bio: 'English novelist and essayist',
      birthYear: 1903
    });
    
    console.log('Created authors:', author1.id, author2.id);
    
    // 2. Create books (one-to-many relationship with authors)
    const book1 = await bookModel.create({
      title: 'Harry Potter and the Philosopher\'s Stone',
      authorId: author1.id,
      publishYear: 1997,
      genre: 'Fantasy'
    });
    
    const book2 = await bookModel.create({
      title: '1984',
      authorId: author2.id,
      publishYear: 1949,
      genre: 'Dystopian'
    });
    
    const book3 = await bookModel.create({
      title: 'Animal Farm',
      authorId: author2.id,
      publishYear: 1945,
      genre: 'Allegory'
    });
    
    console.log('Created books:', book1.id, book2.id, book3.id);
    
    // 3. Create tags
    const tag1 = await tagModel.create({ name: 'Classic' });
    const tag2 = await tagModel.create({ name: 'Fiction' });
    const tag3 = await tagModel.create({ name: 'Adventure' });
    
    console.log('Created tags:', tag1.id, tag2.id, tag3.id);
    
    // 4. Create book-tag associations (many-to-many)
    await bookTagModel.createMany([
      { bookId: book1.id, tagId: tag2.id }, // Harry Potter is Fiction
      { bookId: book1.id, tagId: tag3.id }, // Harry Potter is Adventure
      { bookId: book2.id, tagId: tag1.id }, // 1984 is Classic
      { bookId: book2.id, tagId: tag2.id }, // 1984 is Fiction
      { bookId: book3.id, tagId: tag1.id }, // Animal Farm is Classic
      { bookId: book3.id, tagId: tag2.id }  // Animal Farm is Fiction
    ]);
    
    console.log('Created book-tag associations');
    
    // Implementing relationship queries
    
    // 1. One-to-many: Get all books by an author
    console.log('Getting all books by George Orwell...');
    const authorBooks = await bookModel.find({ authorId: author2.id });
    console.log(`Found ${authorBooks.length} books by George Orwell:`);
    
    for (const book of authorBooks) {
      console.log(`- ${book.title} (${book.publishYear})`);
    }
    
    // 2. Many-to-one: Get author of a book
    console.log('\nGetting author of 1984...');
    const book = await bookModel.findById(book2.id);
    const bookAuthor = await authorModel.findById(book.authorId);
    console.log(`The author of ${book.title} is ${bookAuthor.name}`);
    
    // 3. Many-to-many: Get all tags for a book
    console.log('\nGetting all tags for Harry Potter...');
    const bookTags = await bookTagModel.find({ bookId: book1.id });
    const tagIds = bookTags.map(bt => bt.tagId);
    
    console.log(`Found ${tagIds.length} tags for Harry Potter:`);
    for (const tagId of tagIds) {
      const tag = await tagModel.findById(tagId);
      console.log(`- ${tag.name}`);
    }
    
    // 4. Many-to-many: Get all books with a specific tag
    console.log('\nGetting all books with the Classic tag...');
    const classicBookTags = await bookTagModel.find({ tagId: tag1.id });
    const bookIds = classicBookTags.map(bt => bt.bookId);
    
    console.log(`Found ${bookIds.length} books with the Classic tag:`);
    for (const bookId of bookIds) {
      const classicBook = await bookModel.findById(bookId);
      console.log(`- ${classicBook.title}`);
    }
    
    // Custom relationship queries with aggregations
    
    // 1. Count books per author
    console.log('\nCounting books per author...');
    const authors = await authorModel.findAll();
    
    for (const author of authors) {
      const authorBookCount = await bookModel.count({ authorId: author.id });
      console.log(`${author.name} has written ${authorBookCount} books`);
    }
    
    // 2. Find books with the most tags
    console.log('\nFinding books with tag counts...');
    const allBooks = await bookModel.findAll();
    
    for (const aBook of allBooks) {
      const bookTagCount = await bookTagModel.count({ bookId: aBook.id });
      console.log(`${aBook.title} has ${bookTagCount} tags`);
    }
    
    // Clean up (delete all created records)
    console.log('\nCleaning up...');
    
    // Delete book-tag associations first (maintain referential integrity)
    const allBookTags = await bookTagModel.findAll();
    for (const bt of allBookTags) {
      await bookTagModel.delete(bt.id);
    }
    
    // Delete books
    // await bookModel.delete(book1.id);
    // await bookModel.delete(book2.id);
    // await bookModel.delete(book3.id);
    
    // Delete authors
    await authorModel.delete(author1.id);
    await authorModel.delete(author2.id);
    
    // Delete tags
    // await tagModel.delete(tag1.id);
    // await tagModel.delete(tag2.id);
    // await tagModel.delete(tag3.id);
    
    console.log('All records deleted');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the example
relationshipsExample();