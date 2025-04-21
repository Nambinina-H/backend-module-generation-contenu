const { supabaseAdmin } = require('../services/supabaseService');

exports.logAction = async (userId, action, details = '') => {
  let email = "Email inconnu"; // Valeur par défaut si l'email n'est pas trouvé

  // Récupérer l'email de l'utilisateur avec supabaseAdmin
  if (userId) {
    const { data: user, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (user && user.user && user.user.email) {
      email = user.user.email;
    }
  }

  // Insérer le log avec l'email
  await supabaseAdmin
    .from('logs')
    .insert([{ user_id: userId, email, action, details }]);
};