const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', verifyToken, (req, res) => {
  res.json({ message: 'Profil utilisateur', user: req.user });
});
router.put('/set-role', verifyToken, authController.setUserRole);
router.get('/list-users', verifyToken, authController.listUsers);
router.delete('/delete/:userId', verifyToken, authController.deleteUser);


module.exports = router;
