// This script adds missing details to sample user profiles.
import 'dotenv/config';
import { closeDatabase, connectDatabase } from './config/db.js';
import User from './models/User.js';

const demoProfiles = {
  'volunteer@volunterr.test': {
    location: 'Kathmandu Metropolitan City', district: 'Kathmandu', province: 'Bagmati'
  },
  'organisation@volunterr.test': {
    organisationType: 'Non-profit', location: 'Kathmandu Metropolitan City', district: 'Kathmandu', province: 'Bagmati',
    phone: '+977 9800000001', interests: ['Education', 'Health', 'Disaster Response']
  },
  'green@volunterr.test': {
    organisationType: 'Youth club', location: 'Lalitpur Metropolitan City', district: 'Lalitpur', province: 'Bagmati',
    phone: '+977 9800000002', interests: ['Environment', 'Community']
  }
};

async function backfillDemoProfiles() {
  await connectDatabase();
  const results = await Promise.all(Object.entries(demoProfiles).map(([email, fields]) => User.updateOne({ email }, { $set: fields })));
  const modified = results.reduce((total, result) => total + result.modifiedCount, 0);
  console.log(`Demo profiles updated: ${modified}`);
}

backfillDemoProfiles()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
