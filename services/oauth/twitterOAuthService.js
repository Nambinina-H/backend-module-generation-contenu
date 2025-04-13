const { TwitterApi } = require('twitter-api-v2');
const { supabase } = require('../supabaseService');
const { encrypt, decrypt } = require('../../utils/encryptionUtil');

class TwitterOAuthService {
  static createClient() {
    return new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });
  }

  static async getAuthorizationUrl() {
    try {
      const client = this.createClient();
      // Générer les états de façon aléatoire pour la sécurité CSRF
      const state = Math.random().toString(36).substring(2, 15);
      const codeVerifier = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // URL de redirection spécifiée dans votre application Twitter Developer
      const callbackUrl = process.env.TWITTER_REDIRECT_URI;
      
      const authLink = await client.generateOAuth2AuthLink(callbackUrl, {
        scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
        state,
        codeVerifier,
      });
      
      // Stocker ces valeurs dans la session ou la base de données pour la vérification lors du callback
      return {
        url: authLink.url,
        state,
        codeVerifier,
        codeChallenge: authLink.codeChallenge,
      };
    } catch (error) {
      console.error('Erreur lors de la génération de l\'URL d\'authentification:', error);
      throw new Error('Impossible de générer l\'URL d\'authentification Twitter');
    }
  }

  static async exchangeCodeForToken(code, codeVerifier, userId) {
    try {
      const client = this.createClient();
      const callbackUrl = process.env.TWITTER_REDIRECT_URI;
      
      // Échanger le code contre un access token
      const { accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
        code,
        codeVerifier,
        redirectUri: callbackUrl,
      });

      // Obtenir des informations sur l'utilisateur Twitter pour stocker avec les tokens
      const userClient = new TwitterApi(accessToken);
      const user = await userClient.v2.me();

      const tokenData = {
        accessToken,
        refreshToken,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        twitterId: user?.data?.id,
        twitterUsername: user?.data?.username,
      };

      // Chiffrer les données du token
      const encryptedToken = encrypt(JSON.stringify(tokenData));

      // Vérifier si une configuration existe déjà
      const { data: existingConfig } = await supabase
        .from('api_configurations')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', 'twitterClient')  // Utilisation de twitterClient au lieu de twitter
        .single();

      if (existingConfig) {
        await supabase
          .from('api_configurations')
          .update({ keys: encryptedToken })
          .eq('id', existingConfig.id);
      } else {
        await supabase
          .from('api_configurations')
          .insert([{
            user_id: userId,
            platform: 'twitterClient',  // Utilisation de twitterClient au lieu de twitter
            keys: encryptedToken
          }]);
      }

      return { message: 'Connexion Twitter réussie', username: user?.data?.username };
    } catch (error) {
      console.error('Erreur échange token Twitter:', error);
      throw new Error('Échec de l\'échange du code d\'autorisation Twitter');
    }
  }

  static async refreshAccessToken(userId) {
    try {
      // Récupérer les tokens depuis Supabase
      const { data: configData, error: configError } = await supabase
        .from('api_configurations')
        .select('keys')
        .eq('user_id', userId)
        .eq('platform', 'twitterClient')  // Utilisation de twitterClient au lieu de twitter
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
      const client = this.createClient();
      const { accessToken, refreshToken: newRefreshToken, expiresIn } = await client.refreshOAuth2Token(refreshToken);

      // Mettre à jour les données du token
      const newTokenData = {
        ...tokenData,
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      };

      // Chiffrer et stocker les nouveaux tokens
      const encryptedToken = encrypt(JSON.stringify(newTokenData));
      await supabase
        .from('api_configurations')
        .update({ keys: encryptedToken })
        .eq('user_id', userId)
        .eq('platform', 'twitterClient');  // Utilisation de twitterClient au lieu de twitter

      return newTokenData;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du token Twitter:', error);
      throw error;
    }
  }

  static async getClientForUser(userId) {
    try {
      // Vérifier si on a besoin de rafraîchir le token
      const { data: configData, error: configError } = await supabase
        .from('api_configurations')
        .select('keys')
        .eq('user_id', userId)
        .eq('platform', 'twitterClient')  // Utilisation de twitterClient au lieu de twitter
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

      return new TwitterApi(tokenData.accessToken);
    } catch (error) {
      console.error('Erreur lors de la création du client Twitter:', error);
      throw error;
    }
  }

  static async publishTweet(userId, content, mediaIds = []) {
    try {
      const client = await this.getClientForUser(userId);
      const tweet = await client.v2.tweet({
        text: content,
        media: mediaIds.length ? { media_ids: mediaIds } : undefined,
      });
      
      return tweet;
    } catch (error) {
      console.error('Erreur lors de la publication du tweet:', error);
      throw error;
    }
  }

  static async uploadMedia(userId, mediaUrl) {
    try {
      const client = await this.getClientForUser(userId);
      // Téléchargement de média nécessiterait une bibliothèque supplémentaire
      // comme axios pour télécharger d'abord le fichier depuis mediaUrl
      // puis l'uploader avec client.v1.uploadMedia
      
      // Pour l'exemple, supposons que nous avons déjà le chemin local du fichier
      const mediaId = await client.v1.uploadMedia(mediaUrl);
      return mediaId;
    } catch (error) {
      console.error('Erreur lors de l\'upload du média:', error);
      throw error;
    }
  }

  static async disconnectUser(userId) {
    const { error } = await supabase
      .from('api_configurations')
      .delete()
      .eq('user_id', userId)
      .eq('platform', 'twitterClient');  // Utilisation de twitterClient au lieu de twitter

    if (error) {
      throw new Error('Erreur lors de la déconnexion Twitter');
    }
  }

  static async isUserConnected(userId) {
    const { data, error } = await supabase
      .from('api_configurations')
      .select('keys')
      .eq('user_id', userId)
      .eq('platform', 'twitterClient')  // Utilisation de twitterClient au lieu de twitter
      .single();
    
    if (error || !data) {
      return false;
    }
    
    // On pourrait vérifier la validité du token ici
    return true;
  }
}

module.exports = TwitterOAuthService;
