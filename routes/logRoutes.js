const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/', verifyToken, logController.logAction);

module.exports = router;
