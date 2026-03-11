import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';

// Load environment variables
dotenv.config();

const fixPasswords = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');

    // Update admin password
    const adminUser = await User.findOne({ email: 'admin@vaaltic.com' });
    if (adminUser) {
      adminUser.password = 'Admin@123';
      await adminUser.save();
      console.log('✅ Admin password updated');
    } else {
      console.log('❌ Admin user not found');
    }

    // Update HR password
    const hrUser = await User.findOne({ email: 'hr@vaaltic.com' });
    if (hrUser) {
      hrUser.password = 'Hr@12345';
      await hrUser.save();
      console.log('✅ HR password updated');
    } else {
      console.log('❌ HR user not found');
    }

    // Update employee passwords
    const employeeUsers = await User.find({ 
      email: { $regex: /^employee\d+@vaaltic\.com$/ },
      role: 'employee'
    });
    
    for (const user of employeeUsers) {
      user.password = 'Employee@123';
      await user.save();
    }
    console.log(`✅ Updated ${employeeUsers.length} employee passwords`);

    console.log('\n🔑 Updated Login Credentials:');
    console.log('   Admin:');
    console.log('     Email: admin@vaaltic.com');
    console.log('     Password: Admin@123');
    console.log('   HR:');
    console.log('     Email: hr@vaaltic.com');
    console.log('     Password: Hr@12345');
    console.log('   Employees:');
    console.log('     Email: employee1@vaaltic.com to employee80@vaaltic.com');
    console.log('     Password: Employee@123');
    console.log('\n✅ Password update complete!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fixPasswords();

