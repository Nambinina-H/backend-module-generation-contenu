const { createClient } = require('@supabase/supabase-js');

// ✅ Créer un client pour les actions normales
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ✅ Créer un client Admin pour les actions sensibles
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// ✅ Activer le mode Realtime pour les logs
supabase
  .channel('logs-channel')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs' }, (payload) => {
    console.log("🆕 Nouveau log ajouté :", payload.new);
  })
  .subscribe();

module.exports = { supabase, supabaseAdmin };
