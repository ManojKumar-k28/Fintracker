// tests/adminController.test.js

import request from "supertest";
import app from "../app.js";
import { connectDB, disconnectDB } from "../config/database.js";
import User from "../models/User.js";

let adminToken = "";

beforeAll(async () => {
  await connectDB();
});

beforeEach(async () => {
  await User.deleteMany({}); // Start from clean state

  // Register an admin user
  const registerRes = await request(app).post("/api/auth/register").send({
    name: "Test Admin",
    username: "testadmin",
    email: "testadmin@example.com",
    password: "password123",
    role: "admin",
  });

  if (registerRes.statusCode !== 201 && registerRes.statusCode !== 200) {
    console.error("❌ Admin registration failed:", registerRes.body);
    throw new Error("Failed to register admin for test");
  }

  // Login to get token
  const loginRes = await request(app).post("/api/auth/login").send({
    email: "testadmin@example.com",
    password: "password123",
  });

  if (!loginRes.body?.token) {
    console.error("❌ Admin login failed:", loginRes.body);
    throw new Error("No token returned from login");
  }

  adminToken = loginRes.body.token;
});

afterAll(async () => {
  await disconnectDB();
});

describe("Admin Routes /api/admin", () => {
  it("should return 401 Unauthorized if no token is provided", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty("message");
  });

  it("should return 200 and list of users with valid admin token", async () => {
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${adminToken}`);

    // Helpful debug if things go wrong
    if (res.statusCode !== 200) {
      console.error("❌ Admin route failed:", res.body);
    }

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("users");
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBeGreaterThanOrEqual(1);
  });

  // Add more admin route tests here...
});