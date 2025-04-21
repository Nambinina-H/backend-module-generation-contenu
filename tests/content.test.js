const request = require('supertest');
const app = require('../index'); // Assurez-vous que votre app est exportée dans index.js

describe('Content Endpoints', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    token = res.body.token;
  });

  it('should generate content', async () => {
    const res = await request(app)
      .post('/content/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'text',
        keywords: ['test', 'content'],
        personalization: {}
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('content');
  });

  it('should list user content', async () => {
    const res = await request(app)
      .get('/content/list')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('contents');
  });
});
