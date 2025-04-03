const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const ApiConfigService = require('../services/apiConfigService');
const { publishToPlatform } = require('../services/makeService');

let supabase = null;

// Fonction pour initialiser le client Supabase
const initializeSupabaseClient = () => {
  const supabaseKeys = ApiConfigService.getKeyFromCache('supabase');
  if (supabaseKeys?.url && supabaseKeys?.key) {
    supabase = createClient(supabaseKeys.url, supabaseKeys.key);
    console.log('🔄 Client Supabase initialisé pour le scheduler');
  } else {
    console.error('❌ Clés Supabase manquantes pour le scheduler');
  }
};

// Planification des tâches
const scheduledTask = cron.schedule('* * * * *', async () => {
  if (!supabase) {
    console.error('❌ Supabase non initialisé. Impossible d\'exécuter le scheduler.');
    return;
  }

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
        await publishToPlatform(platform, content.content, content.mediaUrl, content.type);
      } catch (err) {
        console.error(`Erreur de publication pour le contenu ${content.id} sur ${platform}:`, err);
      }
    }
    await supabase.from('content').update({ status: 'published' }).eq('id', content.id);
  }
});

module.exports = { scheduledTask, initializeSupabaseClient };