// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Importer et exécuter le scheduler pour la planification des publications
require('./utils/scheduler');

// Importer le middleware d'authentification
const { verifyToken } = require('./middlewares/authMiddleware');

// Middlewares globaux
app.use(express.json());
app.use(cors());

// Importer les routes
const authRoutes = require('./routes/authRoutes');
const contentRoutes = require('./routes/contentRoutes');
const publishRoutes = require('./routes/publishRoutes');
const logRoutes = require('./routes/logRoutes');

// Utilisation des routes
app.use('/auth', authRoutes);
app.use('/content', contentRoutes);
app.use('/publish', publishRoutes);
app.use('/logs', logRoutes);

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Backend lancé sur le port ${PORT}`);
});

// Configuraton CORS pour autoriser uniquement le front-end sur Vercel
const corsOptions = {
  origin: 'https://module-generation-contenu.vercel.app', // URL de votre front-end
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));


module.exports = server; // Exporter le serveur pour les tests
