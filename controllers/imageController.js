const { generateImage } = require("../services/imageGenerator");

exports.generate = async (req, res) => {
  const { prompt, keywords, quality, size, style } = req.body;

  if (!prompt && (!keywords || keywords.length === 0)) {
    return res.status(400).json({ error: "Merci de fournir soit une description, soit des mots-clés pour l'image." });
  }

  try {
    const imageUrl = await generateImage(prompt, keywords, quality, size, style);
    res.json({ message: "Image générée avec succès", imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
