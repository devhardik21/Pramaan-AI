const express = require('express');
const router = express.Router();
const {
  getDocument,
  downloadDocument,
  correctField,
} = require('../controllers/document.controller');
const { verifyDocument, getVerifications } = require('../controllers/verification.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/:id', getDocument);
router.get('/:id/download', downloadDocument);
router.patch('/:id/fields/:fieldId', correctField);
router.post('/:id/verify', authorize('reviewer', 'admin'), verifyDocument);
router.get('/:id/verifications', getVerifications);

module.exports = router;
