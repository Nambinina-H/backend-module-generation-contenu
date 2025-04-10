const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/generate', verifyToken, videoController.generateVideo);
router.get('/credits', verifyToken, videoController.getCredits);
router.post('/description', verifyToken, videoController.generateVideoDescription);
router.get('/generation/:id', verifyToken, videoController.getGenerationById);
router.get('/generations', verifyToken, videoController.listGenerations);
router.delete('/generation/:id', verifyToken, videoController.deleteGeneration);
router.post('/extend', verifyToken, videoController.extendVideo);
router.post('/reverse-extend', verifyToken, videoController.reverseExtendVideo);
router.post('/callback', videoController.handleCallback);
router.post('/generation/:id/audio', verifyToken, videoController.addAudio);

module.exports = router;
