const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    aicteId: { type: String, trim: true, index: true },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
    },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    type: {
      type: String,
      enum: ['university', 'college', 'polytechnic', 'other'],
      default: 'college',
    },
    isVerified: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Institution', institutionSchema);
