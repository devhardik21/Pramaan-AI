const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
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
    documentType: { type: String, trim: true },
    originalFilename: { type: String, required: true },
    storedFilename: { type: String, required: true },
    storagePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    sha256Hash: { type: String, required: true, index: true },
    uploadStatus: {
      type: String,
      enum: ['uploading', 'stored', 'failed'],
      default: 'stored',
    },
    processingStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'skipped'],
      default: 'pending',
    },
    processingError: { type: String },
    isLatestVersion: { type: Boolean, default: true },
    versionNumber: { type: Number, default: 1 },
    replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    replaces: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    checklistItemRuleId: { type: String },
    pdfMetadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

documentSchema.index({ application: 1, isLatestVersion: 1 });


module.exports = mongoose.model('Document', documentSchema);
