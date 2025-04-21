const request = require('supertest');
const app = require('../index'); // Assurez-vous que votre app est exportée dans index.js

describe('Log Endpoints', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'adminpassword'
      });
    token = res.body.token;
  });

  it('should get logs', async () => {
    const res = await request(app)
      .get('/logs')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('logs');
  });
});
