const { createClient } = require('@supabase/supabase-js');

// Créer un client classique pour les actions normales
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Créer un client Admin avec SERVICE_ROLE_KEY pour les actions sensibles
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

module.exports = { supabase, supabaseAdmin };
