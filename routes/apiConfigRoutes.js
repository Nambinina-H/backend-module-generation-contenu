const express = require('express');
const router = express.Router();
const apiConfigController = require('../controllers/apiConfigController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/add', verifyToken, apiConfigController.addApiKey);
router.get('/list', verifyToken, apiConfigController.getApiKeys);
router.put('/update/:id', verifyToken, apiConfigController.updateApiKey);
router.delete('/delete/:id', verifyToken, apiConfigController.deleteApiKey);

module.exports = router;
