const express = require("express");
const router = express.Router();
const imageController = require("../controllers/imageController");
const { verifyToken } = require("../middlewares/authMiddleware"); // Vérification du token JWT

router.post("/generate", verifyToken, imageController.generate);

module.exports = router;
