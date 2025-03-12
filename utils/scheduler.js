const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const { publishToPlatform } = require('../services/makeService');

const scheduledTask = cron.schedule('* * * * *', async () => {
  const { data: scheduledContents, error } = await supabase
    .from('content')
    .select('*')
    .eq('status', 'scheduled')
    .lte('schedule_time', new Date().toISOString());

  if (error) {
    return console.error('Erreur de récupération des contenus planifiés:', error);
  }

  if (!scheduledContents || scheduledContents.length === 0) {
    console.log('Aucun contenu planifié à publier.');
    return;
  }

  for (const content of scheduledContents) {
    const platforms = content.platforms || [];
    for (const platform of platforms) {
      try {
        await publishToPlatform(platform, content.content, content.id);
      } catch (err) {
        console.error(`Erreur de publication pour le contenu ${content.id} sur ${platform}:`, err);
      }
    }
    await supabase.from('content').update({ status: 'published' }).eq('id', content.id);
  }
});

module.exports = scheduledTask;