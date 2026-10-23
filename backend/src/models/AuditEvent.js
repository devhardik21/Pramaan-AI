const mongoose = require('mongoose');

const auditEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        'user_login',
        'user_logout',
        'user_created',
        'user_role_changed',
        'institution_created',
        'application_created',
        'application_status_changed',
        'document_uploaded',
        'document_replaced',
        'document_downloaded',
        'validation_run_started',
        'validation_run_completed',
        'finding_created',
        'finding_resolved',
        'finding_acknowledged',
        'rectification_requested',
        'rectification_submitted',
        'rectification_reviewed',
        'verification_attempted',
        'regulatory_source_uploaded',
        'admin_rule_created',
        'admin_rule_updated',
        'field_manually_corrected',
        'reviewer_note_added',
      ],
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorEmail: { type: String },
    actorRole: { type: String },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    finding: { type: mongoose.Schema.Types.ObjectId, ref: 'Finding' },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    detail: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    // Hash of previous event for chain integrity (optional but implemented)
    previousEventHash: { type: String },
    eventHash: { type: String },
  },
  {
    timestamps: true,
    // Audit events must never be updated, only inserted
    strict: true,
  }
);

auditEventSchema.index({ application: 1, createdAt: -1 });
auditEventSchema.index({ actor: 1, createdAt: -1 });
auditEventSchema.index({ eventType: 1 });

module.exports = mongoose.model('AuditEvent', auditEventSchema);
