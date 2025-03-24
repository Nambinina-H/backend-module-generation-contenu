const { supabase } = require('../services/supabaseService');

class MediaService {
  constructor() {
    this.BUCKET_NAME = 'media';
  }

  async uploadMedia(file) {
    try {
      // Vérification du type de fichier
      if (!file.mimetype.match(/^(image|video)/)) {
        throw new Error('Type de fichier non supporté');
      }

      const fileExt = file.originalname.split('.').pop();
      const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;

      // Upload du fichier
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file.buffer);

      if (error) {
        throw new Error(`Erreur d'upload: ${error.message}`);
      }

      // Récupération de l'URL publique
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      return {
        url: urlData.publicUrl,
        type: file.mimetype.startsWith('image/') ? 'image' : 'video'
      };
    } catch (error) {
      throw error;
    }
  }

  async deleteMedia(url) {
    try {
      const fileName = url.split('/').pop();
      if (!fileName) throw new Error('URL invalide');

      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([fileName]);

      if (error) {
        throw new Error(`Erreur de suppression: ${error.message}`);
      }
    } catch (error) {
      throw error;
    }
  }
}

module.exports = MediaService;
