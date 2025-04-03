const OpenAI = require("openai");
const platformConfig = require('./platformConfig');
const ApiConfigService = require('./apiConfigService');

const getOpenAIClient = () => {
  const apiKeys = ApiConfigService.getKeyFromCache('openai');
  console.log('🔑 Clés OpenAI récupérées:', {
    hasApiKey: !!apiKeys?.apiKey,
    keyLength: apiKeys?.apiKey?.length
  });
  
  if (!apiKeys?.apiKey) {
    console.warn('⚠️ Aucune clé API OpenAI trouvée dans le cache');
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  return new OpenAI({
    apiKey: apiKeys.apiKey,
  });
};

/**
 * Adapte un contenu pour une plateforme donnée en respectant la longueur max.
 * @param {string} baseContent - Contenu original.
 * @param {string} platform - Plateforme cible.
 * @param {string} longueurPercentage - Ex: "70%".
 * @returns {Promise<string>} - Contenu adapté.
 */
exports.adaptContentForPlatform = async (baseContent, platform, longueurPercentage) => {
  const openai = getOpenAIClient();
  const config = platformConfig[platform.toLowerCase()] || {};
  let targetLength = null;
  
  if (config.maxLength && longueurPercentage) {
    targetLength = Math.floor(config.maxLength * (parseInt(longueurPercentage.replace('%', '')) / 100));
  }

  let prompt = `Adapte ce contenu pour ${platform} sans modifier le contenu.\n\n${baseContent}\n\n`;
  
  if (targetLength) prompt += `Ne dépasse pas ${targetLength} caractères.\n`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      // max_tokens: 300,
      temperature: 0.7,
    });
    let adaptedContent = response.choices[0].message.content.trim();
    return targetLength ? adaptedContent.substring(0, targetLength) : adaptedContent;
  } catch (error) {
    console.error(`Erreur adaptation ${platform}:`, error);
    return baseContent;
  }
};
