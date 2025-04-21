const express = require('express');
const router = express.Router();
const publicationController = require('../controllers/publicationController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/all', verifyToken, publicationController.getAllPublications); // Admin
router.get('/user', verifyToken, publicationController.getUserPublications); // Utilisateur

module.exports = router;
