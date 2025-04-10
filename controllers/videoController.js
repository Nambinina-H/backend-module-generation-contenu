const LumaAIService = require('../services/lumaAIService');
const { generateVideoDescription } = require('../services/contentGenerator');

exports.generateVideo = async (req, res) => {
  const { prompt, resolution, duration } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required for video generation.' });
  }

  try {
    const videoUrl = await LumaAIService.generateVideo(prompt, 'ray-2', resolution, duration); // Forcer "ray-2"
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

exports.generateVideoDescription = async (req, res) => {
  const { keywords } = req.body;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'Merci de fournir une liste de mots-clés.' });
  }

  try {
    const description = await generateVideoDescription(keywords);
    res.json({ message: 'Description générée avec succès', description });
  } catch (error) {
    console.error('🚨 Erreur lors de la génération de la description:', error.message);
    res.status(500).json({ error: 'Erreur lors de la génération de la description. Veuillez réessayer plus tard.' });
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

exports.extendVideo = async (req, res) => {
  const { id, prompt } = req.body;

  if (!id || !prompt) {
    return res.status(400).json({ error: 'ID de la vidéo et prompt sont requis pour l\'extension.' });
  }

  try {
    const extendedVideo = await LumaAIService.extendVideo(id, prompt);
    res.json({ message: 'Vidéo étendue avec succès', extendedVideo });
  } catch (error) {
    console.error('🚨 Erreur lors de l\'extension de la vidéo:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.reverseExtendVideo = async (req, res) => {
  const { id, prompt } = req.body;

  if (!id || !prompt) {
    return res.status(400).json({ error: 'ID de la vidéo et prompt sont requis pour l\'extension inversée.' });
  }

  try {
    const reversedVideo = await LumaAIService.reverseExtendVideo(id, prompt);
    res.json({ message: 'Vidéo étendue en sens inverse avec succès', reversedVideo });
  } catch (error) {
    console.error('🚨 Erreur lors de l\'extension inversée de la vidéo:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.handleCallback = async (req, res) => {
  const { id, state, assets, failure_reason } = req.body; // Données envoyées par LumaAI

  console.log('📥 Callback reçu:', { id, state, assets, failure_reason }); // Log pour vérifier le callback

  if (!id || !state) {
    return res.status(400).json({ error: 'ID et état sont requis.' });
  }

  try {
    // Mettre à jour l'état de la génération dans la base de données
    const updateData = { status: state };
    if (state === 'completed') {
      updateData.videoUrl = assets?.video; // URL de la vidéo générée
    } else if (state === 'failed') {
      updateData.error = failure_reason; // Raison de l'échec
    }

    // Exemple de mise à jour dans Supabase
    const { error } = await supabase
      .from('content')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Erreur lors de la mise à jour de la génération:', error);
      return res.status(500).json({ error: 'Erreur interne.' });
    }

    res.json({ message: 'Callback traité avec succès.' });
  } catch (error) {
    console.error('Erreur lors du traitement du callback:', error);
    res.status(500).json({ error: 'Erreur interne.' });
  }
};

exports.addAudio = async (req, res) => {
  const { id } = req.params;
  const { prompt, negativePrompt } = req.body;

  if (!id || !prompt) {
    return res.status(400).json({ error: 'ID de la génération et prompt sont requis pour ajouter de l\'audio.' });
  }

  try {
    const result = await LumaAIService.addAudioToGeneration(id, prompt, negativePrompt);
    res.json({ message: 'Audio ajouté avec succès à la génération', result });
  } catch (error) {
    console.error('🚨 Erreur lors de l\'ajout d\'audio à la génération:', error.message);
    res.status(500).json({ error: error.message });
  }
};
