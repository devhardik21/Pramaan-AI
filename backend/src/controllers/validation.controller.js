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

  // 7. Cross-Document Land Area Consistency (Land Deed vs Building Plan vs Affidavit)
  const landAreaFields = fields.filter(
    (f) => f.fieldName === 'land_area_acres' && (f.correctedValue ?? f.extractedValue)
  );
  if (landAreaFields.length > 1) {
    const numericAreas = landAreaFields.map((f) => {
      const val = parseFloat(f.correctedValue ?? f.extractedValue);
      const doc = documents.find((d) => d._id.toString() === f.document.toString());
      return { val, docName: doc?.originalFilename || 'Document', docType: doc?.documentType || 'unknown', docId: f.document };
    }).filter((item) => !isNaN(item.val));

    if (numericAreas.length > 1) {
      const minArea = Math.min(...numericAreas.map((a) => a.val));
      const maxArea = Math.max(...numericAreas.map((a) => a.val));
      const discrepancyRatio = (maxArea - minArea) / (minArea || 1);

      // Flag if difference exceeds 5%
      if (discrepancyRatio > 0.05) {
        const details = numericAreas.map((a) => `${a.docName} (${a.docType}): ${a.val} acres`).join(' vs ');
        findings.push(buildFinding(appId, validationRunId, numericAreas[0].docId, {
          checkName: 'Cross-Document Land Acreage Mismatch',
          ruleId: 'LAND-001',
          ruleVersion: '1.0.0',
          findingType: 'mismatch',
          severity: 'critical',
          explanation: `Discrepancy detected in reported land area across documents: ${details}. (AICTE Chapter I Clause 1.4 requires strict acreage congruence across title deeds and sanction plans).`,
          expectedValue: `${numericAreas[0].val} acres`,
          observedValue: details,
          suggestedAction: 'Reconcile land deed, building sanction plan, and notary affidavit acreage figures.',
          requiresHumanReview: true,
        }));
      }
    }
  }

  // 8. Survey Number & Khasra Consistency across Land Documents
  const surveyFields = fields.filter(
    (f) => f.fieldName === 'survey_number' && (f.correctedValue ?? f.extractedValue)
  );
  if (surveyFields.length > 1) {
    const surveyValues = surveyFields.map((f) => {
      const raw = String(f.correctedValue ?? f.extractedValue).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const doc = documents.find((d) => d._id.toString() === f.document.toString());
      return { raw, original: f.correctedValue ?? f.extractedValue, docName: doc?.originalFilename || 'Document', docId: f.document };
    });

    const uniqueSurveys = [...new Set(surveyValues.map((s) => s.raw))];
    if (uniqueSurveys.length > 1) {
      const summary = surveyValues.map((s) => `${s.docName}: "${s.original}"`).join(' | ');
      findings.push(buildFinding(appId, validationRunId, surveyValues[0].docId, {
        checkName: 'Survey / Khasra Number Discrepancy',
        ruleId: 'SRV-001',
        ruleVersion: '1.0.0',
        findingType: 'mismatch',
        severity: 'critical',
        explanation: `Survey or Khasra numbers do not match across land/building records: ${summary}.`,
        observedValue: summary,
        suggestedAction: 'Verify that all submitted documents pertain to the identical land parcel and survey numbers.',
        requiresHumanReview: true,
      }));
    }
  }

  // 9. Society / Trust Name Uniformity
  const societyFields = fields.filter(
    (f) => f.fieldName === 'society_trust_name' && (f.correctedValue ?? f.extractedValue)
  );
  if (societyFields.length > 1) {
    const societies = societyFields.map((f) => {
      const raw = String(f.correctedValue ?? f.extractedValue).trim().toLowerCase().replace(/\s+/g, ' ');
      const doc = documents.find((d) => d._id.toString() === f.document.toString());
      return { raw, original: f.correctedValue ?? f.extractedValue, docName: doc?.originalFilename || 'Document', docId: f.document };
    });

    const uniqueSocieties = [...new Set(societies.map((s) => s.raw))];
    if (uniqueSocieties.length > 1) {
      const summary = societies.map((s) => `${s.docName}: "${s.original}"`).join(' vs ');
      findings.push(buildFinding(appId, validationRunId, societies[0].docId, {
        checkName: 'Sponsoring Society / Trust Name Variance',
        ruleId: 'SOC-001',
        ruleVersion: '1.0.0',
        findingType: 'mismatch',
        severity: 'major',
        explanation: `Different Sponsoring Body or Trust names detected across records: ${summary}.`,
        observedValue: summary,
        suggestedAction: 'Ensure society/trust registration certificate matches the entity mentioned in land deeds.',
        requiresHumanReview: true,
      }));
    }
  }

  // 10. Built-Up Area Sanction vs Minimum Norms
  const builtUpFields = fields.filter(
    (f) => f.fieldName === 'built_up_area_sqm' && (f.correctedValue ?? f.extractedValue)
  );
  for (const bf of builtUpFields) {
    const rawVal = String(bf.correctedValue ?? bf.extractedValue).replace(/,/g, '');
    const area = parseFloat(rawVal);
    if (!isNaN(area) && area < 500) {
      const doc = documents.find((d) => d._id.toString() === bf.document.toString());
      findings.push(buildFinding(appId, validationRunId, bf.document, {
        checkName: 'Insufficient Built-Up Area Under AICTE Norms',
        ruleId: 'BLD-001',
        ruleVersion: '1.0.0',
        findingType: 'anomaly',
        severity: 'critical',
        explanation: `Reported built-up area in ${doc?.originalFilename || 'Document'} is ${area} sq.m, which is below standard AICTE institutional infrastructure threshold (minimum 500 sq.m required for instructional/administrative block).`,
        expectedValue: '≥ 500 sq.m',
        observedValue: `${area} sq.m`,
        suggestedAction: 'Review building floor plan or occupancy certificate figures for accuracy.',
        requiresHumanReview: true,
      }));
    }
  }

  // 11. Institution Name Variance Across Documents
  const instNameFields = fields.filter(
    (f) => f.fieldName === 'institution_name' && (f.correctedValue ?? f.extractedValue)
  );
  if (instNameFields.length > 1) {
    const names = instNameFields.map((f) => {
      const norm = String(f.correctedValue ?? f.extractedValue).toLowerCase().replace(/[^a-z0-9]/g, '');
      const doc = documents.find((d) => d._id.toString() === f.document.toString());
      return { norm, original: f.correctedValue ?? f.extractedValue, docName: doc?.originalFilename || 'Document' };
    });
    const uniqueNormNames = [...new Set(names.map((n) => n.norm))];
    if (uniqueNormNames.length > 1) {
      const summary = names.map((n) => `${n.docName}: "${n.original}"`).join(' vs ');
      findings.push(buildFinding(appId, validationRunId, null, {
        checkName: 'Institution Name Spelling / Alias Variance',
        ruleId: 'NAM-001',
        ruleVersion: '1.0.0',
        findingType: 'mismatch',
        severity: 'minor',
        explanation: `Subtle variance detected in institution name across documents: ${summary}.`,
        observedValue: summary,
        suggestedAction: 'Verify official government name of the college across affiliation certificates and NOCs.',
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
