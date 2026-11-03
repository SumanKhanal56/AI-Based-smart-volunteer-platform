// This file handles volunteer applications, decisions, attendance, and hours.
import express from 'express';
import Application from '../models/Application.js';
import Opportunity from '../models/Opportunity.js';
import { allow, protect } from '../middleware/auth.js';
import { createNotification, createNotifications } from '../utils/notifications.js';

const router = express.Router();

// Create one application and notify the organization.
router.post('/:opportunityId', protect, allow('volunteer'), async (req, res) => {
  // Find only a published opportunity that volunteers can currently apply for.
  const opportunity = await Opportunity.findOne({ _id: req.params.opportunityId, status: 'published' });
  if (!opportunity) return res.status(404).json({ message: 'This opportunity is not available.' });
  if (opportunity.deadline && opportunity.deadline < new Date()) return res.status(400).json({ message: 'The application deadline has passed.' });
  // Save the volunteer, opportunity, and optional application message.
  const application = await Application.create({ opportunity: opportunity._id, volunteer: req.user._id, message: req.body.message || '' });
  // Notify both sides so the application can be reviewed and tracked.
  await createNotifications([
    {
      recipient: opportunity.organisation,
      type: 'application',
      title: 'New volunteer application',
      message: `${req.user.name} applied for ${opportunity.title}.`,
      nextSteps: [{ title: 'Review application', detail: 'Open your applications dashboard to review the volunteer.', to: '/dashboard/applications' }]
    },
    {
      recipient: req.user._id,
      type: 'application',
      title: 'Application submitted',
      message: `Your application for ${opportunity.title} was submitted successfully.`,
      nextSteps: [{ title: 'Track application', detail: 'View the latest status from your dashboard.', to: '/dashboard/applications' }]
    }
  ]);
  res.status(201).json({ application });
});

// Return applications submitted by the logged-in volunteer.
router.get('/mine/list', protect, allow('volunteer'), async (req, res) => {
  const applications = await Application.find({ volunteer: req.user._id })
    .populate({ path: 'opportunity', populate: { path: 'organisation', select: 'name organisationName' } })
    .sort({ createdAt: -1 });
  res.json({ applications });
});

// Return applications that an organization is allowed to manage.
router.get('/manage/list', protect, allow('organisation', 'admin'), async (req, res) => {
  const opportunityFilter = req.user.role === 'admin' ? {} : { organisation: req.user._id };
  const ids = await Opportunity.find(opportunityFilter).distinct('_id');
  const applications = await Application.find({ opportunity: { $in: ids } })
    .populate('volunteer', 'name email location skills')
    .populate('opportunity', 'title date location')
    .sort({ createdAt: -1 });
  res.json({ applications });
});

// Find an application and confirm that the user manages its opportunity.
async function managedApplication(id, user) {
  // Populate the opportunity so ownership can be checked before editing.
  const application = await Application.findById(id).populate('opportunity');
  if (!application) return { error: [404, 'Application not found.'] };
  if (user.role !== 'admin' && application.opportunity.organisation.toString() !== user._id.toString()) return { error: [403, 'You cannot manage this application.'] };
  return { application };
}

// Accept or decline an application and notify the volunteer.
router.patch('/:id/status', protect, allow('organisation', 'admin'), async (req, res) => {
  if (!['accepted', 'declined', 'pending'].includes(req.body.status)) return res.status(400).json({ message: 'Invalid application status.' });
  const managed = await managedApplication(req.params.id, req.user);
  if (managed.error) return res.status(managed.error[0]).json({ message: managed.error[1] });
  if (req.body.status === 'accepted' && managed.application.status !== 'accepted') {
    // Count accepted volunteers before allowing another acceptance.
    const accepted = await Application.countDocuments({ opportunity: managed.application.opportunity._id, status: 'accepted' });
    if (accepted >= managed.application.opportunity.capacity) return res.status(409).json({ message: 'This opportunity has reached its volunteer capacity.' });
  }
  // Remember the old value to avoid sending duplicate notifications.
  const previousStatus = managed.application.status;
  managed.application.status = req.body.status;
  await managed.application.save();
  if (previousStatus !== managed.application.status) {
    // Notify the volunteer only when the status actually changes.
    const statusText = managed.application.status === 'accepted'
      ? 'accepted'
      : managed.application.status === 'declined' ? 'not selected' : 'returned to pending review';
    await createNotification({
      recipient: managed.application.volunteer,
      type: 'status',
      title: 'Application status updated',
      message: `Your application for ${managed.application.opportunity.title} was ${statusText}.`,
      nextSteps: [{ title: 'View application', detail: 'Open your applications dashboard for the current status.', to: '/dashboard/applications' }]
    });
  }
  res.json({ application: managed.application });
});

// Record attendance and verified volunteer hours.
router.patch('/:id/attendance', protect, allow('organisation', 'admin'), async (req, res) => {
  const managed = await managedApplication(req.params.id, req.user);
  if (managed.error) return res.status(managed.error[0]).json({ message: managed.error[1] });
  if (managed.application.status !== 'accepted') return res.status(400).json({ message: 'Only accepted volunteers can have attendance recorded.' });
  if (!['not-marked', 'present', 'absent'].includes(req.body.attendance)) return res.status(400).json({ message: 'Invalid attendance value.' });
  // Keep old values so unchanged data does not create another notification.
  const previousAttendance = managed.application.attendance;
  const previousHours = Number(managed.application.hours || 0);
  managed.application.attendance = req.body.attendance;
  managed.application.hours = Number(req.body.hours || 0);
  managed.application.feedback = req.body.feedback || '';
  await managed.application.save();
  if (previousAttendance !== managed.application.attendance || previousHours !== managed.application.hours) {
    // Build a different message for present, absent, or reset attendance.
    const present = managed.application.attendance === 'present';
    const message = present
      ? `${managed.application.hours} volunteer hour${managed.application.hours === 1 ? '' : 's'} were recorded for ${managed.application.opportunity.title}.`
      : managed.application.attendance === 'absent'
        ? `Your attendance for ${managed.application.opportunity.title} was marked absent.`
        : `The attendance record for ${managed.application.opportunity.title} was reset.`;
    await createNotification({
      recipient: managed.application.volunteer,
      type: 'status',
      title: present ? 'Volunteer hours recorded' : 'Attendance updated',
      message,
      nextSteps: [{
        title: present ? 'View volunteer history' : 'View application',
        detail: present ? 'See your completed activity and contributed hours.' : 'Review the updated attendance information.',
        to: present ? '/dashboard/history' : '/dashboard/applications'
      }]
    });
  }
  res.json({ application: managed.application });
});

// Let a volunteer withdraw their own application.
router.patch('/:id/withdraw', protect, allow('volunteer'), async (req, res) => {
  // The volunteer ID in the query prevents withdrawing another user's application.
  const application = await Application.findOne({ _id: req.params.id, volunteer: req.user._id })
    .populate('opportunity', 'title organisation');
  if (!application) return res.status(404).json({ message: 'Application not found.' });
  const previousStatus = application.status;
  application.status = 'withdrawn';
  await application.save();
  if (previousStatus !== 'withdrawn' && application.opportunity) {
    await createNotifications([
      {
        recipient: application.opportunity.organisation,
        type: 'application',
        title: 'Application withdrawn',
        message: `${req.user.name} withdrew their application for ${application.opportunity.title}.`,
        nextSteps: [{ title: 'View applications', detail: 'Open the applications dashboard for current records.', to: '/dashboard/applications' }]
      },
      {
        recipient: req.user._id,
        type: 'status',
        title: 'Application withdrawn',
        message: `Your application for ${application.opportunity.title} was withdrawn.`,
        nextSteps: [{ title: 'Find another opportunity', detail: 'Browse current volunteer opportunities.', to: '/dashboard/opportunities' }]
      }
    ]);
  }
  res.json({ application });
});

export default router;
