const request = require('supertest');
const app = require('./index');

describe('Health Routes', () => {
  test('GET /health retorna 200', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.healthy).toBe(true);
  });

  test('GET /status retorna 200 e status ok', async () => {
    const res = await request(app).get('/status');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});