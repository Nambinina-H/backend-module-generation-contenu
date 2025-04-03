const WordPressOAuthService = require('../../services/oauth/wordPressOAuthService');
const { logAction } = require('../../services/logService');

exports.handleCallback = async (req, res) => {
  const { code } = req.query;
  const userId = req.user.id;

  if (!code) {
    return res.status(400).json({ error: 'Code d\'autorisation manquant' });
  }

  try {
    const result = await WordPressOAuthService.exchangeCodeForToken(code, userId);
    await logAction(userId, 'wordpress_oauth_connect', 'Connexion WordPress OAuth réussie');
    res.json(result);
  } catch (error) {
    console.error('Erreur OAuth WordPress:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.disconnect = async (req, res) => {
  const userId = req.user.id;

  try {
    await WordPressOAuthService.disconnectUser(userId);
    await logAction(userId, 'wordpress_oauth_disconnect', 'Déconnexion WordPress réussie');
    res.json({ message: 'Déconnexion WordPress réussie' });
  } catch (error) {
    console.error('Erreur déconnexion WordPress:', error);
    res.status(500).json({ error: error.message });
  }
};
