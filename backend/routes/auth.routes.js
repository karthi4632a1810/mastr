import express from 'express';
import {
  register,
  login,
  refreshToken,
  forgotPassword,
  verifyOTP,
  resetPassword,
  logout,
  getCurrentUser
} from '../controllers/auth.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  validateLogin,
  validateRegister,
  validateForgotPassword,
  validateVerifyOTP,
  validateResetPassword,
  validateRefreshToken
} from '../middleware/validation.middleware.js';

const router = express.Router();

router.post('/register', authenticate, authorize('admin', 'hr'), validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/refresh-token', validateRefreshToken, refreshToken);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.post('/verify-otp', validateVerifyOTP, verifyOTP);
router.post('/reset-password', validateResetPassword, resetPassword);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getCurrentUser);

export default router;
