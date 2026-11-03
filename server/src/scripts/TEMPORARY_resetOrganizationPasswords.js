// This temporary script resets organization passwords safely.
import 'dotenv/config';
import { closeDatabase, connectDatabase } from '../config/db.js';
import User from '../models/User.js';
import Opportunity from '../models/Opportunity.js';

const RESET_PASSWORD = 'password123';
const ORGANISATION_ROLE = 'organisation';
const EXPECTED_HOST = 'cluster0.8rveubi.mongodb.net';
const EXPECTED_DATABASE = 'volunteer_nepal';
const CONFIRMATION_FLAG = `--confirm-organisation-reset=${EXPECTED_DATABASE}`;

function configuredTarget() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing. No passwords were changed.');

  try {
    const parsed = new URL(uri);
    return {
      host: parsed.hostname.toLowerCase(),
      database: parsed.pathname.replace(/^\//, '')
    };
  } catch {
    throw new Error('MONGODB_URI could not be parsed. No passwords were changed.');
  }
}

async function resetOrganisationPasswords() {
  const target = configuredTarget();
  if (target.host !== EXPECTED_HOST || target.database !== EXPECTED_DATABASE) {
    throw new Error(
      `Safety stop: expected ${EXPECTED_DATABASE} on ${EXPECTED_HOST}, received ${target.database || '(missing)'} on ${target.host || '(missing)'}.`
    );
  }

  const connection = await connectDatabase();
  if (connection.name !== EXPECTED_DATABASE) {
    throw new Error(
      `Safety stop: connected database is ${connection.name}, not ${EXPECTED_DATABASE}.`
    );
  }

  const [organisations, opportunitiesBefore, protectedUsersBefore] = await Promise.all([
    User.find({ role: ORGANISATION_ROLE }).select('+password'),
    Opportunity.countDocuments(),
    User.find({ role: { $ne: ORGANISATION_ROLE } }).select('_id +password').lean()
  ]);

  console.log(`Target model/collection: User / ${User.collection.name}`);
  console.log('Target field: password');
  console.log(`Target filter: role = ${ORGANISATION_ROLE}`);
  console.log(`Target database: ${connection.name} on ${target.host}`);
  console.log(`Organization accounts found: ${organisations.length}`);
  console.log(`Opportunities before reset: ${opportunitiesBefore}`);

  if (!process.argv.includes(CONFIRMATION_FLAG)) {
    console.log('Dry run only: no passwords were changed.');
    console.log(`To update these accounts, rerun with: ${CONFIRMATION_FLAG}`);
    return;
  }

  let updated = 0;
  for (const organisation of organisations) {
    // The User model hashes this value before saving it.
    organisation.password = RESET_PASSWORD;
    // Mark the password as changed so the hashing hook runs.
    organisation.markModified('password');
    await organisation.save({ validateModifiedOnly: true });
    updated += 1;
  }

  const [storedOrganisations, opportunitiesAfter, protectedUsersAfter] = await Promise.all([
    User.find({ role: ORGANISATION_ROLE }).select('_id email +password'),
    Opportunity.countDocuments(),
    User.find({ role: { $ne: ORGANISATION_ROLE } }).select('_id +password').lean()
  ]);

  const plaintextCount = storedOrganisations.filter((user) => user.password === RESET_PASSWORD).length;
  const loginChecks = await Promise.all(
    storedOrganisations.map((user) => user.comparePassword(RESET_PASSWORD))
  );
  const loginCompatibleCount = loginChecks.filter(Boolean).length;

  const protectedPasswords = new Map(
    protectedUsersBefore.map((user) => [String(user._id), user.password])
  );
  const protectedAccountsUnchanged = protectedUsersAfter.every(
    (user) => protectedPasswords.get(String(user._id)) === user.password
  ) && protectedUsersAfter.length === protectedUsersBefore.length;

  if (updated !== organisations.length) {
    throw new Error(`Update mismatch: found ${organisations.length}, updated ${updated}.`);
  }
  if (plaintextCount !== 0) {
    throw new Error(`Safety check failed: ${plaintextCount} plaintext password value(s) detected.`);
  }
  if (loginCompatibleCount !== storedOrganisations.length) {
    throw new Error(
      `Login verification failed for ${storedOrganisations.length - loginCompatibleCount} organization account(s).`
    );
  }
  if (!protectedAccountsUnchanged) {
    throw new Error('Safety check failed: a volunteer or admin password changed.');
  }
  if (opportunitiesAfter !== opportunitiesBefore) {
    throw new Error(
      `Safety check failed: opportunity count changed from ${opportunitiesBefore} to ${opportunitiesAfter}.`
    );
  }

  console.log(`Organization accounts updated: ${updated}`);
  console.log('Plaintext passwords stored: 0');
  console.log(`Organization login checks passed: ${loginCompatibleCount}/${storedOrganisations.length}`);
  console.log('Volunteer/admin passwords unchanged: yes');
  console.log(`Opportunities unchanged: yes (${opportunitiesAfter})`);
  console.log('Organization password reset completed successfully.');
}

resetOrganisationPasswords()
  .catch((error) => {
    console.error(`Organization password reset failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
