import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import Employee from '../models/employee.model.js';

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

// Clear existing data (optional - comment out if you want to keep existing data)
const clearDatabase = async () => {
  try {
    console.log('🗑️  Clearing existing data...');
    await Employee.deleteMany({});
    await User.deleteMany({});
    console.log('✅ Database cleared');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
};

// Check if data already exists
const checkExistingData = async () => {
  const userCount = await User.countDocuments();
  return userCount > 0;
};

// Seed data
const seedDatabase = async () => {
  try {
    console.log('🌱 Seeding database...');

    // Create Admin User
    console.log('Creating admin user...');
    const adminUser = await User.create({
      email: 'admin@hrms.com',
      password: 'admin123',
      role: 'admin',
      isActive: true
    });

    // Create Admin Employee Profile
    console.log('Creating admin employee profile...');
    const adminEmployee = await Employee.create({
      employeeId: 'EMP00001',
      userId: adminUser._id,
      firstName: 'prixo',
      lastName: 'Admin', // Required field - can be updated later
      email: 'admin@hrms.com',
      phone: '+91-9876543210',
      dateOfBirth: new Date('1980-01-15'),
      gender: 'male',
      joiningDate: new Date('2020-01-01'),
      status: 'active',
      // Department and designation are optional (null for admin)
      department: null,
      designation: null,
      branch: null,
      shift: null,
    });

    // Get the hashed password from the user object
    const hashedPassword = adminUser.password;

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Users: 1 (admin only)`);
    console.log(`   - Employees: 1 (admin employee profile)`);
    console.log('\n🔑 Login Credentials:');
    console.log('   Email: admin@hrms.com');
    console.log('   Password (plain text): admin123');
    console.log('   Password (hashed):', hashedPassword);
    console.log('\n💡 Note: You can create HR and employee accounts later through the application.');
    console.log('💡 Note: You can create branches, departments, designations, shifts, leave types, and salary components through the application.');
    console.log('💡 Note: Admin employee profile created with name "prixo". You can update it later through My Profile.');
    console.log('\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    
    // Check if data already exists
    const hasData = await checkExistingData();
    if (hasData) {
      console.log('⚠️  Database already contains data.');
      console.log('🔄 Clearing existing data and reseeding...\n');
      await clearDatabase();
    }
    
    await seedDatabase();
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed script failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seed script
main();
