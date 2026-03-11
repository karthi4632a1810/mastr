import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';

// Handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log validation errors for debugging
    console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Create employee validation
export const validateCreateEmployee = [
  // Personal Information
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('dateOfBirth')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Please provide a valid date'),
  
  body('gender')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  
  // Job Details
  body('department')
    .notEmpty()
    .withMessage('Department is required')
    .isMongoId()
    .withMessage('Invalid department ID'),
  
  body('designation')
    .notEmpty()
    .withMessage('Designation is required')
    .isMongoId()
    .withMessage('Invalid designation ID'),
  
  // Joining Details
  body('joiningDate')
    .notEmpty()
    .withMessage('Joining date is required')
    .isISO8601()
    .withMessage('Please provide a valid joining date'),
  
  // Organization Details (optional)
  body('branch')
    .optional()
    .custom((value) => {
      // Allow null/empty for optional fields, but if provided, must be valid
      if (value === null || value === '' || value === undefined) {
        return true;
      }
      return mongoose.Types.ObjectId.isValid(value);
    })
    .withMessage('Invalid branch ID'),
  
  body('shift')
    .optional()
    .custom((value) => {
      // Allow null/empty for optional fields, but if provided, must be valid
      if (value === null || value === '' || value === undefined) {
        return true;
      }
      return mongoose.Types.ObjectId.isValid(value);
    })
    .withMessage('Invalid shift ID'),
  
  body('salary')
    .optional()
    .custom((value) => {
      // Allow null/empty, but if provided, must be a valid number >= 0
      if (value === null || value === '' || value === undefined) {
        return true;
      }
      const numValue = Number(value);
      return !isNaN(numValue) && numValue >= 0;
    })
    .withMessage('Salary must be a positive number'),
  
  body('status')
    .optional()
    .isIn(['active', 'notice_period', 'inactive'])
    .withMessage('Status must be active, notice_period, or inactive'),
  
  // Address (optional)
  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Street address must be less than 200 characters'),
  
  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must be less than 100 characters'),
  
  body('address.state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State must be less than 100 characters'),
  
  body('address.zipCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Zip code must be less than 20 characters'),
  
  body('address.country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must be less than 100 characters'),
  
  // Emergency Contact (optional)
  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact name must be less than 100 characters'),
  
  body('emergencyContact.relation')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Relation must be less than 50 characters'),
  
  body('emergencyContact.phone')
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage('Please provide a valid emergency contact phone number'),
  
  handleValidationErrors
];

// Update employee validation
// Mandatory fields cannot be removed or set to empty, but can be updated
export const validateUpdateEmployee = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  
  body('email')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Email cannot be empty')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone number cannot be empty')
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('dateOfBirth')
    .optional()
    .notEmpty()
    .withMessage('Date of birth cannot be empty')
    .isISO8601()
    .withMessage('Please provide a valid date'),
  
  body('gender')
    .optional()
    .notEmpty()
    .withMessage('Gender cannot be empty')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  
  body('department')
    .optional()
    .notEmpty()
    .withMessage('Department cannot be empty')
    .isMongoId()
    .withMessage('Invalid department ID'),
  
  body('designation')
    .optional()
    .notEmpty()
    .withMessage('Designation cannot be empty')
    .isMongoId()
    .withMessage('Invalid designation ID'),
  
  body('joiningDate')
    .optional()
    .notEmpty()
    .withMessage('Joining date cannot be empty')
    .isISO8601()
    .withMessage('Please provide a valid joining date'),
  
  body('branch')
    .optional()
    .custom((value) => {
      // Allow null/empty for optional fields, but if provided, must be valid
      if (value === null || value === '' || value === undefined) {
        return true;
      }
      return mongoose.Types.ObjectId.isValid(value);
    })
    .withMessage('Invalid branch ID'),
  
  body('shift')
    .optional()
    .custom((value) => {
      // Allow null/empty for optional fields, but if provided, must be valid
      if (value === null || value === '' || value === undefined) {
        return true;
      }
      return mongoose.Types.ObjectId.isValid(value);
    })
    .withMessage('Invalid shift ID'),
  
  body('salary')
    .optional()
    .custom((value) => {
      // Allow null/empty, but if provided, must be a valid number >= 0
      if (value === null || value === '' || value === undefined) {
        return true;
      }
      const numValue = Number(value);
      return !isNaN(numValue) && numValue >= 0;
    })
    .withMessage('Salary must be a positive number'),
  
  body('status')
    .optional()
    .isIn(['active', 'notice_period', 'inactive'])
    .withMessage('Status must be active, notice_period, or inactive'),
  
  handleValidationErrors
];

