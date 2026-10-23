const mongoose = require('mongoose');

const rectificationSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
    finding: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Finding',
      required: true,
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestNote: { type: String },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submissionNote: { type: String },
    correctedDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    correctedFields: [
      {
        fieldName: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
      },
    ],
    status: {
      type: String,
      enum: ['requested', 'submitted', 'accepted', 'rejected', 'pending_re_validation'],
      default: 'requested',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNote: { type: String },
    reviewedAt: { type: Date },
    reValidationRunId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ValidationRun',
    },
  },
  { timestamps: true }
);

rectificationSchema.index({ application: 1, finding: 1 });

module.exports = mongoose.model('Rectification', rectificationSchema);
