// This temporary script resets passwords in the local test database.
import 'dotenv/config';
import { closeDatabase, connectDatabase } from '../config/db.js';
import User from '../models/User.js';

const RESET_PASSWORD = 'password123';
const CONFIRMATION_FLAG = '--confirm-local-reset';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'mongodb']);

function normalizedHost(host = '') {
  return host.toLowerCase().replace(/^\[|\]$/g, '');
}

function configuredHost() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return '127.0.0.1';

  try {
    return normalizedHost(new URL(uri).hostname);
  } catch {
    throw new Error('MONGODB_URI could not be parsed. Passwords were not changed.');
  }
}

async function resetAllLocalPasswords() {
  if (!process.argv.includes(CONFIRMATION_FLAG)) {
    throw new Error(
      `Confirmation is required. Run: npm run passwords:reset-local -- ${CONFIRMATION_FLAG}`
    );
  }

  const expectedHost = configuredHost();
  if (!LOCAL_HOSTS.has(expectedHost)) {
    throw new Error(
      `Safety stop: refusing to reset passwords on non-local MongoDB host "${expectedHost}".`
    );
  }

  const connection = await connectDatabase();
  const connectedHost = normalizedHost(connection.host);
  if (!LOCAL_HOSTS.has(connectedHost)) {
    throw new Error(
      `Safety stop: connected host "${connectedHost}" is not local. Passwords were not changed.`
    );
  }

  console.log(`Temporary local password reset connected to: ${connection.name} on ${connectedHost}`);

  const users = await User.find({});
  console.log(`Users found: ${users.length}`);

  let updated = 0;
  for (const user of users) {
    // The User model hashes this value before saving it.
    user.password = RESET_PASSWORD;
    await user.save({ validateModifiedOnly: true });
    updated += 1;
  }

  const plaintextRecords = await User.countDocuments({ password: RESET_PASSWORD });
  if (plaintextRecords > 0) {
    throw new Error('Safety check failed: a plaintext password was detected.');
  }

  console.log(`Users updated: ${updated}`);
  console.log('Password reset completed successfully.');
  console.log('All local users can now sign in with their existing email and password123.');
}

resetAllLocalPasswords()
  .catch((error) => {
    console.error(`Password reset failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
