const { supabase } = require('../services/supabaseService');

exports.getAllPublications = async (req, res) => {
  const { platform, type, status, startDate, endDate, page = 1, limit = 10, sort = 'published_at:desc' } = req.query;

  try {
    let query = supabase.from('publications').select('*', { count: 'exact' });

    // Appliquer les filtres
    if (platform) query = query.eq('platform', platform);
    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);
    if (startDate) query = query.gte('published_at', startDate);
    if (endDate) query = query.lte('published_at', endDate);

    // Gestion du tri
    const [sortField, sortOrder] = sort.split(':');
    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Exécuter la requête
    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Erreur lors de la récupération des publications:', error);
      return res.status(500).json({ error: error.message });
    }

    const totalPages = Math.ceil(count / limit);

    res.json({
      message: 'Liste des publications récupérée avec succès',
      publications: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPublications: count,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getUserPublications = async (req, res) => {
  const userId = req.user.id;
  const { platform, type, status, startDate, endDate, page = 1, limit = 10, sort = 'published_at:desc' } = req.query;

  try {
    let query = supabase.from('publications').select('*', { count: 'exact' }).eq('user_id', userId);

    // Appliquer les filtres
    if (platform) query = query.eq('platform', platform);
    if (type) query = query.eq('type', type);
    if (status) query = query.eq('status', status);
    if (startDate) query = query.gte('published_at', startDate);
    if (endDate) query = query.lte('published_at', endDate);

    // Gestion du tri
    const [sortField, sortOrder] = sort.split(':');
    query = query.order(sortField, { ascending: sortOrder === 'asc' });

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Exécuter la requête
    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Erreur lors de la récupération des publications utilisateur:', error);
      return res.status(500).json({ error: error.message });
    }

    const totalPages = Math.ceil(count / limit);

    res.json({
      message: 'Liste des publications utilisateur récupérée avec succès',
      publications: data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPublications: count,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    res.status(500).json({ error: error.message });
  }
};
