// This file handles opportunity search, management, and recommendations.
import express from 'express';
import Opportunity from '../models/Opportunity.js';
import Application from '../models/Application.js';
import User from '../models/User.js';
import { allow, protect } from '../middleware/auth.js';
import { summarizeDescription } from '../utils/ai.js';
import { isValidProvinceDistrict } from '../utils/nepalLocations.js';
import { createNotification } from '../utils/notifications.js';

const router = express.Router();
const editableFields = [
  'title', 'description', 'summary', 'category', 'location', 'district', 'province', 'remote',
  'date', 'endDate', 'deadline', 'duration', 'commitment', 'requiredSkills', 'interests',
  'capacity', 'image', 'status', 'featured'
];
const searchableFields = ['title', 'description', 'summary', 'category', 'location', 'district', 'province', 'commitment', 'requiredSkills', 'interests'];

// Escape special characters before using user text in a search pattern.
function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Copy only opportunity fields that the API allows users to edit.
function editablePayload(body) {
  // Build a new object that ignores unknown or protected request fields.
  return Object.fromEntries(editableFields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
}

// Check dates and Nepal location details before saving.
function validateOpportunity(data) {
  const required = ['title', 'description', 'category', 'location', 'district', 'province', 'date'];
  if (required.some((field) => !data[field])) return 'Title, description, category, local area, district, province, and date are required.';
  if (!isValidProvinceDistrict(data.province, data.district)) return 'The selected district does not belong to that province.';
  const activityDate = new Date(data.date);
  if (Number.isNaN(activityDate.getTime())) return 'Please select a valid activity date.';
  if (data.deadline) {
    const deadline = new Date(data.deadline);
    if (Number.isNaN(deadline.getTime())) return 'Please select a valid application deadline.';
    if (deadline >= activityDate) return 'The application deadline must be before the activity date.';
  }
  if (data.endDate) {
    const endDate = new Date(data.endDate);
    if (Number.isNaN(endDate.getTime()) || endDate < activityDate) return 'The end date cannot be before the activity date.';
  }
  const capacity = data.capacity ?? 20;
  if (!Number.isInteger(Number(capacity)) || Number(capacity) < 1) return 'Capacity must be at least 1 volunteer.';
  return '';
}

// List published opportunities using search, filters, and pagination.
router.get('/', async (req, res) => {
  // Read optional filters from the URL query string.
  const { search = '', category = '', location = '', district = '', province = '', commitment = '', featured, organisation = '' } = req.query;
  // Pagination limits how many records are returned on one page.
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
  // Public users should see only published opportunities.
  const filter = { status: 'published' };
  const searchTerms = [...new Set(String(search).trim().split(/\s+/).filter(Boolean))].slice(0, 6);
  if (searchTerms.length) {
    // Each search word must match a field or the organization name.
    filter.$and = await Promise.all(searchTerms.map(async (term) => {
      const escapedTerm = escapeRegex(term);
      const pattern = new RegExp(term.length <= 2 ? `\\b${escapedTerm}\\b` : `\\b${escapedTerm}`, 'i');
      const organisationIds = await User.find({
        role: 'organisation',
        $or: [{ organisationName: pattern }, { name: pattern }]
      }).distinct('_id');
      return {
        $or: [
          ...searchableFields.map((field) => ({ [field]: pattern })),
          ...(organisationIds.length ? [{ organisation: { $in: organisationIds } }] : [])
        ]
      };
    }));
  }
  if (category) filter.category = category;
  if (location) filter.location = { $regex: location, $options: 'i' };
  if (district) filter.district = district;
  if (province) filter.province = province;
  if (commitment) filter.commitment = commitment;
  if (organisation) filter.organisation = organisation;
  if (featured === 'true') filter.featured = true;
  const skip = (page - 1) * limit;
  // Load the current page and total number of matches together.
  const [opportunities, total] = await Promise.all([
    Opportunity.find(filter).populate('organisation', 'name organisationName verified').sort({ featured: -1, date: 1 }).skip(skip).limit(limit),
    Opportunity.countDocuments(filter)
  ]);
  res.json({ opportunities, total, pages: Math.ceil(total / limit) });
});

// Return opportunities managed by the logged-in organization.
router.get('/mine', protect, allow('organisation', 'admin'), async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { organisation: req.user._id };
  const opportunities = await Opportunity.find(filter)
    .populate('organisation', 'name organisationName')
    .sort({ createdAt: -1 });
  res.json({ opportunities });
});

// Rank opportunities using the volunteer's profile and completed work.
router.get('/recommended', protect, allow('volunteer'), async (req, res) => {
  // Past applications show what the volunteer applied for or completed.
  const applications = await Application.find({ volunteer: req.user._id })
    .populate('opportunity', 'category requiredSkills interests province district')
    .lean();
  const appliedIds = applications.map((item) => item.opportunity?._id).filter(Boolean);
  const completed = applications.filter((item) => item.attendance === 'present' && item.opportunity);
  // Store completed categories and skills for quick matching later.
  const completedCategories = new Map();
  const completedSkills = new Set();
  completed.forEach((item) => {
    const category = item.opportunity.category.toLowerCase();
    completedCategories.set(category, (completedCategories.get(category) || 0) + 1);
    item.opportunity.requiredSkills.forEach((skill) => completedSkills.add(skill.toLowerCase()));
  });

  const opportunities = await Opportunity.find({
    status: 'published',
    date: { $gte: new Date() },
    ...(appliedIds.length ? { _id: { $nin: appliedIds } } : {})
  }).populate('organisation', 'name organisationName verified').limit(100);

  const userInterests = new Set(req.user.interests.map((item) => item.toLowerCase()));
  const userSkills = new Set(req.user.skills.map((item) => item.toLowerCase()));
  const location = req.user.location.toLowerCase();
  // Start each opportunity at 20 points and add points for profile matches.
  const ranked = opportunities.map((item) => {
    let score = 20;
    const reasons = [];
    const interestMatches = [...new Set([item.category, ...item.interests].map((value) => value.toLowerCase()))]
      .filter((value) => userInterests.has(value));
    const skillMatches = item.requiredSkills.filter((value) => userSkills.has(value.toLowerCase()));
    const experienceSkillMatches = item.requiredSkills.filter((value) => completedSkills.has(value.toLowerCase()));
    const completedCategoryCount = completedCategories.get(item.category.toLowerCase()) || 0;

    if (interestMatches.length) { score += Math.min(35, interestMatches.length * 15); reasons.push('Matches your interests'); }
    if (skillMatches.length) { score += Math.min(30, skillMatches.length * 15); reasons.push(`Uses ${skillMatches.slice(0, 2).join(' and ')}`); }
    if (completedCategoryCount) {
      score += Math.min(18, 8 + completedCategoryCount * 4);
      reasons.push(`Builds on your completed ${item.category.toLowerCase()} work`);
    } else if (experienceSkillMatches.length) {
      score += Math.min(12, experienceSkillMatches.length * 6);
      reasons.push('Builds on your volunteer experience');
    }
    if (item.remote) { score += 12; reasons.push('Remote-friendly'); }
    else if (req.user.district && item.district === req.user.district) { score += 18; reasons.push(`In ${item.district} district`); }
    else if (req.user.province && item.province === req.user.province) { score += 10; reasons.push(`In ${item.province} Province`); }
    else if (location && item.location.toLowerCase().includes(location)) { score += 15; reasons.push('Near your location'); }

    // Send the score and reasons so the frontend can explain the match.
    return {
      ...item.toObject(),
      matchScore: Math.min(score, 98),
      matchReasons: reasons.length ? reasons.slice(0, 3) : ['A chance to explore something new']
    };
  }).sort((a, b) => b.matchScore - a.matchScore || new Date(a.date) - new Date(b.date)).slice(0, 8);

  res.json({ opportunities: ranked, profileSignals: { completedActivities: completed.length, excludedApplications: appliedIds.length } });
});

// Return full details for one opportunity.
router.get('/:id', async (req, res) => {
  const opportunity = await Opportunity.findById(req.params.id).populate('organisation', 'name organisationName verified bio location');
  if (!opportunity) return res.status(404).json({ message: 'Opportunity not found.' });
  const accepted = await Application.countDocuments({ opportunity: opportunity._id, status: 'accepted' });
  res.json({ opportunity: { ...opportunity.toObject(), accepted } });
});

// Create a new opportunity for an organization.
router.post('/', protect, allow('organisation', 'admin'), async (req, res) => {
  const payload = editablePayload(req.body);
  const validationError = validateOpportunity(payload);
  if (validationError) return res.status(400).json({ message: validationError });
  // Generate a summary only when the organization did not provide one.
  payload.summary = payload.summary || await summarizeDescription(payload.description);
  // The logged-in account becomes the owner of the opportunity.
  const opportunity = await Opportunity.create({ ...payload, organisation: req.user._id });
  res.status(201).json({ opportunity });
});

// Update an opportunity only when the user manages it.
router.patch('/:id', protect, allow('organisation', 'admin'), async (req, res) => {
  const opportunity = await Opportunity.findById(req.params.id);
  if (!opportunity) return res.status(404).json({ message: 'Opportunity not found.' });
  if (req.user.role !== 'admin' && opportunity.organisation.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'You can only edit your own opportunities.' });
  // Keep the old status so we know whether an admin notification is needed.
  const previousStatus = opportunity.status;
  const payload = editablePayload(req.body);
  // Copy the allowed changes onto the existing Mongoose document.
  Object.assign(opportunity, payload);
  const validationError = validateOpportunity(opportunity);
  if (validationError) return res.status(400).json({ message: validationError });
  if (payload.description && !payload.summary) opportunity.summary = await summarizeDescription(payload.description);
  await opportunity.save();
  if (req.user.role === 'admin' && previousStatus !== opportunity.status
    && opportunity.organisation.toString() !== req.user._id.toString()) {
    await createNotification({
      recipient: opportunity.organisation,
      type: 'opportunity',
      title: 'Opportunity status updated by an administrator',
      message: `${opportunity.title} is now ${opportunity.status}.`,
      nextSteps: [{ title: 'Review opportunity', detail: 'Open opportunity management to review the listing.', to: '/dashboard/opportunities' }]
    });
  }
  res.json({ opportunity });
});

// Delete an opportunity only when it has no applications.
router.delete('/:id', protect, allow('organisation', 'admin'), async (req, res) => {
  const opportunity = await Opportunity.findById(req.params.id);
  if (!opportunity) return res.status(404).json({ message: 'Opportunity not found.' });
  if (req.user.role !== 'admin' && opportunity.organisation.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'You can only remove your own opportunities.' });
  const previousStatus = opportunity.status;
  opportunity.status = 'closed';
  await opportunity.save();
  if (req.user.role === 'admin' && previousStatus !== 'closed'
    && opportunity.organisation.toString() !== req.user._id.toString()) {
    await createNotification({
      recipient: opportunity.organisation,
      type: 'opportunity',
      title: 'Opportunity closed by an administrator',
      message: `${opportunity.title} was closed and is no longer publicly listed.`,
      nextSteps: [{ title: 'Review opportunity', detail: 'Open opportunity management to review the listing.', to: '/dashboard/opportunities' }]
    });
  }
  res.json({ message: 'Opportunity closed.' });
});

export default router;
