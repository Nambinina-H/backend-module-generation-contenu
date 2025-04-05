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
