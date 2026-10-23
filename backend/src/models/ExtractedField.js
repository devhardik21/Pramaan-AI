const mongoose = require('mongoose');

const extractedFieldSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
    fieldName: { type: String, required: true, trim: true },
    extractedValue: { type: mongoose.Schema.Types.Mixed },
    confidence: { type: Number, min: 0, max: 1 },
    extractionMethod: {
      type: String,
      enum: ['pdf_text', 'ocr', 'llm', 'regex', 'manual_correction'],
      default: 'pdf_text',
    },
    status: {
      type: String,
      enum: [
        'extracted',
        'extraction_uncertain',
        'extraction_failed',
        'manually_corrected',
        'missing',
      ],
      default: 'extracted',
    },
    pageReference: { type: String },
    textRegion: { type: String },
    correctedValue: { type: mongoose.Schema.Types.Mixed },
    correctedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    correctedAt: { type: Date },
    correctionNote: { type: String },
  },
  { timestamps: true }
);

extractedFieldSchema.index({ document: 1, fieldName: 1 });
extractedFieldSchema.index({ application: 1, fieldName: 1 });

module.exports = mongoose.model('ExtractedField', extractedFieldSchema);
