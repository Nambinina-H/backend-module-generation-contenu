const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken } = require('../middlewares/authMiddleware');

// Endpoint pour récupérer les statistiques hebdomadaires
router.get('/weekly', verifyToken, analyticsController.getWeeklyAnalytics);

module.exports = router;
