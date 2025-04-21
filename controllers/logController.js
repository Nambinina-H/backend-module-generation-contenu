const { supabase } = require('../services/supabaseService');

exports.getLogs = async (req, res) => {
  const adminRole = req.user.role;

  if (adminRole !== 'admin') {
    return res.status(403).json({ error: "Accès refusé. Seuls les admins peuvent voir les logs." });
  }

  // ✅ Récupérer les paramètres de filtre et pagination
  let { user_id, action, page = 1, limit = 10, sort = 'date-desc' } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);

  if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
    return res.status(400).json({ error: "Les paramètres `page` et `limit` doivent être des nombres positifs." });
  }

  try {
    // Construire la requête de base
    let baseQuery = supabase.from('logs').select('*', { count: 'exact' });

    // Appliquer les filtres
    if (user_id) {
      baseQuery = baseQuery.eq('user_id', user_id);
    }
    if (action) {
      baseQuery = baseQuery.eq('action', action);
    }

    // Récupérer le nombre total de logs avec les filtres
    const { count, error: countError } = await baseQuery;

    if (countError) {
      console.error("🚨 Erreur lors du comptage des logs:", countError);
      return res.status(500).json({ error: countError.message });
    }

    // Calculer la pagination
    const totalPages = Math.ceil(count / limit);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Récupérer les logs paginés
    const { data, error } = await baseQuery
      .order('created_at', { ascending: sort === 'date-asc' })
      .range(from, to);

    if (error) {
      console.error("🚨 Erreur lors de la récupération des logs:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      message: "Logs récupérés avec succès",
      logs: data,
      pagination: {
        page,
        limit,
        totalLogs: count,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error("🚨 Erreur serveur:", error);
    res.status(500).json({ error: error.message });
  }
};
