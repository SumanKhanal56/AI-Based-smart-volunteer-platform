// This model defines volunteer opportunity data.
import mongoose from 'mongoose';

const opportunitySchema = new mongoose.Schema(
  {
    // Main content shown on the opportunity card and details page.
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 5000 },
    summary: { type: String, default: '', maxlength: 400 },
    organisation: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: String,
      enum: ['Environment', 'Education', 'Health', 'Disaster Response', 'Fundraising', 'Social Work', 'Community', 'Animal Welfare', 'Other'],
      required: true
    },
    // Nepal location information used by search and recommendations.
    location: { type: String, required: true, trim: true },
    district: { type: String, default: '', trim: true },
    province: {
      type: String,
      enum: ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim', 'Nationwide'],
      required: true
    },
    remote: { type: Boolean, default: false },
    // Dates and time commitment help volunteers plan participation.
    date: { type: Date, required: true },
    endDate: { type: Date },
    deadline: { type: Date },
    duration: { type: String, default: '' },
    commitment: { type: String, enum: ['One-time', 'Short-term', 'Long-term', 'Flexible'], default: 'One-time' },
    // Matching compares these skills and interests with the volunteer profile.
    requiredSkills: [{ type: String, trim: true }],
    interests: [{ type: String, trim: true }],
    capacity: { type: Number, default: 20, min: 1 },
    // Status controls whether the opportunity is public, a draft, or closed.
    image: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'published', 'closed'], default: 'published' },
    featured: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Indexes make common MongoDB searches faster.
opportunitySchema.index({ title: 'text', description: 'text', location: 'text', district: 'text' });
opportunitySchema.index({ status: 1, date: 1 });
opportunitySchema.index({ organisation: 1 });

export default mongoose.model('Opportunity', opportunitySchema);
