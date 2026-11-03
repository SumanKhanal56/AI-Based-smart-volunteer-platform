// This model defines persistent account notifications.
import mongoose from 'mongoose';

const nextStepSchema = new mongoose.Schema(
  {
    // A next step can link the user to the related dashboard page.
    title: { type: String, required: true, maxlength: 120 },
    detail: { type: String, default: '', maxlength: 300 },
    to: { type: String, default: null, maxlength: 200 }
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    // recipient decides which account is allowed to read this notification.
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['system', 'application', 'opportunity', 'status', 'reminder'], default: 'system', index: true },
    title: { type: String, required: true, maxlength: 160 },
    message: { type: String, required: true, maxlength: 1800 },
    nextSteps: { type: [nextStepSchema], default: [] },
    // New notifications start unread and receive readAt when opened.
    read: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null }
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
export default mongoose.model('Notification', notificationSchema);
