const { supabase } = require('../services/supabaseService');

exports.getAllPublications = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('publications')
      .select('*');

    if (error) {
      console.error('❌ Erreur lors de la récupération des publications:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Liste des publications récupérée avec succès', publications: data });
  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getUserPublications = async (req, res) => {
  const userId = req.user.id;

  try {
    const { data, error } = await supabase
      .from('publications')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Erreur lors de la récupération des publications utilisateur:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Liste des publications utilisateur récupérée avec succès', publications: data });
  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    res.status(500).json({ error: error.message });
  }
};
