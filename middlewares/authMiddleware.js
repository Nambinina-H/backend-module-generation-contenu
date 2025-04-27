const { supabase } = require('../services/supabaseService'); // Ensure correct import
const { decrypt } = require('../utils/encryptionUtil'); // Importer la fonction de déchiffrement

exports.verifyToken = async (req, res, next) => {
  console.log('🔒 Vérification du token d\'authentification');
  
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    console.error("🚨 Token manquant dans l'en-tête de la requête");
    return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
  }

  console.log('🔍 Validation du token avec Supabase...');
  
  // Vérifier le token et récupérer l'utilisateur
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    console.error("🚨 Erreur de validation du token :", error?.message || "Utilisateur non trouvé");
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }

  console.log('✅ Token valide, utilisateur identifié:', data.user.id, '|', data.user.email);
  
  // Récupérer le rôle de l'utilisateur depuis `profiles`
  console.log('🔍 Récupération du rôle utilisateur...');
  const { data: userProfile, error: roleError } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', data.user.id)
    .single();

  if (roleError || !userProfile) {
    console.error("🚨 Erreur lors de la récupération du rôle :", roleError?.message || "Profil non trouvé");
    return res.status(500).json({ error: 'Impossible de récupérer le rôle utilisateur.' });
  }

  console.log('✅ Rôle utilisateur récupéré:', userProfile.role);

  // Vérifier si l'utilisateur est connecté à WordPress
  console.log('🔍 Vérification de la connexion WordPress...');
  const { data: wordpressConfig, error: wordpressError } = await supabase
    .from('api_configurations')
    .select('*')
    .eq('user_id', data.user.id)
    .eq('platform', 'wordPressClient')
    .single();

  // Vérifier si l'utilisateur est connecté à Twitter
  console.log('🔍 Vérification de la connexion Twitter...');
  const { data: twitterConfig, error: twitterError } = await supabase
    .from('api_configurations')
    .select('*')
    .eq('user_id', data.user.id)
    .eq('platform', 'twitterClient')
    .single();

  // Vérifier si l'utilisateur est connecté à Make.com
  console.log('🔍 Vérification de la connexion Make.com...');
  const { data: makeConfig, error: makeError } = await supabase
    .from('api_configurations')
    .select('*')
    .eq('user_id', data.user.id)
    .eq('platform', 'makeClient')
    .single();

  const isWordPressConnected = !wordpressError && wordpressConfig;
  const isTwitterConnected = !twitterError && twitterConfig;
  
  // Vérifier si la configuration Make contient un webhookURL valide
  let isMakeConnected = false;
  if (!makeError && makeConfig && makeConfig.keys) {
    try {
      const decryptedKeys = JSON.parse(decrypt(makeConfig.keys));
      isMakeConnected = !!decryptedKeys.webhookURL;
    } catch (e) {
      console.error('❌ Erreur de déchiffrement des clés Make.com:', e.message);
    }
  }

  console.log('✅ État des connexions:', {
    wordPress: isWordPressConnected ? 'Connecté' : 'Non connecté',
    twitter: isTwitterConnected ? 'Connecté' : 'Non connecté',
    make: isMakeConnected ? 'Connecté' : 'Non connecté'
  });

  // Ajouter les infos utilisateur, son rôle et l'état des connexions à `req.user`
  req.user = { 
    ...data.user, 
    role: userProfile.role, 
    isWordPressConnected,
    isTwitterConnected,
    isMakeConnected
  };
  
  console.log('✅ Middleware d\'authentification terminé avec succès');
  next();
};
