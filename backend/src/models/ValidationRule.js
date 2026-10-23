const mongoose = require('mongoose');

const validationRuleSchema = new mongoose.Schema(
  {
    ruleId: { type: String, required: true, trim: true },
    version: { type: String, required: true, trim: true, default: '1.0.0' },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApplicationCategory',
    },
    validationType: {
      type: String,
      enum: [
        'completeness',
        'expiry',
        'identifier_match',
        'cross_document',
        'duplicate',
        'anomaly',
        'format',
        'manual',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'major', 'minor', 'info'],
      default: 'major',
    },
    isRequired: { type: Boolean, default: true },
    isEnabled: { type: Boolean, default: true },
    sourceDocument: { type: String, trim: true },
    sourceSection: { type: String, trim: true },
    effectiveDate: { type: Date },
    parameters: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Clearly identified as illustrative — must be verified against official AICTE rules
    illustrativeOnly: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

validationRuleSchema.index({ ruleId: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('ValidationRule', validationRuleSchema);
