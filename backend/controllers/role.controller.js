import Role from '../models/role.model.js';
import Permission from '../models/permission.model.js';
import User from '../models/user.model.js';
import AuditLog from '../models/auditLog.model.js';

// Get all roles
export const getRoles = async (req, res) => {
  try {
    const { isActive, isSystemRole } = req.query;
    const query = {};

    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (isSystemRole !== undefined) query.isSystemRole = isSystemRole === 'true';

    const roles = await Role.find(query)
      .populate('permissions', 'name code module action')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single role
export const getRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id)
      .populate('permissions', 'name code module action description')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email');

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    res.json({ success: true, data: role });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create role
export const createRole = async (req, res) => {
  try {
    const { name, code, description, permissions } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name and code are required'
      });
    }

    // Validate permissions if provided
    if (permissions && permissions.length > 0) {
      const validPermissions = await Permission.find({
        _id: { $in: permissions },
        isActive: true
      });

      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more permissions are invalid or inactive'
        });
      }
    }

    const role = await Role.create({
      name,
      code: code.toUpperCase(),
      description: description || '',
      permissions: permissions || [],
      createdBy: req.user._id
    });

    const populatedRole = await Role.findById(role._id)
      .populate('permissions', 'name code module action');

    // Log permission change
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'CREATE_ROLE',
      resource: `role:${role._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 201,
      requestBody: { name, code, permissions },
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: populatedRole
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name or code already exists'
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update role
export const updateRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const oldPermissions = role.permissions.map(p => p.toString());
    const { permissions, ...updateData } = req.body;

    // Validate permissions if provided
    if (permissions && Array.isArray(permissions)) {
      const validPermissions = await Permission.find({
        _id: { $in: permissions },
        isActive: true
      });

      if (validPermissions.length !== permissions.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more permissions are invalid or inactive'
        });
      }

      updateData.permissions = permissions;
    }

    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }

    updateData.updatedBy = req.user._id;

    Object.assign(role, updateData);
    await role.save();

    const populatedRole = await Role.findById(role._id)
      .populate('permissions', 'name code module action');

    // Log permission change
    const newPermissions = role.permissions.map(p => p.toString());
    const addedPermissions = newPermissions.filter(p => !oldPermissions.includes(p));
    const removedPermissions = oldPermissions.filter(p => !newPermissions.includes(p));

    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'UPDATE_ROLE_PERMISSIONS',
      resource: `role:${role._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      requestBody: {
        roleName: role.name,
        addedPermissions,
        removedPermissions,
        changes: req.body
      },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: populatedRole
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Role with this name or code already exists'
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete role
export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.isSystemRole) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete system role'
      });
    }

    // Check if role is assigned to any users
    const usersWithRole = await User.find({ role: role.code.toLowerCase() });

    if (usersWithRole.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role. It is assigned to ${usersWithRole.length} user(s)`
      });
    }

    // Log deletion
    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'DELETE_ROLE',
      resource: `role:${role._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      requestBody: { roleName: role.name, roleCode: role.code },
      timestamp: new Date()
    });

    await Role.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Assign permissions to role
export const assignPermissions = async (req, res) => {
  try {
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Permissions array is required'
      });
    }

    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    // Validate permissions
    const validPermissions = await Permission.find({
      _id: { $in: permissions },
      isActive: true
    });

    if (validPermissions.length !== permissions.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more permissions are invalid or inactive'
      });
    }

    const oldPermissions = role.permissions.map(p => p.toString());
    role.permissions = permissions;
    role.updatedBy = req.user._id;
    await role.save();

    const populatedRole = await Role.findById(role._id)
      .populate('permissions', 'name code module action');

    // Log permission change
    const addedPermissions = permissions.filter(p => !oldPermissions.includes(p.toString()));
    const removedPermissions = oldPermissions.filter(p => !permissions.includes(p));

    await AuditLog.create({
      userId: req.user._id,
      userEmail: req.user.email,
      action: 'ASSIGN_PERMISSIONS',
      resource: `role:${role._id}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: 200,
      requestBody: {
        roleName: role.name,
        addedPermissions,
        removedPermissions
      },
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Permissions assigned successfully',
      data: populatedRole
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get role permissions summary
export const getRolePermissionsSummary = async (req, res) => {
  try {
    const roles = await Role.find({ isActive: true })
      .populate('permissions', 'name code module action')
      .select('name code permissions');

    const summary = roles.map(role => ({
      role: role.name,
      code: role.code,
      permissionCount: role.permissions.length,
      permissions: role.permissions.map(p => ({
        code: p.code,
        module: p.module,
        action: p.action
      }))
    }));

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

