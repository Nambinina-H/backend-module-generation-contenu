const { supabase, subscribeToLogs } = require('../services/supabaseService');
const WebSocket = require('ws');

const clients = new Set();

// ✅ Activer Supabase Realtime pour suivre les nouvelles insertions
subscribeToLogs((newLog) => {
  console.log("📡 Envoi du log aux clients WebSocket :", newLog);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(newLog));
    }
  });
});

// ✅ WebSocket pour envoyer les logs en direct
exports.logsWebSocket = (server) => {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log("📡 Client connecté au WebSocket");
    clients.add(ws);

    ws.on('close', () => {
      console.log("🔌 Client déconnecté");
      clients.delete(ws);
    });
  });
};

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

  let query = supabase
    .from('logs')
    .select('*')
    .order('created_at', { ascending: sort === 'date-asc' });

  // ✅ Appliquer les filtres si fournis
  if (user_id) {
    query = query.eq('user_id', user_id);
  }
  if (action) {
    query = query.eq('action', action);
  }

  // ✅ Appliquer la pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error } = await query;

  if (error) {
    console.error("🚨 Erreur lors de la récupération des logs:", error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ message: "Logs récupérés avec succès", logs: data, page, limit });
};
