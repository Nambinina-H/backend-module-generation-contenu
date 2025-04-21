const axios = require('axios');
const { supabase } = require('../supabaseService');
const { encrypt } = require('../../utils/encryptionUtil');

class WordPressOAuthService {
  static async exchangeCodeForToken(code, userId) {
    const params = new URLSearchParams({
      client_id: process.env.WORDPRESS_CLIENT_ID,
      client_secret: process.env.WORDPRESS_CLIENT_SECRET,
      code: code,
      redirect_uri: process.env.WORDPRESS_REDIRECT_URI,
      grant_type: 'authorization_code',
      response_type: 'code'
    });

    try {
      const response = await axios.post(
        'https://public-api.wordpress.com/oauth2/token',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // Chiffrer le token avant stockage
      const encryptedToken = encrypt(JSON.stringify(response.data));

      // Vérifier si une config existe déjà
      const { data: existingConfig } = await supabase
        .from('api_configurations')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', 'wordPressClient')
        .single();

      if (existingConfig) {
        // Mise à jour
        await supabase
          .from('api_configurations')
          .update({ keys: encryptedToken })
          .eq('id', existingConfig.id);
      } else {
        // Création
        await supabase
          .from('api_configurations')
          .insert([{
            user_id: userId,
            platform: 'wordPressClient',
            keys: encryptedToken
          }]);
      }

      return { message: 'Connexion WordPress réussie' };
    } catch (error) {
      console.error('Erreur échange token:', error.response?.data || error);
      throw new Error('Échec de l\'échange du code d\'autorisation');
    }
  }

  static async disconnectUser(userId) {
    const { error } = await supabase
      .from('api_configurations')
      .delete()
      .eq('user_id', userId)
      .eq('platform', 'wordPressClient');

    if (error) {
      throw new Error('Erreur lors de la déconnexion WordPress');
    }
  }
}

module.exports = WordPressOAuthService;
