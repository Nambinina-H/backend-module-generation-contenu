const MediaService = require('../services/mediaService');

class MediaController {
  constructor() {
    this.mediaService = new MediaService();
  }

  async uploadMedia(req, res) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Aucun fichier fourni' });
      }

      const mediaData = await this.mediaService.uploadMedia(file);
      res.json(mediaData);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = MediaController;
