
require('dotenv').config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const request = require('supertest');
const app = require('../app');
const db = require('../db');

const run = Date.now();
const password = 'secret123';
const goodAnswer = 'x'.repeat(60);
let adminToken;
let studentToken;

async function registerAndLogin(name, email, role) {
  await request(app).post('/register').send({ name, email, password, role });
  const res = await request(app).post('/login').send({ email, password });
  return res.body.token;
}

async function newAttempt() {
  const created = await request(app)
    .post('/assignments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ title: 'Test', description: 'Test assignment', time_limit_minutes: 30 });
  const started = await request(app)
    .post(`/assignments/${created.body.id}/start`)
    .set('Authorization', `Bearer ${studentToken}`);
  return started.body.id;
}

afterAll(async () => {
  await db.end();
});

describe('login', () => {
  const email = `login${run}@test.com`;

  test('registers and logs in with the right password', async () => {
    const reg = await request(app).post('/register').send({ name: 'A', email, password });
    expect(reg.status).toBe(201);
    const res = await request(app).post('/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  test('rejects a wrong password', async () => {
    const res = await request(app).post('/login').send({ email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  test('rejects an unknown email', async () => {
    const res = await request(app).post('/login').send({ email: `nobody${run}@test.com`, password });
    expect(res.status).toBe(401);
  });
});

describe('deadline rule', () => {
  beforeAll(async () => {
    adminToken = await registerAndLogin('Admin', `admin${run}@test.com`, 'admin');
    studentToken = await registerAndLogin('Ravi', `ravi${run}@test.com`, 'student');
  });

  test('accepts a submission before the deadline and scores it', async () => {
    const attemptId = await newAttempt();
    const res = await request(app)
      .post(`/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answer: goodAnswer, link: 'https://example.com/work' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('reviewed');
    expect(res.body.score).toBe(3);
  });

  test('rejects a submission after the deadline and marks it timed out', async () => {
    const attemptId = await newAttempt();
    await db.query("UPDATE attempts SET deadline = now() - interval '1 minute' WHERE id = $1", [attemptId]);

    const res = await request(app)
      .post(`/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ answer: goodAnswer, link: 'https://example.com/work' });
    expect(res.status).toBe(400);

    const view = await request(app)
      .get(`/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(view.body.status).toBe('timed_out');
  });
});

describe('privacy rule', () => {
  let otherToken;
  let attemptId;

  beforeAll(async () => {
    adminToken = await registerAndLogin('Admin2', `admin2${run}@test.com`, 'admin');
    studentToken = await registerAndLogin('Owner', `owner${run}@test.com`, 'student');
    otherToken = await registerAndLogin('Other', `other${run}@test.com`, 'student');
    attemptId = await newAttempt();
  });

  test('the owner can see their own attempt', async () => {
    const res = await request(app)
      .get(`/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
  });

  test('another student gets 404 for it', async () => {
    const res = await request(app)
      .get(`/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });

  test('an admin can see it', async () => {
    const res = await request(app)
      .get(`/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});