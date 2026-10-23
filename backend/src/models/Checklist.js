const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
  ruleId: { type: String, required: true },
  ruleVersion: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  isRequired: { type: Boolean, default: true },
  documentTypes: [{ type: String }],
  order: { type: Number, default: 0 },
});

const checklistSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApplicationCategory',
      required: true,
    },
    academicYear: { type: String, required: true, trim: true },
    version: { type: String, required: true, default: '1.0.0' },
    items: [checklistItemSchema],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Illustrative — must be verified against official requirements
    illustrativeOnly: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Checklist', checklistSchema);
