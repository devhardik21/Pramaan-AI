const express = require('express');
const router = express.Router();
const {
  uploadSource,
  listSources,
  searchRegulations,
  askRegulations,
} = require('../controllers/regulatory.controller');
const { authenticate, authorize } = require('../middleware/auth');
const { regulatoryUpload, handleUploadError } = require('../middleware/upload');

router.use(authenticate);

router.get('/sources', listSources);
router.post(
  '/sources',
  authorize('admin'),
  regulatoryUpload.single('document'),
  handleUploadError,
  uploadSource
);
router.get('/search', searchRegulations);
router.post('/ask', askRegulations);

module.exports = router;
