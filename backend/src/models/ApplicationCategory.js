const mongoose = require('mongoose');

const applicationCategorySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Note: these are prototype categories — verify official AICTE terminology before use
    illustrativeOnly: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ApplicationCategory', applicationCategorySchema);
