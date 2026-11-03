// This file provides admin statistics and management actions.
import express from 'express';
import User from '../models/User.js';
import Opportunity from '../models/Opportunity.js';
import Application from '../models/Application.js';
import { allow, protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect, allow('admin'));

// Count the main records used on the admin analytics page.
router.get('/stats', async (req, res) => {
  const [users, volunteers, organisations, opportunities, applications, hours] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'volunteer' }),
    User.countDocuments({ role: 'organisation' }),
    Opportunity.countDocuments(),
    Application.countDocuments(),
    Application.aggregate([{ $match: { attendance: 'present' } }, { $group: { _id: null, total: { $sum: '$hours' } } }])
  ]);
  res.json({ users, volunteers, organisations, opportunities, applications, hours: hours[0]?.total || 0 });
});

// Return accounts and opportunities for admin management.
router.get('/users', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).limit(100);
  res.json({ users });
});

// Let an admin activate, deactivate, or verify an account.
router.patch('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  if (typeof req.body.active === 'boolean') user.active = req.body.active;
  if (typeof req.body.verified === 'boolean' && user.role === 'organisation') user.verified = req.body.verified;
  await user.save();
  res.json({ user });
});

export default router;
