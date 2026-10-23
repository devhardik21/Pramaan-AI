const axios = require('axios');
const RegulatorySource = require('../models/RegulatorySource');
const { hashFile } = require('../utils/hash');
const { logAuditEvent } = require('../utils/audit');
const path = require('path');
const fs = require('fs');

// POST /api/regulations/sources — admin only
const uploadSource = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const sha256Hash = await hashFile(req.file.path);
    const { title, version, effectiveDate, sourceType, notes } = req.body;

    const source = await RegulatorySource.create({
      title,
      version,
      effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
      sourceType: sourceType || 'guideline',
      storedFilename: req.file.filename,
      storagePath: req.file.path,
      sha256Hash,
      notes,
      uploadedBy: req.user._id,
      processingStatus: 'pending',
    });

    await logAuditEvent({
      eventType: 'regulatory_source_uploaded',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      detail: { sourceId: source._id, title, sha256Hash },
    });

    // Trigger indexing async
    triggerIndexing(source._id, source.storagePath).catch((err) =>
      console.error('[RAG] Indexing error:', err.message)
    );

    res.status(201).json({ success: true, data: source });
  } catch (err) {
    next(err);
  }
};

const triggerIndexing = async (sourceId, filePath) => {
  const processorUrl = process.env.PROCESSOR_URL || 'http://127.0.0.1:8001';
  try {
    await RegulatorySource.findByIdAndUpdate(sourceId, { processingStatus: 'processing' });
    const resp = await axios.post(
      `${processorUrl}/rag/ingest`,
      { sourceId: sourceId.toString(), filePath },
      { timeout: 10000 }
    );
    await RegulatorySource.findByIdAndUpdate(sourceId, {
      processingStatus: 'indexed',
      chunkCount: resp.data?.chunkCount || 0,
    });
  } catch (err) {
    await RegulatorySource.findByIdAndUpdate(sourceId, {
      processingStatus: 'failed',
    });
    console.warn('[RAG] Processor unavailable for indexing:', err.message);
  }
};

// GET /api/regulations/sources
const listSources = async (req, res, next) => {
  try {
    const sources = await RegulatorySource.find({ isActive: true })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: sources });
  } catch (err) {
    next(err);
  }
};

// GET /api/regulations/search
const searchRegulations = async (req, res, next) => {
  try {
    const { q, limit = 5 } = req.query;
    if (!q || q.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Query must be at least 3 characters' });
    }

    const processorUrl = process.env.PROCESSOR_URL || 'http://127.0.0.1:8001';
    try {
      const resp = await axios.post(
        `${processorUrl}/rag/search`,
        { query: q, limit: parseInt(limit) },
        { timeout: 15000 }
      );
      return res.json({ success: true, data: resp.data });
    } catch (err) {
      // Processor down — inform user honestly
      return res.json({
        success: true,
        data: {
          passages: [],
          answer: null,
          message: 'Regulatory search service is currently unavailable. No passages retrieved.',
          serviceAvailable: false,
        },
      });
    }
  } catch (err) {
    next(err);
  }
};

// POST /api/regulations/ask
const askRegulations = async (req, res, next) => {
  try {
    const { question, findingId } = req.body;
    if (!question || question.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Question is too short' });
    }

    const processorUrl = process.env.PROCESSOR_URL || 'http://127.0.0.1:8001';
    try {
      const resp = await axios.post(
        `${processorUrl}/rag/ask`,
        { question, findingId },
        { timeout: 30000 }
      );
      return res.json({ success: true, data: resp.data });
    } catch (err) {
      return res.json({
        success: true,
        data: {
          passages: [],
          answer: null,
          message: 'Regulatory assistant is currently unavailable. No LLM answer generated.',
          serviceAvailable: false,
        },
      });
    }
  } catch (err) {
    next(err);
  }
};

module.exports = { uploadSource, listSources, searchRegulations, askRegulations };
