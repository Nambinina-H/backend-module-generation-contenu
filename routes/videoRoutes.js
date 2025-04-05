const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/generate', verifyToken, videoController.generateVideo);

module.exports = router;
