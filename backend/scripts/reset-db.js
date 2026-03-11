import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Reset database - clear all collections
const resetDatabase = async () => {
  try {
    console.log('🗑️  Resetting database...');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`\nFound ${collections.length} collection(s) to clear:`);
    
    for (const collection of collections) {
      const collectionName = collection.name;
      const result = await db.collection(collectionName).deleteMany({});
      console.log(`   ✓ Cleared ${collectionName}: ${result.deletedCount} document(s) deleted`);
    }
    
    console.log('\n✅ Database reset successfully!');
    console.log('💡 All collections have been cleared. You can now run the seed script to populate the database.');
    console.log('\n');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    
    // Confirm before resetting
    console.log('⚠️  WARNING: This will delete ALL data from the database!');
    console.log('⚠️  This action cannot be undone!\n');
    
    await resetDatabase();
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Reset script failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the reset script
main();

