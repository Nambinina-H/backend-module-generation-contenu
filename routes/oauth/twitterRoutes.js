const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/authMiddleware');
const twitterOAuthController = require('../../controllers/oauth/twitterOAuthController');

router.get('/auth-url', verifyToken, twitterOAuthController.getAuthUrl);
router.get('/callback', verifyToken, twitterOAuthController.handleCallback);
router.post('/disconnect', verifyToken, twitterOAuthController.disconnect);
router.post('/publish', verifyToken, twitterOAuthController.publishTweet);
router.get('/check-connection', verifyToken, twitterOAuthController.checkConnection);

module.exports = router;
