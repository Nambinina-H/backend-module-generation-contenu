const express = require('express');
const router = express.Router();
const publishController = require('../controllers/publishController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/schedule', verifyToken, publishController.schedulePublication);
router.post('/now', verifyToken, publishController.publishNow);
router.post('/cancel', verifyToken, publishController.cancelScheduledPublication);

module.exports = router;
