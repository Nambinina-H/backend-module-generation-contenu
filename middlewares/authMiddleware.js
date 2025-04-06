const { supabase } = require('../services/supabaseService'); // Ensure correct import

exports.verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    console.error("🚨 Token manquant dans l'en-tête de la requête");
    return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
  }

  // Vérifier le token et récupérer l'utilisateur
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    console.error("🚨 Erreur de validation du token :", error || "Utilisateur non trouvé");
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }

  // Récupérer le rôle de l'utilisateur depuis `profiles`
  const { data: userProfile, error: roleError } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', data.user.id)
    .single();

  if (roleError || !userProfile) {
    console.error("🚨 Erreur lors de la récupération du rôle :", roleError);
    return res.status(500).json({ error: 'Impossible de récupérer le rôle utilisateur.' });
  }

  // Vérifier si l'utilisateur est connecté à WordPress
  const { data: wordpressConfig, error: wordpressError } = await supabase
    .from('api_configurations')
    .select('*')
    .eq('user_id', data.user.id)
    .eq('platform', 'wordPressClient')
    .single();

  const isWordPressConnected = !wordpressError && wordpressConfig;

  // Ajouter les infos utilisateur, son rôle et l'état de connexion WordPress à `req.user`
  req.user = { ...data.user, role: userProfile.role, isWordPressConnected };
  next();
};
