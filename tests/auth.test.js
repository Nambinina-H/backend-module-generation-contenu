const request = require('supertest');
const app = require('../index'); // Assurez-vous que votre app est exportée dans index.js
const scheduledTask = require('../utils/scheduler'); // Import the scheduled task

describe('Auth Endpoints', () => {
  afterAll(() => {
    scheduledTask.stop(); // Stop the cron job after all tests
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({
        email: 'nambinina@admin.com',
        password: 'pasxsworasdd123'
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message');
  });

  it('should login an existing user', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        email: 'nambinina@admin.com',
        password: 'pasxsworasdd123'
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });
});