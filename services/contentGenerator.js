// services/contentGenerator.js
exports.generateContent = async (type, keywords, personalization) => {
    if (type === 'text') {
      // Simuler un article généré
      return `Article généré avec les mots-clés : ${keywords.join(', ')}. Personnalisation : ${JSON.stringify(personalization)}`;
    } else if (type === 'image') {
      // Simuler une URL d'image
      return `https://fakeimg.pl/600x400/?text=${encodeURIComponent(keywords.join(' '))}`;
    } else if (type === 'video') {
      // Simuler une URL vidéo
      return `https://videourl.example.com/${keywords.join('-')}`;
    }
    return null;
  };
  