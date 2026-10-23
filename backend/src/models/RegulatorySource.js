const mongoose = require('mongoose');

const regulatorySourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    version: { type: String, trim: true },
    effectiveDate: { type: Date },
    sourceType: {
      type: String,
      enum: ['gazette', 'circular', 'handbook', 'guideline', 'other'],
      default: 'guideline',
    },
    storedFilename: { type: String },
    storagePath: { type: String },
    sha256Hash: { type: String },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'indexed', 'failed'],
      default: 'pending',
    },
    chunkCount: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    notes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RegulatorySource', regulatorySourceSchema);
