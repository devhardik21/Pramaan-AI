const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    applicationNumber: { type: String, unique: true, trim: true },
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApplicationCategory',
      required: true,
    },
    academicYear: { type: String, required: true, trim: true },
    applicationType: { type: String, trim: true },
    institutionDetails: { type: mongoose.Schema.Types.Mixed },
    contactPerson: { type: mongoose.Schema.Types.Mixed },
    programmes: [{ type: String }],
    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'under_review',
        'rectification_requested',
        'rectification_submitted',
        'approved',
        'rejected',
        'withdrawn',
      ],
      default: 'draft',
    },
    checklistVersion: { type: String },
    assignedReviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewerNotes: { type: String },
    submittedAt: { type: Date },
    lastValidatedAt: { type: Date },
    currentValidationRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ValidationRun',
    },
  },
  { timestamps: true }
);

// Auto-generate application number
applicationSchema.pre('save', async function () {
  if (!this.applicationNumber) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments();
    this.applicationNumber = `PRM-${year}-${String(count + 1).padStart(5, '0')}`;
  }
});

applicationSchema.index({ institution: 1, status: 1 });
applicationSchema.index({ assignedReviewer: 1 });

module.exports = mongoose.model('Application', applicationSchema);
