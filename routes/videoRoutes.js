const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/generate', verifyToken, videoController.generateVideo);
router.get('/credits', verifyToken, videoController.getCredits);
router.get('/generation/:id', verifyToken, videoController.getGenerationById);
router.get('/generations', verifyToken, videoController.listGenerations);
router.delete('/generation/:id', verifyToken, videoController.deleteGeneration);

module.exports = router;
