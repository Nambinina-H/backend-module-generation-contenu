// services/makeService.js
const axios = require('axios');

exports.publishToPlatform = async (platform, content, contentId) => {
  const response = await axios.post(process.env.MAKE_WEBHOOK_URL, {
    platform,
    content,
    contentId
  });
  return response.data;
};
