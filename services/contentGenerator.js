const OpenAI = require("openai");

const openai = new OpenAI({apiKey: process.env.OPENAI_API_KEY,});

/**
 * Génère du contenu textuel en utilisant OpenAI.
 * @param {string} type - Le type de contenu ('text').
 * @param {Array<string>} keywords - Liste de mots-clés.
 * @param {Object} personalization - Contient :
 *    - modelType: ex. "article de blog", "légende", "newsletter"
 *    - promptInstructions: instructions spécifiques
 *    - ton: ex. "professionnel", "décontracté", etc.
 *    - longueur: ex. "70%"
 *    - variables: objet de variables dynamiques (ex: { Nom: "TechNova", Date: "12/03/2025", Lieu: "Paris" })
 * @returns {Promise<string|null>} - Le contenu généré.
 */
exports.generateContent = async (type, keywords, personalization = {}) => {
  if (type !== 'text') return null; 

  let finalPrompt = `${personalization.modelType || "Article de blog"}\n`;
  finalPrompt += personalization.promptInstructions ? `Instructions: ${personalization.promptInstructions}\n` : "";
  finalPrompt += keywords.length ? `Mots-clés: ${keywords.join(", ")}\n` : "";
  finalPrompt += personalization.ton ? `Ton: ${personalization.ton}\n` : "";
  finalPrompt += personalization.longueur ? `Longueur souhaitée: ${personalization.longueur}\n` : "";
  
  if (personalization.variables) {
    finalPrompt += `Variables: ${JSON.stringify(personalization.variables)}\n`;
  }

  finalPrompt += "Générez un contenu qui suit ces instructions.";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "developer", content: finalPrompt }],
      max_tokens: 300,
      temperature: 0.7,
    });
    return response.choices[0];
  } catch (error) {
    console.error("Erreur OpenAI:", error);
    return null;
  }
};
