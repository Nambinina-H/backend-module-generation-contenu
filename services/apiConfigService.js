const { supabase } = require('./supabaseService');
const { decrypt } = require('../utils/encryptionUtil');

let apiKeysCache = new Map();

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
        keysMap.set(config.platform.toLowerCase(), decryptedKeys);
      }

      return keysMap;
    } catch (error) {
      console.error('Erreur lors de la récupération des clés API:', error);
      throw error;
    }
  }

  static async getKeyForUser(userId, platform) {
    const cachedKey = apiKeysCache.get(platform.toLowerCase());
    if (cachedKey) {
      return cachedKey;
    }

    console.log(`🔄 Clé API pour ${platform} non trouvée dans le cache, rechargement depuis la base de données...`);
    const keysMap = await this.getApiKeys(userId);
    apiKeysCache = new Map([...apiKeysCache, ...keysMap]);

    return keysMap.get(platform.toLowerCase());
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
      apiKeysCache = await this.getApiKeys();
      console.log('🔑 Clés API chargées avec succès');
    } catch (error) {
      console.error('❌ Erreur lors du chargement des clés API:', error);
    }
  }

  static getKeyFromCache(platform) {
    return apiKeysCache.get(platform.toLowerCase());
  }

  static getAllKeysFromCache() {
    return Object.fromEntries(apiKeysCache);
  }
}

// Initialiser la subscription Realtime au chargement du module
ApiConfigService.initRealtimeSubscription();

module.exports = ApiConfigService;
