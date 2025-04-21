const express = require('express');
const router = express.Router();
const audioController = require('../controllers/audioController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Endpoint pour générer une description d'audio
router.post('/description', verifyToken, audioController.generateAudioDescription);

module.exports = router;
