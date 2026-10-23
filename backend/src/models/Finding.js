const mongoose = require('mongoose');

const findingSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
    validationRun: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ValidationRun',
    },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    checkName: { type: String, required: true },
    ruleId: { type: String, required: true },
    ruleVersion: { type: String, required: true },
    findingType: {
      type: String,
      enum: [
        'missing',
        'invalid',
        'expired',
        'extraction_uncertain',
        'mismatch',
        'duplicate',
        'anomaly',
        'manual_review_required',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'major', 'minor', 'info'],
      default: 'major',
    },
    status: {
      type: String,
      enum: ['open', 'resolved', 'unresolved', 'manual_review_required', 'acknowledged'],
      default: 'open',
    },
    explanation: { type: String, required: true },
    expectedValue: { type: mongoose.Schema.Types.Mixed },
    observedValue: { type: mongoose.Schema.Types.Mixed },
    evidenceReference: { type: String },
    suggestedAction: { type: String },
    requiresHumanReview: { type: Boolean, default: false },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    reviewerNote: { type: String },
    // Advisory flag — automated findings never constitute regulatory decisions
    isAdvisoryOnly: { type: Boolean, default: true },
  },
  { timestamps: true }
);

findingSchema.index({ application: 1, status: 1 });
findingSchema.index({ application: 1, findingType: 1 });
findingSchema.index({ validationRun: 1 });

module.exports = mongoose.model('Finding', findingSchema);
