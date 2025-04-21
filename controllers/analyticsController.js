const { supabase } = require('../services/supabaseService');

exports.getWeeklyAnalytics = async (req, res) => {
  try {
    // Calculer les dates de début (lundi) et de fin (dimanche) de la semaine en UTC
    const now = new Date();
    const startOfWeek = new Date(now.setUTCDate(now.getUTCDate() - now.getUTCDay() + 1)); // Lundi
    const endOfWeek = new Date(now.setUTCDate(startOfWeek.getUTCDate() + 6)); // Dimanche

    startOfWeek.setUTCHours(0, 0, 0, 0); // Début de la journée
    endOfWeek.setUTCHours(23, 59, 59, 999); // Fin de la journée

    // Récupérer les publications publiées durant la semaine
    const { data, error } = await supabase
      .from('publications')
      .select('platform, published_at')
      .eq('status', 'published')
      .gte('published_at', startOfWeek.toISOString())
      .lte('published_at', endOfWeek.toISOString());

    if (error) {
      console.error('❌ Erreur lors de la récupération des statistiques hebdomadaires:', error);
      return res.status(500).json({ error: error.message });
    }

    // Initialiser les statistiques par jour et par plateforme
    const daysOfWeek = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const platforms = ['facebook', 'linkedin', 'twitter', 'instagram']; // Liste des plateformes à inclure
    const dailyStats = {};
    const platformTotals = {};

    // Préparer les structures pour chaque jour avec des compteurs à 0
    daysOfWeek.forEach((day) => {
      dailyStats[day] = {};
      platforms.forEach((platform) => {
        dailyStats[day][platform] = 0;
      });
    });

    // Initialiser les totaux des plateformes à 0
    platforms.forEach((platform) => {
      platformTotals[platform] = 0;
    });

    // Parcourir les données pour les regrouper par jour et par plateforme
    data.forEach((publication) => {
      const publishedDate = new Date(publication.published_at);
      const dayIndex = (publishedDate.getUTCDay() + 6) % 7; // Convertir dimanche (0) en dernier jour (6)
      const dayName = daysOfWeek[dayIndex];
      const platform = publication.platform;

      // Incrémenter le compteur pour le jour et la plateforme
      if (dailyStats[dayName][platform] !== undefined) {
        dailyStats[dayName][platform]++;
      }

      // Incrémenter le total pour la plateforme
      if (platformTotals[platform] !== undefined) {
        platformTotals[platform]++;
      }
    });

    res.json({
      message: 'Statistiques hebdomadaires récupérées avec succès',
      startOfWeek: startOfWeek.toISOString(),
      endOfWeek: endOfWeek.toISOString(),
      dailyStats,
      platformTotals,
    });
  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    res.status(500).json({ error: error.message });
  }
};
