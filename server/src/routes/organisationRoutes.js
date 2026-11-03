// This file handles organization search and public profiles.
import express from 'express';
import User from '../models/User.js';
import Opportunity from '../models/Opportunity.js';
import Application from '../models/Application.js';

const router = express.Router();

// Count active organizations and their published opportunities.
router.get('/stats', async (req, res) => {
  const [volunteers, organisations, opportunities, hours] = await Promise.all([
    User.countDocuments({ role: 'volunteer', active: true }),
    User.countDocuments({ role: 'organisation', active: true }),
    Opportunity.countDocuments({ status: 'published', date: { $gte: new Date() } }),
    Application.aggregate([{ $match: { attendance: 'present' } }, { $group: { _id: null, total: { $sum: '$hours' } } }])
  ]);
  res.json({ volunteers, organisations, opportunities, hours: hours[0]?.total || 0 });
});

// Search the public organization directory using filters.
router.get('/', async (req, res) => {
  const { search = '', location = '', province = '', district = '', verified = '' } = req.query;
  const filter = { role: 'organisation', active: true };
  if (search) {
    const expression = { $regex: search, $options: 'i' };
    filter.$or = [{ organisationName: expression }, { name: expression }, { bio: expression }, { interests: expression }];
  }
  if (location) filter.location = { $regex: location, $options: 'i' };
  if (province) filter.province = province;
  if (district) filter.district = district;
  if (verified === 'true') filter.verified = true;

  const organisations = await User.find(filter)
    .select('name organisationName organisationType bio location province district interests verified avatar createdAt')
    .sort({ verified: -1, organisationName: 1 })
    .limit(100)
    .lean();
  const ids = organisations.map((item) => item._id);
  const opportunityCounts = await Opportunity.aggregate([
    { $match: { organisation: { $in: ids }, status: 'published' } },
    { $group: { _id: '$organisation', count: { $sum: 1 } } }
  ]);
  const counts = new Map(opportunityCounts.map((item) => [item._id.toString(), item.count]));
  res.json({
    organisations: organisations.map((item) => ({
      ...item,
      opportunityCount: counts.get(item._id.toString()) || 0
    }))
  });
});

export default router;
