const { supabase } = require('./supabaseService');
const { decrypt } = require('../utils/encryptionUtil');

// Liste des plateformes spécifiques aux utilisateurs - maintien de la casse d'origine
const USER_SPECIFIC_PLATFORMS = ['wordPressClient', 'twitterClient', 'makeClient'];
console.log('🔧 Plateformes spécifiques aux utilisateurs définies:', USER_SPECIFIC_PLATFORMS);

// Caches séparés pour les clés globales et utilisateur
let globalKeysCache = new Map();
let userKeysCache = new Map(); // Format: Map<userId:platform, keys>

class ApiConfigService {
  static async getApiKeys(userId = null) {
    try {
      let query = supabase.from('api_configurations').select('*');
      if (userId) query = query.eq('user_id', userId);
      
      const { data, error } = await query;
      if (error) throw error;

      const keysMap = new Map();
      for (const config of data) {
        const decryptedKeys = JSON.parse(decrypt(config.keys));
        
        // Si c'est une plateforme spécifique à l'utilisateur, on utilise user_id:platform comme clé
        // MODIFICATION: Ne pas transformer en minuscules pour la comparaison
        if (USER_SPECIFIC_PLATFORMS.includes(config.platform)) {
          keysMap.set(`${config.user_id}:${config.platform}`, decryptedKeys);
          console.log(`🔑 Clé utilisateur chargée: ${config.user_id}:${config.platform}`);
        } else {
          // Sinon, c'est une clé globale
          keysMap.set(config.platform, decryptedKeys);
          console.log(`🔑 Clé globale chargée: ${config.platform}`);
        }
      }

      return keysMap;
    } catch (error) {
      console.error('Erreur lors de la récupération des clés API:', error);
      throw error;
    }
  }

  static async getKeyForUser(userId, platform) {
    console.log(`🔄 Recherche de clé pour utilisateur:${userId}, plateforme:${platform}`);
    
    // Vérifier si c'est une plateforme spécifique à l'utilisateur
    // MODIFICATION: Ne pas transformer en minuscules pour la comparaison
    if (USER_SPECIFIC_PLATFORMS.includes(platform)) {
      const cacheKey = `${userId}:${platform}`;
      console.log(`🔍 Recherche dans le cache utilisateur avec clé: ${cacheKey}`);
      
      // Vérifier dans le cache utilisateur
      const userKey = userKeysCache.get(cacheKey);
      if (userKey) {
        console.log(`✅ Clé trouvée dans le cache utilisateur pour ${cacheKey}`);
        return userKey;
      }
      
      // Si pas trouvé, charger depuis la base de données pour cet utilisateur spécifique
      console.log(`⚠️ Clé non trouvée dans le cache utilisateur pour ${cacheKey}, chargement depuis la base de données...`);
      const keysMap = await this.getApiKeys(userId);
      
      // Mettre à jour le cache utilisateur
      for (const [key, value] of keysMap.entries()) {
        if (key.includes(':')) {
          userKeysCache.set(key, value);
        }
      }
      
      return keysMap.get(cacheKey);
    } else {
      // C'est une clé globale, utiliser le cache global
      // MODIFICATION: Conserver la casse d'origine
      console.log(`🔍 Recherche dans le cache global pour plateforme: ${platform}`);
      const globalKey = globalKeysCache.get(platform);
      if (globalKey) {
        console.log(`✅ Clé globale trouvée dans le cache pour ${platform}`);
        return globalKey;
      }
      
      // Si pas trouvé, charger toutes les clés globales
      console.log(`⚠️ Clé globale non trouvée dans le cache pour ${platform}, chargement depuis la base de données...`);
      const keysMap = await this.getApiKeys();
      
      // Mettre à jour le cache global uniquement avec les clés globales
      for (const [key, value] of keysMap.entries()) {
        if (!key.includes(':')) {
          globalKeysCache.set(key, value);
        }
      }
      
      return globalKeysCache.get(platform);
    }
  }

  static initRealtimeSubscription() {
    const channel = supabase.channel('api-config-changes').on('postgres_changes', 
        {
          event: '*', // Écouter tous les événements (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'api_configurations'
        },
        async (payload) => {
          console.log('🔄 Changement détecté dans les configurations API:', payload.eventType);
          try {
            // Recharger toutes les clés API
            await this.loadApiKeys();
            console.log('🔑 Cache des clés API mis à jour suite à un changement');
          } catch (error) {
            console.error('❌ Erreur lors de la mise à jour du cache:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('Status de la subscription Realtime:', status);
      });

    return channel;
  }

  static async loadApiKeys() {
    try {
      const allKeys = await this.getApiKeys();
      
      // Réinitialiser les caches
      globalKeysCache = new Map();
      userKeysCache = new Map();
      
      // Distribuer les clés dans les caches appropriés
      for (const [key, value] of allKeys.entries()) {
        if (key.includes(':')) {
          userKeysCache.set(key, value);
          console.log(`🔄 Mise à jour du cache utilisateur: ${key}`);
        } else {
          globalKeysCache.set(key, value);
          console.log(`🔄 Mise à jour du cache global: ${key}`);
        }
      }
      
      console.log('🔑 Clés API chargées avec succès', {
        globales: globalKeysCache.size,
        utilisateurs: userKeysCache.size
      });
    } catch (error) {
      console.error('❌ Erreur lors du chargement des clés API:', error);
    }
  }

  static getKeyFromCache(platform) {
    // Pour cette méthode qui est utilisée pour les clés globales uniquement
    // MODIFICATION: Conserver la casse d'origine
    console.log(`🔍 Récupération depuis le cache global: ${platform}`);
    return globalKeysCache.get(platform);
  }

  static getUserKeyFromCache(userId, platform) {
    // Nouvelle méthode pour récupérer explicitement une clé utilisateur
    // MODIFICATION: Conserver la casse d'origine
    const cacheKey = `${userId}:${platform}`;
    console.log(`🔍 Récupération depuis le cache utilisateur: ${cacheKey}`);
    return userKeysCache.get(cacheKey);
  }

  static getAllKeysFromCache() {
    // Fusionner les deux caches pour l'API existante
    const allCacheEntries = new Map([...globalKeysCache, ...userKeysCache]);
    return Object.fromEntries(allCacheEntries);
  }
  
  static logCacheState() {
    console.log('📊 État du cache de clés API:');
    console.log('🌐 Clés globales:', Array.from(globalKeysCache.keys()));
    console.log('👤 Clés utilisateur:', Array.from(userKeysCache.keys()));
  }
}

// Initialiser la subscription Realtime au chargement du module
ApiConfigService.initRealtimeSubscription();

module.exports = ApiConfigService;
