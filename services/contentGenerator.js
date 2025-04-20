const OpenAI = require("openai");
const ApiConfigService = require('./apiConfigService');

const getOpenAIClient = () => {
  const apiKeys = ApiConfigService.getKeyFromCache('openai');
  console.log('🔑 Clés OpenAI récupérées:', {
    hasApiKey: !!apiKeys?.apiKey,
    keyLength: apiKeys?.apiKey?.length
  });
  
  if (!apiKeys?.apiKey) {
    console.warn('⚠️ Aucune clé API OpenAI trouvée dans le cache');
  }
  
  return new OpenAI({
    apiKey: apiKeys?.apiKey,
  });
};

/**
 * Génère une description de vidéo en utilisant OpenAI.
 * @param {Array<string>} keywords - Liste de mots-clés.
 * @returns {Promise<string|null>} - La description générée.
 */
exports.generateVideoDescription = async (keywords) => {
  // Vérification de la validité de l'entrée
  if (!Array.isArray(keywords) || keywords.length === 0) {
    console.error("Les mots-clés doivent être un tableau non vide.");
    throw new Error("Invalid keywords");
  }

  const openai = getOpenAIClient();

  // Amélioration du prompt pour obtenir une réponse plus détaillée et narrative

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Tu es un expert dans la création de vidéos avec Luma Labs. Ton rôle est de créer des descriptions visuelles directement inspirées par les mots-clés fournis. La description doit être concise, strictement fidèle aux mots-clés, et ne doit pas inclure de détails ou éléments supplémentaires non mentionnés dans les mots-clés.`
        },
        {
          role: "user",
          content: `Crée une description pour une vidéo en utilisant les mots-clés suivants : ${keywords.join(", ")}. La description doit être strictement fidèle aux mots-clés, concise et visuelle, sans ajouter de détails ou interprétations.`
        },
      ],
      temperature: 0,
      max_tokens: 500, // Limite du nombre de tokens pour mieux contrôler la réponse
    });

    // Vérifie que la réponse correspond à la structure attendue
    if (response.choices && response.choices.length > 0 && response.choices[0].message) {
      return response.choices[0].message.content.trim();
    } else {
      console.error("Réponse inattendue de l'API OpenAI:", response);
      return null;
    }
  } catch (error) {
    console.error("Erreur lors de l'appel à OpenAI :", error);
    return null;
  }
};

/**
 * Génère une description d'audio en utilisant OpenAI.
 * @param {string} content - Contenu pour générer la description.
 * @returns {Promise<string|null>} - La description générée.
 */
exports.generateAudioDescription = async (content) => {
  const openai = getOpenAIClient();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Tu es un expert en création de descriptions audio. Ton rôle est de générer une description concise et engageante basée sur le contenu fourni."
        },
        {
          role: "user",
          content: `Génère une description pour l'audio suivant : "${content}".`
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    if (response.choices && response.choices.length > 0 && response.choices[0].message) {
      return response.choices[0].message.content.trim();
    } else {
      console.error("Réponse inattendue de l'API OpenAI:", response);
      return null;
    }
  } catch (error) {
    console.error("Erreur lors de l'appel à OpenAI :", error);
    return null;
  }
};

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
  const openai = getOpenAIClient();
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
      messages: [
        {
            role: "developer",
            content: "Vous êtes un expert en communication digitale et en rédaction de contenu optimisé pour le web. Votre mission est de générer un contenu qui pourra être publié à la fois sur les réseaux sociaux (Facebook, LinkedIn, Twitter, Instagram) et sur WordPress. Le contenu doit être rédigé en respectant les critères suivants : \n\n• Utiliser les mots-clés fournis pour structurer le texte. \n• Adopter le ton spécifié par l'utilisateur (par exemple, professionnel, décontracté, informatif, etc.) sans ajouter de consignes par défaut. \n• Le contenu doit être adapté aux contraintes de longueur de chaque plateforme : \n   - Pour Twitter, le contenu doit être concis et percutant (maximum 280 caractères). \n   - Pour WordPress, le contenu peut être plus long et détaillé, optimisé pour le SEO. \n   - Pour Facebook, LinkedIn et Instagram, le contenu doit être engageant et adapté au format de la plateforme. \n• Intégrer les variables dynamiques indiquées (par exemple, Nom: \"Votre Entreprise\", Date: \"12/03/2025\", Lieu: \"Paris\") dans le texte. \n\nGénérez un contenu cohérent, captivant et prêt à être publié sur ces plateformes en prenant en compte ces instructions."
        },
        {
            role: "user",
            content: finalPrompt,
        },
      ],
      // max_tokens: 300,
      temperature: 0.7,
    });
    return response.choices[0];
  } catch (error) {
    console.error("Erreur OpenAI:", error);
    return null;
  }
};
