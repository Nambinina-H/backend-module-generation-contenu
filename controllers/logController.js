// controllers/logController.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

exports.logAction = async (req, res) => {
  const { userId, action, details } = req.body;
  const { data, error } = await supabase
    .from('logs')
    .insert([{ user_id: userId, action, details, timestamp: new Date() }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Action journalisée', data });
};
