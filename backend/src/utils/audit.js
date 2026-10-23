const AuditEvent = require('../models/AuditEvent');
const { hashString } = require('./hash');

/**
 * Append an audit event. Never throws — logs any failure to stderr.
 */
const logAuditEvent = async ({
  eventType,
  actor = null,
  actorEmail = null,
  actorRole = null,
  application = null,
  document = null,
  finding = null,
  targetUser = null,
  detail = {},
  ipAddress = null,
}) => {
  try {
    // Retrieve hash of the last event for lightweight chaining
    const last = await AuditEvent.findOne({}, { eventHash: 1 }).sort({ createdAt: -1 });
    const previousEventHash = last?.eventHash || null;

    const payload = JSON.stringify({ eventType, actor, application, detail, createdAt: new Date() });
    const eventHash = hashString(previousEventHash ? previousEventHash + payload : payload);

    await AuditEvent.create({
      eventType,
      actor,
      actorEmail,
      actorRole,
      application,
      document,
      finding,
      targetUser,
      detail,
      ipAddress,
      previousEventHash,
      eventHash,
    });
  } catch (err) {
    // Audit failures must not interrupt the main flow
    console.error('[AUDIT] Failed to record event:', err.message);
  }
};

module.exports = { logAuditEvent };
