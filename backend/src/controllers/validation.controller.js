const Application = require('../models/Application');
const Document = require('../models/Document');
const ExtractedField = require('../models/ExtractedField');
const Finding = require('../models/Finding');
const ValidationRun = require('../models/ValidationRun');
const Checklist = require('../models/Checklist');
const ValidationRule = require('../models/ValidationRule');
const { logAuditEvent } = require('../utils/audit');

// POST /api/applications/:id/validate
const runValidation = async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id)
      .populate('category')
      .lean();
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    // Load checklist
    const checklist = await Checklist.findOne({
      category: app.category._id,
      academicYear: app.academicYear,
      isActive: true,
    }).sort({ version: -1 }).lean();

    // Load enabled rules for this category
    const rules = await ValidationRule.find({
      $or: [{ category: app.category._id }, { category: null }],
      isEnabled: true,
    }).lean();

    const validationRun = await ValidationRun.create({
      application: app._id,
      triggeredBy: req.user._id,
      triggerReason: req.body.triggerReason || 'manual_trigger',
      status: 'running',
      rulesApplied: rules.map((r) => ({ ruleId: r.ruleId, ruleVersion: r.version, ruleName: r.name })),
    });

    // Run synchronous checks
    const findings = await runChecks(app, checklist, rules, validationRun._id);

    // Save findings
    if (findings.length > 0) {
      await Finding.insertMany(findings);
    }

    // Count by severity
    const counts = { critical: 0, major: 0, minor: 0, info: 0 };
    for (const f of findings) counts[f.severity] = (counts[f.severity] || 0) + 1;

    await ValidationRun.findByIdAndUpdate(validationRun._id, {
      status: 'completed',
      completedAt: new Date(),
      findingsCount: counts,
    });

    await Application.findByIdAndUpdate(app._id, {
      lastValidatedAt: new Date(),
      currentValidationRunId: validationRun._id,
    });

    await logAuditEvent({
      eventType: 'validation_run_completed',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      application: app._id,
      detail: { validationRunId: validationRun._id, findingsCount: counts, rulesApplied: rules.length },
    });

    res.json({
      success: true,
      data: {
        validationRunId: validationRun._id,
        findingsGenerated: findings.length,
        findingsCount: counts,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Core deterministic validation checks.
 * Returns an array of Finding documents (not yet saved).
 */
const runChecks = async (app, checklist, rules, validationRunId) => {
  const findings = [];
  const appId = app._id;

  const documents = await Document.find({ application: appId, isLatestVersion: true }).lean();
  const fields = await ExtractedField.find({ application: appId }).lean();

  const fieldMap = {};
  for (const f of fields) {
    if (!fieldMap[f.document.toString()]) fieldMap[f.document.toString()] = {};
    fieldMap[f.document.toString()][f.fieldName] = f;
  }

  // 1. Missing mandatory documents
  if (checklist) {
    for (const item of checklist.items) {
      if (!item.isRequired) continue;
      const hasDoc = documents.some(
        (d) =>
          d.checklistItemRuleId === item.ruleId ||
          (item.documentTypes && item.documentTypes.includes(d.documentType))
      );
      if (!hasDoc) {
        findings.push(buildFinding(appId, validationRunId, null, {
          checkName: `Missing Document: ${item.title}`,
          ruleId: item.ruleId,
          ruleVersion: item.ruleVersion || '1.0.0',
          findingType: 'missing',
          severity: 'critical',
          explanation: `Required document "${item.title}" has not been uploaded.`,
          suggestedAction: 'Upload the required document before submitting.',
          requiresHumanReview: false,
        }));
      }
    }
  }

  // 2. Documents with failed processing
  for (const doc of documents) {
    if (doc.processingStatus === 'failed') {
      findings.push(buildFinding(appId, validationRunId, doc._id, {
        checkName: 'Document Processing Failed',
        ruleId: 'PROC-001',
        ruleVersion: '1.0.0',
        findingType: 'invalid',
        severity: 'major',
        explanation: `Document "${doc.originalFilename}" could not be processed. ${doc.processingError || ''}`,
        suggestedAction: 'Re-upload a legible version of the document.',
        requiresHumanReview: true,
      }));
    }
  }

  // 3. Check extracted fields for uncertain extractions
  for (const docId of Object.keys(fieldMap)) {
    for (const [fieldName, field] of Object.entries(fieldMap[docId])) {
      if (field.status === 'extraction_uncertain') {
        findings.push(buildFinding(appId, validationRunId, field.document, {
          checkName: `Uncertain Extraction: ${fieldName}`,
          ruleId: 'EXT-001',
          ruleVersion: '1.0.0',
          findingType: 'extraction_uncertain',
          severity: 'minor',
          explanation: `Field "${fieldName}" was extracted with low confidence (${Math.round((field.confidence || 0) * 100)}%). Please verify.`,
          observedValue: field.extractedValue,
          evidenceReference: field.pageReference,
          suggestedAction: 'Manually verify and correct the extracted value if needed.',
          requiresHumanReview: true,
        }));
      }
    }
  }

  // 4. Expiry checks — find any 'expiry_date' fields
  const today = new Date();
  for (const docId of Object.keys(fieldMap)) {
    const expiryField = fieldMap[docId]['expiry_date'] || fieldMap[docId]['validity_date'];
    if (expiryField && expiryField.extractedValue) {
      const expDate = new Date(expiryField.extractedValue);
      if (!isNaN(expDate) && expDate < today) {
        findings.push(buildFinding(appId, validationRunId, expiryField.document, {
          checkName: 'Potentially Expired Document',
          ruleId: 'EXP-001',
          ruleVersion: '1.0.0',
          findingType: 'expired',
          severity: 'critical',
          explanation: `Extracted expiry date (${expDate.toDateString()}) appears to be in the past.`,
          expectedValue: 'Future or current date',
          observedValue: expDate.toDateString(),
          suggestedAction: 'Upload a current valid document.',
          requiresHumanReview: true,
        }));
      }
    }
  }

  // 5. Duplicate SHA-256 across different applications (same institution)
  for (const doc of documents) {
    const globalDup = await Document.findOne({
      sha256Hash: doc.sha256Hash,
      application: { $ne: appId },
      isLatestVersion: true,
    }).populate('application', 'applicationNumber institution').lean();

    if (globalDup) {
      findings.push(buildFinding(appId, validationRunId, doc._id, {
        checkName: 'Duplicate Document Detected',
        ruleId: 'DUP-001',
        ruleVersion: '1.0.0',
        findingType: 'duplicate',
        severity: 'major',
        explanation: `Document "${doc.originalFilename}" (SHA-256: ${doc.sha256Hash.substring(0, 16)}...) appears to be byte-identical to a document in application ${globalDup.application?.applicationNumber || globalDup.application}.`,
        evidenceReference: `SHA-256 match: ${doc.sha256Hash}`,
        suggestedAction: 'Verify that this document is appropriate for this application.',
        requiresHumanReview: true,
      }));
    }
  }

  // 6. Institution identifier consistency
  const institutionIdFields = fields.filter(
    (f) => f.fieldName === 'institution_id' || f.fieldName === 'aicte_id'
  );
  if (institutionIdFields.length > 1) {
    const ids = [
      ...new Set(institutionIdFields.map((f) => f.correctedValue ?? f.extractedValue).filter(Boolean)),
    ];
    if (ids.length > 1) {
      findings.push(buildFinding(appId, validationRunId, null, {
        checkName: 'Institution ID Inconsistency',
        ruleId: 'CON-001',
        ruleVersion: '1.0.0',
        findingType: 'mismatch',
        severity: 'major',
        explanation: `Multiple different institution identifiers found across uploaded documents: ${ids.join(', ')}`,
        observedValue: ids,
        suggestedAction: 'Ensure all documents carry the same institution identifier.',
        requiresHumanReview: true,
      }));
    }
  }

  return findings;
};

const buildFinding = (applicationId, validationRunId, documentId, fields) => ({
  application: applicationId,
  validationRun: validationRunId,
  document: documentId || undefined,
  isAdvisoryOnly: true,
  status: 'open',
  ...fields,
});

module.exports = { runValidation };
