// controllers/authController.js
const supabase = require('../services/supabaseService');

// Inscription d'un utilisateur
exports.register = async (req, res) => {
  console.log("Données reçues :", req.body); // Ajout de log pour voir l'email
  const { email, password } = req.body;

  // Vérifier que les champs sont remplis
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  // Vérifier le format de l'email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Format email invalide' });
  }

  // Inscription de l'utilisateur dans Supabase
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    console.error('Erreur Supabase:', error.message);
    return res.status(400).json({ error: error.message });
  }

  res.json({ message: 'Utilisateur créé avec succès', data });
};

// Connexion d'un utilisateur
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Vérifier que les champs sont remplis
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  // Vérifier le format de l'email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Format email invalide' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({
    message: 'Connexion réussie',
    user: data.user,
    token: data.session.access_token // Le token JWT
  });
};

