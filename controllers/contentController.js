// controllers/contentController.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const { generateContent } = require('../services/contentGenerator');

exports.generate = async (req, res) => {
  const { type, keywords, personalization } = req.body;
  const userId = req.user.id;

  if (!type || !keywords || !Array.isArray(keywords)) {
    return res.status(400).json({ error: 'Merci de fournir un type et un tableau de mots-clés.' });
  }

  try {
    // Vérifier la génération du contenu
    const content = await generateContent(type, keywords, personalization);
    console.log("📌 Contenu généré :", content); // Debugging

    // Vérifier si le contenu est vide
    if (!content) {
      return res.status(500).json({ error: "Erreur lors de la génération du contenu." });
    }

    // Insertion dans Supabase
    const { data, error } = await supabase
      .from('content')
      .insert([{ type, keywords, content, personalization, status: 'generated', user_id: userId }])
      .select();  // Ajout de `select()` pour récupérer les données insérées

    if (error) {
      console.error('🚨 Erreur Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log("📌 Données insérées dans Supabase :", data); // Debugging

    res.json({ message: 'Contenu généré avec succès', content: data });
  } catch (error) {
    console.error('🚨 Erreur serveur:', error);
    res.status(500).json({ error: error.message });
  }
};


// Récupérer les contenus de l'utilisateur connecté
exports.listUserContent = async (req, res) => {
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
    res.status(500).json({ error: error.message });
  }
};


// Modifie les contenus de l'utilisateur connecté
exports.updateContent = async (req, res) => {
  const { contentId } = req.params; // ID du contenu à modifier
  const { type, keywords, personalization, status } = req.body;
  const userId = req.user.id; // ID de l’utilisateur connecté

  try {
    // Vérifier si le contenu appartient à l'utilisateur
    const { data: existingContent, error: fetchError } = await supabase
      .from('content')
      .select('user_id')
      .eq('id', contentId)
      .single();

    if (fetchError || !existingContent) {
      return res.status(404).json({ error: 'Contenu introuvable' });
    }

    if (existingContent.user_id !== userId) {
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
    res.status(500).json({ error: error.message });
  }
};


// Supprime les contenus de l'utilisateur connecté
exports.deleteContent = async (req, res) => {
  const { contentId } = req.params; // ID du contenu à supprimer
  const userId = req.user.id; // ID de l’utilisateur connecté

  try {
    // Vérifier si le contenu appartient à l'utilisateur
    const { data: existingContent, error: fetchError } = await supabase
      .from('content')
      .select('user_id')
      .eq('id', contentId)
      .single();

    if (fetchError || !existingContent) {
      return res.status(404).json({ error: 'Contenu introuvable' });
    }

    if (existingContent.user_id !== userId) {
      return res.status(403).json({ error: 'Accès refusé. Vous ne pouvez supprimer que votre propre contenu.' });
    }

    // Suppression du contenu
    const { error } = await supabase.from('content').delete().eq('id', contentId);

    if (error) {
      console.error('🚨 Erreur lors de la suppression du contenu :', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Contenu supprimé avec succès' });
  } catch (error) {
    console.error('🚨 Erreur serveur :', error);
    res.status(500).json({ error: error.message });
  }
};

