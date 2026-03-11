import { Asset, AssetHistory } from '../models/asset.model.js';
import Employee from '../models/employee.model.js';
import TransferRequest from '../models/transferRequest.model.js';
import MaintenanceTicket from '../models/maintenanceTicket.model.js';
import { randomUUID } from 'crypto';

const ALLOWED_STATUS = ['available', 'in_use', 'reserved', 'maintenance', 'retired'];
const ALLOWED_CONDITION = ['new', 'good', 'fair', 'damaged'];

const generateAssetId = async () => {
  const count = await Asset.countDocuments();
  return `AST-${String(count + 1).padStart(6, '0')}`;
};

const normalizeStatus = (status) => {
  if (!status) return undefined;
  const normalized = status.toLowerCase().replace(/\s+/g, '_');
  if (ALLOWED_STATUS.includes(normalized)) return normalized;
  return undefined;
};

const normalizeCondition = (condition) => {
  if (!condition) return undefined;
  const normalized = condition.toLowerCase();
  if (ALLOWED_CONDITION.includes(normalized)) return normalized;
  return undefined;
};

const mapAttachments = (files = []) =>
  files.map((file) => ({
    type: file.fieldname === 'attachments' ? 'other' : file.fieldname,
    name: file.originalname,
    url: `/uploads/${file.filename}`,
    uploadedAt: new Date()
  }));

export const getAssets = async (req, res) => {
  try {
    const {
      search,
      status,
      category,
      location,
      warrantyStatus,
      assigned,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { assetId: { $regex: search, $options: 'i' } },
        { serialNumber: { $regex: search, $options: 'i' } },
        { imei: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (location) filter.location = location;
    if (assigned === 'true') filter.assignedTo = { $ne: null };
    if (assigned === 'false') filter.assignedTo = null;

    if (warrantyStatus === 'expired') {
      filter.warrantyExpiry = { $lt: new Date() };
    } else if (warrantyStatus === 'expiring_30') {
      const now = new Date();
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);
      filter.warrantyExpiry = { $gte: now, $lte: in30 };
    } else if (warrantyStatus === 'active') {
      filter.warrantyExpiry = { $gte: new Date() };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [assets, total] = await Promise.all([
      Asset.find(filter)
        .populate('assignedTo', 'firstName lastName employeeId')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Asset.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: assets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAsset = async (req, res) => {
  try {
    const {
      name,
      category,
      model,
      brand,
      serialNumber,
      imei,
      sku,
      purchaseDate,
      purchaseCost,
      vendor,
      warrantyExpiry,
      warrantyProvider,
      location,
      subLocation,
      condition,
      status,
      description,
      customAttributes
    } = req.body;

    if (!name || !category || !model || !brand) {
      return res.status(400).json({ success: false, message: 'Name, category, model and brand are required' });
    }

    const assetId = await generateAssetId();
    const attachments = mapAttachments(req.files || []);

    const asset = await Asset.create({
      assetId,
      barcodeToken: randomUUID(),
      qrToken: randomUUID(),
      name,
      category,
      model,
      brand,
      serialNumber,
      imei,
      sku,
      purchaseDate,
      purchaseCost,
      vendor,
      warrantyExpiry,
      warrantyProvider,
      location,
      subLocation,
      condition: normalizeCondition(condition) || 'new',
      status: normalizeStatus(status) || 'available',
      description,
      customAttributes,
      attachments
    });

    await AssetHistory.create({
      asset: asset._id,
      action: 'created',
      performedBy: req.user._id,
      remarks: 'Asset registered'
    });

    res.status(201).json({ success: true, message: 'Asset created', data: asset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyAssets = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const assets = await Asset.find({ assignedTo: employee._id })
      .populate('assignedTo', 'firstName lastName employeeId')
      .sort({ assignedDate: -1 });

    res.json({ success: true, data: assets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const assignAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

    if (asset.status === 'in_use') {
      return res.status(400).json({ success: false, message: 'Asset already in use' });
    }

    const {
      employeeId,
      expectedReturnDate,
      assignmentPurpose,
      costCenter,
      conditionNote,
      approvalRequired,
      approvalNote,
      acknowledgementMethod
    } = req.body;

    const conditionPhoto = req.file ? `/uploads/${req.file.filename}` : null;

    const reminderDate = expectedReturnDate
      ? (() => {
          const d = new Date(expectedReturnDate);
          d.setDate(d.getDate() - 2);
          return d;
        })()
      : null;

    asset.status = approvalRequired ? 'reserved' : 'in_use';
    asset.assignedTo = employeeId;
    asset.assignedDate = new Date();
    asset.expectedReturnDate = expectedReturnDate || null;
    asset.assignmentPurpose = assignmentPurpose || '';
    asset.costCenter = costCenter || '';
    asset.conditionNote = conditionNote || '';
    asset.conditionPhoto = conditionPhoto;
    asset.reminderDate = reminderDate;
    asset.approval = {
      required: !!approvalRequired,
      status: approvalRequired ? 'pending' : 'not_required',
      approver: approvalRequired ? null : req.user._id,
      approvedAt: approvalRequired ? null : new Date(),
      note: approvalNote || ''
    };
    asset.assignmentAcknowledgement = {
      acknowledged: false,
      method: acknowledgementMethod || null,
      acknowledgedAt: null
    };

    await asset.save();

    await AssetHistory.create({
      asset: asset._id,
      action: 'assigned',
      assignedTo: employeeId,
      performedBy: req.user._id,
      remarks: assignmentPurpose || approvalNote || ''
    });

    res.json({ success: true, message: 'Asset assigned', data: asset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const returnAsset = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

    asset.status = 'available';
    asset.returnedDate = new Date();
    const assignedTo = asset.assignedTo;
    asset.assignedTo = null;
    await asset.save();

    await AssetHistory.create({
      asset: asset._id,
      action: 'returned',
      assignedTo,
      performedBy: req.user._id,
      remarks: req.body.remarks
    });

    res.json({ success: true, message: 'Asset returned', data: asset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const exportAssets = async (req, res) => {
  try {
    const { format = 'csv', columns } = req.query;
    const colList = columns ? columns.split(',') : [
      'assetId', 'name', 'category', 'brand', 'model', 'serialNumber',
      'status', 'location', 'subLocation', 'warrantyExpiry', 'assignedTo'
    ];

    const assets = await Asset.find({}).populate('assignedTo', 'employeeId firstName lastName');

    const rows = assets.map((a) => {
      const row = {};
      colList.forEach((c) => {
        switch (c) {
          case 'assignedTo':
            row[c] = a.assignedTo ? `${a.assignedTo.employeeId} - ${a.assignedTo.firstName} ${a.assignedTo.lastName}` : '';
            break;
          case 'warrantyExpiry':
          case 'purchaseDate':
            row[c] = a[c] ? new Date(a[c]).toISOString().split('T')[0] : '';
            break;
          default:
            row[c] = a[c] ?? '';
        }
      });
      return row;
    });

    if (format === 'csv' || format === 'excel') {
      const header = colList.join(',');
      const data = rows.map(r => colList.map(c => `"${String(r[c]).replace(/"/g, '""')}"`).join(',')).join('\n');
      res.setHeader('Content-Disposition', 'attachment; filename="assets.csv"');
      res.setHeader('Content-Type', 'text/csv');
      return res.send([header, data].join('\n'));
    }

    return res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const parseCsvBuffer = (buffer) => {
  const text = buffer.toString('utf-8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] || '';
    });
    return obj;
  });
};

export const importAssets = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Upload a CSV file' });
    }

    const records = parseCsvBuffer(req.file.buffer);
    if (!records.length) {
      return res.status(400).json({ success: false, message: 'No records found in CSV' });
    }

    const successes = [];
    const failures = [];

    for (const rec of records) {
      try {
        if (!rec.name || !rec.category || !rec.model || !rec.brand) {
          failures.push({ row: rec, error: 'Missing required fields' });
          continue;
        }

        const assetId = await generateAssetId();
        const asset = await Asset.create({
          assetId,
          name: rec.name,
          category: rec.category,
          model: rec.model,
          brand: rec.brand,
          serialNumber: rec.serialNumber,
          imei: rec.imei,
          sku: rec.sku,
          purchaseDate: rec.purchaseDate ? new Date(rec.purchaseDate) : null,
          purchaseCost: rec.purchaseCost ? Number(rec.purchaseCost) : 0,
          vendor: rec.vendor,
          warrantyExpiry: rec.warrantyExpiry ? new Date(rec.warrantyExpiry) : null,
          location: rec.location,
          subLocation: rec.subLocation,
          condition: normalizeCondition(rec.condition) || 'new',
          status: normalizeStatus(rec.status) || 'available',
          customAttributes: rec.customAttributes ? JSON.parse(rec.customAttributes) : []
        });

        successes.push(asset.assetId);
      } catch (err) {
        failures.push({ row: rec, error: err.message });
      }
    }

    res.json({
      success: true,
      message: 'Import processed',
      summary: {
        total: records.length,
        success: successes.length,
        failed: failures.length
      },
      failures
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const acknowledgeAsset = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const asset = await Asset.findById(req.params.id);
    if (!asset || String(asset.assignedTo) !== String(employee._id)) {
      return res.status(404).json({ success: false, message: 'Asset not assigned to you' });
    }

    asset.assignmentAcknowledgement = {
      acknowledged: true,
      method: req.body.method || asset.assignmentAcknowledgement?.method || 'checkbox',
      acknowledgedAt: new Date()
    };
    await asset.save();

    await AssetHistory.create({
      asset: asset._id,
      action: 'acknowledged',
      assignedTo: employee._id,
      performedBy: req.user._id,
      remarks: req.body.note || ''
    });

    res.json({ success: true, message: 'Acknowledged', data: asset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const requestReturn = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const asset = await Asset.findById(req.params.id);
    if (!asset || String(asset.assignedTo) !== String(employee._id)) {
      return res.status(404).json({ success: false, message: 'Asset not assigned to you' });
    }

    await AssetHistory.create({
      asset: asset._id,
      action: 'return_requested',
      assignedTo: employee._id,
      performedBy: req.user._id,
      remarks: req.body.note || ''
    });

    res.json({ success: true, message: 'Return request submitted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const requestMaintenance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    const asset = await Asset.findById(req.params.id);
    if (!asset || String(asset.assignedTo) !== String(employee._id)) {
      return res.status(404).json({ success: false, message: 'Asset not assigned to you' });
    }

    asset.status = 'maintenance';
    await asset.save();

    await AssetHistory.create({
      asset: asset._id,
      action: 'maintenance_requested',
      assignedTo: employee._id,
      performedBy: req.user._id,
      remarks: req.body.note || ''
    });

    res.json({ success: true, message: 'Maintenance request submitted', data: asset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveReturn = async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

    const { condition = 'good', sendToMaintenance = false } = req.body;
    asset.status = sendToMaintenance ? 'maintenance' : 'available';
    asset.condition = condition;
    asset.assignedTo = null;
    asset.assignedDate = null;
    asset.expectedReturnDate = null;
    asset.reminderDate = null;
    await asset.save();

    await AssetHistory.create({
      asset: asset._id,
      action: 'returned',
      performedBy: req.user._id,
      remarks: req.body.note || '',
    });

    res.json({ success: true, message: 'Return approved', data: asset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTransferRequest = async (req, res) => {
  try {
    const {
      items = [],
      fromEmployee,
      toEmployee,
      fromLocation,
      toLocation,
      note
    } = req.body;

    if (!items.length) return res.status(400).json({ success: false, message: 'No items to transfer' });

    const transfer = await TransferRequest.create({
      items: items.map(i => ({ asset: i.asset, accessories: i.accessories || [] })),
      fromEmployee,
      toEmployee,
      fromLocation,
      toLocation,
      note,
      approvals: [],
      requestedBy: req.user._id
    });

    res.status(201).json({ success: true, message: 'Transfer request created', data: transfer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveTransferRequest = async (req, res) => {
  try {
    const transfer = await TransferRequest.findById(req.params.id);
    if (!transfer) return res.status(404).json({ success: false, message: 'Transfer not found' });

    // simple single-approver flow
    transfer.status = 'approved';
    transfer.approvals.push({
      approver: req.user._id,
      decision: 'approved',
      decidedAt: new Date(),
      note: req.body.note || ''
    });
    await transfer.save();

    // update assets assignment/location
    for (const item of transfer.items) {
      const asset = await Asset.findById(item.asset);
      if (!asset) continue;
      asset.assignedTo = transfer.toEmployee || null;
      asset.location = transfer.toLocation || asset.location;
      asset.status = 'in_use';
      asset.assignedDate = new Date();
      await asset.save();

      await AssetHistory.create({
        asset: asset._id,
        action: 'assigned',
        assignedTo: transfer.toEmployee || null,
        performedBy: req.user._id,
        remarks: `Transfer approved: ${transfer.fromLocation || ''} -> ${transfer.toLocation || ''}`
      });
    }

    res.json({ success: true, message: 'Transfer approved', data: transfer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createMaintenanceTicket = async (req, res) => {
  try {
    const {
      assetId,
      vendor,
      expectedCost,
      startDate,
      endDate,
      parts,
      note
    } = req.body;

    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

    const attachments = (req.files || []).map((file) => ({
      name: file.originalname,
      url: `/uploads/${file.filename}`,
      uploadedAt: new Date()
    }));

    const ticket = await MaintenanceTicket.create({
      asset: asset._id,
      vendor,
      expectedCost,
      startDate,
      endDate,
      status: 'planned',
      parts,
      attachments,
      underWarranty: asset.warrantyExpiry ? asset.warrantyExpiry > new Date() : false,
      note,
      createdBy: req.user._id
    });

    asset.status = 'maintenance';
    await asset.save();

    res.status(201).json({ success: true, message: 'Maintenance ticket created', data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateMaintenanceTicket = async (req, res) => {
  try {
    const ticket = await MaintenanceTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    const attachments = (req.files || []).map((file) => ({
      name: file.originalname,
      url: `/uploads/${file.filename}`,
      uploadedAt: new Date()
    }));

    Object.assign(ticket, req.body);
    if (attachments.length) {
      ticket.attachments = [...(ticket.attachments || []), ...attachments];
    }
    await ticket.save();

    if (ticket.status === 'completed') {
      const asset = await Asset.findById(ticket.asset);
      if (asset) {
        asset.status = 'available';
        await asset.save();
      }
    }

    res.json({ success: true, message: 'Ticket updated', data: ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const listMaintenanceTickets = async (req, res) => {
  try {
    const { status, assetId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (assetId) filter.asset = assetId;

    const tickets = await MaintenanceTicket.find(filter)
      .populate('asset', 'assetId name')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
