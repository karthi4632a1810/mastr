import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';

dotenv.config();

async function checkUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get email from command line argument or use default
    const email = process.argv[2] || 'durga@hrms.com';
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.log(`❌ User not found with exact email: ${email}`);
      console.log(`\n🔍 Searching for users with "durga" in email...\n`);
      
      // Search for users with "durga" in email
      const similarUsers = await User.find({ 
        email: { $regex: 'durga', $options: 'i' } 
      });
      
      if (similarUsers.length > 0) {
        console.log(`Found ${similarUsers.length} user(s) with "durga" in email:\n`);
        similarUsers.forEach((u, idx) => {
          console.log(`  ${idx + 1}. ${u.email} (${u.role})`);
        });
        console.log(`\n💡 Use one of these emails or run the script with a different email.`);
      } else {
        console.log(`\n📋 Listing all users in database:\n`);
        const allUsers = await User.find({}).select('email role isActive').limit(20);
        if (allUsers.length > 0) {
          allUsers.forEach((u, idx) => {
            console.log(`  ${idx + 1}. ${u.email} (${u.role}) - ${u.isActive ? 'Active' : 'Inactive'}`);
          });
          if (allUsers.length >= 20) {
            console.log(`\n  ... (showing first 20 users)`);
          }
        } else {
          console.log(`  No users found in database.`);
        }
      }
      process.exit(1);
    }

    console.log('📋 User Information:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email:        ${user.email}`);
    console.log(`Role:         ${user.role}`);
    console.log(`Is Active:    ${user.isActive}`);
    console.log(`User ID:      ${user._id}`);
    console.log(`Created At:   ${user.createdAt}`);
    console.log(`Last Login:   ${user.lastLogin || 'Never'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n🔐 Password Hash (bcrypt):`);
    console.log(`   ${user.password}`);
    console.log(`\n⚠️  Note: Passwords are hashed using bcrypt and cannot be retrieved in plain text.`);
    console.log(`   The hash above is what's stored in the database.`);
    
    // Test common passwords
    console.log(`\n🧪 Testing common passwords:`);
    const commonPasswords = [
      'Temp@123',
      'password',
      'admin123',
      'durga123',
      '123456',
      'password123'
    ];
    
    for (const testPassword of commonPasswords) {
      const isMatch = await bcrypt.compare(testPassword, user.password);
      if (isMatch) {
        console.log(`   ✅ MATCH FOUND: "${testPassword}"`);
        break;
      } else {
        console.log(`   ❌ "${testPassword}" - No match`);
      }
    }

    console.log(`\n💡 To reset the password, you can:`);
    console.log(`   1. Use the password reset feature in the app`);
    console.log(`   2. Update directly in MongoDB:`);
    console.log(`      db.users.updateOne({email: "${email}"}, {$set: {password: "$2a$12$..."}})`);
    console.log(`   3. Create a new user with a known password`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUser();

