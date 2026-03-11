import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';

dotenv.config();

async function resetPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get email and new password from command line
    const email = process.argv[2];
    const newPassword = process.argv[3] || 'Temp@123'; // Default password

    if (!email) {
      console.log('❌ Usage: node scripts/resetPassword.js <email> [newPassword]');
      console.log('   Example: node scripts/resetPassword.js alice.johnson@hrms.com Temp@123');
      process.exit(1);
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`📋 Resetting password for: ${user.email} (${user.role})`);
    console.log(`   New password will be: ${newPassword}\n`);

    // Update password (will be hashed automatically by the pre-save hook)
    user.password = newPassword;
    await user.save();

    console.log(`✅ Password reset successfully!`);
    console.log(`\n📝 Login credentials:`);
    console.log(`   Email:    ${user.email}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   Role:     ${user.role}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetPassword();

