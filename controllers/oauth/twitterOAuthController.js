const TwitterOAuthService = require('../../services/oauth/twitterOAuthService');
const { logAction } = require('../../services/logService');
const { supabase } = require('../../services/supabaseService');

exports.getAuthUrl = async (req, res) => {
  try {
    console.log('📝 -------- Début de la demande d\'URL d\'authentification Twitter --------');
    console.log('📝 Utilisateur:', req.user.id, '|', req.user.email);
    
    // Utiliser twitter-api-v2 pour générer l'URL d'autorisation
    console.log('📝 Appel du service pour générer l\'URL d\'autorisation');
    const authInfo = await TwitterOAuthService.getAuthorizationUrl();
    
    console.log('📝 URL générée avec succès, longueur:', authInfo.url.length);
    console.log('💾 Stockage des informations d\'authentification dans oauth_states:', {
      userId: req.user.id,
      platform: 'twitterClient',
      stateLength: authInfo.state.length,
      codeVerifierLength: authInfo.codeVerifier.length
    });
    
    // Stocker temporairement codeVerifier, state, etc. dans la base de données
    console.log('💾 Insertion dans la table oauth_states...');
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
      throw new Error('Erreur lors du stockage des informations d\'authentification: ' + error.message);
    }
    
    console.log('✅ Informations d\'authentification stockées avec succès, ID:', data?.[0]?.id);
    console.log('✅ Réponse avec l\'URL d\'authentification envoyée au client');
    console.log('📝 -------- Fin de la demande d\'URL d\'authentification Twitter --------');
    
    res.json({ 
      url: authInfo.url,
      debug: {
        state: authInfo.state,
        storedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors de la génération de l\'URL d\'authentification Twitter:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: error.message });
  }
};

exports.handleCallback = async (req, res) => {
  console.log('📥 -------- Début du traitement du callback Twitter --------');
  
  const { code, state } = req.query;
  const userId = req.user.id;

  console.log('📥 Callback Twitter reçu:', { 
    codePresent: !!code,
    codeLength: code?.length,
    codeSample: code ? `${code.substring(0, 10)}...` : 'absent',
    state,
    userId,
    userEmail: req.user.email 
  });

  if (!code || !state) {
    console.error('❌ Code ou state manquant dans le callback');
    return res.status(400).json({ error: 'Code d\'autorisation ou état manquant' });
  }

  try {
    // Récupérer les informations de vérification stockées dans la base de données
    console.log('🔍 Recherche du state dans la base de données...');
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'twitterClient')
      .eq('state', state)
      .single();

    if (stateError) {
      console.error('❌ Erreur lors de la recherche du state:', stateError);
      return res.status(400).json({ error: 'État de vérification invalide ou expiré: ' + stateError.message });
    }
    
    if (!stateData) {
      console.error('❌ State non trouvé dans la base de données');
      return res.status(400).json({ error: 'État de vérification invalide ou expiré - non trouvé' });
    }

    console.log('✅ State trouvé dans la base de données:', { 
      recordId: stateData.id,
      codeVerifierPresent: !!stateData.code_verifier,
      codeVerifierLength: stateData.code_verifier?.length,
      codeVerifierSample: stateData.code_verifier?.substring(0, 10) + '...',
      created_at: stateData.created_at
    });

    // Vérifier que l'état n'est pas trop ancien
    const stateCreatedAt = new Date(stateData.created_at);
    const now = new Date();
    const timeDiff = now - stateCreatedAt;
    const ageMinutes = Math.round(timeDiff / 60000);
    
    console.log('⏱️ Âge du state:', { 
      createdAt: stateCreatedAt.toISOString(),
      now: now.toISOString(),
      ageMinutes,
      ageMilliseconds: timeDiff
    });
    
    if (timeDiff > 900000) { // 15 minutes en millisecondes
      console.error('⏰ State expiré, âge:', ageMinutes, 'minutes');
      return res.status(400).json({ error: 'La session d\'authentification a expiré (plus de 15 minutes)' });
    }
    
    // Utiliser twitter-api-v2 pour échanger le code contre un token
    console.log('🔄 Appel au service pour échanger le code contre un token...');
    const result = await TwitterOAuthService.exchangeCodeForToken(code, stateData.code_verifier, userId);
    
    // Nettoyer les données temporaires
    console.log('🧹 Suppression du state utilisé de la base de données');
    const { error: deleteError } = await supabase
      .from('oauth_states')
      .delete()
      .eq('id', stateData.id);
      
    if (deleteError) {
      console.warn('⚠️ Erreur lors de la suppression du state:', deleteError);
      // On continue malgré cette erreur non critique
    }

    await logAction(userId, 'twitter_oauth_connect', `Connexion Twitter OAuth réussie pour @${result.username}`);
    
    console.log('🎉 Authentification Twitter réussie pour:', { 
      userId,
      twitterUsername: result.username
    });
    console.log('📥 -------- Fin du traitement du callback Twitter --------');
    
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
    console.log('🔌 Déconnexion Twitter demandée pour l\'utilisateur:', userId);
    await TwitterOAuthService.disconnectUser(userId);
    await logAction(userId, 'twitter_oauth_disconnect', 'Déconnexion Twitter réussie');
    console.log('✅ Déconnexion Twitter réussie');
    res.json({ message: 'Déconnexion Twitter réussie' });
  } catch (error) {
    console.error('❌ Erreur déconnexion Twitter:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.publishTweet = async (req, res) => {
  console.log('📤 -------- Début de la demande de publication d\'un tweet --------');
  
  const { content, scheduledDate } = req.body; // Ajout de scheduledDate pour la planification
  const userId = req.user.id;
  const mediaFiles = req.files; // Récupérer les fichiers uploadés

  // Vérifier si l'utilisateur est connecté à Twitter
  if (!req.user.isTwitterConnected) {
    console.error('❌ Utilisateur non connecté à Twitter');
    return res.status(400).json({ 
      error: 'Vous n\'êtes pas connecté à Twitter. Veuillez connecter votre compte Twitter pour continuer.'
    });
  }

  console.log('📤 Demande de publication d\'un tweet:', { 
    userId,
    contentLength: content?.length,
    contentSample: content ? content.substring(0, 30) + (content.length > 30 ? '...' : '') : 'absent',
    hasMedia: !!mediaFiles?.length,
    scheduledDate // Ajout du log pour scheduledDate
  });

  if (!content) {
    console.error('❌ Contenu du tweet manquant');
    return res.status(400).json({ error: 'Le contenu du tweet est obligatoire' });
  }

  try {
    let mediaIds = [];
    let mediaType = null;

    // Si des fichiers sont présents, les uploader à Twitter
    if (mediaFiles && mediaFiles.length > 0) {
      console.log('🖼️ Upload des médias détectés...');
      for (const file of mediaFiles) {
        console.log('📂 Traitement du fichier:', {
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size
        });

        try {
          const mediaId = await TwitterOAuthService.uploadMediaWithOAuth1(file.buffer, file.mimetype);
          mediaIds.push(mediaId);

          // Déterminer le type de média (image ou vidéo)
          if (!mediaType) {
            mediaType = file.mimetype.startsWith('image/') ? 'image' : 'video';
          }
        } catch (uploadError) {
          console.error('❌ Erreur lors de l\'upload du média:', uploadError.message);
          return res.status(500).json({ error: uploadError.message });
        }
      }
      console.log('✅ Médias uploadés avec succès, media_ids:', mediaIds);
    }

    // Déterminer le type de contenu
    const contentType = mediaIds.length > 0 
      ? `text-${mediaType}` // "text-image" ou "text-video"
      : 'text';

    // Vérifier si c'est une planification ou une publication immédiate
    if (scheduledDate) {
      // Logique de planification
      console.log('📅 Planification du tweet pour la date:', scheduledDate);

      await supabase
        .from('publications')
        .insert([{
          user_id: userId,
          content_url: '', // Vide pour un contenu planifié
          platform: 'twitter',
          type: contentType,
          status: 'scheduled',
          schedule_time: scheduledDate,
          content_preview: content, // Stocker le contenu complet sans formatage
          media_url: mediaIds.length > 0 ? mediaIds.join(',') : null // Stocker les IDs des médias
        }]);

      await logAction(userId, 'schedule_twitter', `Publication planifiée le ${scheduledDate}`);
      console.log('📤 -------- Fin de la demande de planification d\'un tweet --------');

      return res.json({ message: 'Tweet planifié avec succès' });
    } else {
      // Logique de publication immédiate
      console.log('🐦 Publication immédiate du tweet...');
      const tweet = await TwitterOAuthService.publishTweet(userId, content, mediaIds);

      // Enregistrement de la publication dans la table publications
      await supabase
        .from('publications')
        .insert([{
          user_id: userId,
          content_url: `https://twitter.com/i/web/status/${tweet.data.id}`,
          platform: 'twitter',
          type: contentType,
          status: 'published',
          published_at: new Date().toISOString(),
          content_preview: content // Stocker le contenu complet sans formatage
        }]);

      console.log('✅ Tweet publié avec succès:', {
        tweetId: tweet.data.id,
        tweetText: tweet.data.text
      });

      await logAction(userId, 'publish_twitter', `Lien vers la publication : https://twitter.com/i/web/status/${tweet.data.id}`);
      console.log('📤 -------- Fin de la demande de publication d\'un tweet --------');
      
      res.json({
        message: 'Tweet publié avec succès',
        tweetId: tweet.data.id,
        tweetUrl: `https://twitter.com/i/web/status/${tweet.data.id}`,
        tweetTweet: tweet,
      });
    }
  } catch (error) {
    console.error('❌ Erreur lors de la publication du tweet:', error.message);

    if (error.code === 429 && error.rateLimit?.reset) {
      const resetTime = new Date(error.rateLimit.reset * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      return res.status(429).json({
        error: `Vous avez atteint la limite quotidienne de publications autorisées par Twitter. Veuillez réessayer après ${resetTime}.`,
        retryAfter: resetTime,
      });
    }

    res.status(500).json({ error: error.message });
  }
};

exports.checkConnection = async (req, res) => {
  const userId = req.user.id;
  
  try {
    console.log('🔍 Vérification de la connexion Twitter pour l\'utilisateur:', userId);
    // Vérifier la connexion avec twitter-api-v2
    const isConnected = await TwitterOAuthService.isUserConnected(userId);
    console.log('✅ Résultat de la vérification:', isConnected ? 'Connecté' : 'Non connecté');
    res.json({ isConnected });
  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la connexion Twitter:', error);
    res.status(500).json({ error: error.message });
  }
};
