import TrainingProgram from '../models/trainingProgram.model.js';
import TrainingRecord from '../models/trainingRecord.model.js';
import CompetencyMatrix from '../models/competencyMatrix.model.js';
import CompetencyAssessment from '../models/competencyAssessment.model.js';
import TrainingEffectiveness from '../models/trainingEffectiveness.model.js';
import Employee from '../models/employee.model.js';
import mongoose from 'mongoose';
import moment from 'moment';

// ===== TRAINING PROGRAMS =====

export const getTrainingPrograms = async (req, res) => {
  try {
    const { category, isMandatory, isActive = 'true', search } = req.query;
    const filter = {};
    
    if (isActive === 'true') filter.isActive = true;
    if (category) filter.category = category;
    if (isMandatory !== undefined) filter.isMandatory = isMandatory === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const programs = await TrainingProgram.find(filter)
      .populate('mandatoryFor.roles', 'name code')
      .populate('mandatoryFor.departments', 'name')
      .populate('mandatoryFor.designations', 'name')
      .populate('createdBy', 'email')
      .sort({ name: 1 });
    
    res.json({ success: true, data: programs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTrainingProgram = async (req, res) => {
  try {
    const program = await TrainingProgram.findById(req.params.id)
      .populate('mandatoryFor.roles', 'name code')
      .populate('mandatoryFor.departments', 'name')
      .populate('mandatoryFor.designations', 'name')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email');
    
    if (!program) {
      return res.status(404).json({ success: false, message: 'Training program not found' });
    }
    
    res.json({ success: true, data: program });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTrainingProgram = async (req, res) => {
  try {
    const existing = await TrainingProgram.findOne({ code: req.body.code });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Training program code already exists' });
    }
    
    const program = await TrainingProgram.create({
      ...req.body,
      createdBy: req.user._id
    });
    
    const populated = await TrainingProgram.findById(program._id)
      .populate('createdBy', 'email');
    
    res.status(201).json({ success: true, message: 'Training program created', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTrainingProgram = async (req, res) => {
  try {
    const program = await TrainingProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ success: false, message: 'Training program not found' });
    }
    
    if (req.body.code && req.body.code !== program.code) {
      const existing = await TrainingProgram.findOne({ code: req.body.code, _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Training program code already exists' });
      }
    }
    
    Object.assign(program, req.body);
    program.updatedBy = req.user._id;
    await program.save();
    
    const populated = await TrainingProgram.findById(program._id)
      .populate('updatedBy', 'email');
    
    res.json({ success: true, message: 'Training program updated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTrainingProgram = async (req, res) => {
  try {
    const program = await TrainingProgram.findById(req.params.id);
    if (!program) {
      return res.status(404).json({ success: false, message: 'Training program not found' });
    }
    
    // Check if program is used in training records
    const recordsCount = await TrainingRecord.countDocuments({ trainingProgram: req.params.id });
    if (recordsCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete training program. It is used in ${recordsCount} training record(s). Deactivate instead.` 
      });
    }
    
    await TrainingProgram.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Training program deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== TRAINING RECORDS =====

export const getTrainingRecords = async (req, res) => {
  try {
    const { 
      employeeId, 
      trainingProgramId, 
      status, 
      isExpired,
      renewalRequired,
      startDate,
      endDate,
      search 
    } = req.query;
    
    const filter = {};
    
    // Role-based filtering
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee) filter.employee = employee._id;
      else return res.json({ success: true, data: [] });
    } else if (employeeId) {
      filter.employee = employeeId;
    }
    
    if (trainingProgramId) filter.trainingProgram = trainingProgramId;
    if (status) filter.status = status;
    if (isExpired === 'true') filter.isExpired = true;
    if (renewalRequired === 'true') filter.renewalRequired = true;
    
    if (startDate || endDate) {
      filter.trainingDate = {};
      if (startDate) filter.trainingDate.$gte = new Date(startDate);
      if (endDate) filter.trainingDate.$lte = new Date(endDate);
    }
    
    const records = await TrainingRecord.find(filter)
      .populate('employee', 'firstName lastName employeeId department designation')
      .populate('trainingProgram', 'name code category isMandatory validityPeriod')
      .populate('trainer.name')
      .populate('certificate.issuedBy', 'email')
      .populate('createdBy', 'email')
      .sort({ trainingDate: -1 });
    
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTrainingRecord = async (req, res) => {
  try {
    const record = await TrainingRecord.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department designation')
      .populate('trainingProgram', 'name code category isMandatory validityPeriod')
      .populate('certificate.issuedBy', 'email')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email');
    
    if (!record) {
      return res.status(404).json({ success: false, message: 'Training record not found' });
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

export const createTrainingRecord = async (req, res) => {
  try {
    const { employeeId, trainingProgramId, trainingDate, ...otherData } = req.body;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    const program = await TrainingProgram.findById(trainingProgramId);
    if (!program) {
      return res.status(404).json({ success: false, message: 'Training program not found' });
    }
    
    const record = await TrainingRecord.create({
      employee: employeeId,
      trainingProgram: trainingProgramId,
      trainingDate: trainingDate || new Date(),
      ...otherData,
      createdBy: req.user._id
    });
    
    const populated = await TrainingRecord.findById(record._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('trainingProgram', 'name code');
    
    res.status(201).json({ success: true, message: 'Training record created', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTrainingRecord = async (req, res) => {
  try {
    const record = await TrainingRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Training record not found' });
    }
    
    Object.assign(record, req.body);
    record.updatedBy = req.user._id;
    
    // Auto-set completion date if status changes to completed
    if (req.body.status === 'completed' && !record.completionDate) {
      record.completionDate = new Date();
    }
    
    await record.save();
    
    const populated = await TrainingRecord.findById(record._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('trainingProgram', 'name code');
    
    res.json({ success: true, message: 'Training record updated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const issueCertificate = async (req, res) => {
  try {
    const { certificateNumber, certificateFile } = req.body;
    const record = await TrainingRecord.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({ success: false, message: 'Training record not found' });
    }
    
    if (record.status !== 'completed' || !record.assessment.passed) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot issue certificate. Training must be completed and assessment passed.' 
      });
    }
    
    record.certificate.issued = true;
    record.certificate.certificateNumber = certificateNumber;
    record.certificate.certificateFile = certificateFile;
    record.certificate.issuedDate = new Date();
    record.certificate.issuedBy = req.user._id;
    record.updatedBy = req.user._id;
    
    await record.save();
    
    const populated = await TrainingRecord.findById(record._id)
      .populate('certificate.issuedBy', 'email');
    
    res.json({ success: true, message: 'Certificate issued', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getExpiringTrainings = async (req, res) => {
  try {
    const { days = 90 } = req.query;
    const thresholdDate = moment().add(parseInt(days), 'days').toDate();
    
    const records = await TrainingRecord.find({
      validTo: { $lte: thresholdDate, $gte: new Date() },
      isExpired: false,
      status: 'completed'
    })
      .populate('employee', 'firstName lastName employeeId email')
      .populate('trainingProgram', 'name code category')
      .sort({ validTo: 1 });
    
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== COMPETENCY MATRIX =====

export const getCompetencyMatrices = async (req, res) => {
  try {
    const { scope, isActive = 'true', search } = req.query;
    const filter = {};
    
    if (isActive === 'true') filter.isActive = true;
    if (scope) filter.scope = scope;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const matrices = await CompetencyMatrix.find(filter)
      .populate('scopeIds')
      .populate('createdBy', 'email')
      .sort({ name: 1 });
    
    res.json({ success: true, data: matrices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCompetencyMatrix = async (req, res) => {
  try {
    const matrix = await CompetencyMatrix.findById(req.params.id)
      .populate('scopeIds')
      .populate('competencies.linkedTrainingPrograms', 'name code')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email');
    
    if (!matrix) {
      return res.status(404).json({ success: false, message: 'Competency matrix not found' });
    }
    
    res.json({ success: true, data: matrix });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCompetencyMatrix = async (req, res) => {
  try {
    const matrix = await CompetencyMatrix.create({
      ...req.body,
      createdBy: req.user._id
    });
    
    const populated = await CompetencyMatrix.findById(matrix._id)
      .populate('scopeIds')
      .populate('createdBy', 'email');
    
    res.status(201).json({ success: true, message: 'Competency matrix created', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCompetencyMatrix = async (req, res) => {
  try {
    const matrix = await CompetencyMatrix.findById(req.params.id);
    if (!matrix) {
      return res.status(404).json({ success: false, message: 'Competency matrix not found' });
    }
    
    Object.assign(matrix, req.body);
    matrix.updatedBy = req.user._id;
    await matrix.save();
    
    const populated = await CompetencyMatrix.findById(matrix._id)
      .populate('updatedBy', 'email');
    
    res.json({ success: true, message: 'Competency matrix updated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCompetencyMatrix = async (req, res) => {
  try {
    const matrix = await CompetencyMatrix.findById(req.params.id);
    if (!matrix) {
      return res.status(404).json({ success: false, message: 'Competency matrix not found' });
    }
    
    // Check if matrix is used in assessments
    const assessmentsCount = await CompetencyAssessment.countDocuments({ competencyMatrix: req.params.id });
    if (assessmentsCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete competency matrix. It is used in ${assessmentsCount} assessment(s). Deactivate instead.` 
      });
    }
    
    await CompetencyMatrix.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Competency matrix deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== COMPETENCY ASSESSMENTS =====

export const getCompetencyAssessments = async (req, res) => {
  try {
    const { employeeId, competencyMatrixId, status, isExpired, renewalRequired } = req.query;
    const filter = {};
    
    // Role-based filtering
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (employee) filter.employee = employee._id;
      else return res.json({ success: true, data: [] });
    } else if (employeeId) {
      filter.employee = employeeId;
    }
    
    if (competencyMatrixId) filter.competencyMatrix = competencyMatrixId;
    if (status) filter.status = status;
    if (isExpired === 'true') filter.isExpired = true;
    if (renewalRequired === 'true') filter.renewalRequired = true;
    
    const assessments = await CompetencyAssessment.find(filter)
      .populate('employee', 'firstName lastName employeeId department designation')
      .populate('competencyMatrix', 'name scope')
      .populate('assessedBy', 'email')
      .populate('recommendedTrainingPrograms', 'name code')
      .populate('createdBy', 'email')
      .sort({ assessmentDate: -1 });
    
    res.json({ success: true, data: assessments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCompetencyAssessment = async (req, res) => {
  try {
    const assessment = await CompetencyAssessment.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department designation')
      .populate('competencyMatrix', 'name scope')
      .populate('assessedBy', 'email')
      .populate('recommendedTrainingPrograms', 'name code')
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email');
    
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Competency assessment not found' });
    }
    
    // Check access for employees
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ userId: req.user._id });
      if (!employee || employee._id.toString() !== assessment.employee._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }
    
    res.json({ success: true, data: assessment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCompetencyAssessment = async (req, res) => {
  try {
    const { employeeId, competencyMatrixId, competencyName, ...otherData } = req.body;
    
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    const matrix = await CompetencyMatrix.findById(competencyMatrixId);
    if (!matrix) {
      return res.status(404).json({ success: false, message: 'Competency matrix not found' });
    }
    
    // Find competency details from matrix
    const competency = matrix.competencies.find(c => c.competencyName === competencyName);
    if (!competency) {
      return res.status(400).json({ success: false, message: 'Competency not found in matrix' });
    }
    
    const assessment = await CompetencyAssessment.create({
      employee: employeeId,
      competencyMatrix: competencyMatrixId,
      competencyName,
      requiredLevel: competency.requiredLevel,
      assessmentMethod: otherData.assessmentMethod || competency.assessmentMethod,
      renewalPeriod: competency.renewalPeriod,
      nabhClauses: competency.nabhClauses || [],
      assessedBy: req.user._id,
      ...otherData,
      createdBy: req.user._id
    });
    
    const populated = await CompetencyAssessment.findById(assessment._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('competencyMatrix', 'name');
    
    res.status(201).json({ success: true, message: 'Competency assessment created', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCompetencyAssessment = async (req, res) => {
  try {
    const assessment = await CompetencyAssessment.findById(req.params.id);
    if (!assessment) {
      return res.status(404).json({ success: false, message: 'Competency assessment not found' });
    }
    
    Object.assign(assessment, req.body);
    assessment.updatedBy = req.user._id;
    await assessment.save();
    
    const populated = await CompetencyAssessment.findById(assessment._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('competencyMatrix', 'name');
    
    res.json({ success: true, message: 'Competency assessment updated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== TRAINING EFFECTIVENESS =====

export const getTrainingEffectiveness = async (req, res) => {
  try {
    const { employeeId, trainingProgramId, effectivenessStatus, retrainingRequired } = req.query;
    const filter = {};
    
    if (employeeId) filter.employee = employeeId;
    if (trainingProgramId) filter.trainingProgram = trainingProgramId;
    if (effectivenessStatus) filter.effectivenessStatus = effectivenessStatus;
    if (retrainingRequired === 'true') filter.retrainingRequired = true;
    
    const effectiveness = await TrainingEffectiveness.find(filter)
      .populate('employee', 'firstName lastName employeeId')
      .populate('trainingProgram', 'name code')
      .populate('trainingRecord', 'trainingDate completionDate')
      .populate('evaluatedBy', 'email')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: effectiveness });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTrainingEffectiveness = async (req, res) => {
  try {
    const { trainingRecordId, ...otherData } = req.body;
    
    const trainingRecord = await TrainingRecord.findById(trainingRecordId);
    if (!trainingRecord) {
      return res.status(404).json({ success: false, message: 'Training record not found' });
    }
    
    // Check if effectiveness already exists
    const existing = await TrainingEffectiveness.findOne({ trainingRecord: trainingRecordId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Training effectiveness record already exists' });
    }
    
    const effectiveness = await TrainingEffectiveness.create({
      trainingRecord: trainingRecordId,
      employee: trainingRecord.employee,
      trainingProgram: trainingRecord.trainingProgram,
      ...otherData,
      createdBy: req.user._id
    });
    
    const populated = await TrainingEffectiveness.findById(effectiveness._id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('trainingProgram', 'name code');
    
    res.status(201).json({ success: true, message: 'Training effectiveness record created', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTrainingEffectiveness = async (req, res) => {
  try {
    const effectiveness = await TrainingEffectiveness.findById(req.params.id);
    if (!effectiveness) {
      return res.status(404).json({ success: false, message: 'Training effectiveness record not found' });
    }
    
    Object.assign(effectiveness, req.body);
    effectiveness.updatedBy = req.user._id;
    
    // Auto-set evaluated fields
    if (req.body.effectivenessStatus && req.body.effectivenessStatus !== 'pending') {
      effectiveness.evaluatedBy = req.user._id;
      effectiveness.evaluatedAt = new Date();
      effectiveness.status = 'completed';
    }
    
    await effectiveness.save();
    
    const populated = await TrainingEffectiveness.findById(effectiveness._id)
      .populate('evaluatedBy', 'email');
    
    res.json({ success: true, message: 'Training effectiveness updated', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===== DASHBOARD & REPORTS =====

export const getTrainingDashboard = async (req, res) => {
  try {
    const { departmentId, startDate, endDate } = req.query;
    
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
              totalPrograms: 0,
              totalRecords: 0,
              completedRecords: 0,
              expiredRecords: 0,
              dueForRenewal: 0
            },
            mandatoryTrainingCompliance: []
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
    
    // Statistics
    const totalPrograms = await TrainingProgram.countDocuments({ isActive: true });
    const totalRecords = await TrainingRecord.countDocuments({ employee: { $in: employeeIds } });
    const completedRecords = await TrainingRecord.countDocuments({ 
      employee: { $in: employeeIds },
      status: 'completed' 
    });
    const expiredRecords = await TrainingRecord.countDocuments({ 
      employee: { $in: employeeIds },
      isExpired: true 
    });
    const dueForRenewal = await TrainingRecord.countDocuments({
      employee: { $in: employeeIds },
      renewalRequired: true,
      renewalDueDate: { $lte: moment().add(30, 'days').toDate(), $gte: new Date() },
      isExpired: false
    });
    
    // Mandatory training compliance
    const mandatoryPrograms = await TrainingProgram.find({ isMandatory: true, isActive: true });
    const complianceData = [];
    
    for (const program of mandatoryPrograms) {
      const completed = await TrainingRecord.countDocuments({
        employee: { $in: employeeIds },
        trainingProgram: program._id,
        status: 'completed',
        isExpired: false
      });
      const total = employeeIds.length;
      complianceData.push({
        programId: program._id,
        programName: program.name,
        programCode: program.code,
        completed,
        total,
        compliancePercentage: total > 0 ? (completed / total) * 100 : 0
      });
    }
    
    res.json({
      success: true,
      data: {
        statistics: {
          totalPrograms,
          totalRecords,
          completedRecords,
          expiredRecords,
          dueForRenewal
        },
        mandatoryTrainingCompliance: complianceData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

