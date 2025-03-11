const supabase = require('../services/supabaseService');

exports.verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Récupérer le token dans l’en-tête

  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error) {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }

  req.user = data.user; // Ajouter l'utilisateur à la requête
  next(); // Passer à la suite
};
