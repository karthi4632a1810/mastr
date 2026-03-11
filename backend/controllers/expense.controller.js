import ExpenseClaim from '../models/expense.model.js';
import Employee from '../models/employee.model.js';
import crypto from 'crypto';

const hashBuffer = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

export const getExpenses = async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 20
    } = req.query;

    const filter = {};
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee) filter.employee = employee._id;
    }
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [claims, total] = await Promise.all([
      ExpenseClaim.find(filter)
        .populate({
          path: 'employee',
          select: 'firstName lastName employeeId department',
          populate: { path: 'department', select: 'name' }
        })
        .populate('approvedBy', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ExpenseClaim.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: claims,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyExpenses = async (req, res) => {
  try {
    const {
      status,
      limit = 20
    } = req.query;

    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const filter = { employee: employee._id };
    if (status) filter.status = status;

    const claims = await ExpenseClaim.find(filter)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId department',
        populate: { path: 'department', select: 'name' }
      })
      .populate('approvedBy', 'email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: claims
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const hasOverlap = (startA, endA, startB, endB) => {
  return (startA <= endB) && (endA >= startB);
};

export const createExpense = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const {
      title,
      tripType,
      purpose,
      startDate,
      endDate,
      costCenter,
      project,
      currency = 'INR',
      items = [],
      status = 'pending',
      saveAsDraft = false
    } = req.body;

    if (!title || !tripType || !purpose || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Title, trip type, purpose, start and end dates are required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one expense item is required' });
    }

    const tripStart = new Date(startDate);
    const tripEnd = new Date(endDate);

    // Overlap check with existing claims (non-rejected)
    const overlapping = await ExpenseClaim.findOne({
      employee: employee._id,
      status: { $in: ['pending', 'approved', 'paid'] },
      $or: [
        { startDate: { $lte: tripEnd }, endDate: { $gte: tripStart } }
      ]
    });
    if (overlapping) {
      return res.status(400).json({ success: false, message: 'Trip dates overlap with an existing claim' });
    }

    // Handle attachments and hashes
    const incomingFiles = req.files || [];
    const attachmentHashes = incomingFiles.map(f => hashBuffer(f.buffer));

    // Duplicate detection: by hash match
    const dupHash = await ExpenseClaim.findOne({ 'attachments.hash': { $in: attachmentHashes } });
    if (dupHash) {
      return res.status(400).json({ success: false, message: 'Duplicate bill detected (hash match)' });
    }

    const attachments = incomingFiles.map((file) => ({
      name: file.originalname,
      url: `/uploads/${file.filename}`,
      hash: hashBuffer(file.buffer)
    }));

    const normalizedItems = items.map((item) => ({
      expenseDate: item.expenseDate,
      category: item.category,
      subCategory: item.subCategory || '',
      amount: Number(item.amount || 0),
      currency: item.currency || currency || 'INR',
      notes: item.notes || '',
      attachments: []
    }));

    // Basic validation for items
    if (normalizedItems.some(i => !i.expenseDate || !i.category || !i.amount)) {
      return res.status(400).json({ success: false, message: 'Each item requires date, category, and amount' });
    }

    const totalAmount = normalizedItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);

    const claim = await ExpenseClaim.create({
      employee: employee._id,
      title,
      tripType,
      purpose,
      startDate: tripStart,
      endDate: tripEnd,
      costCenter,
      project,
      currency,
      items: normalizedItems,
      attachments,
      totalAmount,
      status: saveAsDraft ? 'draft' : status
    });

    const populated = await ExpenseClaim.findById(claim._id)
      .populate('employee', 'firstName lastName employeeId');

    res.status(201).json({ success: true, message: saveAsDraft ? 'Expense saved as draft' : 'Expense claim submitted', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateExpenseStatus = async (req, res) => {
  try {
    const expense = await ExpenseClaim.findById(req.params.id);
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });

    const { status, rejectionReason, approverNote, itemsOverride, paymentMethod, paymentTxnId, paymentDate } = req.body;

    // Partial approvals: adjust amounts/remove items
    if (Array.isArray(itemsOverride) && itemsOverride.length) {
      expense.items = expense.items.map((item, idx) => {
        const patch = itemsOverride.find(o => Number(o.index) === idx);
        if (!patch) return item;
        if (patch.removed) return null;
        if (patch.amount !== undefined) item.amount = Number(patch.amount);
        return item;
      }).filter(Boolean);
      expense.totalAmount = expense.items.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    }

    if (status) {
      expense.status = status;
      if (status === 'rejected' && !rejectionReason) {
        return res.status(400).json({ success: false, message: 'Rejection reason is required' });
      }
      expense.rejectionReason = status === 'rejected' ? rejectionReason : null;
      expense.approvedBy = req.user._id;
      expense.approvedAt = new Date();
      expense.approverNote = approverNote || '';
    }

    if (status === 'paid') {
      expense.paidAt = paymentDate ? new Date(paymentDate) : new Date();
      expense.paymentMethod = paymentMethod || expense.paymentMethod;
      expense.paymentTxnId = paymentTxnId || '';
    }

    // Append approval log entry
    if (status === 'approved' || status === 'rejected') {
      expense.approvals = expense.approvals || [];
      expense.approvals.push({
        level: 'manager',
        status: status === 'approved' ? 'approved' : 'rejected',
        approver: req.user._id,
        decidedAt: new Date(),
        note: approverNote || rejectionReason || ''
      });
    }

    await expense.save();
    const populated = await ExpenseClaim.findById(expense._id)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId department',
        populate: { path: 'department', select: 'name' }
      })
      .populate('approvedBy', 'email');
    res.json({ success: true, message: 'Expense status updated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getExpenseById = async (req, res) => {
  try {
    const expense = await ExpenseClaim.findById(req.params.id)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId department',
        populate: { path: 'department', select: 'name' }
      })
      .populate('approvedBy', 'email');
    if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
    res.json({ success: true, data: expense });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
