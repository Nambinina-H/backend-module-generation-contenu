const express = require('express');
const multer = require('multer');
const MediaController = require('../controllers/mediaController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Limite de 10MB
  }
});

const mediaController = new MediaController();

router.post('/upload', upload.single('media'), (req, res) => mediaController.uploadMedia(req, res));

module.exports = router;
