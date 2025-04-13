// index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const app = express();

// Importer et exécuter le scheduler pour la planification des publications
require('./utils/scheduler');

// Importer le middleware d'authentification
const { verifyToken } = require('./middlewares/authMiddleware');

// Middlewares globaux
app.use(express.json());
app.use(cors());

// Configuration de express-session
app.use(session({
  secret: process.env.SESSION_SECRET || 'twitter_oauth_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // Secure en production uniquement
    maxAge: 15 * 60 * 1000 // 15 minutes
  }
}));

// Importer les routes
const authRoutes = require('./routes/authRoutes');
const contentRoutes = require('./routes/contentRoutes');
const publishRoutes = require('./routes/publishRoutes');
const logRoutes = require('./routes/logRoutes');
const imageRoutes = require("./routes/imageRoutes");
const mediaRoutes = require('./routes/mediaRoutes');
const apiConfigRoutes = require('./routes/apiConfigRoutes');
const wordpressOAuthRoutes = require('./routes/oauth/wordpressRoutes');
const twitterOAuthRoutes = require('./routes/oauth/twitterRoutes');
const videoRoutes = require('./routes/videoRoutes');

// Utilisation des routes
app.use('/auth', authRoutes);
app.use('/content', contentRoutes);
app.use('/publish', publishRoutes);
app.use('/logs', logRoutes);
app.use("/image", imageRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/config', apiConfigRoutes);
app.use('/oauth/wordpress', wordpressOAuthRoutes);
app.use('/oauth/twitter', twitterOAuthRoutes);
app.use('/video', videoRoutes);

const { initializeSupabaseClient } = require('./utils/scheduler');
const ApiConfigService = require('./services/apiConfigService');

// Charger les clés API au démarrage
ApiConfigService.loadApiKeys().then(() => {
  initializeSupabaseClient(); // Initialiser le client Supabase pour le scheduler
  const PORT = process.env.PORT || 3001;
  const server = app.listen(PORT, () => {
    console.log(`Backend lancé sur le port ${PORT}`);
  });
  
  module.exports = server;
}).catch(error => {
  console.error('Erreur lors du démarrage:', error);
  process.exit(1);
});

// Configuraton CORS pour autoriser uniquement le front-end sur Vercel
const corsOptions = {
  origin: 'https://module-generation-contenu.vercel.app', // URL de votre front-end
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
