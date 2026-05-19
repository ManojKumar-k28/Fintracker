// tests/api.test.js

import request from "supertest";
import app from "../app.js";
import { connectDB, disconnectDB, seedDatabase } from "../config/database.js";

beforeAll(async () => {
  await connectDB();
});

beforeEach(async () => {
  await seedDatabase(); // Creates admin@financetracker.com with Admin@123
});

afterAll(async () => {
  await disconnectDB();
});

describe("API Endpoints", () => {
  it("should return token on login for default admin", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "admin@financetracker.com",
      password: "Admin@123",
    });

    if (!res.body?.token || res.status !== 200) {
      console.error("🚨 Login failed:", {
        status: res.status,
        body: res.body
      });
    }

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });
});