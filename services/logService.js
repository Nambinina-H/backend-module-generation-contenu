const { supabase } = require('../services/supabaseService');

exports.logAction = async (userId, action, details = '') => {
  await supabase
    .from('logs')
    .insert([{ user_id: userId, action, details }]);
};
