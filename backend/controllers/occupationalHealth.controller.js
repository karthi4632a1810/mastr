import ImmunizationRecord from '../models/immunizationRecord.model.js';
import HealthCheckup from '../models/healthCheckup.model.js';
import OccupationalExposure from '../models/occupationalExposure.model.js';
import IncidentReport from '../models/incidentReport.model.js';
import Employee from '../models/employee.model.js';
import mongoose from 'mongoose';
import moment from 'moment';

// ===== IMMUNIZATION RECORDS =====

export const getImmunizationRecords = async (req, res) => {
  try {
    const { employeeId, vaccineType, status, dueSoon } = req.query;
    const filter = {};
    
    // Role-based filtering
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee) filter.employee = employee._id;
      else return res.json({ success: true, data: [] });
    } else if (employeeId) {
      filter.employee = employeeId;
    }
    
    if (vaccineType) filter.vaccineType = vaccineType;
    if (status) filter.status = status;
    
    if (dueSoon === 'true') {
      const thirtyDaysFromNow = moment().add(30, 'days').toDate();
      filter.nextDueDate = { $lte: thirtyDaysFromNow, $gte: new Date() };
    }
    
    const records = await ImmunizationRecord.find(filter)
      .populate('employee', 'firstName lastName employeeId department designation')
      .populate('createdBy', 'email')
      .sort({ vaccinationDate: -1 });
    
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getImmunizationRecord = async (req, res) => {
  try {
    const record = await ImmunizationRecord.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email');
    
    if (!record) {
      return res.status(404).json({ success: false, message: 'Immunization record not found' });
    }
    
    // Check access for employees
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (!employee || employee._id.toString() !== record.employee._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }
    
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createImmunizationRecord = async (req, res) => {
  try {
    const { employeeId, ...otherData } = req.body;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    const record = await ImmunizationRecord.create({
      employee: employeeId,
      ...otherData,
      createdBy: req.user._id
    });
    
    const populated = await ImmunizationRecord.findById(record._id)
      .populate('employee', 'firstName lastName employeeId');
    
    res.status(201).json({ success: true, message: 'Immunization record created', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateImmunizationRecord = async (req, res) => {
  try {
    const record = await ImmunizationRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Immunization record not found' });
    }
    
    Object.assign(record, req.body);
    record.updatedBy = req.user._id;
    await record.save();
    
    const populated = await ImmunizationRecord.findById(record._id)
      .populate('employee', 'firstName lastName employeeId');
    
    res.json({ success: true, message: 'Immunization record updated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDueImmunizations = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const thresholdDate = moment().add(parseInt(days), 'days').toDate();
    
    const records = await ImmunizationRecord.find({
      nextDueDate: { $lte: thresholdDate, $gte: new Date() },
      status: 'completed'
    })
      .populate('employee', 'firstName lastName employeeId email department')
      .sort({ nextDueDate: 1 });
    
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== HEALTH CHECKUPS =====

export const getHealthCheckups = async (req, res) => {
  try {
    const { employeeId, checkupType, fitnessStatus, dueSoon } = req.query;
    const filter = {};
    
    // Role-based filtering
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee) filter.employee = employee._id;
      else return res.json({ success: true, data: [] });
    } else if (employeeId) {
      filter.employee = employeeId;
    }
    
    if (checkupType) filter.checkupType = checkupType;
    if (fitnessStatus) filter.fitnessStatus = fitnessStatus;
    
    if (dueSoon === 'true') {
      const thirtyDaysFromNow = moment().add(30, 'days').toDate();
      filter.nextCheckupDueDate = { $lte: thirtyDaysFromNow, $gte: new Date() };
    }
    
    const checkups = await HealthCheckup.find(filter)
      .populate('employee', 'firstName lastName employeeId department designation')
      .populate('createdBy', 'email')
      .sort({ checkupDate: -1 });
    
    res.json({ success: true, data: checkups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getHealthCheckup = async (req, res) => {
  try {
    const checkup = await HealthCheckup.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email');
    
    if (!checkup) {
      return res.status(404).json({ success: false, message: 'Health checkup not found' });
    }
    
    // Check access for employees
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (!employee || employee._id.toString() !== checkup.employee._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }
    
    res.json({ success: true, data: checkup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createHealthCheckup = async (req, res) => {
  try {
    const { employeeId, ...otherData } = req.body;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    const checkup = await HealthCheckup.create({
      employee: employeeId,
      ...otherData,
      createdBy: req.user._id
    });
    
    const populated = await HealthCheckup.findById(checkup._id)
      .populate('employee', 'firstName lastName employeeId');
    
    res.status(201).json({ success: true, message: 'Health checkup created', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateHealthCheckup = async (req, res) => {
  try {
    const checkup = await HealthCheckup.findById(req.params.id);
    if (!checkup) {
      return res.status(404).json({ success: false, message: 'Health checkup not found' });
    }
    
    Object.assign(checkup, req.body);
    checkup.updatedBy = req.user._id;
    
    // Auto-set status to completed if fitness status is set
    if (req.body.fitnessStatus && req.body.fitnessStatus !== 'pending' && checkup.status === 'scheduled') {
      checkup.status = 'completed';
    }
    
    await checkup.save();
    
    const populated = await HealthCheckup.findById(checkup._id)
      .populate('employee', 'firstName lastName employeeId');
    
    res.json({ success: true, message: 'Health checkup updated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDueHealthCheckups = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const thresholdDate = moment().add(parseInt(days), 'days').toDate();
    
    const checkups = await HealthCheckup.find({
      nextCheckupDueDate: { $lte: thresholdDate, $gte: new Date() },
      status: 'completed'
    })
      .populate('employee', 'firstName lastName employeeId email department')
      .sort({ nextCheckupDueDate: 1 });
    
    res.json({ success: true, data: checkups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== OCCUPATIONAL EXPOSURES =====

export const getOccupationalExposures = async (req, res) => {
  try {
    const { employeeId, exposureType, status } = req.query;
    const filter = {};
    
    // Role-based filtering
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee) filter.employee = employee._id;
      else return res.json({ success: true, data: [] });
    } else if (employeeId) {
      filter.employee = employeeId;
    }
    
    if (exposureType) filter.exposureType = exposureType;
    if (status) filter.status = status;
    
    const exposures = await OccupationalExposure.find(filter)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('department', 'name')
      .populate('investigation.investigatedBy', 'email')
      .populate('reportedBy', 'email')
      .populate('createdBy', 'email')
      .sort({ incidentDate: -1 });
    
    res.json({ success: true, data: exposures });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOccupationalExposure = async (req, res) => {
  try {
    const exposure = await OccupationalExposure.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department')
      .populate('department', 'name')
      .populate('investigation.investigatedBy', 'email')
      .populate('reportedBy', 'email')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email');
    
    if (!exposure) {
      return res.status(404).json({ success: false, message: 'Occupational exposure not found' });
    }
    
    // Check access for employees
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (!employee || employee._id.toString() !== exposure.employee._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }
    
    res.json({ success: true, data: exposure });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createOccupationalExposure = async (req, res) => {
  try {
    const { employeeId, ...otherData } = req.body;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    const exposure = await OccupationalExposure.create({
      employee: employeeId,
      reportedBy: req.user._id,
      createdBy: req.user._id,
      ...otherData
    });
    
    const populated = await OccupationalExposure.findById(exposure._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('reportedBy', 'email');
    
    res.status(201).json({ success: true, message: 'Occupational exposure recorded', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOccupationalExposure = async (req, res) => {
  try {
    const exposure = await OccupationalExposure.findById(req.params.id);
    if (!exposure) {
      return res.status(404).json({ success: false, message: 'Occupational exposure not found' });
    }
    
    Object.assign(exposure, req.body);
    exposure.updatedBy = req.user._id;
    await exposure.save();
    
    const populated = await OccupationalExposure.findById(exposure._id)
      .populate('employee', 'firstName lastName employeeId');
    
    res.json({ success: true, message: 'Occupational exposure updated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addFollowUpTest = async (req, res) => {
  try {
    const { testType, testDate, testResult, nextDueDate, remarks } = req.body;
    const exposure = await OccupationalExposure.findById(req.params.id);
    
    if (!exposure) {
      return res.status(404).json({ success: false, message: 'Occupational exposure not found' });
    }
    
    exposure.followUpTests.push({
      testType,
      testDate,
      testResult,
      nextDueDate,
      remarks
    });
    exposure.updatedBy = req.user._id;
    await exposure.save();
    
    const populated = await OccupationalExposure.findById(exposure._id);
    res.json({ success: true, message: 'Follow-up test added', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== INCIDENT REPORTS =====

export const getIncidentReports = async (req, res) => {
  try {
    const { employeeId, incidentType, severity, status, departmentId, startDate, endDate } = req.query;
    const filter = {};
    
    // Role-based filtering
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee) filter.employee = employee._id;
    } else if (employeeId) {
      filter.employee = employeeId;
    }
    
    if (incidentType) filter.incidentType = incidentType;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (departmentId) filter.department = departmentId;
    
    if (startDate || endDate) {
      filter.incidentDate = {};
      if (startDate) filter.incidentDate.$gte = new Date(startDate);
      if (endDate) filter.incidentDate.$lte = new Date(endDate);
    }
    
    const incidents = await IncidentReport.find(filter)
      .populate('employee', 'firstName lastName employeeId')
      .populate('department', 'name')
      .populate('peopleInvolved.employee', 'firstName lastName employeeId')
      .populate('investigation.investigationCommittee.member', 'email')
      .populate('capa.correctiveActions.responsible', 'email')
      .populate('capa.preventiveActions.responsible', 'email')
      .populate('reportedBy', 'email')
      .populate('decidedBy', 'email')
      .populate('closedBy', 'email')
      .populate('createdBy', 'email')
      .sort({ incidentDate: -1 });
    
    res.json({ success: true, data: incidents });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getIncidentReport = async (req, res) => {
  try {
    const incident = await IncidentReport.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('department', 'name')
      .populate('peopleInvolved.employee', 'firstName lastName employeeId')
      .populate('investigation.investigationCommittee.member', 'email')
      .populate('capa.correctiveActions.responsible', 'email')
      .populate('capa.preventiveActions.responsible', 'email')
      .populate('reportedBy', 'email')
      .populate('decidedBy', 'email')
      .populate('closedBy', 'email')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email');
    
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident report not found' });
    }
    
    res.json({ success: true, data: incident });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createIncidentReport = async (req, res) => {
  try {
    const incident = await IncidentReport.create({
      ...req.body,
      reportedBy: req.user._id,
      createdBy: req.user._id
    });
    
    const populated = await IncidentReport.findById(incident._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('reportedBy', 'email');
    
    res.status(201).json({ success: true, message: 'Incident report created', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateIncidentReport = async (req, res) => {
  try {
    const incident = await IncidentReport.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident report not found' });
    }
    
    Object.assign(incident, req.body);
    incident.updatedBy = req.user._id;
    await incident.save();
    
    const populated = await IncidentReport.findById(incident._id);
    res.json({ success: true, message: 'Incident report updated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateIncidentInvestigation = async (req, res) => {
  try {
    const { investigation } = req.body;
    const incident = await IncidentReport.findById(req.params.id);
    
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident report not found' });
    }
    
    Object.assign(incident.investigation, investigation);
    incident.status = 'under_investigation';
    incident.updatedBy = req.user._id;
    await incident.save();
    
    const populated = await IncidentReport.findById(incident._id);
    res.json({ success: true, message: 'Investigation updated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCapa = async (req, res) => {
  try {
    const { correctiveActions, preventiveActions } = req.body;
    const incident = await IncidentReport.findById(req.params.id);
    
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident report not found' });
    }
    
    if (correctiveActions) incident.capa.correctiveActions = correctiveActions;
    if (preventiveActions) incident.capa.preventiveActions = preventiveActions;
    
    incident.status = 'capa_in_progress';
    incident.updatedBy = req.user._id;
    await incident.save();
    
    const populated = await IncidentReport.findById(incident._id);
    res.json({ success: true, message: 'CAPA updated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const closeIncidentReport = async (req, res) => {
  try {
    const { closureRemarks } = req.body;
    const incident = await IncidentReport.findById(req.params.id);
    
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident report not found' });
    }
    
    incident.status = 'closed';
    incident.finalStatus = 'closed';
    incident.closedBy = req.user._id;
    incident.closedAt = new Date();
    incident.closureRemarks = closureRemarks || '';
    incident.updatedBy = req.user._id;
    
    await incident.save();
    
    const populated = await IncidentReport.findById(incident._id)
      .populate('closedBy', 'email');
    
    res.json({ success: true, message: 'Incident report closed', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== DASHBOARD & REPORTS =====

export const getOccupationalHealthDashboard = async (req, res) => {
  try {
    const { departmentId } = req.query;
    
    // Build employee filter - filter by user role
    const employeeFilter = {};
    if (req.user.role === 'employee') {
      // Employee can only see their own data
      const employee = await Employee.findOne({ userId: req.user._id });
      if (!employee) {
        return res.json({
          success: true,
          data: {
            statistics: {
              immunizations: { total: 0, dueSoon: 0 },
              healthCheckups: { total: 0, dueSoon: 0, unfitEmployees: 0 },
              occupationalExposures: { total: 0, last30Days: 0 },
              incidents: { total: 0, last30Days: 0, criticalOpen: 0 }
            },
            vaccineCompliance: []
          }
        });
      }
      employeeFilter._id = employee._id;
    } else {
      // Admin/HR can see all or filtered by department
      if (departmentId) {
        employeeFilter.department = departmentId;
      }
    }
    
    const employees = await Employee.find(employeeFilter).select('_id');
    const employeeIds = employees.map(emp => emp._id);
    
    // Immunization statistics
    const totalImmunizations = await ImmunizationRecord.countDocuments({ employee: { $in: employeeIds } });
    const dueImmunizations = await ImmunizationRecord.countDocuments({
      employee: { $in: employeeIds },
      nextDueDate: { $lte: moment().add(30, 'days').toDate(), $gte: new Date() },
      status: 'completed'
    });
    
    // Health checkup statistics
    const totalCheckups = await HealthCheckup.countDocuments({ employee: { $in: employeeIds } });
    const dueCheckups = await HealthCheckup.countDocuments({
      employee: { $in: employeeIds },
      nextCheckupDueDate: { $lte: moment().add(30, 'days').toDate(), $gte: new Date() },
      status: 'completed'
    });
    const unfitEmployees = await HealthCheckup.countDocuments({
      employee: { $in: employeeIds },
      fitnessStatus: { $in: ['unfit', 'fit_with_restrictions'] },
      status: 'completed'
    });
    
    // Occupational exposure statistics
    const totalExposures = await OccupationalExposure.countDocuments({ employee: { $in: employeeIds } });
    const exposuresLast30Days = await OccupationalExposure.countDocuments({
      employee: { $in: employeeIds },
      incidentDate: { $gte: moment().subtract(30, 'days').toDate() }
    });
    
    // Incident statistics
    const totalIncidents = await IncidentReport.countDocuments({ employee: { $in: employeeIds } });
    const incidentsLast30Days = await IncidentReport.countDocuments({
      employee: { $in: employeeIds },
      incidentDate: { $gte: moment().subtract(30, 'days').toDate() }
    });
    const criticalIncidents = await IncidentReport.countDocuments({
      employee: { $in: employeeIds },
      severity: 'critical',
      status: { $ne: 'closed' }
    });
    
    // Compliance by vaccine type
    const vaccineTypes = ['hbv', 'tt', 'covid', 'influenza'];
    const vaccineCompliance = [];
    
    for (const vaccineType of vaccineTypes) {
      const requiredDoses = vaccineType === 'hbv' ? 3 : vaccineType === 'covid' ? 2 : 1;
      const completedRecords = await ImmunizationRecord.countDocuments({
        employee: { $in: employeeIds },
        vaccineType,
        status: 'completed'
      });
      
      vaccineCompliance.push({
        vaccineType,
        totalEmployees: employeeIds.length,
        completedRecords,
        compliancePercentage: employeeIds.length > 0 ? (completedRecords / employeeIds.length) * 100 : 0
      });
    }
    
    res.json({
      success: true,
      data: {
        statistics: {
          immunizations: {
            total: totalImmunizations,
            dueSoon: dueImmunizations
          },
          healthCheckups: {
            total: totalCheckups,
            dueSoon: dueCheckups,
            unfitEmployees
          },
          occupationalExposures: {
            total: totalExposures,
            last30Days: exposuresLast30Days
          },
          incidents: {
            total: totalIncidents,
            last30Days: incidentsLast30Days,
            criticalOpen: criticalIncidents
          }
        },
        vaccineCompliance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

