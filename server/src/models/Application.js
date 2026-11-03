// This model defines volunteer application and attendance data.
import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    // These references connect one volunteer to one opportunity.
    opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
    volunteer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, default: '', maxlength: 1000 },
    // The organization updates status, attendance, and verified hours.
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'withdrawn'], default: 'pending' },
    attendance: { type: String, enum: ['not-marked', 'present', 'absent'], default: 'not-marked' },
    hours: { type: Number, default: 0, min: 0 },
    feedback: { type: String, default: '', maxlength: 1000 }
  },
  { timestamps: true }
);

// This unique index stops one volunteer applying twice for the same opportunity.
applicationSchema.index({ opportunity: 1, volunteer: 1 }, { unique: true });

export default mongoose.model('Application', applicationSchema);
