const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const ApiConfigService = require('../services/apiConfigService');
const { publishToPlatform } = require('../services/makeService');
const { logAction } = require('../services/logService');

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
    // Étape 1 : Récupérer les publications planifiées
    const nowUtc = new Date().toISOString();
    console.log('🕒 Vérification des publications planifiées avec les critères suivants :');
    console.log('   - Status : scheduled');
    console.log('   - Schedule_time <=', nowUtc);

    const { data: scheduledPublications, error } = await supabase
      .from('publications')
      .select('*')
      .eq('status', 'scheduled')
      .lte('schedule_time', nowUtc);

    if (error) {
      console.error('Erreur de récupération des publications planifiées:', error);
      return;
    }

    if (!scheduledPublications || scheduledPublications.length === 0) {
      console.log('Aucune publication planifiée à publier.');
      return;
    }

    console.log(`📋 Nombre de publications planifiées à publier : ${scheduledPublications.length}`);

    // Étape 2 : Appeler les fonctions de publication appropriées
    for (const publication of scheduledPublications) {
      try {
        console.log('📤 Publication en cours pour:', publication);

        // Mettre le statut à "processing" pour éviter les duplications
        await supabase
          .from('publications')
          .update({ status: 'processing' })
          .eq('id', publication.id);

        // Appliquer la logique uniquement pour Facebook, LinkedIn et Instagram
        if (['facebook', 'linkedin', 'instagram'].includes(publication.platform)) {
          // Appeler la fonction de publication
          const response = await publishToPlatform(
            publication.user_id,
            publication.platform,
            publication.content_preview,
            publication.media_url,
            publication.type
          );

          // Adapter content_url en fonction de la plateforme
          let contentUrl;
          if (publication.platform === 'facebook') {
            contentUrl = `https://www.${publication.platform}.com/${response}`;
          } else if (publication.platform === 'linkedin') {
            contentUrl = `https://www.linkedin.com/feed/update/${response}`;
          } else {
            contentUrl = response;
          }

          // Étape 3 : Mettre à jour la table `publications` après succès
          await supabase
            .from('publications')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
              content_url: contentUrl, // Ajouter l'URL du contenu publié
            })
            .eq('id', publication.id);

          // Ajouter un log de succès
          await logAction(
            publication.user_id,
            'publish_success',
            `Contenu publié sur ${publication.platform} : ${contentUrl}`
          );
          console.log('✅ Publication réussie pour:', publication.platform);
        } else {
          console.warn(`⚠️ Plateforme non supportée ou non implémentée : ${publication.platform}`);
        }
      } catch (publishError) {
        console.error('❌ Erreur lors de la publication:', publishError);

        // Étape 3 : Mettre à jour la table `publications` en cas d'échec
        await supabase
          .from('publications')
          .update({
            status: 'failed',
            error_message: publishError.message,
          })
          .eq('id', publication.id);

        // Ajouter un log d'erreur
        await logAction(
          publication.user_id,
          'publish_failed',
          `Erreur lors de la publication sur ${publication.platform} : ${publishError.message}`
        );
      }
    }
  } catch (err) {
    console.error('🚨 Erreur inattendue dans le scheduler:', err);
  }
});

module.exports = { scheduledTask, initializeSupabaseClient };