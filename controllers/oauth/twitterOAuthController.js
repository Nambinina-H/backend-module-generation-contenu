const TwitterOAuthService = require('../../services/oauth/twitterOAuthService');
const { logAction } = require('../../services/logService');
const { supabase } = require('../../services/supabaseService');

exports.getAuthUrl = async (req, res) => {
  try {
    // Générer URL d'autorisation et stocker les informations de vérification
    const authInfo = await TwitterOAuthService.getAuthorizationUrl();
    
    // Stocker temporairement codeVerifier, state, etc. pour les vérifier lors du callback
    // On pourrait utiliser Redis ou une autre solution de stockage temporaire
    // Pour cet exemple, on les stocke dans Supabase
    const { error } = await supabase
      .from('oauth_states')
      .insert([{
        user_id: req.user.id,
        platform: 'twitterClient', // Utiliser twitterClient au lieu de twitter pour cohérence
        state: authInfo.state,
        code_verifier: authInfo.codeVerifier,
        created_at: new Date().toISOString()
      }]);
    
    if (error) {
      throw new Error('Erreur lors du stockage des informations d\'authentification');
    }
    
    res.json({ url: authInfo.url });
  } catch (error) {
    console.error('Erreur lors de la génération de l\'URL d\'authentification Twitter:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.handleCallback = async (req, res) => {
  const { code, state } = req.query;
  const userId = req.user.id;

  if (!code || !state) {
    return res.status(400).json({ error: 'Code d\'autorisation ou état manquant' });
  }

  try {
    // Récupérer les informations de vérification stockées
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'twitterClient') // Utiliser twitterClient au lieu de twitter pour cohérence
      .eq('state', state)
      .single();

    if (stateError || !stateData) {
      return res.status(400).json({ error: 'État de vérification invalide ou expiré' });
    }

    // Vérifier que l'état n'est pas trop ancien (par exemple, pas plus de 15 minutes)
    const stateCreatedAt = new Date(stateData.created_at);
    const now = new Date();
    const timeDiff = now - stateCreatedAt;
    if (timeDiff > 900000) { // 15 minutes en millisecondes
      return res.status(400).json({ error: 'La session d\'authentification a expiré' });
    }

    const result = await TwitterOAuthService.exchangeCodeForToken(code, stateData.code_verifier, userId);
    
    // Nettoyer les données temporaires
    await supabase
      .from('oauth_states')
      .delete()
      .eq('user_id', userId)
      .eq('platform', 'twitterClient'); // Utiliser twitterClient au lieu de twitter pour cohérence

    await logAction(userId, 'twitter_oauth_connect', `Connexion Twitter OAuth réussie pour @${result.username}`);
    res.json(result);
  } catch (error) {
    console.error('Erreur OAuth Twitter:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.disconnect = async (req, res) => {
  const userId = req.user.id;

  try {
    await TwitterOAuthService.disconnectUser(userId);
    await logAction(userId, 'twitter_oauth_disconnect', 'Déconnexion Twitter réussie');
    res.json({ message: 'Déconnexion Twitter réussie' });
  } catch (error) {
    console.error('Erreur déconnexion Twitter:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.publishTweet = async (req, res) => {
  const { content, mediaUrl } = req.body;
  const userId = req.user.id;

  if (!content) {
    return res.status(400).json({ error: 'Le contenu du tweet est obligatoire' });
  }

  try {
    let mediaId;
    if (mediaUrl) {
      mediaId = await TwitterOAuthService.uploadMedia(userId, mediaUrl);
    }
    
    const tweet = await TwitterOAuthService.publishTweet(userId, content, mediaId ? [mediaId] : []);
    await logAction(userId, 'twitter_publish', `Tweet publié : ${tweet.data.id}`);
    
    res.json({
      message: 'Tweet publié avec succès',
      tweetId: tweet.data.id,
      tweetUrl: `https://twitter.com/user/status/${tweet.data.id}`
    });
  } catch (error) {
    console.error('Erreur lors de la publication du tweet:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.checkConnection = async (req, res) => {
  const userId = req.user.id;
  
  try {
    const isConnected = await TwitterOAuthService.isUserConnected(userId);
    res.json({ isConnected });
  } catch (error) {
    console.error('Erreur lors de la vérification de la connexion Twitter:', error);
    res.status(500).json({ error: error.message });
  }
};
