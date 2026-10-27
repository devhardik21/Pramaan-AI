const path = require('path');
const fs = require('fs');
const axios = require('axios');
const Document = require('../models/Document');
const Application = require('../models/Application');
const ExtractedField = require('../models/ExtractedField');
const { hashFile } = require('../utils/hash');
const { logAuditEvent } = require('../utils/audit');

// POST /api/applications/:id/documents
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const app = await Application.findById(req.params.id);
    if (!app) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Institution users can only upload to their own applications
    if (
      req.user.role === 'institution_user' &&
      app.institution.toString() !== req.user.institution?.toString()
    ) {
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const sha256Hash = await hashFile(req.file.path);
    const { checklistItemRuleId, documentType } = req.body;

    // Check for byte-identical existing document in this application
    const duplicateDoc = await Document.findOne({
      application: app._id,
      sha256Hash,
      isLatestVersion: true,
    });
    if (duplicateDoc) {
      fs.unlinkSync(req.file.path);
      return res.status(409).json({
        success: false,
        message: 'An identical file (same SHA-256) is already attached to this application',
        existingDocumentId: duplicateDoc._id,
      });
    }

    const doc = await Document.create({
      application: app._id,
      uploadedBy: req.user._id,
      documentType: documentType || null,
      originalFilename: req.file.originalname,
      storedFilename: req.file.filename,
      storagePath: req.file.path,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      sha256Hash,
      checklistItemRuleId: checklistItemRuleId || null,
      processingStatus: 'pending',
    });

    await logAuditEvent({
      eventType: 'document_uploaded',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      application: app._id,
      document: doc._id,
      detail: {
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        sha256Hash,
      },
    });

    // Dispatch to Python processor asynchronously (non-blocking)
    triggerProcessing(doc._id, doc.storagePath, doc.mimeType, app._id).catch((err) =>
      console.error('[PROCESSOR] Dispatch error:', err.message)
    );

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    next(err);
  }
};

// Async dispatch to Python processor
const triggerProcessing = async (docId, filePath, mimeType, appId) => {
  const processorUrl = process.env.PROCESSOR_URL || 'http://127.0.0.1:8001';
  try {
    await Document.findByIdAndUpdate(docId, { processingStatus: 'processing' });
    await axios.post(
      `${processorUrl}/process`,
      { documentId: docId.toString(), filePath, mimeType, applicationId: appId.toString() },
      { timeout: 5000 }
    );
  } catch (err) {
    // Processor unavailable — mark as pending for later retry
    console.warn('[PROCESSOR] Unavailable, document will remain pending:', err.message);
    await Document.findByIdAndUpdate(docId, {
      processingStatus: 'pending',
      processingError: 'Processor service unavailable — processing will be retried',
    });
  }
};

// GET /api/documents/:id
const getDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('application', 'institution status')
      .populate('uploadedBy', 'name email')
      .lean();

    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    // Access check
    if (
      req.user.role === 'institution_user' &&
      doc.application.institution.toString() !== req.user.institution?.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Load extracted fields
    const fields = await ExtractedField.find({ document: doc._id }).lean();
    res.json({ success: true, data: { ...doc, extractedFields: fields } });
  } catch (err) {
    next(err);
  }
};

// GET /api/documents/:id/download
const downloadDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id).populate('application', 'institution');
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    if (
      req.user.role === 'institution_user' &&
      doc.application.institution.toString() !== req.user.institution?.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await logAuditEvent({
      eventType: 'document_downloaded',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      application: doc.application._id,
      document: doc._id,
      detail: { filename: doc.originalFilename },
    });

    res.setHeader('Content-Disposition', `attachment; filename="${doc.originalFilename}"`);
    res.setHeader('Content-Type', doc.mimeType);
    fs.createReadStream(doc.storagePath).pipe(res);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/documents/:id/fields/:fieldId
const correctField = async (req, res, next) => {
  try {
    // Accept either 'correctionNote' or 'reason' for backwards compatibility
    const { correctedValue, correctionNote, reason } = req.body;
    const noteText = correctionNote || reason || '';

    const field = await ExtractedField.findOne({
      _id: req.params.fieldId,
      document: req.params.id,
    });
    if (!field) return res.status(404).json({ success: false, message: 'Field not found' });

    field.correctedValue = correctedValue;
    field.correctionNote = noteText;
    field.correctedBy = req.user._id;
    field.correctedAt = new Date();
    field.status = 'manually_corrected';
    await field.save();

    await logAuditEvent({
      eventType: 'field_manually_corrected',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      document: req.params.id,
      detail: {
        fieldName: field.fieldName,
        oldValue: field.extractedValue,
        newValue: correctedValue,
        correctionNote: noteText,
      },
    });

    res.json({ success: true, data: field });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications/:id/documents
const listApplicationDocuments = async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    if (
      req.user.role === 'institution_user' &&
      app.institution.toString() !== req.user.institution?.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const docs = await Document.find({
      application: req.params.id,
      isLatestVersion: true,
    })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Eagerly join extracted fields for each document
    const docIds = docs.map((d) => d._id);
    const allFields = await ExtractedField.find({ document: { $in: docIds } }).lean();

    // Group fields by document ID
    const fieldsByDoc = {};
    for (const f of allFields) {
      const key = f.document.toString();
      if (!fieldsByDoc[key]) fieldsByDoc[key] = [];
      fieldsByDoc[key].push(f);
    }

    const enrichedDocs = docs.map((d) => ({
      ...d,
      extractedFields: fieldsByDoc[d._id.toString()] || [],
    }));

    res.json({ success: true, data: enrichedDocs });
  } catch (err) {
    next(err);
  }
};

// POST /api/documents/:id/reprocess
const reprocessDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id).populate('application', 'institution _id');
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    if (
      req.user.role === 'institution_user' &&
      doc.application.institution.toString() !== req.user.institution?.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Reset status
    await Document.findByIdAndUpdate(doc._id, {
      processingStatus: 'pending',
      processingError: null,
    });

    // Re-trigger async processing
    triggerProcessing(doc._id, doc.storagePath, doc.mimeType, doc.application._id).catch((err) =>
      console.error('[PROCESSOR] Reprocess dispatch error:', err.message)
    );

    await logAuditEvent({
      eventType: 'document_reprocessed',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      application: doc.application._id,
      document: doc._id,
      detail: { originalFilename: doc.originalFilename },
    });

    res.json({ success: true, message: 'Document queued for re-processing' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadDocument,
  getDocument,
  downloadDocument,
  correctField,
  listApplicationDocuments,
  reprocessDocument,
};
