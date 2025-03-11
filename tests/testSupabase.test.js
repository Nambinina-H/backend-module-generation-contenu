// testSupabase.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function testConnection() {
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL); // Vérifier que l'URL est bien chargée
  console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? 'Clé présente' : 'Clé absente');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error("Erreur : Les variables d'environnement ne sont pas chargées.");
    return;
  }

  const { data, error } = await supabase.from('content').select('*').limit(1);
  
  if (error) {
    console.error('Erreur de connexion:', error);
  } else {
    console.log('Connexion réussie, données:', data);
  }
}

testConnection();
