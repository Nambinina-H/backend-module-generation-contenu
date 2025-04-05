const { LumaAI } = require('lumaai');
const fetch = require('node-fetch');
const fs = require('fs');

const client = new LumaAI({ authToken: process.env.LUMAAI_API_KEY });

class LumaAIService {
  static async generateVideo(prompt, model = 'ray-2', resolution = '720p', duration = '5s') {
    try {
      let generation = await client.generations.create({ prompt, model, resolution, duration });
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
}

module.exports = LumaAIService;
