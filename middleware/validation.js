const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('role')
    .optional()
    .isIn(['super_admin', 'hotel_admin', 'manager', 'receptionist', 'housekeeping', 'maintenance'])
    .withMessage('Invalid role'),
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Hotel validation rules
const validateHotel = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Hotel name must be between 2 and 100 characters'),
  body('address.street')
    .notEmpty()
    .withMessage('Street address is required'),
  body('address.city')
    .notEmpty()
    .withMessage('City is required'),
  body('address.country')
    .notEmpty()
    .withMessage('Country is required'),
  body('phone')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('starRating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Star rating must be between 1 and 5'),
  handleValidationErrors
];

// Room validation rules
const validateRoom = [
  body('roomNumber')
    .trim()
    .notEmpty()
    .withMessage('Room number is required'),
  body('floor')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Floor must be a non-negative integer'),
  body('status')
    .optional()
    .isIn(['available', 'occupied', 'maintenance', 'cleaning', 'out_of_order'])
    .withMessage('Invalid room status'),
  body('roomTypeId')
    .isUUID()
    .withMessage('Valid room type ID is required'),
  handleValidationErrors
];

// Booking validation rules
const validateBooking = [
  body('checkInDate')
    .isISO8601()
    .toDate()
    .withMessage('Valid check-in date is required'),
  body('checkOutDate')
    .isISO8601()
    .toDate()
    .withMessage('Valid check-out date is required'),
  body('adults')
    .isInt({ min: 1 })
    .withMessage('At least 1 adult is required'),
  body('children')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Children count must be non-negative'),
  body('guestId')
    .isUUID()
    .withMessage('Valid guest ID is required'),
  body('totalAmount')
    .isFloat({ min: 0 })
    .withMessage('Total amount must be non-negative'),
  handleValidationErrors
];

// Guest validation rules
const validateGuest = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Please provide a valid date of birth'),
  handleValidationErrors
];

// Payment validation rules
const validatePayment = [
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be non-negative'),
  body('method')
    .isIn(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stripe', 'other'])
    .withMessage('Invalid payment method'),
  body('bookingId')
    .isUUID()
    .withMessage('Valid booking ID is required'),
  handleValidationErrors
];

// Housekeeping validation rules
const validateHousekeepingTask = [
  body('type')
    .isIn(['cleaning', 'maintenance', 'inspection', 'deep_clean', 'checkout_clean', 'checkin_prep'])
    .withMessage('Invalid task type'),
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  body('roomId')
    .isUUID()
    .withMessage('Valid room ID is required'),
  handleValidationErrors
];

// Parameter validation
const validateUUID = (paramName) => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateHotel,
  validateRoom,
  validateBooking,
  validateGuest,
  validatePayment,
  validateHousekeepingTask,
  validateUUID
};