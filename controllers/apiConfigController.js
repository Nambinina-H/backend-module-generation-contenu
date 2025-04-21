const { supabase } = require('../services/supabaseService');
const { encrypt, decrypt } = require('../utils/encryptionUtil');
const { logAction } = require('../services/logService');
const ApiConfigService = require('../services/apiConfigService');

exports.addApiKey = async (req, res) => {
  const { platform, keys } = req.body;
  const userId = req.user.id;

  if (!platform || !keys) {
    return res.status(400).json({ error: 'La plateforme et les clés sont obligatoires.' });
  }

  try {
    const encryptedKeys = encrypt(JSON.stringify(keys));
    const { data, error } = await supabase
      .from('api_configurations')
      .insert([{ user_id: userId, platform, keys: encryptedKeys }])
      .select();

    if (error) throw error;

    await logAction(userId, 'add_api_key', `Clé API ajoutée pour la plateforme ${platform}`);
    res.json({ message: 'Clé API ajoutée avec succès', data });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la clé API:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getApiKeys = async (req, res) => {
  const { platform, user_id } = req.query; // Ajout de user_id dans les paramètres de requête

  try {
    let query = supabase.from('api_configurations').select('*');

    // Appliquer les filtres si fournis
    if (platform) query = query.eq('platform', platform);
    if (user_id) query = query.eq('user_id', user_id);

    const { data, error } = await query;

    if (error) throw error;

    const decryptedData = data.map((item) => {
      const keys = JSON.parse(decrypt(item.keys));
      // Masquer les clés sauf pour les clés spécifiées
      const unmaskedKeys = ["facebook", "linkedin", "instagram", "twitter", "clientId", "blog_id", "blog_url", "redirectUri", "url", "twitterUsername", "twitterId"];
      const maskedKeys = Object.fromEntries(
        Object.entries(keys).map(([key, value]) => [
          key,
          unmaskedKeys.includes(key) || typeof value !== 'string' || value.length <= 6
            ? value
            : `${value.slice(0, 14)}...${value.slice(-4)}`,
        ])
      );

      return {
        ...item,
        keys: maskedKeys,
      };
    });

    res.json({ message: 'Clés API récupérées avec succès', data: decryptedData });
  } catch (error) {
    console.error('Erreur lors de la récupération des clés API:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateApiKey = async (req, res) => {
  const { id } = req.params;
  const { keys } = req.body;

  if (!keys) {
    return res.status(400).json({ error: 'Les clés sont obligatoires.' });
  }

  try {
    const encryptedKeys = encrypt(JSON.stringify(keys));
    const { data, error } = await supabase
      .from('api_configurations')
      .update({ 
        keys: encryptedKeys, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id) // Removed user_id filter
      .select('*, platform')
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Code pour aucun résultat trouvé
        return res.status(404).json({ error: 'Clé API non trouvée.' });
      }
      throw error;
    }

    await logAction(req.user.id, 'update_api_key', `Clé API mise à jour pour la plateforme ${data.platform}`);
    res.json({ message: 'Clé API mise à jour avec succès', data });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la clé API:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteApiKey = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('api_configurations')
      .delete()
      .eq('id', id); // Removed user_id filter

    if (error) throw error;

    await logAction(req.user.id, 'delete_api_key', `Clé API supprimée pour l'ID ${id}`);
    res.json({ message: 'Clé API supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la clé API:', error);
    res.status(500).json({ error: error.message });
  }
};
