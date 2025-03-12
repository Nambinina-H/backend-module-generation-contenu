// controllers/publishController.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const { publishToPlatform } = require('../services/makeService');

exports.publish = async (req, res) => {
  const { contentId, platforms, scheduleTime } = req.body;
  const userId = req.user.id; // Récupérer l'ID de l'utilisateur

  if (!contentId || !platforms || !Array.isArray(platforms)) {
    return res.status(400).json({ error: 'Merci de fournir un contentId et un tableau de plateformes.' });
  }

  // Récupérer le contenu généré depuis Supabase
  const { data: contentData, error: fetchError } = await supabase
    .from('content')
    .select('*')
    .eq('id', contentId)
    .single();

  if (fetchError || !contentData) {
    return res.status(404).json({ error: 'Contenu introuvable' });
  }

  // Publication planifiée
  if (scheduleTime) {
    console.log(`Publication planifiée du contenu ${contentId} sur ${platforms.join(', ')} à ${scheduleTime}`);
    await supabase.from('content').update({ status: 'scheduled', schedule_time: scheduleTime }).eq('id', contentId);

    // Enregistrer le log pour la planification
    await logAction(userId, 'schedule_content', `Contenu ${contentId} planifié pour publication sur ${platforms.join(', ')} à ${scheduleTime}`);

    return res.json({ message: 'Contenu planifié pour publication' });

  } else {
    // Publication immédiate via Make.com
    try {
      const publishResponses = {};
      for (const platform of platforms) {
        const response = await publishToPlatform(platform, contentData.content, contentId);
        publishResponses[platform] = response;
      }

      // Mettre à jour le statut en "published"
      await supabase.from('content').update({ status: 'published' }).eq('id', contentId);

      // Enregistrer le log de publication
      await logAction(userId, 'publish_content', `Contenu ${contentId} publié sur ${platforms.join(', ')}`);

      res.json({ message: 'Contenu publié', details: publishResponses });
    } catch (error) {
      console.error('Erreur de publication:', error);
      res.status(500).json({ error: error.message });
    }
  }
};


exports.cancelScheduledPublication = async (req, res) => {
  const { contentId } = req.body;
  const userId = req.user.id;

  if (!contentId) {
    return res.status(400).json({ error: 'Merci de fournir un contentId.' });
  }

  try {
    // Vérifier si le contenu existe et est bien "scheduled"
    const { data: existingContent, error: fetchError } = await supabase
      .from('content')
      .select('id, user_id, status')
      .eq('id', contentId)
      .single();

    if (fetchError || !existingContent) {
      return res.status(404).json({ error: 'Contenu introuvable ou non planifié.' });
    }

    // Vérifier si l'utilisateur est bien l'auteur ou admin
    if (existingContent.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé. Vous ne pouvez annuler que votre propre contenu.' });
    }

    if (existingContent.status !== 'scheduled') {
      return res.status(400).json({ error: 'Ce contenu n’est pas planifié.' });
    }

    // Annuler la publication en repassant en "draft"
    const { error: updateError } = await supabase
      .from('content')
      .update({ status: 'draft', schedule_time: null })
      .eq('id', contentId);

    if (updateError) {
      console.error('🚨 Erreur lors de l’annulation de la publication :', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    // Enregistrer le log d’annulation
    await logAction(userId, 'cancel_publication', `Publication du contenu ${contentId} annulée`);

    res.json({ message: `Publication du contenu ${contentId} annulée avec succès.` });
  } catch (error) {
    console.error('🚨 Erreur serveur:', error);
    res.status(500).json({ error: error.message });
  }
};

