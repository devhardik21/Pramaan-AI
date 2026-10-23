const axios = require('axios');
const Document = require('../models/Document');
const VerificationRecord = require('../models/VerificationRecord');
const { logAuditEvent } = require('../utils/audit');

const TRUSTED_ISSUERS = [
  'aicte.india.gov.in',
  'ugc.ac.in',
  'mhrd.gov.in',
  'naac.gov.in',
];

// POST /api/documents/:id/verify
const verifyDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id).populate('application', 'institution');
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    const { method = 'qr_decode', certificateNumber, issuerName } = req.body;

    let status = 'verification_pending';
    let result = null;
    let sourceConfirmed = false;
    let evidenceReference = null;
    let sourceResponse = null;

    if (method === 'qr_decode') {
      // QR decoding is performed by the Python processor — check its result
      const processorUrl = process.env.PROCESSOR_URL || 'http://127.0.0.1:8001';
      try {
        const resp = await axios.post(
          `${processorUrl}/verify/qr`,
          { documentId: doc._id.toString(), filePath: doc.storagePath },
          { timeout: 10000 }
        );
        const data = resp.data;
        if (data.qrData) {
          const url = new URL(data.qrData);
          const isTrusted = TRUSTED_ISSUERS.some((d) => url.hostname.endsWith(d));
          if (isTrusted) {
            status = 'verification_pending'; // requires human to follow the link
            evidenceReference = data.qrData;
            result = { qrData: data.qrData, trusted: true };
          } else {
            status = 'manual_review_required';
            result = { qrData: data.qrData, trusted: false, reason: 'QR destination is not a configured trusted issuer' };
            evidenceReference = data.qrData;
          }
          sourceConfirmed = false; // a QR URL alone does not confirm authenticity
        } else {
          status = 'source_unavailable';
          result = { reason: 'No QR code found in document' };
        }
      } catch (err) {
        status = 'source_unavailable';
        result = { reason: `Processor unavailable: ${err.message}` };
      }
    } else if (method === 'manual') {
      status = 'manual_review_required';
      result = { reason: 'Routed for manual verification by reviewer' };
    } else {
      // Other methods (trusted_issuer_api, digital_signature) not yet implemented
      status = 'source_unavailable';
      result = { reason: `Verification method "${method}" is not yet implemented. No external API has been contacted.` };
    }

    const record = await VerificationRecord.create({
      document: doc._id,
      application: doc.application._id,
      verificationMethod: method,
      issuerName: issuerName || null,
      certificateNumber: certificateNumber || null,
      status,
      result,
      sourceResponse,
      evidenceReference,
      sourceConfirmed,
      verifiedBy: method === 'manual' ? req.user._id : undefined,
    });

    await logAuditEvent({
      eventType: 'verification_attempted',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      application: doc.application._id,
      document: doc._id,
      detail: { method, status, sourceConfirmed },
    });

    res.status(201).json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/:id/verifications
const getVerifications = async (req, res, next) => {
  try {
    const records = await VerificationRecord.find({ document: req.params.id })
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: records });
  } catch (err) {
    next(err);
  }
};

module.exports = { verifyDocument, getVerifications };
