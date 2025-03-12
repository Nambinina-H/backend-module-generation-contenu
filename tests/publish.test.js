const request = require('supertest');
const app = require('../index'); // Assurez-vous que votre app est exportée dans index.js

describe('Publish Endpoints', () => {
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

  it('should publish content', async () => {
    const res = await request(app)
      .post('/publish')
      .set('Authorization', `Bearer ${token}`)
      .send({
        contentId: 1,
        platforms: ['facebook', 'twitter']
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message');
  });
});
