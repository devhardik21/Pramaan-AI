const express = require('express');
const router = express.Router();
const {
  createApplication,
  listApplications,
  getApplication,
  getChecklist,
  updateStatus,
  getFindings,
  getAllFindings,
  getAudit,
  requestRectification,
} = require('../controllers/application.controller');
const { uploadDocument, listApplicationDocuments } = require('../controllers/document.controller');
const { runValidation } = require('../controllers/validation.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { documentUpload, handleUploadError } = require('../middleware/upload');

router.use(authenticate);

// Global findings monitor (placed before /:id routes)
router.get('/findings/all', getAllFindings);

router.post('/', authorize('institution_user', 'admin'), createApplication);
router.get('/', listApplications);
router.get('/:id', getApplication);
router.get('/:id/checklist', getChecklist);
router.patch('/:id/status', authorize('reviewer', 'admin'), updateStatus);
router.get('/:id/findings', getFindings);
router.get('/:id/audit', getAudit);
router.post('/:id/rectifications', authorize('reviewer', 'admin'), requestRectification);

// Document sub-resources
router.get('/:id/documents', listApplicationDocuments);
router.post(
  '/:id/documents',
  authorize('institution_user', 'admin'),
  documentUpload.single('document'),
  handleUploadError,
  uploadDocument
);

// Validation
router.post('/:id/validate', authorize('reviewer', 'admin', 'institution_user'), runValidation);

module.exports = router;
