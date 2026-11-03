// This helper prepares safe notification database indexes.
import Notification from '../models/Notification.js';

const LEGACY_UNIQUE_INDEX = 'recipient_1_type_1';

// Remove an old index that could block repeated notifications.
export async function removeLegacyNotificationUniqueIndex() {
  let indexes;
  try {
    indexes = await Notification.collection.indexes();
  } catch (error) {
    // A new database may not have this collection yet.
    if (error.code === 26 || error.codeName === 'NamespaceNotFound') return false;
    throw error;
  }

  const legacyIndex = indexes.find((index) => index.name === LEGACY_UNIQUE_INDEX && index.unique);
  if (!legacyIndex) return false;

  await Notification.collection.dropIndex(LEGACY_UNIQUE_INDEX);
  console.log(`Removed obsolete notification index: ${LEGACY_UNIQUE_INDEX}`);
  return true;
}
