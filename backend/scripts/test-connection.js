import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const testConnection = async () => {
  try {
    console.log('🔌 Testing MongoDB connection...');
    console.log(`📡 Connecting to: ${process.env.MONGODB_URI?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ MongoDB connected successfully!');
    
    // Get database info
    const db = mongoose.connection.db;
    const adminDb = db.admin();
    const serverStatus = await adminDb.serverStatus();
    
    console.log('\n📊 Database Information:');
    console.log(`   Database Name: ${db.databaseName}`);
    console.log(`   MongoDB Version: ${serverStatus.version}`);
    console.log(`   Uptime: ${Math.floor(serverStatus.uptime / 3600)} hours`);
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📁 Collections (${collections.length}):`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    // Count documents in main collections
    console.log('\n📈 Document Counts:');
    const counts = {
      users: await mongoose.connection.db.collection('users').countDocuments(),
      employees: await mongoose.connection.db.collection('employees').countDocuments(),
      departments: await mongoose.connection.db.collection('departments').countDocuments(),
      designations: await mongoose.connection.db.collection('designations').countDocuments(),
      shifts: await mongoose.connection.db.collection('shifts').countDocuments(),
      leavetypes: await mongoose.connection.db.collection('leavetypes').countDocuments(),
    };
    
    Object.entries(counts).forEach(([name, count]) => {
      console.log(`   ${name}: ${count}`);
    });
    
    await mongoose.connection.close();
    console.log('\n✅ Connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ MongoDB connection failed!');
    console.error('Error details:', error.message);
    
    if (error.message.includes('authentication')) {
      console.error('\n💡 Tip: Check your MongoDB username and password');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n💡 Tip: Check your network connection and MongoDB URI');
    } else if (error.message.includes('timeout')) {
      console.error('\n💡 Tip: Check if your IP is whitelisted in MongoDB Atlas');
    }
    
    process.exit(1);
  }
};

testConnection();
