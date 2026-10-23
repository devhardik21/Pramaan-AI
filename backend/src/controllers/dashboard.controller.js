const Application = require('../models/Application');
const Finding = require('../models/Finding');
const Document = require('../models/Document');
const Notification = require('../models/Notification');
const Institution = require('../models/Institution');

// GET /api/dashboard/summary
const getSummary = async (req, res, next) => {
  try {
    const { role, institution: instId, _id: userId } = req.user;

    let appFilter = {};
    if (role === 'institution_user') {
      appFilter.institution = instId;
    } else if (role === 'reviewer') {
      appFilter.assignedReviewer = userId;
    }
    // admin sees all

    const [
      totalApplications,
      statusCounts,
      openFindings,
      recentApplications,
      unreadNotifications,
    ] = await Promise.all([
      Application.countDocuments(appFilter),
      Application.aggregate([
        { $match: appFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Finding.countDocuments({
        ...(appFilter.institution
          ? { application: { $in: await Application.find(appFilter).distinct('_id') } }
          : role === 'reviewer'
          ? { application: { $in: await Application.find(appFilter).distinct('_id') } }
          : {}),
        status: 'open',
      }),
      Application.find(appFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('category', 'name code')
        .populate('institution', 'name')
        .lean(),
      Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    const statusMap = {};
    for (const item of statusCounts) {
      statusMap[item._id] = item.count;
    }

    res.json({
      success: true,
      data: {
        totalApplications,
        statusCounts: statusMap,
        openFindings,
        recentApplications,
        unreadNotifications,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSummary };
