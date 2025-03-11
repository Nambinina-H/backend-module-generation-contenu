const express = require('express');
const router = express.Router();
const publishController = require('../controllers/publishController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/', verifyToken, publishController.publish);

module.exports = router;
