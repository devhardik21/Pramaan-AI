const mongoose = require('mongoose');
const Application = require('../models/Application');
const Checklist = require('../models/Checklist');
const Finding = require('../models/Finding');
const AuditEvent = require('../models/AuditEvent');
const Rectification = require('../models/Rectification');
const ApplicationCategory = require('../models/ApplicationCategory');
const Institution = require('../models/Institution');
const User = require('../models/User');
const Document = require('../models/Document');
const { logAuditEvent } = require('../utils/audit');

const TYPE_MAP = {
  extension_of_approval: 'EOA',
  eoa: 'EOA',
  new_institution: 'NEW_INST',
  new_inst: 'NEW_INST',
  increase_in_intake: 'INC_INTAKE',
  inc_intake: 'INC_INTAKE',
  introduction_of_new_course: 'NEW_COURSE',
  new_course: 'NEW_COURSE',
  closure_of_course: 'CLOSURE',
  closure: 'CLOSURE',
};

const DEFAULT_CATEGORIES = [
  { code: 'EOA', name: 'Extension of Approval (EoA)', description: 'Annual extension of approval for existing institutions' },
  { code: 'NEW_INST', name: 'Establishment of New Institution', description: 'Approval for setting up a new technical institution' },
  { code: 'INC_INTAKE', name: 'Increase in Intake / Additional Course', description: 'Expansion of intake capacity or addition of new course/programme' },
  { code: 'NEW_COURSE', name: 'Introduction of New Course / Division', description: 'Introduction of emerging area course or new division' },
  { code: 'CLOSURE', name: 'Closure of Course / Institution', description: 'Progressive or complete closure of course or institution' },
];

const STANDARD_CHECKLIST_ITEMS = [
  { ruleId: 'CHK-LAND-01', ruleVersion: '1.0.0', title: 'Land Title Deed / Ownership / Lease Documents', description: 'Registered sale deed / lease deed min 30 years', isRequired: true, documentTypes: ['land_title_deed'], order: 1 },
  { ruleId: 'CHK-BLD-01', ruleVersion: '1.0.0', title: 'Approved Building Plan (PWD/Competent Authority)', description: 'Master plan and building plan approved by planning authority', isRequired: true, documentTypes: ['building_plan_approval'], order: 2 },
  { ruleId: 'CHK-OCC-01', ruleVersion: '1.0.0', title: 'Occupancy / Completion Certificate', description: 'Building completion or occupancy certificate', isRequired: true, documentTypes: ['occupancy_certificate'], order: 3 },
  { ruleId: 'CHK-FIRE-01', ruleVersion: '1.0.0', title: 'Fire Safety Certificate / NOC', description: 'Valid Fire Safety NOC from Fire Service authority', isRequired: true, documentTypes: ['fire_safety_noc'], order: 4 },
  { ruleId: 'CHK-STR-01', ruleVersion: '1.0.0', title: 'Structural Stability Certificate', description: 'Structural stability certificate from licensed engineer', isRequired: true, documentTypes: ['structural_stability'], order: 5 },
  { ruleId: 'CHK-SOC-01', ruleVersion: '1.0.0', title: 'Society / Trust / Company Registration', description: 'Certificate and Memorandum of Association', isRequired: true, documentTypes: ['society_trust_registration'], order: 6 },
  { ruleId: 'CHK-FAC-01', ruleVersion: '1.0.0', title: 'Faculty List & Cadre Ratio Document', description: 'Faculty list, cadre ratio 1:2:6 compliance', isRequired: true, documentTypes: ['faculty_cadre_ratio'], order: 7 },
  { ruleId: 'CHK-SAL-01', ruleVersion: '1.0.0', title: 'Faculty Salary Bank Statements', description: 'Bank statements showing salary disbursements', isRequired: true, documentTypes: ['salary_bank_statement'], order: 8 },
  { ruleId: 'CHK-AFF-01', ruleVersion: '1.0.0', title: 'Affidavit for Regulatory Compliance', description: 'Notarized institutional compliance affidavit', isRequired: true, documentTypes: ['affidavit_compliance'], order: 9 },
];

// Helper to ensure default categories exist
async function ensureDefaultCategories() {
  const count = await ApplicationCategory.countDocuments();
  if (count === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await ApplicationCategory.create(cat);
    }
  }
}

// GET /api/applications/categories
const listCategories = async (req, res, next) => {
  try {
    await ensureDefaultCategories();
    const cats = await ApplicationCategory.find({ isActive: true }).sort({ code: 1 }).lean();
    res.json({ success: true, data: cats });
  } catch (err) {
    next(err);
  }
};

// POST /api/applications
const createApplication = async (req, res, next) => {
  try {
    const {
      categoryId,
      category,
      applicationType,
      type,
      academicYear = '2026-2027',
      institutionDetails,
      contactPerson,
      programmes,
    } = req.body;
    const user = req.user;

    await ensureDefaultCategories();

    // 1. Resolve Category
    const categoryKey = categoryId || category || applicationType || type;
    if (!categoryKey) {
      return res.status(400).json({ success: false, message: 'Category or application type is required' });
    }

    let resolvedCategory = null;
    if (mongoose.Types.ObjectId.isValid(categoryKey)) {
      resolvedCategory = await ApplicationCategory.findById(categoryKey);
    }

    if (!resolvedCategory) {
      const codeLookup = TYPE_MAP[String(categoryKey).toLowerCase()] || String(categoryKey).toUpperCase();
      resolvedCategory = await ApplicationCategory.findOne({
        $or: [
          { code: codeLookup },
          { code: String(categoryKey).toUpperCase() },
          { name: new RegExp(String(categoryKey).replace(/_/g, ' '), 'i') },
        ],
      });
    }

    if (!resolvedCategory) {
      resolvedCategory = await ApplicationCategory.findOne({ code: 'EOA' }) || await ApplicationCategory.findOne();
    }

    if (!resolvedCategory) {
      return res.status(400).json({ success: false, message: 'Invalid application category' });
    }

    // 2. Resolve Institution
    let institutionId = user.institution;
    if (!institutionId) {
      if (institutionDetails?.name?.trim()) {
        let inst = null;
        if (institutionDetails.aictePermanentId) {
          inst = await Institution.findOne({ aicteId: institutionDetails.aictePermanentId.trim() });
        }
        if (!inst) {
          inst = await Institution.findOne({ name: institutionDetails.name.trim() });
        }
        if (!inst) {
          inst = await Institution.create({
            name: institutionDetails.name.trim(),
            aicteId: institutionDetails.aictePermanentId?.trim() || undefined,
            address: {
              street: institutionDetails.address || '',
              city: institutionDetails.district || '',
              state: institutionDetails.state || '',
              pincode: institutionDetails.pinCode || '',
            },
            type: ['deemed_university', 'central_university'].includes(institutionDetails.institutionType)
              ? 'university'
              : 'college',
            createdBy: user._id,
            members: [user._id],
          });
        }
        institutionId = inst._id;
        await User.findByIdAndUpdate(user._id, { institution: inst._id });
      } else {
        let inst = await Institution.findOne();
        if (!inst) {
          inst = await Institution.create({
            name: 'Pramaan Institute of Technology & Management',
            aicteId: '1-10928374',
            createdBy: user._id,
            members: [user._id],
          });
        }
        institutionId = inst._id;
        await User.findByIdAndUpdate(user._id, { institution: inst._id });
      }
    }

    // 3. Load or create Checklist
    let checklist = await Checklist.findOne({
      category: resolvedCategory._id,
      academicYear,
      isActive: true,
    }).sort({ version: -1 });

    if (!checklist) {
      checklist = await Checklist.create({
        category: resolvedCategory._id,
        academicYear,
        version: '1.0.0',
        items: STANDARD_CHECKLIST_ITEMS,
        isActive: true,
        createdBy: user._id,
        illustrativeOnly: false,
      });
    }

    const app = await Application.create({
      institution: institutionId,
      submittedBy: user._id,
      category: resolvedCategory._id,
      academicYear,
      applicationType: applicationType || resolvedCategory.code.toLowerCase(),
      institutionDetails: institutionDetails || null,
      contactPerson: contactPerson || null,
      programmes: programmes || [],
      checklistVersion: checklist?.version || '1.0.0',
      status: 'draft',
    });

    await logAuditEvent({
      eventType: 'application_created',
      actor: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      application: app._id,
      detail: { applicationNumber: app.applicationNumber, categoryId: resolvedCategory._id, academicYear },
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
    else if (role === 'reviewer') {
      const hasAssigned = await Application.exists({ assignedReviewer: userId });
      if (hasAssigned) filter.assignedReviewer = userId;
    }
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

    let checklist = await Checklist.findOne({
      category: app.category,
      academicYear: app.academicYear,
      isActive: true,
    })
      .sort({ version: -1 })
      .populate('category', 'name code')
      .lean();

    if (!checklist) {
      checklist = await Checklist.findOne({ category: app.category, isActive: true })
        .populate('category', 'name code')
        .lean();
    }

    const documents = await Document.find({ application: req.params.id, isLatestVersion: true }).lean();
    const uploadedTypes = new Set(documents.map((d) => d.documentType));

    const rawItems = checklist?.items?.length ? checklist.items : STANDARD_CHECKLIST_ITEMS;
    const items = rawItems.map((item) => {
      const isUploaded =
        (item.documentTypes || []).some((dt) => uploadedTypes.has(dt)) ||
        documents.some((d) => d.checklistItemRuleId === item.ruleId);
      return {
        ...(item.toObject ? item.toObject() : item),
        name: item.title,
        status: isUploaded ? 'completed' : 'pending',
      };
    });

    res.json({
      success: true,
      data: {
        ...(checklist || {}),
        items,
        checklist: items,
      },
      items,
      checklist: items,
      message: checklist ? null : 'Standard AICTE mandatory checklist applies',
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
  listCategories,
};
