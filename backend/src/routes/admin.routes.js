const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));

router.get('/users', listUsers);
router.patch('/users/:id/role', updateUserRole);

router.get('/institutions', listInstitutions);

router.get('/categories', listCategories);
router.post('/categories', createCategory);

router.get('/rules', listRules);
router.post('/rules', createRule);
router.patch('/rules/:id', updateRule);

router.get('/checklists', listChecklists);
router.post('/checklists', createChecklist);

module.exports = router;
