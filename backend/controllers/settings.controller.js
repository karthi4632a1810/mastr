import Branch from '../models/branch.model.js';
import Settings from '../models/settings.model.js';
import AuditLog from '../models/auditLog.model.js';
import Employee from '../models/employee.model.js';

export const getBranches = async (req, res) => {
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

    const branches = await Branch.find(filter)
      .populate('parent', 'name code')
      .populate('company', 'name code')
      .sort({ name: 1 });
    res.json({ success: true, data: branches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id)
      .populate('parent', 'name code')
      .populate('company', 'name code');
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }
    res.json({ success: true, data: branch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createBranch = async (req, res) => {
  try {
    const { name, code, address, phone, email, parent, company } = req.body;

    // Validate parent if provided
    if (parent) {
      const parentBranch = await Branch.findById(parent);
      if (!parentBranch) {
        return res.status(400).json({ success: false, message: 'Parent branch not found' });
      }
      if (!parentBranch.isActive) {
        return res.status(400).json({ success: false, message: 'Cannot assign to inactive parent branch' });
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

    const existing = await Branch.findOne({ $or: [{ name }, { code }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Branch name or code already exists' });
    }

    const branch = await Branch.create({ name, code, address, phone, email, parent: parent || null, company: company || null });
    
    const populatedBranch = await Branch.findById(branch._id)
      .populate('parent', 'name code')
      .populate('company', 'name code');

    res.status(201).json({ success: true, message: 'Branch created successfully', data: populatedBranch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const { name, code, parent, company, isActive, ...updateData } = req.body;

    // Prevent circular reference
    if (parent && parent === req.params.id) {
      return res.status(400).json({ success: false, message: 'Branch cannot be its own parent' });
    }

    // Validate parent if provided
    if (parent !== undefined) {
      if (parent) {
        const parentBranch = await Branch.findById(parent);
        if (!parentBranch) {
          return res.status(400).json({ success: false, message: 'Parent branch not found' });
        }
        if (!parentBranch.isActive) {
          return res.status(400).json({ success: false, message: 'Cannot assign to inactive parent branch' });
        }
        // Check for circular reference
        let current = parentBranch;
        while (current && current.parent) {
          if (current.parent.toString() === req.params.id) {
            return res.status(400).json({ success: false, message: 'Circular reference detected in branch hierarchy' });
          }
          current = await Branch.findById(current.parent);
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

    // Check if deactivating and has active children or employees
    if (isActive === false && branch.isActive) {
      const activeChildren = await Branch.countDocuments({ parent: req.params.id, isActive: true });
      if (activeChildren > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot deactivate branch. ${activeChildren} active child branch/branches exist.`
        });
      }

      const employeeCount = await Employee.countDocuments({ branch: req.params.id, status: 'active' });
      if (employeeCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot deactivate branch. ${employeeCount} active employee(s) are assigned to this branch.`
        });
      }
    }

    if (name || code) {
      const existing = await Branch.findOne({
        _id: { $ne: req.params.id },
        $or: [{ name }, { code }]
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Branch name or code already exists' });
      }
    }

    Object.assign(branch, {
      name,
      code,
      parent: parent !== undefined ? (parent || null) : branch.parent,
      company: company !== undefined ? (company || null) : branch.company,
      isActive,
      ...updateData
    });
    await branch.save();

    const updatedBranch = await Branch.findById(branch._id)
      .populate('parent', 'name code')
      .populate('company', 'name code');

    res.json({ success: true, message: 'Branch updated successfully', data: updatedBranch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    // Check for child branches
    const childCount = await Branch.countDocuments({ parent: req.params.id });
    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete branch. ${childCount} child branch/branches exist.`
      });
    }

    // Check for employees
    const employeeCount = await Employee.countDocuments({ branch: req.params.id });
    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete branch. ${employeeCount} employee(s) are assigned to this branch.`
      });
    }

    await Branch.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Branch deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Settings Management
export const getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Settings.findOne({ key });
    
    if (!setting) {
      return res.json({ success: true, data: null });
    }
    
    res.json({ success: true, data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    let setting = await Settings.findOne({ key });
    
    if (setting) {
      setting.value = value;
      if (description !== undefined) setting.description = description;
      setting.updatedBy = req.user._id;
      await setting.save();
    } else {
      setting = await Settings.create({
        key,
        value,
        description: description || '',
        updatedBy: req.user._id
      });
    }

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'UPDATE_SETTING',
      resource: `setting:${key}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      requestBody: { key, value },
      timestamp: new Date()
    });

    res.json({ success: true, message: 'Setting updated successfully', data: setting });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllSettings = async (req, res) => {
  try {
    const settings = await Settings.find().sort({ key: 1 });
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
