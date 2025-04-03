const axios = require("axios");
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
 * @param {string} platform - Plateforme cible (facebook, linkedin, instagram, twitter, wordpress).
 * @param {string} content - Contenu à publier.
 * @param {string} mediaUrl - URL du média à publier.
 * @param {string} type - Type de contenu à publier.
 * @returns {Promise<Object>} - Réponse de Make.com.
 */
exports.publishToPlatform = async (platform, content, mediaUrl, type) => {
  const webhooks = getMakeWebhooks();
  const webhookUrl = webhooks[platform.toLowerCase()];

  if (!webhookUrl) {
    throw new Error(`Aucun webhook défini pour la plateforme : ${platform}`);
  }

  try {
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
