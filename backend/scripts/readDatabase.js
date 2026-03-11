import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import Employee from '../models/employee.model.js';
import Department from '../models/department.model.js';
import Designation from '../models/designation.model.js';
import Company from '../models/company.model.js';
import Branch from '../models/branch.model.js';

dotenv.config();

const readDatabase = async () => {
  try {
    console.log('📚 Reading Database...\n');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 DATABASE SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Collection counts
    console.log('📁 Collections:');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`   ${col.name}: ${count} documents`);
    }

    // Users
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👥 USERS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const users = await User.find({}).select('-password -refreshToken').sort({ email: 1 });
    if (users.length === 0) {
      console.log('   No users found in database.');
    } else {
      users.forEach((user, idx) => {
        console.log(`\n   ${idx + 1}. ${user.email}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      Active: ${user.isActive ? 'Yes' : 'No'}`);
        console.log(`      Created: ${user.createdAt}`);
        if (user.lastLogin) {
          console.log(`      Last Login: ${user.lastLogin}`);
        }
      });
    }

    // Employees
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 EMPLOYEES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const employees = await Employee.find({})
      .populate('department', 'name')
      .populate('designation', 'name')
      .populate('branch', 'name')
      .sort({ employeeId: 1 })
      .limit(50);
    
    if (employees.length === 0) {
      console.log('   No employees found in database.');
    } else {
      employees.forEach((emp, idx) => {
        console.log(`\n   ${idx + 1}. ${emp.employeeId} - ${emp.firstName} ${emp.lastName}`);
        console.log(`      Email: ${emp.email}`);
        console.log(`      Status: ${emp.status}`);
        if (emp.department) console.log(`      Department: ${emp.department.name}`);
        if (emp.designation) console.log(`      Designation: ${emp.designation.name}`);
        if (emp.branch) console.log(`      Branch: ${emp.branch.name}`);
      });
      const totalEmployees = await Employee.countDocuments();
      if (totalEmployees > 50) {
        console.log(`\n   ... (showing first 50 of ${totalEmployees} employees)`);
      }
    }

    // Companies
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏢 COMPANIES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const companies = await Company.find({}).sort({ name: 1 });
    if (companies.length === 0) {
      console.log('   No companies found in database.');
    } else {
      companies.forEach((company, idx) => {
        console.log(`\n   ${idx + 1}. ${company.name}`);
        console.log(`      Code: ${company.code || 'N/A'}`);
        console.log(`      Email: ${company.email || 'N/A'}`);
        console.log(`      Active: ${company.isActive ? 'Yes' : 'No'}`);
      });
    }

    // Branches
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏛️  BRANCHES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const branches = await Branch.find({}).populate('company', 'name').sort({ name: 1 });
    if (branches.length === 0) {
      console.log('   No branches found in database.');
    } else {
      branches.forEach((branch, idx) => {
        console.log(`\n   ${idx + 1}. ${branch.name}`);
        if (branch.company) console.log(`      Company: ${branch.company.name}`);
        console.log(`      Code: ${branch.code || 'N/A'}`);
        console.log(`      Active: ${branch.isActive ? 'Yes' : 'No'}`);
      });
    }

    // Departments
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 DEPARTMENTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const departments = await Department.find({}).sort({ name: 1 });
    if (departments.length === 0) {
      console.log('   No departments found in database.');
    } else {
      departments.forEach((dept, idx) => {
        console.log(`\n   ${idx + 1}. ${dept.name}`);
        console.log(`      Code: ${dept.code || 'N/A'}`);
        console.log(`      Active: ${dept.isActive ? 'Yes' : 'No'}`);
      });
    }

    // Designations
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💼 DESIGNATIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const designations = await Designation.find({}).sort({ name: 1 });
    if (designations.length === 0) {
      console.log('   No designations found in database.');
    } else {
      designations.forEach((des, idx) => {
        console.log(`\n   ${idx + 1}. ${des.name}`);
        console.log(`      Code: ${des.code || 'N/A'}`);
        console.log(`      Active: ${des.isActive ? 'Yes' : 'No'}`);
      });
    }

    // Login Credentials Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔑 LOGIN CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n   Available users for login:');
    users.forEach((user) => {
      if (user.isActive) {
        console.log(`   • ${user.email} (${user.role})`);
      }
    });
    console.log('\n   Note: Passwords are hashed and cannot be displayed.');
    console.log('   Common default passwords:');
    console.log('   - admin@hrms.com: admin123');
    console.log('   - admin@vaaltic.com: Admin@123');
    console.log('   - hr@vaaltic.com: Hr@12345');
    console.log('   - employee1@vaaltic.com - employee80@vaaltic.com: Employee@123');

    await mongoose.disconnect();
    console.log('\n✅ Database read complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error reading database:', error.message);
    if (error.message.includes('authentication')) {
      console.error('\n💡 Tip: Check your MongoDB username and password in .env file');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n💡 Tip: Check your network connection and MongoDB URI');
    }
    process.exit(1);
  }
};

readDatabase();

