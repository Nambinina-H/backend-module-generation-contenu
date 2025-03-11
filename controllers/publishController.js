// controllers/publishController.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const { publishToPlatform } = require('../services/makeService');

exports.publish = async (req, res) => {
  const { contentId, platforms, scheduleTime } = req.body;
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
      res.json({ message: 'Contenu publié', details: publishResponses });
    } catch (error) {
      console.error('Erreur de publication:', error);
      res.status(500).json({ error: error.message });
    }
  }
};
