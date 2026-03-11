import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import Employee from '../models/employee.model.js';
import Company from '../models/company.model.js';
import Branch from '../models/branch.model.js';
import Department from '../models/department.model.js';
import Designation from '../models/designation.model.js';
import Shift from '../models/shift.model.js';
import LeaveType from '../models/leaveType.model.js';
import LeaveRequest from '../models/leaveRequest.model.js';
import Attendance from '../models/attendance.model.js';
import { Asset } from '../models/asset.model.js';
import Document from '../models/document.model.js';
import { Payslip, PayrollRun, SalaryStructure, SalaryComponent } from '../models/payroll.model.js';
import Goal from '../models/goal.model.js';
import ExpenseClaim from '../models/expense.model.js';
import PerformanceCycle from '../models/performanceCycle.model.js';
import PerformanceReview from '../models/performanceReview.model.js';
import SelfAssessment from '../models/selfAssessment.model.js';
import TrainingProgram from '../models/trainingProgram.model.js';
import TrainingRecord from '../models/trainingRecord.model.js';
import Resignation from '../models/resignation.model.js';
import FinalSettlement from '../models/finalSettlement.model.js';
// Exit and Onboarding models can be imported if needed for future enhancements

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

// Helper function to get date range for a month
const getMonthDateRange = (month, year) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  return { startDate, endDate };
};

// Generate Multiple Payroll Runs with Payslips
const seedPayrollRunsAndPayslips = async (employees, salaryStructures, salaryComponents, adminUser) => {
  console.log('💰 Creating payroll runs and payslips...');
  
  const payrollRuns = [];
  const payslips = [];
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  // Generate payroll for last 6 months (including current)
  const monthsToGenerate = [];
  for (let i = 5; i >= 0; i--) {
    let month = currentMonth - i;
    let year = currentYear;
    if (month <= 0) {
      month += 12;
      year -= 1;
    }
    monthsToGenerate.push({ month, year });
  }
  
  // Get basic salary component
  const basicComponent = salaryComponents.find(c => c.code === 'BASIC');
  const hraComponent = salaryComponents.find(c => c.code === 'HRA');
  const pfComponent = salaryComponents.find(c => c.code === 'PF');
  const esiComponent = salaryComponents.find(c => c.code === 'ESI');
  
  for (const { month, year } of monthsToGenerate) {
    const { startDate, endDate } = getMonthDateRange(month, year);
    
    // Determine status based on month
    let status = 'completed';
    let isLocked = false;
    if (month === currentMonth && year === currentYear) {
      status = 'completed'; // Current month can be completed
      isLocked = false;
    } else if (month < currentMonth || year < currentYear) {
      status = 'locked'; // Past months are locked
      isLocked = true;
    }
    
    // Check if payroll run already exists
    const existingRun = await PayrollRun.findOne({ month, year });
    if (existingRun) {
      console.log(`   ⏭️  Skipping payroll run for ${month}/${year} - already exists`);
      continue;
    }
    
    // Create payroll run
    const eligibleEmployees = employees.filter(e => {
      const joiningDate = new Date(e.joiningDate);
      return joiningDate <= endDate;
    });
    
    const payrollRun = await PayrollRun.create({
      month,
      year,
      periodStart: startDate,
      periodEnd: endDate,
      status,
      isLocked,
      lockedAt: isLocked ? new Date(year, month - 1, 28) : null,
      lockedBy: isLocked ? adminUser._id : null,
      lockReason: isLocked ? 'Payroll finalized for the month' : null,
      totalEmployees: employees.length,
      eligibleEmployees: eligibleEmployees.length,
      processedBy: adminUser._id,
      processedAt: new Date(year, month - 1, 28),
      payslipsGenerated: true,
      payslipGeneratedAt: new Date(year, month - 1, 28),
      validationRun: {
        ranAt: new Date(year, month - 1, 25),
        ranBy: adminUser._id,
        totalChecked: eligibleEmployees.length,
        passed: eligibleEmployees.length,
        failed: 0,
        warnings: Math.floor(eligibleEmployees.length * 0.1)
      },
      summary: {
        processedCount: eligibleEmployees.length,
        skippedCount: 0,
        errorCount: 0
      },
      history: [{
        action: 'Payroll processed',
        performedBy: adminUser._id,
        performedAt: new Date(year, month - 1, 28),
        details: { status, employeesProcessed: eligibleEmployees.length }
      }]
    });
    
    // Calculate totals
    let totalGrossEarnings = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;
    let pfEmployeeTotal = 0;
    let pfEmployerTotal = 0;
    let esiEmployeeTotal = 0;
    let esiEmployerTotal = 0;
    let ptTotal = 0;
    
    // Generate payslips for each eligible employee
    for (const employee of eligibleEmployees) {
      const salaryStructure = employee.salaryStructure || salaryStructures[0];
      
      // Calculate salary components
      const ctc = 300000 + (Math.random() * 5000000); // 3L to 53L
      const basicSalary = Math.round(ctc * 0.40);
      const hra = Math.round(basicSalary * 0.50);
      const conveyance = 1600;
      const medical = 15000;
      const specialAllowance = Math.round(ctc - basicSalary - hra - conveyance - medical);
      
      const grossSalary = basicSalary + hra + conveyance + medical + specialAllowance;
      
      // Calculate deductions
      const pfBasic = Math.min(basicSalary, 15000);
      const pfEmployee = Math.round(pfBasic * 0.12);
      const pfEmployer = Math.round(pfBasic * 0.12);
      
      let esiEmployee = 0;
      let esiEmployer = 0;
      if (grossSalary <= 21000) {
        esiEmployee = Math.round(grossSalary * 0.0075);
        esiEmployer = Math.round(grossSalary * 0.0325);
      }
      
      // Professional Tax (example slabs)
      let professionalTax = 0;
      if (grossSalary > 15000) professionalTax = 200;
      
      // TDS (simplified)
      const taxableIncome = grossSalary - pfEmployee;
      const tds = Math.round(Math.max(0, (taxableIncome - 500000) * 0.05 / 12));
      
      // Initial deductions before LOP adjustment
      const initialDeductions = pfEmployee + esiEmployee + professionalTax + tds;
      const initialNetSalary = grossSalary - initialDeductions;
      
      // Attendance summary
      const workingDays = endDate.getDate();
      const presentDays = Math.floor(workingDays * (0.85 + Math.random() * 0.1)); // 85-95% attendance
      const lopDays = workingDays - presentDays;
      
      // Create earnings array
      const earnings = [
        {
          componentId: basicComponent?._id,
          name: 'Basic Salary',
          code: 'BASIC',
          type: 'regular',
          amount: basicSalary,
          taxability: 'taxable'
        },
        {
          componentId: hraComponent?._id,
          name: 'House Rent Allowance',
          code: 'HRA',
          type: 'regular',
          amount: hra,
          taxability: 'partially_taxable'
        },
        {
          name: 'Conveyance Allowance',
          code: 'CONV',
          type: 'regular',
          amount: conveyance,
          taxability: 'exempt'
        },
        {
          name: 'Medical Allowance',
          code: 'MED',
          type: 'regular',
          amount: medical,
          taxability: 'taxable'
        },
        {
          name: 'Special Allowance',
          code: 'SPL',
          type: 'regular',
          amount: specialAllowance,
          taxability: 'taxable'
        }
      ];
      
      // Create deductions array
      const deductions = [
        {
          componentId: pfComponent?._id,
          name: 'Provident Fund',
          code: 'PF',
          type: 'statutory',
          amount: pfEmployee,
          isStatutory: true,
          statutoryType: 'pf_employee'
        },
        {
          componentId: esiComponent?._id,
          name: 'ESI',
          code: 'ESI',
          type: 'statutory',
          amount: esiEmployee,
          isStatutory: true,
          statutoryType: 'esi_employee'
        },
        {
          name: 'Professional Tax',
          code: 'PT',
          type: 'statutory',
          amount: professionalTax,
          isStatutory: true,
          statutoryType: 'pt'
        },
        {
          name: 'Tax Deducted at Source',
          code: 'TDS',
          type: 'statutory',
          amount: tds,
          isStatutory: true,
          statutoryType: 'tds'
        }
      ];
      
      // Add LOP deduction if applicable
      if (lopDays > 0) {
        const lopAmount = Math.round((basicSalary / workingDays) * lopDays);
        deductions.push({
          name: 'Loss of Pay',
          code: 'LOP',
          type: 'lop',
          amount: lopAmount,
          isStatutory: false
        });
        deductions[deductions.length - 1].amount = lopAmount;
      }
      
      // Recalculate total deductions (including LOP if any)
      const finalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
      const finalNetSalary = grossSalary - finalDeductions;
      
      // Employer contributions
      const employerContributions = [
        {
          name: 'PF Employer Contribution',
          code: 'PF_EMP',
          amount: pfEmployer
        },
        {
          name: 'ESI Employer Contribution',
          code: 'ESI_EMP',
          amount: esiEmployer
        }
      ];
      
      // Create payslip
      const payslip = await Payslip.create({
        employee: employee._id,
        payrollRun: payrollRun._id,
        month,
        year,
        periodStart: startDate,
        periodEnd: endDate,
        employeeSnapshot: {
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          department: employee.department?.name || 'N/A',
          designation: employee.designation?.name || 'N/A',
          joiningDate: employee.joiningDate,
          bankDetails: {
            accountNumber: employee.bankDetails?.accountNumber || `ACC${Math.random().toString().substr(2, 10)}`,
            bankName: employee.bankDetails?.bankName || 'State Bank of India',
            ifscCode: employee.bankDetails?.ifscCode || 'SBIN0001234',
            accountHolderName: `${employee.firstName} ${employee.lastName}`
          },
          panNumber: employee.panNumber || `ABCDE${Math.floor(Math.random() * 10000)}F`,
          uanNumber: employee.uanNumber || Math.random().toString().substr(2, 12),
          esiNumber: employee.esiNumber || Math.random().toString().substr(2, 17)
        },
        salaryStructure: salaryStructure._id,
        salaryStructureName: salaryStructure.name,
        ctc: ctc,
        monthlyGross: grossSalary,
        attendance: {
          totalDays: workingDays,
          workingDays: workingDays,
          presentDays: presentDays,
          absentDays: lopDays,
          lopDays: lopDays,
          holidays: Math.floor(workingDays * 0.1),
          weekOffs: Math.floor(workingDays * 0.15),
          overtimeHours: Math.random() > 0.7 ? Math.floor(Math.random() * 20) : 0
        },
        basicSalary: basicSalary,
        earnings: earnings,
        totalEarnings: grossSalary,
        adjustments: {
          lopDeduction: lopDays > 0 ? Math.round((basicSalary / workingDays) * lopDays) : 0,
          overtimePay: 0,
          shiftAllowance: 0,
          arrears: 0
        },
        deductions: deductions,
        totalDeductions: finalDeductions,
        employerContributions: employerContributions.filter(c => c.amount > 0),
        totalEmployerContributions: employerContributions.reduce((sum, c) => sum + c.amount, 0),
        statutory: {
          pfEmployee: pfEmployee,
          pfEmployer: pfEmployer,
          esiEmployee: esiEmployee,
          esiEmployer: esiEmployer,
          professionalTax: professionalTax,
          tds: tds
        },
        grossSalary: grossSalary,
        netSalary: finalNetSalary,
        paymentMode: 'bank_transfer',
        paymentStatus: status === 'locked' ? 'paid' : 'processed',
        paymentDate: status === 'locked' ? new Date(year, month - 1, 5) : null,
        transactionReference: status === 'locked' ? `TXN${year}${month.toString().padStart(2, '0')}${Math.random().toString().substr(2, 8)}` : null,
        isFinalized: status === 'locked',
        finalizedAt: status === 'locked' ? new Date(year, month - 1, 28) : null,
        generatedBy: adminUser._id,
        remarks: `Payslip for ${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`
      });
      
      payslips.push(payslip);
      
      // Update totals
      totalGrossEarnings += grossSalary;
      totalDeductions += finalDeductions;
      totalNetPay += finalNetSalary;
      pfEmployeeTotal += pfEmployee;
      pfEmployerTotal += pfEmployer;
      esiEmployeeTotal += esiEmployee;
      esiEmployerTotal += esiEmployer;
      ptTotal += professionalTax;
    }
    
    // Update payroll run summary
    payrollRun.summary = {
      totalGrossEarnings,
      totalGrossDeductions: totalDeductions,
      totalNetPay,
      totalEmployerContributions: pfEmployerTotal + esiEmployerTotal,
      pfEmployeeTotal,
      pfEmployerTotal,
      esiEmployeeTotal,
      esiEmployerTotal,
      ptTotal,
      tdsTotal: payslips.reduce((sum, p) => sum + (p.statutory?.tds || 0), 0),
      lopTotal: payslips.reduce((sum, p) => sum + (p.adjustments?.lopDeduction || 0), 0),
      processedCount: eligibleEmployees.length,
      skippedCount: 0,
      errorCount: 0
    };
    
    payrollRun.totalAmount = totalNetPay;
    payrollRun.bankTransferTotal = totalNetPay;
    payrollRun.reportsGenerated = [
      {
        type: 'bank_transfer',
        generatedAt: new Date(year, month - 1, 28)
      },
      {
        type: 'salary_register',
        generatedAt: new Date(year, month - 1, 28)
      },
      {
        type: 'pf_report',
        generatedAt: new Date(year, month - 1, 28)
      },
      {
        type: 'esi_report',
        generatedAt: new Date(year, month - 1, 28)
      },
      {
        type: 'pt_report',
        generatedAt: new Date(year, month - 1, 28)
      }
    ];
    
    await payrollRun.save();
    payrollRuns.push(payrollRun);
  }
  
  console.log(`   ✅ Created ${payrollRuns.length} payroll runs with ${payslips.length} payslips`);
  return { payrollRuns, payslips };
};

// Generate Performance Reviews
const seedPerformanceReviews = async (employees, performanceCycles, hrEmployee) => {
  console.log('⭐ Creating performance reviews...');
  
  const reviews = [];
  const statuses = ['pending', 'needs_review', 'pending_manager_feedback', 'finalized'];
  const ratings = [1, 2, 3, 4, 5];
  const grades = ['A', 'B', 'C', 'D'];
  
  for (const cycle of performanceCycles) {
    if (cycle.status !== 'active' && cycle.status !== 'completed') continue;
    
    for (const employee of employees) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const rating = ratings[Math.floor(Math.random() * ratings.length)];
      const grade = grades[Math.floor(Math.random() * grades.length)];
      
      try {
        // Check if review already exists
        const existingReview = await PerformanceReview.findOne({
          performanceCycle: cycle._id,
          employee: employee._id
        });
        
        if (existingReview) {
          continue; // Skip if already exists
        }
        
        const review = await PerformanceReview.create({
          performanceCycle: cycle._id,
          employee: employee._id,
          finalRating: {
            numeric: status === 'finalized' ? rating : null,
            grade: status === 'finalized' ? grade : null,
            ratingType: 'numeric'
          },
          status: status,
          finalizedBy: status === 'finalized' ? hrEmployee.userId : null,
          finalizedAt: status === 'finalized' ? new Date() : null,
          visibleToEmployee: status === 'finalized',
          visibleAt: status === 'finalized' ? new Date() : null,
          hrComments: status === 'finalized' ? `Performance review completed. Overall rating: ${rating}/5` : '',
          justification: status === 'finalized' ? `Based on goals achievement and manager feedback` : ''
        });
        
        if (review) {
          reviews.push(review);
        }
      } catch (error) {
        // Skip if duplicate or other error
        continue;
      }
    }
  }
  
  console.log(`   ✅ Created ${reviews.length} performance reviews`);
  return reviews;
};

// Generate Resignations and Final Settlements
const seedResignationsAndSettlements = async (employees, adminUser, hrEmployee) => {
  console.log('🚪 Creating resignations and final settlements...');
  
  const resignations = [];
  const settlements = [];
  
  // Select 5-10 employees for resignation (not admin or HR)
  const employeesToResign = employees
    .filter(e => !e.email.includes('admin') && !e.email.includes('hr'))
    .slice(0, Math.min(10, Math.floor(employees.length * 0.1)));
  
  for (const employee of employeesToResign) {
    const resignationDate = new Date();
    resignationDate.setMonth(resignationDate.getMonth() - Math.floor(Math.random() * 6));
    const noticePeriodDays = 30 + Math.floor(Math.random() * 30);
    const lastWorkingDate = new Date(resignationDate);
    lastWorkingDate.setDate(lastWorkingDate.getDate() + noticePeriodDays);
    
    const resignation = await Resignation.create({
      employee: employee._id,
      tentativeLastWorkingDate: lastWorkingDate,
      reason: 'personal_reasons',
      reasonText: 'Personal reasons for resignation',
      noticePeriodDays: noticePeriodDays,
      noticePeriodEndDate: lastWorkingDate,
      expectedRelievingDate: lastWorkingDate,
      status: 'approved',
      approvedBy: hrEmployee.userId,
      approvedAt: new Date(resignationDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      submittedAt: resignationDate,
      minimumServicePeriodMet: true,
      exitSteps: {
        resignation: { status: 'completed', completedAt: resignationDate },
        approval: { status: 'completed', completedAt: new Date(resignationDate.getTime() + 2 * 24 * 60 * 60 * 1000) },
        clearance: { status: 'pending' },
        finalSettlement: { status: 'pending' }
      }
    });
    
    resignations.push(resignation);
    
    // Create final settlement (linked to resignation)
    const settlementLastWorkingDate = resignation.tentativeLastWorkingDate;
    const settlementMonth = settlementLastWorkingDate.getMonth() + 1;
    const settlementYear = settlementLastWorkingDate.getFullYear();
    
    const ctc = 300000 + (Math.random() * 5000000);
    const monthlyGross = Math.round(ctc / 12);
    const salaryDaysWorked = settlementLastWorkingDate.getDate();
    const proratedSalary = Math.round((monthlyGross / 30) * salaryDaysWorked);
    
    const leaveBalance = 15 + Math.floor(Math.random() * 10);
    const leaveEncashment = Math.round((monthlyGross / 30) * leaveBalance * 0.8);
    
    const gratuity = Math.round((monthlyGross * 15 * Math.floor(Math.random() * 10 + 1)) / 26);
    
    const grossPayable = proratedSalary + leaveEncashment + gratuity;
    
    const pfDeduction = Math.round(grossPayable * 0.12);
    const tdsDeduction = Math.round(grossPayable * 0.1);
    const totalRecoveries = Math.round(monthlyGross * 0.1); // Loan/advance recovery
    const totalDeductions = pfDeduction + tdsDeduction + totalRecoveries;
    
    const settlement = await FinalSettlement.create({
      resignation: resignation._id,
      employee: employee._id,
      lastWorkingDate: settlementLastWorkingDate,
      settlementMonth: settlementMonth,
      settlementYear: settlementYear,
      salaryDaysWorked: salaryDaysWorked,
      proratedSalary: proratedSalary,
      payableComponents: [
        {
          name: 'Salary for days worked',
          type: 'earning',
          category: 'salary_days_worked',
          amount: proratedSalary,
          description: `Salary for ${salaryDaysWorked} days worked in the month`,
          calculationDetails: `${monthlyGross}/30 * ${salaryDaysWorked}`
        },
        {
          name: 'Leave Encashment',
          type: 'earning',
          category: 'leave_encashment',
          amount: leaveEncashment,
          description: `Encashment for ${leaveBalance} days of leave balance`,
          calculationDetails: `${monthlyGross}/30 * ${leaveBalance} * 0.8`
        },
        {
          name: 'Gratuity',
          type: 'earning',
          category: 'gratuity',
          amount: gratuity,
          description: 'Gratuity payment as per policy',
          calculationDetails: `${monthlyGross} * 15 * years / 26`
        }
      ],
      grossPayable: grossPayable,
      recoveryComponents: [
        {
          name: 'Loan Recovery',
          type: 'deduction',
          category: 'loan',
          amount: totalRecoveries,
          description: 'Outstanding loan recovery',
          calculationDetails: 'As per loan statement'
        }
      ],
      totalRecoveries: totalRecoveries,
      statutoryDeductions: {
        pf: pfDeduction,
        tds: tdsDeduction,
        other: 0
      },
      totalStatutoryDeductions: pfDeduction + tdsDeduction,
      netSettlementAmount: grossPayable - totalDeductions,
      status: 'paid',
      preparedBy: hrEmployee.userId,
      preparedAt: new Date(settlementLastWorkingDate.getTime() + 1 * 24 * 60 * 60 * 1000),
      verifiedBy: adminUser._id,
      verifiedAt: new Date(settlementLastWorkingDate.getTime() + 2 * 24 * 60 * 60 * 1000),
      paidBy: adminUser._id,
      paidAt: new Date(settlementLastWorkingDate.getTime() + 3 * 24 * 60 * 60 * 1000),
      paymentDetails: {
        paymentDate: new Date(settlementLastWorkingDate.getTime() + 3 * 24 * 60 * 60 * 1000),
        paymentMode: 'bank_transfer',
        transactionId: `SETTLE${settlementYear}${settlementMonth.toString().padStart(2, '0')}${Math.random().toString().substr(2, 8)}`,
        remarks: 'Final settlement processed'
      },
      notes: 'Final settlement completed and paid',
      approvedBy: adminUser._id,
      approvedAt: new Date(settlementLastWorkingDate.getTime() + 2 * 24 * 60 * 60 * 1000)
    });
    
    settlements.push(settlement);
  }
  
  console.log(`   ✅ Created ${resignations.length} resignations and ${settlements.length} final settlements`);
  return { resignations, settlements };
};

// Main seed function
const seedDemoData = async () => {
  try {
    await connectDB();
    
    console.log('\n🎯 Starting Demo Data Seeding...\n');
    
    // Get existing data
    const employees = await Employee.find({}).populate('department designation branch');
    if (employees.length === 0) {
      console.log('❌ No employees found. Please run seedDummyData.js first!');
      process.exit(1);
    }
    
    const adminUser = await User.findOne({ email: 'admin@vaaltic.com' });
    if (!adminUser) {
      console.log('❌ Admin user not found. Please run seedDummyData.js first!');
      process.exit(1);
    }
    
    const hrEmployee = employees.find(e => e.email.includes('hr@vaaltic.com'));
    if (!hrEmployee) {
      console.log('❌ HR employee not found. Please run seedDummyData.js first!');
      process.exit(1);
    }
    
    const salaryStructures = await SalaryStructure.find({ isActive: true });
    if (salaryStructures.length === 0) {
      console.log('❌ No salary structures found. Please run seedDummyData.js first!');
      process.exit(1);
    }
    
    const salaryComponents = await SalaryComponent.find({ isActive: true });
    const performanceCycles = await PerformanceCycle.find({});
    
    // Seed payroll runs and payslips
    const { payrollRuns, payslips } = await seedPayrollRunsAndPayslips(
      employees,
      salaryStructures,
      salaryComponents,
      adminUser
    );
    
    // Seed performance reviews
    const performanceReviews = await seedPerformanceReviews(
      employees,
      performanceCycles,
      hrEmployee
    );
    
    // Seed resignations and settlements
    const { resignations, settlements } = await seedResignationsAndSettlements(
      employees,
      adminUser,
      hrEmployee
    );
    
    console.log('\n✅ Demo Data Seeding Complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Payroll Runs: ${payrollRuns.length}`);
    console.log(`   - Payslips: ${payslips.length}`);
    console.log(`   - Performance Reviews: ${performanceReviews.length}`);
    console.log(`   - Resignations: ${resignations.length}`);
    console.log(`   - Final Settlements: ${settlements.length}`);
    console.log('\n🎉 All demo data has been generated successfully!');
    console.log('\n💡 You can now use the application for client demo.');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding demo data:', error);
    process.exit(1);
  }
};

seedDemoData();

