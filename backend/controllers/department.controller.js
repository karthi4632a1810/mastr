import Department from '../models/department.model.js';
import Employee from '../models/employee.model.js';

// Get all departments
export const getDepartments = async (req, res) => {
  try {
    const { search, isActive } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const departments = await Department.find(filter)
      .populate('head', 'firstName lastName employeeId')
      .populate('parent', 'name code')
      .populate('company', 'name code')
      .populate('branch', 'name code')
      .sort({ name: 1 });

    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single department
export const getDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('head', 'firstName lastName employeeId email')
      .populate('parent', 'name code')
      .populate('company', 'name code')
      .populate('branch', 'name code');

    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    res.json({ success: true, data: department });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create department
export const createDepartment = async (req, res) => {
  try {
    const { name, code, description, head, parent, company, branch } = req.body;

    // Validate parent if provided
    if (parent) {
      const parentDept = await Department.findById(parent);
      if (!parentDept) {
        return res.status(400).json({ success: false, message: 'Parent department not found' });
      }
      if (!parentDept.isActive) {
        return res.status(400).json({ success: false, message: 'Cannot assign to inactive parent department' });
      }
    }

    // Validate company if provided
    if (company) {
      const Company = (await import('../models/company.model.js')).default;
      const companyObj = await Company.findById(company);
      if (!companyObj) {
        return res.status(400).json({ success: false, message: 'Company not found' });
      }
      if (!companyObj.isActive) {
        return res.status(400).json({ success: false, message: 'Cannot assign to inactive company' });
      }
    }

    // Validate branch if provided
    if (branch) {
      const Branch = (await import('../models/branch.model.js')).default;
      const branchObj = await Branch.findById(branch);
      if (!branchObj) {
        return res.status(400).json({ success: false, message: 'Branch not found' });
      }
      if (!branchObj.isActive) {
        return res.status(400).json({ success: false, message: 'Cannot assign to inactive branch' });
      }
    }

    const existing = await Department.findOne({ $or: [{ name }, { code }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Department name or code already exists' });
    }

    const department = await Department.create({ name, code, description, head, parent: parent || null, company: company || null, branch: branch || null });

    const populatedDept = await Department.findById(department._id)
      .populate('parent', 'name code')
      .populate('company', 'name code')
      .populate('branch', 'name code')
      .populate('head', 'firstName lastName employeeId');

    res.status(201).json({ success: true, message: 'Department created successfully', data: populatedDept });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update department
export const updateDepartment = async (req, res) => {
  try {
    const { name, code, description, head, parent, company, branch, isActive } = req.body;

    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    // Prevent circular reference
    if (parent && parent === req.params.id) {
      return res.status(400).json({ success: false, message: 'Department cannot be its own parent' });
    }

    // Validate parent if provided
    if (parent !== undefined) {
      if (parent) {
        const parentDept = await Department.findById(parent);
        if (!parentDept) {
          return res.status(400).json({ success: false, message: 'Parent department not found' });
        }
        if (!parentDept.isActive) {
          return res.status(400).json({ success: false, message: 'Cannot assign to inactive parent department' });
        }
        // Check for circular reference
        let current = parentDept;
        while (current && current.parent) {
          if (current.parent.toString() === req.params.id) {
            return res.status(400).json({ success: false, message: 'Circular reference detected in department hierarchy' });
          }
          current = await Department.findById(current.parent);
        }
      }
    }

    // Validate company if provided
    if (company !== undefined) {
      if (company) {
        const Company = (await import('../models/company.model.js')).default;
        const companyObj = await Company.findById(company);
        if (!companyObj) {
          return res.status(400).json({ success: false, message: 'Company not found' });
        }
        if (!companyObj.isActive) {
          return res.status(400).json({ success: false, message: 'Cannot assign to inactive company' });
        }
      }
    }

    // Validate branch if provided
    if (branch !== undefined) {
      if (branch) {
        const Branch = (await import('../models/branch.model.js')).default;
        const branchObj = await Branch.findById(branch);
        if (!branchObj) {
          return res.status(400).json({ success: false, message: 'Branch not found' });
        }
        if (!branchObj.isActive) {
          return res.status(400).json({ success: false, message: 'Cannot assign to inactive branch' });
        }
      }
    }

    // Check if deactivating and has active children or employees
    if (isActive === false && department.isActive) {
      const activeChildren = await Department.countDocuments({ parent: req.params.id, isActive: true });
      if (activeChildren > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot deactivate department. ${activeChildren} active child department(s) exist.`
        });
      }

      const employeeCount = await Employee.countDocuments({ department: req.params.id, status: 'active' });
      if (employeeCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot deactivate department. ${employeeCount} active employee(s) are assigned to this department.`
        });
      }
    }

    if (name || code) {
      const existing = await Department.findOne({
        _id: { $ne: req.params.id },
        $or: [{ name }, { code }]
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Department name or code already exists' });
      }
    }

    Object.assign(department, {
      name,
      code,
      description,
      head,
      parent: parent !== undefined ? (parent || null) : department.parent,
      company: company !== undefined ? (company || null) : department.company,
      branch: branch !== undefined ? (branch || null) : department.branch,
      isActive
    });
    await department.save();

    const updatedDept = await Department.findById(department._id)
      .populate('parent', 'name code')
      .populate('company', 'name code')
      .populate('branch', 'name code')
      .populate('head', 'firstName lastName employeeId');

    res.json({ success: true, message: 'Department updated successfully', data: updatedDept });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete department
export const deleteDepartment = async (req, res) => {
  try {
    const employees = await Employee.countDocuments({ department: req.params.id });
    if (employees > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete department. ${employees} employee(s) are assigned to this department.` 
      });
    }

    await Department.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
