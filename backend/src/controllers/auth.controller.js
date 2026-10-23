const User = require('../models/User');
const Institution = require('../models/Institution');
const { signToken } = require('../utils/jwt');
const { logAuditEvent } = require('../utils/audit');

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password, institutionName, aicteId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Create institution if provided
    let institution = null;
    if (institutionName) {
      institution = await Institution.create({ name: institutionName, aicteId });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'institution_user',
      institution: institution?._id,
    });

    if (institution) {
      institution.createdBy = user._id;
      institution.members = [user._id];
      await institution.save();
    }

    await logAuditEvent({
      eventType: 'user_created',
      actor: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      detail: { name, email, role: 'institution_user' },
    });

    const token = signToken({ id: user._id, role: user.role });
    res.status(201).json({ success: true, token, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is inactive' });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    await logAuditEvent({
      eventType: 'user_login',
      actor: user._id,
      actorEmail: user.email,
      actorRole: user.role,
      detail: { loginAt: new Date() },
    });

    const token = signToken({ id: user._id, role: user.role });
    res.json({ success: true, token, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('institution');
    res.json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, me };
