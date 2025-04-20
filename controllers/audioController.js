const { generateAudioDescription } = require('../services/contentGenerator');

exports.generateAudioDescription = async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Merci de fournir un contenu pour générer la description.' });
  }

  try {
    const description = await generateAudioDescription(content);
    res.json({ message: 'Description générée avec succès', description });
  } catch (error) {
    console.error('🚨 Erreur lors de la génération de la description audio:', error.message);
    res.status(500).json({ error: 'Erreur lors de la génération de la description. Veuillez réessayer plus tard.' });
  }
};
