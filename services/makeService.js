const axios = require("axios");
const { supabase } = require('./supabaseService');
const ApiConfigService = require('./apiConfigService');

const getMakeWebhooks = () => {
  const apiKeys = ApiConfigService.getKeyFromCache('make');
  console.log('🔑 Webhooks Make.com récupérés:', {
    hasWebhooks: !!apiKeys,
    platforms: apiKeys ? Object.keys(apiKeys) : []
  });
  
  if (!apiKeys) {console.warn('⚠️ Aucun webhook Make.com trouvé dans le cache');
    // Fallback sur les variables d'environnement
}
  
  return apiKeys;
};

/**
 * Envoie un contenu à Make.com via le webhook de la plateforme cible.
 * @param {string} userId - ID de l'utilisateur.
 * @param {string} platform - Plateforme cible (facebook, linkedin, instagram, twitter, wordpress).
 * @param {string} content - Contenu à publier.
 * @param {string} mediaUrl - URL du média à publier.
 * @param {string} type - Type de contenu à publier.
 * @returns {Promise<Object>} - Réponse de Make.com.
 */
exports.publishToPlatform = async (userId, platform, content, mediaUrl, type) => {
  try {
    // Récupérer le webhook spécifique à l'utilisateur via le cache ou la base de données
    const config = await ApiConfigService.getKeyForUser(userId, 'makeClient');
    if (!config || !config.webhookURL) {
      throw new Error('Le webhookURL est manquant ou introuvable pour cet utilisateur.');
    }

    const webhookUrl = config.webhookURL;

    // Envoyer les données au webhook
    const response = await axios.post(webhookUrl, {
      platform,
      mediaUrl,
      content,
      type,
    });

    return response.data;
  } catch (error) {
    console.error(`🚨 Erreur de publication sur ${platform}:`, error.response?.data || error.message);
    throw new Error(`Échec de la publication sur ${platform}`);
  }
};
