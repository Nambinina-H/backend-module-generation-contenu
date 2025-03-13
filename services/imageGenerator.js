const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Assure-toi que ta clé API est bien définie dans ton fichier .env
});

/**
 * Génère une image avec OpenAI DALL·E 3.
 * @param {string} prompt - Description de l'image à générer.
 * @param {string} quality - Qualité de l’image (ex: "standard" ou "hd").
 * @param {string} size - Taille de l'image (ex: "1024x1024", "1792x1024").
 * @param {string} style - Style de l’image (ex: "vivid" ou "natural").
 * @returns {Promise<string>} - URL de l'image générée.
 */
exports.generateImage = async (prompt, quality = "standard", size = "1024x1024", style = "vivid") => {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1, // Nombre d'images à générer (1 pour DALL·E 3)
      quality, // Qualité de l’image
      size, // Taille de l’image
      style, // Style de l’image
      response_format: "url", // Retourne une URL au lieu d'une base64
    });

    return response.data[0].url; // Retourne l'URL de l'image générée
  } catch (error) {
    console.error("🚨 Erreur OpenAI (DALL·E 3):", error);
    throw new Error("Erreur lors de la génération de l'image.");
  }
};
