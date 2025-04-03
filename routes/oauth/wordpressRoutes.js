const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/authMiddleware');
const wordpressOAuthController = require('../../controllers/oauth/wordpressOAuthController');

// Route de callback OAuth2
router.get('/callback', verifyToken, wordpressOAuthController.handleCallback);

// Route de déconnexion
router.post('/disconnect', verifyToken, wordpressOAuthController.disconnect);

module.exports = router;
