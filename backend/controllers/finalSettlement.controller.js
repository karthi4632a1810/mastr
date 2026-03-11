import FinalSettlement from '../models/finalSettlement.model.js';
import Resignation from '../models/resignation.model.js';
import Employee from '../models/employee.model.js';
import LeaveRequest from '../models/leaveRequest.model.js';
import LeaveType from '../models/leaveType.model.js';
import { Asset } from '../models/asset.model.js';
import ExpenseClaim from '../models/expense.model.js';
import moment from 'moment';

// Get or create final settlement for a resignation
export const getOrCreateSettlement = async (req, res) => {
  try {
    const { resignationId } = req.params;

    const resignation = await Resignation.findById(resignationId)
      .populate('employee', 'firstName lastName employeeId email ctc salaryStructure joiningDate department designation')
      .populate('employee.department', 'name')
      .populate('employee.designation', 'name');

    if (!resignation) {
      return res.status(404).json({ success: false, message: 'Resignation not found' });
    }

    if (resignation.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Resignation must be approved before creating settlement'
      });
    }

    let settlement = await FinalSettlement.findOne({ resignation: resignationId })
      .populate('employee', 'firstName lastName employeeId email')
      .populate('preparedBy', 'email')
      .populate('verifiedBy', 'email')
      .populate('paidBy', 'email');

    if (!settlement) {
      // Auto-calculate settlement
      const calculated = await calculateSettlement(resignation);
      
      settlement = await FinalSettlement.create({
        resignation: resignationId,
        employee: resignation.employee._id,
        lastWorkingDate: resignation.tentativeLastWorkingDate,
        settlementMonth: moment(resignation.tentativeLastWorkingDate).month() + 1,
        settlementYear: moment(resignation.tentativeLastWorkingDate).year(),
        payableComponents: calculated.payableComponents,
        recoveryComponents: calculated.recoveryComponents,
        statutoryDeductions: calculated.statutoryDeductions,
        salaryDaysWorked: calculated.salaryDaysWorked,
        proratedSalary: calculated.proratedSalary,
        status: 'draft'
      });

      settlement = await FinalSettlement.findById(settlement._id)
        .populate('employee', 'firstName lastName employeeId email')
        .populate('resignation');
    }

    res.json({ success: true, data: settlement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Calculate settlement components
const calculateSettlement = async (resignation) => {
  const employee = resignation.employee;
  const lastWorkingDate = moment(resignation.tentativeLastWorkingDate);
  const today = moment();

  // Get salary details
  const monthlyCtc = employee.ctc / 12;
  const monthlyGross = monthlyCtc;
  const basicSalary = monthlyCtc * 0.4; // Assuming 40% is basic
  const dailyGross = monthlyGross / 30;
  const dailyBasic = basicSalary / 30;

  // Calculate salary days worked (from start of month to LWD)
  const monthStart = lastWorkingDate.clone().startOf('month');
  const salaryDaysWorked = lastWorkingDate.diff(monthStart, 'days') + 1;
  const proratedSalary = (monthlyGross / lastWorkingDate.daysInMonth()) * salaryDaysWorked;

  const payableComponents = [];
  const recoveryComponents = [];

  // 1. Salary for days worked
  payableComponents.push({
    name: 'Salary for Days Worked',
    type: 'earning',
    category: 'salary_days_worked',
    amount: Math.round(proratedSalary),
    description: `Prorated salary for ${salaryDaysWorked} days`,
    calculationDetails: `Monthly Gross: ₹${monthlyGross.toFixed(2)} / ${lastWorkingDate.daysInMonth()} days × ${salaryDaysWorked} days`
  });

  // 2. Leave Encashment
  const leaveTypes = await LeaveType.find({ isActive: true, isLatest: true });
  let totalLeaveEncashment = 0;

  for (const leaveType of leaveTypes) {
    if (leaveType.rules?.encashment?.enabled) {
      const used = await LeaveRequest.aggregate([
        { $match: { employee: employee._id, leaveType: leaveType._id, status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$days' } } }
      ]);

      const usedDays = used[0]?.total || 0;
      const maxDays = leaveType.maxDays || 0;
      const balance = Math.max(0, maxDays - usedDays);

      if (balance > 0) {
        const encashableDays = Math.min(
          balance,
          leaveType.rules.encashment.maxEncashable || balance
        );
        const encashmentAmount = encashableDays * dailyBasic;

        totalLeaveEncashment += encashmentAmount;

        payableComponents.push({
          name: `Leave Encashment - ${leaveType.name}`,
          type: 'earning',
          category: 'leave_encashment',
          amount: Math.round(encashmentAmount),
          description: `${encashableDays} days of ${leaveType.name} encashed`,
          calculationDetails: `${encashableDays} days × ₹${dailyBasic.toFixed(2)} per day`
        });
      }
    }
  }

  // 3. Gratuity (if eligible - 5 years service)
  const serviceYears = lastWorkingDate.diff(moment(employee.joiningDate), 'years', true);
  if (serviceYears >= 5) {
    // Gratuity = (15 * Last drawn basic salary * Tenure in years) / 26
    const gratuityAmount = Math.round((15 * basicSalary * Math.floor(serviceYears)) / 26);
    
    payableComponents.push({
      name: 'Gratuity',
      type: 'earning',
      category: 'gratuity',
      amount: gratuityAmount,
      description: `Gratuity for ${Math.floor(serviceYears)} years of service`,
      calculationDetails: `(15 × ₹${basicSalary.toFixed(2)} × ${Math.floor(serviceYears)} years) / 26`
    });
  }

  // 4. Notice Period Buyout (if company pays extra)
  // This would be based on policy - for now assuming 0

  // 5. Pending Reimbursements
  const pendingReimbursements = await ExpenseClaim.find({
    employee: employee._id,
    status: 'approved',
    paid: false
  });

  if (pendingReimbursements.length > 0) {
    const totalReimbursement = pendingReimbursements.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    payableComponents.push({
      name: 'Pending Reimbursements',
      type: 'earning',
      category: 'reimbursement',
      amount: Math.round(totalReimbursement),
      description: `${pendingReimbursements.length} approved reimbursement(s)`,
      calculationDetails: 'Sum of approved reimbursements'
    });
  }

  // Recoveries

  // 1. Notice Period Shortfall (employee paying buyout)
  const noticePeriodServed = today.diff(moment(resignation.submittedAt), 'days');
  const noticePeriodShortfall = Math.max(0, resignation.noticePeriodDays - noticePeriodServed);
  
  if (noticePeriodShortfall > 0) {
    const shortfallRecovery = noticePeriodShortfall * dailyGross;
    recoveryComponents.push({
      name: 'Notice Period Shortfall Recovery',
      type: 'deduction',
      category: 'notice_period_shortfall',
      amount: Math.round(shortfallRecovery),
      description: `Recovery for ${noticePeriodShortfall} days shortfall`,
      calculationDetails: `${noticePeriodShortfall} days × ₹${dailyGross.toFixed(2)} per day`
    });
  }

  // 2. Asset Not Returned / Damaged
  const assignedAssets = await Asset.find({
    assignedTo: employee._id,
    status: { $in: ['assigned', 'in_use'] }
  });

  // Note: Asset recovery would need to be manually added if not returned
  // This is a placeholder - actual logic would check exit checklist

  // 3. Salary Advances / Loans
  // Placeholder - would integrate with loan/advance module

  // 4. Excess Leave Taken (LOP adjustments)
  // This would be calculated if employee took more leave than available

  // 5. Unreturned Company Documents
  // Placeholder - would check exit checklist

  // Statutory Deductions (pro-rated for partial month)
  const statutoryDeductions = {
    pf: Math.round(Math.min(basicSalary * 0.12, 15000 * 0.12) * (salaryDaysWorked / lastWorkingDate.daysInMonth())),
    esi: monthlyGross <= 21000 ? Math.round(monthlyGross * 0.0075 * (salaryDaysWorked / lastWorkingDate.daysInMonth())) : 0,
    pt: 200, // Standard PT (usually monthly fixed)
    tds: 0, // Would need tax calculation
    other: 0
  };

  return {
    payableComponents,
    recoveryComponents,
    statutoryDeductions,
    salaryDaysWorked,
    proratedSalary
  };
};

// Update settlement
export const updateSettlement = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const { payableComponents, recoveryComponents, statutoryDeductions, notes } = req.body;

    const settlement = await FinalSettlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    if (settlement.status !== 'draft' && settlement.status !== 'prepared') {
      return res.status(400).json({
        success: false,
        message: `Cannot update settlement with status: ${settlement.status}`
      });
    }

    if (payableComponents) settlement.payableComponents = payableComponents;
    if (recoveryComponents) settlement.recoveryComponents = recoveryComponents;
    if (statutoryDeductions) settlement.statutoryDeductions = statutoryDeductions;
    if (notes !== undefined) settlement.notes = notes;

    // Recalculate totals (will be done in pre-save hook)
    await settlement.save();

    const populated = await FinalSettlement.findById(settlement._id)
      .populate('employee', 'firstName lastName employeeId email')
      .populate('resignation');

    res.json({
      success: true,
      message: 'Settlement updated successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add component to settlement
export const addSettlementComponent = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const { name, type, category, amount, description, calculationDetails } = req.body;

    const settlement = await FinalSettlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    const component = {
      name,
      type,
      category: category || 'other',
      amount: parseFloat(amount) || 0,
      description: description || '',
      calculationDetails: calculationDetails || ''
    };

    if (type === 'earning') {
      settlement.payableComponents.push(component);
    } else {
      settlement.recoveryComponents.push(component);
    }

    await settlement.save();

    const populated = await FinalSettlement.findById(settlement._id);

    res.json({
      success: true,
      message: 'Component added successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove component from settlement
export const removeSettlementComponent = async (req, res) => {
  try {
    const { settlementId, componentId } = req.params;
    const { type } = req.query; // 'earning' or 'deduction'

    const settlement = await FinalSettlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    if (type === 'earning') {
      settlement.payableComponents = settlement.payableComponents.filter(
        comp => comp._id.toString() !== componentId
      );
    } else {
      settlement.recoveryComponents = settlement.recoveryComponents.filter(
        comp => comp._id.toString() !== componentId
      );
    }

    await settlement.save();

    const populated = await FinalSettlement.findById(settlement._id);

    res.json({
      success: true,
      message: 'Component removed successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark as Prepared
export const markAsPrepared = async (req, res) => {
  try {
    const { settlementId } = req.params;

    const settlement = await FinalSettlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    settlement.status = 'prepared';
    settlement.preparedBy = req.user._id;
    settlement.preparedAt = new Date();

    await settlement.save();

    const populated = await FinalSettlement.findById(settlement._id)
      .populate('preparedBy', 'email');

    res.json({
      success: true,
      message: 'Settlement marked as prepared',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark as Verified
export const markAsVerified = async (req, res) => {
  try {
    const { settlementId } = req.params;

    const settlement = await FinalSettlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    if (settlement.status !== 'prepared') {
      return res.status(400).json({
        success: false,
        message: 'Settlement must be prepared before verification'
      });
    }

    settlement.status = 'verified';
    settlement.verifiedBy = req.user._id;
    settlement.verifiedAt = new Date();

    await settlement.save();

    const populated = await FinalSettlement.findById(settlement._id)
      .populate('verifiedBy', 'email');

    res.json({
      success: true,
      message: 'Settlement marked as verified',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark as Paid
export const markAsPaid = async (req, res) => {
  try {
    const { settlementId } = req.params;
    const { paymentDate, bankReferenceNumber, transactionId, paymentMode, remarks } = req.body;

    const settlement = await FinalSettlement.findById(settlementId);
    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    if (settlement.status !== 'verified') {
      return res.status(400).json({
        success: false,
        message: 'Settlement must be verified before marking as paid'
      });
    }

    settlement.status = 'paid';
    settlement.paidBy = req.user._id;
    settlement.paidAt = new Date();
    settlement.paymentDetails = {
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      bankReferenceNumber: bankReferenceNumber || '',
      transactionId: transactionId || '',
      paymentMode: paymentMode || 'bank_transfer',
      remarks: remarks || ''
    };

    await settlement.save();

    // Update resignation status
    const resignation = await Resignation.findById(settlement.resignation);
    if (resignation) {
      resignation.exitSteps.finalSettlement.status = 'completed';
      resignation.exitSteps.finalSettlement.completedAt = new Date();
      resignation.status = 'completed';
      await resignation.save();
    }

    const populated = await FinalSettlement.findById(settlement._id)
      .populate('paidBy', 'email');

    // TODO: Send notification to employee
    console.log(`[NOTIFICATION] Final settlement paid for employee`);

    res.json({
      success: true,
      message: 'Settlement marked as paid',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all settlements
export const getSettlements = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status;

    const settlements = await FinalSettlement.find(filter)
      .populate('employee', 'firstName lastName employeeId email')
      .populate('resignation', 'tentativeLastWorkingDate')
      .sort({ createdAt: -1 });

    // Filter by search if provided
    let filtered = settlements;
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = settlements.filter(sett => 
        sett.employee?.firstName?.toLowerCase().includes(searchLower) ||
        sett.employee?.lastName?.toLowerCase().includes(searchLower) ||
        sett.employee?.employeeId?.toLowerCase().includes(searchLower)
      );
    }

    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get employee's own settlement
export const getMySettlement = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const resignation = await Resignation.findOne({
      employee: employee._id,
      status: 'approved'
    }).sort({ submittedAt: -1 });

    if (!resignation) {
      return res.status(404).json({
        success: false,
        message: 'No approved resignation found'
      });
    }

    const settlement = await FinalSettlement.findOne({ resignation: resignation._id })
      .populate('resignation', 'tentativeLastWorkingDate');

    if (!settlement) {
      return res.status(404).json({
        success: false,
        message: 'Settlement not yet prepared'
      });
    }

    res.json({ success: true, data: settlement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate PDF (placeholder - would use PDF library like pdfkit or puppeteer)
export const generateSettlementPDF = async (req, res) => {
  try {
    const { settlementId } = req.params;

    const settlement = await FinalSettlement.findById(settlementId)
      .populate('employee', 'firstName lastName employeeId email department designation')
      .populate('resignation');

    if (!settlement) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }

    // TODO: Generate PDF using pdfkit or similar library
    // For now, return settlement data for frontend to generate PDF
    res.json({
      success: true,
      message: 'PDF generation would be implemented here',
      data: settlement
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

