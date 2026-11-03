// This file handles registration, login, password recovery, and account security.
import express from 'express';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { createToken } from '../utils/token.js';
import { isValidProvinceDistrict } from '../utils/nepalLocations.js';
import { sendPasswordResetOtpEmail, sendTwoFactorOtpEmail } from '../utils/email.js';

const router = express.Router();
const organisationTypes = ['NGO', 'Non-profit', 'Community group', 'Youth club', 'School or college', 'Social enterprise', 'Government or local body', 'Other'];
const PASSWORD_RESET_RESPONSE = 'If an account exists with this email, a password reset code has been sent.';
const PASSWORD_RESET_INVALID = 'The code is invalid or has expired. Request a new code and try again.';
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const RESET_TOKEN_EXPIRY_MS = 10 * 60 * 1000;
const TWO_FACTOR_EXPIRY_MS = 5 * 60 * 1000;
const TWO_FACTOR_RESEND_COOLDOWN_MS = 60 * 1000;
const TWO_FACTOR_MAX_ATTEMPTS = 5;

const passwordResetRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ message: PASSWORD_RESET_RESPONSE })
});

const passwordResetActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many password reset attempts. Please wait and try again.' }
});

const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many two-factor authentication attempts. Please wait and try again.' }
});

// Store emails in one format so the same email cannot create two accounts.
function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

// Store a one-way hash instead of the real password reset token.
function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

// Check whether the submitted reset token matches the saved hash.
function resetTokensMatch(storedHash, candidateToken) {
  if (!storedHash || !candidateToken) return false;
  const stored = Buffer.from(storedHash, 'hex');
  const candidate = Buffer.from(hashResetToken(candidateToken), 'hex');
  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
}

// Remove an OTP after it expires or is used.
function clearOtp(user) {
  user.passwordResetOtpHash = undefined;
  user.passwordResetOtpExpiresAt = undefined;
  user.passwordResetOtpAttempts = undefined;
  user.passwordResetOtpSentAt = undefined;
}

// Remove a password reset token after the password is changed.
function clearResetToken(user) {
  user.passwordResetTokenHash = undefined;
  user.passwordResetTokenExpiresAt = undefined;
}


// Hide part of the email before showing it on the screen.
function maskEmail(email) {
  const [localPart, domain = ''] = String(email || '').split('@');
  if (!localPart || !domain) return 'your registered email';
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return visible + '*'.repeat(Math.max(3, localPart.length - visible.length)) + '@' + domain;
}

// Remove old two-factor codes and challenge details.
function clearTwoFactorState(user) {
  user.twoFactorCodeHash = undefined;
  user.twoFactorCodeExpiresAt = undefined;
  user.twoFactorCodeAttempts = undefined;
  user.twoFactorCodeLastSentAt = undefined;
  user.twoFactorPurpose = undefined;
  user.twoFactorChallengeHash = undefined;
  user.twoFactorChallengeExpiresAt = undefined;
}

// Create, hash, save, and email a six-digit two-factor code.
async function issueTwoFactorCode(user, purpose, existingChallengeToken = '') {
  // randomInt creates a different six-digit code for each request.
  const otp = String(randomInt(100000, 1000000));
  const now = Date.now();
  // A challenge token links the OTP screen to the correct login attempt.
  const challengeToken = purpose === 'login'
    ? existingChallengeToken || randomBytes(32).toString('hex')
    : '';

  // Save only the OTP hash. The plain OTP exists only long enough to email it.
  user.twoFactorCodeHash = await bcrypt.hash(otp, 12);
  user.twoFactorCodeExpiresAt = new Date(now + TWO_FACTOR_EXPIRY_MS);
  user.twoFactorCodeAttempts = 0;
  user.twoFactorCodeLastSentAt = new Date(now);
  user.twoFactorPurpose = purpose;

  if (purpose === 'login') {
    user.twoFactorChallengeHash = hashResetToken(challengeToken);
    user.twoFactorChallengeExpiresAt = new Date(now + TWO_FACTOR_EXPIRY_MS);
  } else {
    user.twoFactorChallengeHash = undefined;
    user.twoFactorChallengeExpiresAt = undefined;
  }

  // Save the security information before sending the email.
  await user.save({ validateModifiedOnly: true });

  try {
    await sendTwoFactorOtpEmail({ to: user.email, otp, purpose });
  } catch (error) {
    // Remove the code if email delivery fails so an unusable code is not left active.
    clearTwoFactorState(user);
    await user.save({ validateModifiedOnly: true });
    throw error;
  }

  return { challengeToken, maskedEmail: maskEmail(user.email) };
}

// Return only account details that are safe for the frontend.
function safeUser(user) {
  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    bio: user.bio,
    location: user.location,
    province: user.province,
    district: user.district,
    phone: user.phone,
    interests: user.interests,
    skills: user.skills,
    organisationName: user.organisationName,
    organisationType: user.organisationType,
    registrationNumber: user.registrationNumber,
    website: user.website,
    verified: user.verified,
    avatar: user.avatar,
    twoFactorEnabled: Boolean(user.twoFactorEnabled)
  };
}

// Validate registration details and create a new account.
router.post('/register', async (req, res) => {
  // Convert form values into clean strings and arrays before validation.
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');
  const role = req.body.role || 'volunteer';
  const organisationName = String(req.body.organisationName || '').trim();
  const organisationType = String(req.body.organisationType || '').trim();
  const province = String(req.body.province || '').trim();
  const district = String(req.body.district || '').trim();
  const location = String(req.body.location || '').trim();
  const phone = String(req.body.phone || '').trim();
  const bio = String(req.body.bio || '').trim();
  const registrationNumber = String(req.body.registrationNumber || '').trim();
  const website = String(req.body.website || '').trim();
  const interests = Array.isArray(req.body.interests) ? req.body.interests.map((item) => String(item).trim()).filter(Boolean) : [];
  const skills = Array.isArray(req.body.skills) ? req.body.skills.map((item) => String(item).trim()).filter(Boolean) : [];
  // Stop early and return a clear message when any required value is invalid.
  if (!name || !email || !password || !confirmPassword) return res.status(400).json({ message: 'Name, email, password, and password confirmation are required.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });
  if (!['volunteer', 'organisation'].includes(role)) return res.status(400).json({ message: 'Please select a valid account type.' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match.' });
  if (!province || !district || !location) return res.status(400).json({ message: 'Province, district, and municipality or local area are required.' });
  if (!isValidProvinceDistrict(province, district)) return res.status(400).json({ message: 'The selected district does not belong to that province.' });
  // Each role needs different profile details for matching and management.
  if (role === 'volunteer' && (!interests.length || !skills.length)) return res.status(400).json({ message: 'Add at least one interest and one skill to improve opportunity matching.' });
  if (role === 'organisation' && (!organisationName || !organisationType || !phone || !bio || !interests.length)) return res.status(400).json({ message: 'Organisation name, type, phone, description, and at least one focus area are required.' });
  if (role === 'organisation' && !organisationTypes.includes(organisationType)) return res.status(400).json({ message: 'Please select a valid organisation type.' });
  if (website) {
    try {
      const parsedWebsite = new URL(website);
      if (!['http:', 'https:'].includes(parsedWebsite.protocol)) throw new Error('Invalid protocol');
    } catch {
      return res.status(400).json({ message: 'Please enter a valid website URL beginning with http:// or https://.' });
    }
  }
  // Check MongoDB before creating the account to avoid duplicate emails.
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: 'An account with this email already exists.' });
  // User.create runs the model's pre-save hook, which hashes the password.
  const user = await User.create({ name, email, password, role, organisationName, organisationType, province, district, location, phone, bio, interests, skills, registrationNumber, website });
  res.status(201).json({ token: createToken(user._id), user: safeUser(user) });
});

// Check the email and password, then return a login token.
router.post('/login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  // Password is hidden by default, so +password requests its hash for login checking.
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(String(req.body.password || '')))) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }
  if (!user.active) return res.status(403).json({ message: 'This account has been deactivated.' });

  // Accounts without 2FA can receive their login token immediately.
  if (!user.twoFactorEnabled) {
    return res.json({ token: createToken(user._id), user: safeUser(user) });
  }

  // Accounts with 2FA must verify the emailed OTP before receiving a login token.
  try {
    const challenge = await issueTwoFactorCode(user, 'login');
    return res.status(202).json({
      requiresTwoFactor: true,
      challengeToken: challenge.challengeToken,
      maskedEmail: challenge.maskedEmail,
      message: 'Enter the verification code sent to your registered email address.'
    });
  } catch (error) {
    console.error('2FA email delivery failed:', error.message);
    return res.status(503).json({ message: 'We could not send the verification code. Check the email configuration and try again.' });
  }
});

// Verify the login OTP before completing a two-factor login.
router.post('/2fa/login/verify', twoFactorLimiter, async (req, res) => {
  const challengeToken = String(req.body.challengeToken || '');
  const otp = String(req.body.otp || '').replace(/\s/g, '');
  if (!/^[a-f0-9]{64}$/i.test(challengeToken) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: 'The verification code or session is invalid.' });
  }

  // Find the account connected to this temporary login challenge.
  const user = await User.findOne({
    twoFactorChallengeHash: hashResetToken(challengeToken),
    twoFactorPurpose: 'login'
  }).select('+twoFactorCodeHash +twoFactorCodeExpiresAt +twoFactorCodeAttempts +twoFactorCodeLastSentAt +twoFactorPurpose +twoFactorChallengeHash +twoFactorChallengeExpiresAt');

  if (!user || !user.active || !user.twoFactorEnabled) {
    return res.status(400).json({ message: 'The verification session is invalid or has expired. Sign in again.' });
  }

  // Reject and remove codes that have passed their expiry time.
  const now = Date.now();
  if (!user.twoFactorCodeHash || !user.twoFactorCodeExpiresAt || !user.twoFactorChallengeExpiresAt
    || user.twoFactorCodeExpiresAt.getTime() <= now || user.twoFactorChallengeExpiresAt.getTime() <= now) {
    clearTwoFactorState(user);
    await user.save({ validateModifiedOnly: true });
    return res.status(400).json({ message: 'The verification code has expired. Sign in again to request a new code.' });
  }

  // bcrypt checks the entered OTP against the saved OTP hash.
  const matches = await bcrypt.compare(otp, user.twoFactorCodeHash);
  if (!matches) {
    // Count wrong attempts and remove the code after five failures.
    user.twoFactorCodeAttempts = Number(user.twoFactorCodeAttempts || 0) + 1;
    if (user.twoFactorCodeAttempts >= TWO_FACTOR_MAX_ATTEMPTS) {
      clearTwoFactorState(user);
      await user.save({ validateModifiedOnly: true });
      return res.status(400).json({ message: 'Too many incorrect codes. Sign in again to request a new code.' });
    }

    const remaining = TWO_FACTOR_MAX_ATTEMPTS - user.twoFactorCodeAttempts;
    await user.save({ validateModifiedOnly: true });
    return res.status(400).json({ message: 'Incorrect verification code. ' + remaining + ' attempt(s) remaining.' });
  }

  // A correct OTP can be used only once, so remove it before completing login.
  clearTwoFactorState(user);
  await user.save({ validateModifiedOnly: true });
  return res.json({ token: createToken(user._id), user: safeUser(user) });
});

// Send a new login OTP after the resend delay.
router.post('/2fa/login/resend', twoFactorLimiter, async (req, res) => {
  const challengeToken = String(req.body.challengeToken || '');
  if (!/^[a-f0-9]{64}$/i.test(challengeToken)) {
    return res.status(400).json({ message: 'The verification session is invalid or has expired. Sign in again.' });
  }

  const user = await User.findOne({
    twoFactorChallengeHash: hashResetToken(challengeToken),
    twoFactorPurpose: 'login'
  }).select('+twoFactorCodeHash +twoFactorCodeExpiresAt +twoFactorCodeAttempts +twoFactorCodeLastSentAt +twoFactorPurpose +twoFactorChallengeHash +twoFactorChallengeExpiresAt');

  const now = Date.now();
  if (!user || !user.active || !user.twoFactorEnabled || !user.twoFactorChallengeExpiresAt
    || user.twoFactorChallengeExpiresAt.getTime() <= now) {
    return res.status(400).json({ message: 'The verification session is invalid or has expired. Sign in again.' });
  }

  if (user.twoFactorCodeLastSentAt && now - user.twoFactorCodeLastSentAt.getTime() < TWO_FACTOR_RESEND_COOLDOWN_MS) {
    const retryAfter = Math.ceil((TWO_FACTOR_RESEND_COOLDOWN_MS - (now - user.twoFactorCodeLastSentAt.getTime())) / 1000);
    return res.status(429).json({ message: 'Please wait before requesting another code.', retryAfter });
  }

  try {
    const challenge = await issueTwoFactorCode(user, 'login', challengeToken);
    return res.json({ message: 'A new verification code has been sent.', maskedEmail: challenge.maskedEmail });
  } catch (error) {
    console.error('2FA resend email delivery failed:', error.message);
    return res.status(503).json({ message: 'We could not send the verification code. Check the email configuration and try again.' });
  }
});

// Start the process of enabling two-factor authentication.
router.post('/2fa/enable/request', protect, twoFactorLimiter, async (req, res) => {
  const user = await User.findById(req.user._id).select(
    '+twoFactorCodeHash +twoFactorCodeExpiresAt +twoFactorCodeAttempts +twoFactorCodeLastSentAt +twoFactorPurpose +twoFactorChallengeHash +twoFactorChallengeExpiresAt'
  );
  if (!user || !user.active) return res.status(401).json({ message: 'Account is unavailable.' });
  if (user.twoFactorEnabled) return res.status(409).json({ message: 'Two-factor authentication is already enabled.' });

  const now = Date.now();
  if (user.twoFactorCodeLastSentAt && user.twoFactorPurpose === 'enable'
    && now - user.twoFactorCodeLastSentAt.getTime() < TWO_FACTOR_RESEND_COOLDOWN_MS) {
    const retryAfter = Math.ceil((TWO_FACTOR_RESEND_COOLDOWN_MS - (now - user.twoFactorCodeLastSentAt.getTime())) / 1000);
    return res.status(429).json({ message: 'Please wait before requesting another code.', retryAfter });
  }

  try {
    const challenge = await issueTwoFactorCode(user, 'enable');
    return res.json({
      message: 'A verification code has been sent to your registered email address.',
      maskedEmail: challenge.maskedEmail
    });
  } catch (error) {
    console.error('2FA enable email delivery failed:', error.message);
    return res.status(503).json({ message: 'We could not send the verification code. Check the email configuration and try again.' });
  }
});

// Enable two-factor authentication after the OTP is correct.
router.post('/2fa/enable/verify', protect, twoFactorLimiter, async (req, res) => {
  const otp = String(req.body.otp || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(otp)) return res.status(400).json({ message: 'Enter the six-digit verification code.' });

  const user = await User.findById(req.user._id).select(
    '+twoFactorCodeHash +twoFactorCodeExpiresAt +twoFactorCodeAttempts +twoFactorCodeLastSentAt +twoFactorPurpose +twoFactorChallengeHash +twoFactorChallengeExpiresAt'
  );
  const now = Date.now();

  if (!user || user.twoFactorEnabled || user.twoFactorPurpose !== 'enable'
    || !user.twoFactorCodeHash || !user.twoFactorCodeExpiresAt) {
    return res.status(400).json({ message: 'The verification code is invalid or has expired. Request a new code.' });
  }

  if (user.twoFactorCodeExpiresAt.getTime() <= now) {
    clearTwoFactorState(user);
    await user.save({ validateModifiedOnly: true });
    return res.status(400).json({ message: 'The verification code has expired. Request a new code.' });
  }

  const matches = await bcrypt.compare(otp, user.twoFactorCodeHash);
  if (!matches) {
    user.twoFactorCodeAttempts = Number(user.twoFactorCodeAttempts || 0) + 1;
    if (user.twoFactorCodeAttempts >= TWO_FACTOR_MAX_ATTEMPTS) {
      clearTwoFactorState(user);
      await user.save({ validateModifiedOnly: true });
      return res.status(400).json({ message: 'Too many incorrect codes. Request a new code.' });
    }

    const remaining = TWO_FACTOR_MAX_ATTEMPTS - user.twoFactorCodeAttempts;
    await user.save({ validateModifiedOnly: true });
    return res.status(400).json({ message: 'Incorrect verification code. ' + remaining + ' attempt(s) remaining.' });
  }

  user.twoFactorEnabled = true;
  clearTwoFactorState(user);
  await user.save({ validateModifiedOnly: true });
  return res.json({
    message: 'Two-factor authentication has been enabled successfully.',
    user: safeUser(user)
  });
});

// Check the password before turning two-factor authentication off.
router.post('/2fa/disable', protect, twoFactorLimiter, async (req, res) => {
  const currentPassword = String(req.body.currentPassword || '');
  if (!currentPassword) return res.status(400).json({ message: 'Enter your current password.' });

  const user = await User.findById(req.user._id).select(
    '+password +twoFactorCodeHash +twoFactorCodeExpiresAt +twoFactorCodeAttempts +twoFactorCodeLastSentAt +twoFactorPurpose +twoFactorChallengeHash +twoFactorChallengeExpiresAt'
  );
  if (!user || !(await user.comparePassword(currentPassword))) {
    return res.status(401).json({ message: 'The current password is incorrect.' });
  }

  user.twoFactorEnabled = false;
  clearTwoFactorState(user);
  await user.save({ validateModifiedOnly: true });
  return res.json({
    message: 'Two-factor authentication has been disabled.',
    user: safeUser(user)
  });
});

// Email a password reset OTP without revealing whether the account exists.
router.post('/forgot-password', passwordResetRequestLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.json({ message: PASSWORD_RESET_RESPONSE });
  }

  // Create the OTP, but store only its bcrypt hash in MongoDB.
  const otp = String(randomInt(100000, 1000000));
  const otpHash = await bcrypt.hash(otp, 12);
  const user = await User.findOne({ email }).select(
    '+passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetOtpAttempts +passwordResetOtpSentAt +passwordResetTokenHash +passwordResetTokenExpiresAt'
  );

  // Use the same response for missing emails so account addresses stay private.
  if (!user) return res.json({ message: PASSWORD_RESET_RESPONSE });

  const now = Date.now();
  if (user.passwordResetOtpSentAt && now - user.passwordResetOtpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
    return res.json({ message: PASSWORD_RESET_RESPONSE });
  }

  // Save the OTP expiry, attempt count, and resend time with the hash.
  user.passwordResetOtpHash = otpHash;
  user.passwordResetOtpExpiresAt = new Date(now + OTP_EXPIRY_MS);
  user.passwordResetOtpAttempts = 0;
  user.passwordResetOtpSentAt = new Date(now);
  clearResetToken(user);
  await user.save({ validateModifiedOnly: true });

  try {
    await sendPasswordResetOtpEmail({ to: user.email, otp });
  } catch (error) {
    // Delete the saved OTP if the email could not be sent.
    await User.updateOne(
      { _id: user._id, passwordResetOtpHash: otpHash },
      {
        $unset: {
          passwordResetOtpHash: '',
          passwordResetOtpExpiresAt: '',
          passwordResetOtpAttempts: '',
          passwordResetOtpSentAt: ''
        }
      }
    );
    console.error('Password reset email delivery failed:', error.message);
  }

  return res.json({ message: PASSWORD_RESET_RESPONSE });
});

// Verify the OTP and return a short-lived password reset token.
router.post('/forgot-password/verify', passwordResetActionLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || '').replace(/\s/g, '');
  if (!/^\S+@\S+\.\S+$/.test(email) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: PASSWORD_RESET_INVALID });
  }

  // Load hidden reset fields because normal queries do not return them.
  const user = await User.findOne({ email }).select(
    '+passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetOtpAttempts +passwordResetOtpSentAt +passwordResetTokenHash +passwordResetTokenExpiresAt'
  );
  const now = Date.now();

  if (!user || !user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt || Number(user.passwordResetOtpAttempts || 0) >= OTP_MAX_ATTEMPTS) {
    return res.status(400).json({ message: PASSWORD_RESET_INVALID });
  }

  if (user.passwordResetOtpExpiresAt.getTime() <= now) {
    clearOtp(user);
    await user.save({ validateModifiedOnly: true });
    return res.status(400).json({ message: PASSWORD_RESET_INVALID });
  }

  // Compare the submitted OTP with the hash stored in MongoDB.
  const matches = await bcrypt.compare(otp, user.passwordResetOtpHash);
  if (!matches) {
    user.passwordResetOtpAttempts = Number(user.passwordResetOtpAttempts || 0) + 1;
    if (user.passwordResetOtpAttempts >= OTP_MAX_ATTEMPTS) {
      user.passwordResetOtpHash = undefined;
      user.passwordResetOtpExpiresAt = undefined;
    }
    await user.save({ validateModifiedOnly: true });
    return res.status(400).json({ message: PASSWORD_RESET_INVALID });
  }

  // Replace the used OTP with a short-lived reset token for the final form.
  const resetToken = randomBytes(32).toString('hex');
  clearOtp(user);
  user.passwordResetTokenHash = hashResetToken(resetToken);
  user.passwordResetTokenExpiresAt = new Date(now + RESET_TOKEN_EXPIRY_MS);
  await user.save({ validateModifiedOnly: true });

  return res.json({ message: 'Code verified. You can now choose a new password.', resetToken });
});

// Save the new password after the reset token is verified.
router.post('/forgot-password/reset', passwordResetActionLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const resetToken = String(req.body.resetToken || '');
  const password = String(req.body.password || '');
  const confirmPassword = String(req.body.confirmPassword || '');

  if (!email || !resetToken) return res.status(400).json({ message: 'Your password reset session is invalid or has expired.' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match.' });

  const user = await User.findOne({ email }).select('+passwordResetTokenHash +passwordResetTokenExpiresAt');
  const validToken = user
    && user.passwordResetTokenExpiresAt
    && user.passwordResetTokenExpiresAt.getTime() > Date.now()
    && resetTokensMatch(user.passwordResetTokenHash, resetToken);

  if (!validToken) return res.status(400).json({ message: 'Your password reset session is invalid or has expired.' });

  // Assign the new password. The User model hashes it automatically on save.
  user.password = password;
  user.markModified('password');
  clearOtp(user);
  clearResetToken(user);
  await user.save({ validateModifiedOnly: true });

  return res.json({ message: 'Password reset successfully. You can now sign in.' });
});

// Return the account linked to the current login token.
router.get('/me', protect, async (req, res) => res.json({ user: safeUser(req.user) }));

// Update only the profile fields that users are allowed to change.
router.patch('/profile', protect, async (req, res) => {
  const allowed = ['name', 'bio', 'location', 'province', 'district', 'phone', 'interests', 'skills', 'organisationName', 'organisationType', 'registrationNumber', 'website', 'avatar'];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) req.user[field] = req.body[field];
  });
  if ((req.body.province !== undefined || req.body.district !== undefined) && !isValidProvinceDistrict(req.user.province, req.user.district)) return res.status(400).json({ message: 'The selected district does not belong to that province.' });
  await req.user.save();
  res.json({ user: safeUser(req.user) });
});

export default router;
