const { supabase } = require('../services/supabaseService');

exports.getLogs = async (req, res) => {
  const adminRole = req.user.role;

  if (adminRole !== 'admin') {
    return res.status(403).json({ error: "Accès refusé. Seuls les admins peuvent voir les logs." });
  }

  // Récupérer les paramètres de filtre et pagination
  let { user_id, action, page = 1, limit = 10 } = req.query;
  page = parseInt(page);
  limit = parseInt(limit);

  if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1) {
    return res.status(400).json({ error: "Les paramètres `page` et `limit` doivent être des nombres positifs." });
  }

  let query = supabase.from('logs').select('*').order('created_at', { ascending: false });

  // Appliquer les filtres si fournis
  if (user_id) {
    query = query.eq('user_id', user_id);
  }
  if (action) {
    query = query.eq('action', action);
  }

  // Appliquer la pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: "Logs récupérés avec succès", logs: data });
};
