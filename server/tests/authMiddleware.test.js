// tests/authMiddleware.test.js

import request from "supertest";
import app from "../app.js";
import { connectDB, disconnectDB, seedDatabase } from "../config/database.js";

beforeAll(async () => {
  await connectDB();
});

beforeEach(async () => {
  await seedDatabase();
});

afterAll(async () => {
  await disconnectDB();
});

describe('Auth Middleware', () => {
  it('should return 401 if no token is provided on a protected admin route', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('message');
  });
});