// This helper creates notifications without breaking main actions.
import Notification from '../models/Notification.js';

// Save one notification for a user without breaking the main action.
export async function createNotification(payload) {
  try {
    return await Notification.create(payload);
  } catch (error) {
    // Do not cancel the main action if notification creation fails.
    console.error('Notification creation failed:', error.message);
    return null;
  }
}

// Save several notifications at the same time.
export async function createNotifications(payloads = []) {
  return Promise.all(payloads.map((payload) => createNotification(payload)));
}
