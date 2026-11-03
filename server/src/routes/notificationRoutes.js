// This file handles reading and updating notifications.
import express from 'express';
import Notification from '../models/Notification.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);
// Hide old onboarding notices while keeping normal notifications.
const visibleNotifications = (userId) => ({ recipient: userId, type: { $ne: 'onboarding' } });

// Return the user's notifications and unread total.
router.get('/', async (req, res) => {
  const requestedLimit = Number(req.query.limit || 30);
  const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 30;
  const [notifications, unreadCount] = await Promise.all([
    Notification.find(visibleNotifications(req.user._id)).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ ...visibleNotifications(req.user._id), read: false })
  ]);
  res.json({ notifications, unreadCount });
});

// Mark every visible notification as read.
router.patch('/read-all', async (req, res) => {
  const result = await Notification.updateMany(
    { ...visibleNotifications(req.user._id), read: false },
    { $set: { read: true, readAt: new Date() } }
  );
  res.json({ updated: result.modifiedCount });
});

// Mark one notification as read.
router.patch('/:id/read', async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, ...visibleNotifications(req.user._id) },
    { $set: { read: true, readAt: new Date() } },
    { new: true }
  );
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  res.json({ notification });
});

export default router;
