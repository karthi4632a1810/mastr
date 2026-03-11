import { OnboardingTemplate, OnboardingTask } from '../models/onboarding.model.js';
import Employee from '../models/employee.model.js';

// Template Management Functions
export const getOnboardingTemplates = async (req, res) => {
  try {
    const { category, department, designation, employeeType, location, status, search } = req.query;
    const filter = { isLatestVersion: true };

    if (category) filter.category = category;
    if (department) filter.linkedDepartments = { $in: [department] };
    if (designation) filter.linkedDesignations = { $in: [designation] };
    if (employeeType) filter.linkedEmployeeTypes = { $in: [employeeType] };
    if (location) filter.linkedLocations = { $in: [location] };
    if (status !== undefined) filter.isActive = status === 'true' || status === 'active';

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const templates = await OnboardingTemplate.find(filter)
      .populate('linkedDepartments', 'name')
      .populate('linkedDesignations', 'name')
      .populate('createdBy', 'email')
      .populate('parentTemplate', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOnboardingTemplate = async (req, res) => {
  try {
    const template = await OnboardingTemplate.findById(req.params.id)
      .populate('linkedDepartments', 'name')
      .populate('linkedDesignations', 'name')
      .populate('createdBy', 'email')
      .populate('parentTemplate', 'name version');

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOnboardingTemplate = async (req, res) => {
  try {
    const templateData = {
      ...req.body,
      createdBy: req.user._id,
      version: 1,
      isLatestVersion: true
    };

    const template = await OnboardingTemplate.create(templateData);
    
    const populated = await OnboardingTemplate.findById(template._id)
      .populate('linkedDepartments', 'name')
      .populate('linkedDesignations', 'name')
      .populate('createdBy', 'email');

    res.status(201).json({
      success: true,
      message: 'Onboarding template created successfully',
      data: populated
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOnboardingTemplate = async (req, res) => {
  try {
    const template = await OnboardingTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Check if template is being used in active onboarding instances
    const activeInstances = await OnboardingTask.countDocuments({
      template: template._id,
      status: { $in: ['pending', 'in_progress'] }
    });

    if (activeInstances > 0) {
      // Create a new version instead of updating
      const newVersion = template.version + 1;
      const newTemplateData = {
        ...template.toObject(),
        ...req.body,
        _id: undefined,
        __v: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        version: newVersion,
        parentTemplate: template._id,
        isLatestVersion: true
      };

      // Mark old template as not latest
      template.isLatestVersion = false;
      await template.save();

      const newTemplate = await OnboardingTemplate.create(newTemplateData);

      const populated = await OnboardingTemplate.findById(newTemplate._id)
        .populate('linkedDepartments', 'name')
        .populate('linkedDesignations', 'name')
        .populate('createdBy', 'email')
        .populate('parentTemplate', 'name version');

      return res.json({
        success: true,
        message: `New version (v${newVersion}) created. Previous version preserved for existing onboarding instances.`,
        data: populated,
        isNewVersion: true
      });
    }

    // If no active instances, update directly
    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== '__v' && key !== 'version' && key !== 'parentTemplate') {
        template[key] = req.body[key];
      }
    });

    await template.save();

    const populated = await OnboardingTemplate.findById(template._id)
      .populate('linkedDepartments', 'name')
      .populate('linkedDesignations', 'name')
      .populate('createdBy', 'email');

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: populated
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cloneOnboardingTemplate = async (req, res) => {
  try {
    const originalTemplate = await OnboardingTemplate.findById(req.params.id);
    if (!originalTemplate) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const clonedData = originalTemplate.toObject();
    delete clonedData._id;
    delete clonedData.__v;
    delete clonedData.createdAt;
    delete clonedData.updatedAt;
    
    clonedData.name = `${clonedData.name} (Copy)`;
    clonedData.version = 1;
    clonedData.parentTemplate = null;
    clonedData.isLatestVersion = true;
    clonedData.createdBy = req.user._id;

    const clonedTemplate = await OnboardingTemplate.create(clonedData);

    const populated = await OnboardingTemplate.findById(clonedTemplate._id)
      .populate('linkedDepartments', 'name')
      .populate('linkedDesignations', 'name')
      .populate('createdBy', 'email');

    res.status(201).json({
      success: true,
      message: 'Template cloned successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleTemplateStatus = async (req, res) => {
  try {
    const template = await OnboardingTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    template.isActive = !template.isActive;
    await template.save();

    const populated = await OnboardingTemplate.findById(template._id)
      .populate('linkedDepartments', 'name')
      .populate('linkedDesignations', 'name')
      .populate('createdBy', 'email');

    res.json({
      success: true,
      message: `Template ${template.isActive ? 'activated' : 'deactivated'} successfully`,
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTemplateVersions = async (req, res) => {
  try {
    const template = await OnboardingTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    // Get all versions (current and parent chain)
    const parentId = template.parentTemplate || template._id;
    const versions = await OnboardingTemplate.find({
      $or: [
        { _id: parentId },
        { parentTemplate: parentId }
      ]
    })
      .populate('createdBy', 'email')
      .sort({ version: 1 });

    res.json({ success: true, data: versions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Start onboarding for new employee
export const startOnboarding = async (req, res) => {
  try {
    const { employeeId, templateId, joiningDate, customTasks } = req.body;

    if (!employeeId || !templateId || !joiningDate) {
      return res.status(400).json({
        success: false,
        message: 'Employee, template, and joining date are required'
      });
    }

    // Get employee
    const employee = await Employee.findById(employeeId)
      .populate('userId', 'email')
      .populate('reportingManager', 'userId')
      .populate('department')
      .populate('designation');
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Check if onboarding already exists
    const existingOnboarding = await OnboardingTask.findOne({
      employee: employeeId,
      status: { $in: ['pending', 'in_progress'] }
    });
    if (existingOnboarding) {
      return res.status(400).json({
        success: false,
        message: 'Employee already has an active onboarding process'
      });
    }

    // Get template
    const template = await OnboardingTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }
    if (!template.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot use inactive template'
      });
    }

    // Compliance validations
    const complianceChecks = {
      documentsComplete: false,
      offerAccepted: false,
      profileComplete: false,
      checkedAt: new Date()
    };

    // Check profile completeness
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender', 'department', 'designation', 'joiningDate'];
    const missingFields = requiredFields.filter(field => !employee[field]);
    complianceChecks.profileComplete = missingFields.length === 0;

    // Check for required documents (offer letter, ID proof)
    const hasOfferLetter = employee.documents?.some(doc => doc.type === 'contract' || doc.name?.toLowerCase().includes('offer'));
    const hasIdProof = employee.documents?.some(doc => doc.type === 'id_proof');
    complianceChecks.documentsComplete = hasOfferLetter && hasIdProof;

    // Check offer acceptance (assuming it's in documents or a separate field)
    // For now, we'll check if offer letter exists as acceptance indicator
    complianceChecks.offerAccepted = hasOfferLetter;

    if (!complianceChecks.profileComplete) {
      return res.status(400).json({
        success: false,
        message: 'Employee profile is incomplete. Missing fields: ' + missingFields.join(', '),
        complianceChecks
      });
    }

    // Calculate joining date
    const joining = new Date(joiningDate);
    if (isNaN(joining.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid joining date' });
    }

    // Generate tasks from template
    const generatedTasks = template.tasks
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(templateTask => {
        const dueDate = new Date(joining);
        dueDate.setDate(dueDate.getDate() + templateTask.dueDays);

        return {
          taskName: templateTask.taskName,
          taskDescription: templateTask.taskDescription,
          responsibleRole: templateTask.responsibleRole,
          isRequired: templateTask.isMandatory,
          isCustom: false,
          dueDate,
          requiresAttachment: templateTask.requiresAttachment,
          requiresApproval: templateTask.requiresApproval,
          status: 'pending',
          order: templateTask.order || 0
        };
      });

    // Add custom tasks if provided
    const customTasksList = (customTasks || []).map((task, index) => ({
      taskName: task.taskName,
      taskDescription: task.taskDescription || '',
      responsibleRole: task.responsibleRole || 'employee',
      isRequired: task.isMandatory !== false,
      isCustom: true,
      dueDate: task.dueDays !== undefined
        ? (() => {
            const date = new Date(joining);
            date.setDate(date.getDate() + task.dueDays);
            return date;
          })()
        : new Date(joining),
      requiresAttachment: task.requiresAttachment || false,
      requiresApproval: task.requiresApproval || false,
      status: 'pending',
      order: generatedTasks.length + index
    }));

    const allTasks = [...generatedTasks, ...customTasksList];

    // Assign tasks to users based on role
    const User = (await import('../models/user.model.js')).default;
    
    for (const task of allTasks) {
      if (task.responsibleRole === 'employee') {
        task.assignedTo = employee.userId?._id || employee.userId;
      } else if (task.responsibleRole === 'manager' && employee.reportingManager?.userId) {
        task.assignedTo = employee.reportingManager.userId;
      } else if (task.responsibleRole === 'it') {
        // IT role doesn't exist in User model, assign to admin or first available admin
        const itUser = await User.findOne({ role: 'admin' });
        if (itUser) task.assignedTo = itUser._id;
      } else if (task.responsibleRole === 'hr') {
        const hrUser = await User.findOne({ role: 'hr' });
        if (hrUser) task.assignedTo = hrUser._id;
      } else if (task.responsibleRole === 'admin') {
        const adminUser = await User.findOne({ role: 'admin' });
        if (adminUser) task.assignedTo = adminUser._id;
      }
    }

    // Create onboarding instance
    const onboardingInstance = await OnboardingTask.create({
      employee: employeeId,
      template: templateId,
      joiningDate: joining,
      tasks: allTasks,
      status: 'in_progress',
      initiatedBy: req.user._id,
      startedAt: new Date(),
      complianceChecks,
      notificationsSent: {
        employee: false,
        manager: false,
        it: false,
        hr: false
      }
    });

    // Send notifications (placeholder - implement actual notification service)
    const notificationsSent = {
      employee: false,
      manager: false,
      it: false,
      hr: false
    };

    // TODO: Implement actual email/SMS notifications
    if (employee.userId?.email) {
      console.log(`[NOTIFICATION] Onboarding started for ${employee.userId.email}`);
      notificationsSent.employee = true;
    }

    if (employee.reportingManager?.userId) {
      const manager = await Employee.findById(employee.reportingManager._id).populate('userId', 'email');
      if (manager?.userId?.email) {
        console.log(`[NOTIFICATION] Manager ${manager.userId.email} notified of onboarding for ${employee.firstName} ${employee.lastName}`);
        notificationsSent.manager = true;
      }
    }

    // IT notifications - assign to admin users (since IT role doesn't exist)
    const adminUsers = await User.find({ role: 'admin' });
    adminUsers.forEach(user => {
      console.log(`[NOTIFICATION] Admin/IT user ${user.email} notified of onboarding tasks`);
      notificationsSent.it = true;
    });

    const hrUsers = await User.find({ role: 'hr' });
    hrUsers.forEach(user => {
      console.log(`[NOTIFICATION] HR user ${user.email} notified of onboarding for ${employee.firstName} ${employee.lastName}`);
      notificationsSent.hr = true;
    });

    onboardingInstance.notificationsSent = notificationsSent;
    await onboardingInstance.save();

    const populated = await OnboardingTask.findById(onboardingInstance._id)
      .populate('employee', 'firstName lastName email')
      .populate('template', 'name version')
      .populate('initiatedBy', 'email')
      .populate('tasks.assignedTo', 'email');

    res.status(201).json({
      success: true,
      message: 'Onboarding started successfully',
      data: populated,
      complianceChecks
    });
  } catch (error) {
    console.error('Error starting onboarding:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get onboarding instances (for HR/Admin)
export const getOnboardingInstances = async (req, res) => {
  try {
    const { employeeId, status, search } = req.query;
    const filter = {};

    if (employeeId) filter.employee = employeeId;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { 'employee.firstName': { $regex: search, $options: 'i' } },
        { 'employee.lastName': { $regex: search, $options: 'i' } },
        { 'employee.email': { $regex: search, $options: 'i' } }
      ];
    }

    const instances = await OnboardingTask.find(filter)
      .populate('employee', 'firstName lastName email employeeId')
      .populate('template', 'name version')
      .populate('initiatedBy', 'email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: instances });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single onboarding instance
export const getOnboardingInstance = async (req, res) => {
  try {
    const instance = await OnboardingTask.findById(req.params.id)
      .populate('employee', 'firstName lastName email employeeId')
      .populate('template', 'name version')
      .populate('initiatedBy', 'email')
      .populate('tasks.assignedTo', 'email firstName lastName')
      .populate('tasks.completedBy', 'email firstName lastName')
      .populate('tasks.approvedBy', 'email firstName lastName');

    if (!instance) {
      return res.status(404).json({ success: false, message: 'Onboarding instance not found' });
    }

    res.json({ success: true, data: instance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add custom task to existing onboarding
export const addCustomTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { taskName, taskDescription, responsibleRole, dueDays, isMandatory, requiresAttachment, requiresApproval } = req.body;

    const instance = await OnboardingTask.findById(id);
    if (!instance) {
      return res.status(404).json({ success: false, message: 'Onboarding instance not found' });
    }

    const joining = new Date(instance.joiningDate);
    const dueDate = new Date(joining);
    dueDate.setDate(dueDate.getDate() + (dueDays || 0));

    const User = (await import('../models/user.model.js')).default;
    let assignedTo = null;

    if (responsibleRole === 'employee') {
      const employee = await Employee.findById(instance.employee);
      assignedTo = employee?.userId;
    } else {
      const user = await User.findOne({ role: responsibleRole });
      if (user) assignedTo = user._id;
    }

    const newTask = {
      taskName,
      taskDescription: taskDescription || '',
      responsibleRole: responsibleRole || 'employee',
      assignedTo,
      isRequired: isMandatory !== false,
      isCustom: true,
      dueDate,
      requiresAttachment: requiresAttachment || false,
      requiresApproval: requiresApproval || false,
      status: 'pending',
      order: instance.tasks.length
    };

    instance.tasks.push(newTask);
    await instance.save();

    const populated = await OnboardingTask.findById(instance._id)
      .populate('tasks.assignedTo', 'email firstName lastName');

    res.json({
      success: true,
      message: 'Custom task added successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Existing onboarding task functions (keep for backward compatibility)
export const getOnboardingTasks = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const instances = await OnboardingTask.find({ employee: employee._id })
      .populate('template', 'name version')
      .populate('tasks.assignedTo', 'email firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: instances });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOnboardingTask = async (req, res) => {
  try {
    const task = await OnboardingTask.create(req.body);
    res.status(201).json({ success: true, message: 'Task created', data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { instanceId, taskIndex } = req.params;
    const { status, comments } = req.body;

    const instance = await OnboardingTask.findById(instanceId)
      .populate('employee', 'userId');
    if (!instance) {
      return res.status(404).json({ success: false, message: 'Onboarding instance not found' });
    }

    // Verify employee can only update their own tasks
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Check if user is the employee or has admin/hr role
    if (instance.employee._id.toString() !== employee._id.toString() && 
        req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this task' });
    }

    const task = instance.tasks[taskIndex];
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Handle file upload
    if (req.file) {
      task.attachment = `/uploads/${req.file.filename}`;
    }

    // Update task status
    if (status === 'completed') {
      task.status = task.requiresApproval ? 'pending_approval' : 'completed';
      task.completedAt = new Date();
      task.completedBy = req.user._id;
    } else if (status) {
      task.status = status;
      if (status === 'in_progress') {
        // Don't update completedAt if just marking as in progress
      } else if (status !== 'pending_approval') {
        task.completedAt = null;
        task.completedBy = null;
      }
    }

    if (comments !== undefined) task.comments = comments;

    // Update instance status
    const completedTasks = instance.tasks.filter(t => 
      t.status === 'completed' || t.status === 'pending_approval'
    ).length;
    const allCompleted = instance.tasks.filter(t => t.status === 'completed').length === instance.tasks.length;
    
    if (allCompleted) {
      instance.status = 'completed';
      instance.completedAt = new Date();
    } else if (completedTasks > 0) {
      instance.status = 'in_progress';
    }

    await instance.save();

    const populated = await OnboardingTask.findById(instance._id)
      .populate('tasks.completedBy', 'email firstName lastName')
      .populate('tasks.assignedTo', 'email firstName lastName')
      .populate('employee', 'firstName lastName email');

    res.json({ 
      success: true, 
      message: task.requiresApproval && status === 'completed' 
        ? 'Task completed and submitted for approval' 
        : 'Task status updated', 
      data: populated 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve/reject task (for HR/Manager/IT/Admin)
export const approveTask = async (req, res) => {
  try {
    const { instanceId, taskIndex } = req.params;
    const { approved, reason } = req.body;

    const instance = await OnboardingTask.findById(instanceId);
    if (!instance) {
      return res.status(404).json({ success: false, message: 'Onboarding instance not found' });
    }

    const task = instance.tasks[taskIndex];
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.status !== 'pending_approval') {
      return res.status(400).json({ 
        success: false, 
        message: 'Task is not pending approval' 
      });
    }

    if (approved) {
      task.status = 'completed';
      task.approvedBy = req.user._id;
      task.approvedAt = new Date();
    } else {
      task.status = 'in_progress';
      task.completedAt = null;
      task.completedBy = null;
      if (reason) task.comments = (task.comments || '') + `\n[Rejected by ${req.user.email}: ${reason}]`;
    }

    // Update instance status
    const allCompleted = instance.tasks.filter(t => t.status === 'completed').length === instance.tasks.length;
    if (allCompleted) {
      instance.status = 'completed';
      instance.completedAt = new Date();
    }

    await instance.save();

    const populated = await OnboardingTask.findById(instance._id)
      .populate('tasks.approvedBy', 'email firstName lastName')
      .populate('tasks.completedBy', 'email firstName lastName');

    res.json({ 
      success: true, 
      message: approved ? 'Task approved' : 'Task rejected', 
      data: populated 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// HR Dashboard - Get onboarding statistics
export const getOnboardingDashboard = async (req, res) => {
  try {
    const instances = await OnboardingTask.find({
      status: { $in: ['pending', 'in_progress'] }
    })
      .populate('employee', 'firstName lastName email employeeId department designation')
      .populate('template', 'name version')
      .populate('tasks.assignedTo', 'email firstName lastName')
      .populate('tasks.completedBy', 'email firstName lastName');

    const now = new Date();
    const dashboardData = instances.map(instance => {
      const tasks = instance.tasks || [];
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
      const overdueTasks = tasks.filter(t => {
        const dueDate = new Date(t.dueDate);
        return (t.status !== 'completed' && t.status !== 'pending_approval') && dueDate < now;
      }).length;
      const pendingApprovalTasks = tasks.filter(t => t.status === 'pending_approval').length;
      const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

      return {
        instance: {
          _id: instance._id,
          employee: instance.employee,
          template: instance.template,
          joiningDate: instance.joiningDate,
          status: instance.status,
          startedAt: instance.startedAt
        },
        statistics: {
          totalTasks: tasks.length,
          completedTasks,
          pendingTasks,
          overdueTasks,
          pendingApprovalTasks,
          progress
        },
        tasks: tasks.map((task, index) => ({
          ...task.toObject(),
          index,
          isOverdue: new Date(task.dueDate) < now && task.status !== 'completed' && task.status !== 'pending_approval'
        }))
      };
    });

    // Overall statistics
    const overallStats = {
      totalEmployees: dashboardData.length,
      totalTasks: dashboardData.reduce((sum, d) => sum + d.statistics.totalTasks, 0),
      completedTasks: dashboardData.reduce((sum, d) => sum + d.statistics.completedTasks, 0),
      pendingTasks: dashboardData.reduce((sum, d) => sum + d.statistics.pendingTasks, 0),
      overdueTasks: dashboardData.reduce((sum, d) => sum + d.statistics.overdueTasks, 0),
      pendingApprovalTasks: dashboardData.reduce((sum, d) => sum + d.statistics.pendingApprovalTasks, 0)
    };

    res.json({
      success: true,
      data: {
        overall: overallStats,
        employees: dashboardData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reassign task
export const reassignTask = async (req, res) => {
  try {
    const { instanceId, taskIndex } = req.params;
    const { newResponsibleRole, newAssignedTo } = req.body;

    const instance = await OnboardingTask.findById(instanceId);
    if (!instance) {
      return res.status(404).json({ success: false, message: 'Onboarding instance not found' });
    }

    const task = instance.tasks[taskIndex];
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (newResponsibleRole) {
      task.responsibleRole = newResponsibleRole;
    }

    if (newAssignedTo) {
      task.assignedTo = newAssignedTo;
    } else if (newResponsibleRole) {
      // Auto-assign based on role
      const User = (await import('../models/user.model.js')).default;
      const employee = await Employee.findById(instance.employee);
      
      if (newResponsibleRole === 'employee') {
        task.assignedTo = employee?.userId;
      } else if (newResponsibleRole === 'manager' && employee.reportingManager?.userId) {
        const manager = await Employee.findById(employee.reportingManager._id);
        task.assignedTo = manager?.userId;
      } else {
        const user = await User.findOne({ role: newResponsibleRole });
        if (user) task.assignedTo = user._id;
      }
    }

    // Add comment about reassignment
    task.comments = (task.comments || '') + `\n[Reassigned by ${req.user.email} on ${new Date().toLocaleString()}]`;

    await instance.save();

    const populated = await OnboardingTask.findById(instance._id)
      .populate('tasks.assignedTo', 'email firstName lastName');

    res.json({
      success: true,
      message: 'Task reassigned successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Extend due date
export const extendDueDate = async (req, res) => {
  try {
    const { instanceId, taskIndex } = req.params;
    const { newDueDate, reason } = req.body;

    if (!newDueDate) {
      return res.status(400).json({ success: false, message: 'New due date is required' });
    }

    const instance = await OnboardingTask.findById(instanceId);
    if (!instance) {
      return res.status(404).json({ success: false, message: 'Onboarding instance not found' });
    }

    const task = instance.tasks[taskIndex];
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const oldDueDate = task.dueDate;
    task.dueDate = new Date(newDueDate);
    
    // Add comment about extension
    const extensionNote = `[Due date extended by ${req.user.email} from ${new Date(oldDueDate).toLocaleDateString()} to ${new Date(newDueDate).toLocaleDateString()}${reason ? `: ${reason}` : ''}]`;
    task.comments = (task.comments || '') + '\n' + extensionNote;

    await instance.save();

    const populated = await OnboardingTask.findById(instance._id);

    res.json({
      success: true,
      message: 'Due date extended successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Manually complete task
export const manuallyCompleteTask = async (req, res) => {
  try {
    const { instanceId, taskIndex } = req.params;
    const { comments } = req.body;

    const instance = await OnboardingTask.findById(instanceId);
    if (!instance) {
      return res.status(404).json({ success: false, message: 'Onboarding instance not found' });
    }

    const task = instance.tasks[taskIndex];
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.status = 'completed';
    task.completedAt = new Date();
    task.completedBy = req.user._id;
    
    if (comments) {
      task.comments = (task.comments || '') + `\n[Manually completed by ${req.user.email}: ${comments}]`;
    } else {
      task.comments = (task.comments || '') + `\n[Manually completed by ${req.user.email}]`;
    }

    // Update instance status
    const allCompleted = instance.tasks.filter(t => t.status === 'completed').length === instance.tasks.length;
    if (allCompleted) {
      instance.status = 'completed';
      instance.completedAt = new Date();
    } else {
      instance.status = 'in_progress';
    }

    await instance.save();

    const populated = await OnboardingTask.findById(instance._id)
      .populate('tasks.completedBy', 'email firstName lastName');

    res.json({
      success: true,
      message: 'Task marked as completed',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add comment to task
export const addTaskComment = async (req, res) => {
  try {
    const { instanceId, taskIndex } = req.params;
    const { comment } = req.body;

    if (!comment) {
      return res.status(400).json({ success: false, message: 'Comment is required' });
    }

    const instance = await OnboardingTask.findById(instanceId);
    if (!instance) {
      return res.status(404).json({ success: false, message: 'Onboarding instance not found' });
    }

    const task = instance.tasks[taskIndex];
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const commentWithTimestamp = `[${req.user.email} - ${new Date().toLocaleString()}]: ${comment}`;
    task.comments = (task.comments || '') + '\n' + commentWithTimestamp;

    await instance.save();

    const populated = await OnboardingTask.findById(instance._id);

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: populated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
