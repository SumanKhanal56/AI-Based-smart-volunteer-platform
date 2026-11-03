// This unit test checks notification defaults.
import { describe, expect, test } from '@jest/globals';
import mongoose from 'mongoose';
import Notification from '../../../server/src/models/Notification.js';

describe('Notification model', () => {
  test('new platform notifications are unread by default', async () => {
  const notification = new Notification({
    recipient: new mongoose.Types.ObjectId(),
    title: 'Welcome to Volunteer Nepal!',
    message: 'Welcome message',
    nextSteps: [{ title: 'Complete profile', detail: 'Add your details.', to: '/dashboard/profile' }]
  });

  await notification.validate();
  expect(notification.type).toBe('system');
  expect(notification.read).toBe(false);
  expect(notification.readAt).toBe(null);
});
});

