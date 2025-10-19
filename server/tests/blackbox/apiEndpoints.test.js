// 1. IMPORTS
import { beforeAll, afterAll, describe, it, expect } from '@jest/globals';
import request from "supertest";
import mongoose from "mongoose";
import dotenv from 'dotenv';
import app from "../../app.js";
import User from "../../models/User.js";
import jwt from "jsonwebtoken";

// 2. SETUP
dotenv.config();
process.env.JWT_SECRET = 'a-very-secure-test-secret-for-jest';

let adminToken; // This will hold our authentication token

// Before any tests run, connect to the DB and create a temporary admin user
beforeAll(async () => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in your .env file");
  }
  await mongoose.connect(mongoUri);

  // ✅ THE FIX IS HERE: Add the required 'username' field
  const testAdmin = await User.create({
    name: 'Test Admin',
    username: 'testadmin_blackbox', // <-- THIS WAS THE MISSING PIECE
    email: 'blackbox.test.admin@example.com',
    password: 'password123',
    role: 'admin',
    status: 'active'
  });

  // Generate a token for this admin user
  adminToken = jwt.sign(
    { id: testAdmin._id, role: 'admin' },
    process.env.JWT_SECRET
  );
}, 20000); // Increased timeout for DB operations

// After all tests are finished, clean up the user and disconnect
afterAll(async () => {
  await User.deleteOne({ email: 'blackbox.test.admin@example.com' });
  await mongoose.connection.close();
});


// 3. THE TESTS
describe("API - Black Box Tests for Admin Routes", () => {

  it("should return 401 Unauthorized when trying to access a protected route without a token", async () => {
    const res = await request(app).get("/api/admin/categories");

    expect(res.statusCode).toBe(401);
  });

  it("should return 200 OK when accessing a protected route with a valid admin token", async () => {
    const res = await request(app)
      .get("/api/admin/categories")
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.categories).toBeInstanceOf(Array);
  });

});