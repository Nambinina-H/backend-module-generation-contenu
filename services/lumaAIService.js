const { LumaAI } = require('lumaai');
const fetch = require('node-fetch');
const fs = require('fs');

const client = new LumaAI({ authToken: process.env.LUMAAI_API_KEY });

class LumaAIService {
  static async generateVideo(prompt, model = 'ray-2', resolution = '720p', duration = '5s') {
    try {
      let generation = await client.generations.create({ 
        prompt, 
        model: 'ray-2', // Forcer l'utilisation de "ray-2"
        resolution, 
        duration,
        callback_url: `${process.env.BASE_URL}/video/callback`, // URL de callback
      });
      console.log('🎥 Video generation started:', generation.id);

      let completed = false;
      while (!completed) {
        generation = await client.generations.get(generation.id);

        if (generation.state === 'completed') {
          completed = true;
        } else if (generation.state === 'failed') {
          throw new Error(`Generation failed: ${generation.failure_reason}`);
        } else {
          console.log('Dreaming...');
          await new Promise((r) => setTimeout(r, 3000)); // Wait for 3 seconds
        }
      }

      const videoUrl = generation.assets.video;
      console.log('🎥 Video generation completed:', videoUrl);
      return videoUrl;
    } catch (error) {
      console.error('🚨 Error during video generation:', error.message);
      throw error;
    }
  }

  static async downloadVideo(videoUrl, outputPath) {
    try {
      const response = await fetch(videoUrl);
      const fileStream = fs.createWriteStream(outputPath);
      await new Promise((resolve, reject) => {
        response.body.pipe(fileStream);
        response.body.on('error', reject);
        fileStream.on('finish', resolve);
      });
      console.log(`🎥 Video downloaded to ${outputPath}`);
    } catch (error) {
      console.error('🚨 Error downloading video:', error.message);
      throw error;
    }
  }

  static async getCredits() {
    const url = 'https://api.lumalabs.ai/dream-machine/v1/credits';
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${process.env.LUMAAI_API_KEY}`
      }
    };

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Failed to fetch credits: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('🎯 LumaAI Credits:', data);
      return data;
    } catch (error) {
      console.error('🚨 Error fetching LumaAI credits:', error.message);
      throw error;
    }
  }

  static async getGenerationById(id) {
    try {
      const generation = await client.generations.get(id);
      console.log('🎯 Génération récupérée:', generation);
      return generation;
    } catch (error) {
      console.error('🚨 Erreur lors de la récupération de la génération:', error.message);
      throw new Error('Impossible de récupérer la génération demandée.');
    }
  }

  static async listGenerations() {
    try {
      const generations = await client.generations.list();
      console.log('📋 Liste des générations:', generations);
      return generations;
    } catch (error) {
      console.error('🚨 Erreur lors de la récupération des générations:', error.message);
      throw new Error('Impossible de récupérer la liste des générations.');
    }
  }

  static async deleteGeneration(id) {
    try {
      await client.generations.delete(id);
      console.log(`🗑️ Génération supprimée: ${id}`);
      return { message: `La génération avec l'ID ${id} a été supprimée avec succès.` };
    } catch (error) {
      console.error('🚨 Erreur lors de la suppression de la génération:', error.message);
      throw new Error('Impossible de supprimer la génération demandée.');
    }
  }

  static async extendVideo(id, prompt) {
    try {
      let generation = await client.generations.create({
        prompt,
        model: 'ray-2', // Forcer l'utilisation de "ray-2"
        keyframes: {
          frame0: {
            type: 'generation',
            id,
          },
        },
        callback_url: `${process.env.BASE_URL}/video/callback`, // URL de callback
      });
      console.log('🎥 Extension de la vidéo commencée:', generation.id);

      let completed = false;
      while (!completed) {
        generation = await client.generations.get(generation.id);

        if (generation.state === 'completed') {
          completed = true;
        } else if (generation.state === 'failed') {
          throw new Error(`Extension échouée: ${generation.failure_reason}`);
        } else {
          console.log('Extension en cours...');
          await new Promise((r) => setTimeout(r, 3000)); // Attendre 3 secondes
        }
      }

      console.log('🎥 Vidéo étendue avec succès:', generation.assets.video);
      return generation;
    } catch (error) {
      console.error('🚨 Erreur lors de l\'extension de la vidéo:', error.message);
      throw error;
    }
  }

  static async reverseExtendVideo(id, prompt) {
    try {
      let generation = await client.generations.create({
        prompt,
        model: 'ray-2', // Forcer l'utilisation de "ray-2"
        keyframes: {
          frame1: {
            type: 'generation',
            id,
          },
        },
        callback_url: `${process.env.BASE_URL}/video/callback`, // URL de callback
      });
      console.log('🎥 Extension inversée de la vidéo commencée:', generation.id);

      let completed = false;
      while (!completed) {
        generation = await client.generations.get(generation.id);

        if (generation.state === 'completed') {
          completed = true;
        } else if (generation.state === 'failed') {
          throw new Error(`Extension inversée échouée: ${generation.failure_reason}`);
        } else {
          console.log('Extension inversée en cours...');
          await new Promise((r) => setTimeout(r, 3000)); // Attendre 3 secondes
        }
      }

      console.log('🎥 Vidéo étendue en sens inverse avec succès:', generation.assets.video);
      return generation;
    } catch (error) {
      console.error('🚨 Erreur lors de l\'extension inversée de la vidéo:', error.message);
      throw error;
    }
  }

  static async addAudioToGeneration(id, prompt, negativePrompt = '', callbackUrl = `${process.env.BASE_URL}/video/callback`) {
    try {
      const url = `https://api.lumalabs.ai/dream-machine/v1/generations/${id}/audio`;
      const body = {
        generation_type: 'add_audio',
        prompt,
        negative_prompt: negativePrompt,
        callback_url: callbackUrl, // Ajout du callback
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LUMAAI_API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to add audio: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('🎵 Audio added to generation:', data);
      return data;
    } catch (error) {
      console.error('🚨 Error adding audio to generation:', error.message);
      throw error;
    }
  }
}

module.exports = LumaAIService;
