import { JobOpening, Candidate, JobHistory, CandidateStageHistory } from '../models/recruitment.model.js';
import Employee from '../models/employee.model.js';

// Helper function to create job history entry
const createJobHistory = async (jobId, action, performedBy, field = null, oldValue = null, newValue = null, approvedBy = null, remarks = '') => {
  try {
    await JobHistory.create({
      jobOpening: jobId,
      action,
      field,
      oldValue,
      newValue,
      performedBy,
      approvedBy,
      remarks
    });
  } catch (error) {
    console.error('Error creating job history:', error);
  }
};

// Get all job openings with filtering
export const getJobOpenings = async (req, res) => {
  try {
    const { status, department, location, locationType, employmentType } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (department) filter.department = department;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (locationType) filter.locationType = locationType;
    if (employmentType) filter.employmentType = employmentType;

    // Only show open jobs in public/internal listings if requested
    if (req.query.public === 'true') {
      filter.status = 'open';
      filter['publishedTo.public'] = true;
    } else if (req.query.internal === 'true') {
      filter.status = 'open';
      filter['publishedTo.internal'] = true;
    }

    const jobs = await JobOpening.find(filter)
      .populate('department', 'name')
      .populate('designation', 'name')
      .populate('hiringManager', 'firstName lastName employeeId email')
      .populate('postedBy', 'email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single job opening
export const getJobOpening = async (req, res) => {
  try {
    const job = await JobOpening.findById(req.params.id)
      .populate('department', 'name')
      .populate('designation', 'name')
      .populate('hiringManager', 'firstName lastName employeeId email phone')
      .populate('postedBy', 'email');

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job opening not found' });
    }

    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create job opening
export const createJobOpening = async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      postedBy: req.user._id,
      status: req.body.status || 'draft'
    };

    // Only set postedDate if status is 'open'
    if (jobData.status === 'open') {
      jobData.postedDate = new Date();
    }

    const job = await JobOpening.create(jobData);
    
    // Create history entry
    await createJobHistory(
      job._id,
      'created',
      req.user._id,
      null,
      null,
      null,
      null,
      'Job opening created'
    );

    const populated = await JobOpening.findById(job._id)
      .populate('department', 'name')
      .populate('designation', 'name')
      .populate('hiringManager', 'firstName lastName employeeId email')
      .populate('postedBy', 'email');

    res.status(201).json({ success: true, message: 'Job opening created successfully', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update job opening
export const updateJobOpening = async (req, res) => {
  try {
    const job = await JobOpening.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job opening not found' });
    }

    // Prevent editing if status is closed (unless admin override)
    if (job.status === 'closed' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot edit closed job opening' });
    }

    const oldStatus = job.status;
    const oldData = { ...job.toObject() };
    
    // Update fields
    Object.keys(req.body).forEach(key => {
      if (key !== 'postedBy' && key !== '_id' && key !== '__v') {
        if (job[key] !== req.body[key]) {
          // Create history entry for each changed field
          createJobHistory(
            job._id,
            'updated',
            req.user._id,
            key,
            oldData[key],
            req.body[key]
          );
        }
        job[key] = req.body[key];
      }
    });

    // Handle status change
    if (req.body.status && req.body.status !== oldStatus) {
      await createJobHistory(
        job._id,
        'status_changed',
        req.user._id,
        'status',
        oldStatus,
        req.body.status,
        null,
        req.body.statusRemarks || ''
      );

      // Set postedDate when status changes to 'open'
      if (req.body.status === 'open' && !job.postedDate) {
        job.postedDate = new Date();
      }
    }

    await job.save();

    const populated = await JobOpening.findById(job._id)
      .populate('department', 'name')
      .populate('designation', 'name')
      .populate('hiringManager', 'firstName lastName employeeId email')
      .populate('postedBy', 'email');

    res.json({ success: true, message: 'Job opening updated successfully', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Duplicate job opening
export const duplicateJobOpening = async (req, res) => {
  try {
    const originalJob = await JobOpening.findById(req.params.id);
    if (!originalJob) {
      return res.status(404).json({ success: false, message: 'Job opening not found' });
    }

    // Create duplicate with new data
    const jobData = originalJob.toObject();
    delete jobData._id;
    delete jobData.__v;
    delete jobData.createdAt;
    delete jobData.updatedAt;
    
    // Modify title and status for duplicate
    jobData.title = `${jobData.title} (Copy)`;
    jobData.status = 'draft';
    jobData.postedDate = null;
    jobData.postedBy = req.user._id;
    jobData.publishedTo = {
      internal: false,
      public: false,
      linkedin: false,
      naukri: false,
      indeed: false
    };

    const duplicatedJob = await JobOpening.create(jobData);

    // Create history entry
    await createJobHistory(
      duplicatedJob._id,
      'created',
      req.user._id,
      null,
      null,
      null,
      null,
      `Duplicated from job opening: ${originalJob.title}`
    );

    await createJobHistory(
      originalJob._id,
      'duplicated',
      req.user._id,
      null,
      null,
      duplicatedJob._id.toString(),
      null,
      `Duplicated as: ${duplicatedJob.title}`
    );

    const populated = await JobOpening.findById(duplicatedJob._id)
      .populate('department', 'name')
      .populate('designation', 'name')
      .populate('hiringManager', 'firstName lastName employeeId email')
      .populate('postedBy', 'email');

    res.status(201).json({ success: true, message: 'Job opening duplicated successfully', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Publish job opening
export const publishJobOpening = async (req, res) => {
  try {
    const job = await JobOpening.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job opening not found' });
    }

    if (job.status === 'draft') {
      return res.status(400).json({ success: false, message: 'Cannot publish draft job. Please change status to "open" first.' });
    }

    if (job.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Cannot publish closed job opening' });
    }

    const { platforms } = req.body; // { internal: true, public: true, linkedin: false, etc. }
    
    const oldPublishedTo = { ...job.publishedTo.toObject() };
    
    // Update publish settings
    if (platforms) {
      Object.keys(platforms).forEach(platform => {
        if (job.publishedTo.hasOwnProperty(platform)) {
          job.publishedTo[platform] = platforms[platform];
        }
      });
    }

    await job.save();

    // Create history entry
    const publishedPlatforms = Object.keys(platforms || {})
      .filter(key => platforms[key] === true)
      .join(', ');

    await createJobHistory(
      job._id,
      'published',
      req.user._id,
      'publishedTo',
      oldPublishedTo,
      job.publishedTo,
      null,
      `Published to: ${publishedPlatforms || 'none'}`
    );

    const populated = await JobOpening.findById(job._id)
      .populate('department', 'name')
      .populate('designation', 'name')
      .populate('hiringManager', 'firstName lastName employeeId email')
      .populate('postedBy', 'email');

    res.json({ success: true, message: 'Job opening published successfully', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Unpublish job opening
export const unpublishJobOpening = async (req, res) => {
  try {
    const job = await JobOpening.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job opening not found' });
    }

    const { platforms } = req.body; // Array of platforms to unpublish
    const oldPublishedTo = { ...job.publishedTo.toObject() };

    if (platforms && Array.isArray(platforms)) {
      platforms.forEach(platform => {
        if (job.publishedTo.hasOwnProperty(platform)) {
          job.publishedTo[platform] = false;
        }
      });
    } else {
      // Unpublish from all platforms
      Object.keys(job.publishedTo).forEach(key => {
        job.publishedTo[key] = false;
      });
    }

    await job.save();

    // Create history entry
    await createJobHistory(
      job._id,
      'unpublished',
      req.user._id,
      'publishedTo',
      oldPublishedTo,
      job.publishedTo,
      null,
      `Unpublished from: ${platforms ? platforms.join(', ') : 'all platforms'}`
    );

    const populated = await JobOpening.findById(job._id)
      .populate('department', 'name')
      .populate('designation', 'name')
      .populate('hiringManager', 'firstName lastName employeeId email')
      .populate('postedBy', 'email');

    res.json({ success: true, message: 'Job opening unpublished successfully', data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get job history
export const getJobHistory = async (req, res) => {
  try {
    const history = await JobHistory.find({ jobOpening: req.params.id })
      .populate('performedBy', 'email')
      .populate('approvedBy', 'email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete job opening
export const deleteJobOpening = async (req, res) => {
  try {
    const job = await JobOpening.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job opening not found' });
    }

    // Check if there are candidates associated
    const candidateCount = await Candidate.countDocuments({ jobOpening: req.params.id });
    if (candidateCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete job opening with ${candidateCount} associated candidate(s). Please close it instead.` 
      });
    }

    await JobOpening.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Job opening deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Candidate management functions
export const createCandidate = async (req, res) => {
  try {
    const { jobOpeningId } = req.params;
    
    // Check if job opening exists
    const job = await JobOpening.findById(jobOpeningId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job opening not found' });
    }

    // Check if job is accepting applications (only for external/public applications)
    if (req.query.public === 'true') {
      if (job.status !== 'open') {
        return res.status(400).json({ success: false, message: 'This job opening is not accepting applications' });
      }

      const now = new Date();
      if (job.applicationEndDate && now > job.applicationEndDate) {
        return res.status(400).json({ success: false, message: 'Application deadline has passed' });
      }

      if (job.applicationStartDate && now < job.applicationStartDate) {
        return res.status(400).json({ success: false, message: 'Applications are not yet open for this position' });
      }
    }

    // Handle FormData - parse nested objects
    let experience = { years: 0, months: 0 };
    if (req.body.experience) {
      if (typeof req.body.experience === 'string') {
        try {
          experience = JSON.parse(req.body.experience);
        } catch (e) {
          // If parsing fails, try individual fields (from FormData with bracket notation)
          experience = {
            years: parseInt(req.body['experience[years]'] || req.body['experience.years'] || 0),
            months: parseInt(req.body['experience[months]'] || req.body['experience.months'] || 0)
          };
        }
      } else if (typeof req.body.experience === 'object') {
        experience = req.body.experience;
      } else {
        experience = {
          years: parseInt(req.body['experience[years]'] || req.body['experience.years'] || 0),
          months: parseInt(req.body['experience[months]'] || req.body['experience.months'] || 0)
        };
      }
    }

        const candidateData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: (req.body.email || '').toLowerCase().trim(),
      phone: (req.body.phone || '').trim(),
      experience: experience,
      source: req.body.source || 'other',
      coverLetter: req.body.coverLetter || '',
      notes: req.body.notes || '',
      assignedRecruiter: req.body.assignedRecruiter || null,
      jobOpening: jobOpeningId,
      addedBy: req.user._id
    };

    // Handle resume file upload
    if (req.file) {
      candidateData.resume = `/uploads/${req.file.filename}`;
      candidateData.resumeFileName = req.file.originalname;
    }

    // Duplicate checking
    const duplicateChecks = await Promise.all([
      Candidate.findOne({ 
        email: candidateData.email, 
        jobOpening: jobOpeningId,
        status: 'active'
      }),
      Candidate.findOne({ 
        phone: candidateData.phone, 
        jobOpening: jobOpeningId,
        status: 'active'
      })
    ]);

    const emailDuplicate = duplicateChecks[0];
    const phoneDuplicate = duplicateChecks[1];

    if (emailDuplicate || phoneDuplicate) {
      const duplicates = [];
      if (emailDuplicate) {
        duplicates.push(`A candidate with email ${candidateData.email} has already applied for this position`);
      }
      if (phoneDuplicate && phoneDuplicate._id.toString() !== emailDuplicate?._id.toString()) {
        duplicates.push(`A candidate with phone ${candidateData.phone} has already applied for this position`);
      }
      
      return res.status(400).json({ 
        success: false, 
        message: 'Duplicate candidate detected',
        errors: duplicates,
        duplicate: true
      });
    }

    const candidate = await Candidate.create(candidateData);
    
    const populated = await Candidate.findById(candidate._id)
      .populate('jobOpening', 'title')
      .populate('assignedRecruiter', 'email')
      .populate('addedBy', 'email');

    res.status(201).json({ 
      success: true, 
      message: 'Candidate application created successfully', 
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

export const applyForJob = async (req, res) => {
  try {
    // This is for public job applications
    req.query.public = 'true';
    req.params.jobOpeningId = req.params.id;
    return createCandidate(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCandidates = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, status, source, assignedRecruiter } = req.query;
    
    const filter = { jobOpening: id };
    if (stage) filter.stage = stage;
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (assignedRecruiter) filter.assignedRecruiter = assignedRecruiter;

    const candidates = await Candidate.find(filter)
      .populate('jobOpening', 'title department designation')
      .populate('assignedRecruiter', 'email')
      .populate('addedBy', 'email')
      .sort({ createdAt: -1 });
      
    res.json({ success: true, data: candidates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllCandidates = async (req, res) => {
  try {
    const { stage, status, source, assignedRecruiter, jobOpening, search } = req.query;
    
    const filter = {};
    if (stage) filter.stage = stage;
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (assignedRecruiter) filter.assignedRecruiter = assignedRecruiter;
    if (jobOpening) filter.jobOpening = jobOpening;
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const candidates = await Candidate.find(filter)
      .populate('jobOpening', 'title department designation')
      .populate('assignedRecruiter', 'email')
      .populate('addedBy', 'email')
      .sort({ createdAt: -1 });
      
    res.json({ success: true, data: candidates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('jobOpening')
      .populate('assignedRecruiter', 'email')
      .populate('addedBy', 'email')
      .populate('interviews.interviewers', 'email')
      .populate('interviews.scheduledBy', 'email')
      .populate('interviews.feedback.submittedBy', 'email')
      .populate('interviews.cancelledBy', 'email');

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    res.json({ success: true, data: candidate });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    // Handle FormData - parse nested objects
    if (req.body.experience || req.body['experience[years]'] || req.body['experience[months]']) {
      let experience = candidate.experience || { years: 0, months: 0 };
      if (req.body.experience) {
        if (typeof req.body.experience === 'string') {
          try {
            experience = JSON.parse(req.body.experience);
          } catch (e) {
            experience = {
              years: parseInt(req.body['experience[years]'] || experience.years || 0),
              months: parseInt(req.body['experience[months]'] || experience.months || 0)
            };
          }
        } else if (typeof req.body.experience === 'object') {
          experience = req.body.experience;
        }
      } else {
        experience = {
          years: parseInt(req.body['experience[years]'] || experience.years || 0),
          months: parseInt(req.body['experience[months]'] || experience.months || 0)
        };
      }
      req.body.experience = experience;
    }

    // Handle resume file upload
    if (req.file) {
      req.body.resume = `/uploads/${req.file.filename}`;
      req.body.resumeFileName = req.file.originalname;
    }

    // Normalize email and phone
    if (req.body.email) {
      req.body.email = req.body.email.toLowerCase().trim();
    }
    if (req.body.phone) {
      req.body.phone = req.body.phone.trim();
    }

    // Duplicate checking (only if email or phone changed)
    if (req.body.email || req.body.phone) {
      const emailToCheck = req.body.email || candidate.email;
      const phoneToCheck = req.body.phone || candidate.phone;

      const duplicateChecks = await Promise.all([
        req.body.email ? Candidate.findOne({ 
          email: emailToCheck, 
          jobOpening: candidate.jobOpening,
          _id: { $ne: candidate._id },
          status: 'active'
        }) : null,
        req.body.phone ? Candidate.findOne({ 
          phone: phoneToCheck, 
          jobOpening: candidate.jobOpening,
          _id: { $ne: candidate._id },
          status: 'active'
        }) : null
      ]);

      const emailDuplicate = duplicateChecks[0];
      const phoneDuplicate = duplicateChecks[1];

      if (emailDuplicate || phoneDuplicate) {
        const duplicates = [];
        if (emailDuplicate) {
          duplicates.push(`A candidate with email ${emailToCheck} has already applied for this position`);
        }
        if (phoneDuplicate && phoneDuplicate._id.toString() !== emailDuplicate?._id.toString()) {
          duplicates.push(`A candidate with phone ${phoneToCheck} has already applied for this position`);
        }
        
        return res.status(400).json({ 
          success: false, 
          message: 'Duplicate candidate detected',
          errors: duplicates
        });
      }
    }

    Object.keys(req.body).forEach(key => {
      if (key !== '_id' && key !== '__v') {
        candidate[key] = req.body[key];
      }
    });

    await candidate.save();

    const populated = await Candidate.findById(candidate._id)
      .populate('jobOpening', 'title')
      .populate('assignedRecruiter', 'email')
      .populate('addedBy', 'email');

    res.json({ success: true, message: 'Candidate updated successfully', data: populated });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCandidateStage = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id).populate('jobOpening');
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const { stage, comments, notifyCandidate, notifyInterviewer, overrideReason } = req.body;
    const oldStage = candidate.stage;
    const finalStages = ['hired', 'rejected'];
    const isFinalStage = finalStages.includes(stage);
    const wasFinalStage = finalStages.includes(oldStage);

    // Check if trying to change from a final stage
    if (wasFinalStage && stage !== oldStage && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: `Cannot change stage from ${oldStage}. Only Admin can override final stages.`
      });
    }

    // Check if trying to change to a final stage when already in one
    if (wasFinalStage && isFinalStage && stage !== oldStage && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Candidate is in a final stage. Only Admin can override.',
        requiresOverride: true
      });
    }

    // Require comments for rejected stage
    if (stage === 'rejected' && (!comments || comments.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Comments are required when rejecting a candidate'
      });
    }

    // Track if this is an admin override
    const isOverride = (wasFinalStage && stage !== oldStage && req.user.role === 'admin') ||
                       (wasFinalStage && isFinalStage && stage !== oldStage && req.user.role === 'admin');

    // Update candidate stage
    candidate.stage = stage;
    
    // If moved to hired or rejected, lock the record (status becomes inactive can be handled separately)
    // The restriction is enforced in the logic above
    
    await candidate.save();

    // Create stage history entry
    const stageHistory = await CandidateStageHistory.create({
      candidate: candidate._id,
      fromStage: oldStage,
      toStage: stage,
      changedBy: req.user._id,
      comments: comments || '',
      notifiedCandidate: notifyCandidate || false,
      notifiedInterviewer: notifyInterviewer || false,
      isOverride: isOverride,
      overrideReason: overrideReason || (isOverride ? 'Admin override' : '')
    });

    // TODO: Send notifications (Email/SMS) - placeholder for future implementation
    // if (notifyCandidate && candidate.email) {
    //   // Send email notification
    // }
    // if (notifyInterviewer && candidate.assignedRecruiter) {
    //   // Send notification to interviewer
    // }

    // Populate the updated candidate
    const populated = await Candidate.findById(candidate._id)
      .populate('jobOpening', 'title')
      .populate('assignedRecruiter', 'email')
      .populate('addedBy', 'email');

    res.json({
      success: true,
      message: `Candidate stage updated to ${stage}`,
      data: populated,
      history: stageHistory
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: 'Validation error', errors });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get candidate stage history
export const getCandidateStageHistory = async (req, res) => {
  try {
    const history = await CandidateStageHistory.find({ candidate: req.params.id })
      .populate('changedBy', 'email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get candidates by stage (for aging report)
export const getCandidatesByStage = async (req, res) => {
  try {
    const { stage, jobOpening } = req.query;
    const filter = {};

    if (stage) filter.stage = stage;
    if (jobOpening) filter.jobOpening = jobOpening;

    const candidates = await Candidate.find(filter)
      .populate('jobOpening', 'title')
      .populate('assignedRecruiter', 'email')
      .populate('addedBy', 'email')
      .sort({ updatedAt: 1 }); // Oldest first for aging

    // Calculate days in current stage
    const candidatesWithAging = await Promise.all(
      candidates.map(async (candidate) => {
        const lastStageChange = await CandidateStageHistory.findOne({
          candidate: candidate._id,
          toStage: candidate.stage
        }).sort({ createdAt: -1 });

        const daysInStage = lastStageChange
          ? Math.floor((new Date() - new Date(lastStageChange.createdAt)) / (1000 * 60 * 60 * 24))
          : Math.floor((new Date() - new Date(candidate.createdAt)) / (1000 * 60 * 60 * 24));

        return {
          ...candidate.toObject(),
          daysInStage
        };
      })
    );

    res.json({ success: true, data: candidatesWithAging });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Interview management functions
export const scheduleInterview = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const {
      round,
      scheduledDate,
      scheduledTime,
      mode,
      location,
      meetingLink,
      interviewers,
      notifyCandidate
    } = req.body;

    // Validate required fields
    if (!scheduledDate || !interviewers || !Array.isArray(interviewers) || interviewers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date and at least one interviewer are required'
      });
    }

    // Validate date is not in the past
    const interviewDate = new Date(scheduledDate);
    if (interviewDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Interview date cannot be in the past'
      });
    }

    const interview = {
      round: round || 'other',
      scheduledDate: interviewDate,
      scheduledTime: scheduledTime || '',
      mode: mode || 'in_person',
      location: location || '',
      meetingLink: meetingLink || '',
      interviewers: interviewers,
      scheduledBy: req.user._id,
      status: 'scheduled',
      candidateNotified: notifyCandidate || false
    };

    candidate.interviews.push(interview);
    await candidate.save();

    // TODO: Send interview invite to candidate (email/SMS)
    // TODO: Calendar sync (Google Calendar / Outlook)

    const populated = await Candidate.findById(candidate._id)
      .populate('interviews.interviewers', 'email')
      .populate('interviews.scheduledBy', 'email');

    const createdInterview = populated.interviews[populated.interviews.length - 1];

    res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully',
      data: createdInterview
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateInterview = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const { interviewId } = req.params;
    const interview = candidate.interviews.id(interviewId);
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Don't allow updating completed interviews
    if (interview.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a completed interview'
      });
    }

    const {
      scheduledDate,
      scheduledTime,
      mode,
      location,
      meetingLink,
      interviewers,
      notifyCandidate
    } = req.body;

    if (scheduledDate) {
      const newDate = new Date(scheduledDate);
      if (newDate < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Interview date cannot be in the past'
        });
      }
      interview.scheduledDate = newDate;
    }

    if (scheduledTime !== undefined) interview.scheduledTime = scheduledTime;
    if (mode) interview.mode = mode;
    if (location !== undefined) interview.location = location;
    if (meetingLink !== undefined) interview.meetingLink = meetingLink;
    if (interviewers && Array.isArray(interviewers)) interview.interviewers = interviewers;
    if (notifyCandidate !== undefined) interview.candidateNotified = notifyCandidate;

    interview.status = 'rescheduled';

    await candidate.save();

    // TODO: Send update notification to candidate

    const populated = await Candidate.findById(candidate._id)
      .populate('interviews.interviewers', 'email')
      .populate('interviews.scheduledBy', 'email');

    res.json({
      success: true,
      message: 'Interview updated successfully',
      data: populated.interviews.id(interviewId)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitInterviewFeedback = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const { interviewId } = req.params;
    const interview = candidate.interviews.id(interviewId);
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Check if user is an interviewer
    const isInterviewer = interview.interviewers.some(id => 
      id.toString() === req.user._id.toString()
    );

    if (!isInterviewer && req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({
        success: false,
        message: 'Only assigned interviewers, HR, or Admin can submit feedback'
      });
    }

    // Check if interview is scheduled or completed (allow updating feedback)
    if (interview.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot submit feedback for a cancelled interview'
      });
    }

    const {
      writtenComments,
      rating,
      technicalScore,
      communicationScore,
      cultureFitScore,
      recommendation
    } = req.body;

    // Validate recommendation is provided
    if (!recommendation || !['proceed', 'hold', 'reject'].includes(recommendation)) {
      return res.status(400).json({
        success: false,
        message: 'Recommendation (proceed/hold/reject) is required'
      });
    }

    // Update feedback
    interview.feedback.writtenComments = writtenComments || interview.feedback.writtenComments || '';
    if (rating !== undefined) interview.feedback.rating = rating;
    if (technicalScore !== undefined) interview.feedback.technicalScore = technicalScore;
    if (communicationScore !== undefined) interview.feedback.communicationScore = communicationScore;
    if (cultureFitScore !== undefined) interview.feedback.cultureFitScore = cultureFitScore;
    interview.feedback.recommendation = recommendation;
    interview.feedback.submittedBy = req.user._id;
    interview.feedback.submittedAt = new Date();

    // Mark interview as completed if feedback is submitted
    if (interview.status === 'scheduled' || interview.status === 'rescheduled') {
      interview.status = 'completed';
    }

    await candidate.save();

    const populated = await Candidate.findById(candidate._id)
      .populate('interviews.interviewers', 'email')
      .populate('interviews.scheduledBy', 'email')
      .populate('interviews.feedback.submittedBy', 'email');

    res.json({
      success: true,
      message: 'Interview feedback submitted successfully',
      data: populated.interviews.id(interviewId)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelInterview = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    const { interviewId } = req.params;
    const interview = candidate.interviews.id(interviewId);
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }

    // Don't allow cancelling completed interviews
    if (interview.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed interview'
      });
    }

    const { cancellationReason, notifyCandidate } = req.body;

    interview.status = 'cancelled';
    interview.cancelledBy = req.user._id;
    interview.cancellationReason = cancellationReason || '';
    interview.cancelledAt = new Date();

    if (notifyCandidate !== undefined) {
      interview.candidateNotified = notifyCandidate;
    }

    await candidate.save();

    // TODO: Send cancellation notification to candidate

    const populated = await Candidate.findById(candidate._id)
      .populate('interviews.interviewers', 'email')
      .populate('interviews.scheduledBy', 'email')
      .populate('interviews.cancelledBy', 'email');

    res.json({
      success: true,
      message: 'Interview cancelled successfully',
      data: populated.interviews.id(interviewId)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCandidateInterviews = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('interviews.interviewers', 'email')
      .populate('interviews.scheduledBy', 'email')
      .populate('interviews.feedback.submittedBy', 'email')
      .populate('interviews.cancelledBy', 'email');

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    res.json({ success: true, data: candidate.interviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
