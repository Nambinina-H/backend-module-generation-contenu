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
    console.log('   - Published_at <=', nowUtc);

    // Récupérer les publications planifiées
    const { data: scheduledPublications, error } = await supabase
      .from('publications')
      .select('*')
      .eq('status', 'scheduled')
      .lte('published_at', nowUtc); // Comparer avec l'heure UTC

    if (error) {
      console.error('Erreur de récupération des publications planifiées:', error);
      return;
    }

    // console.log('📋 Données brutes retournées par Supabase :', scheduledPublications);

    if (!scheduledPublications || scheduledPublications.length === 0) {
      console.log('Aucune publication planifiée à afficher.');
      return;
    }

    // Afficher les publications planifiées
    // console.log('📋 Publications planifiées à publier :', scheduledPublications);
  } catch (err) {
    console.error('🚨 Erreur inattendue dans le scheduler:', err);
  }
});

module.exports = { scheduledTask, initializeSupabaseClient };