// utils/scheduler.js
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const { publishToPlatform } = require('../services/makeService');

cron.schedule('* * * * *', async () => {
  // Cette tâche s'exécute toutes les minutes
  const { data: scheduledContents, error } = await supabase
    .from('content')
    .select('*')
    .eq('status', 'scheduled')
    .lte('schedule_time', new Date().toISOString());

  if (error) return console.error('Erreur de récupération des contenus planifiés:', error);

  for (const content of scheduledContents) {
    // Publie sur toutes les plateformes associées (à adapter si tu stockes cette info)
    const platforms = content.platforms || []; // Assure-toi de stocker les plateformes au moment de la planification
    for (const platform of platforms) {
      try {
        await publishToPlatform(platform, content.content, content.id);
      } catch (err) {
        console.error(`Erreur de publication pour le contenu ${content.id} sur ${platform}:`, err);
      }
    }
    // Met à jour le statut en "published"
    await supabase.from('content').update({ status: 'published' }).eq('id', content.id);
  }
});
