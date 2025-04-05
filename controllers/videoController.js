const LumaAIService = require('../services/lumaAIService');

exports.generateVideo = async (req, res) => {
  const { prompt, model, resolution, duration } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required for video generation.' });
  }

  try {
    const videoUrl = await LumaAIService.generateVideo(prompt, model, resolution, duration);
    res.json({ message: 'Video generated successfully', videoUrl });
  } catch (error) {
    console.error('🚨 Error generating video:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getCredits = async (req, res) => {
  try {
    const credits = await LumaAIService.getCredits();
    res.json({ 
      message: 'Crédits récupérés avec succès', 
      details: `Il vous reste ${credits.credit_balance} crédits.` 
    });
  } catch (error) {
    console.error('🚨 Erreur lors de la récupération des crédits:', error.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des crédits. Veuillez réessayer plus tard.' });
  }
};

exports.getGenerationById = async (req, res) => {
  const { id } = req.params;

  try {
    const generation = await LumaAIService.getGenerationById(id);
    res.json({ 
      message: 'Génération récupérée avec succès', 
      generation 
    });
  } catch (error) {
    console.error('🚨 Erreur lors de la récupération de la génération:', error.message);
    res.status(500).json({ error: 'Erreur lors de la récupération de la génération. Veuillez réessayer plus tard.' });
  }
};

exports.listGenerations = async (req, res) => {
  try {
    const generations = await LumaAIService.listGenerations();
    res.json({ 
      message: 'Liste des générations récupérée avec succès', 
      generations 
    });
  } catch (error) {
    console.error('🚨 Erreur lors de la récupération des générations:', error.message);
    res.status(500).json({ error: 'Erreur lors de la récupération des générations. Veuillez réessayer plus tard.' });
  }
};

exports.deleteGeneration = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await LumaAIService.deleteGeneration(id);
    res.json({ 
      message: result.message 
    });
  } catch (error) {
    console.error('🚨 Erreur lors de la suppression de la génération:', error.message);
    res.status(500).json({ error: 'Erreur lors de la suppression de la génération. Veuillez réessayer plus tard.' });
  }
};
