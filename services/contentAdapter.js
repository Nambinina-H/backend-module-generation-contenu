const { Configuration, OpenAIApi } = require("openai");
const platformConfig = require('./platformConfig');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/**
 * Adapte un contenu pour une plateforme donnée en respectant la longueur max.
 * @param {string} baseContent - Contenu original.
 * @param {string} platform - Plateforme cible.
 * @param {string} longueurPercentage - Ex: "70%".
 * @returns {Promise<string>} - Contenu adapté.
 */
exports.adaptContentForPlatform = async (baseContent, platform, longueurPercentage) => {
  const config = platformConfig[platform.toLowerCase()] || {};
  let targetLength = null;
  
  if (config.maxLength && longueurPercentage) {
    targetLength = Math.floor(config.maxLength * (parseInt(longueurPercentage.replace('%', '')) / 100));
  }

  let prompt = `Adapte ce contenu pour ${platform}.\n\n${baseContent}\n\n`;
  if (targetLength) prompt += `Ne dépasse pas ${targetLength} caractères.\n`;

  try {
    const response = await openai.createCompletion({
      model: "gpt-4-o-mini",
      prompt: prompt,
      max_tokens: 300,
      temperature: 0.7,
    });
    let adaptedContent = response.data.choices[0].text.trim();
    return targetLength ? adaptedContent.substring(0, targetLength) : adaptedContent;
  } catch (error) {
    console.error(`Erreur adaptation ${platform}:`, error);
    return baseContent;
  }
};
