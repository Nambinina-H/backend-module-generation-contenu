const { generateImage } = require("../services/imageGenerator");

exports.generate = async (req, res) => {
  const { prompt, quality, size, style } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Merci de fournir une description pour l'image." });
  }

  try {
    const imageUrl = await generateImage(prompt, quality, size, style);
    res.json({ message: "Image générée avec succès", imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
