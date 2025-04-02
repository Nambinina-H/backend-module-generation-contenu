const request = require('supertest');
const app = require('../index');
const { supabase } = require('../services/supabaseService');
const ApiConfigService = require('../services/apiConfigService');

describe('API Config Endpoints', () => {
  let adminToken;
  let testUserId;
  let testApiKeyId;

  const testApiKey = {
    platform: 'openai',
    keys: {
      api_key: 'test_key_123',
      organization_id: 'test_org_123'
    }
  };

  // Setup - Connexion en tant qu'admin
  beforeAll(async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({
        email: 'admin@gmail.com',
        password: 'adminadmin'
      });
    
    adminToken = loginRes.body.token;
    testUserId = loginRes.body.user.id;
  });

  // Nettoyage après les tests
  afterAll(async () => {
    // Nettoyer les clés de test
    if (testApiKeyId) {
      await supabase
        .from('api_configurations')
        .delete()
        .eq('id', testApiKeyId);
    }
  });

  describe('POST /api/config/add', () => {
    it('devrait ajouter une nouvelle clé API', async () => {
      const res = await request(app)
        .post('/api/config/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testApiKey);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Clé API ajoutée avec succès');
      expect(res.body.data[0]).toHaveProperty('id');
      testApiKeyId = res.body.data[0].id;
    });

    it('devrait refuser une requête sans authentification', async () => {
      const res = await request(app)
        .post('/api/config/add')
        .send(testApiKey);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/config/list', () => {
    it('devrait lister les clés API de l\'utilisateur', async () => {
      const res = await request(app)
        .get('/api/config/list')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('devrait filtrer par plateforme', async () => {
      const res = await request(app)
        .get('/api/config/list?platform=openai')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every(item => item.platform === 'openai')).toBe(true);
    });
  });

  describe('PUT /api/config/update/:id', () => {
    it('devrait mettre à jour une clé API existante', async () => {
      const updatedKeys = {
        keys: {
          api_key: 'updated_key_456',
          organization_id: 'updated_org_456'
        }
      };

      const res = await request(app)
        .put(`/api/config/update/${testApiKeyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedKeys);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Clé API mise à jour avec succès');
    });

    it('devrait refuser la mise à jour d\'une clé inexistante', async () => {
      const res = await request(app)
        .put('/api/config/update/999999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ keys: { api_key: 'test' } });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/config/delete/:id', () => {
    it('devrait supprimer une clé API', async () => {
      const res = await request(app)
        .delete(`/api/config/delete/${testApiKeyId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Clé API supprimée avec succès');
    });
  });

  describe('Realtime et Cache', () => {
    it('devrait mettre à jour le cache après une modification', async () => {
      // Ajouter une nouvelle clé
      const addRes = await request(app)
        .post('/api/config/add')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testApiKey);

      // Attendre que le cache soit mis à jour via Realtime
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Vérifier que la clé est dans le cache
      const cachedKey = ApiConfigService.getKeyFromCache('openai');
      expect(cachedKey).toHaveProperty('api_key', testApiKey.keys.api_key);

      // Nettoyer
      if (addRes.body.data[0].id) {
        await request(app)
          .delete(`/api/config/delete/${addRes.body.data[0].id}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    });
  });
});
