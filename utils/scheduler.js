const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const ApiConfigService = require('../services/apiConfigService');
const { publishToPlatform } = require('../services/makeService');
const { logAction } = require('../services/logService');
// Ajouter l'import du service Twitter
const TwitterOAuthService = require('../services/oauth/twitterOAuthService');

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

        // Traitement spécial pour WordPress
        if (publication.platform === 'wordpress') {
          console.log('🔄 Publication WordPress détectée, marquage direct comme publiée');
          
          // Mettre à jour la table `publications` directement à "published"
          await supabase
            .from('publications')
            .update({
              status: 'published',
              published_at: `${publication.schedule_time}`,
            })
            .eq('id', publication.id);
          
          // Ajouter un log de succès spécifique pour WordPress
          await logAction(
            publication.user_id,
            `publish_wordpress`,
            `Lien vers la publication : ${publication.content_url}`
          );
          
          console.log('✅ Publication WordPress mise à jour avec succès');
          continue; // Passer à la publication suivante
        }

        // Traitement spécial pour Twitter
        if (publication.platform === 'twitter') {
          console.log('🔄 Publication Twitter détectée, utilisation de l\'API Twitter');
          
          // Mettre le statut à "processing" avant de commencer
          await supabase
            .from('publications')
            .update({ status: 'processing' })
            .eq('id', publication.id);
          
          console.log(`🔄 Statut de la publication ${publication.id} mis à "processing"`);
          
          // Récupérer le contenu et les médias
          const content = publication.content_preview;
          let mediaIds = [];
          
          // Si des médias sont présents, traiter les IDs
          if (publication.media_url) {
            mediaIds = publication.media_url.split(',');
            console.log('🖼️ IDs médias récupérés:', mediaIds);
          }
          
          // Publier le tweet avec TwitterOAuthService
          console.log('🐦 Publication du tweet avec contenu:', content);
          const tweet = await TwitterOAuthService.publishTweet(
            publication.user_id,
            content,
            mediaIds
          );
          
          // Construire l'URL du tweet
          const tweetUrl = `https://twitter.com/i/web/status/${tweet.data.id}`;
          
          // Mettre à jour la table `publications` après succès
          await supabase
            .from('publications')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
              content_url: tweetUrl,
            })
            .eq('id', publication.id);
          
          // Ajouter un log de succès
          await logAction(
            publication.user_id,
            'publish_twitter',
            `Lien vers la publication : ${tweetUrl}`
          );
          
          console.log('✅ Tweet publié avec succès, ID:', tweet.data.id);
          continue; // Passer à la publication suivante
        }

        // Appliquer la logique uniquement pour Facebook, LinkedIn et Instagram
        if (['facebook', 'linkedin', 'instagram'].includes(publication.platform)) {
          // Mettre le statut à "processing" seulement avant de commencer le traitement réel
          // et après avoir vérifié que ce n'est pas WordPress
          await supabase
            .from('publications')
            .update({ status: 'processing' })
            .eq('id', publication.id);
            
          console.log(`🔄 Statut de la publication ${publication.id} mis à "processing"`);

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
            `publish_${publication.platform}`,
            `Lien vers la publication : ${contentUrl}`
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
          `publish_failed_${publication.platform}`,
          `Erreur lors de la publication sur ${publication.platform} : ${publishError.message}`
        );
      }
    }
  } catch (err) {
    console.error('🚨 Erreur inattendue dans le scheduler:', err);
  }
});

module.exports = { scheduledTask, initializeSupabaseClient };