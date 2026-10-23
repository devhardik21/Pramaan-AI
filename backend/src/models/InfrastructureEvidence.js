const mongoose = require('mongoose');

const infrastructureEvidenceSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: [
        'photograph',
        'floor_plan',
        'safety_certificate',
        'noc',
        'land_document',
        'other',
      ],
      default: 'photograph',
    },
    description: { type: String, trim: true },
    checklistItemRuleId: { type: String },
    originalFilename: { type: String, required: true },
    storedFilename: { type: String, required: true },
    storagePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number },
    sha256Hash: { type: String, index: true },
    reviewStatus: {
      type: String,
      enum: ['pending_review', 'accepted', 'rejected', 'manual_review_required'],
      default: 'pending_review',
    },
    reviewerComment: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    // Advanced CV analysis is optional and marked separately
    cvAnalysisStatus: {
      type: String,
      enum: ['not_attempted', 'completed', 'failed'],
      default: 'not_attempted',
    },
    imageMetadata: { type: mongoose.Schema.Types.Mixed },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InfrastructureEvidence',
    },
  },
  { timestamps: true }
);

infrastructureEvidenceSchema.index({ application: 1 });
infrastructureEvidenceSchema.index({ sha256Hash: 1 });

module.exports = mongoose.model('InfrastructureEvidence', infrastructureEvidenceSchema);
