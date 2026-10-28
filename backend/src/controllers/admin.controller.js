const User = require('../models/User');
const ApplicationCategory = require('../models/ApplicationCategory');
const ValidationRule = require('../models/ValidationRule');
const Checklist = require('../models/Checklist');
const Institution = require('../models/Institution');
const Application = require('../models/Application');
const Document = require('../models/Document');
const Finding = require('../models/Finding');
const { logAuditEvent } = require('../utils/audit');

// GET /api/admin/users
const listUsers = async (req, res, next) => {
  try {
    const users = await User.find().populate('institution', 'name').sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/users/:id/role
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['institution_user', 'reviewer', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await logAuditEvent({
      eventType: 'user_role_changed',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      targetUser: user._id,
      detail: { newRole: role },
    });

    res.json({ success: true, data: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/categories
const listCategories = async (req, res, next) => {
  try {
    const cats = await ApplicationCategory.find().sort({ code: 1 }).lean();
    res.json({ success: true, data: cats });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/categories
const createCategory = async (req, res, next) => {
  try {
    const { code, name, description } = req.body;
    const cat = await ApplicationCategory.create({ code, name, description, createdBy: req.user._id });

    await logAuditEvent({
      eventType: 'admin_rule_created',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      detail: { type: 'category', code, name },
    });

    res.status(201).json({ success: true, data: cat });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/rules
const listRules = async (req, res, next) => {
  try {
    const rules = await ValidationRule.find()
      .populate('category', 'name code')
      .sort({ ruleId: 1, version: -1 })
      .lean();
    res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/rules
const createRule = async (req, res, next) => {
  try {
    const rule = await ValidationRule.create({ ...req.body, createdBy: req.user._id });

    await logAuditEvent({
      eventType: 'admin_rule_created',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      detail: { ruleId: rule.ruleId, version: rule.version, name: rule.name },
    });

    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/rules/:id
const updateRule = async (req, res, next) => {
  try {
    const rule = await ValidationRule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

    await logAuditEvent({
      eventType: 'admin_rule_updated',
      actor: req.user._id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      detail: { ruleId: rule.ruleId, changes: req.body },
    });

    res.json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/checklists
const listChecklists = async (req, res, next) => {
  try {
    const checklists = await Checklist.find()
      .populate('category', 'name code')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: checklists });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/checklists
const createChecklist = async (req, res, next) => {
  try {
    const checklist = await Checklist.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: checklist });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/institutions
const listInstitutions = async (req, res, next) => {
  try {
    const institutions = await Institution.find().sort({ name: 1 }).lean();

    const enriched = await Promise.all(
      institutions.map(async (inst) => {
        const apps = await Application.find({ institution: inst._id })
          .select('status academicYear applicationType createdAt')
          .sort({ createdAt: -1 })
          .lean();

        const appIds = apps.map((a) => a._id);

        const [docs, openFindings] = await Promise.all([
          Document.countDocuments({ application: { $in: appIds } }),
          Finding.countDocuments({
            application: { $in: appIds },
            status: { $in: ['open', 'escalated'] },
          }),
        ]);

        const statusCounts = apps.reduce((acc, a) => {
          acc[a.status] = (acc[a.status] || 0) + 1;
          return acc;
        }, {});

        return {
          ...inst,
          totalApplications: apps.length,
          documentCount: docs,
          openFindings,
          statusCounts,
          latestApplication: apps[0] || null,
          complianceScore: openFindings === 0 ? 100 : Math.max(10, 100 - openFindings * 8),
        };
      })
    );

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listUsers,
  updateUserRole,
  listCategories,
  createCategory,
  listRules,
  createRule,
  updateRule,
  listChecklists,
  createChecklist,
  listInstitutions,
};
