const { generateImage } = require("../services/imageGenerator");
const { supabase } = require("../services/supabaseService");
const { logAction } = require("../services/logService");

exports.generate = async (req, res) => {
  const { prompt, keywords, quality, size, style } = req.body;
  const userId = req.user.id;

  if (!prompt && (!keywords || keywords.length === 0)) {
    return res.status(400).json({ error: "Merci de fournir soit une description, soit des mots-clés pour l'image." });
  }

  try {
    const imageUrl = await generateImage(prompt, keywords, quality, size, style);

    // Insert the generated image URL into the content table
    const { data, error } = await supabase
      .from('content')
      .insert([{
        type: 'image',
        keywords,
        content: imageUrl,
        personalization: { prompt, quality, size, style },
        status: 'generated',
        user_id: userId,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('🚨 Erreur Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    // Log the action
    await logAction(userId, 'generate_image', `Image générée avec les mots-clés : ${keywords.join(', ')}`);

    res.json({ message: "Image générée avec succès", imageUrl, data });
  } catch (error) {
    console.error('🚨 Erreur serveur:', error);
    res.status(500).json({ error: error.message });
  }
};
