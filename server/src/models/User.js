// This model defines volunteer, organization, and admin accounts.
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    // Basic details used by every account type.
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false hides the password hash from normal database queries.
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ['volunteer', 'organisation', 'admin'], default: 'volunteer' },
    // Profile details used for display and volunteer matching.
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 500 },
    location: { type: String, default: '' },
    province: { type: String, enum: ['', 'Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'], default: '' },
    district: { type: String, default: '' },
    phone: { type: String, default: '' },
    interests: [{ type: String, trim: true }],
    skills: [{ type: String, trim: true }],
    // These fields are mainly used by organization accounts.
    organisationName: { type: String, trim: true, default: '' },
    organisationType: { type: String, enum: ['', 'NGO', 'Non-profit', 'Community group', 'Youth club', 'School or college', 'Social enterprise', 'Government or local body', 'Other'], default: '' },
    registrationNumber: { type: String, trim: true, default: '' },
    website: { type: String, trim: true, default: '' },
    // Hidden two-factor fields store hashes, expiry times, and attempt counts.
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorCodeHash: { type: String, select: false },
    twoFactorCodeExpiresAt: { type: Date, select: false },
    twoFactorCodeAttempts: { type: Number, default: 0, select: false },
    twoFactorCodeLastSentAt: { type: Date, select: false },
    twoFactorPurpose: { type: String, enum: ['enable', 'login'], select: false },
    twoFactorChallengeHash: { type: String, select: false },
    twoFactorChallengeExpiresAt: { type: Date, select: false },
    // Hidden reset fields support the OTP and new-password process.
    passwordResetOtpHash: { type: String, select: false },
    passwordResetOtpExpiresAt: { type: Date, select: false },
    passwordResetOtpAttempts: { type: Number, default: 0, select: false },
    passwordResetOtpSentAt: { type: Date, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetTokenExpiresAt: { type: Date, select: false },
    // Admins use these fields to verify or suspend accounts.
    verified: { type: Boolean, default: false },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Before saving, replace the plain password with a secure bcrypt hash.
// This means the real password is never stored in MongoDB.
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// During login, compare the entered password with the saved hash.
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

export default mongoose.model('User', userSchema);
