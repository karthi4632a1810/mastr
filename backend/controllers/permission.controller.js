import Permission from '../models/permission.model.js';

// Get all permissions
export const getPermissions = async (req, res) => {
  try {
    const { module, action, isActive } = req.query;
    const query = {};

    if (module) query.module = module;
    if (action) query.action = action;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const permissions = await Permission.find(query).sort({ module: 1, action: 1 });

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single permission
export const getPermission = async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id);

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Permission not found' });
    }

    res.json({ success: true, data: permission });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create permission
export const createPermission = async (req, res) => {
  try {
    const { name, code, module, action, description } = req.body;

    if (!name || !code || !module || !action) {
      return res.status(400).json({
        success: false,
        message: 'Name, code, module, and action are required'
      });
    }

    const permission = await Permission.create({
      name,
      code: code.toUpperCase(),
      module,
      action,
      description: description || ''
    });

    res.status(201).json({
      success: true,
      message: 'Permission created successfully',
      data: permission
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Permission with this name or code already exists'
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update permission
export const updatePermission = async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id);

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Permission not found' });
    }

    Object.assign(permission, req.body);
    if (req.body.code) {
      permission.code = req.body.code.toUpperCase();
    }
    await permission.save();

    res.json({
      success: true,
      message: 'Permission updated successfully',
      data: permission
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Permission with this name or code already exists'
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete permission
export const deletePermission = async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id);

    if (!permission) {
      return res.status(404).json({ success: false, message: 'Permission not found' });
    }

    // Check if permission is used by any role
    const Role = (await import('../models/role.model.js')).default;
    const rolesUsingPermission = await Role.find({ permissions: permission._id });

    if (rolesUsingPermission.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete permission. It is used by ${rolesUsingPermission.length} role(s)`
      });
    }

    await Permission.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Permission deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get permissions by module
export const getPermissionsByModule = async (req, res) => {
  try {
    const { module } = req.params;
    const permissions = await Permission.find({ module, isActive: true }).sort({ action: 1 });

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

