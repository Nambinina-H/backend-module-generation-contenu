const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const ApiConfigService = require('../services/apiConfigService');

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

  try {
    // Obtenir l'heure actuelle en UTC
    const nowUtc = new Date().toISOString();
    console.log('🕒 Vérification des publications planifiées avec les critères suivants :');
    console.log('   - Status : scheduled');
    console.log('   - Schedule_time <=', nowUtc);

    // Récupérer les publications planifiées
    const { data: scheduledPublications, error } = await supabase
      .from('publications')
      .select('*')
      .eq('status', 'scheduled') // Filtrer par statut 'scheduled'
      .lte('schedule_time', nowUtc); // Comparer schedule_time avec l'heure actuelle en UTC

    if (error) {
      console.error('Erreur de récupération des publications planifiées:', error);
      return;
    }

    if (!scheduledPublications || scheduledPublications.length === 0) {
      console.log('Aucune publication planifiée à publier.');
    } else {
      console.log(`📋 Nombre de publications planifiées à publier : ${scheduledPublications.length}`);
    }
  } catch (err) {
    console.error('🚨 Erreur inattendue dans le scheduler:', err);
  }
});

module.exports = { scheduledTask, initializeSupabaseClient };