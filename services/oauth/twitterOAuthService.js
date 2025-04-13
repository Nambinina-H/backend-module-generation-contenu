const { TwitterApi } = require('twitter-api-v2');
const crypto = require('crypto');
const { supabase } = require('../supabaseService');
const { encrypt, decrypt } = require('../../utils/encryptionUtil');

class TwitterOAuthService {
  static getTwitterClient() {
    console.log('🔧 Initialisation du client Twitter avec CLIENT_ID:', 
      process.env.TWITTER_CLIENT_ID ? `${process.env.TWITTER_CLIENT_ID.substring(0, 5)}...` : 'manquant');
    
    return new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET
    });
  }

  static getTwitterClientOAuth1() {
    console.log('🔧 Initialisation du client Twitter avec OAuth 1.0a');
    return new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });
  }

  static generateCodeVerifier() {
    return crypto.randomBytes(32).toString('hex');
  }

  static async getAuthorizationUrl() {
    try {
      console.log('🔍 Démarrage de la génération de l\'URL d\'authentification Twitter');
      const client = this.getTwitterClient();

      // Générer un code_verifier et un state pour la sécurité CSRF
      const codeVerifier = this.generateCodeVerifier();
      const state = crypto.randomBytes(16).toString('hex');
      
      console.log('🔍 Génération de l\'URL d\'authentification avec:', { 
        state,
        codeVerifier: codeVerifier.substring(0, 10) + '...',
        redirectUri: process.env.TWITTER_REDIRECT_URI
      });
      
      // Utiliser twitter-api-v2 pour générer l'URL d'autorisation OAuth 2.0
      const authLink = await client.generateOAuth2AuthLink(
        process.env.TWITTER_REDIRECT_URI, 
        { 
          scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
          state: state,
          code_challenge_method: 'S256',
          code_challenge: codeVerifier
        }
      );
      
      console.log('✅ URL d\'authentification générée avec succès:', { 
        url: authLink.url.substring(0, 100) + '...',
        state: authLink.state,
        codeVerifierPresent: !!authLink.codeVerifier,
        codeVerifierLength: authLink.codeVerifier?.length
      });
      
      return {
        url: authLink.url,
        state: authLink.state,
        codeVerifier: authLink.codeVerifier,
      };
    } catch (error) {
      console.error('❌ Erreur lors de la génération de l\'URL d\'authentification:', error);
      console.error('❌ Détails de l\'erreur:', { 
        message: error.message,
        stack: error.stack,
        cause: error.cause
      });
      throw new Error('Impossible de générer l\'URL d\'authentification Twitter: ' + error.message);
    }
  }

  static async exchangeCodeForToken(code, codeVerifier, userId) {
    try {
      console.log('🔄 Début de l\'échange du code contre un token Twitter');
      const client = this.getTwitterClient();
      
      console.log('🔄 Échange du code avec paramètres:', { 
        codeLength: code.length,
        codeSample: code.substring(0, 10) + '...',
        codeVerifierLength: codeVerifier.length,
        codeVerifierSample: codeVerifier.substring(0, 10) + '...',
        redirectUri: process.env.TWITTER_REDIRECT_URI
      });
      
      // Échanger le code contre un access token
      const loginResult = await client.loginWithOAuth2({
        code,
        redirectUri: process.env.TWITTER_REDIRECT_URI,
        codeVerifier,
      });

      console.log('✅ Token obtenu avec succès:', { 
        accessTokenPresent: !!loginResult.accessToken,
        accessTokenLength: loginResult.accessToken?.length,
        refreshTokenPresent: !!loginResult.refreshToken,
        refreshTokenLength: loginResult.refreshToken?.length,
        expiresIn: loginResult.expiresIn
      });
      
      const { accessToken, refreshToken, expiresIn } = loginResult;
      
      // Créer un nouveau client avec le token d'accès
      console.log('🔍 Création du client authentifié avec le token obtenu');
      const loggedClient = new TwitterApi(accessToken);
      
      // Obtenir des informations sur l'utilisateur Twitter
      console.log('🔍 Récupération des informations de l\'utilisateur Twitter');
      const userInfo = await loggedClient.v2.me();
      
      console.log('👤 Informations utilisateur Twitter récupérées:', {
        username: userInfo.data.username,
        twitterId: userInfo.data.id,
        name: userInfo.data.name
      });

      const tokenData = {
        accessToken,
        refreshToken,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        twitterId: userInfo.data.id,
        twitterUsername: userInfo.data.username,
      };

      // Chiffrer les données du token
      console.log('🔒 Chiffrement des tokens pour stockage sécurisé');
      const encryptedToken = encrypt(JSON.stringify(tokenData));

      // Vérifier si une configuration existe déjà
      console.log('🔍 Vérification si une configuration Twitter existe déjà pour l\'utilisateur:', userId);
      const { data: existingConfig, error } = await supabase
        .from('api_configurations')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', 'twitterClient')
        .single();

      if (error) {
        console.log('ℹ️ Aucune configuration existante trouvée:', error.message);
      }

      if (existingConfig) {
        console.log('🔄 Mise à jour de la configuration Twitter existante:', existingConfig.id);
        const { data, error: updateError } = await supabase
          .from('api_configurations')
          .update({ keys: encryptedToken })
          .eq('id', existingConfig.id)
          .select();
        
        if (updateError) {
          console.error('❌ Erreur lors de la mise à jour:', updateError);
          throw new Error(`Erreur lors de la mise à jour de la configuration: ${updateError.message}`);
        }
        console.log('✅ Configuration Twitter mise à jour avec succès');
      } else {
        console.log('➕ Création d\'une nouvelle configuration Twitter');
        const { data, error: insertError } = await supabase
          .from('api_configurations')
          .insert([{
            user_id: userId,
            platform: 'twitterClient',
            keys: encryptedToken
          }])
          .select();
          
        if (insertError) {
          console.error('❌ Erreur lors de la création:', insertError);
          throw new Error(`Erreur lors de la création de la configuration: ${insertError.message}`);
        }
        console.log('✅ Nouvelle configuration Twitter créée avec succès');
      }

      return { message: 'Connexion Twitter réussie', username: userInfo.data.username };
    } catch (error) {
      console.error('❌ Erreur échange token Twitter:', error);
      console.error('❌ Détails de l\'erreur:', { 
        message: error.message, 
        stack: error.stack,
        cause: error.cause,
        response: error.response?.data
      });
      throw new Error(`Échec de l'échange du code d'autorisation Twitter: ${error.message}`);
    }
  }

  static async refreshAccessToken(userId) {
    try {
      // Récupérer les tokens depuis Supabase
      const { data: configData, error: configError } = await supabase
        .from('api_configurations')
        .select('keys')
        .eq('user_id', userId)
        .eq('platform', 'twitterClient')
        .single();

      if (configError || !configData) {
        throw new Error('Configuration Twitter non trouvée');
      }

      // Déchiffrer les tokens
      const tokenData = JSON.parse(decrypt(configData.keys));
      const { refreshToken } = tokenData;

      if (!refreshToken) {
        throw new Error('Refresh token Twitter non disponible');
      }

      // Rafraîchir le token avec twitter-api-v2
      const client = this.getTwitterClient();
      const { accessToken, refreshToken: newRefreshToken, expiresIn } = await client.refreshOAuth2Token(refreshToken);

      // Mettre à jour les données du token
      const newTokenData = {
        ...tokenData,
        accessToken,
        refreshToken: newRefreshToken || refreshToken,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      };

      // Chiffrer et stocker les nouveaux tokens
      const encryptedToken = encrypt(JSON.stringify(newTokenData));
      await supabase
        .from('api_configurations')
        .update({ keys: encryptedToken })
        .eq('user_id', userId)
        .eq('platform', 'twitterClient');

      return newTokenData;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du token Twitter:', error);
      throw error;
    }
  }

  static async getTwitterClientForUser(userId) {
    try {
      console.log('🔍 Récupération du client Twitter pour l\'utilisateur:', userId);
      
      // Vérifier si on a besoin de rafraîchir le token
      const { data: configData, error: configError } = await supabase
        .from('api_configurations')
        .select('keys')
        .eq('user_id', userId)
        .eq('platform', 'twitterClient')
        .single();

      if (configError) {
        console.error('❌ Erreur lors de la récupération de la config Twitter:', configError.message);
        throw new Error('Configuration Twitter non trouvée');
      }

      console.log('✅ Configuration Twitter trouvée, déchiffrement des tokens');
      let tokenData = JSON.parse(decrypt(configData.keys));
      console.log('🔑 Tokens déchiffrés:', {
        accessTokenPresent: !!tokenData.accessToken,
        refreshTokenPresent: !!tokenData.refreshToken,
        expiresAt: tokenData.expiresAt
      });

      // Vérifier l'expiration du token
      const now = new Date();
      const expiresAt = new Date(tokenData.expiresAt);
      if ((expiresAt - now) < 300000) {
        console.log('🔄 Token expirant bientôt, rafraîchissement...');
        tokenData = await this.refreshAccessToken(userId);
        console.log('✅ Token rafraîchi avec succès');
      }

      // Créer un client Twitter avec le token d'accès
      console.log('🔧 Création du client Twitter avec le token d\'accès');
      const client = new TwitterApi(tokenData.accessToken);
      console.log('✅ Client Twitter créé avec succès');

      return client;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération du client Twitter:', error.message);
      console.error('❌ Stack trace:', error.stack);
      throw error;
    }
  }

  static async publishTweet(userId, content, mediaIds = []) {
    try {
      console.log('🐦 Début de la publication d\'un tweet pour l\'utilisateur:', userId);
      console.log('📝 Contenu du tweet:', content);
      console.log('🖼️ Médias à inclure:', mediaIds);
      
      // Obtenir le client Twitter V2 pour l'utilisateur
      console.log('🔍 Récupération du client Twitter authentifié');
      const twitterClient = await this.getTwitterClientForUser(userId);
      
      // Options pour le tweet
      const tweetOptions = { text: content };
      
      // Ajouter les médias si présents
      if (mediaIds.length > 0) {
        console.log('🖼️ Ajout des médias au tweet:', mediaIds);
        tweetOptions.media = { media_ids: mediaIds };
      }
      
      // Publier le tweet avec twitter-api-v2
      console.log('📤 Envoi du tweet à l\'API Twitter...');
      const result = await twitterClient.v2.tweet(tweetOptions);
      
      console.log('✅ Tweet publié avec succès:', { 
        tweetId: result.data.id, 
        text: result.data.text
      });
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de la publication du tweet:', error);
      console.error('❌ Détails de l\'erreur:', { 
        message: error.message,
        stack: error.stack,
        code: error.code,
        statusCode: error.statusCode,
        data: error.data
      });
      throw error;
    }
  }

  static async uploadMedia(userId, mediaBuffer, mediaType) {
    try {
      console.log('🔄 Début de l\'upload du média pour l\'utilisateur:', userId);
      console.log('📂 Taille du buffer:', mediaBuffer?.length, 'octets');
      console.log('📂 Type MIME du média:', mediaType);

      // Vérification de la taille et du format du fichier
      if (mediaBuffer.length > 5 * 1024 * 1024) {
        throw new Error('Le fichier dépasse la taille maximale autorisée par Twitter (5 Mo).');
      }
      if (!['image/jpeg', 'image/png'].includes(mediaType)) {
        throw new Error('Type de fichier non supporté. Seuls les formats JPEG et PNG sont autorisés.');
      }

      // Obtenir le client Twitter authentifié
      const twitterClient = await this.getTwitterClientForUser(userId);
      console.log('✅ Client Twitter récupéré avec succès');

      // Uploader le média
      try {
        const mediaId = await twitterClient.v1.uploadMedia(mediaBuffer, { mimeType: mediaType });
        console.log('✅ Média uploadé avec succès, media_id:', mediaId);
        return mediaId;
      } catch (error) {
        console.error('❌ Erreur lors de l\'upload du média:', error.message);
        console.error('❌ Réponse complète de l\'API Twitter:', error.data || error);
        if (error.code === 403) {
          throw new Error('Permission refusée par l\'API Twitter. Vérifiez les permissions ou le token d\'accès.');
        }
        throw new Error('Échec de l\'upload du média à Twitter');
      }
    } catch (error) {
      console.error('❌ Erreur dans uploadMedia:', error.message);
      throw error;
    }
  }

  static async uploadMediaWithOAuth1(mediaBuffer, mediaType) {
    try {
      console.log('🔄 Début de l\'upload du média avec OAuth 1.0a');
      console.log('📂 Taille du buffer:', mediaBuffer?.length, 'octets');
      console.log('📂 Type MIME du média:', mediaType);

      // Vérification de la taille et du format du fichier
      if (mediaBuffer.length > 5 * 1024 * 1024) {
        throw new Error('Le fichier dépasse la taille maximale autorisée par Twitter (5 Mo).');
      }
      if (!['image/jpeg', 'image/png'].includes(mediaType)) {
        throw new Error('Type de fichier non supporté. Seuls les formats JPEG et PNG sont autorisés.');
      }

      // Obtenir le client Twitter OAuth 1.0a
      const twitterClient = this.getTwitterClientOAuth1();
      console.log('✅ Client Twitter OAuth 1.0a récupéré avec succès');

      // Uploader le média
      const mediaId = await twitterClient.v1.uploadMedia(mediaBuffer, { mimeType: mediaType });
      console.log('✅ Média uploadé avec succès, media_id:', mediaId);
      return mediaId;
    } catch (error) {
      console.error('❌ Erreur lors de l\'upload du média avec OAuth 1.0a:', error.message);
      throw error;
    }
  }

  static async disconnectUser(userId) {
    const { error } = await supabase
      .from('api_configurations')
      .delete()
      .eq('user_id', userId)
      .eq('platform', 'twitterClient');
  
    if (error) {
      throw new Error('Erreur lors de la déconnexion Twitter');
    }
    console.log('✅ Déconnexion Twitter réussie pour:', { userId });
  }

  static async isUserConnected(userId) {
    try {
      console.log('🔍 Vérification de la connexion Twitter pour l\'utilisateur:', userId);
      
      // Vérifier si l'utilisateur a une configuration Twitter
      const { data, error } = await supabase
        .from('api_configurations')
        .select('keys, updated_at')
        .eq('user_id', userId)
        .eq('platform', 'twitterClient')
        .single();
      
      if (error) {
        console.log('❌ Aucune configuration Twitter trouvée:', error.message);
        return false;
      }
      
      console.log('✅ Configuration Twitter trouvée, dernière mise à jour:', data.updated_at);
      
      // Si des tokens existent, essayer de récupérer le client pour vérifier la validité
      try {
        console.log('🔍 Vérification de la validité des tokens...');
        await this.getTwitterClientForUser(userId);
        console.log('✅ Tokens valides, utilisateur connecté à Twitter');
        return true;
      } catch (clientError) {
        console.error('❌ Échec de vérification du client Twitter:', clientError.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification de la connexion Twitter:', error.message);
      return false;
    }
  }
  
  static async getUserInfo(userId) {
    try {
      const twitterClient = await this.getTwitterClientForUser(userId);
      return await twitterClient.me();
    } catch (error) {
      console.error('Erreur lors de la récupération des informations utilisateur Twitter:', error);
      throw error;
    }
  }

}

module.exports = TwitterOAuthService;