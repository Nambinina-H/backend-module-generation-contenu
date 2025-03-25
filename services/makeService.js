const axios = require("axios");

// Dictionnaire des webhooks associés aux plateformes
const webhooks = {
  facebook: process.env.MAKE_WEBHOOK_FACEBOOK,
  linkedin: process.env.MAKE_WEBHOOK_LINKEDIN,
  instagram: process.env.MAKE_WEBHOOK_INSTAGRAM,
  twitter: process.env.MAKE_WEBHOOK_TWITTER,
  wordpress: process.env.MAKE_WEBHOOK_WORDPRESS,
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
