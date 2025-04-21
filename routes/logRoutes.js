const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/authMiddleware');
const logController = require('../controllers/logController');

router.get('/', verifyToken, logController.getLogs);

module.exports = router;
