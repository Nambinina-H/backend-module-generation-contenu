const TwitterOAuthService = require('../../services/oauth/twitterOAuthService');
const { logAction } = require('../../services/logService');
const { supabase } = require('../../services/supabaseService');

exports.getAuthUrl = async (req, res) => {
  try {
    console.log('📝 Génération d\'URL d\'authentification Twitter pour l\'utilisateur:', req.user.id);
    
    // Générer URL d'autorisation et stocker les informations de vérification
    const authInfo = await TwitterOAuthService.getAuthorizationUrl();
    
    console.log('💾 Stockage des informations d\'authentification dans oauth_states:', {
      userId: req.user.id,
      platform: 'twitterClient',
      stateLength: authInfo.state.length,
      codeVerifierLength: authInfo.codeVerifier.length
    });
    
    // Stocker temporairement codeVerifier, state, etc. pour les vérifier lors du callback
    const { data, error } = await supabase
      .from('oauth_states')
      .insert([{
        user_id: req.user.id,
        platform: 'twitterClient',
        state: authInfo.state,
        code_verifier: authInfo.codeVerifier,
        created_at: new Date().toISOString()
      }])
      .select();
    
    if (error) {
      console.error('❌ Erreur de stockage Supabase:', error);
      throw new Error('Erreur lors du stockage des informations d\'authentification');
    }
    
    console.log('✅ Informations d\'authentification stockées avec succès:', {
      record: data ? 'créé' : 'non créé',
      timestamp: new Date().toISOString()
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
    // Récupérer les informations de vérification stockées
    console.log('🔍 Recherche du state dans la base de données:', { 
      userId, 
      platform: 'twitterClient', 
      state 
    });
    
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'twitterClient')
      .eq('state', state)
      .single();

    if (stateError || !stateData) {
      console.error('❌ State non trouvé:', { error: stateError?.message || 'State non trouvé' });
      return res.status(400).json({ error: 'État de vérification invalide ou expiré' });
    }

    console.log('✅ State trouvé dans la base de données:', { 
      recordId: stateData.id,
      codeVerifierLength: stateData.code_verifier?.length,
      codeVerifierSample: stateData.code_verifier?.substring(0, 10) + '...',
      created_at: stateData.created_at
    });

    // Vérifier que l'état n'est pas trop ancien
    const stateCreatedAt = new Date(stateData.created_at);
    const now = new Date();
    const timeDiff = now - stateCreatedAt;
    console.log('⏱️ Âge du state:', { 
      createdAt: stateCreatedAt.toISOString(),
      now: now.toISOString(),
      ageMinutes: Math.round(timeDiff / 60000),
      ageMilliseconds: timeDiff
    });
    
    if (timeDiff > 900000) { // 15 minutes en millisecondes
      console.error('⏰ State expiré:', { 
        createdAt: stateCreatedAt.toISOString(),
        expiresAt: new Date(stateCreatedAt.getTime() + 900000).toISOString()
      });
      return res.status(400).json({ error: 'La session d\'authentification a expiré' });
    }

    console.log('🔄 Échange du code contre un token avec:', { 
      codeLength: code.length,
      codeSample: code.substring(0, 10) + '...',
      codeVerifierLength: stateData.code_verifier.length,
      codeVerifierSample: stateData.code_verifier.substring(0, 10) + '...'
    });
    
    const result = await TwitterOAuthService.exchangeCodeForToken(code, stateData.code_verifier, userId)
      .catch(error => {
        console.error('🚨 Erreur détaillée lors de l\'échange de code:', {
          message: error.message,
          stack: error.stack,
          fullError: JSON.stringify(error, null, 2)
        });
        throw error;
      });
    
    // Nettoyer les données temporaires
    console.log('🧹 Nettoyage des données temporaires');
    await supabase
      .from('oauth_states')
      .delete()
      .eq('user_id', userId)
      .eq('platform', 'twitterClient');

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
