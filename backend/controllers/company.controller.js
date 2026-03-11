import Company from '../models/company.model.js';
import Employee from '../models/employee.model.js';

// Get all companies
export const getCompanies = async (req, res) => {
  try {
    const { search, isActive, parent } = req.query;
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

    if (parent !== undefined) {
      if (parent === 'null' || parent === '') {
        filter.parent = null;
      } else {
        filter.parent = parent;
      }
    }

    const companies = await Company.find(filter)
      .populate('parent', 'name code')
      .sort({ name: 1 });

    res.json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single company
export const getCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('parent', 'name code');

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    res.json({ success: true, data: company });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create company
export const createCompany = async (req, res) => {
  try {
    const { name, code, legalName, registrationNumber, taxId, address, phone, email, website, parent, description } = req.body;

    // Validate parent if provided
    if (parent) {
      const parentCompany = await Company.findById(parent);
      if (!parentCompany) {
        return res.status(400).json({ success: false, message: 'Parent company not found' });
      }
      if (!parentCompany.isActive) {
        return res.status(400).json({ success: false, message: 'Cannot assign to inactive parent company' });
      }
    }

    const existing = await Company.findOne({ $or: [{ name }, { code }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Company name or code already exists' });
    }

    const company = await Company.create({
      name,
      code,
      legalName,
      registrationNumber,
      taxId,
      address,
      phone,
      email,
      website,
      parent: parent || null,
      description
    });

    const populatedCompany = await Company.findById(company._id)
      .populate('parent', 'name code');

    res.status(201).json({ success: true, message: 'Company created successfully', data: populatedCompany });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update company
export const updateCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const { name, code, parent, isActive, ...updateData } = req.body;

    // Prevent circular reference
    if (parent && parent === req.params.id) {
      return res.status(400).json({ success: false, message: 'Company cannot be its own parent' });
    }

    // Validate parent if provided
    if (parent !== undefined) {
      if (parent) {
        const parentCompany = await Company.findById(parent);
        if (!parentCompany) {
          return res.status(400).json({ success: false, message: 'Parent company not found' });
        }
        if (!parentCompany.isActive) {
          return res.status(400).json({ success: false, message: 'Cannot assign to inactive parent company' });
        }
        // Check for circular reference in hierarchy
        let current = parentCompany;
        while (current && current.parent) {
          if (current.parent.toString() === req.params.id) {
            return res.status(400).json({ success: false, message: 'Circular reference detected in company hierarchy' });
          }
          current = await Company.findById(current.parent);
        }
      }
    }

    if (name || code) {
      const existing = await Company.findOne({
        _id: { $ne: req.params.id },
        $or: [{ name }, { code }]
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Company name or code already exists' });
      }
    }

    // Check if deactivating and has active children
    if (isActive === false && company.isActive) {
      const activeChildren = await Company.countDocuments({ parent: req.params.id, isActive: true });
      if (activeChildren > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot deactivate company. ${activeChildren} active child company/companies exist.`
        });
      }
    }

    Object.assign(company, { name, code, parent: parent || null, isActive, ...updateData });
    await company.save();

    const updatedCompany = await Company.findById(company._id)
      .populate('parent', 'name code');

    res.json({ success: true, message: 'Company updated successfully', data: updatedCompany });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete company
export const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Check for child companies
    const childCount = await Company.countDocuments({ parent: req.params.id });
    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete company. ${childCount} child company/companies exist.`
      });
    }

    // Check for branches
    const Branch = (await import('../models/branch.model.js')).default;
    const branchCount = await Branch.countDocuments({ company: req.params.id });
    if (branchCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete company. ${branchCount} branch/branches are associated with this company.`
      });
    }

    await Company.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

