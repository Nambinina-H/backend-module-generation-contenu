const TwitterOAuthService = require('../../services/oauth/twitterOAuthService');
const { logAction } = require('../../services/logService');
const { supabase } = require('../../services/supabaseService');

exports.getAuthUrl = async (req, res) => {
  try {
    console.log('📝 Génération d\'URL d\'authentification Twitter pour l\'utilisateur:', req.user.id);
    
    // Générer l'URL d'autorisation et les informations de vérification
    const authInfo = await TwitterOAuthService.getAuthorizationUrl();
    
    // Stocker les informations d'authentification dans la session
    req.session.twitterOAuth = {
      userId: req.user.id,
      state: authInfo.state,
      codeVerifier: authInfo.codeVerifier,
      createdAt: new Date().toISOString()
    };
    
    console.log('💾 Informations d\'authentification stockées en session:', {
      userId: req.user.id,
      stateLength: authInfo.state.length,
      codeVerifierLength: authInfo.codeVerifier.length
    });
    
    res.json({ url: authInfo.url });
  } catch (error) {
    console.error('❌ Erreur lors de la génération de l\'URL d\'authentification Twitter:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.handleCallback = async (req, res) => {
  const { code, state } = req.query;
  const userId = req.user.id;

  console.log('📥 Callback Twitter reçu:', { 
    codePresent: !!code,
    codeLength: code?.length,
    state,
    userId 
  });

  if (!code || !state) {
    console.error('❌ Code ou state manquant dans le callback');
    return res.status(400).json({ error: 'Code d\'autorisation ou état manquant' });
  }

  try {
    // Récupérer les informations de vérification depuis la session
    const oauthData = req.session.twitterOAuth;
    
    if (!oauthData || oauthData.state !== state || oauthData.userId !== userId) {
      console.error('❌ Données de session invalides ou state ne correspondant pas:', {
        sessionExists: !!oauthData,
        stateMatches: oauthData?.state === state,
        userMatches: oauthData?.userId === userId
      });
      return res.status(400).json({ error: 'Session invalide ou expirée' });
    }

    console.log('✅ Données de session trouvées:', { 
      userId: oauthData.userId,
      codeVerifierLength: oauthData.codeVerifier.length,
      codeVerifierSample: oauthData.codeVerifier.substring(0, 10) + '...',
      createdAt: oauthData.createdAt
    });

    // Vérifier que la session n'est pas trop ancienne
    const sessionCreatedAt = new Date(oauthData.createdAt);
    const now = new Date();
    const timeDiff = now - sessionCreatedAt;
    
    if (timeDiff > 900000) { // 15 minutes en millisecondes
      console.error('⏰ Session expirée:', { 
        createdAt: sessionCreatedAt.toISOString(),
        expiresAt: new Date(sessionCreatedAt.getTime() + 900000).toISOString()
      });
      return res.status(400).json({ error: 'La session d\'authentification a expiré' });
    }

    // Échanger le code contre un token
    const result = await TwitterOAuthService.exchangeCodeForToken(code, oauthData.codeVerifier, userId);
    
    // Nettoyer les données temporaires de la session
    delete req.session.twitterOAuth;

    await logAction(userId, 'twitter_oauth_connect', `Connexion Twitter OAuth réussie pour @${result.username}`);
    
    console.log('🎉 Authentification Twitter réussie pour:', { 
      userId,
      twitterUsername: result.username
    });
    
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur OAuth Twitter:', {
      message: error.message,
      stack: error.stack
    });
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
    let mediaIds = [];
    if (mediaUrl) {
      // Note: L'upload de médias n'est pas encore implémenté dans cette version simplifiée
      // Vous devez implémenter cette fonctionnalité séparément
      console.log("⚠️ L'upload de média n'est pas implémenté");
    }
    
    const tweet = await TwitterOAuthService.publishTweet(userId, content, mediaIds);
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
