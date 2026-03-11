import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import Employee from '../models/employee.model.js';
import Department from '../models/department.model.js';
import Designation from '../models/designation.model.js';
import TrainingProgram from '../models/trainingProgram.model.js';
import TrainingRecord from '../models/trainingRecord.model.js';
import TrainingEffectiveness from '../models/trainingEffectiveness.model.js';
import CompetencyMatrix from '../models/competencyMatrix.model.js';
import CompetencyAssessment from '../models/competencyAssessment.model.js';
import ImmunizationRecord from '../models/immunizationRecord.model.js';
import HealthCheckup from '../models/healthCheckup.model.js';
import OccupationalExposure from '../models/occupationalExposure.model.js';
import IncidentReport from '../models/incidentReport.model.js';
import PrivilegeCategory from '../models/privilegeCategory.model.js';
import PrivilegeCommittee from '../models/privilegeCommittee.model.js';
import PrivilegeRequest from '../models/privilegeRequest.model.js';
import DoctorPrivilege from '../models/doctorPrivilege.model.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Seed NABH Training Programs
const seedNABHTrainingPrograms = async (adminUser) => {
  console.log('🎓 Creating NABH training programs...');
  
  const programs = [];
  const nabhPrograms = [
    {
      name: 'Basic Life Support (BLS)',
      code: 'BLS001',
      description: 'Basic Life Support training for healthcare workers - NABH mandatory',
      category: 'bls',
      isMandatory: true,
      duration: { hours: 4 },
      nabhClauses: ['HR.4.1'],
      validityPeriod: 24,
      renewalRequired: true,
      requiresAssessment: true,
      passingScore: 80,
      requiresCertificate: true
    },
    {
      name: 'Advanced Cardiac Life Support (ACLS)',
      code: 'ACLS001',
      description: 'Advanced Cardiac Life Support training',
      category: 'acls',
      isMandatory: false,
      duration: { hours: 16 },
      nabhClauses: ['HR.4.2'],
      validityPeriod: 24,
      renewalRequired: true,
      requiresAssessment: true,
      passingScore: 85
    },
    {
      name: 'Infection Prevention & Control',
      code: 'IPC001',
      description: 'Infection prevention and control training - NABH mandatory',
      category: 'infection_control',
      isMandatory: true,
      duration: { hours: 3 },
      nabhClauses: ['HR.4.3'],
      validityPeriod: 12,
      renewalRequired: true,
      requiresAssessment: true,
      passingScore: 75
    },
    {
      name: 'Fire Safety & Evacuation',
      code: 'FS001',
      description: 'Fire safety and evacuation procedures - NABH mandatory',
      category: 'fire_safety',
      isMandatory: true,
      duration: { hours: 2 },
      nabhClauses: ['HR.4.4'],
      validityPeriod: 12,
      renewalRequired: true,
      requiresAssessment: true,
      passingScore: 70
    },
    {
      name: 'Radiation Safety',
      code: 'RS001',
      description: 'Radiation safety protocols for radiology staff',
      category: 'radiation_safety',
      isMandatory: false,
      duration: { hours: 4 },
      nabhClauses: ['HR.6.2'],
      validityPeriod: 24,
      renewalRequired: true
    },
    {
      name: 'Biomedical Waste Management',
      code: 'BMW001',
      description: 'Biomedical waste management and handling',
      category: 'biomedical_waste',
      isMandatory: true,
      duration: { hours: 2 },
      nabhClauses: ['HR.6.3'],
      validityPeriod: 12,
      renewalRequired: true
    },
    {
      name: 'Patient Safety Protocols',
      code: 'PS001',
      description: 'Patient safety protocols and best practices',
      category: 'patient_safety',
      isMandatory: true,
      duration: { hours: 3 },
      nabhClauses: ['HR.4.5'],
      validityPeriod: 12,
      renewalRequired: true
    },
    {
      name: 'Medication Safety',
      code: 'MS001',
      description: 'Medication safety and error prevention',
      category: 'medication_safety',
      isMandatory: false,
      duration: { hours: 3 },
      nabhClauses: ['HR.4.6'],
      validityPeriod: 12,
      renewalRequired: true
    },
    {
      name: 'NABH Standards Awareness',
      code: 'NABH001',
      description: 'NABH accreditation standards awareness training',
      category: 'nabh_standards',
      isMandatory: true,
      duration: { hours: 4 },
      nabhClauses: ['HR.4.7'],
      validityPeriod: 24,
      renewalRequired: true
    },
    {
      name: 'Blood & Body Fluid Exposure Prevention',
      code: 'BBFE001',
      description: 'Prevention of blood and body fluid exposure',
      category: 'infection_control',
      isMandatory: true,
      duration: { hours: 2 },
      nabhClauses: ['HR.6.1'],
      validityPeriod: 12,
      renewalRequired: true
    }
  ];
  
  for (const prog of nabhPrograms) {
    const existing = await TrainingProgram.findOne({ code: prog.code });
    if (!existing) {
      const program = await TrainingProgram.create({
        ...prog,
        createdBy: adminUser._id,
        isActive: true
      });
      programs.push(program);
    } else {
      programs.push(existing);
    }
  }
  
  console.log(`   ✅ Created/Found ${programs.length} NABH training programs`);
  return programs;
};

// Seed Training Records (extensive)
const seedTrainingRecords = async (employees, trainingPrograms, hrEmployee) => {
  console.log('📚 Creating training records...');
  
  const records = [];
  const statuses = ['completed', 'completed', 'completed', 'in_progress', 'scheduled'];
  
  // For each employee, assign multiple training programs
  for (const employee of employees) {
    // Assign 3-6 training programs per employee
    const numTrainings = 3 + Math.floor(Math.random() * 4);
    const assignedPrograms = [];
    
    // First assign mandatory programs
    const mandatoryPrograms = trainingPrograms.filter(p => p.isMandatory);
    for (const prog of mandatoryPrograms.slice(0, Math.min(3, mandatoryPrograms.length))) {
      assignedPrograms.push(prog);
    }
    
    // Add some non-mandatory programs
    const nonMandatory = trainingPrograms.filter(p => !p.isMandatory);
    const randomNonMandatory = nonMandatory.slice(0, Math.min(2, nonMandatory.length));
    assignedPrograms.push(...randomNonMandatory);
    
    // Remove duplicates
    const uniquePrograms = Array.from(new Map(assignedPrograms.map(p => [p._id.toString(), p])).values());
    
    for (const program of uniquePrograms.slice(0, numTrainings)) {
      // Check if record already exists
      const existing = await TrainingRecord.findOne({
        employee: employee._id,
        trainingProgram: program._id
      });
      
      if (existing) {
        records.push(existing);
        continue;
      }
      
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const trainingDate = new Date();
      trainingDate.setDate(trainingDate.getDate() - Math.floor(Math.random() * 730)); // Last 2 years
      
      let completionDate = null;
      if (status === 'completed') {
        const duration = program.duration?.hours || 4;
        completionDate = new Date(trainingDate);
        completionDate.setHours(completionDate.getHours() + duration);
      }
      
      const score = status === 'completed' ? 70 + Math.floor(Math.random() * 30) : null;
      const passed = score !== null && score >= (program.passingScore || 70);
      
      const record = await TrainingRecord.create({
        employee: employee._id,
        trainingProgram: program._id,
        trainingDate: trainingDate,
        completionDate: completionDate,
        status: status,
        score: score,
        passed: passed,
        certificateIssued: status === 'completed' && passed && program.requiresCertificate,
        conductedBy: hrEmployee.userId,
        createdBy: hrEmployee.userId,
        remarks: status === 'completed' ? 'Training completed successfully' : 'Training in progress'
      });
      
      records.push(record);
    }
  }
  
  console.log(`   ✅ Created ${records.length} training records`);
  return records;
};

// Seed Competency Matrix
const seedCompetencyMatrix = async (departments, designations, trainingPrograms, adminUser) => {
  console.log('📋 Creating competency matrices...');
  
  const matrices = [];
  
  // Doctor Competency Matrix
  const doctorDesignations = designations.filter(d => 
    d.name.toLowerCase().includes('doctor') || 
    d.name.toLowerCase().includes('surgeon') ||
    d.code === 'DOC' || d.code === 'SRDOC'
  );
  
  if (doctorDesignations.length > 0) {
    const doctorMatrix = await CompetencyMatrix.create({
      name: 'Doctor Clinical Competencies',
      description: 'Clinical competency requirements for doctors',
      scope: 'designation',
      scopeIds: doctorDesignations.map(d => d._id),
      scopeRef: 'Designation',
      competencies: [
        {
          competencyName: 'Clinical Assessment',
          description: 'Ability to perform thorough clinical assessment',
          category: 'clinical',
          isMandatory: true,
          requiredLevel: 'advanced',
          assessmentMethod: 'observation',
          renewalPeriod: 12,
          nabhClauses: ['HR.4.1']
        },
        {
          competencyName: 'BLS Certification',
          description: 'Basic Life Support certification',
          category: 'safety',
          isMandatory: true,
          requiredLevel: 'intermediate',
          assessmentMethod: 'practical',
          renewalPeriod: 24,
          linkedTrainingPrograms: [trainingPrograms.find(p => p.code === 'BLS001')?._id].filter(Boolean),
          nabhClauses: ['HR.4.1']
        },
        {
          competencyName: 'Infection Control',
          description: 'Knowledge and practice of infection control protocols',
          category: 'safety',
          isMandatory: true,
          requiredLevel: 'intermediate',
          assessmentMethod: 'combined',
          renewalPeriod: 12,
          linkedTrainingPrograms: [trainingPrograms.find(p => p.code === 'IPC001')?._id].filter(Boolean),
          nabhClauses: ['HR.4.3']
        },
        {
          competencyName: 'Patient Communication',
          description: 'Effective patient communication skills',
          category: 'behavioral',
          isMandatory: true,
          requiredLevel: 'intermediate',
          assessmentMethod: 'observation',
          renewalPeriod: null
        }
      ],
      isActive: true,
      createdBy: adminUser._id
    });
    matrices.push(doctorMatrix);
  }
  
  // Nurse Competency Matrix
  const nurseDesignations = designations.filter(d => 
    d.name.toLowerCase().includes('nurse')
  );
  
  if (nurseDesignations.length > 0) {
    const nurseMatrix = await CompetencyMatrix.create({
      name: 'Nurse Clinical Competencies',
      description: 'Clinical competency requirements for nursing staff',
      scope: 'designation',
      scopeIds: nurseDesignations.map(d => d._id),
      scopeRef: 'Designation',
      competencies: [
        {
          competencyName: 'Medication Administration',
          description: 'Safe medication administration practices',
          category: 'clinical',
          isMandatory: true,
          requiredLevel: 'advanced',
          assessmentMethod: 'practical',
          renewalPeriod: 12,
          nabhClauses: ['HR.4.6']
        },
        {
          competencyName: 'BLS Certification',
          description: 'Basic Life Support certification',
          category: 'safety',
          isMandatory: true,
          requiredLevel: 'intermediate',
          assessmentMethod: 'practical',
          renewalPeriod: 24,
          linkedTrainingPrograms: [trainingPrograms.find(p => p.code === 'BLS001')?._id].filter(Boolean),
          nabhClauses: ['HR.4.1']
        },
        {
          competencyName: 'Wound Care',
          description: 'Proper wound care and dressing techniques',
          category: 'clinical',
          isMandatory: true,
          requiredLevel: 'intermediate',
          assessmentMethod: 'practical',
          renewalPeriod: 12
        },
        {
          competencyName: 'Infection Control',
          description: 'Knowledge and practice of infection control protocols',
          category: 'safety',
          isMandatory: true,
          requiredLevel: 'intermediate',
          assessmentMethod: 'written_test',
          renewalPeriod: 12,
          linkedTrainingPrograms: [trainingPrograms.find(p => p.code === 'IPC001')?._id].filter(Boolean),
          nabhClauses: ['HR.4.3']
        }
      ],
      isActive: true,
      createdBy: adminUser._id
    });
    matrices.push(nurseMatrix);
  }
  
  // Department-based competency matrix (ICU)
  const icuDepartment = departments.find(d => 
    d.name.toLowerCase().includes('intensive') || 
    d.name.toLowerCase().includes('critical') ||
    d.name.toLowerCase().includes('icu')
  );
  
  if (!icuDepartment) {
    // Create a general department matrix
    const generalMatrix = await CompetencyMatrix.create({
      name: 'General Healthcare Competencies',
      description: 'General competency requirements for all healthcare staff',
      scope: 'global',
      scopeIds: [],
      competencies: [
        {
          competencyName: 'NABH Standards Awareness',
          description: 'Understanding of NABH accreditation standards',
          category: 'administrative',
          isMandatory: true,
          requiredLevel: 'beginner',
          assessmentMethod: 'written_test',
          renewalPeriod: 24,
          linkedTrainingPrograms: [trainingPrograms.find(p => p.code === 'NABH001')?._id].filter(Boolean),
          nabhClauses: ['HR.4.7']
        },
        {
          competencyName: 'Fire Safety',
          description: 'Fire safety and evacuation procedures',
          category: 'safety',
          isMandatory: true,
          requiredLevel: 'beginner',
          assessmentMethod: 'practical',
          renewalPeriod: 12,
          linkedTrainingPrograms: [trainingPrograms.find(p => p.code === 'FS001')?._id].filter(Boolean),
          nabhClauses: ['HR.4.4']
        },
        {
          competencyName: 'Patient Safety',
          description: 'Patient safety protocols',
          category: 'safety',
          isMandatory: true,
          requiredLevel: 'intermediate',
          assessmentMethod: 'combined',
          renewalPeriod: 12,
          linkedTrainingPrograms: [trainingPrograms.find(p => p.code === 'PS001')?._id].filter(Boolean),
          nabhClauses: ['HR.4.5']
        }
      ],
      isActive: true,
      createdBy: adminUser._id
    });
    matrices.push(generalMatrix);
  }
  
  console.log(`   ✅ Created ${matrices.length} competency matrices`);
  return matrices;
};

// Seed Competency Assessments
const seedCompetencyAssessments = async (employees, competencyMatrices, hrEmployee) => {
  console.log('⭐ Creating competency assessments...');
  
  const assessments = [];
  const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
  const statuses = ['competent', 'competent', 'not_competent', 'needs_training'];
  
  for (const matrix of competencyMatrices) {
    // Get employees applicable to this matrix
    let applicableEmployees = [];
    
    if (matrix.scope === 'global') {
      applicableEmployees = employees;
    } else if (matrix.scope === 'designation') {
      applicableEmployees = employees.filter(e => 
        e.designation && matrix.scopeIds.some(id => id.toString() === e.designation._id?.toString())
      );
    }
    
    // For each applicable employee, assess their competencies
    for (const employee of applicableEmployees.slice(0, Math.min(20, applicableEmployees.length))) {
      for (const competency of matrix.competencies) {
        // Check if assessment already exists
        const existing = await CompetencyAssessment.findOne({
          employee: employee._id,
          competencyMatrix: matrix._id,
          competencyName: competency.competencyName
        });
        
        if (existing) {
          assessments.push(existing);
          continue;
        }
        
        const assessmentDate = new Date();
        assessmentDate.setDate(assessmentDate.getDate() - Math.floor(Math.random() * 365));
        
        const score = 60 + Math.floor(Math.random() * 40);
        const levelAchieved = levels[Math.floor(Math.random() * levels.length)];
        const requiredIndex = levels.indexOf(competency.requiredLevel);
        const achievedIndex = levels.indexOf(levelAchieved);
        const status = achievedIndex >= requiredIndex ? 'competent' : 'not_competent';
        
        // Calculate validity
        let validTo = null;
        if (competency.renewalPeriod) {
          validTo = new Date(assessmentDate);
          validTo.setMonth(validTo.getMonth() + competency.renewalPeriod);
        }
        
        const assessment = await CompetencyAssessment.create({
          employee: employee._id,
          competencyMatrix: matrix._id,
          competencyName: competency.competencyName,
          assessmentDate: assessmentDate,
          assessmentMethod: competency.assessmentMethod,
          assessedBy: hrEmployee.userId,
          assessorName: `${hrEmployee.firstName} ${hrEmployee.lastName}`,
          score: score,
          maxScore: 100,
          levelAchieved: levelAchieved,
          requiredLevel: competency.requiredLevel,
          status: status,
          validFrom: assessmentDate,
          validTo: validTo,
          renewalPeriod: competency.renewalPeriod,
          trainingRequired: status !== 'competent',
          createdBy: hrEmployee.userId,
          remarks: status === 'competent' ? 'Competency assessment passed' : 'Additional training required'
        });
        
        assessments.push(assessment);
      }
    }
  }
  
  console.log(`   ✅ Created ${assessments.length} competency assessments`);
  return assessments;
};

// Seed Immunization Records
const seedImmunizations = async (employees, hrEmployee) => {
  console.log('💉 Creating immunization records...');
  
  const immunizations = [];
  const vaccineTypes = ['hbv', 'tt', 'covid', 'influenza', 'mmr', 'varicella'];
  const vaccineNames = {
    hbv: 'Hepatitis B Vaccine',
    tt: 'Tetanus Toxoid',
    covid: ['Covishield', 'Covaxin', 'Sputnik V'],
    influenza: 'Influenza Vaccine',
    mmr: 'MMR Vaccine',
    varicella: 'Varicella Vaccine'
  };
  
  for (const employee of employees) {
    // Each employee should have multiple vaccines
    const vaccinesToAssign = vaccineTypes.slice(0, Math.min(4, vaccineTypes.length));
    
    for (const vaccineType of vaccinesToAssign) {
      // Check if immunization already exists
      const existing = await ImmunizationRecord.findOne({
        employee: employee._id,
        vaccineType: vaccineType,
        doseNumber: 1
      });
      
      if (existing) {
        immunizations.push(existing);
        continue;
      }
      
      const vaccinationDate = new Date();
      vaccinationDate.setDate(vaccinationDate.getDate() - Math.floor(Math.random() * 1095)); // Last 3 years
      
      let totalDoses = 1;
      if (vaccineType === 'hbv') totalDoses = 3;
      if (vaccineType === 'covid') totalDoses = 2 + (Math.random() > 0.7 ? 1 : 0); // 2-3 doses
      
      // Create first dose
      const dose1 = await ImmunizationRecord.create({
        employee: employee._id,
        vaccineType: vaccineType,
        vaccineName: vaccineType === 'covid' 
          ? vaccineNames.covid[Math.floor(Math.random() * vaccineNames.covid.length)]
          : vaccineNames[vaccineType],
        doseNumber: 1,
        totalDosesRequired: totalDoses,
        vaccinationDate: vaccinationDate,
        batchNumber: `BATCH${Math.random().toString().substr(2, 6)}`,
        manufacturer: vaccineType === 'covid' ? 'Serum Institute' : 'Various',
        vaccinationSite: 'Hospital Medical Center',
        administeredBy: 'Dr. Medical Officer',
        status: 'completed',
        certificateFile: `/certificates/${employee.employeeId}/${vaccineType}_dose1.pdf`,
        createdBy: hrEmployee.userId,
        nabhClauses: ['HR.6.1']
      });
      immunizations.push(dose1);
      
      // Create subsequent doses if required
      if (totalDoses > 1) {
        for (let doseNum = 2; doseNum <= totalDoses; doseNum++) {
          const nextDate = new Date(vaccinationDate);
          if (vaccineType === 'hbv') {
            if (doseNum === 2) nextDate.setMonth(nextDate.getMonth() + 1);
            if (doseNum === 3) nextDate.setMonth(nextDate.getMonth() + 5);
          } else if (vaccineType === 'covid') {
            nextDate.setMonth(nextDate.getMonth() + (doseNum - 1));
          }
          
          const doseN = await ImmunizationRecord.create({
            employee: employee._id,
            vaccineType: vaccineType,
            vaccineName: vaccineType === 'covid' 
              ? vaccineNames.covid[Math.floor(Math.random() * vaccineNames.covid.length)]
              : vaccineNames[vaccineType],
            doseNumber: doseNum,
            totalDosesRequired: totalDoses,
            vaccinationDate: nextDate,
            batchNumber: `BATCH${Math.random().toString().substr(2, 6)}`,
            manufacturer: vaccineType === 'covid' ? 'Serum Institute' : 'Various',
            vaccinationSite: 'Hospital Medical Center',
            administeredBy: 'Dr. Medical Officer',
            status: doseNum === totalDoses ? 'completed' : 'completed',
            certificateFile: `/certificates/${employee.employeeId}/${vaccineType}_dose${doseNum}.pdf`,
            createdBy: hrEmployee.userId,
            nabhClauses: ['HR.6.1']
          });
          immunizations.push(doseN);
        }
      }
    }
  }
  
  console.log(`   ✅ Created ${immunizations.length} immunization records`);
  return immunizations;
};

// Seed Health Checkups
const seedHealthCheckups = async (employees, hrEmployee) => {
  console.log('🏥 Creating health checkup records...');
  
  const checkups = [];
  const checkupTypes = ['pre_employment', 'annual', 'periodic', 'post_illness', 'return_to_work'];
  const fitnessStatuses = ['fit', 'fit', 'fit', 'fit_with_restrictions', 'unfit'];
  
  for (const employee of employees) {
    // Pre-employment checkup
    const joiningDate = new Date(employee.joiningDate);
    const preEmploymentDate = new Date(joiningDate);
    preEmploymentDate.setDate(preEmploymentDate.getDate() - 30);
    
    const existingPre = await HealthCheckup.findOne({
      employee: employee._id,
      checkupType: 'pre_employment'
    });
    
    if (!existingPre) {
      const preEmployment = await HealthCheckup.create({
        employee: employee._id,
        checkupDate: preEmploymentDate,
        checkupType: 'pre_employment',
        reportFile: `/checkups/${employee.employeeId}/pre_employment.pdf`,
        reportNumber: `HC${employee.employeeId}${preEmploymentDate.getFullYear()}`,
        conductedBy: 'Hospital Medical Center',
        doctorName: 'Dr. Health Officer',
        doctorQualification: 'MBBS, MD',
        fitnessStatus: 'fit',
        certificateIssued: true,
        certificateFile: `/certificates/${employee.employeeId}/fitness_pre_employment.pdf`,
        certificateNumber: `FIT${employee.employeeId}${preEmploymentDate.getFullYear()}`,
        certificateValidFrom: preEmploymentDate,
        certificateValidTo: new Date(preEmploymentDate.getFullYear() + 1, preEmploymentDate.getMonth(), preEmploymentDate.getDate()),
        nextCheckupDueDate: new Date(preEmploymentDate.getFullYear() + 1, preEmploymentDate.getMonth(), preEmploymentDate.getDate()),
        nextCheckupType: 'annual',
        status: 'completed',
        createdBy: hrEmployee.userId,
        nabhClauses: ['HR.6.1']
      });
      checkups.push(preEmployment);
    }
    
    // Annual checkups (2-3 per employee)
    const numAnnualCheckups = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < numAnnualCheckups; i++) {
      const checkupDate = new Date(joiningDate);
      checkupDate.setFullYear(checkupDate.getFullYear() + i + 1);
      checkupDate.setMonth(Math.floor(Math.random() * 12));
      
      // Check if exists
      const existing = await HealthCheckup.findOne({
        employee: employee._id,
        checkupDate: { $gte: new Date(checkupDate.getFullYear(), checkupDate.getMonth(), 1), $lt: new Date(checkupDate.getFullYear(), checkupDate.getMonth() + 1, 1) },
        checkupType: 'annual'
      });
      
      if (existing) {
        checkups.push(existing);
        continue;
      }
      
      const fitnessStatus = fitnessStatuses[Math.floor(Math.random() * fitnessStatuses.length)];
      const nextDue = new Date(checkupDate);
      nextDue.setFullYear(nextDue.getFullYear() + 1);
      
      const annual = await HealthCheckup.create({
        employee: employee._id,
        checkupDate: checkupDate,
        checkupType: 'annual',
        reportFile: `/checkups/${employee.employeeId}/annual_${checkupDate.getFullYear()}.pdf`,
        reportNumber: `HC${employee.employeeId}${checkupDate.getFullYear()}`,
        conductedBy: 'Hospital Medical Center',
        doctorName: 'Dr. Health Officer',
        doctorQualification: 'MBBS, MD',
        fitnessStatus: fitnessStatus,
        certificateIssued: fitnessStatus !== 'unfit',
        certificateFile: fitnessStatus !== 'unfit' ? `/certificates/${employee.employeeId}/fitness_${checkupDate.getFullYear()}.pdf` : null,
        certificateNumber: fitnessStatus !== 'unfit' ? `FIT${employee.employeeId}${checkupDate.getFullYear()}` : '',
        certificateValidFrom: fitnessStatus !== 'unfit' ? checkupDate : null,
        certificateValidTo: fitnessStatus !== 'unfit' ? nextDue : null,
        nextCheckupDueDate: nextDue,
        nextCheckupType: 'annual',
        status: 'completed',
        createdBy: hrEmployee.userId,
        nabhClauses: ['HR.6.1'],
        findings: fitnessStatus === 'fit_with_restrictions' ? 'Minor restrictions noted' : 'All parameters normal',
        recommendations: fitnessStatus === 'fit_with_restrictions' ? 'Follow up in 6 months' : 'Continue annual checkups'
      });
      checkups.push(annual);
    }
  }
  
  console.log(`   ✅ Created ${checkups.length} health checkup records`);
  return checkups;
};

// Seed Occupational Exposures
const seedOccupationalExposures = async (employees, departments, hrEmployee) => {
  console.log('⚠️  Creating occupational exposure records...');
  
  const exposures = [];
  const exposureTypes = ['needle_stick', 'blood_fluid', 'chemical', 'radiation', 'biological'];
  const statuses = ['reported', 'under_investigation', 'under_treatment', 'monitoring', 'resolved', 'closed'];
  const outcomes = ['no_infection', 'under_monitoring', 'pending'];
  
  // Create 15-25 exposure incidents
  const numExposures = 15 + Math.floor(Math.random() * 11);
  const employeesAtRisk = employees.filter(e => 
    e.designation?.name?.toLowerCase().includes('nurse') ||
    e.designation?.name?.toLowerCase().includes('doctor') ||
    e.designation?.name?.toLowerCase().includes('technician') ||
    e.department?.name?.toLowerCase().includes('lab')
  );
  
  for (let i = 0; i < numExposures; i++) {
    const employee = employeesAtRisk[Math.floor(Math.random() * employeesAtRisk.length)];
    const exposureType = exposureTypes[Math.floor(Math.random() * exposureTypes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
    
    const incidentDate = new Date();
    incidentDate.setDate(incidentDate.getDate() - Math.floor(Math.random() * 365));
    
    const exposure = await OccupationalExposure.create({
      employee: employee._id,
      exposureType: exposureType,
      incidentDate: incidentDate,
      incidentTime: `${8 + Math.floor(Math.random() * 12)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      location: employee.department?.name || 'Hospital',
      department: employee.department?._id || null,
      incidentDescription: `Needle stick injury during ${exposureType === 'needle_stick' ? 'venipuncture' : 'routine procedure'}`,
      cause: 'Human error / Equipment issue',
      woundCleaned: true,
      immediateAction: 'Wound cleaned with soap and water, first aid administered',
      pep: {
        recommended: exposureType === 'needle_stick' || exposureType === 'blood_fluid',
        provided: (exposureType === 'needle_stick' || exposureType === 'blood_fluid') && Math.random() > 0.3,
        startDate: (exposureType === 'needle_stick' || exposureType === 'blood_fluid') && Math.random() > 0.3 
          ? new Date(incidentDate.getTime() + 2 * 24 * 60 * 60 * 1000) 
          : null,
        endDate: (exposureType === 'needle_stick' || exposureType === 'blood_fluid') && Math.random() > 0.3
          ? new Date(incidentDate.getTime() + 32 * 24 * 60 * 60 * 1000)
          : null,
        medication: (exposureType === 'needle_stick' || exposureType === 'blood_fluid') && Math.random() > 0.3 ? 'Truvada' : '',
        completionStatus: (exposureType === 'needle_stick' || exposureType === 'blood_fluid') && Math.random() > 0.3 
          ? (Math.random() > 0.5 ? 'completed' : 'ongoing')
          : 'not_started'
      },
      baselineTesting: {
        hivTestDate: new Date(incidentDate.getTime() + 1 * 24 * 60 * 60 * 1000),
        hivTestResult: 'negative',
        hbvTestDate: new Date(incidentDate.getTime() + 1 * 24 * 60 * 60 * 1000),
        hbvTestResult: 'negative',
        hcvTestDate: new Date(incidentDate.getTime() + 1 * 24 * 60 * 60 * 1000),
        hcvTestResult: 'negative'
      },
      followUpTests: status !== 'reported' ? [{
        testType: 'hiv',
        testDate: new Date(incidentDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        testResult: 'negative',
        nextDueDate: new Date(incidentDate.getTime() + 90 * 24 * 60 * 60 * 1000)
      }] : [],
      investigation: {
        conducted: status !== 'reported',
        investigatedBy: status !== 'reported' ? hrEmployee.userId : null,
        investigationDate: status !== 'reported' ? new Date(incidentDate.getTime() + 7 * 24 * 60 * 60 * 1000) : null,
        rootCause: status !== 'reported' ? 'Improper disposal of sharps' : '',
        contributingFactors: status !== 'reported' ? ['Lack of awareness', 'Rushed procedure'] : []
      },
      outcome: outcome,
      finalStatus: status === 'closed' ? 'closed' : (status === 'resolved' ? 'resolved' : 'pending'),
      closureDate: status === 'closed' ? new Date(incidentDate.getTime() + 90 * 24 * 60 * 60 * 1000) : null,
      closureRemarks: status === 'closed' ? 'No infection detected after follow-up period' : '',
      status: status,
      reportedBy: employee.userId,
      createdBy: hrEmployee.userId,
      nabhClauses: ['HR.6.2']
    });
    
    exposures.push(exposure);
  }
  
  console.log(`   ✅ Created ${exposures.length} occupational exposure records`);
  return exposures;
};

// Seed Incident Reports
const seedIncidentReports = async (employees, departments, hrEmployee) => {
  console.log('📋 Creating incident reports...');
  
  const incidents = [];
  const incidentTypes = ['needle_stick', 'fall', 'chemical_spill', 'fire', 'equipment_failure', 'patient_safety', 'workplace_violence'];
  const severities = ['minor', 'moderate', 'major', 'critical'];
  const statuses = ['reported', 'under_investigation', 'capa_in_progress', 'resolved', 'closed'];
  
  // Create 20-30 incident reports
  const numIncidents = 20 + Math.floor(Math.random() * 11);
  
  for (let i = 0; i < numIncidents; i++) {
    const employee = employees[Math.floor(Math.random() * employees.length)];
    const incidentType = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    const incidentDate = new Date();
    incidentDate.setDate(incidentDate.getDate() - Math.floor(Math.random() * 180));
    
    const investigationStatus = status === 'reported' ? 'pending' : (status === 'under_investigation' ? 'in_progress' : 'completed');
    
    const incident = await IncidentReport.create({
      employee: employee._id,
      incidentType: incidentType,
      incidentDate: incidentDate,
      incidentTime: `${8 + Math.floor(Math.random() * 12)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
      location: employee.department?.name || 'Hospital',
      department: employee.department?._id || null,
      description: `${incidentType.replace('_', ' ')} incident occurred in ${employee.department?.name || 'hospital'}`,
      severity: severity,
      peopleInvolved: [{
        employee: employee._id,
        role: employee.designation?.name || 'Staff',
        injury: severity === 'critical' ? 'severe' : (severity === 'major' ? 'moderate' : 'minor'),
        treatmentRequired: severity !== 'minor'
      }],
      immediateActions: 'Immediate first aid provided, area secured',
      reportedBy: employee.userId,
      reportedAt: incidentDate,
      investigation: {
        status: investigationStatus,
        investigationStartDate: investigationStatus !== 'pending' ? new Date(incidentDate.getTime() + 1 * 24 * 60 * 60 * 1000) : null,
        investigationEndDate: investigationStatus === 'completed' ? new Date(incidentDate.getTime() + 14 * 24 * 60 * 60 * 1000) : null,
        rootCause: investigationStatus === 'completed' ? 'Root cause identified' : '',
        contributingFactors: investigationStatus === 'completed' ? ['Equipment failure', 'Lack of training'] : [],
        investigationReport: investigationStatus === 'completed' ? 'Investigation completed, CAPA implemented' : ''
      },
      capa: {
        correctiveActions: status !== 'reported' ? [{
          action: 'Replace faulty equipment',
          responsible: hrEmployee.userId,
          dueDate: new Date(incidentDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          status: status === 'closed' ? 'completed' : 'in_progress',
          completedDate: status === 'closed' ? new Date(incidentDate.getTime() + 25 * 24 * 60 * 60 * 1000) : null
        }] : [],
        preventiveActions: status !== 'reported' ? [{
          action: 'Staff training on equipment handling',
          responsible: hrEmployee.userId,
          dueDate: new Date(incidentDate.getTime() + 30 * 24 * 60 * 60 * 1000),
          status: status === 'closed' ? 'completed' : 'in_progress',
          completedDate: status === 'closed' ? new Date(incidentDate.getTime() + 28 * 24 * 60 * 60 * 1000) : null
        }] : []
      },
      status: status,
      closedBy: status === 'closed' ? hrEmployee.userId : null,
      closedAt: status === 'closed' ? new Date(incidentDate.getTime() + 45 * 24 * 60 * 60 * 1000) : null,
      closureRemarks: status === 'closed' ? 'All CAPA actions completed successfully' : '',
      createdBy: hrEmployee.userId,
      nabhClauses: ['HR.6.2']
    });
    
    incidents.push(incident);
  }
  
  console.log(`   ✅ Created ${incidents.length} incident reports`);
  return incidents;
};

// Seed Privilege Categories
const seedPrivilegeCategories = async (trainingPrograms, adminUser) => {
  console.log('👨‍⚕️ Creating privilege categories...');
  
  const categories = [];
  const privilegeData = [
    {
      name: 'General Medicine',
      code: 'GEN_MED',
      description: 'General medical practice privileges',
      categoryType: 'general',
      defaultValidityPeriod: 36,
      renewalRequired: true
    },
    {
      name: 'Emergency Medicine',
      code: 'EMERG_MED',
      description: 'Emergency medicine privileges',
      categoryType: 'emergency',
      defaultValidityPeriod: 36,
      renewalRequired: true
    },
    {
      name: 'Surgery - General',
      code: 'SURG_GEN',
      description: 'General surgery privileges',
      categoryType: 'procedure',
      defaultValidityPeriod: 36,
      renewalRequired: true,
      requirements: {
        minimumQualification: 'MS (General Surgery)',
        minimumExperience: { years: 3, months: 0 }
      }
    },
    {
      name: 'Surgery - Laparoscopic',
      code: 'SURG_LAP',
      description: 'Laparoscopic surgery privileges',
      categoryType: 'procedure',
      defaultValidityPeriod: 36,
      renewalRequired: true,
      requirements: {
        minimumQualification: 'MS (General Surgery)',
        minimumExperience: { years: 2, months: 0 },
        requiredTraining: [trainingPrograms.find(p => p.code === 'ACLS001')?._id].filter(Boolean)
      }
    },
    {
      name: 'Cardiac Procedures',
      code: 'CARD_PROC',
      description: 'Cardiac procedure privileges',
      categoryType: 'specialty',
      defaultValidityPeriod: 36,
      renewalRequired: true,
      requirements: {
        minimumQualification: 'DM (Cardiology)',
        minimumExperience: { years: 2, months: 0 }
      },
      renewalRequirements: {
        cmeHours: 50,
        caseLogRequired: true,
        minimumCases: 50
      }
    },
    {
      name: 'ICU Management',
      code: 'ICU_MGT',
      description: 'Intensive Care Unit management privileges',
      categoryType: 'specialty',
      defaultValidityPeriod: 36,
      renewalRequired: true,
      requirements: {
        minimumQualification: 'MD/DNB (Critical Care)',
        minimumExperience: { years: 1, months: 0 }
      }
    },
    {
      name: 'Anesthesia',
      code: 'ANESTH',
      description: 'Anesthesia administration privileges',
      categoryType: 'specialty',
      defaultValidityPeriod: 36,
      renewalRequired: true,
      requirements: {
        minimumQualification: 'MD (Anesthesia)',
        minimumExperience: { years: 2, months: 0 }
      }
    }
  ];
  
  for (const privData of privilegeData) {
    const existing = await PrivilegeCategory.findOne({ code: privData.code });
    if (!existing) {
      const category = await PrivilegeCategory.create({
        ...privData,
        createdBy: adminUser._id
      });
      categories.push(category);
    } else {
      categories.push(existing);
    }
  }
  
  console.log(`   ✅ Created/Found ${categories.length} privilege categories`);
  return categories;
};

// Seed Privilege Committees
const seedPrivilegeCommittees = async (employees, adminUser) => {
  console.log('👥 Creating privilege committees...');
  
  const committees = [];
  
  // Find doctors for committee members
  const doctors = employees.filter(e => 
    e.designation?.name?.toLowerCase().includes('doctor') ||
    e.designation?.code === 'DOC' ||
    e.designation?.code === 'SRDOC' ||
    e.designation?.code === 'CMO'
  );
  
  if (doctors.length >= 5) {
    const selectedDoctors = doctors.slice(0, 5);
    const committee1 = await PrivilegeCommittee.create({
      name: 'Hospital Privileging Committee',
      description: 'Main hospital privileging committee',
      members: [
        {
          employee: selectedDoctors[0]._id,
          role: 'chairperson',
          designation: selectedDoctors[0].designation?.name || 'Doctor'
        },
        {
          employee: selectedDoctors[1]._id,
          role: 'secretary',
          designation: selectedDoctors[1].designation?.name || 'Doctor'
        },
        {
          employee: selectedDoctors[2]._id,
          role: 'member',
          designation: selectedDoctors[2].designation?.name || 'Doctor'
        },
        {
          employee: selectedDoctors[3]._id,
          role: 'member',
          designation: selectedDoctors[3].designation?.name || 'Doctor'
        },
        {
          employee: selectedDoctors[4]._id,
          role: 'member',
          designation: selectedDoctors[4].designation?.name || 'Doctor'
        }
      ],
      isActive: true,
      createdBy: adminUser._id
    });
    committees.push(committee1);
  }
  
  console.log(`   ✅ Created ${committees.length} privilege committees`);
  return committees;
};

// Seed Privilege Requests and Doctor Privileges
const seedPrivileges = async (employees, privilegeCategories, privilegeCommittees, hrEmployee, adminUser) => {
  console.log('📝 Creating privilege requests and doctor privileges...');
  
  const requests = [];
  const doctorPrivileges = [];
  
  // Find doctors
  const doctors = employees.filter(e => 
    e.designation?.name?.toLowerCase().includes('doctor') ||
    e.designation?.code === 'DOC' ||
    e.designation?.code === 'SRDOC'
  );
  
  const statuses = ['submitted', 'under_review', 'hod_approved', 'committee_review', 'approved'];
  
  for (const doctor of doctors.slice(0, Math.min(15, doctors.length))) {
    // Select 1-3 privilege categories
    const numPrivileges = 1 + Math.floor(Math.random() * 3);
    const selectedCategories = privilegeCategories.slice(0, numPrivileges);
    
    // Check if request already exists
    const existingRequest = await PrivilegeRequest.findOne({ employee: doctor._id });
    if (existingRequest) {
      requests.push(existingRequest);
      
      // Create doctor privileges if approved
      if (existingRequest.status === 'approved' && existingRequest.finalDecision?.decision === 'approved') {
        for (const approved of existingRequest.finalDecision.approvedPrivileges) {
          const existingPriv = await DoctorPrivilege.findOne({
            employee: doctor._id,
            privilegeCategory: approved.privilegeCategory
          });
          if (!existingPriv) {
            const priv = await DoctorPrivilege.create({
              employee: doctor._id,
              privilegeCategory: approved.privilegeCategory,
              privilegeRequest: existingRequest._id,
              restrictions: approved.restrictions || '',
              conditions: approved.conditions || '',
              validFrom: new Date(),
              validityPeriod: 36,
              status: 'active',
              grantedBy: adminUser._id,
              createdBy: adminUser._id,
              nabhClauses: ['HR.3.1']
            });
            doctorPrivileges.push(priv);
          }
        }
      }
      continue;
    }
    
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const applicationDate = new Date();
    applicationDate.setDate(applicationDate.getDate() - Math.floor(Math.random() * 90));
    
    const request = await PrivilegeRequest.create({
      employee: doctor._id,
      requestedPrivileges: selectedCategories.map(cat => ({
        privilegeCategory: cat._id,
        justification: `Requesting ${cat.name} privileges based on qualification and experience`
      })),
      applicationDate: applicationDate,
      qualifications: [{
        degree: 'MBBS',
        institution: 'Medical College',
        year: 2010 + Math.floor(Math.random() * 15)
      }],
      experience: {
        totalYears: 5 + Math.floor(Math.random() * 15),
        relevantExperience: 3 + Math.floor(Math.random() * 10)
      },
      status: status,
      reviewedByHod: status !== 'submitted' ? {
        reviewer: hrEmployee.userId,
        reviewedAt: new Date(applicationDate.getTime() + 5 * 24 * 60 * 60 * 1000),
        comments: 'HOD reviewed and approved',
        decision: status === 'submitted' ? 'pending' : 'approved'
      } : undefined,
      reviewedByCommittee: status === 'committee_review' || status === 'approved' ? {
        committee: privilegeCommittees[0]?._id,
        meetingDate: new Date(applicationDate.getTime() + 15 * 24 * 60 * 60 * 1000),
        reviewedAt: new Date(applicationDate.getTime() + 15 * 24 * 60 * 60 * 1000),
        comments: 'Committee reviewed and approved',
        decision: 'approved',
        recommendations: selectedCategories.map(cat => ({
          privilegeCategory: cat._id,
          recommendation: 'grant'
        }))
      } : undefined,
      finalDecision: status === 'approved' ? {
        decision: 'approved',
        approvedPrivileges: selectedCategories.map(cat => ({
          privilegeCategory: cat._id,
          restrictions: '',
          conditions: ''
        })),
        decisionDate: new Date(applicationDate.getTime() + 20 * 24 * 60 * 60 * 1000),
        decidedBy: adminUser._id
      } : undefined,
      createdBy: doctor.userId,
      nabhClauses: ['HR.3.1']
    });
    
    requests.push(request);
    
    // Create doctor privileges if approved
    if (status === 'approved' && request.finalDecision?.decision === 'approved') {
      for (const approved of request.finalDecision.approvedPrivileges) {
        const priv = await DoctorPrivilege.create({
          employee: doctor._id,
          privilegeCategory: approved.privilegeCategory,
          privilegeRequest: request._id,
          restrictions: approved.restrictions || '',
          conditions: approved.conditions || '',
          validFrom: new Date(applicationDate.getTime() + 21 * 24 * 60 * 60 * 1000),
          validityPeriod: privilegeCategories.find(c => c._id.toString() === approved.privilegeCategory.toString())?.defaultValidityPeriod || 36,
          status: 'active',
          grantedBy: adminUser._id,
          grantOrderNumber: `PRIV${new Date().getFullYear()}${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`,
          createdBy: adminUser._id,
          nabhClauses: ['HR.3.1']
        });
        doctorPrivileges.push(priv);
      }
    }
  }
  
  console.log(`   ✅ Created ${requests.length} privilege requests and ${doctorPrivileges.length} doctor privileges`);
  return { requests, doctorPrivileges };
};

// Seed Training Effectiveness
const seedTrainingEffectiveness = async (trainingRecords, hrEmployee) => {
  console.log('📊 Creating training effectiveness records...');
  
  const effectivenessRecords = [];
  
  // Only for completed training records
  const completedRecords = trainingRecords.filter(r => r.status === 'completed');
  
  for (const record of completedRecords.slice(0, Math.min(100, completedRecords.length))) {
    // Check if already exists
    const existing = await TrainingEffectiveness.findOne({ trainingRecord: record._id });
    if (existing) {
      effectivenessRecords.push(existing);
      continue;
    }
    
    const preScore = 40 + Math.floor(Math.random() * 30);
    const postScore = 70 + Math.floor(Math.random() * 30);
    const improvement = ((postScore - preScore) / preScore) * 100;
    
    const performanceRating = 3 + Math.random() * 2;
    const effectivenessRating = (postScore / 100) * 4 + (performanceRating / 5) * 1;
    const effectivenessStatus = effectivenessRating >= 4 ? 'effective' : 
                                 effectivenessRating >= 3 ? 'partially_effective' : 'not_effective';
    
    const effectiveness = await TrainingEffectiveness.create({
      trainingRecord: record._id,
      employee: record.employee,
      trainingProgram: record.trainingProgram,
      preTrainingAssessment: {
        conducted: true,
        score: preScore,
        conductedDate: new Date(record.trainingDate.getTime() - 1 * 24 * 60 * 60 * 1000),
        remarks: 'Pre-training baseline assessment'
      },
      postTrainingAssessment: {
        conducted: true,
        score: postScore,
        conductedDate: new Date(record.completionDate.getTime() + 1 * 24 * 60 * 60 * 1000),
        improvement: improvement,
        remarks: 'Post-training assessment completed'
      },
      performanceTracking: {
        tracked: true,
        trackingPeriod: {
          startDate: record.completionDate,
          endDate: new Date(record.completionDate.getTime() + 90 * 24 * 60 * 60 * 1000)
        },
        performanceRating: performanceRating,
        averageRating: performanceRating
      },
      effectivenessRating: effectivenessRating,
      effectivenessStatus: effectivenessStatus,
      retrainingRequired: effectivenessStatus === 'not_effective',
      status: 'completed',
      evaluatedBy: hrEmployee.userId,
      evaluatedAt: new Date(record.completionDate.getTime() + 91 * 24 * 60 * 60 * 1000),
      createdBy: hrEmployee.userId,
      nabhClauses: ['HR.4.2']
    });
    
    effectivenessRecords.push(effectiveness);
  }
  
  console.log(`   ✅ Created ${effectivenessRecords.length} training effectiveness records`);
  return effectivenessRecords;
};

// Main seed function
const seedNABHData = async () => {
  try {
    await connectDB();
    
    console.log('\n🏥 Starting NABH Compliance Data Seeding...\n');
    
    // Get existing data
    const employees = await Employee.find({}).populate('department designation');
    if (employees.length === 0) {
      console.log('❌ No employees found. Please run seedDummyData.js first!');
      process.exit(1);
    }
    
    const adminUser = await User.findOne({ email: 'admin@vaaltic.com' });
    if (!adminUser) {
      console.log('❌ Admin user not found. Please run seedDummyData.js first!');
      process.exit(1);
    }
    
    const hrEmployees = employees.filter(e => e.email.includes('hr@vaaltic.com') || e.email.includes('admin@vaaltic.com'));
    const hrEmployee = hrEmployees[0] || employees[0];
    
    const departments = await Department.find({});
    const designations = await Designation.find({});
    
    // Seed NABH Training Programs
    const trainingPrograms = await seedNABHTrainingPrograms(adminUser);
    
    // Seed Training Records
    const trainingRecords = await seedTrainingRecords(employees, trainingPrograms, hrEmployee);
    
    // Seed Competency Matrix
    const competencyMatrices = await seedCompetencyMatrix(departments, designations, trainingPrograms, adminUser);
    
    // Seed Competency Assessments
    const competencyAssessments = await seedCompetencyAssessments(employees, competencyMatrices, hrEmployee);
    
    // Seed Immunization Records
    const immunizations = await seedImmunizations(employees, hrEmployee);
    
    // Seed Health Checkups
    const healthCheckups = await seedHealthCheckups(employees, hrEmployee);
    
    // Seed Occupational Exposures
    const occupationalExposures = await seedOccupationalExposures(employees, departments, hrEmployee);
    
    // Seed Incident Reports
    const incidentReports = await seedIncidentReports(employees, departments, hrEmployee);
    
    // Seed Privilege Categories
    const privilegeCategories = await seedPrivilegeCategories(trainingPrograms, adminUser);
    
    // Seed Privilege Committees
    const privilegeCommittees = await seedPrivilegeCommittees(employees, adminUser);
    
    // Seed Privilege Requests and Doctor Privileges
    const { requests, doctorPrivileges } = await seedPrivileges(
      employees,
      privilegeCategories,
      privilegeCommittees,
      hrEmployee,
      adminUser
    );
    
    // Seed Training Effectiveness
    const trainingEffectiveness = await seedTrainingEffectiveness(trainingRecords, hrEmployee);
    
    console.log('\n✅ NABH Compliance Data Seeding Complete!');
    console.log('\n📊 Summary:');
    console.log(`   - Training Programs: ${trainingPrograms.length}`);
    console.log(`   - Training Records: ${trainingRecords.length}`);
    console.log(`   - Competency Matrices: ${competencyMatrices.length}`);
    console.log(`   - Competency Assessments: ${competencyAssessments.length}`);
    console.log(`   - Immunization Records: ${immunizations.length}`);
    console.log(`   - Health Checkups: ${healthCheckups.length}`);
    console.log(`   - Occupational Exposures: ${occupationalExposures.length}`);
    console.log(`   - Incident Reports: ${incidentReports.length}`);
    console.log(`   - Privilege Categories: ${privilegeCategories.length}`);
    console.log(`   - Privilege Committees: ${privilegeCommittees.length}`);
    console.log(`   - Privilege Requests: ${requests.length}`);
    console.log(`   - Doctor Privileges: ${doctorPrivileges.length}`);
    console.log(`   - Training Effectiveness: ${trainingEffectiveness.length}`);
    console.log('\n🎉 All NABH compliance data has been generated successfully!');
    console.log('\n💡 You can now use the application for NABH compliance demonstration.');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding NABH data:', error);
    process.exit(1);
  }
};

seedNABHData();

