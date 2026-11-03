// This script adds missing images to existing opportunities.
import 'dotenv/config';
import { closeDatabase, connectDatabase } from './config/db.js';
import Opportunity from './models/Opportunity.js';

const opportunityMetadata = {
  'Restore the Bagmati Riverbank': { image: '/images/opportunities/bagmati-riverbank.jpg', district: 'Lalitpur' },
  'Weekend Reading Club Mentor': { image: '/images/opportunities/reading-club.jpg', district: 'Kathmandu' },
  'Community Health Awareness Day': { image: '/images/opportunities/health-awareness.jpg', district: 'Bhaktapur' },
  'Design Learning Materials from Home': { image: '/images/opportunities/learning-materials.jpg', district: 'Nationwide' },
  'Urban Tree Mapping Walk': { image: '/images/opportunities/tree-mapping.jpg', district: 'Lalitpur' },
  'Emergency Relief Kit Packing': { image: '/images/opportunities/relief-kit-packing.jpg', district: 'Kathmandu' },
  'Shelter Photography Volunteer': { image: '/images/opportunities/shelter-photography.jpg', district: 'Kathmandu' }
};

async function backfillOpportunityImages() {
  await connectDatabase();
  const updates = Object.entries(opportunityMetadata).flatMap(([title, metadata]) => [
    Opportunity.updateOne(
      { title, $or: [{ image: '' }, { image: { $exists: false } }] },
      { $set: { image: metadata.image } }
    ),
    Opportunity.updateOne(
      { title, $or: [{ district: '' }, { district: { $exists: false } }] },
      { $set: { district: metadata.district } }
    )
  ]);
  const results = await Promise.all(updates);
  const modified = results.reduce((total, result) => total + result.modifiedCount, 0);
  console.log(`Opportunity image/location fields updated: ${modified}`);
}

backfillOpportunityImages()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
