const express = require('express');
const router = express.Router();
const multer = require('multer');
const mediaController = require('../controllers/media.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authenticateApiKey } = require('../middlewares/apiKey.middleware');

// Accept up to 16MB (WhatsApp max for documents)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 },
});

// Support both JWT and API key auth
router.use((req, res, next) => {
  authenticate(req, res, (err) => {
    if (err || !req.user) return authenticateApiKey(req, res, next);
    next();
  });
});

router.post('/upload', upload.single('file'), mediaController.uploadMedia);
router.get('/:mediaId', mediaController.downloadMedia);
router.get('/:mediaId/url', mediaController.getMediaUrl);

module.exports = router;
