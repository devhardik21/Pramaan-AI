const Application = require('../models/Application');
const Checklist = require('../models/Checklist');
const Finding = require('../models/Finding');
const AuditEvent = require('../models/AuditEvent');
const Rectification = require('../models/Rectification');
const { logAuditEvent } = require('../utils/audit');

// POST /api/applications
const createApplication = async (req, res, next) => {
  try {
    const { categoryId, academicYear } = req.body;
    const user = req.user;

    if (!categoryId || !academicYear) {
      return res.status(400).json({ success: false, message: 'Category and academic year are required' });
    }

    if (!user.institution) {
      return res.status(400).json({
        success: false,
        message: 'You must be associated with an institution to create an application',
      });
    }

    // Load the applicable checklist
    const checklist = await Checklist.findOne({
      category: categoryId,
      academicYear,
      isActive: true,
    }).sort({ version: -1 });

    const app = await Application.create({
      institution: user.institution,
      submittedBy: user._id,
      category: categoryId,
      academicYear,
      checklistVersion: checklist?.version || null,
      status: 'draft',
    });

    await logAuditEvent({
      eventType: 'application_created',
      actor: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      application: app._id,
      detail: { applicationNumber: app.applicationNumber, categoryId, academicYear },
    });

    res.status(201).json({ success: true, data: app });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications
const listApplications = async (req, res, next) => {
  try {
    const { role, institution, _id: userId } = req.user;
    const { status, page = 1, limit = 20 } = req.query;

    let filter = {};
    if (role === 'institution_user') filter.institution = institution;
    else if (role === 'reviewer') filter.assignedReviewer = userId;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [apps, total] = await Promise.all([
      Application.find(filter)
        .populate('category', 'name code')
        .populate('institution', 'name aicteId')
        .populate('submittedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Application.countDocuments(filter),
    ]);

    res.json({ success: true, data: apps, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications/:id
const getApplication = async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id)
      .populate('category', 'name code description')
      .populate('institution', 'name aicteId contactEmail')
      .populate('submittedBy', 'name email')
      .populate('assignedReviewer', 'name email')
      .lean();

    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    // Institution users can only see their own institution's applications
    if (
      req.user.role === 'institution_user' &&
      app.institution._id.toString() !== req.user.institution?.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: app });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications/:id/checklist
const getChecklist = async (req, res, next) => {
  try {
    const app = await Application.findById(req.params.id).lean();
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    if (
      req.user.role === 'institution_user' &&
      app.institution.toString() !== req.user.institution?.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const checklist = await Checklist.findOne({
      category: app.category,
      academicYear: app.academicYear,
      isActive: true,
    })
      .sort({ version: -1 })
      .populate('category', 'name code')
      .lean();

    res.json({
      success: true,
      data: checklist || null,
      message: checklist ? null : 'No checklist configured for this category and year',
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/applications/:id/status
const updateStatus = async (req, res, next) => {
  try {
    const { status, reviewerNotes } = req.body;
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    const oldStatus = app.status;
    app.status = status;
    if (reviewerNotes) app.reviewerNotes = reviewerNotes;
    if (status === 'submitted') app.submittedAt = new Date();
    await app.save();

    await logAuditEvent({
      eventType: 'application_status_changed',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      application: app._id,
      detail: { oldStatus, newStatus: status, reviewerNotes },
    });

    res.json({ success: true, data: app });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications/:id/findings
const getFindings = async (req, res, next) => {
  try {
    const { status, findingType } = req.query;
    const filter = { application: req.params.id };
    if (status) filter.status = status;
    if (findingType) filter.findingType = findingType;

    const findings = await Finding.find(filter)
      .populate('document', 'originalFilename documentType')
      .sort({ severity: 1, createdAt: -1 })
      .lean();

    res.json({ success: true, data: findings });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications/findings/all (Global discrepancy feed)
const getAllFindings = async (req, res, next) => {
  try {
    const { status, severity, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (search) {
      filter.$or = [
        { checkName: { $regex: search, $options: 'i' } },
        { explanation: { $regex: search, $options: 'i' } },
        { ruleId: { $regex: search, $options: 'i' } },
      ];
    }

    const findings = await Finding.find(filter)
      .populate('document', 'originalFilename documentType')
      .populate({
        path: 'application',
        select: 'applicationNumber academicYear institution status',
        populate: { path: 'institution', select: 'name aicteId' }
      })
      .sort({ severity: 1, createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ success: true, data: { findings } });
  } catch (err) {
    next(err);
  }
};

// GET /api/applications/:id/audit
const getAudit = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [events, total] = await Promise.all([
      AuditEvent.find({ application: req.params.id })
        .populate('actor', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditEvent.countDocuments({ application: req.params.id }),
    ]);

    res.json({ success: true, data: events, total });
  } catch (err) {
    next(err);
  }
};

// POST /api/applications/:id/rectifications
const requestRectification = async (req, res, next) => {
  try {
    const { findingId, requestNote } = req.body;
    const app = await Application.findById(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    const finding = await Finding.findById(findingId);
    if (!finding || finding.application.toString() !== req.params.id) {
      return res.status(404).json({ success: false, message: 'Finding not found' });
    }

    const rectification = await Rectification.create({
      application: app._id,
      finding: findingId,
      requestedBy: req.user._id,
      requestNote,
      status: 'requested',
    });

    app.status = 'rectification_requested';
    await app.save();

    await logAuditEvent({
      eventType: 'rectification_requested',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      application: app._id,
      finding: findingId,
      detail: { requestNote, findingId },
    });

    res.status(201).json({ success: true, data: rectification });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createApplication,
  listApplications,
  getApplication,
  getChecklist,
  updateStatus,
  getFindings,
  getAllFindings,
  getAudit,
  requestRectification,
};
