const mongoose = require('mongoose');

const validationRunSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
    triggeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    triggerReason: {
      type: String,
      enum: ['initial_submission', 'document_upload', 'rectification', 'manual_trigger'],
      default: 'document_upload',
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      default: 'running',
    },
    rulesApplied: [
      {
        ruleId: String,
        ruleVersion: String,
        ruleName: String,
      },
    ],
    findingsCount: {
      critical: { type: Number, default: 0 },
      major: { type: Number, default: 0 },
      minor: { type: Number, default: 0 },
      info: { type: Number, default: 0 },
    },
    completedAt: { type: Date },
    error: { type: String },
  },
  { timestamps: true }
);

validationRunSchema.index({ application: 1, createdAt: -1 });

module.exports = mongoose.model('ValidationRun', validationRunSchema);
