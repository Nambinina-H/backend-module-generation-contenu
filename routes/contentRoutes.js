const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/generate', verifyToken, contentController.generate);
router.get('/list', verifyToken, contentController.listUserContent);
router.put('/update/:contentId', verifyToken, contentController.updateContent);
router.delete('/delete/:contentId', verifyToken, contentController.deleteContent);

module.exports = router;
