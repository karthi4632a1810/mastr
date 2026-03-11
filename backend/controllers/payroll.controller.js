import { SalaryComponent, SalaryStructure, PayrollRun, Payslip } from '../models/payroll.model.js';
import Employee from '../models/employee.model.js';
import Attendance from '../models/attendance.model.js';
import LeaveRequest from '../models/leaveRequest.model.js';
import LeaveType from '../models/leaveType.model.js';
import Shift from '../models/shift.model.js';
import ShiftAssignment from '../models/shiftAssignment.model.js';
import moment from 'moment';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// ===== STATUTORY CONFIGURATION =====
const STATUTORY_CONFIG = {
  pf: {
    basicWageCap: 15000,
    employeeRate: 12,
    employerRate: 12,
    pensionRate: 8.33,
    epsRate: 3.67
  },
  esi: {
    grossCap: 21000,
    employeeRate: 0.75,
    employerRate: 3.25
  },
  pt: {
    // Maharashtra PT slabs as default
    slabs: [
      { from: 0, to: 7500, amount: 0 },
      { from: 7501, to: 10000, amount: 175 },
      { from: 10001, to: Infinity, amount: 200 }
    ]
  }
};

// ===== SALARY COMPONENTS (Enhanced) =====

// Get all salary components
export const getSalaryComponents = async (req, res) => {
  try {
    const { type, category, includeInactive = 'false' } = req.query;
    const filter = {};
    
    if (includeInactive !== 'true') {
      filter.isActive = true;
    }
    if (type) filter.type = type;
    if (category) filter.category = category;

    const components = await SalaryComponent.find(filter).sort({ type: 1, sortOrder: 1, name: 1 });
    
    // Group by type for convenience
    const grouped = {
      earnings: components.filter(c => c.type === 'earning'),
      deductions: components.filter(c => c.type === 'deduction')
    };

    res.json({ success: true, data: components, grouped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single salary component
export const getSalaryComponent = async (req, res) => {
  try {
    const component = await SalaryComponent.findById(req.params.id);
    if (!component) {
      return res.status(404).json({ success: false, message: 'Salary component not found' });
    }
    res.json({ success: true, data: component });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create salary component
export const createSalaryComponent = async (req, res) => {
  try {
    // Check for duplicate code
    const existing = await SalaryComponent.findOne({ code: req.body.code?.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Component code already exists' });
    }

    // Validate statutory configuration
    if (req.body.isStatutory && req.body.statutoryType !== 'none') {
      const validation = validateStatutoryComponent(req.body);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.message });
      }
    }

    const component = await SalaryComponent.create(req.body);
    res.status(201).json({ success: true, message: 'Salary component created', data: component });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update salary component
export const updateSalaryComponent = async (req, res) => {
  try {
    const component = await SalaryComponent.findById(req.params.id);
    if (!component) {
      return res.status(404).json({ success: false, message: 'Salary component not found' });
    }

    // Check if component is in use and prevent critical changes
    const structuresUsingComponent = await SalaryStructure.countDocuments({
      $or: [
        { 'earnings.component': component._id },
        { 'deductions.component': component._id }
      ],
      isActive: true
    });

    if (structuresUsingComponent > 0) {
      // Prevent changing type or statutory status for in-use components
      if (req.body.type && req.body.type !== component.type) {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot change type. Component is used in ${structuresUsingComponent} active structure(s)` 
        });
      }
      if (req.body.isStatutory !== undefined && req.body.isStatutory !== component.isStatutory) {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot change statutory status. Component is used in ${structuresUsingComponent} active structure(s)` 
        });
      }
    }

    // Prevent deactivating mandatory components
    if (component.isMandatory && req.body.isActive === false) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot deactivate mandatory component' 
      });
    }

    Object.assign(component, req.body);
    await component.save();

    res.json({ success: true, message: 'Salary component updated', data: component });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete salary component (soft delete)
export const deleteSalaryComponent = async (req, res) => {
  try {
    const component = await SalaryComponent.findById(req.params.id);
    if (!component) {
      return res.status(404).json({ success: false, message: 'Salary component not found' });
    }

    // Prevent deleting mandatory components
    if (component.isMandatory) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete mandatory component' 
      });
    }

    // Check if component is in use
    const structuresUsingComponent = await SalaryStructure.countDocuments({
      $or: [
        { 'earnings.component': component._id },
        { 'deductions.component': component._id }
      ],
      isActive: true
    });

    if (structuresUsingComponent > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete. Component is used in ${structuresUsingComponent} active structure(s)` 
      });
    }

    component.isActive = false;
    await component.save();

    res.json({ success: true, message: 'Salary component deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Validate statutory component configuration
const validateStatutoryComponent = (component) => {
  const { statutoryType, statutoryConfig } = component;

  if (statutoryType === 'pf_employee' || statutoryType === 'pf_employer') {
    if (statutoryConfig?.pfRate && (statutoryConfig.pfRate < 0 || statutoryConfig.pfRate > 100)) {
      return { valid: false, message: 'PF rate must be between 0 and 100%' };
    }
  }

  if (statutoryType === 'esi_employee' || statutoryType === 'esi_employer') {
    if (statutoryConfig?.esiGrossCap && statutoryConfig.esiGrossCap < 0) {
      return { valid: false, message: 'ESI gross cap must be positive' };
    }
  }

  return { valid: true };
};

// ===== SALARY STRUCTURES (Enhanced) =====

// Get all salary structures
export const getSalaryStructures = async (req, res) => {
  try {
    const { includeInactive = 'false', includeHistory = 'false', category } = req.query;
    const filter = {};
    
    if (includeHistory !== 'true') {
      filter.isLatest = true;
    }
    if (includeInactive !== 'true') {
      filter.isActive = true;
    }
    if (category) filter.category = category;

    const structures = await SalaryStructure.find(filter)
      .populate('earnings.component', 'name code type category calculationType taxability isStatutory statutoryType')
      .populate('deductions.component', 'name code type category calculationType taxability isStatutory statutoryType')
      .populate('createdBy', 'email')
      .populate('clonedFrom', 'name code')
      .sort({ category: 1, name: 1 });

    res.json({ success: true, data: structures });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single salary structure
export const getSalaryStructure = async (req, res) => {
  try {
    const structure = await SalaryStructure.findById(req.params.id)
      .populate('earnings.component')
      .populate('deductions.component')
      .populate('createdBy', 'email')
      .populate('previousVersion', 'name version');

    if (!structure) {
      return res.status(404).json({ success: false, message: 'Salary structure not found' });
    }

    res.json({ success: true, data: structure });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create salary structure
export const createSalaryStructure = async (req, res) => {
  try {
    // Check for duplicate code
    const existing = await SalaryStructure.findOne({ 
      code: req.body.code?.toUpperCase(),
      isLatest: true 
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Structure code already exists' });
    }

    // Validate structure components
    const validation = await validateSalaryStructure(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message, errors: validation.errors });
    }

    const structureData = {
      ...req.body,
      version: 1,
      isLatest: true,
      createdBy: req.user._id
    };

    const structure = await SalaryStructure.create(structureData);
    
    const populated = await SalaryStructure.findById(structure._id)
      .populate('earnings.component', 'name code type category')
      .populate('deductions.component', 'name code type category');

    res.status(201).json({ success: true, message: 'Salary structure created', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update salary structure (with version tracking)
export const updateSalaryStructure = async (req, res) => {
  try {
    const current = await SalaryStructure.findById(req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Salary structure not found' });
    }

    // Validate structure components
    const validation = await validateSalaryStructure(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message, errors: validation.errors });
    }

    // Check for code uniqueness if changing
    if (req.body.code && req.body.code !== current.code) {
      const existing = await SalaryStructure.findOne({ 
        code: req.body.code.toUpperCase(),
        isLatest: true,
        _id: { $ne: current._id }
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Structure code already exists' });
      }
    }

    // Create new version
    const newVersion = (current.version || 1) + 1;
    const versionGroup = current.versionGroup || current._id;

    const newStructure = {
      ...current.toObject(),
      ...req.body,
      _id: new mongoose.Types.ObjectId(),
      version: newVersion,
      previousVersion: current._id,
      versionGroup,
      isLatest: true,
      createdBy: req.user._id,
      createdAt: undefined,
      updatedAt: undefined
    };

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await SalaryStructure.updateOne(
        { _id: current._id },
        { $set: { isLatest: false } },
        { session }
      );
      
      const [created] = await SalaryStructure.create([newStructure], { session });
      await session.commitTransaction();

      const populated = await SalaryStructure.findById(created._id)
        .populate('earnings.component', 'name code type category')
        .populate('deductions.component', 'name code type category');

      res.json({ success: true, message: 'Salary structure updated (new version created)', data: populated });
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Clone salary structure
export const cloneSalaryStructure = async (req, res) => {
  try {
    const source = await SalaryStructure.findById(req.params.id);
    if (!source) {
      return res.status(404).json({ success: false, message: 'Source salary structure not found' });
    }

    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Name and code are required for cloning' });
    }

    // Check for duplicate code
    const existing = await SalaryStructure.findOne({ 
      code: code.toUpperCase(),
      isLatest: true 
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Structure code already exists' });
    }

    const clonedData = {
      name,
      code: code.toUpperCase(),
      description: req.body.description || `Cloned from ${source.name}`,
      category: req.body.category || source.category,
      earnings: source.earnings,
      deductions: source.deductions,
      pfApplicable: source.pfApplicable,
      esiApplicable: source.esiApplicable,
      ptApplicable: source.ptApplicable,
      tdsApplicable: source.tdsApplicable,
      minCtc: source.minCtc,
      maxCtc: source.maxCtc,
      version: 1,
      isLatest: true,
      isActive: true,
      createdBy: req.user._id,
      clonedFrom: source._id
    };

    const cloned = await SalaryStructure.create(clonedData);
    
    const populated = await SalaryStructure.findById(cloned._id)
      .populate('earnings.component', 'name code type category')
      .populate('deductions.component', 'name code type category')
      .populate('clonedFrom', 'name code');

    res.status(201).json({ success: true, message: 'Salary structure cloned', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete/Deactivate salary structure
export const deleteSalaryStructure = async (req, res) => {
  try {
    const structure = await SalaryStructure.findById(req.params.id);
    if (!structure) {
      return res.status(404).json({ success: false, message: 'Salary structure not found' });
    }

    // Check if structure is assigned to any employees
    const employeesUsingStructure = await Employee.countDocuments({ 
      salaryStructure: structure._id,
      status: 'active'
    });

    if (employeesUsingStructure > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete. Structure is assigned to ${employeesUsingStructure} active employee(s)` 
      });
    }

    structure.isActive = false;
    await structure.save();

    res.json({ success: true, message: 'Salary structure deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Validate salary structure
const validateSalaryStructure = async (structure) => {
  const errors = [];

  // Check if basic salary component exists in earnings
  const hasBasic = structure.earnings?.some(e => {
    // We need to check if component exists and is basic category
    return e.component && e.isEnabled !== false;
  });

  if (!structure.earnings || structure.earnings.length === 0) {
    errors.push('At least one earning component is required');
  }

  // Validate component IDs exist
  if (structure.earnings) {
    for (const earning of structure.earnings) {
      const component = await SalaryComponent.findById(earning.component);
      if (!component) {
        errors.push(`Earning component ${earning.component} not found`);
      } else if (component.type !== 'earning') {
        errors.push(`Component ${component.name} is not an earning type`);
      }
    }
  }

  if (structure.deductions) {
    for (const deduction of structure.deductions) {
      const component = await SalaryComponent.findById(deduction.component);
      if (!component) {
        errors.push(`Deduction component ${deduction.component} not found`);
      } else if (component.type !== 'deduction') {
        errors.push(`Component ${component.name} is not a deduction type`);
      }
    }
  }

  // Validate statutory compliance
  if (structure.pfApplicable) {
    const hasPfDeduction = structure.deductions?.some(async d => {
      const comp = await SalaryComponent.findById(d.component);
      return comp?.statutoryType?.startsWith('pf_');
    });
    // Note: This is a warning, not an error
  }

  return {
    valid: errors.length === 0,
    message: errors.length > 0 ? errors[0] : null,
    errors
  };
};

// Get structure version history
export const getStructureVersionHistory = async (req, res) => {
  try {
    const current = await SalaryStructure.findById(req.params.id);
    if (!current) {
      return res.status(404).json({ success: false, message: 'Salary structure not found' });
    }

    const versionGroup = current.versionGroup || current._id;
    
    const versions = await SalaryStructure.find({ versionGroup })
      .populate('createdBy', 'email')
      .sort({ version: -1 });

    res.json({ success: true, data: versions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Calculate salary preview
export const calculateSalaryPreview = async (req, res) => {
  try {
    const { structureId, ctc, basic } = req.body;

    const structure = await SalaryStructure.findById(structureId)
      .populate('earnings.component')
      .populate('deductions.component');

    if (!structure) {
      return res.status(404).json({ success: false, message: 'Salary structure not found' });
    }

    const calculatedBasic = basic || (ctc * 0.4); // Default 40% of CTC as basic
    const result = {
      ctc,
      basic: calculatedBasic,
      earnings: [],
      deductions: [],
      totalEarnings: 0,
      totalDeductions: 0,
      grossSalary: 0,
      netSalary: 0,
      employerContributions: 0
    };

    // Calculate earnings
    for (const item of structure.earnings) {
      if (!item.isEnabled) continue;
      
      const component = item.component;
      let amount = 0;

      const calcType = item.calculationType === 'use_default' ? component.calculationType : item.calculationType;
      const value = item.value || component.defaultValue;

      switch (calcType) {
        case 'fixed':
          amount = value;
          break;
        case 'percentage_of_basic':
          amount = (calculatedBasic * value) / 100;
          break;
        case 'percentage_of_ctc':
          amount = (ctc * value) / 100;
          break;
        case 'formula':
          // Simple formula evaluation (in production, use a proper parser)
          const formula = item.formula || component.formula || '';
          amount = evaluateFormula(formula, { BASIC: calculatedBasic, CTC: ctc });
          break;
      }

      // Apply rounding
      amount = applyRounding(amount, component.rounding, component.roundingPrecision);

      // Apply min/max constraints
      if (component.minAmount !== null) amount = Math.max(amount, component.minAmount);
      if (component.maxAmount !== null) amount = Math.min(amount, component.maxAmount);

      result.earnings.push({
        name: component.name,
        code: component.code,
        amount: Number(amount.toFixed(2)),
        taxability: component.taxability
      });
      result.totalEarnings += amount;
    }

    // Calculate deductions
    for (const item of structure.deductions) {
      if (!item.isEnabled) continue;
      
      const component = item.component;
      let amount = 0;
      let isEmployerContribution = false;

      // Handle statutory calculations
      if (component.isStatutory) {
        const statutoryResult = calculateStatutoryDeduction(
          component,
          result.totalEarnings,
          calculatedBasic,
          structure
        );
        amount = statutoryResult.amount;
        isEmployerContribution = statutoryResult.isEmployerContribution;
      } else {
        const calcType = item.calculationType === 'use_default' ? component.calculationType : item.calculationType;
        const value = item.value || component.defaultValue;

        switch (calcType) {
          case 'fixed':
            amount = value;
            break;
          case 'percentage_of_basic':
            amount = (calculatedBasic * value) / 100;
            break;
          case 'percentage_of_ctc':
            amount = (ctc * value) / 100;
            break;
          case 'formula':
            const formula = item.formula || component.formula || '';
            amount = evaluateFormula(formula, { BASIC: calculatedBasic, CTC: ctc, GROSS: result.totalEarnings });
            break;
        }
      }

      // Apply rounding
      amount = applyRounding(amount, component.rounding, component.roundingPrecision);

      if (isEmployerContribution) {
        result.employerContributions += amount;
      } else {
        result.deductions.push({
          name: component.name,
          code: component.code,
          amount: Number(amount.toFixed(2)),
          isStatutory: component.isStatutory,
          statutoryType: component.statutoryType
        });
        result.totalDeductions += amount;
      }
    }

    result.grossSalary = Number(result.totalEarnings.toFixed(2));
    result.netSalary = Number((result.totalEarnings - result.totalDeductions).toFixed(2));
    result.employerContributions = Number(result.employerContributions.toFixed(2));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Calculate statutory deduction
const calculateStatutoryDeduction = (component, grossSalary, basicSalary, structure) => {
  const { statutoryType, statutoryConfig } = component;
  let amount = 0;
  let isEmployerContribution = false;

  switch (statutoryType) {
    case 'pf_employee':
      if (structure.pfApplicable) {
        const pfBasic = Math.min(basicSalary, statutoryConfig?.pfBasicWageCap || STATUTORY_CONFIG.pf.basicWageCap);
        amount = (pfBasic * (statutoryConfig?.pfRate || STATUTORY_CONFIG.pf.employeeRate)) / 100;
      }
      break;

    case 'pf_employer':
      if (structure.pfApplicable) {
        const pfBasic = Math.min(basicSalary, statutoryConfig?.pfBasicWageCap || STATUTORY_CONFIG.pf.basicWageCap);
        amount = (pfBasic * (statutoryConfig?.pfRate || STATUTORY_CONFIG.pf.employerRate)) / 100;
        isEmployerContribution = true;
      }
      break;

    case 'esi_employee':
      if (structure.esiApplicable) {
        const esiCap = statutoryConfig?.esiGrossCap || STATUTORY_CONFIG.esi.grossCap;
        if (grossSalary <= esiCap) {
          amount = (grossSalary * (statutoryConfig?.esiEmployeeRate || STATUTORY_CONFIG.esi.employeeRate)) / 100;
        }
      }
      break;

    case 'esi_employer':
      if (structure.esiApplicable) {
        const esiCap = statutoryConfig?.esiGrossCap || STATUTORY_CONFIG.esi.grossCap;
        if (grossSalary <= esiCap) {
          amount = (grossSalary * (statutoryConfig?.esiEmployerRate || STATUTORY_CONFIG.esi.employerRate)) / 100;
        }
        isEmployerContribution = true;
      }
      break;

    case 'pt':
      if (structure.ptApplicable) {
        const ptSlabs = statutoryConfig?.ptSlabs || STATUTORY_CONFIG.pt.slabs;
        for (const slab of ptSlabs) {
          if (grossSalary >= slab.from && grossSalary <= (slab.to || Infinity)) {
            amount = slab.amount;
            break;
          }
        }
      }
      break;
  }

  return { amount, isEmployerContribution };
};

// Simple formula evaluator
const evaluateFormula = (formula, variables) => {
  try {
    if (!formula) return 0;
    let expression = formula.toUpperCase();
    
    for (const [key, value] of Object.entries(variables)) {
      expression = expression.replace(new RegExp(key, 'g'), value);
    }
    
    // Only allow safe mathematical operations
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      return 0;
    }
    
    return eval(expression) || 0;
  } catch {
    return 0;
  }
};

// Apply rounding
const applyRounding = (value, roundingType, precision = 0) => {
  const factor = Math.pow(10, precision);
  switch (roundingType) {
    case 'round':
      return Math.round(value * factor) / factor;
    case 'floor':
      return Math.floor(value * factor) / factor;
    case 'ceil':
      return Math.ceil(value * factor) / factor;
    default:
      return value;
  }
};

// Get statutory configuration
export const getStatutoryConfig = async (req, res) => {
  try {
    res.json({
      success: true,
      data: STATUTORY_CONFIG
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Seed default salary components
export const seedDefaultComponents = async (req, res) => {
  try {
    const existingCount = await SalaryComponent.countDocuments();
    if (existingCount > 0) {
      return res.status(400).json({ success: false, message: 'Components already exist' });
    }

    const defaultComponents = [
      // Earnings
      { name: 'Basic Pay', code: 'BASIC', type: 'earning', category: 'basic', calculationType: 'percentage_of_ctc', defaultValue: 40, taxability: 'taxable', isMandatory: true, sortOrder: 1 },
      { name: 'House Rent Allowance', code: 'HRA', type: 'earning', category: 'hra', calculationType: 'percentage_of_basic', defaultValue: 50, taxability: 'partially_taxable', sortOrder: 2 },
      { name: 'Conveyance Allowance', code: 'CONV', type: 'earning', category: 'conveyance', calculationType: 'fixed', defaultValue: 1600, taxability: 'exempt', taxExemptLimit: 1600, sortOrder: 3 },
      { name: 'Medical Allowance', code: 'MED', type: 'earning', category: 'medical', calculationType: 'fixed', defaultValue: 1250, taxability: 'exempt', taxExemptLimit: 15000, sortOrder: 4 },
      { name: 'Special Allowance', code: 'SPECIAL', type: 'earning', category: 'special', calculationType: 'percentage_of_ctc', defaultValue: 0, taxability: 'taxable', sortOrder: 5 },
      { name: 'Bonus', code: 'BONUS', type: 'earning', category: 'bonus', calculationType: 'percentage_of_basic', defaultValue: 8.33, taxability: 'taxable', isRecurring: false, sortOrder: 6 },
      
      // Deductions
      { name: 'PF Employee Contribution', code: 'PF_EE', type: 'deduction', category: 'pf', calculationType: 'percentage_of_basic', defaultValue: 12, isStatutory: true, statutoryType: 'pf_employee', isMandatory: true, sortOrder: 1 },
      { name: 'PF Employer Contribution', code: 'PF_ER', type: 'deduction', category: 'pf', calculationType: 'percentage_of_basic', defaultValue: 12, isStatutory: true, statutoryType: 'pf_employer', showInPayslip: false, affectsCtc: true, sortOrder: 2 },
      { name: 'ESI Employee Contribution', code: 'ESI_EE', type: 'deduction', category: 'esi', calculationType: 'percentage_of_basic', defaultValue: 0.75, isStatutory: true, statutoryType: 'esi_employee', sortOrder: 3 },
      { name: 'ESI Employer Contribution', code: 'ESI_ER', type: 'deduction', category: 'esi', calculationType: 'percentage_of_basic', defaultValue: 3.25, isStatutory: true, statutoryType: 'esi_employer', showInPayslip: false, affectsCtc: true, sortOrder: 4 },
      { name: 'Professional Tax', code: 'PT', type: 'deduction', category: 'pt', calculationType: 'fixed', defaultValue: 200, isStatutory: true, statutoryType: 'pt', sortOrder: 5 },
      { name: 'TDS', code: 'TDS', type: 'deduction', category: 'tds', calculationType: 'fixed', defaultValue: 0, isStatutory: true, statutoryType: 'tds', sortOrder: 6 },
      { name: 'Loan Deduction', code: 'LOAN', type: 'deduction', category: 'loan', calculationType: 'fixed', defaultValue: 0, isRecurring: false, sortOrder: 7 },
    ];

    await SalaryComponent.insertMany(defaultComponents);

    res.json({ success: true, message: 'Default salary components created', count: defaultComponents.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== ENHANCED PAYROLL PROCESSING (Story 8.3) =====

// Get payroll runs
export const getPayrollRuns = async (req, res) => {
  try {
    const { month, year, status } = req.query;
    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;

    const runs = await PayrollRun.find(filter)
      .populate('processedBy', 'email')
      .populate('lockedBy', 'email')
      .populate('validationRun.ranBy', 'email')
      .sort({ year: -1, month: -1 });

    res.json({ success: true, data: runs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single payroll run with details
export const getPayrollRunDetails = async (req, res) => {
  try {
    const run = await PayrollRun.findById(req.params.id)
      .populate('processedBy', 'email')
      .populate('lockedBy', 'email')
      .populate('validationRun.ranBy', 'email')
      .populate('validationErrors.employee', 'employeeId firstName lastName')
      .populate('validationErrors.resolvedBy', 'email')
      .populate('excludedEmployees.employee', 'employeeId firstName lastName');

    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    // Get payslip summary
    const payslipStats = await Payslip.aggregate([
      { $match: { payrollRun: run._id } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalNet: { $sum: '$netSalary' },
          totalGross: { $sum: '$grossSalary' }
        }
      }
    ]);

    res.json({ 
      success: true, 
      data: { 
        run, 
        payslipStats: payslipStats[0] || { count: 0, totalNet: 0, totalGross: 0 } 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create payroll run
export const createPayrollRun = async (req, res) => {
  try {
    const { month, year, remarks } = req.body;
    
    const existing = await PayrollRun.findOne({ month, year });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Payroll run already exists for this month',
        existingRunId: existing._id
      });
    }

    const periodStart = moment(`${year}-${month}-01`).startOf('month').toDate();
    const periodEnd = moment(periodStart).endOf('month').toDate();

    const payrollRun = await PayrollRun.create({
      month,
      year,
      periodStart,
      periodEnd,
      status: 'draft',
      processedBy: req.user._id,
      remarks,
      history: [{
        action: 'created',
        performedBy: req.user._id,
        performedAt: new Date(),
        details: { month, year }
      }]
    });

    res.status(201).json({ success: true, message: 'Payroll run created', data: payrollRun });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Pre-Payroll Validation/Checklist
export const runPrePayrollValidation = async (req, res) => {
  try {
    const payrollRun = await PayrollRun.findById(req.params.id);
    if (!payrollRun) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    if (payrollRun.isLocked) {
      return res.status(400).json({ success: false, message: 'Payroll is locked and cannot be validated' });
    }

    payrollRun.status = 'validating';
    await payrollRun.save();

    const validationErrors = [];
    const startDate = moment(payrollRun.periodStart);
    const endDate = moment(payrollRun.periodEnd);

    // Get all active employees
    const employees = await Employee.find({ 
      status: 'active',
      joiningDate: { $lte: endDate.toDate() }
    })
      .populate('department', 'name')
      .populate('designation', 'name')
      .populate('salaryStructure');

    let passed = 0;
    let failed = 0;
    let warnings = 0;

    for (const employee of employees) {
      const employeeErrors = [];

      // 1. Check salary structure assignment
      if (!employee.salaryStructure) {
        employeeErrors.push({
          employee: employee._id,
          employeeId: employee.employeeId,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          errorType: 'missing_salary_structure',
          message: 'No salary structure assigned',
          severity: 'error'
        });
      }

      // 2. Check CTC
      if (!employee.ctc || employee.ctc <= 0) {
        employeeErrors.push({
          employee: employee._id,
          employeeId: employee.employeeId,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          errorType: 'missing_ctc',
          message: 'CTC not set or invalid',
          severity: 'error'
        });
      }

      // 3. Check effective date validity
      if (employee.salaryEffectiveFrom) {
        const effectiveDate = moment(employee.salaryEffectiveFrom);
        if (effectiveDate.isAfter(endDate)) {
          employeeErrors.push({
            employee: employee._id,
            employeeId: employee.employeeId,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            errorType: 'invalid_effective_date',
            message: `Salary effective from ${effectiveDate.format('DD/MM/YYYY')} is after payroll period`,
            severity: 'warning'
          });
        }
      }

      // 4. Check attendance data
      const attendanceRecords = await Attendance.find({
        employee: employee._id,
        date: { $gte: startDate.toDate(), $lte: endDate.toDate() }
      });

      const workingDays = calculateWorkingDays(startDate, endDate);
      if (attendanceRecords.length < workingDays * 0.5) { // Less than 50% attendance records
        employeeErrors.push({
          employee: employee._id,
          employeeId: employee.employeeId,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          errorType: 'missing_attendance',
          message: `Only ${attendanceRecords.length} attendance records found for ${workingDays} working days`,
          severity: 'warning'
        });
      }

      // 5. Check shift assignments
      const shiftAssignments = await ShiftAssignment.find({
        employee: employee._id,
        date: { $gte: startDate.toDate(), $lte: endDate.toDate() }
      });

      if (shiftAssignments.length === 0 && attendanceRecords.length === 0) {
        employeeErrors.push({
          employee: employee._id,
          employeeId: employee.employeeId,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          errorType: 'shift_mismatch',
          message: 'No shift assignments or attendance records found',
          severity: 'warning'
        });
      }

      // 6. Check statutory configuration
      if (employee.salaryStructure) {
        const structure = await SalaryStructure.findById(employee.salaryStructure._id || employee.salaryStructure);
        if (structure) {
          const monthlyGross = (employee.ctc || 0) / 12;
          
          // Check ESI eligibility
          if (structure.esiApplicable && monthlyGross > STATUTORY_CONFIG.esi.grossCap) {
            employeeErrors.push({
              employee: employee._id,
              employeeId: employee.employeeId,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              errorType: 'statutory_mismatch',
              message: `ESI is marked applicable but gross (₹${monthlyGross.toFixed(0)}) exceeds cap (₹${STATUTORY_CONFIG.esi.grossCap})`,
              severity: 'warning'
            });
          }
        }
      }

      // 7. Check leave balance consistency
      const approvedLeaves = await LeaveRequest.find({
        employee: employee._id,
        status: 'approved',
        startDate: { $lte: endDate.toDate() },
        endDate: { $gte: startDate.toDate() }
      }).populate('leaveType');

      for (const leave of approvedLeaves) {
        if (leave.leaveType && !leave.leaveType.isPaid) {
          // This is LOP leave
          continue;
        }
      }

      // Aggregate errors
      if (employeeErrors.length > 0) {
        const hasError = employeeErrors.some(e => e.severity === 'error');
        if (hasError) {
          failed++;
        } else {
          warnings++;
          passed++; // Warnings still count as passed with caution
        }
        validationErrors.push(...employeeErrors);
      } else {
        passed++;
      }
    }

    // Update payroll run with validation results
    payrollRun.validationErrors = validationErrors;
    payrollRun.validationRun = {
      ranAt: new Date(),
      ranBy: req.user._id,
      totalChecked: employees.length,
      passed,
      failed,
      warnings
    };
    payrollRun.status = failed === 0 ? 'validated' : 'draft';
    payrollRun.totalEmployees = employees.length;
    payrollRun.eligibleEmployees = passed;

    payrollRun.history.push({
      action: 'validation_run',
      performedBy: req.user._id,
      performedAt: new Date(),
      details: { totalChecked: employees.length, passed, failed, warnings }
    });

    await payrollRun.save();

    res.json({
      success: true,
      message: failed === 0 ? 'Validation passed' : `Validation completed with ${failed} errors`,
      data: {
        totalEmployees: employees.length,
        passed,
        failed,
        warnings,
        canProceed: failed === 0,
        errors: validationErrors.filter(e => e.severity === 'error'),
        warningsList: validationErrors.filter(e => e.severity === 'warning')
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Calculate working days (excluding weekends)
const calculateWorkingDays = (start, end) => {
  let count = 0;
  const current = moment(start);
  while (current.isSameOrBefore(end)) {
    const dayOfWeek = current.day();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      count++;
    }
    current.add(1, 'day');
  }
  return count;
};

// Resolve validation error
export const resolveValidationError = async (req, res) => {
  try {
    const { id, errorId } = req.params;
    const { resolution } = req.body;

    const payrollRun = await PayrollRun.findById(id);
    if (!payrollRun) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    const error = payrollRun.validationErrors.id(errorId);
    if (!error) {
      return res.status(404).json({ success: false, message: 'Validation error not found' });
    }

    error.isResolved = true;
    error.resolvedAt = new Date();
    error.resolvedBy = req.user._id;

    payrollRun.history.push({
      action: 'error_resolved',
      performedBy: req.user._id,
      performedAt: new Date(),
      details: { errorId, resolution }
    });

    await payrollRun.save();

    res.json({ success: true, message: 'Error marked as resolved' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Enhanced Process Payroll
export const processPayroll = async (req, res) => {
  try {
    const payrollRun = await PayrollRun.findById(req.params.id);
    if (!payrollRun) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    if (payrollRun.isLocked) {
      return res.status(400).json({ success: false, message: 'Payroll is locked' });
    }

    if (payrollRun.status === 'completed' || payrollRun.status === 'locked') {
      return res.status(400).json({ success: false, message: 'Payroll already processed' });
    }

    // Check for unresolved errors
    const unresolvedErrors = payrollRun.validationErrors?.filter(e => 
      e.severity === 'error' && !e.isResolved
    ) || [];

    if (unresolvedErrors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot process: ${unresolvedErrors.length} unresolved validation errors`,
        errors: unresolvedErrors
      });
    }

    payrollRun.status = 'processing';
    await payrollRun.save();

    const startDate = moment(payrollRun.periodStart);
    const endDate = moment(payrollRun.periodEnd);

    // Get eligible employees (those without unresolved errors)
    const errorEmployeeIds = unresolvedErrors.map(e => e.employee?.toString());
    
    const employees = await Employee.find({ 
      status: 'active',
      joiningDate: { $lte: endDate.toDate() },
      salaryStructure: { $ne: null },
      ctc: { $gt: 0 }
    })
      .populate('department', 'name')
      .populate('designation', 'name')
      .populate('salaryStructure');

    const summary = {
      totalGrossEarnings: 0,
      totalGrossDeductions: 0,
      totalNetPay: 0,
      totalEmployerContributions: 0,
      pfEmployeeTotal: 0,
      pfEmployerTotal: 0,
      esiEmployeeTotal: 0,
      esiEmployerTotal: 0,
      ptTotal: 0,
      tdsTotal: 0,
      lopTotal: 0,
      overtimeTotal: 0,
      shiftAllowanceTotal: 0,
      arrearsTotal: 0,
      processedCount: 0,
      skippedCount: 0,
      errorCount: 0
    };

    const payslips = [];
    const excludedEmployees = [];

    for (const employee of employees) {
      try {
        const payslipData = await calculateEmployeePayslip(
          employee, 
          payrollRun, 
          startDate, 
          endDate
        );

        if (!payslipData) {
          excludedEmployees.push({
            employee: employee._id,
            reason: 'Could not calculate payslip'
          });
          summary.skippedCount++;
          continue;
        }

        // Delete existing payslip for this employee/month if any
        await Payslip.deleteOne({
          employee: employee._id,
          month: payrollRun.month,
          year: payrollRun.year
        });

        // Create new payslip
        const payslip = await Payslip.create({
          ...payslipData,
          payrollRun: payrollRun._id,
          month: payrollRun.month,
          year: payrollRun.year,
          periodStart: startDate.toDate(),
          periodEnd: endDate.toDate(),
          generatedBy: req.user._id
        });

        payslips.push(payslip);

        // Update summary
        summary.totalGrossEarnings += payslipData.grossSalary;
        summary.totalGrossDeductions += payslipData.totalDeductions;
        summary.totalNetPay += payslipData.netSalary;
        summary.totalEmployerContributions += payslipData.totalEmployerContributions || 0;
        summary.pfEmployeeTotal += payslipData.statutory?.pfEmployee || 0;
        summary.pfEmployerTotal += payslipData.statutory?.pfEmployer || 0;
        summary.esiEmployeeTotal += payslipData.statutory?.esiEmployee || 0;
        summary.esiEmployerTotal += payslipData.statutory?.esiEmployer || 0;
        summary.ptTotal += payslipData.statutory?.professionalTax || 0;
        summary.tdsTotal += payslipData.statutory?.tds || 0;
        summary.lopTotal += payslipData.adjustments?.lopDeduction || 0;
        summary.overtimeTotal += payslipData.adjustments?.overtimePay || 0;
        summary.shiftAllowanceTotal += payslipData.adjustments?.shiftAllowance || 0;
        summary.arrearsTotal += payslipData.adjustments?.arrears || 0;
        summary.processedCount++;

      } catch (err) {
        console.error(`Error processing payslip for ${employee.employeeId}:`, err);
        excludedEmployees.push({
          employee: employee._id,
          reason: err.message
        });
        summary.errorCount++;
      }
    }

    // Update payroll run
    payrollRun.status = 'completed';
    payrollRun.processedAt = new Date();
    payrollRun.processedBy = req.user._id;
    payrollRun.summary = summary;
    payrollRun.totalAmount = summary.totalNetPay;
    payrollRun.bankTransferTotal = summary.totalNetPay;
    payrollRun.eligibleEmployees = summary.processedCount;
    payrollRun.excludedEmployees = excludedEmployees;
    payrollRun.payslipsGenerated = true;
    payrollRun.payslipGeneratedAt = new Date();

    payrollRun.history.push({
      action: 'processed',
      performedBy: req.user._id,
      performedAt: new Date(),
      details: { 
        processedCount: summary.processedCount, 
        skippedCount: summary.skippedCount,
        totalNetPay: summary.totalNetPay
      }
    });

    await payrollRun.save();

    res.json({ 
      success: true, 
      message: 'Payroll processed successfully', 
      data: { 
        payrollRun,
        summary,
        payslipsCount: payslips.length,
        excludedCount: excludedEmployees.length
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Calculate individual employee payslip
const calculateEmployeePayslip = async (employee, payrollRun, startDate, endDate) => {
  // Get salary structure with components
  const structure = await SalaryStructure.findById(employee.salaryStructure._id || employee.salaryStructure)
    .populate('earnings.component')
    .populate('deductions.component');

  if (!structure) {
    throw new Error('Salary structure not found');
  }

  // Get attendance data
  const attendanceRecords = await Attendance.find({
    employee: employee._id,
    date: { $gte: startDate.toDate(), $lte: endDate.toDate() }
  }).populate('shift');

  // Get leave data
  const approvedLeaves = await LeaveRequest.find({
    employee: employee._id,
    status: 'approved',
    startDate: { $lte: endDate.toDate() },
    endDate: { $gte: startDate.toDate() }
  }).populate('leaveType');

  // Get shift assignments for overtime and allowances
  const shiftAssignments = await ShiftAssignment.find({
    employee: employee._id,
    date: { $gte: startDate.toDate(), $lte: endDate.toDate() }
  }).populate('shift');

  // Calculate attendance summary
  const attendance = calculateAttendanceSummary(attendanceRecords, approvedLeaves, startDate, endDate);
  
  // Calculate base salary components
  const monthlyCtc = employee.ctc / 12;
  const calculatedBasic = (employee.ctc * 0.4) / 12; // 40% of CTC as basic
  const perDaySalary = monthlyCtc / attendance.workingDays;

  // Calculate proration factor based on present days
  const paidDays = attendance.presentDays + attendance.paidLeaveDays + attendance.holidays + attendance.weekOffs;
  const prorationFactor = Math.min(paidDays / attendance.workingDays, 1);

  // Calculate earnings
  const earnings = [];
  let totalEarnings = 0;

  for (const item of structure.earnings) {
    if (!item.isEnabled) continue;
    
    const component = item.component;
    if (!component) continue;

    let amount = 0;
    const calcType = item.calculationType === 'use_default' ? component.calculationType : item.calculationType;
    const value = item.value || component.defaultValue;

    switch (calcType) {
      case 'fixed':
        amount = value * prorationFactor;
        break;
      case 'percentage_of_basic':
        amount = (calculatedBasic * value / 100) * prorationFactor;
        break;
      case 'percentage_of_ctc':
        amount = (monthlyCtc * value / 100) * prorationFactor;
        break;
      case 'formula':
        const formula = item.formula || component.formula || '';
        amount = evaluateFormula(formula, { BASIC: calculatedBasic, CTC: monthlyCtc }) * prorationFactor;
        break;
    }

    amount = applyRounding(amount, component.rounding, component.roundingPrecision);

    if (amount > 0) {
      earnings.push({
        componentId: component._id,
        name: component.name,
        code: component.code,
        type: 'regular',
        amount: Number(amount.toFixed(2)),
        calculatedFrom: `${calcType}: ${value}${calcType.includes('percentage') ? '%' : ''}`,
        taxability: component.taxability
      });
      totalEarnings += amount;
    }
  }

  // Calculate LOP deduction
  let lopDeduction = 0;
  if (attendance.lopDays > 0) {
    lopDeduction = perDaySalary * attendance.lopDays;
  }

  // Calculate overtime pay
  let overtimePay = 0;
  if (attendance.overtimeHours > 0) {
    const hourlyRate = (monthlyCtc / attendance.workingDays) / 8; // Assuming 8 hour workday
    const overtimeRate = hourlyRate * 1.5; // 1.5x for overtime
    overtimePay = overtimeRate * attendance.overtimeHours;
    
    if (overtimePay > 0) {
      earnings.push({
        name: 'Overtime Pay',
        code: 'OT',
        type: 'overtime',
        amount: Number(overtimePay.toFixed(2)),
        calculatedFrom: `${attendance.overtimeHours} hours @ 1.5x`,
        taxability: 'taxable'
      });
      totalEarnings += overtimePay;
    }
  }

  // Calculate shift allowances
  let shiftAllowance = 0;
  const nightShifts = shiftAssignments.filter(sa => sa.shift?.category === 'night');
  if (nightShifts.length > 0) {
    shiftAllowance = nightShifts.length * 200; // ₹200 per night shift
    
    if (shiftAllowance > 0) {
      earnings.push({
        name: 'Night Shift Allowance',
        code: 'NSA',
        type: 'shift_allowance',
        amount: Number(shiftAllowance.toFixed(2)),
        calculatedFrom: `${nightShifts.length} night shifts`,
        taxability: 'taxable'
      });
      totalEarnings += shiftAllowance;
    }
  }

  // Check for arrears (salary revision during the month)
  let arrears = 0;
  let arrearsDetails = null;
  if (employee.salaryHistory && employee.salaryHistory.length > 1) {
    const currentHistory = employee.salaryHistory[employee.salaryHistory.length - 1];
    if (currentHistory && currentHistory.effectiveFrom) {
      const effectiveDate = moment(currentHistory.effectiveFrom);
      if (effectiveDate.isBetween(startDate, endDate, 'day', '[]')) {
        // Salary was revised during this month
        const prevHistory = employee.salaryHistory[employee.salaryHistory.length - 2];
        if (prevHistory) {
          const daysBeforeRevision = effectiveDate.diff(startDate, 'days');
          const previousDailyRate = (prevHistory.ctc / 12) / attendance.workingDays;
          const newDailyRate = (currentHistory.ctc / 12) / attendance.workingDays;
          const rateDiff = newDailyRate - previousDailyRate;
          arrears = rateDiff * daysBeforeRevision;

          if (arrears > 0) {
            arrearsDetails = {
              fromMonth: payrollRun.month,
              toMonth: payrollRun.month,
              reason: 'Mid-month salary revision',
              previousCtc: prevHistory.ctc,
              newCtc: currentHistory.ctc
            };

            earnings.push({
              name: 'Salary Arrears',
              code: 'ARR',
              type: 'arrears',
              amount: Number(arrears.toFixed(2)),
              calculatedFrom: `Revision from ${moment(effectiveDate).format('DD/MM')}`,
              taxability: 'taxable'
            });
            totalEarnings += arrears;
          }
        }
      }
    }
  }

  // Calculate deductions
  const deductions = [];
  let totalDeductions = 0;
  const employerContributions = [];
  let totalEmployerContributions = 0;
  const statutory = {
    pfEmployee: 0,
    pfEmployer: 0,
    pensionContribution: 0,
    esiEmployee: 0,
    esiEmployer: 0,
    professionalTax: 0,
    tds: 0,
    lwf: 0
  };

  for (const item of structure.deductions) {
    if (!item.isEnabled) continue;
    
    const component = item.component;
    if (!component) continue;

    let amount = 0;
    let isEmployerContribution = false;

    if (component.isStatutory) {
      const statutoryResult = calculateStatutoryDeduction(
        component,
        totalEarnings,
        calculatedBasic * prorationFactor,
        structure
      );
      amount = statutoryResult.amount;
      isEmployerContribution = statutoryResult.isEmployerContribution;

      // Update statutory summary
      switch (component.statutoryType) {
        case 'pf_employee':
          statutory.pfEmployee = amount;
          break;
        case 'pf_employer':
          statutory.pfEmployer = amount;
          statutory.pensionContribution = (amount * STATUTORY_CONFIG.pf.pensionRate / STATUTORY_CONFIG.pf.employerRate);
          break;
        case 'esi_employee':
          statutory.esiEmployee = amount;
          break;
        case 'esi_employer':
          statutory.esiEmployer = amount;
          break;
        case 'pt':
          statutory.professionalTax = amount;
          break;
        case 'tds':
          statutory.tds = amount;
          break;
      }
    } else {
      const calcType = item.calculationType === 'use_default' ? component.calculationType : item.calculationType;
      const value = item.value || component.defaultValue;

      switch (calcType) {
        case 'fixed':
          amount = value;
          break;
        case 'percentage_of_basic':
          amount = (calculatedBasic * prorationFactor * value) / 100;
          break;
        case 'percentage_of_ctc':
          amount = (monthlyCtc * prorationFactor * value) / 100;
          break;
      }
    }

    amount = applyRounding(amount, component.rounding, component.roundingPrecision);

    if (amount > 0) {
      if (isEmployerContribution) {
        employerContributions.push({
          name: component.name,
          code: component.code,
          amount: Number(amount.toFixed(2)),
          statutoryType: component.statutoryType
        });
        totalEmployerContributions += amount;
      } else {
        deductions.push({
          componentId: component._id,
          name: component.name,
          code: component.code,
          type: component.isStatutory ? 'statutory' : 'regular',
          amount: Number(amount.toFixed(2)),
          isStatutory: component.isStatutory,
          statutoryType: component.statutoryType
        });
        totalDeductions += amount;
      }
    }
  }

  // Add LOP as deduction
  if (lopDeduction > 0) {
    deductions.push({
      name: 'Loss of Pay',
      code: 'LOP',
      type: 'lop',
      amount: Number(lopDeduction.toFixed(2)),
      isStatutory: false
    });
    totalDeductions += lopDeduction;
  }

  const grossSalary = totalEarnings;
  const netSalary = grossSalary - totalDeductions;

  // Calculate YTD
  const previousPayslips = await Payslip.find({
    employee: employee._id,
    year: payrollRun.year,
    month: { $lt: payrollRun.month }
  });

  const ytdSummary = {
    grossEarnings: previousPayslips.reduce((sum, p) => sum + (p.grossSalary || 0), 0) + grossSalary,
    totalDeductions: previousPayslips.reduce((sum, p) => sum + (p.totalDeductions || 0), 0) + totalDeductions,
    netPay: previousPayslips.reduce((sum, p) => sum + (p.netSalary || 0), 0) + netSalary,
    pfContribution: previousPayslips.reduce((sum, p) => sum + (p.statutory?.pfEmployee || 0), 0) + statutory.pfEmployee,
    taxDeducted: previousPayslips.reduce((sum, p) => sum + (p.statutory?.tds || 0), 0) + statutory.tds
  };

  return {
    employee: employee._id,
    employeeSnapshot: {
      employeeId: employee.employeeId,
      name: `${employee.firstName} ${employee.lastName}`,
      email: employee.email,
      department: employee.department?.name || '',
      designation: employee.designation?.name || '',
      joiningDate: employee.joiningDate,
      bankDetails: employee.bankDetails || {},
      panNumber: employee.panNumber || '',
      uanNumber: employee.uanNumber || '',
      esiNumber: employee.esiNumber || ''
    },
    salaryStructure: structure._id,
    salaryStructureName: structure.name,
    ctc: employee.ctc,
    monthlyGross: monthlyCtc,
    attendance,
    basicSalary: Number((calculatedBasic * prorationFactor).toFixed(2)),
    earnings,
    totalEarnings: Number(totalEarnings.toFixed(2)),
    adjustments: {
      lopDeduction: Number(lopDeduction.toFixed(2)),
      overtimePay: Number(overtimePay.toFixed(2)),
      shiftAllowance: Number(shiftAllowance.toFixed(2)),
      arrears: Number(arrears.toFixed(2)),
      arrearsDetails
    },
    deductions,
    totalDeductions: Number(totalDeductions.toFixed(2)),
    employerContributions,
    totalEmployerContributions: Number(totalEmployerContributions.toFixed(2)),
    statutory,
    grossSalary: Number(grossSalary.toFixed(2)),
    netSalary: Number(netSalary.toFixed(2)),
    ytdSummary
  };
};

// Calculate attendance summary
const calculateAttendanceSummary = (attendanceRecords, approvedLeaves, startDate, endDate) => {
  const totalDays = endDate.diff(startDate, 'days') + 1;
  let workingDays = 0;
  let presentDays = 0;
  let absentDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let holidays = 0;
  let weekOffs = 0;
  let halfDays = 0;
  let lateDays = 0;
  let earlyLeaveDays = 0;
  let overtimeHours = 0;
  let totalWorkingHours = 0;

  // Count attendance statuses
  for (const record of attendanceRecords) {
    switch (record.status) {
      case 'present':
        presentDays++;
        workingDays++;
        break;
      case 'half_day':
        halfDays++;
        presentDays += 0.5;
        workingDays++;
        break;
      case 'absent':
        absentDays++;
        workingDays++;
        break;
      case 'holiday':
        holidays++;
        break;
      case 'weekend':
      case 'weekoff':
        weekOffs++;
        break;
      case 'leave':
        // Will be handled via leave records
        break;
    }

    if (record.isLate) lateDays++;
    if (record.isEarlyLeave) earlyLeaveDays++;
    overtimeHours += record.overtimeHours || 0;
    totalWorkingHours += record.workingHours || 0;
  }

  // Calculate leave days
  for (const leave of approvedLeaves) {
    const leaveStart = moment.max(moment(leave.startDate), startDate);
    const leaveEnd = moment.min(moment(leave.endDate), endDate);
    const days = leaveEnd.diff(leaveStart, 'days') + 1;

    if (leave.leaveType?.isPaid !== false) {
      paidLeaveDays += days;
    } else {
      unpaidLeaveDays += days;
    }
  }

  // Calculate expected working days from total days minus weekends and holidays
  const expectedWorkingDays = calculateWorkingDays(startDate, endDate);
  
  // LOP days = working days where employee was absent without paid leave
  const lopDays = Math.max(0, expectedWorkingDays - presentDays - paidLeaveDays - holidays);

  return {
    totalDays,
    workingDays: expectedWorkingDays,
    presentDays,
    absentDays,
    paidLeaveDays,
    unpaidLeaveDays,
    lopDays,
    holidays,
    weekOffs,
    halfDays,
    lateDays,
    earlyLeaveDays,
    overtimeHours,
    totalWorkingHours,
    expectedWorkingHours: expectedWorkingDays * 8
  };
};

// Lock Payroll
export const lockPayroll = async (req, res) => {
  try {
    const payrollRun = await PayrollRun.findById(req.params.id);
    if (!payrollRun) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    if (payrollRun.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Can only lock completed payroll' });
    }

    if (payrollRun.isLocked) {
      return res.status(400).json({ success: false, message: 'Payroll is already locked' });
    }

    const { reason } = req.body;

    payrollRun.isLocked = true;
    payrollRun.lockedAt = new Date();
    payrollRun.lockedBy = req.user._id;
    payrollRun.lockReason = reason || 'Monthly payroll finalized';
    payrollRun.status = 'locked';

    // Finalize all payslips
    await Payslip.updateMany(
      { payrollRun: payrollRun._id },
      { 
        $set: { 
          isFinalized: true, 
          finalizedAt: new Date() 
        } 
      }
    );

    payrollRun.history.push({
      action: 'locked',
      performedBy: req.user._id,
      performedAt: new Date(),
      details: { reason }
    });

    await payrollRun.save();

    res.json({ success: true, message: 'Payroll locked successfully', data: payrollRun });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get payslips with enhanced details
export const getPayslips = async (req, res) => {
  try {
    const { employeeId, month, year, payrollRunId, status } = req.query;
    const filter = {};

    if (employeeId) {
      const employee = await Employee.findOne({ employeeId });
      if (employee) filter.employee = employee._id;
    } else if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee) filter.employee = employee._id;
    }

    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (payrollRunId) filter.payrollRun = payrollRunId;
    if (status) filter.paymentStatus = status;

    const payslips = await Payslip.find(filter)
      .populate('employee', 'firstName lastName employeeId email')
      .populate('payrollRun', 'month year status isLocked')
      .populate('salaryStructure', 'name code')
      .sort({ year: -1, month: -1 });

    res.json({ success: true, data: payslips });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single payslip details
export const getPayslipDetails = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId email department designation')
      .populate('payrollRun', 'month year status isLocked')
      .populate('salaryStructure', 'name code category')
      .populate('generatedBy', 'email');

    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    // Check if employee can view this payslip
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (!employee || employee._id.toString() !== payslip.employee._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.json({ success: true, data: payslip });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate payslip HTML
export const generatePayslipHtml = async (req, res) => {
  try {
    const payslip = await Payslip.findById(req.params.id)
      .populate('payrollRun');

    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    const html = generatePayslipTemplate(payslip);
    
    res.json({ success: true, data: { html } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate payslip HTML template
const generatePayslipTemplate = (payslip) => {
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payslip - ${monthNames[payslip.month]} ${payslip.year}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; padding: 20px; }
    .payslip { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; }
    .header { background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); color: white; padding: 20px; text-align: center; }
    .header h1 { font-size: 24px; margin-bottom: 5px; }
    .header p { opacity: 0.9; }
    .period { background: #f7fafc; padding: 10px 20px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600; }
    .section { padding: 15px 20px; }
    .section-title { font-weight: 600; color: #2c5282; margin-bottom: 10px; padding-bottom: 5px; border-bottom: 2px solid #e2e8f0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .grid-item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #e2e8f0; }
    .grid-item:last-child { border-bottom: none; }
    .label { color: #718096; }
    .value { font-weight: 500; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f7fafc; color: #4a5568; font-weight: 600; }
    .amount { text-align: right; }
    .total-row { background: #edf2f7; font-weight: 600; }
    .net-pay { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 20px; text-align: center; }
    .net-pay h3 { font-size: 14px; margin-bottom: 5px; opacity: 0.9; }
    .net-pay .amount { font-size: 28px; font-weight: 700; }
    .footer { background: #f7fafc; padding: 15px 20px; font-size: 10px; color: #718096; text-align: center; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="payslip">
    <div class="header">
      <h1>COMPANY NAME</h1>
      <p>Payslip for ${monthNames[payslip.month]} ${payslip.year}</p>
    </div>
    
    <div class="period">
      Pay Period: ${moment(payslip.periodStart).format('DD MMM YYYY')} - ${moment(payslip.periodEnd).format('DD MMM YYYY')}
    </div>
    
    <div class="section">
      <div class="section-title">Employee Details</div>
      <div class="two-col">
        <div class="grid">
          <div class="grid-item"><span class="label">Employee ID</span><span class="value">${payslip.employeeSnapshot?.employeeId || ''}</span></div>
          <div class="grid-item"><span class="label">Name</span><span class="value">${payslip.employeeSnapshot?.name || ''}</span></div>
          <div class="grid-item"><span class="label">Department</span><span class="value">${payslip.employeeSnapshot?.department || ''}</span></div>
          <div class="grid-item"><span class="label">Designation</span><span class="value">${payslip.employeeSnapshot?.designation || ''}</span></div>
        </div>
        <div class="grid">
          <div class="grid-item"><span class="label">PAN</span><span class="value">${payslip.employeeSnapshot?.panNumber || 'N/A'}</span></div>
          <div class="grid-item"><span class="label">UAN</span><span class="value">${payslip.employeeSnapshot?.uanNumber || 'N/A'}</span></div>
          <div class="grid-item"><span class="label">Bank A/C</span><span class="value">${payslip.employeeSnapshot?.bankDetails?.accountNumber ? '****' + payslip.employeeSnapshot.bankDetails.accountNumber.slice(-4) : 'N/A'}</span></div>
          <div class="grid-item"><span class="label">IFSC</span><span class="value">${payslip.employeeSnapshot?.bankDetails?.ifscCode || 'N/A'}</span></div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">Attendance Summary</div>
      <div class="grid" style="grid-template-columns: repeat(4, 1fr);">
        <div class="grid-item"><span class="label">Working Days</span><span class="value">${payslip.attendance?.workingDays || 0}</span></div>
        <div class="grid-item"><span class="label">Present</span><span class="value">${payslip.attendance?.presentDays || 0}</span></div>
        <div class="grid-item"><span class="label">Paid Leave</span><span class="value">${payslip.attendance?.paidLeaveDays || 0}</span></div>
        <div class="grid-item"><span class="label">LOP Days</span><span class="value">${payslip.attendance?.lopDays || 0}</span></div>
      </div>
    </div>
    
    <div class="section">
      <div class="two-col">
        <div>
          <div class="section-title">Earnings</div>
          <table>
            <thead><tr><th>Component</th><th class="amount">Amount</th></tr></thead>
            <tbody>
              ${(payslip.earnings || []).map(e => `<tr><td>${e.name}</td><td class="amount">${formatCurrency(e.amount)}</td></tr>`).join('')}
              <tr class="total-row"><td>Total Earnings</td><td class="amount">${formatCurrency(payslip.totalEarnings)}</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <div class="section-title">Deductions</div>
          <table>
            <thead><tr><th>Component</th><th class="amount">Amount</th></tr></thead>
            <tbody>
              ${(payslip.deductions || []).map(d => `<tr><td>${d.name}</td><td class="amount">${formatCurrency(d.amount)}</td></tr>`).join('')}
              <tr class="total-row"><td>Total Deductions</td><td class="amount">${formatCurrency(payslip.totalDeductions)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <div class="net-pay">
      <h3>NET PAY</h3>
      <div class="amount">${formatCurrency(payslip.netSalary)}</div>
    </div>
    
    <div class="footer">
      <p>This is a computer-generated payslip and does not require a signature.</p>
      <p>Generated on ${moment().format('DD MMM YYYY, HH:mm')}</p>
    </div>
  </div>
</body>
</html>
  `;
};

// Generate Payroll Reports
export const generatePayrollReports = async (req, res) => {
  try {
    const { id } = req.params;
    const { reportType } = req.body;

    const payrollRun = await PayrollRun.findById(id);
    if (!payrollRun) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    const payslips = await Payslip.find({ payrollRun: id })
      .populate('employee', 'firstName lastName employeeId email bankDetails');

    let reportData = {};
    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];

    switch (reportType) {
      case 'bank_transfer':
        reportData = {
          title: 'Bank Transfer Sheet',
          period: `${monthNames[payrollRun.month]} ${payrollRun.year}`,
          entries: payslips.map(p => ({
            employeeId: p.employeeSnapshot?.employeeId,
            name: p.employeeSnapshot?.name,
            bankName: p.employeeSnapshot?.bankDetails?.bankName || '',
            accountNumber: p.employeeSnapshot?.bankDetails?.accountNumber || '',
            ifscCode: p.employeeSnapshot?.bankDetails?.ifscCode || '',
            amount: p.netSalary
          })),
          totalAmount: payslips.reduce((sum, p) => sum + p.netSalary, 0)
        };
        break;

      case 'pf_report':
        reportData = {
          title: 'PF Contribution Report',
          period: `${monthNames[payrollRun.month]} ${payrollRun.year}`,
          entries: payslips.filter(p => p.statutory?.pfEmployee > 0).map(p => ({
            employeeId: p.employeeSnapshot?.employeeId,
            name: p.employeeSnapshot?.name,
            uanNumber: p.employeeSnapshot?.uanNumber || '',
            grossWages: p.grossSalary,
            pfWages: Math.min(p.basicSalary, 15000),
            employeeContribution: p.statutory?.pfEmployee || 0,
            employerContribution: p.statutory?.pfEmployer || 0,
            pensionContribution: p.statutory?.pensionContribution || 0
          })),
          totals: {
            employeeContribution: payslips.reduce((sum, p) => sum + (p.statutory?.pfEmployee || 0), 0),
            employerContribution: payslips.reduce((sum, p) => sum + (p.statutory?.pfEmployer || 0), 0)
          }
        };
        break;

      case 'esi_report':
        reportData = {
          title: 'ESI Contribution Report',
          period: `${monthNames[payrollRun.month]} ${payrollRun.year}`,
          entries: payslips.filter(p => p.statutory?.esiEmployee > 0).map(p => ({
            employeeId: p.employeeSnapshot?.employeeId,
            name: p.employeeSnapshot?.name,
            esiNumber: p.employeeSnapshot?.esiNumber || '',
            grossWages: p.grossSalary,
            employeeContribution: p.statutory?.esiEmployee || 0,
            employerContribution: p.statutory?.esiEmployer || 0
          })),
          totals: {
            employeeContribution: payslips.reduce((sum, p) => sum + (p.statutory?.esiEmployee || 0), 0),
            employerContribution: payslips.reduce((sum, p) => sum + (p.statutory?.esiEmployer || 0), 0)
          }
        };
        break;

      case 'pt_report':
        reportData = {
          title: 'Professional Tax Report',
          period: `${monthNames[payrollRun.month]} ${payrollRun.year}`,
          entries: payslips.filter(p => p.statutory?.professionalTax > 0).map(p => ({
            employeeId: p.employeeSnapshot?.employeeId,
            name: p.employeeSnapshot?.name,
            grossSalary: p.grossSalary,
            ptAmount: p.statutory?.professionalTax || 0
          })),
          totalPt: payslips.reduce((sum, p) => sum + (p.statutory?.professionalTax || 0), 0)
        };
        break;

      case 'salary_register':
        reportData = {
          title: 'Salary Register',
          period: `${monthNames[payrollRun.month]} ${payrollRun.year}`,
          entries: payslips.map(p => ({
            employeeId: p.employeeSnapshot?.employeeId,
            name: p.employeeSnapshot?.name,
            department: p.employeeSnapshot?.department,
            designation: p.employeeSnapshot?.designation,
            workingDays: p.attendance?.workingDays || 0,
            presentDays: p.attendance?.presentDays || 0,
            lopDays: p.attendance?.lopDays || 0,
            basicSalary: p.basicSalary,
            grossEarnings: p.totalEarnings,
            totalDeductions: p.totalDeductions,
            netSalary: p.netSalary
          })),
          summary: payrollRun.summary
        };
        break;

      case 'journal_voucher':
        // Calculate totals by category
        const earningsTotal = payslips.reduce((sum, p) => sum + p.totalEarnings, 0);
        const deductionsTotal = payslips.reduce((sum, p) => sum + p.totalDeductions, 0);
        const netPayTotal = payslips.reduce((sum, p) => sum + p.netSalary, 0);
        const pfEmployerTotal = payslips.reduce((sum, p) => sum + (p.statutory?.pfEmployer || 0), 0);
        const esiEmployerTotal = payslips.reduce((sum, p) => sum + (p.statutory?.esiEmployer || 0), 0);

        reportData = {
          title: 'Journal Voucher',
          period: `${monthNames[payrollRun.month]} ${payrollRun.year}`,
          voucherDate: moment().format('DD/MM/YYYY'),
          entries: [
            { account: 'Salary Expense', debit: earningsTotal, credit: 0 },
            { account: 'Employer PF Contribution', debit: pfEmployerTotal, credit: 0 },
            { account: 'Employer ESI Contribution', debit: esiEmployerTotal, credit: 0 },
            { account: 'PF Payable', debit: 0, credit: payrollRun.summary?.pfEmployeeTotal + pfEmployerTotal },
            { account: 'ESI Payable', debit: 0, credit: payrollRun.summary?.esiEmployeeTotal + esiEmployerTotal },
            { account: 'PT Payable', debit: 0, credit: payrollRun.summary?.ptTotal || 0 },
            { account: 'TDS Payable', debit: 0, credit: payrollRun.summary?.tdsTotal || 0 },
            { account: 'Salary Payable', debit: 0, credit: netPayTotal }
          ],
          totals: {
            totalDebit: earningsTotal + pfEmployerTotal + esiEmployerTotal,
            totalCredit: earningsTotal + pfEmployerTotal + esiEmployerTotal
          }
        };
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    // Record report generation
    payrollRun.reportsGenerated.push({
      type: reportType,
      generatedAt: new Date()
    });
    await payrollRun.save();

    res.json({ success: true, data: reportData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get payroll summary/dashboard data
export const getPayrollDashboard = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year ? parseInt(year) : new Date().getFullYear();

    // Get all payroll runs for the year
    const payrollRuns = await PayrollRun.find({ year: currentYear })
      .sort({ month: 1 });

    // Monthly summary
    const monthlySummary = await Payslip.aggregate([
      { 
        $match: { 
          year: currentYear 
        } 
      },
      {
        $group: {
          _id: '$month',
          totalEmployees: { $sum: 1 },
          totalGross: { $sum: '$grossSalary' },
          totalDeductions: { $sum: '$totalDeductions' },
          totalNet: { $sum: '$netSalary' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Current month pending
    const currentMonth = new Date().getMonth() + 1;
    const pendingPayroll = await PayrollRun.findOne({
      month: currentMonth,
      year: currentYear,
      status: { $nin: ['completed', 'locked'] }
    });

    // Employees without salary structure
    const employeesWithoutSalary = await Employee.countDocuments({
      status: 'active',
      $or: [
        { salaryStructure: null },
        { ctc: { $lte: 0 } }
      ]
    });

    // YTD totals
    const ytdTotals = await Payslip.aggregate([
      { $match: { year: currentYear } },
      {
        $group: {
          _id: null,
          totalGross: { $sum: '$grossSalary' },
          totalDeductions: { $sum: '$totalDeductions' },
          totalNet: { $sum: '$netSalary' },
          totalPf: { $sum: '$statutory.pfEmployee' },
          totalEsi: { $sum: '$statutory.esiEmployee' },
          totalPt: { $sum: '$statutory.professionalTax' },
          totalTds: { $sum: '$statutory.tds' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        year: currentYear,
        payrollRuns,
        monthlySummary,
        pendingPayroll,
        employeesWithoutSalary,
        ytdTotals: ytdTotals[0] || {}
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== SALARY ASSIGNMENT FUNCTIONS (Story 8.2) =====

// Calculate salary components for an employee
const calculateEmployeeSalaryComponents = async (structureId, ctc) => {
  const structure = await SalaryStructure.findById(structureId)
    .populate('earnings.component')
    .populate('deductions.component');

  if (!structure) {
    throw new Error('Salary structure not found');
  }

  const monthlyCtc = ctc / 12;
  const calculatedBasic = (ctc * 0.4) / 12; // Default 40% of CTC as basic
  
  let totalEarnings = 0;
  let totalDeductions = 0;
  let employerContributions = 0;

  // Calculate earnings
  for (const item of structure.earnings) {
    if (!item.isEnabled) continue;
    
    const component = item.component;
    let amount = 0;

    const calcType = item.calculationType === 'use_default' ? component.calculationType : item.calculationType;
    const value = item.value || component.defaultValue;

    switch (calcType) {
      case 'fixed':
        amount = value;
        break;
      case 'percentage_of_basic':
        amount = (calculatedBasic * value) / 100;
        break;
      case 'percentage_of_ctc':
        amount = (monthlyCtc * value) / 100;
        break;
      case 'formula':
        const formula = item.formula || component.formula || '';
        amount = evaluateFormula(formula, { BASIC: calculatedBasic, CTC: monthlyCtc });
        break;
    }

    amount = applyRounding(amount, component.rounding, component.roundingPrecision);
    if (component.minAmount !== null) amount = Math.max(amount, component.minAmount);
    if (component.maxAmount !== null) amount = Math.min(amount, component.maxAmount);

    totalEarnings += amount;
  }

  // Calculate deductions
  for (const item of structure.deductions) {
    if (!item.isEnabled) continue;
    
    const component = item.component;
    let amount = 0;
    let isEmployerContribution = false;

    if (component.isStatutory) {
      const statutoryResult = calculateStatutoryDeduction(
        component,
        totalEarnings,
        calculatedBasic,
        structure
      );
      amount = statutoryResult.amount;
      isEmployerContribution = statutoryResult.isEmployerContribution;
    } else {
      const calcType = item.calculationType === 'use_default' ? component.calculationType : item.calculationType;
      const value = item.value || component.defaultValue;

      switch (calcType) {
        case 'fixed':
          amount = value;
          break;
        case 'percentage_of_basic':
          amount = (calculatedBasic * value) / 100;
          break;
        case 'percentage_of_ctc':
          amount = (monthlyCtc * value) / 100;
          break;
        case 'formula':
          const formula = item.formula || component.formula || '';
          amount = evaluateFormula(formula, { BASIC: calculatedBasic, CTC: monthlyCtc, GROSS: totalEarnings });
          break;
      }
    }

    amount = applyRounding(amount, component.rounding, component.roundingPrecision);

    if (isEmployerContribution) {
      employerContributions += amount;
    } else {
      totalDeductions += amount;
    }
  }

  return {
    basic: Number(calculatedBasic.toFixed(2)),
    grossMonthly: Number(totalEarnings.toFixed(2)),
    netMonthly: Number((totalEarnings - totalDeductions).toFixed(2)),
    totalDeductions: Number(totalDeductions.toFixed(2)),
    employerContributions: Number(employerContributions.toFixed(2))
  };
};

// Assign salary structure to employee
export const assignSalaryStructure = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { salaryStructureId, ctc, effectiveFrom, reason, remarks } = req.body;

    // Validate required fields
    if (!salaryStructureId || !ctc || !effectiveFrom) {
      return res.status(400).json({ 
        success: false, 
        message: 'Salary structure, CTC, and effective date are required' 
      });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const structure = await SalaryStructure.findById(salaryStructureId);
    if (!structure) {
      return res.status(404).json({ success: false, message: 'Salary structure not found' });
    }

    if (!structure.isActive) {
      return res.status(400).json({ success: false, message: 'Cannot assign inactive salary structure' });
    }

    const effectiveDate = new Date(effectiveFrom);
    
    // Check for overlapping effective dates
    const overlapping = employee.salaryHistory?.find(h => {
      const historyFrom = new Date(h.effectiveFrom);
      const historyTo = h.effectiveTo ? new Date(h.effectiveTo) : null;
      
      // If there's no effectiveTo, check if new date is same as existing from date
      if (!historyTo) {
        return historyFrom.getTime() === effectiveDate.getTime();
      }
      
      // Check if effectiveDate falls within existing range
      return effectiveDate >= historyFrom && effectiveDate <= historyTo;
    });

    if (overlapping) {
      return res.status(400).json({ 
        success: false, 
        message: 'Effective date overlaps with existing salary assignment' 
      });
    }

    // Calculate salary components
    const calculatedComponents = await calculateEmployeeSalaryComponents(salaryStructureId, ctc);

    // Close the previous salary assignment if exists
    if (employee.salaryStructure && employee.salaryEffectiveFrom) {
      const previousEntry = employee.salaryHistory?.find(h => !h.effectiveTo);
      if (previousEntry) {
        previousEntry.effectiveTo = new Date(effectiveDate.getTime() - 86400000); // Day before new effective date
      }
    }

    // Add to salary history
    const historyEntry = {
      salaryStructure: structure._id,
      structureName: structure.name,
      ctc,
      basic: calculatedComponents.basic,
      grossMonthly: calculatedComponents.grossMonthly,
      netMonthly: calculatedComponents.netMonthly,
      effectiveFrom: effectiveDate,
      effectiveTo: null,
      reason: reason || (employee.salaryStructure ? 'structure_change' : 'initial'),
      remarks,
      incrementPercentage: employee.ctc > 0 ? Number((((ctc - employee.ctc) / employee.ctc) * 100).toFixed(2)) : 0,
      incrementAmount: employee.ctc > 0 ? ctc - employee.ctc : 0,
      changedBy: req.user._id,
      changedAt: new Date()
    };

    // Update employee
    employee.salaryStructure = structure._id;
    employee.ctc = ctc;
    employee.salary = calculatedComponents.netMonthly; // For backward compatibility
    employee.salaryEffectiveFrom = effectiveDate;
    employee.calculatedComponents = calculatedComponents;
    
    if (!employee.salaryHistory) {
      employee.salaryHistory = [];
    }
    employee.salaryHistory.push(historyEntry);

    // Add to general history
    employee.history.push({
      type: 'salary_revision',
      oldValue: { ctc: employee.ctc, structure: employee.salaryStructure },
      newValue: { ctc, structure: structure._id, structureName: structure.name },
      changedBy: req.user._id,
      changedAt: new Date(),
      reason: remarks || reason
    });

    await employee.save();

    const populated = await Employee.findById(employee._id)
      .populate('salaryStructure', 'name code category')
      .populate('salaryHistory.salaryStructure', 'name code')
      .populate('salaryHistory.changedBy', 'email');

    res.json({ 
      success: true, 
      message: 'Salary structure assigned successfully',
      data: {
        employee: {
          _id: populated._id,
          employeeId: populated.employeeId,
          name: `${populated.firstName} ${populated.lastName}`
        },
        salaryStructure: populated.salaryStructure,
        ctc,
        calculatedComponents,
        effectiveFrom: effectiveDate,
        salaryHistory: populated.salaryHistory
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Process increment for employee
export const processIncrement = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { incrementType, value, effectiveFrom, reason, remarks, newStructureId } = req.body;

    if (!incrementType || value === undefined || !effectiveFrom) {
      return res.status(400).json({ 
        success: false, 
        message: 'Increment type, value, and effective date are required' 
      });
    }

    const employee = await Employee.findById(employeeId).populate('salaryStructure');
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (!employee.ctc || employee.ctc <= 0) {
      return res.status(400).json({ success: false, message: 'Employee does not have a current CTC' });
    }

    let newCtc;
    let incrementAmount;
    let incrementPercentage;

    if (incrementType === 'percentage') {
      incrementPercentage = value;
      incrementAmount = (employee.ctc * value) / 100;
      newCtc = employee.ctc + incrementAmount;
    } else if (incrementType === 'amount') {
      incrementAmount = value;
      incrementPercentage = (value / employee.ctc) * 100;
      newCtc = employee.ctc + value;
    } else if (incrementType === 'new_ctc') {
      newCtc = value;
      incrementAmount = value - employee.ctc;
      incrementPercentage = ((value - employee.ctc) / employee.ctc) * 100;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid increment type' });
    }

    // Use new structure if provided, otherwise use current
    const structureId = newStructureId || employee.salaryStructure?._id;
    if (!structureId) {
      return res.status(400).json({ success: false, message: 'No salary structure assigned or provided' });
    }

    // Calculate new components
    const calculatedComponents = await calculateEmployeeSalaryComponents(structureId, newCtc);
    const structure = await SalaryStructure.findById(structureId);

    const effectiveDate = new Date(effectiveFrom);

    // Close previous assignment
    if (employee.salaryHistory?.length > 0) {
      const lastEntry = employee.salaryHistory[employee.salaryHistory.length - 1];
      if (!lastEntry.effectiveTo) {
        lastEntry.effectiveTo = new Date(effectiveDate.getTime() - 86400000);
      }
    }

    // Add new history entry
    const historyEntry = {
      salaryStructure: structureId,
      structureName: structure.name,
      ctc: newCtc,
      basic: calculatedComponents.basic,
      grossMonthly: calculatedComponents.grossMonthly,
      netMonthly: calculatedComponents.netMonthly,
      effectiveFrom: effectiveDate,
      effectiveTo: null,
      reason: reason || 'increment',
      remarks,
      incrementPercentage: Number(incrementPercentage.toFixed(2)),
      incrementAmount: Number(incrementAmount.toFixed(2)),
      changedBy: req.user._id,
      changedAt: new Date()
    };

    // Update employee
    const oldCtc = employee.ctc;
    employee.salaryStructure = structureId;
    employee.ctc = newCtc;
    employee.salary = calculatedComponents.netMonthly;
    employee.salaryEffectiveFrom = effectiveDate;
    employee.calculatedComponents = calculatedComponents;
    employee.salaryHistory.push(historyEntry);

    employee.history.push({
      type: 'salary_revision',
      oldValue: { ctc: oldCtc },
      newValue: { ctc: newCtc, incrementPercentage, incrementAmount },
      changedBy: req.user._id,
      changedAt: new Date(),
      reason: `${reason || 'increment'}: ${remarks || ''}`
    });

    await employee.save();

    res.json({ 
      success: true, 
      message: 'Increment processed successfully',
      data: {
        employee: {
          _id: employee._id,
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`
        },
        previousCtc: oldCtc,
        newCtc,
        incrementAmount: Number(incrementAmount.toFixed(2)),
        incrementPercentage: Number(incrementPercentage.toFixed(2)),
        calculatedComponents,
        effectiveFrom: effectiveDate
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get employee salary details
export const getEmployeeSalaryDetails = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await Employee.findById(employeeId)
      .populate('salaryStructure')
      .populate('salaryHistory.salaryStructure', 'name code category')
      .populate('salaryHistory.changedBy', 'email')
      .select('employeeId firstName lastName ctc salary salaryMode salaryEffectiveFrom salaryStructure calculatedComponents salaryHistory');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // If there's a salary structure, calculate current breakdown
    let currentBreakdown = null;
    if (employee.salaryStructure && employee.ctc > 0) {
      const structure = await SalaryStructure.findById(employee.salaryStructure._id)
        .populate('earnings.component')
        .populate('deductions.component');

      if (structure) {
        const monthlyCtc = employee.ctc / 12;
        const calculatedBasic = (employee.ctc * 0.4) / 12;

        const earnings = [];
        const deductions = [];

        // Calculate earnings
        for (const item of structure.earnings) {
          if (!item.isEnabled) continue;
          const component = item.component;
          let amount = 0;

          const calcType = item.calculationType === 'use_default' ? component.calculationType : item.calculationType;
          const value = item.value || component.defaultValue;

          switch (calcType) {
            case 'fixed':
              amount = value;
              break;
            case 'percentage_of_basic':
              amount = (calculatedBasic * value) / 100;
              break;
            case 'percentage_of_ctc':
              amount = (monthlyCtc * value) / 100;
              break;
          }

          earnings.push({
            name: component.name,
            code: component.code,
            amount: Number(amount.toFixed(2))
          });
        }

        // Calculate deductions
        for (const item of structure.deductions) {
          if (!item.isEnabled) continue;
          const component = item.component;
          let amount = 0;

          if (component.isStatutory) {
            const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
            const result = calculateStatutoryDeduction(component, totalEarnings, calculatedBasic, structure);
            amount = result.amount;
            if (result.isEmployerContribution) continue; // Skip employer contributions in employee deductions
          } else {
            const calcType = item.calculationType === 'use_default' ? component.calculationType : item.calculationType;
            const value = item.value || component.defaultValue;

            switch (calcType) {
              case 'fixed':
                amount = value;
                break;
              case 'percentage_of_basic':
                amount = (calculatedBasic * value) / 100;
                break;
              case 'percentage_of_ctc':
                amount = (monthlyCtc * value) / 100;
                break;
            }
          }

          deductions.push({
            name: component.name,
            code: component.code,
            amount: Number(amount.toFixed(2)),
            isStatutory: component.isStatutory
          });
        }

        currentBreakdown = {
          earnings,
          deductions,
          totalEarnings: earnings.reduce((sum, e) => sum + e.amount, 0),
          totalDeductions: deductions.reduce((sum, d) => sum + d.amount, 0)
        };
        currentBreakdown.netSalary = currentBreakdown.totalEarnings - currentBreakdown.totalDeductions;
      }
    }

    res.json({
      success: true,
      data: {
        employee: {
          _id: employee._id,
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`
        },
        currentSalary: {
          salaryStructure: employee.salaryStructure,
          ctc: employee.ctc,
          monthlySalary: employee.salary,
          effectiveFrom: employee.salaryEffectiveFrom,
          calculatedComponents: employee.calculatedComponents
        },
        breakdown: currentBreakdown,
        history: employee.salaryHistory?.sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom)) || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get employees without salary structure
export const getEmployeesWithoutSalary = async (req, res) => {
  try {
    const employees = await Employee.find({
      status: 'active',
      $or: [
        { salaryStructure: null },
        { salaryStructure: { $exists: false } },
        { ctc: { $lte: 0 } },
        { ctc: null }
      ]
    })
      .select('employeeId firstName lastName email department designation joiningDate')
      .populate('department', 'name')
      .populate('designation', 'name')
      .sort({ joiningDate: -1 });

    res.json({ success: true, data: employees, count: employees.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Bulk assign salary structure
export const bulkAssignSalaryStructure = async (req, res) => {
  try {
    const { employeeIds, salaryStructureId, effectiveFrom, reason, remarks } = req.body;

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Employee IDs array is required' });
    }

    if (!salaryStructureId || !effectiveFrom) {
      return res.status(400).json({ success: false, message: 'Salary structure and effective date are required' });
    }

    const structure = await SalaryStructure.findById(salaryStructureId);
    if (!structure || !structure.isActive) {
      return res.status(400).json({ success: false, message: 'Invalid or inactive salary structure' });
    }

    const results = { success: [], failed: [] };
    const effectiveDate = new Date(effectiveFrom);

    for (const empId of employeeIds) {
      try {
        const employee = await Employee.findById(empId);
        if (!employee) {
          results.failed.push({ id: empId, reason: 'Employee not found' });
          continue;
        }

        if (!employee.ctc || employee.ctc <= 0) {
          results.failed.push({ id: empId, reason: 'CTC not set' });
          continue;
        }

        const calculatedComponents = await calculateEmployeeSalaryComponents(salaryStructureId, employee.ctc);

        // Close previous assignment
        if (employee.salaryHistory?.length > 0) {
          const lastEntry = employee.salaryHistory[employee.salaryHistory.length - 1];
          if (!lastEntry.effectiveTo) {
            lastEntry.effectiveTo = new Date(effectiveDate.getTime() - 86400000);
          }
        }

        const historyEntry = {
          salaryStructure: structure._id,
          structureName: structure.name,
          ctc: employee.ctc,
          basic: calculatedComponents.basic,
          grossMonthly: calculatedComponents.grossMonthly,
          netMonthly: calculatedComponents.netMonthly,
          effectiveFrom: effectiveDate,
          effectiveTo: null,
          reason: reason || 'structure_change',
          remarks,
          changedBy: req.user._id,
          changedAt: new Date()
        };

        employee.salaryStructure = structure._id;
        employee.salary = calculatedComponents.netMonthly;
        employee.salaryEffectiveFrom = effectiveDate;
        employee.calculatedComponents = calculatedComponents;
        
        if (!employee.salaryHistory) employee.salaryHistory = [];
        employee.salaryHistory.push(historyEntry);

        await employee.save();
        results.success.push(empId);
      } catch (err) {
        results.failed.push({ id: empId, reason: err.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk assignment completed: ${results.success.length} successful, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Recalculate employee salary (after structure changes)
export const recalculateEmployeeSalary = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    if (!employee.salaryStructure || !employee.ctc) {
      return res.status(400).json({ success: false, message: 'Employee has no salary structure or CTC' });
    }

    const calculatedComponents = await calculateEmployeeSalaryComponents(employee.salaryStructure, employee.ctc);

    employee.salary = calculatedComponents.netMonthly;
    employee.calculatedComponents = calculatedComponents;

    // Update latest history entry if exists
    if (employee.salaryHistory?.length > 0) {
      const lastEntry = employee.salaryHistory[employee.salaryHistory.length - 1];
      if (!lastEntry.effectiveTo) {
        lastEntry.basic = calculatedComponents.basic;
        lastEntry.grossMonthly = calculatedComponents.grossMonthly;
        lastEntry.netMonthly = calculatedComponents.netMonthly;
      }
    }

    await employee.save();

    res.json({
      success: true,
      message: 'Salary recalculated successfully',
      data: {
        employeeId: employee.employeeId,
        ctc: employee.ctc,
        calculatedComponents
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== EMPLOYEE PAYSLIP FUNCTIONS (Story 8.4) =====

// Get employee's own payslips (with detailed breakdown)
export const getMyPayslips = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // Get employee from user
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const filter = { employee: employee._id };
    if (year) filter.year = parseInt(year);
    if (month) filter.month = parseInt(month);

    const payslips = await Payslip.find(filter)
      .populate('payrollRun', 'status isLocked')
      .populate('salaryStructure', 'name')
      .sort({ year: -1, month: -1 });

    // Only return finalized payslips
    const finalizedPayslips = payslips.filter(p => 
      p.payrollRun?.status === 'completed' || p.payrollRun?.status === 'locked' || p.isFinalized
    );

    res.json({ success: true, data: finalizedPayslips });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get detailed payslip for employee view
export const getMyPayslipDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get employee from user
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const payslip = await Payslip.findOne({ 
      _id: id, 
      employee: employee._id 
    })
      .populate('payrollRun', 'status isLocked periodStart periodEnd')
      .populate('salaryStructure', 'name code');

    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    // Get leave summary for the month
    const startDate = moment(`${payslip.year}-${payslip.month}-01`).startOf('month');
    const endDate = moment(startDate).endOf('month');

    const leaves = await LeaveRequest.find({
      employee: employee._id,
      status: 'approved',
      startDate: { $lte: endDate.toDate() },
      endDate: { $gte: startDate.toDate() }
    }).populate('leaveType', 'name isPaid');

    const leaveSummary = leaves.map(leave => {
      const leaveStart = moment.max(moment(leave.startDate), startDate);
      const leaveEnd = moment.min(moment(leave.endDate), endDate);
      const days = leaveEnd.diff(leaveStart, 'days') + 1;
      
      return {
        type: leave.leaveType?.name || 'Leave',
        days,
        isPaid: leave.leaveType?.isPaid !== false,
        startDate: leave.startDate,
        endDate: leave.endDate
      };
    });

    res.json({ 
      success: true, 
      data: {
        payslip,
        leaveSummary,
        canDownload: payslip.payrollRun?.isLocked || payslip.isFinalized
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get YTD summary for employee
export const getMyYtdSummary = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const payslips = await Payslip.find({
      employee: employee._id,
      year: targetYear
    }).sort({ month: 1 });

    // Calculate YTD totals
    const ytdSummary = {
      year: targetYear,
      monthlyBreakdown: [],
      totals: {
        grossEarnings: 0,
        basicSalary: 0,
        totalDeductions: 0,
        netSalary: 0,
        pfEmployee: 0,
        pfEmployer: 0,
        esiEmployee: 0,
        esiEmployer: 0,
        professionalTax: 0,
        tds: 0,
        lopDeduction: 0,
        overtimePay: 0
      }
    };

    for (const payslip of payslips) {
      ytdSummary.monthlyBreakdown.push({
        month: payslip.month,
        grossEarnings: payslip.grossSalary,
        totalDeductions: payslip.totalDeductions,
        netSalary: payslip.netSalary,
        workingDays: payslip.attendance?.workingDays || 0,
        presentDays: payslip.attendance?.presentDays || 0,
        lopDays: payslip.attendance?.lopDays || 0
      });

      ytdSummary.totals.grossEarnings += payslip.grossSalary || 0;
      ytdSummary.totals.basicSalary += payslip.basicSalary || 0;
      ytdSummary.totals.totalDeductions += payslip.totalDeductions || 0;
      ytdSummary.totals.netSalary += payslip.netSalary || 0;
      ytdSummary.totals.pfEmployee += payslip.statutory?.pfEmployee || 0;
      ytdSummary.totals.pfEmployer += payslip.statutory?.pfEmployer || 0;
      ytdSummary.totals.esiEmployee += payslip.statutory?.esiEmployee || 0;
      ytdSummary.totals.esiEmployer += payslip.statutory?.esiEmployer || 0;
      ytdSummary.totals.professionalTax += payslip.statutory?.professionalTax || 0;
      ytdSummary.totals.tds += payslip.statutory?.tds || 0;
      ytdSummary.totals.lopDeduction += payslip.adjustments?.lopDeduction || 0;
      ytdSummary.totals.overtimePay += payslip.adjustments?.overtimePay || 0;
    }

    res.json({ success: true, data: ytdSummary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Compare two payslips
export const comparePayslips = async (req, res) => {
  try {
    const { payslip1Id, payslip2Id } = req.query;
    
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const payslip1 = await Payslip.findOne({ _id: payslip1Id, employee: employee._id });
    const payslip2 = await Payslip.findOne({ _id: payslip2Id, employee: employee._id });

    if (!payslip1 || !payslip2) {
      return res.status(404).json({ success: false, message: 'One or both payslips not found' });
    }

    const comparison = {
      payslip1: {
        period: `${getMonthName(payslip1.month)} ${payslip1.year}`,
        grossSalary: payslip1.grossSalary,
        totalDeductions: payslip1.totalDeductions,
        netSalary: payslip1.netSalary,
        earnings: payslip1.earnings,
        deductions: payslip1.deductions,
        attendance: payslip1.attendance
      },
      payslip2: {
        period: `${getMonthName(payslip2.month)} ${payslip2.year}`,
        grossSalary: payslip2.grossSalary,
        totalDeductions: payslip2.totalDeductions,
        netSalary: payslip2.netSalary,
        earnings: payslip2.earnings,
        deductions: payslip2.deductions,
        attendance: payslip2.attendance
      },
      differences: {
        grossSalary: payslip2.grossSalary - payslip1.grossSalary,
        totalDeductions: payslip2.totalDeductions - payslip1.totalDeductions,
        netSalary: payslip2.netSalary - payslip1.netSalary,
        grossPercentChange: payslip1.grossSalary > 0 
          ? ((payslip2.grossSalary - payslip1.grossSalary) / payslip1.grossSalary * 100).toFixed(2)
          : 0,
        netPercentChange: payslip1.netSalary > 0 
          ? ((payslip2.netSalary - payslip1.netSalary) / payslip1.netSalary * 100).toFixed(2)
          : 0
      }
    };

    res.json({ success: true, data: comparison });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get tax projection for employee
export const getMyTaxProjection = async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    const employee = await Employee.findOne({ userId: req.user._id })
      .populate('salaryStructure');
      
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    // Get payslips for the year so far
    const payslips = await Payslip.find({
      employee: employee._id,
      year: targetYear
    }).sort({ month: 1 });

    // Calculate actual earnings so far
    const actualMonths = payslips.length;
    const actualGross = payslips.reduce((sum, p) => sum + (p.grossSalary || 0), 0);
    const actualTds = payslips.reduce((sum, p) => sum + (p.statutory?.tds || 0), 0);
    const actualPf = payslips.reduce((sum, p) => sum + (p.statutory?.pfEmployee || 0), 0);

    // Project remaining months based on current/last salary
    const remainingMonths = 12 - actualMonths;
    const lastPayslip = payslips[payslips.length - 1];
    const projectedMonthlyGross = lastPayslip?.grossSalary || (employee.ctc / 12);
    const projectedRemainingGross = projectedMonthlyGross * remainingMonths;

    // Total projected annual income
    const projectedAnnualGross = actualGross + projectedRemainingGross;
    const projectedAnnualBasic = projectedAnnualGross * 0.4; // Assuming 40% basic

    // Calculate projected deductions
    const projectedPf = actualPf + (Math.min(15000, projectedMonthlyGross * 0.4) * 0.12 * remainingMonths);
    const standardDeduction = 50000; // Standard deduction
    const section80C = Math.min(projectedPf, 150000); // Section 80C limit

    // Calculate taxable income
    const taxableIncome = Math.max(0, projectedAnnualGross - standardDeduction - section80C);

    // Calculate tax (Old Regime slabs for simplicity)
    let projectedTax = 0;
    if (taxableIncome > 1000000) {
      projectedTax = 112500 + (taxableIncome - 1000000) * 0.30;
    } else if (taxableIncome > 500000) {
      projectedTax = 12500 + (taxableIncome - 500000) * 0.20;
    } else if (taxableIncome > 250000) {
      projectedTax = (taxableIncome - 250000) * 0.05;
    }

    // Add cess
    projectedTax = projectedTax * 1.04;

    // Monthly TDS requirement
    const remainingTax = Math.max(0, projectedTax - actualTds);
    const monthlyTdsRequired = remainingMonths > 0 ? remainingTax / remainingMonths : 0;

    const taxProjection = {
      financialYear: `FY ${targetYear}-${(targetYear + 1).toString().slice(2)}`,
      income: {
        actualGrossToDate: actualGross,
        projectedRemainingGross,
        projectedAnnualGross,
        projectedAnnualBasic
      },
      deductions: {
        standardDeduction,
        section80C,
        pfContribution: projectedPf,
        totalDeductions: standardDeduction + section80C
      },
      tax: {
        taxableIncome,
        projectedAnnualTax: Math.round(projectedTax),
        actualTdsDeducted: actualTds,
        remainingTaxLiability: Math.round(remainingTax),
        monthlyTdsRequired: Math.round(monthlyTdsRequired)
      },
      notes: [
        'This is an estimate based on current salary structure',
        'Actual tax may vary based on declarations and investments',
        'Consult a tax advisor for accurate tax planning'
      ]
    };

    res.json({ success: true, data: taxProjection });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Email payslip to self
export const emailPayslipToSelf = async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const payslip = await Payslip.findOne({ _id: id, employee: employee._id })
      .populate('payrollRun');

    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    // In production, this would send an actual email
    // For now, we'll just return success
    // You would integrate with nodemailer or similar

    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];

    res.json({ 
      success: true, 
      message: `Payslip for ${monthNames[payslip.month]} ${payslip.year} will be sent to ${employee.email}`,
      data: {
        sentTo: employee.email,
        period: `${monthNames[payslip.month]} ${payslip.year}`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate secure payslip with watermark
export const generateSecurePayslipHtml = async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const payslip = await Payslip.findOne({ _id: id, employee: employee._id })
      .populate('payrollRun');

    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found' });
    }

    const html = generateSecurePayslipTemplate(payslip, employee);
    
    res.json({ success: true, data: { html } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper function for month names
const getMonthName = (month) => {
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  return monthNames[month] || '';
};

// Generate secure payslip HTML template with watermark
const generateSecurePayslipTemplate = (payslip, employee) => {
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (date) => date ? moment(date).format('DD/MM/YYYY') : 'N/A';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payslip - ${monthNames[payslip.month]} ${payslip.year}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      font-size: 11px; 
      color: #333; 
      padding: 20px;
      position: relative;
    }
    
    /* Watermark */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80px;
      color: rgba(200, 200, 200, 0.2);
      font-weight: bold;
      white-space: nowrap;
      pointer-events: none;
      z-index: 1000;
      user-select: none;
    }
    
    .payslip { 
      max-width: 800px; 
      margin: 0 auto; 
      border: 2px solid #1a365d;
      position: relative;
      background: white;
    }
    
    .header { 
      background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); 
      color: white; 
      padding: 20px; 
      text-align: center;
    }
    .header h1 { font-size: 24px; margin-bottom: 5px; letter-spacing: 2px; }
    .header p { opacity: 0.9; font-size: 12px; }
    
    .period { 
      background: #edf2f7; 
      padding: 12px 20px; 
      border-bottom: 1px solid #cbd5e0; 
      text-align: center; 
      font-weight: 600;
      color: #2d3748;
    }
    
    .section { padding: 15px 20px; border-bottom: 1px solid #e2e8f0; }
    .section-title { 
      font-weight: 700; 
      color: #1a365d; 
      margin-bottom: 12px; 
      padding-bottom: 5px; 
      border-bottom: 2px solid #3182ce;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .grid-item { 
      display: flex; 
      justify-content: space-between; 
      padding: 4px 0; 
      border-bottom: 1px dotted #e2e8f0; 
    }
    .grid-item:last-child { border-bottom: none; }
    .label { color: #718096; font-size: 10px; }
    .value { font-weight: 600; color: #2d3748; }
    
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    th { background: #f7fafc; color: #4a5568; font-weight: 600; text-transform: uppercase; font-size: 10px; }
    .amount { text-align: right; font-family: 'Courier New', monospace; }
    .total-row { background: #edf2f7; font-weight: 700; }
    .total-row td { border-top: 2px solid #cbd5e0; }
    
    .net-pay { 
      background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); 
      color: white; 
      padding: 20px; 
      text-align: center;
    }
    .net-pay h3 { font-size: 12px; margin-bottom: 5px; opacity: 0.9; text-transform: uppercase; letter-spacing: 2px; }
    .net-pay .amount { font-size: 32px; font-weight: 700; font-family: 'Courier New', monospace; }
    .net-pay .words { font-size: 10px; opacity: 0.8; margin-top: 5px; font-style: italic; }
    
    .employer-section { background: #faf5ff; border-top: 3px solid #805ad5; }
    .employer-section .section-title { color: #553c9a; border-bottom-color: #805ad5; }
    
    .footer { 
      background: #f7fafc; 
      padding: 15px 20px; 
      font-size: 9px; 
      color: #718096; 
      text-align: center; 
      border-top: 1px solid #e2e8f0;
    }
    .footer .disclaimer {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e0;
      font-style: italic;
    }
    
    .id-section { background: #fffaf0; }
    .id-section .section-title { color: #c05621; border-bottom-color: #ed8936; }
    
    .attendance-box {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 10px;
    }
    .present { background: #c6f6d5; color: #22543d; }
    .absent { background: #fed7d7; color: #742a2a; }
    .lop { background: #feebc8; color: #744210; }
    
    @media print {
      body { padding: 0; }
      .watermark { 
        position: fixed !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .payslip { border: 1px solid #333; }
    }
  </style>
</head>
<body>
  <div class="watermark">CONFIDENTIAL</div>
  
  <div class="payslip">
    <div class="header">
      <h1>COMPANY NAME</h1>
      <p>Salary Slip for ${monthNames[payslip.month]} ${payslip.year}</p>
    </div>
    
    <div class="period">
      Pay Period: ${formatDate(payslip.periodStart)} - ${formatDate(payslip.periodEnd)}
    </div>
    
    <div class="section">
      <div class="section-title">Employee Information</div>
      <div class="two-col">
        <div class="grid">
          <div class="grid-item"><span class="label">Employee ID</span><span class="value">${payslip.employeeSnapshot?.employeeId || ''}</span></div>
          <div class="grid-item"><span class="label">Name</span><span class="value">${payslip.employeeSnapshot?.name || ''}</span></div>
          <div class="grid-item"><span class="label">Department</span><span class="value">${payslip.employeeSnapshot?.department || ''}</span></div>
          <div class="grid-item"><span class="label">Designation</span><span class="value">${payslip.employeeSnapshot?.designation || ''}</span></div>
          <div class="grid-item"><span class="label">Date of Joining</span><span class="value">${formatDate(payslip.employeeSnapshot?.joiningDate)}</span></div>
        </div>
        <div class="grid">
          <div class="grid-item"><span class="label">CTC (Annual)</span><span class="value">${formatCurrency(payslip.ctc)}</span></div>
          <div class="grid-item"><span class="label">Salary Structure</span><span class="value">${payslip.salaryStructureName || ''}</span></div>
          <div class="grid-item"><span class="label">Payment Mode</span><span class="value">${payslip.paymentMode?.replace('_', ' ').toUpperCase() || 'Bank Transfer'}</span></div>
        </div>
      </div>
    </div>
    
    <div class="section id-section">
      <div class="section-title">Statutory Identifiers & Bank Details</div>
      <div class="two-col">
        <div class="grid">
          <div class="grid-item"><span class="label">PAN Number</span><span class="value">${payslip.employeeSnapshot?.panNumber || 'N/A'}</span></div>
          <div class="grid-item"><span class="label">UAN Number</span><span class="value">${payslip.employeeSnapshot?.uanNumber || 'N/A'}</span></div>
          <div class="grid-item"><span class="label">ESI Number</span><span class="value">${payslip.employeeSnapshot?.esiNumber || 'N/A'}</span></div>
        </div>
        <div class="grid">
          <div class="grid-item"><span class="label">Bank Name</span><span class="value">${payslip.employeeSnapshot?.bankDetails?.bankName || 'N/A'}</span></div>
          <div class="grid-item"><span class="label">Account No.</span><span class="value">${payslip.employeeSnapshot?.bankDetails?.accountNumber ? '****' + payslip.employeeSnapshot.bankDetails.accountNumber.slice(-4) : 'N/A'}</span></div>
          <div class="grid-item"><span class="label">IFSC Code</span><span class="value">${payslip.employeeSnapshot?.bankDetails?.ifscCode || 'N/A'}</span></div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">Attendance Summary</div>
      <div style="display: flex; gap: 20px; flex-wrap: wrap;">
        <span class="attendance-box present">Working Days: ${payslip.attendance?.workingDays || 0}</span>
        <span class="attendance-box present">Present: ${payslip.attendance?.presentDays || 0}</span>
        <span class="attendance-box present">Paid Leave: ${payslip.attendance?.paidLeaveDays || 0}</span>
        <span class="attendance-box lop">LOP Days: ${payslip.attendance?.lopDays || 0}</span>
        <span class="attendance-box">Holidays: ${payslip.attendance?.holidays || 0}</span>
        ${payslip.attendance?.overtimeHours > 0 ? `<span class="attendance-box present">Overtime: ${payslip.attendance.overtimeHours} hrs</span>` : ''}
      </div>
    </div>
    
    <div class="section">
      <div class="two-col">
        <div>
          <div class="section-title">Earnings</div>
          <table>
            <thead><tr><th>Component</th><th class="amount">Amount (₹)</th></tr></thead>
            <tbody>
              ${(payslip.earnings || []).map(e => `
                <tr>
                  <td>${e.name}${e.type !== 'regular' ? ` <small>(${e.type})</small>` : ''}</td>
                  <td class="amount">${formatCurrency(e.amount)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td><strong>Total Earnings</strong></td>
                <td class="amount"><strong>${formatCurrency(payslip.totalEarnings)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <div class="section-title">Deductions</div>
          <table>
            <thead><tr><th>Component</th><th class="amount">Amount (₹)</th></tr></thead>
            <tbody>
              ${(payslip.deductions || []).map(d => `
                <tr>
                  <td>${d.name}${d.isStatutory ? ' <small>(Statutory)</small>' : ''}</td>
                  <td class="amount">${formatCurrency(d.amount)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td><strong>Total Deductions</strong></td>
                <td class="amount"><strong>${formatCurrency(payslip.totalDeductions)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    ${payslip.employerContributions?.length > 0 ? `
    <div class="section employer-section">
      <div class="section-title">Employer Contributions (Not Deducted from Salary)</div>
      <table>
        <thead><tr><th>Component</th><th class="amount">Amount (₹)</th></tr></thead>
        <tbody>
          ${payslip.employerContributions.map(c => `
            <tr><td>${c.name}</td><td class="amount">${formatCurrency(c.amount)}</td></tr>
          `).join('')}
          <tr class="total-row">
            <td><strong>Total Employer Contribution</strong></td>
            <td class="amount"><strong>${formatCurrency(payslip.totalEmployerContributions)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
    ` : ''}
    
    <div class="net-pay">
      <h3>Net Pay for ${monthNames[payslip.month]} ${payslip.year}</h3>
      <div class="amount">${formatCurrency(payslip.netSalary)}</div>
      <div class="words">(${numberToWords(payslip.netSalary)} Only)</div>
    </div>
    
    ${payslip.ytdSummary ? `
    <div class="section">
      <div class="section-title">Year to Date Summary (${payslip.year})</div>
      <div class="grid" style="grid-template-columns: repeat(4, 1fr);">
        <div class="grid-item"><span class="label">YTD Gross</span><span class="value">${formatCurrency(payslip.ytdSummary.grossEarnings)}</span></div>
        <div class="grid-item"><span class="label">YTD Deductions</span><span class="value">${formatCurrency(payslip.ytdSummary.totalDeductions)}</span></div>
        <div class="grid-item"><span class="label">YTD Net Pay</span><span class="value">${formatCurrency(payslip.ytdSummary.netPay)}</span></div>
        <div class="grid-item"><span class="label">YTD Tax</span><span class="value">${formatCurrency(payslip.ytdSummary.taxDeducted)}</span></div>
      </div>
    </div>
    ` : ''}
    
    <div class="footer">
      <p>This is a computer-generated payslip and does not require a signature.</p>
      <p>Generated on ${moment().format('DD MMM YYYY, HH:mm:ss')}</p>
      <div class="disclaimer">
        This payslip is confidential and intended solely for the employee named above.
        Any unauthorized use, distribution, or copying is strictly prohibited.
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

// Convert number to words for payslip
const numberToWords = (num) => {
  if (num === 0) return 'Zero Rupees';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const numToWords = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
    return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
  };
  
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  let result = numToWords(rupees) + ' Rupees';
  if (paise > 0) {
    result += ' and ' + numToWords(paise) + ' Paise';
  }
  
  return result;
};

// ===== PAYROLL REPORTS (Story 8.5) =====

// Generate Salary Register Report
export const getSalaryRegisterReport = async (req, res) => {
  try {
    const { month, year, departmentId, format = 'json' } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' });
    }

    const filter = { month: parseInt(month), year: parseInt(year) };

    const payslips = await Payslip.find(filter)
      .populate({
        path: 'employee',
        select: 'employeeId firstName lastName email department designation joiningDate bankDetails',
        populate: [
          { path: 'department', select: 'name' },
          { path: 'designation', select: 'name' }
        ]
      })
      .sort({ 'employeeSnapshot.department': 1, 'employeeSnapshot.employeeId': 1 });

    // Filter by department if specified
    let filteredPayslips = payslips;
    if (departmentId) {
      filteredPayslips = payslips.filter(p => 
        p.employee?.department?._id?.toString() === departmentId ||
        p.employeeSnapshot?.department === departmentId
      );
    }

    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];

    const report = {
      title: 'Salary Register',
      period: `${monthNames[parseInt(month)]} ${year}`,
      generatedAt: new Date(),
      generatedBy: req.user.email,
      summary: {
        totalEmployees: filteredPayslips.length,
        totalGross: filteredPayslips.reduce((sum, p) => sum + (p.grossSalary || 0), 0),
        totalDeductions: filteredPayslips.reduce((sum, p) => sum + (p.totalDeductions || 0), 0),
        totalNet: filteredPayslips.reduce((sum, p) => sum + (p.netSalary || 0), 0)
      },
      entries: filteredPayslips.map(p => ({
        employeeId: p.employeeSnapshot?.employeeId || p.employee?.employeeId,
        name: p.employeeSnapshot?.name || `${p.employee?.firstName} ${p.employee?.lastName}`,
        department: p.employeeSnapshot?.department || p.employee?.department?.name,
        designation: p.employeeSnapshot?.designation || p.employee?.designation?.name,
        workingDays: p.attendance?.workingDays || 0,
        presentDays: p.attendance?.presentDays || 0,
        lopDays: p.attendance?.lopDays || 0,
        basicSalary: p.basicSalary,
        earnings: p.earnings,
        totalEarnings: p.totalEarnings,
        deductions: p.deductions,
        totalDeductions: p.totalDeductions,
        pfEmployee: p.statutory?.pfEmployee || 0,
        esiEmployee: p.statutory?.esiEmployee || 0,
        pt: p.statutory?.professionalTax || 0,
        tds: p.statutory?.tds || 0,
        netSalary: p.netSalary,
        bankAccount: p.employeeSnapshot?.bankDetails?.accountNumber 
          ? '****' + p.employeeSnapshot.bankDetails.accountNumber.slice(-4) 
          : 'N/A'
      }))
    };

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate Department-wise Payroll Report
export const getDepartmentWiseReport = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' });
    }

    const payslips = await Payslip.find({ 
      month: parseInt(month), 
      year: parseInt(year) 
    }).populate({
      path: 'employee',
      populate: { path: 'department', select: 'name' }
    });

    // Group by department
    const departmentMap = {};
    
    for (const payslip of payslips) {
      const deptName = payslip.employeeSnapshot?.department || 
                       payslip.employee?.department?.name || 
                       'Unassigned';
      
      if (!departmentMap[deptName]) {
        departmentMap[deptName] = {
          department: deptName,
          employeeCount: 0,
          totalGross: 0,
          totalDeductions: 0,
          totalNet: 0,
          totalPf: 0,
          totalEsi: 0,
          totalPt: 0,
          totalTds: 0,
          avgSalary: 0
        };
      }

      departmentMap[deptName].employeeCount++;
      departmentMap[deptName].totalGross += payslip.grossSalary || 0;
      departmentMap[deptName].totalDeductions += payslip.totalDeductions || 0;
      departmentMap[deptName].totalNet += payslip.netSalary || 0;
      departmentMap[deptName].totalPf += payslip.statutory?.pfEmployee || 0;
      departmentMap[deptName].totalEsi += payslip.statutory?.esiEmployee || 0;
      departmentMap[deptName].totalPt += payslip.statutory?.professionalTax || 0;
      departmentMap[deptName].totalTds += payslip.statutory?.tds || 0;
    }

    // Calculate averages
    const departments = Object.values(departmentMap).map(dept => ({
      ...dept,
      avgSalary: dept.employeeCount > 0 ? Math.round(dept.totalNet / dept.employeeCount) : 0
    }));

    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];

    const report = {
      title: 'Department-wise Payroll Report',
      period: `${monthNames[parseInt(month)]} ${year}`,
      generatedAt: new Date(),
      summary: {
        totalDepartments: departments.length,
        totalEmployees: payslips.length,
        totalPayroll: departments.reduce((sum, d) => sum + d.totalNet, 0)
      },
      departments: departments.sort((a, b) => b.totalNet - a.totalNet)
    };

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate Statutory Reports (PF/ESI/PT/TDS)
export const getStatutoryReport = async (req, res) => {
  try {
    const { month, year, type } = req.query;

    if (!month || !year || !type) {
      return res.status(400).json({ success: false, message: 'Month, year, and type are required' });
    }

    const payslips = await Payslip.find({ 
      month: parseInt(month), 
      year: parseInt(year) 
    }).populate('employee', 'employeeId firstName lastName panNumber uanNumber esiNumber');

    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];

    let report = {
      title: '',
      period: `${monthNames[parseInt(month)]} ${year}`,
      generatedAt: new Date(),
      entries: [],
      totals: {}
    };

    switch (type) {
      case 'pf':
        report.title = 'Provident Fund Contribution Report';
        report.entries = payslips
          .filter(p => (p.statutory?.pfEmployee || 0) > 0)
          .map(p => ({
            employeeId: p.employeeSnapshot?.employeeId,
            name: p.employeeSnapshot?.name,
            uanNumber: p.employeeSnapshot?.uanNumber || 'N/A',
            grossWages: p.grossSalary,
            pfWages: Math.min(p.basicSalary, 15000),
            employeeContribution: p.statutory?.pfEmployee || 0,
            employerContribution: p.statutory?.pfEmployer || 0,
            pensionContribution: p.statutory?.pensionContribution || 0,
            totalContribution: (p.statutory?.pfEmployee || 0) + (p.statutory?.pfEmployer || 0)
          }));
        report.totals = {
          totalEmployees: report.entries.length,
          employeeContribution: report.entries.reduce((s, e) => s + e.employeeContribution, 0),
          employerContribution: report.entries.reduce((s, e) => s + e.employerContribution, 0),
          totalContribution: report.entries.reduce((s, e) => s + e.totalContribution, 0)
        };
        break;

      case 'esi':
        report.title = 'ESI Contribution Report';
        report.entries = payslips
          .filter(p => (p.statutory?.esiEmployee || 0) > 0)
          .map(p => ({
            employeeId: p.employeeSnapshot?.employeeId,
            name: p.employeeSnapshot?.name,
            esiNumber: p.employeeSnapshot?.esiNumber || 'N/A',
            grossWages: p.grossSalary,
            employeeContribution: p.statutory?.esiEmployee || 0,
            employerContribution: p.statutory?.esiEmployer || 0,
            totalContribution: (p.statutory?.esiEmployee || 0) + (p.statutory?.esiEmployer || 0)
          }));
        report.totals = {
          totalEmployees: report.entries.length,
          employeeContribution: report.entries.reduce((s, e) => s + e.employeeContribution, 0),
          employerContribution: report.entries.reduce((s, e) => s + e.employerContribution, 0),
          totalContribution: report.entries.reduce((s, e) => s + e.totalContribution, 0)
        };
        break;

      case 'pt':
        report.title = 'Professional Tax Report';
        report.entries = payslips
          .filter(p => (p.statutory?.professionalTax || 0) > 0)
          .map(p => ({
            employeeId: p.employeeSnapshot?.employeeId,
            name: p.employeeSnapshot?.name,
            grossSalary: p.grossSalary,
            ptAmount: p.statutory?.professionalTax || 0
          }));
        report.totals = {
          totalEmployees: report.entries.length,
          totalPt: report.entries.reduce((s, e) => s + e.ptAmount, 0)
        };
        break;

      case 'tds':
        report.title = 'Tax Deducted at Source Report';
        report.entries = payslips
          .filter(p => (p.statutory?.tds || 0) > 0)
          .map(p => ({
            employeeId: p.employeeSnapshot?.employeeId,
            name: p.employeeSnapshot?.name,
            panNumber: p.employeeSnapshot?.panNumber || 'N/A',
            grossSalary: p.grossSalary,
            taxableIncome: p.grossSalary, // Simplified
            tdsDeducted: p.statutory?.tds || 0
          }));
        report.totals = {
          totalEmployees: report.entries.length,
          totalTds: report.entries.reduce((s, e) => s + e.tdsDeducted, 0)
        };
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate Variance Analysis (Month-over-Month)
export const getVarianceAnalysisReport = async (req, res) => {
  try {
    const { month1, year1, month2, year2 } = req.query;

    if (!month1 || !year1 || !month2 || !year2) {
      return res.status(400).json({ success: false, message: 'Both periods are required' });
    }

    const payslips1 = await Payslip.find({ 
      month: parseInt(month1), 
      year: parseInt(year1) 
    }).populate('employee', 'employeeId');

    const payslips2 = await Payslip.find({ 
      month: parseInt(month2), 
      year: parseInt(year2) 
    }).populate('employee', 'employeeId');

    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];

    // Create maps for comparison
    const period1Map = {};
    const period2Map = {};

    payslips1.forEach(p => {
      const empId = p.employeeSnapshot?.employeeId || p.employee?.employeeId;
      period1Map[empId] = p;
    });

    payslips2.forEach(p => {
      const empId = p.employeeSnapshot?.employeeId || p.employee?.employeeId;
      period2Map[empId] = p;
    });

    // Calculate totals for each period
    const period1Totals = {
      employees: payslips1.length,
      gross: payslips1.reduce((s, p) => s + (p.grossSalary || 0), 0),
      deductions: payslips1.reduce((s, p) => s + (p.totalDeductions || 0), 0),
      net: payslips1.reduce((s, p) => s + (p.netSalary || 0), 0),
      pf: payslips1.reduce((s, p) => s + (p.statutory?.pfEmployee || 0), 0),
      esi: payslips1.reduce((s, p) => s + (p.statutory?.esiEmployee || 0), 0),
      pt: payslips1.reduce((s, p) => s + (p.statutory?.professionalTax || 0), 0),
      tds: payslips1.reduce((s, p) => s + (p.statutory?.tds || 0), 0)
    };

    const period2Totals = {
      employees: payslips2.length,
      gross: payslips2.reduce((s, p) => s + (p.grossSalary || 0), 0),
      deductions: payslips2.reduce((s, p) => s + (p.totalDeductions || 0), 0),
      net: payslips2.reduce((s, p) => s + (p.netSalary || 0), 0),
      pf: payslips2.reduce((s, p) => s + (p.statutory?.pfEmployee || 0), 0),
      esi: payslips2.reduce((s, p) => s + (p.statutory?.esiEmployee || 0), 0),
      pt: payslips2.reduce((s, p) => s + (p.statutory?.professionalTax || 0), 0),
      tds: payslips2.reduce((s, p) => s + (p.statutory?.tds || 0), 0)
    };

    // Calculate variance
    const calculateVariance = (v1, v2) => ({
      absolute: v2 - v1,
      percentage: v1 > 0 ? ((v2 - v1) / v1 * 100).toFixed(2) : 0
    });

    // Employee-level comparison
    const allEmployeeIds = new Set([...Object.keys(period1Map), ...Object.keys(period2Map)]);
    const employeeVariances = [];

    allEmployeeIds.forEach(empId => {
      const p1 = period1Map[empId];
      const p2 = period2Map[empId];

      if (p1 && p2) {
        const netChange = (p2.netSalary || 0) - (p1.netSalary || 0);
        if (Math.abs(netChange) > 100) { // Only show significant changes
          employeeVariances.push({
            employeeId: empId,
            name: p2.employeeSnapshot?.name || p1.employeeSnapshot?.name,
            period1Net: p1.netSalary,
            period2Net: p2.netSalary,
            change: netChange,
            changePercent: p1.netSalary > 0 ? ((netChange / p1.netSalary) * 100).toFixed(2) : 0,
            reason: netChange > 0 ? 'Increase' : 'Decrease'
          });
        }
      } else if (!p1 && p2) {
        employeeVariances.push({
          employeeId: empId,
          name: p2.employeeSnapshot?.name,
          period1Net: 0,
          period2Net: p2.netSalary,
          change: p2.netSalary,
          changePercent: 100,
          reason: 'New Employee'
        });
      } else if (p1 && !p2) {
        employeeVariances.push({
          employeeId: empId,
          name: p1.employeeSnapshot?.name,
          period1Net: p1.netSalary,
          period2Net: 0,
          change: -p1.netSalary,
          changePercent: -100,
          reason: 'Separated/Inactive'
        });
      }
    });

    const report = {
      title: 'Payroll Variance Analysis',
      period1: `${monthNames[parseInt(month1)]} ${year1}`,
      period2: `${monthNames[parseInt(month2)]} ${year2}`,
      generatedAt: new Date(),
      summaryComparison: {
        employees: {
          period1: period1Totals.employees,
          period2: period2Totals.employees,
          variance: calculateVariance(period1Totals.employees, period2Totals.employees)
        },
        grossSalary: {
          period1: period1Totals.gross,
          period2: period2Totals.gross,
          variance: calculateVariance(period1Totals.gross, period2Totals.gross)
        },
        deductions: {
          period1: period1Totals.deductions,
          period2: period2Totals.deductions,
          variance: calculateVariance(period1Totals.deductions, period2Totals.deductions)
        },
        netSalary: {
          period1: period1Totals.net,
          period2: period2Totals.net,
          variance: calculateVariance(period1Totals.net, period2Totals.net)
        },
        pf: {
          period1: period1Totals.pf,
          period2: period2Totals.pf,
          variance: calculateVariance(period1Totals.pf, period2Totals.pf)
        },
        tds: {
          period1: period1Totals.tds,
          period2: period2Totals.tds,
          variance: calculateVariance(period1Totals.tds, period2Totals.tds)
        }
      },
      employeeVariances: employeeVariances.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    };

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Generate Overtime and Shift Allowance Report
export const getOvertimeShiftReport = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year are required' });
    }

    const payslips = await Payslip.find({ 
      month: parseInt(month), 
      year: parseInt(year),
      $or: [
        { 'adjustments.overtimePay': { $gt: 0 } },
        { 'adjustments.shiftAllowance': { $gt: 0 } }
      ]
    }).populate({
      path: 'employee',
      populate: { path: 'department', select: 'name' }
    });

    const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];

    const report = {
      title: 'Overtime and Shift Allowance Report',
      period: `${monthNames[parseInt(month)]} ${year}`,
      generatedAt: new Date(),
      summary: {
        totalEmployees: payslips.length,
        totalOvertimeHours: payslips.reduce((s, p) => s + (p.attendance?.overtimeHours || 0), 0),
        totalOvertimePay: payslips.reduce((s, p) => s + (p.adjustments?.overtimePay || 0), 0),
        totalShiftAllowance: payslips.reduce((s, p) => s + (p.adjustments?.shiftAllowance || 0), 0)
      },
      entries: payslips.map(p => ({
        employeeId: p.employeeSnapshot?.employeeId,
        name: p.employeeSnapshot?.name,
        department: p.employeeSnapshot?.department || p.employee?.department?.name,
        overtimeHours: p.attendance?.overtimeHours || 0,
        overtimePay: p.adjustments?.overtimePay || 0,
        shiftAllowance: p.adjustments?.shiftAllowance || 0,
        total: (p.adjustments?.overtimePay || 0) + (p.adjustments?.shiftAllowance || 0)
      })).sort((a, b) => b.total - a.total)
    };

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== ARREARS & RETRO PAY (Story 8.6) =====

// Calculate arrears for salary revision
export const calculateArrears = async (req, res) => {
  try {
    const { employeeId, effectiveFrom, oldCtc, newCtc, reason } = req.body;

    if (!employeeId || !effectiveFrom || !oldCtc || !newCtc) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const employee = await Employee.findById(employeeId)
      .populate('salaryStructure');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const effectiveDate = moment(effectiveFrom);
    const currentDate = moment();

    // Find all payslips from effective date to current
    const affectedPayslips = await Payslip.find({
      employee: employeeId,
      $or: [
        { year: effectiveDate.year(), month: { $gte: effectiveDate.month() + 1 } },
        { year: { $gt: effectiveDate.year() } }
      ],
      year: { $lte: currentDate.year() },
      isFinalized: true
    }).sort({ year: 1, month: 1 });

    const monthlyOldGross = oldCtc / 12;
    const monthlyNewGross = newCtc / 12;
    const monthlyDiff = monthlyNewGross - monthlyOldGross;

    let totalArrears = 0;
    const arrearsBreakdown = [];

    for (const payslip of affectedPayslips) {
      // Calculate arrears for this month
      const paidGross = payslip.grossSalary;
      const expectedGross = monthlyNewGross;
      const arrear = expectedGross - paidGross;

      if (arrear > 0) {
        arrearsBreakdown.push({
          month: payslip.month,
          year: payslip.year,
          paidGross,
          expectedGross,
          arrear: Math.round(arrear),
          payslipId: payslip._id
        });
        totalArrears += arrear;
      }
    }

    // Calculate deduction arrears
    const deductionArrears = {
      pfArrear: Math.round(totalArrears * 0.12 * 0.4), // 12% of 40% (basic)
      esiArrear: monthlyNewGross <= 21000 ? Math.round(totalArrears * 0.0075) : 0
    };

    const netArrears = totalArrears - deductionArrears.pfArrear - deductionArrears.esiArrear;

    res.json({
      success: true,
      data: {
        employee: {
          id: employee._id,
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`
        },
        effectiveFrom: effectiveDate.format('YYYY-MM-DD'),
        oldCtc,
        newCtc,
        monthlyDiff: Math.round(monthlyDiff),
        affectedMonths: arrearsBreakdown.length,
        breakdown: arrearsBreakdown,
        summary: {
          grossArrears: Math.round(totalArrears),
          pfArrears: deductionArrears.pfArrear,
          esiArrears: deductionArrears.esiArrear,
          netArrears: Math.round(netArrears)
        },
        reason: reason || 'salary_revision'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Process arrears and add to payroll
export const processArrears = async (req, res) => {
  try {
    const { 
      employeeId, 
      payrollRunId, 
      grossArrears, 
      pfArrears, 
      esiArrears, 
      netArrears,
      reason,
      affectedPeriod 
    } = req.body;

    const payrollRun = await PayrollRun.findById(payrollRunId);
    if (!payrollRun) {
      return res.status(404).json({ success: false, message: 'Payroll run not found' });
    }

    if (payrollRun.isLocked) {
      return res.status(400).json({ success: false, message: 'Payroll is locked' });
    }

    // Find existing payslip for this payroll run
    const payslip = await Payslip.findOne({
      employee: employeeId,
      payrollRun: payrollRunId
    });

    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found for this payroll run' });
    }

    // Add arrears to earnings
    const arrearsEarning = {
      name: 'Salary Arrears',
      code: 'ARR',
      type: 'arrears',
      amount: grossArrears,
      calculatedFrom: `Arrears from ${affectedPeriod}`,
      taxability: 'taxable'
    };

    payslip.earnings.push(arrearsEarning);
    payslip.totalEarnings += grossArrears;
    payslip.grossSalary += grossArrears;

    // Update deductions
    if (pfArrears > 0) {
      const pfDeduction = payslip.deductions.find(d => d.code === 'PF_EE');
      if (pfDeduction) {
        pfDeduction.amount += pfArrears;
      }
      payslip.statutory.pfEmployee += pfArrears;
      payslip.totalDeductions += pfArrears;
    }

    if (esiArrears > 0) {
      const esiDeduction = payslip.deductions.find(d => d.code === 'ESI_EE');
      if (esiDeduction) {
        esiDeduction.amount += esiArrears;
      }
      payslip.statutory.esiEmployee += esiArrears;
      payslip.totalDeductions += esiArrears;
    }

    // Update net salary
    payslip.netSalary = payslip.grossSalary - payslip.totalDeductions;

    // Store arrears details
    payslip.adjustments.arrears = grossArrears;
    payslip.adjustments.arrearsDetails = {
      reason,
      affectedPeriod,
      grossArrears,
      pfArrears,
      esiArrears,
      netArrears,
      processedAt: new Date()
    };

    await payslip.save();

    res.json({ 
      success: true, 
      message: 'Arrears processed successfully',
      data: {
        payslipId: payslip._id,
        newGrossSalary: payslip.grossSalary,
        newNetSalary: payslip.netSalary,
        arrearsAdded: grossArrears
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get pending arrears for employees
export const getPendingArrears = async (req, res) => {
  try {
    // Find employees with salary revisions that may need arrears
    const employees = await Employee.find({
      status: 'active',
      'salaryHistory.1': { $exists: true } // Has at least 2 entries
    })
      .select('employeeId firstName lastName salaryHistory')
      .populate('salaryHistory.salaryStructure', 'name');

    const pendingArrears = [];
    const currentMonth = moment().month() + 1;
    const currentYear = moment().year();

    for (const employee of employees) {
      const lastRevision = employee.salaryHistory[employee.salaryHistory.length - 1];
      const previousRevision = employee.salaryHistory[employee.salaryHistory.length - 2];

      if (!lastRevision || !previousRevision) continue;

      const revisionDate = moment(lastRevision.effectiveFrom);
      
      // Check if revision was in the past and might have arrears
      if (revisionDate.isBefore(moment().startOf('month'))) {
        // Check if arrears were already processed
        const arrearsProcessed = await Payslip.findOne({
          employee: employee._id,
          'adjustments.arrearsDetails.processedAt': { $exists: true },
          year: currentYear
        });

        if (!arrearsProcessed && lastRevision.ctc > previousRevision.ctc) {
          pendingArrears.push({
            employeeId: employee.employeeId,
            name: `${employee.firstName} ${employee.lastName}`,
            previousCtc: previousRevision.ctc,
            newCtc: lastRevision.ctc,
            effectiveFrom: lastRevision.effectiveFrom,
            reason: lastRevision.reason,
            potentialArrears: ((lastRevision.ctc - previousRevision.ctc) / 12) * 
              moment().diff(revisionDate, 'months')
          });
        }
      }
    }

    res.json({ success: true, data: pendingArrears });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== FULL & FINAL SETTLEMENT (Story 8.7) =====

// Create F&F Settlement
export const createSettlement = async (req, res) => {
  try {
    const { 
      employeeId, 
      lastWorkingDate, 
      separationType,
      noticePeriodDays,
      noticePeriodServed,
      remarks 
    } = req.body;

    const employee = await Employee.findById(employeeId)
      .populate('department', 'name')
      .populate('designation', 'name')
      .populate('salaryStructure');

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const lwdMoment = moment(lastWorkingDate);
    const joiningMoment = moment(employee.joiningDate);
    const totalServiceDays = lwdMoment.diff(joiningMoment, 'days');
    const totalServiceYears = lwdMoment.diff(joiningMoment, 'years', true);

    // Calculate components
    const monthlyGross = employee.ctc / 12;
    const dailyGross = monthlyGross / 30;
    const basicSalary = monthlyGross * 0.4;
    const dailyBasic = basicSalary / 30;

    // 1. Notice Period Pay/Recovery
    const noticePeriodRequired = noticePeriodDays || 30;
    const noticePeriodShortfall = Math.max(0, noticePeriodRequired - (noticePeriodServed || 0));
    const noticePeriodRecovery = noticePeriodShortfall * dailyGross;
    const noticePeriodPayout = noticePeriodServed > noticePeriodRequired 
      ? (noticePeriodServed - noticePeriodRequired) * dailyGross 
      : 0;

    // 2. Leave Encashment
    const leaveBalances = await LeaveRequest.aggregate([
      { $match: { employee: employee._id, status: 'approved' } },
      { $group: { _id: '$leaveType', totalUsed: { $sum: '$days' } } }
    ]);

    // Get leave type configurations
    const leaveTypes = await LeaveType.find({ isActive: true, allowEncashment: true });
    let leaveEncashmentAmount = 0;
    const leaveEncashmentDetails = [];

    for (const leaveType of leaveTypes) {
      const used = leaveBalances.find(lb => lb._id?.toString() === leaveType._id.toString())?.totalUsed || 0;
      const balance = (leaveType.defaultDays || 0) - used;
      
      if (balance > 0 && leaveType.encashmentLimit) {
        const encashableDays = Math.min(balance, leaveType.encashmentLimit);
        const encashmentValue = encashableDays * dailyBasic;
        leaveEncashmentAmount += encashmentValue;
        
        leaveEncashmentDetails.push({
          leaveType: leaveType.name,
          balance,
          encashableDays,
          ratePerDay: dailyBasic,
          amount: Math.round(encashmentValue)
        });
      }
    }

    // 3. Gratuity Calculation (if eligible - 5 years service)
    let gratuityAmount = 0;
    let gratuityEligible = false;
    
    if (totalServiceYears >= 5) {
      gratuityEligible = true;
      // Gratuity = (15 * Last drawn basic salary * Tenure in years) / 26
      gratuityAmount = Math.round((15 * basicSalary * Math.floor(totalServiceYears)) / 26);
    }

    // 4. Pending Salary (current month pro-rata)
    const currentMonthDays = moment().daysInMonth();
    const workedDaysThisMonth = lwdMoment.date();
    const pendingSalary = (monthlyGross / currentMonthDays) * workedDaysThisMonth;

    // 5. Pending Reimbursements (placeholder - would come from expense claims)
    const pendingReimbursements = 0;

    // 6. Deductions
    // Get any pending loans/advances
    const pendingRecoveries = 0; // Placeholder for loan deductions

    // PF and ESI for current month
    const pfDeduction = Math.min(basicSalary * 0.12, 15000 * 0.12);
    const esiDeduction = monthlyGross <= 21000 ? monthlyGross * 0.0075 : 0;
    const ptDeduction = 200; // Standard PT

    // Calculate totals
    const totalEarnings = pendingSalary + leaveEncashmentAmount + gratuityAmount + 
                          noticePeriodPayout + pendingReimbursements;
    const totalDeductions = noticePeriodRecovery + pfDeduction + esiDeduction + 
                            ptDeduction + pendingRecoveries;
    const netSettlement = totalEarnings - totalDeductions;

    const settlement = {
      employee: {
        id: employee._id,
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        department: employee.department?.name,
        designation: employee.designation?.name,
        joiningDate: employee.joiningDate,
        lastWorkingDate,
        separationType
      },
      service: {
        totalDays: totalServiceDays,
        totalYears: Number(totalServiceYears.toFixed(2)),
        joiningDate: employee.joiningDate,
        lastWorkingDate
      },
      salary: {
        ctc: employee.ctc,
        monthlyGross,
        basicSalary,
        dailyGross: Math.round(dailyGross)
      },
      earnings: {
        pendingSalary: Math.round(pendingSalary),
        pendingSalaryDays: workedDaysThisMonth,
        leaveEncashment: {
          total: Math.round(leaveEncashmentAmount),
          details: leaveEncashmentDetails
        },
        gratuity: {
          eligible: gratuityEligible,
          amount: gratuityAmount,
          serviceYears: Math.floor(totalServiceYears)
        },
        noticePeriod: {
          required: noticePeriodRequired,
          served: noticePeriodServed || 0,
          payout: Math.round(noticePeriodPayout)
        },
        reimbursements: pendingReimbursements,
        totalEarnings: Math.round(totalEarnings)
      },
      deductions: {
        noticePeriodRecovery: Math.round(noticePeriodRecovery),
        noticePeriodShortfall,
        pfDeduction: Math.round(pfDeduction),
        esiDeduction: Math.round(esiDeduction),
        professionalTax: ptDeduction,
        pendingRecoveries,
        totalDeductions: Math.round(totalDeductions)
      },
      netSettlement: Math.round(netSettlement),
      remarks,
      calculatedAt: new Date(),
      calculatedBy: req.user._id,
      status: 'draft'
    };

    res.json({ success: true, data: settlement });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Finalize F&F Settlement
export const finalizeSettlement = async (req, res) => {
  try {
    const { employeeId, settlementData } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Create settlement payslip
    const payslip = await Payslip.create({
      employee: employeeId,
      month: moment(settlementData.employee.lastWorkingDate).month() + 1,
      year: moment(settlementData.employee.lastWorkingDate).year(),
      periodStart: moment(settlementData.employee.lastWorkingDate).startOf('month').toDate(),
      periodEnd: moment(settlementData.employee.lastWorkingDate).toDate(),
      employeeSnapshot: {
        employeeId: employee.employeeId,
        name: `${employee.firstName} ${employee.lastName}`,
        department: settlementData.employee.department,
        designation: settlementData.employee.designation,
        joiningDate: employee.joiningDate,
        panNumber: employee.panNumber,
        uanNumber: employee.uanNumber,
        esiNumber: employee.esiNumber,
        bankDetails: employee.bankDetails
      },
      ctc: employee.ctc,
      monthlyGross: settlementData.salary.monthlyGross,
      basicSalary: settlementData.salary.basicSalary,
      earnings: [
        { name: 'Pending Salary', code: 'SAL', type: 'regular', amount: settlementData.earnings.pendingSalary },
        { name: 'Leave Encashment', code: 'LE', type: 'other', amount: settlementData.earnings.leaveEncashment.total },
        ...(settlementData.earnings.gratuity.eligible ? [{ name: 'Gratuity', code: 'GRAT', type: 'other', amount: settlementData.earnings.gratuity.amount }] : []),
        ...(settlementData.earnings.noticePeriod.payout > 0 ? [{ name: 'Notice Period Pay', code: 'NP', type: 'other', amount: settlementData.earnings.noticePeriod.payout }] : [])
      ],
      totalEarnings: settlementData.earnings.totalEarnings,
      deductions: [
        { name: 'PF Contribution', code: 'PF_EE', type: 'statutory', amount: settlementData.deductions.pfDeduction, isStatutory: true },
        { name: 'ESI Contribution', code: 'ESI_EE', type: 'statutory', amount: settlementData.deductions.esiDeduction, isStatutory: true },
        { name: 'Professional Tax', code: 'PT', type: 'statutory', amount: settlementData.deductions.professionalTax, isStatutory: true },
        ...(settlementData.deductions.noticePeriodRecovery > 0 ? [{ name: 'Notice Period Recovery', code: 'NPR', type: 'other', amount: settlementData.deductions.noticePeriodRecovery }] : [])
      ],
      totalDeductions: settlementData.deductions.totalDeductions,
      grossSalary: settlementData.earnings.totalEarnings,
      netSalary: settlementData.netSettlement,
      statutory: {
        pfEmployee: settlementData.deductions.pfDeduction,
        professionalTax: settlementData.deductions.professionalTax
      },
      remarks: `Full & Final Settlement - ${settlementData.employee.separationType}`,
      isFinalized: true,
      finalizedAt: new Date(),
      generatedBy: req.user._id
    });

    // Update employee status
    employee.status = 'inactive';
    employee.exitDate = settlementData.employee.lastWorkingDate;
    employee.exitType = settlementData.employee.separationType;
    
    employee.history.push({
      type: 'separation',
      oldValue: { status: 'active' },
      newValue: { 
        status: 'inactive', 
        exitDate: settlementData.employee.lastWorkingDate,
        exitType: settlementData.employee.separationType,
        settlementAmount: settlementData.netSettlement
      },
      changedBy: req.user._id,
      changedAt: new Date(),
      reason: settlementData.remarks
    });

    await employee.save();

    res.json({ 
      success: true, 
      message: 'Settlement finalized successfully',
      data: {
        payslipId: payslip._id,
        settlementAmount: settlementData.netSettlement,
        employeeStatus: 'inactive'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get settlement summary for an employee
export const getSettlementPreview = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { lastWorkingDate } = req.query;

    // Redirect to create settlement with minimal data
    req.body = {
      employeeId,
      lastWorkingDate: lastWorkingDate || moment().format('YYYY-MM-DD'),
      separationType: 'resignation',
      noticePeriodDays: 30,
      noticePeriodServed: 30
    };

    return createSettlement(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
