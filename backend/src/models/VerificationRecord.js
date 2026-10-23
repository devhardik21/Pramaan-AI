const mongoose = require('mongoose');

const verificationRecordSchema = new mongoose.Schema(
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
    verificationMethod: {
      type: String,
      enum: ['qr_decode', 'trusted_issuer_api', 'digital_signature', 'manual', 'hash_match'],
      required: true,
    },
    issuerName: { type: String },
    issuerDomain: { type: String },
    certificateNumber: { type: String },
    status: {
      type: String,
      enum: [
        'verified',
        'mismatch_detected',
        'expired',
        'verification_pending',
        'source_unavailable',
        'manual_review_required',
      ],
      default: 'verification_pending',
    },
    result: { type: mongoose.Schema.Types.Mixed },
    evidenceReference: { type: String },
    sourceResponse: { type: mongoose.Schema.Types.Mixed },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
    notes: { type: String },
    // Source confirmed = true only when a real authorized source responded
    sourceConfirmed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

verificationRecordSchema.index({ document: 1 });
verificationRecordSchema.index({ application: 1 });

module.exports = mongoose.model('VerificationRecord', verificationRecordSchema);
