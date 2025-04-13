const express = require('express');
const multer = require('multer');
const router = express.Router();
const { verifyToken } = require('../../middlewares/authMiddleware');
const twitterOAuthController = require('../../controllers/oauth/twitterOAuthController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 512 * 1024 * 1024 } // Limite de 512MB pour les vidéos
});

router.get('/auth-url', verifyToken, twitterOAuthController.getAuthUrl);
router.get('/callback', verifyToken, twitterOAuthController.handleCallback);
router.post('/disconnect', verifyToken, twitterOAuthController.disconnect);
router.post('/publish', verifyToken, upload.array('media'), twitterOAuthController.publishTweet); // Ajout de multer ici
router.get('/check-connection', verifyToken, twitterOAuthController.checkConnection);

module.exports = router;
