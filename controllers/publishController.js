const ApiConfigService = require('../services/apiConfigService');
const { createClient } = require("@supabase/supabase-js");
const { publishToPlatform } = require("../services/makeService");
const { logAction } = require("../services/logService");
const axios = require('axios');
const { decrypt } = require('../utils/encryptionUtil');

const getSupabaseClient = () => {
  const apiKeys = ApiConfigService.getKeyFromCache('supabase');
  console.log('🔑 Clés Supabase récupérées:', {
    hasUrl: !!apiKeys?.url,
    hasKey: !!apiKeys?.key
  });
  
  if (!apiKeys?.url || !apiKeys?.key) {
    console.warn('⚠️ Configuration Supabase manquante dans le cache');
    // Fallback sur les variables d'environnement
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  }
  
  return createClient(apiKeys.url, apiKeys.key);
};

/**
 * Planifie la publication d'un contenu.
 * @param {Object} req - Requête Express.
 * @param {Object} res - Réponse Express.
 */
exports.schedulePublication = async (req, res) => {
  const { content, platforms, type, mediaUrl, scheduleTime } = req.body;
  const userId = req.user.id;
  const supabase = getSupabaseClient();

  if (!platforms || !Array.isArray(platforms) || !type || !scheduleTime) {
    return res.status(400).json({ error: "Merci de fournir un tableau de plateformes, le type de contenu et une date de planification." });
  }

  if ((type === 'text' && !content) || (!mediaUrl && (type === 'image' || type === 'video')) || ((type === 'text-image' || type === 'text-video') && (!content || !mediaUrl))) {
    return res.status(400).json({ error: "Merci de fournir le contenu ou l'URL du média approprié." });
  }

  try {
    // Insert the scheduled content into the database
    const { data, error } = await supabase
      .from("content")
      .insert({
        content,
        platforms,
        type,
        mediaUrl,
        status: "scheduled",
        schedule_time: scheduleTime,
        user_id: userId,
      });

    if (error) {
      console.error("🚨 Erreur lors de la planification :", error);
      return res.status(500).json({ error: error.message });
    }

    await logAction(userId, "schedule_content", `Contenu planifié pour publication sur ${platforms.join(", ")} à ${scheduleTime}`);

    res.json({ message: "Contenu planifié avec succès", details: data });
  } catch (error) {
    console.error("🚨 Erreur serveur :", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Publie un contenu immédiatement.
 * @param {Object} req - Requête Express.
 * @param {Object} res - Réponse Express.
 */
exports.publishNow = async (req, res) => {
  const { content, platforms, type, mediaUrl } = req.body;
  const userId = req.user.id;

  if (!platforms || !Array.isArray(platforms) || !type) {
    return res.status(400).json({ error: "Merci de fournir un tableau de plateformes et le type de contenu." });
  }

  if ((type === 'text' && !content) || (!mediaUrl && (type === 'image' || type === 'video')) || ((type === 'text-image' || type === 'text-video') && (!content || !mediaUrl))) {
    return res.status(400).json({ error: "Merci de fournir le contenu ou l'URL du média approprié." });
  }

  try {
    let publishResponses = {};

    for (const platform of platforms) {
      const response = await publishToPlatform(platform, content, mediaUrl, type);
      publishResponses[platform] = response;
    }

    await logAction(userId, "publish_content", `Contenu publié sur ${platforms.join(", ")}`);

    res.json({ message: "Contenu publié avec succès", details: publishResponses });
  } catch (error) {
    console.error("🚨 Erreur de publication:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Annule une publication planifiée.
 * @param {Object} req - Requête Express.
 * @param {Object} res - Réponse Express.
 */
exports.cancelScheduledPublication = async (req, res) => {
  const { contentId } = req.body;
  const userId = req.user.id;
  const supabase = getSupabaseClient();

  if (!contentId) {
    return res.status(400).json({ error: "Merci de fournir un contentId." });
  }

  try {
    // Vérifier si le contenu est bien planifié
    const { data: existingContent, error: fetchError } = await supabase
      .from("content")
      .select("id, user_id, status")
      .eq("id", contentId)
      .single();

    if (fetchError || !existingContent) {
      return res.status(404).json({ error: "Contenu introuvable ou non planifié." });
    }

    // Vérifier si l'utilisateur est l'auteur ou un admin
    if (existingContent.user_id !== userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Accès refusé. Vous ne pouvez annuler que votre propre contenu." });
    }

    if (existingContent.status !== "scheduled") {
      return res.status(400).json({ error: "Ce contenu n’est pas planifié." });
    }

    // Annuler la publication (remettre en "draft")
    await supabase
      .from("content")
      .update({ status: "draft", schedule_time: null })
      .eq("id", contentId);

    await logAction(userId, "cancel_publication", `Publication du contenu ${contentId} annulée`);

    res.json({ message: `Publication du contenu ${contentId} annulée avec succès.` });
  } catch (error) {
    console.error("🚨 Erreur d'annulation de publication:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Publie un contenu sur WordPress.
 * @param {Object} req - Requête Express.
 * @param {Object} res - Réponse Express.
 */
exports.publishToWordPress = async (req, res) => {
  const { content, mediaUrl, type, date, title, status } = req.body; // Ajout de `status`
  const userId = req.user.id;

  if (!content || !type || !status) {
    return res.status(400).json({ error: 'Le contenu, le type et le statut sont obligatoires.' });
  }

  if (!['publish', 'future'].includes(status)) {
    return res.status(400).json({ error: 'Le statut doit être soit "publish" soit "future".' });
  }

  try {
    // Vérifier si l'utilisateur est connecté à WordPress
    const wordpressConfig = req.user.isWordPressConnected;

    if (!wordpressConfig || !wordpressConfig.keys) {
      return res.status(400).json({ error: 'Vous n\'êtes pas connecté à WordPress. Veuillez connecter votre compte WordPress pour continuer.' });
    }

    // Décrypter les clés WordPress
    const decryptedKeys = JSON.parse(decrypt(wordpressConfig.keys));
    const { access_token, blog_id } = decryptedKeys;

    if (!access_token || !blog_id) {
      return res.status(400).json({ error: 'Les informations WordPress sont incomplètes.' });
    }

    // Construire les données pour la publication
    const postData = {
      content,
      status, // Utiliser le statut fourni en entrée
      date, // Ajout de la date
      title, // Ajout du titre
    };

    if (type === 'text-image' || type === 'text-video') {
      if (!mediaUrl) {
        return res.status(400).json({ error: 'L\'URL du média est obligatoire pour ce type de contenu.' });
      }

      // Ajouter le média au contenu
      postData.media_urls = [mediaUrl];
    }

    // Appeler l'API WordPress pour publier le post
    const response = await axios.post(
      `https://public-api.wordpress.com/rest/v1.1/sites/${blog_id}/posts/new`,
      postData,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    // Enregistrer le log de publication ou de planification
    const logMessage = status === 'future' 
      ? `Contenu planifié le ${response.data.date} pour WordPress ${response.data.URL}` 
      : `Contenu publié sur WordPress ${response.data.URL}`;
    await logAction(userId, 'publish_wordpress', logMessage);

    res.json({ message: 'Contenu traité avec succès sur WordPress', post: response.data });
  } catch (error) {
    console.error('🚨 Erreur lors de la publication sur WordPress:', error.message);
    res.status(500).json({ error: 'Erreur lors de la publication sur WordPress.' });
  }
};
