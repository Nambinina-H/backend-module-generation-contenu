const axios = require('axios');
const crypto = require('crypto');
const { supabase } = require('../supabaseService');
const { encrypt, decrypt } = require('../../utils/encryptionUtil');

class TwitterOAuthService {
  static generateCodeVerifier() {
    // Générer un code_verifier aléatoire (entre 43-128 caractères selon RFC 7636)
    return crypto.randomBytes(32).toString('hex');
  }

  static generateCodeChallenge(codeVerifier) {
    // Générer un code_challenge à partir du code_verifier selon la méthode S256
    return crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  static async getAuthorizationUrl() {
    try {
      // Générer un state de façon aléatoire pour la sécurité CSRF
      const state = crypto.randomBytes(16).toString('hex');
      
      // Générer le code_verifier et le code_challenge
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = this.generateCodeChallenge(codeVerifier);
      
      // URL de redirection spécifiée dans votre application Twitter Developer
      const callbackUrl = process.env.TWITTER_REDIRECT_URI;
      
      console.log('🔍 Génération de l\'URL d\'authentification avec:', { 
        state,
        codeVerifier: codeVerifier.substring(0, 10) + '...',
        codeChallenge: codeChallenge.substring(0, 10) + '...',
        callbackUrl 
      });
      
      // Construire l'URL d'autorisation
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.TWITTER_CLIENT_ID,
        redirect_uri: callbackUrl,
        scope: 'tweet.read tweet.write users.read offline.access',
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      const url = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
      
      console.log('✅ URL d\'authentification générée:', { 
        url: url.substring(0, 100) + '...'
      });
      
      return {
        url,
        state,
        codeVerifier,
        codeChallenge
      };
    } catch (error) {
      console.error('❌ Erreur lors de la génération de l\'URL d\'authentification:', error);
      throw new Error('Impossible de générer l\'URL d\'authentification Twitter');
    }
  }

  static async exchangeCodeForToken(code, codeVerifier, userId) {
    try {
      console.log('🔄 Échange du code d\'autorisation pour un token avec:', { 
        codeLength: code.length,
        codeSample: code.substring(0, 10) + '...',
        codeVerifierLength: codeVerifier.length,
        codeVerifierSample: codeVerifier.substring(0, 10) + '...',
        userId
      });
      
      // Échanger le code contre un access token
      const tokenResponse = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: process.env.TWITTER_CLIENT_ID,
          redirect_uri: process.env.TWITTER_REDIRECT_URI,
          code_verifier: codeVerifier
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      ).catch(error => {
        console.error('🚨 Erreur complète de Twitter lors de l\'échange:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        throw new Error(`Échec de l'échange: ${error.response?.data?.error_description || error.message}`);
      });

      const { access_token: accessToken, refresh_token: refreshToken, expires_in: expiresIn } = tokenResponse.data;
      
      console.log('✅ Token obtenu avec succès:', { 
        accessTokenLength: accessToken?.length,
        refreshTokenLength: refreshToken?.length,
        expiresIn
      });

      // Obtenir des informations sur l'utilisateur Twitter
      const userResponse = await axios.get('https://api.twitter.com/2/users/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const { username, id: twitterId } = userResponse.data.data;

      console.log('👤 Informations utilisateur Twitter récupérées:', {
        username,
        twitterId
      });

      const tokenData = {
        accessToken,
        refreshToken,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        twitterId,
        twitterUsername: username,
      };

      // Chiffrer les données du token
      const encryptedToken = encrypt(JSON.stringify(tokenData));

      // Vérifier si une configuration existe déjà
      const { data: existingConfig } = await supabase
        .from('api_configurations')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', 'twitterClient')
        .single();

      if (existingConfig) {
        console.log('🔄 Mise à jour de la configuration Twitter existante:', { configId: existingConfig.id });
        await supabase
          .from('api_configurations')
          .update({ keys: encryptedToken })
          .eq('id', existingConfig.id);
      } else {
        console.log('➕ Création d\'une nouvelle configuration Twitter');
        await supabase
          .from('api_configurations')
          .insert([{
            user_id: userId,
            platform: 'twitterClient',
            keys: encryptedToken
          }]);
      }

      return { message: 'Connexion Twitter réussie', username };
    } catch (error) {
      console.error('❌ Erreur échange token Twitter:', error.message);
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

      // Rafraîchir le token
      const refreshResponse = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          client_id: process.env.TWITTER_CLIENT_ID
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token: accessToken, refresh_token: newRefreshToken, expires_in: expiresIn } = refreshResponse.data;

      // Mettre à jour les données du token
      const newTokenData = {
        ...tokenData,
        accessToken,
        refreshToken: newRefreshToken || refreshToken, // Utiliser le nouveau refresh token s'il est fourni
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

  static async getAccessTokenForUser(userId) {
    try {
      // Vérifier si on a besoin de rafraîchir le token
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
      let tokenData = JSON.parse(decrypt(configData.keys));
      const now = new Date();
      const expiresAt = new Date(tokenData.expiresAt);

      // Si le token expire dans moins de 5 minutes, le rafraîchir
      if ((expiresAt - now) < 300000) { // 5 minutes en millisecondes
        tokenData = await this.refreshAccessToken(userId);
      }

      return tokenData.accessToken;
    } catch (error) {
      console.error('Erreur lors de la récupération du token Twitter:', error);
      throw error;
    }
  }

  static async publishTweet(userId, content, mediaIds = []) {
    try {
      const accessToken = await this.getAccessTokenForUser(userId);
      
      const payload = {
        text: content
      };
      
      if (mediaIds.length) {
        payload.media = { media_ids: mediaIds };
      }
      
      const response = await axios.post(
        'https://api.twitter.com/2/tweets',
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la publication du tweet:', error);
      throw error;
    }
  }

  static async uploadMedia(userId, mediaUrl) {
    // Cette fonction est plus complexe et nécessite plusieurs appels API
    // Pour l'instant, on renvoie juste une erreur
    throw new Error('Upload de média non implémenté');
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
  }

  static async isUserConnected(userId) {
    const { data, error } = await supabase
      .from('api_configurations')
      .select('keys')
      .eq('user_id', userId)
      .eq('platform', 'twitterClient')
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return true;
  }
}

module.exports = TwitterOAuthService;
