// controllers/contentController.js
const { createClient } = require('@supabase/supabase-js');
const ApiConfigService = require('../services/apiConfigService');
const { generateContent } = require('../services/contentGenerator');
const { logAction } = require('../services/logService');

// Fonction pour récupérer le client Supabase
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

exports.generate = async (req, res) => {
  const supabase = getSupabaseClient();
  const { type, keywords, personalization } = req.body;
  const userId = req.user.id;

  if (!type || !keywords || !Array.isArray(keywords)) {
    return res.status(400).json({ error: 'Merci de fournir un type et un tableau de mots-clés.' });
  }

  try {
    // Vérifier la génération du contenu
    const generatedResponse = await generateContent(type, keywords, personalization);
    console.log("📌 Contenu généré :", generatedResponse); // Debugging
  
    // Vérifier si le contenu est vide ou si une erreur est présente
    if (!generatedResponse || generatedResponse.error) {
      const errorMessage = generatedResponse?.error?.message || "Erreur lors de la génération du contenu.";
      console.error("🚨 Erreur OpenAI:", generatedResponse?.error || "Réponse vide");
      return res.status(500).json({ error: errorMessage });
    }
  
    // Extraire uniquement le contenu
    const content = generatedResponse.message.content; // Ajout de cette ligne
  
    // Insertion dans Supabase
    const { data, error } = await supabase
      .from('content')
      .insert([{ type, keywords, content, personalization, status: 'generated', user_id: userId }]) // Modification ici
      .select();  // Ajout de `select()` pour récupérer les données insérées
  
    if (error) {
      console.error('🚨 Erreur Supabase:', error);
      return res.status(500).json({ error: error.message });
    }
  
    console.log("📌 Données insérées dans Supabase :", data); // Debugging
  
    // Enregistrer le log de génération de contenu
    await logAction(userId, 'generate_content', `Contenu de type '${type}' généré avec les mots-clés : ${keywords.join(', ')}`);
  
    res.json({ message: 'Contenu généré avec succès', content: data });
  } catch (error) {
    console.error('🚨 Erreur serveur:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.listUserContent = async (req, res) => {
  const supabase = getSupabaseClient();
  const userId = req.user.id; // ID de l'utilisateur connecté

  try {
    // Récupérer uniquement les contenus créés par l'utilisateur
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('user_id', userId); // Filtrer par utilisateur

    if (error) {
      console.error('Erreur Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Contenus récupérés avec succès', contents: data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.updateContent = async (req, res) => {
  const supabase = getSupabaseClient();
  const { contentId } = req.params;
  const { type, keywords, personalization, status } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role; // Récupérer le rôle de l'utilisateur

  try {
    // Vérifier si le contenu existe
    const { data: existingContent, error: fetchError } = await supabase
      .from('content')
      .select('user_id')
      .eq('id', contentId)
      .single();

    if (fetchError || !existingContent) {
      return res.status(404).json({ error: 'Contenu introuvable' });
    }

    // Vérifier les permissions : admin = accès total, user = accès limité
    if (userRole !== 'admin' && existingContent.user_id !== userId) {
      return res.status(403).json({ error: 'Accès refusé. Vous ne pouvez modifier que votre propre contenu.' });
    }

    // Mise à jour du contenu
    const { data, error } = await supabase
      .from('content')
      .update({ type, keywords, personalization, status })
      .eq('id', contentId)
      .select();

    if (error) {
      console.error('🚨 Erreur lors de la mise à jour du contenu :', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Contenu mis à jour avec succès', content: data });
  } catch (error) {
    console.error('🚨 Erreur serveur :', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.deleteContent = async (req, res) => {
  const supabase = getSupabaseClient();
  const { contentId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role; // Récupérer le rôle de l'utilisateur

  try {
    // Vérifier si le contenu existe
    const { data: existingContent, error: fetchError } = await supabase
      .from('content')
      .select('user_id')
      .eq('id', contentId)
      .single();

    if (fetchError || !existingContent) {
      return res.status(404).json({ error: 'Contenu introuvable' });
    }

    // Vérifier les permissions : admin = accès total, user = accès limité
    if (userRole !== 'admin' && existingContent.user_id !== userId) {
      return res.status(403).json({ error: 'Accès refusé. Vous ne pouvez supprimer que votre propre contenu.' });
    }

    // Suppression du contenu
    const { error } = await supabase.from('content').delete().eq('id', contentId);

    if (error) {
      console.error('🚨 Erreur lors de la suppression du contenu :', error);
      return res.status(500).json({ error: error.message });
    }

    // Enregistrer le log
    await logAction(userId, 'delete', `Contenu ${contentId} supprimé`);

    res.json({ message: 'Contenu supprimé avec succès' });
  } catch (error) {
    console.error('🚨 Erreur serveur :', error);
    return res.status(500).json({ error: error.message });
  }
};


